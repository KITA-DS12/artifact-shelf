pub mod delete;
pub mod edit;
pub mod files;
pub mod import;
pub mod positions;
pub mod search;
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

fn positions_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("positions.json"))
}

/// 旧 bundle identifier (com.kita.artifact-shelf) で書かれていた library.json を
/// 新 identifier 配下にコピーする。旧側は触らない（取り消し可能なように）。
///
/// 返り値: コピーを実施した場合 true。
fn copy_legacy_if_present(
    legacy: &Path,
    current: &Path,
) -> Result<bool, std::io::Error> {
    if current.exists() {
        return Ok(false);
    }
    if !legacy.exists() {
        return Ok(false);
    }
    if let Some(parent) = current.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::copy(legacy, current)?;
    Ok(true)
}

fn migrate_legacy_library(app: &tauri::AppHandle) {
    let Ok(current) = library_path(app) else {
        return;
    };
    let Some(current_dir) = current.parent() else {
        return;
    };
    let Some(parent) = current_dir.parent() else {
        return;
    };
    let legacy = parent
        .join("com.kita.artifact-shelf")
        .join("library.json");
    if let Err(e) = copy_legacy_if_present(&legacy, &current) {
        eprintln!("warning: legacy library migration failed: {e}");
    }
}

#[tauri::command]
fn load_library(app: tauri::AppHandle) -> Result<store::Library, String> {
    migrate_legacy_library(&app);
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
fn search_in_contents(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<String>, String> {
    let lib_path = library_path(&app)?;
    let library = store::load_library(&lib_path).map_err(|e| e.to_string())?;
    let mut matched = Vec::new();
    for a in &library.artifacts {
        match std::fs::read_to_string(&a.source_path) {
            Ok(content) => {
                if search::matches_query(&content, &query) {
                    matched.push(a.id.clone());
                }
            }
            Err(_) => {
                // missing / 権限エラーは skip（一覧側で missing バッジが出る）
            }
        }
    }
    Ok(matched)
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

/// HTML プレビュー内の外部リンクをブラウザで開く。
/// スキームは http / https のみ許可（mailto / javascript / data 等は拒否）。
fn is_http_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

#[tauri::command]
fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !is_http_url(&url) {
        return Err(format!(
            "対応外の URL スキームです (http/https のみ): {url}"
        ));
    }
    app.opener()
        .open_url(url, None::<String>)
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
fn load_scroll_position(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<f64>, String> {
    let p = positions::load_positions(&positions_path(&app)?).unwrap_or_default();
    Ok(p.get(&id).copied())
}

#[tauri::command]
fn save_scroll_position(
    app: tauri::AppHandle,
    id: String,
    position: f64,
) -> Result<(), String> {
    positions::save_position_for(&positions_path(&app)?, &id, position)
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
mod legacy_migration_tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn copies_when_only_legacy_exists() {
        let tmp = TempDir::new().unwrap();
        let legacy = tmp.path().join("legacy/library.json");
        let current = tmp.path().join("current/library.json");
        fs::create_dir_all(legacy.parent().unwrap()).unwrap();
        fs::write(&legacy, r#"{"version":1,"artifacts":[]}"#).unwrap();

        let copied = copy_legacy_if_present(&legacy, &current).unwrap();
        assert!(copied);
        assert!(current.exists());
        assert!(legacy.exists(), "旧側は残る");
        assert_eq!(fs::read_to_string(&current).unwrap(), fs::read_to_string(&legacy).unwrap());
    }

    #[test]
    fn does_nothing_when_current_already_exists() {
        let tmp = TempDir::new().unwrap();
        let legacy = tmp.path().join("legacy/library.json");
        let current = tmp.path().join("current/library.json");
        fs::create_dir_all(legacy.parent().unwrap()).unwrap();
        fs::create_dir_all(current.parent().unwrap()).unwrap();
        fs::write(&legacy, "LEGACY").unwrap();
        fs::write(&current, "CURRENT").unwrap();

        let copied = copy_legacy_if_present(&legacy, &current).unwrap();
        assert!(!copied);
        // 上書きしない
        assert_eq!(fs::read_to_string(&current).unwrap(), "CURRENT");
    }

    #[test]
    fn does_nothing_when_legacy_missing() {
        let tmp = TempDir::new().unwrap();
        let legacy = tmp.path().join("legacy/library.json");
        let current = tmp.path().join("current/library.json");

        let copied = copy_legacy_if_present(&legacy, &current).unwrap();
        assert!(!copied);
        assert!(!current.exists());
    }
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

    #[test]
    fn http_urls_pass() {
        assert!(is_http_url("http://example.com"));
        assert!(is_http_url("https://example.com/path?query"));
        assert!(is_http_url("HTTPS://Example.com")); // case insensitive
    }

    #[test]
    fn non_http_schemes_rejected() {
        for url in [
            "mailto:a@b.com",
            "javascript:alert(1)",
            "data:text/html,<h1>x</h1>",
            "file:///etc/passwd",
            "ftp://example.com",
            "/relative/path",
            "",
        ] {
            assert!(!is_http_url(url), "{url} should be rejected");
        }
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
            search_in_contents,
            read_artifact_content,
            open_in_finder,
            open_with_default,
            open_external_url,
            copy_to_clipboard,
            check_file_exists,
            check_missing_artifacts,
            relink_artifact,
            load_scroll_position,
            save_scroll_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
