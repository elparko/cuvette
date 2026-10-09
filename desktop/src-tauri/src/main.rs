use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

mod cli_tool;

use serde::Deserialize;
use tauri::ipc::{CapabilityBuilder, InvokeBody, Request};
use tauri::menu::{AboutMetadataBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::webview::{NewWindowResponse, PageLoadEvent};
use tauri::{ActivationPolicy, AppHandle, Manager, RunEvent, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

const WEBSITE: &str = "https://cuvette.ai";
const ISSUES: &str = "https://github.com/elparko/cuvette/issues/new";
const COMMANDS: [&str; 4] = ["choose_folder", "reveal", "notify", "save_file"];
const BRIDGE: &str = include_str!("bridge.js");

#[derive(Default)]
struct Core {
    child: Mutex<Option<Child>>,
    port: Mutex<Option<u16>>,
    ready: Mutex<bool>,
    pending: Mutex<Option<String>>,
    zoom: Mutex<f64>,
}

#[derive(Deserialize)]
struct Started {
    url: String,
    port: u16,
}

fn decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3]).ok().and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[tauri::command]
async fn choose_folder(window: WebviewWindow, start: Option<String>) -> Option<String> {
    let mut d = window.dialog().file().set_parent(&window).set_title("Choose the folder with your data");
    if let Some(s) = start.filter(|s| Path::new(s).is_dir()) {
        d = d.set_directory(s);
    }
    let p = d.blocking_pick_folder()?.into_path().ok()?;
    Some(p.to_string_lossy().into_owned())
}

