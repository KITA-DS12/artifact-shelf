use chrono::Utc;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::store::{Artifact, FileType, Library, Source};

pub fn detect_file_type(path: &Path) -> Option<FileType> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    match ext.as_str() {
        "md" | "mdx" => Some(FileType::Markdown),
        "html" | "htm" => Some(FileType::Html),
        _ => None,
    }
}

pub fn title_from_path(path: &Path) -> String {
    path.file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Untitled".into())
}

pub fn build_artifact(path: &Path) -> Result<Artifact, String> {
    let file_type = detect_file_type(path).ok_or_else(|| {
        format!(
            "未対応のファイル形式です: {}",
            path.to_string_lossy()
        )
    })?;
    let now_iso = Utc::now().to_rfc3339();

    Ok(Artifact {
        id: Uuid::new_v4().to_string(),
        title: title_from_path(path),
        source_path: path.to_string_lossy().to_string(),
        file_type,
        tags: vec![],
        captured_at: now_iso.clone(),
        generated_at: None,
        imported_at: now_iso.clone(),
        updated_at: now_iso,
        opened_at: None,
        is_read: false,
        is_favorite: false,
        source: Source::Unknown,
        note: String::new(),
    })
}

#[derive(Debug, Default, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub added: Vec<Artifact>,
    pub skipped_duplicates: Vec<String>,
    pub skipped_unsupported: Vec<String>,
}

/// 重複判定用のキー。canonicalize に成功すればその文字列、失敗すれば素の path 文字列。
///
/// canonicalize は symlink 解決、`.` / `..` の正規化、相対パスの絶対化、
/// 大文字小文字（APFS デフォルトは case-insensitive）を吸収するため、
/// `~/Downloads/foo.md` と `/Users/me/Downloads/foo.md` が同じファイルでも、
/// `path` 文字列の単純比較では別物扱いになるのを防げる。
fn dedup_key(path: &Path) -> String {
    std::fs::canonicalize(path)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| path.to_string_lossy().to_string())
}

