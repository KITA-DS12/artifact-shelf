pub mod import;
pub mod store;

use std::path::PathBuf;
use tauri::Manager;

fn library_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("library.json"))
}

#[tauri::command]
fn load_library(app: tauri::AppHandle) -> Result<store::Library, String> {
    let path = library_path(&app)?;
    store::load_library(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_library(app: tauri::AppHandle, library: store::Library) -> Result<(), String> {
    let path = library_path(&app)?;
    store::save_library(&path, &library).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_artifacts(
    app: tauri::AppHandle,
    paths: Vec<PathBuf>,
) -> Result<import::ImportResult, String> {
    let lib_path = library_path(&app)?;
    let mut library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let result = import::import_paths(&mut library, &paths);
    store::save_library(&lib_path, &library).map_err(|e| e.to_string())?;
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_library,
            save_library,
            import_artifacts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
