pub mod delete;
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
    let mut library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let source_path = library
        .find_by_id(&id)
        .map(|a| a.source_path.clone())
        .ok_or_else(|| format!("Artifact が見つかりません: {id}"))?;

    let content = std::fs::read_to_string(&source_path)
        .map_err(|e| format!("ファイル読み込みに失敗しました: {e}"))?;

    // 「開いた」事実を記録する。isRead（自己申告）には触れない。
    let now = Utc::now().to_rfc3339();
    store::touch_opened_at(&mut library, &id, &now);
    if let Err(e) = store::save_library(&lib_path, &library) {
        // openedAt の保存失敗はプレビュー表示自体を止めるほどではない。ログだけにする。
        eprintln!("warning: failed to persist openedAt: {e}");
    }

    Ok(content)
}

/// アプリが「開いて良い」と判断する拡張子の集合。
///
/// library.json が（手動 / 同期サービス経由 / 第三者プロセスから）改変されると、
/// 任意パスを open コマンドに渡せる余地が残る。\.app / \.command / \.sh のような
/// 実行可能パスや拡張子なしの実行ファイルを開かせないために、Markdown / HTML 系の
/// ホワイトリストで弾く。
fn has_allowed_extension(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    matches!(
        Path::new(&lower).extension().and_then(|e| e.to_str()),
        Some("md") | Some("mdx") | Some("html") | Some("htm")
    )
}

fn guard_path(path: &str) -> Result<(), String> {
    if has_allowed_extension(path) {
        Ok(())
    } else {
        Err(format!(
            "対応外の拡張子のため開けません: {path} （.md / .mdx / .html / .htm のみ）"
        ))
    }
}

#[tauri::command]
fn open_in_finder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    guard_path(&path)?;
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_with_default(app: tauri::AppHandle, path: String) -> Result<(), String> {
    guard_path(&path)?;
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
fn delete_artifacts(app: tauri::AppHandle, ids: Vec<String>) -> Result<usize, String> {
    let lib_path = library_path(&app)?;
    let mut library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let removed = delete::remove_artifacts(&mut library, &ids);
    store::save_library(&lib_path, &library).map_err(|e| e.to_string())?;
    Ok(removed)
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

#[cfg(test)]
mod open_guard_tests {
    use super::*;

    #[test]
    fn allows_markdown_and_html() {
        for p in [
            "/tmp/a.md",
            "/tmp/a.MD",
            "/tmp/a.mdx",
            "/tmp/a.html",
            "/tmp/a.HTM",
        ] {
            assert!(has_allowed_extension(p), "{p} should be allowed");
        }
    }

    #[test]
    fn rejects_executables_and_no_extension() {
        for p in [
            "/Applications/Mail.app",
            "/tmp/install.command",
            "/tmp/run.sh",
            "/tmp/binary",
            "/tmp/script",
            "/tmp/a.txt",
            "/tmp/a.pdf",
        ] {
            assert!(!has_allowed_extension(p), "{p} should be rejected");
        }
    }

    #[test]
    fn guard_path_returns_error_with_path_in_message() {
        let err = guard_path("/tmp/a.txt").unwrap_err();
        assert!(err.contains("/tmp/a.txt"));
        assert!(err.contains("対応外"));
    }
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
            delete_artifacts,
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
