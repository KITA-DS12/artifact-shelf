pub mod edit;
pub mod files;
pub mod import;
pub mod store;

use chrono::Utc;
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_opener::OpenerExt;

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

#[tauri::command]
fn update_artifact(
    app: tauri::AppHandle,
    id: String,
    update: edit::ArtifactUpdate,
) -> Result<store::Artifact, String> {
    let lib_path = library_path(&app)?;
    let mut library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let updated = edit::apply_update(&mut library, &id, &update, &now)?;
    store::save_library(&lib_path, &library).map_err(|e| e.to_string())?;
    Ok(updated)
}

#[tauri::command]
fn read_artifact_content(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let lib_path = library_path(&app)?;
    let library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let artifact = library
        .find_by_id(&id)
        .ok_or_else(|| format!("Artifact が見つかりません: {id}"))?;
    std::fs::read_to_string(&artifact.source_path)
        .map_err(|e| format!("ファイル読み込みに失敗しました: {e}"))
}

#[tauri::command]
fn open_in_finder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_with_default(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
fn check_file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn check_missing_artifacts(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let lib_path = library_path(&app)?;
    let library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    Ok(files::missing_artifact_ids(&library))
}

#[tauri::command]
fn relink_artifact(
    app: tauri::AppHandle,
    id: String,
    new_path: String,
) -> Result<store::Artifact, String> {
    let lib_path = library_path(&app)?;
    let mut library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let updated = files::relink(&mut library, &id, &new_path, &now)?;
    store::save_library(&lib_path, &library).map_err(|e| e.to_string())?;
    Ok(updated)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            load_library,
            save_library,
            import_artifacts,
            update_artifact,
            read_artifact_content,
            open_in_finder,
            open_with_default,
            copy_to_clipboard,
            check_file_exists,
            check_missing_artifacts,
            relink_artifact
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
