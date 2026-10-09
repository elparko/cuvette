use std::path::{Path, PathBuf};
use std::process::Command;

pub const SYSTEM_DIR: &str = "/usr/local/bin";
const TOOL_PATH: &str = "/usr/bin:/bin:/usr/sbin:/sbin";

#[derive(Debug, Clone, PartialEq)]
pub struct Found {
    pub ours: bool,
    pub path: String,
}

pub fn user_dir(home: &str) -> String {
    format!("{home}/.local/bin")
}

pub fn parse_status(out: &str) -> Vec<Found> {
    out.lines()
        .filter_map(|l| {
            let (kind, path) = l.split_once(' ')?;
            Some(Found { ours: kind == "app", path: path.to_string() })
        })
        .collect()
}

fn run(script: &Path, login_path: &str, args: &[&str]) -> std::io::Result<(i32, String, String)> {
    let out = Command::new("/bin/sh").arg(script).args(args).env("PATH", TOOL_PATH).env("CUVETTE_PATH", login_path).output()?;
    Ok((out.status.code().unwrap_or(-1), String::from_utf8_lossy(&out.stdout).into_owned(), String::from_utf8_lossy(&out.stderr).trim().to_string()))
}

pub fn status(script: &Path, login_path: &str) -> Vec<Found> {
    run(script, login_path, &["status"]).map(|(_, out, _)| parse_status(&out)).unwrap_or_default()
}

fn quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

pub fn admin_script(script: &Path, args: &[&str]) -> String {
    let cmd = std::iter::once(script.to_string_lossy().into_owned()).chain(args.iter().map(|a| a.to_string())).map(|a| quote(&a)).collect::<Vec<_>>().join(" ");
    let cmd = format!("/bin/sh {cmd}").replace('\\', "\\\\").replace('"', "\\\"");
    format!("do shell script \"{cmd}\" with administrator privileges")
}

fn change(script: &Path, args: &[&str], admin: bool) -> Result<String, String> {
    let (code, out, err) = run(script, "", args).map_err(|e| e.to_string())?;
    match code {
        0 => Ok(out.trim().to_string()),
        4 if admin => {
            let out = Command::new("/usr/bin/osascript").args(["-e", &admin_script(script, args)]).output().map_err(|e| e.to_string())?;
            if out.status.success() {
                Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
            } else {
                Err(format!("macOS did not allow the change. {}", String::from_utf8_lossy(&out.stderr).trim()))
            }
        }
        4 => Err("Cuvette cannot write to this folder.".into()),
        _ => Err(err),
    }
}

pub fn install(script: &Path, dir: &str, app: &Path, admin: bool) -> Result<String, String> {
    change(script, &["install", dir, &app.to_string_lossy()], admin)
}

pub fn uninstall(script: &Path, dir: &str, admin: bool) -> Result<String, String> {
    change(script, &["uninstall", dir], admin)
}

pub fn app_bundle(exe: &Path) -> Result<PathBuf, String> {
    let app = exe.ancestors().nth(3).filter(|p| p.extension().is_some_and(|e| e == "app")).ok_or("Install the command line tool from the built Cuvette.app, not from a development build.")?;
    let s = app.to_string_lossy();
    if s.starts_with("/Volumes/") || s.contains("/AppTranslocation/") {
        return Err("Move Cuvette to the Applications folder first. Then open it again and install the command line tool.".into());
    }
    Ok(app.to_path_buf())
}

pub fn question(found: &[Found]) -> Option<String> {
    let other = found.iter().find(|f| !f.ours)?;
    let first = &found[0];
    let now = if first.ours { "this app".to_string() } else { first.path.clone() };
    Some(format!(
        "Another cuvette command is on this Mac: {}. It is probably the npm install.\n\nNow, cuvette in Terminal runs {now}.\n\nWhich one must cuvette run?",
        other.path
    ))
}

fn in_path(dir: &str, login_path: &str) -> bool {
    login_path.split(':').any(|d| d.trim_end_matches('/') == dir.trim_end_matches('/'))
}

pub fn result_note(found: &[Found], dir: &str, login_path: &str) -> String {
    let line = format!("export PATH=\"{dir}:$PATH\"");
    if !in_path(dir, login_path) {
        return format!("{dir} is not in your PATH. Add this line to ~/.zprofile, then open a new Terminal window:\n\n{line}");
    }
    match found.first() {
        Some(f) if f.ours && f.path == format!("{dir}/cuvette") => "Open a new Terminal window and type cuvette. It runs this app's core.".into(),
        Some(f) => format!("cuvette in Terminal still runs {}, because its folder comes first in PATH. To run this app instead, add this line to ~/.zprofile:\n\n{line}", f.path),
        None => format!("Cuvette cannot find the command in PATH. Add this line to ~/.zprofile:\n\n{line}"),
    }
}

pub fn installed_dirs(found: &[Found], home: &str) -> Vec<String> {
    let mut dirs = vec![SYSTEM_DIR.to_string(), user_dir(home)];
    for f in found.iter().filter(|f| f.ours) {
        if let Some(d) = Path::new(&f.path).parent().map(|d| d.to_string_lossy().into_owned()) {
            if !dirs.contains(&d) {
                dirs.push(d);
            }
        }
    }
    dirs.into_iter().filter(|d| is_ours(&format!("{d}/cuvette"))).collect()
}