#[tauri::command]
fn reveal(app: AppHandle, path: String) -> Result<(), String> {
    app.opener().reveal_item_in_dir(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn notify(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification().builder().title(title).body(body).show().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_file(window: WebviewWindow, request: Request<'_>) -> Result<Option<String>, String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("The file data is missing.".into());
    };
    let name = request.headers().get("x-name").and_then(|v| v.to_str().ok()).map(decode).unwrap_or_else(|| "file".into());
    let Some(path) = window.dialog().file().set_parent(&window).set_file_name(name).blocking_save_file() else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn log_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
    Path::new(&home).join(".guided-analysis/logs/desktop.log")
}

fn start_core(app: &AppHandle, folder: Option<&str>) -> std::io::Result<Child> {
    let log = log_path();
    if let Some(dir) = log.parent() {
        fs::create_dir_all(dir)?;
    }
    let mut cmd = if cfg!(debug_assertions) {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let mut c = Command::new("node");
        c.current_dir(root).args(["--import", "tsx", "desktop/sidecar/main.ts"]);
        c
    } else {
        let exe = std::env::current_exe()?;
        let script = app.path().resource_dir().map_err(std::io::Error::other)?.join("core/dist/sidecar.mjs");
        let mut c = Command::new(exe.with_file_name("node"));
        c.arg(script).current_dir(std::env::var("HOME").unwrap_or_else(|_| "/".into()));
        c
    };
    if let Some(f) = folder {
        cmd.arg(f);
    }
    cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(File::create(log)?).spawn()
}

fn stop_core(app: &AppHandle) {
    let Some(mut child) = app.state::<Core>().child.lock().unwrap().take() else { return };
    drop(child.stdin.take());
    let t = Instant::now();
    while t.elapsed() < Duration::from_secs(3) {
        if let Ok(Some(_)) = child.try_wait() {
            return;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn show_error(app: &AppHandle, text: &str) {
    let tail: Vec<String> = fs::read_to_string(log_path()).unwrap_or_default().lines().rev().take(20).map(String::from).collect();
    let detail = tail.into_iter().rev().collect::<Vec<_>>().join("\n");
    let js = format!(
        "document.getElementById('msg').textContent = {}; document.getElementById('detail').textContent = {};",
        serde_json::to_string(text).unwrap(),
        serde_json::to_string(&format!("{}\n\nLog: {}", detail, log_path().display())).unwrap()
    );
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.eval(js);
    }
}

fn serve(app: &AppHandle, s: Started) {
    let mut cap = CapabilityBuilder::new("core-server").remote(format!("http://127.0.0.1:{}/*", s.port)).window("main");
    for c in COMMANDS {
        cap = cap.permission(format!("allow-{}", c.replace('_', "-")));
    }
    if let Err(e) = app.add_capability(cap) {
        return show_error(app, &format!("Cuvette could not allow the page to use the Mac functions: {e}"));
    }
    *app.state::<Core>().port.lock().unwrap() = Some(s.port);
    if let (Some(w), Ok(url)) = (app.get_webview_window("main"), Url::parse(&s.url)) {
        let _ = w.navigate(url);
    }
}

fn is_core(app: &AppHandle, url: &Url) -> bool {
    url.host_str() == Some("127.0.0.1") && url.port().is_some() && url.port() == *app.state::<Core>().port.lock().unwrap()
}

fn eval_main(app: &AppHandle, js: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.eval(js);
    }
}

fn open_folder(app: &AppHandle, path: PathBuf) {
    let dir = if path.is_dir() { path.clone() } else { path.parent().map(Path::to_path_buf).unwrap_or(path) };
    let dir = dir.to_string_lossy().into_owned();
    let core = app.state::<Core>();
    if *core.ready.lock().unwrap() {
        eval_main(app, &format!("window.cuvetteDesktop.open({})", serde_json::to_string(&dir).unwrap()));
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.set_focus();
        }
    } else {
        *core.pending.lock().unwrap() = Some(dir);
    }
}

fn zoom(app: &AppHandle, step: f64) {
    let core = app.state::<Core>();
    let mut z = core.zoom.lock().unwrap();
    *z = if step == 0.0 { 1.0 } else { (*z + step).clamp(0.5, 3.0) };
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_zoom(*z);
    }
}

fn menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let about = AboutMetadataBuilder::new().name(Some("Cuvette")).version(Some(app.package_info().version.to_string())).website(Some(WEBSITE)).build();
    let cuvette = SubmenuBuilder::new(app, "Cuvette").about(Some(about))
        .separator()
        .item(&MenuItemBuilder::with_id("cli-install", "Install Command Line Tool…").build(app)?)
        .item(&MenuItemBuilder::with_id("cli-uninstall", "Uninstall Command Line Tool").build(app)?)
        .separator()
        .services().separator().hide().hide_others().show_all().separator().quit().build()?;
    let file = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("open", "Open Folder…").accelerator("CmdOrCtrl+O").build(app)?)
        .item(&MenuItemBuilder::with_id("recent", "Recent Sessions").accelerator("CmdOrCtrl+Shift+O").build(app)?)
        .separator()
        .close_window()
        .build()?;
    let edit = SubmenuBuilder::new(app, "Edit").undo().redo().separator().cut().copy().paste().select_all().build()?;
    let view = SubmenuBuilder::new(app, "View")
        .item(&MenuItemBuilder::with_id("reload", "Reload").accelerator("CmdOrCtrl+R").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("zoom-reset", "Actual Size").accelerator("CmdOrCtrl+0").build(app)?)
        .item(&MenuItemBuilder::with_id("zoom-in", "Zoom In").accelerator("CmdOrCtrl+=").build(app)?)
        .item(&MenuItemBuilder::with_id("zoom-out", "Zoom Out").accelerator("CmdOrCtrl+-").build(app)?)
        .separator()
        .fullscreen()
        .build()?;
    let window = SubmenuBuilder::new(app, "Window").minimize().maximize().build()?;
    let help = SubmenuBuilder::new(app, "Help").text("website", "Cuvette Website").text("report", "Report a Problem").build()?;
    let m = MenuBuilder::new(app).items(&[&cuvette, &file, &edit, &view, &window, &help]).build()?;
    let _ = window.set_as_windows_menu_for_nsapp();
    let _ = help.set_as_help_menu_for_nsapp();
    Ok(m)
}

