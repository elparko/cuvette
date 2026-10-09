fn main() {
    let commands = &["choose_folder", "reveal", "notify", "save_file"];
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(commands)))
        .expect("tauri build");
}