pub fn import_paths(library: &mut Library, paths: &[PathBuf]) -> ImportResult {
    let existing: HashSet<String> = library
        .artifacts
        .iter()
        .map(|a| dedup_key(Path::new(&a.source_path)))
        .collect();
    let mut result = ImportResult::default();
    let mut session_keys: HashSet<String> = HashSet::new();

    for path in paths {
        let display_path = path.to_string_lossy().to_string();
        let key = dedup_key(path);
        if existing.contains(&key) || session_keys.contains(&key) {
            result.skipped_duplicates.push(display_path);
            continue;
        }
        match build_artifact(path) {
            Ok(artifact) => {
                session_keys.insert(key);
                result.added.push(artifact.clone());
                library.artifacts.push(artifact);
            }
            Err(_) => {
                result.skipped_unsupported.push(display_path);
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn write_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn detect_file_type_supports_md_and_html_variants() {
        assert_eq!(
            detect_file_type(Path::new("a.md")),
            Some(FileType::Markdown)
        );
        assert_eq!(
            detect_file_type(Path::new("a.MDX")),
            Some(FileType::Markdown)
        );
        assert_eq!(detect_file_type(Path::new("a.html")), Some(FileType::Html));
        assert_eq!(detect_file_type(Path::new("a.HTM")), Some(FileType::Html));
        assert_eq!(detect_file_type(Path::new("a.txt")), None);
        assert_eq!(detect_file_type(Path::new("a")), None);
    }

    #[test]
    fn title_from_path_strips_extension() {
        assert_eq!(
            title_from_path(Path::new("/tmp/review-auth.md")),
            "review-auth"
        );
        assert_eq!(title_from_path(Path::new("a.html")), "a");
    }

    #[test]
    fn build_artifact_fills_defaults() {
        let tmp = TempDir::new().unwrap();
        let path = write_file(&tmp, "design-notes.md", "# hi");

        let a = build_artifact(&path).expect("build");

        assert_eq!(a.title, "design-notes");
        assert_eq!(a.file_type, FileType::Markdown);
        assert_eq!(a.source, Source::Unknown);
        assert!(!a.is_read);
        assert!(!a.is_favorite);
        assert!(a.tags.is_empty());
        assert!(a.note.is_empty());
        assert_eq!(a.source_path, path.to_string_lossy().to_string());
        // generated_at は frontmatter 等から抽出できなければ None（mtime からの推定は廃止）
        assert!(a.generated_at.is_none());
        // captured_at と imported_at は同時刻、ISO8601 → 'T' を含む
        assert!(a.captured_at.contains('T'));
        assert!(a.imported_at.contains('T'));
        // id は UUID v4（36 文字、4 つのハイフン）
        assert_eq!(a.id.len(), 36);
        assert_eq!(a.id.matches('-').count(), 4);
    }

    #[test]
    fn build_artifact_rejects_unsupported_extension() {
        let tmp = TempDir::new().unwrap();
        let path = write_file(&tmp, "notes.txt", "x");

        let err = build_artifact(&path).expect_err("should reject");
        assert!(err.contains("未対応"));
    }

    #[test]
    fn import_paths_skips_duplicates_and_unsupported() {
        let tmp = TempDir::new().unwrap();
        let md = write_file(&tmp, "a.md", "x");
        let html = write_file(&tmp, "b.html", "x");
        let txt = write_file(&tmp, "c.txt", "x");

        let mut lib = Library::empty();
        let first = import_paths(&mut lib, &[md.clone(), html.clone(), txt.clone()]);

        assert_eq!(first.added.len(), 2);
        assert_eq!(first.skipped_unsupported.len(), 1);
        assert!(first.skipped_unsupported[0].ends_with("c.txt"));
        assert_eq!(lib.artifacts.len(), 2);

        // 同じファイルを 2 回目インポートしたら全部 duplicate
        let second = import_paths(&mut lib, &[md.clone(), html.clone()]);
        assert_eq!(second.added.len(), 0);
        assert_eq!(second.skipped_duplicates.len(), 2);
        assert_eq!(lib.artifacts.len(), 2);
    }

    #[test]
    fn import_result_serializes_as_camel_case() {
        let r = ImportResult::default();
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"added\""));
        assert!(json.contains("\"skippedDuplicates\""));
        assert!(json.contains("\"skippedUnsupported\""));
    }

    #[test]
    fn dedup_key_handles_dot_segments_via_canonicalize() {
        // 同じ実体に対する別表記（`./`, `../subdir/file`）が canonicalize で
        // 同一キーに正規化されることを確認。
        let tmp = TempDir::new().unwrap();
        let nested = tmp.path().join("inner");
        fs::create_dir(&nested).unwrap();
        let canonical = write_file(&tmp, "a.md", "x");

        // tmp/./a.md と tmp/inner/../a.md は同じファイル
        let via_dot = tmp.path().join("./a.md");
        let via_parent = nested.join("../a.md");

        let k1 = dedup_key(&canonical);
        let k2 = dedup_key(&via_dot);
        let k3 = dedup_key(&via_parent);

        assert_eq!(k1, k2);
        assert_eq!(k1, k3);
    }

    #[test]
    fn import_paths_dedupes_via_canonical_path() {
        // 同じ実体への 2 つの表記を同一インポートで渡しても 1 件にしかならない。
        let tmp = TempDir::new().unwrap();
        let inner = tmp.path().join("d");
        fs::create_dir(&inner).unwrap();
        let canonical = write_file(&tmp, "a.md", "x");
        let via_parent = inner.join("../a.md");

        let mut lib = Library::empty();
        let result = import_paths(&mut lib, &[canonical.clone(), via_parent.clone()]);

        assert_eq!(result.added.len(), 1);
        assert_eq!(result.skipped_duplicates.len(), 1);
        assert_eq!(lib.artifacts.len(), 1);
    }

    #[test]
    fn dedup_key_falls_back_to_lossy_when_canonicalize_fails() {
        // 存在しないパスは canonicalize が Err を返すので、入力文字列がそのままキーになる。
        let bogus = Path::new("/__nonexistent__/__abcxyz__/foo.md");
        let key = dedup_key(bogus);
        assert_eq!(key, bogus.to_string_lossy().to_string());
    }
}