fn on_menu(app: &AppHandle, id: &str) {
    match id {
        "open" => {
            let h = app.clone();
            let mut d = app.dialog().file().set_title("Choose the folder with your data");
            if let Some(w) = app.get_webview_window("main") {
                d = d.set_parent(&w);
            }
            d.pick_folder(move |p| {
                if let Some(p) = p.and_then(|p| p.into_path().ok()) {
                    open_folder(&h, p);
                }
            });
        }
        "recent" => eval_main(app, "window.cuvetteDesktop && window.cuvetteDesktop.page('sessions')"),
        "reload" => eval_main(app, "location.reload()"),
        "zoom-reset" => zoom(app, 0.0),
        "zoom-in" => zoom(app, 0.1),
        "zoom-out" => zoom(app, -0.1),
        "website" => {
            let _ = app.opener().open_url(WEBSITE, None::<&str>);
        }
        "cli-install" => {
            let h = app.clone();
            std::thread::spawn(move || install_cli(&h));
        }
        "cli-uninstall" => {
            let h = app.clone();
            std::thread::spawn(move || uninstall_cli(&h));
        }
        "report" => {
            let _ = app.opener().open_url(ISSUES, None::<&str>);
        }
        _ => {}
    }
}

fn home() -> String {
    std::env::var("HOME").unwrap_or_else(|_| "/".into())
}

fn login_path() -> String {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    Command::new(shell)
        .args(["-ilc", "printf '__CUVETTE_PATH__%s__CUVETTE_PATH__' \"$PATH\""])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).split("__CUVETTE_PATH__").nth(1).map(String::from))
        .unwrap_or_else(|| std::env::var("PATH").unwrap_or_default())
}

fn tool_script(app: &AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("cli-tool.sh")
    } else {
        app.path().resource_dir().unwrap_or_default().join("cli-tool.sh")
    }
}

fn tell(app: &AppHandle, text: impl Into<String>) {
    app.dialog().message(text).title("Command Line Tool").blocking_show();
}

fn ask(app: &AppHandle, text: impl Into<String>, a: &str, b: &str) -> Option<bool> {
    let r = app
        .dialog()
        .message(text)
        .title("Command Line Tool")
        .buttons(MessageDialogButtons::YesNoCancelCustom(a.into(), b.into(), "Cancel".into()))
        .blocking_show_with_result();
    match r {
        MessageDialogResult::Yes => Some(true),
        MessageDialogResult::No => Some(false),
        MessageDialogResult::Custom(l) if l == a => Some(true),
        MessageDialogResult::Custom(l) if l == b => Some(false),
        _ => None,
    }
}

fn install_cli(app: &AppHandle) {
    let bundle = match std::env::current_exe().map_err(|e| e.to_string()).and_then(|e| cli_tool::app_bundle(&e)) {
        Ok(b) => b,
        Err(e) => return tell(app, e),
    };
    let script = tool_script(app);
    let path = login_path();
    let found = cli_tool::status(&script, &path);
    if let Some(q) = cli_tool::question(&found) {
        match ask(app, q, "This app", "The other install") {
            Some(true) => {}
            Some(false) => return tell(app, "Nothing changed. Uninstall the other install first if you change your mind (for an npm install: npm uninstall -g <package>)."),
            None => return,
        }
    }
    let user = cli_tool::user_dir(&home());
    let text = format!("Where must Cuvette put the cuvette command?\n\n{}: for all users. macOS asks for an administrator password.\n\n{user}: for you only. No password.", cli_tool::SYSTEM_DIR);
    let dir = match ask(app, text, cli_tool::SYSTEM_DIR, "~/.local/bin") {
        Some(true) => cli_tool::SYSTEM_DIR.to_string(),
        Some(false) => user,
        None => return,
    };
    match cli_tool::install(&script, &dir, &bundle, true) {
        Ok(target) => {
            let after = cli_tool::status(&script, &path);
            tell(app, format!("Cuvette installed {target}.\n\n{}", cli_tool::result_note(&after, &dir, &path)));
        }
        Err(e) => tell(app, format!("Cuvette did not install the command line tool. {e}")),
    }
}