fn is_ours(path: &str) -> bool {
    std::fs::read_to_string(path).is_ok_and(|t| t.contains("# Cuvette.app command line tool"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn script() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("cli-tool.sh")
    }

    fn temp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("cuvette-cli-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    fn fake_app(root: &Path) -> PathBuf {
        let app = root.join("Cuvette.app");
        fs::create_dir_all(app.join("Contents/MacOS")).unwrap();
        fs::create_dir_all(app.join("Contents/Resources/core/dist")).unwrap();
        let node = app.join("Contents/MacOS/node");
        fs::write(&node, "#!/bin/sh\necho \"node $*\"\n").unwrap();
        Command::new("chmod").args(["755", &node.to_string_lossy()]).status().unwrap();
        app
    }

    #[test]
    fn install_runs_the_app_core_and_uninstall_removes_it() {
        let root = temp("install");
        let app = fake_app(&root);
        let bin = root.join("bin");
        let dir = bin.to_string_lossy().into_owned();
        let target = install(&script(), &dir, &app, false).unwrap();
        assert_eq!(target, format!("{dir}/cuvette"));
        let out = Command::new(&target).args(["app", "my folder"]).output().unwrap();
        let text = String::from_utf8_lossy(&out.stdout);
        assert!(text.contains("Contents/Resources/core/dist/cli.mjs app my folder"), "{text}");
        assert_eq!(status(&script(), &dir), vec![Found { ours: true, path: target.clone() }]);
        assert_eq!(installed_dirs(&status(&script(), &dir), "/nowhere"), vec![dir.clone()]);
        assert_eq!(uninstall(&script(), &dir, false).unwrap(), target);
        assert!(!Path::new(&target).exists());
        assert_eq!(uninstall(&script(), &dir, false).unwrap(), "");
    }

    #[test]
    fn install_keeps_another_program_and_reports_it() {
        let root = temp("other");
        let app = fake_app(&root);
        let npm = root.join("npm");
        fs::create_dir_all(&npm).unwrap();
        let theirs = npm.join("cuvette");
        fs::write(&theirs, "#!/usr/bin/env node\n").unwrap();
        Command::new("chmod").args(["755", &theirs.to_string_lossy()]).status().unwrap();
        let npm_dir = npm.to_string_lossy().into_owned();
        assert!(install(&script(), &npm_dir, &app, false).unwrap_err().contains("another program"));
        assert!(uninstall(&script(), &npm_dir, false).unwrap_err().contains("another program"));

        let mine = root.join("mine").to_string_lossy().into_owned();
        install(&script(), &mine, &app, false).unwrap();
        let path = format!("{npm_dir}:{mine}:{npm_dir}");
        let found = status(&script(), &path);
        assert_eq!(found.len(), 2);
        assert!(!found[0].ours && found[1].ours);
        let q = question(&found).unwrap();
        assert!(q.contains(&theirs.to_string_lossy().into_owned()) && q.contains("Which one"));
        assert!(result_note(&found, &mine, &path).contains(&format!("export PATH=\"{mine}:$PATH\"")));

        let first = format!("{mine}:{npm_dir}");
        let found = status(&script(), &first);
        assert!(question(&found).unwrap().contains("runs this app"));
        assert!(result_note(&found, &mine, &first).contains("runs this app's core"));
        assert!(result_note(&found, "/not/in/path", &first).contains("is not in your PATH"));
    }

    #[test]
    fn read_only_folder_needs_admin() {
        let root = temp("ro");
        let app = fake_app(&root);
        let ro = root.join("ro");
        fs::create_dir_all(&ro).unwrap();
        Command::new("chmod").args(["555", &ro.to_string_lossy()]).status().unwrap();
        let err = install(&script(), &ro.to_string_lossy(), &app, false).unwrap_err();
        Command::new("chmod").args(["755", &ro.to_string_lossy()]).status().unwrap();
        assert!(err.contains("cannot write"));
    }

    #[test]
    fn no_question_without_another_install() {
        assert_eq!(question(&[Found { ours: true, path: "/usr/local/bin/cuvette".into() }]), None);
        assert_eq!(question(&[]), None);
    }

    #[test]
    fn admin_script_quotes_paths() {
        let s = admin_script(Path::new("/Applications/Cuvette.app/Contents/Resources/cli-tool.sh"), &["install", "/usr/local/bin", "/Apps/It's \"here\""]);
        assert_eq!(
            s,
            r#"do shell script "/bin/sh '/Applications/Cuvette.app/Contents/Resources/cli-tool.sh' 'install' '/usr/local/bin' '/Apps/It'\\''s \"here\"'" with administrator privileges"#
        );
    }

    #[test]
    fn app_bundle_rejects_dev_builds_and_disk_images() {
        assert_eq!(app_bundle(Path::new("/Applications/Cuvette.app/Contents/MacOS/cuvette")).unwrap(), PathBuf::from("/Applications/Cuvette.app"));
        assert!(app_bundle(Path::new("/repo/desktop/src-tauri/target/debug/cuvette")).is_err());
        assert!(app_bundle(Path::new("/Volumes/Cuvette/Cuvette.app/Contents/MacOS/cuvette")).unwrap_err().contains("Applications"));
        assert!(app_bundle(Path::new("/private/var/folders/x/AppTranslocation/y/d/Cuvette.app/Contents/MacOS/cuvette")).is_err());
    }
}
