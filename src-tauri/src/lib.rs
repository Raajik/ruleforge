/// The Ruleforge desktop window. The web app in `../dist` runs inside it and
/// reaches the file system through the dialog and fs plugins (PLAN.md T32).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Ruleforge");
}