fn uninstall_cli(app: &AppHandle) {
    let script = tool_script(app);
    let path = login_path();
    let dirs = cli_tool::installed_dirs(&cli_tool::status(&script, &path), &home());
    if dirs.is_empty() {
        return tell(app, "The command line tool of Cuvette is not installed.");
    }
    let mut lines = Vec::new();
    for d in dirs {
        match cli_tool::uninstall(&script, &d, true) {
            Ok(t) => lines.push(format!("Removed {t}.")),
            Err(e) => lines.push(format!("Did not remove {d}/cuvette. {e}")),
        }
    }
    if let Some(f) = cli_tool::status(&script, &path).first() {
        lines.push(format!("cuvette in Terminal now runs {}.", f.path));
    }
    tell(app, lines.join("\n"));
}

fn window(app: &AppHandle, hidden: bool) -> tauri::Result<WebviewWindow> {
    let nav = app.clone();
    let popup = app.clone();
    let load = app.clone();
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Cuvette")
        .inner_size(1240.0, 860.0)
        .min_inner_size(720.0, 520.0)
        .visible(!hidden)
        .focused(!hidden)
        .initialization_script(BRIDGE)
        .on_navigation(move |url| {
            if url.scheme() == "tauri" || matches!(url.scheme(), "about" | "blob" | "data") || is_core(&nav, url) {
                return true;
            }
            let _ = nav.opener().open_url(url.as_str(), None::<&str>);
            false
        })
        .on_new_window(move |url, _| {
            let _ = popup.opener().open_url(url.as_str(), None::<&str>);
            NewWindowResponse::Deny
        })
        .on_page_load(move |_, p| {
            if p.event() != PageLoadEvent::Finished || !is_core(&load, p.url()) {
                return;
            }
            let core = load.state::<Core>();
            *core.ready.lock().unwrap() = true;
            let pending = core.pending.lock().unwrap().take();
            if let Some(dir) = pending {
                open_folder(&load, PathBuf::from(dir));
            }
        })
        .build()
}

fn main() {
    let hidden = std::env::var("CUVETTE_HIDDEN").is_ok_and(|v| v == "1");
    let folder = std::env::args().skip(1).find(|a| !a.starts_with("-psn"));
    let app = tauri::Builder::default()
        .activate_ignoring_other_apps(!hidden)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(Core { zoom: Mutex::new(1.0), ..Default::default() })
        .invoke_handler(tauri::generate_handler![choose_folder, reveal, notify, save_file])
        .menu(menu)
        .on_menu_event(|app, e| on_menu(app, e.id().as_ref()))
        .setup(move |app| {
            if hidden {
                app.set_activation_policy(ActivationPolicy::Accessory);
            }
            let handle = app.handle().clone();
            window(&handle, hidden)?;
            let folder = folder.as_deref().map(|f| {
                let p = Path::new(f);
                if p.is_dir() { f.to_string() } else { p.parent().map(|d| d.to_string_lossy().into_owned()).unwrap_or_default() }
            });
            let mut child = match start_core(&handle, folder.as_deref()) {
                Ok(c) => c,
                Err(e) => {
                    show_error(&handle, &format!("The Cuvette core did not start: {e}"));
                    return Ok(());
                }
            };
            let stdout = child.stdout.take().expect("piped stdout");
            *handle.state::<Core>().child.lock().unwrap() = Some(child);
            std::thread::spawn(move || {
                let mut lines = BufReader::new(stdout).lines();
                let started = lines.next().and_then(Result::ok).and_then(|l| serde_json::from_str::<Started>(&l).ok());
                let h = handle.clone();
                let _ = handle.run_on_main_thread(move || match started {
                    Some(s) => serve(&h, s),
                    None => show_error(&h, "The Cuvette core stopped before it was ready."),
                });
                for _ in lines {}
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Cuvette did not start");
    app.run(|app, event| match event {
        RunEvent::Opened { urls } => {
            for u in urls {
                if let Ok(p) = u.to_file_path() {
                    open_folder(app, p);
                }
            }
        }
        RunEvent::Exit => stop_core(app),
        _ => {}
    });
}
