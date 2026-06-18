use chrono::{DateTime, Utc};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
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

fn generated_at_from_mtime(path: &Path, fallback: DateTime<Utc>) -> String {
    let dt = std::fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .and_then(|d| DateTime::<Utc>::from_timestamp(d.as_secs() as i64, 0))
        .unwrap_or(fallback);
    dt.format("%Y-%m-%d").to_string()
}

pub fn build_artifact(path: &Path) -> Result<Artifact, String> {
    let file_type = detect_file_type(path).ok_or_else(|| {
        format!(
            "未対応のファイル形式です: {}",
            path.to_string_lossy()
        )
    })?;
    let now = Utc::now();
    let now_iso = now.to_rfc3339();
    let generated = generated_at_from_mtime(path, now);

    Ok(Artifact {
        id: Uuid::new_v4().to_string(),
        title: title_from_path(path),
        source_path: path.to_string_lossy().to_string(),
        file_type,
        tags: vec![],
        generated_at: generated,
        imported_at: now_iso.clone(),
        updated_at: now_iso,
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

pub fn import_paths(library: &mut Library, paths: &[PathBuf]) -> ImportResult {
    let existing: HashSet<String> = library
        .artifacts
        .iter()
        .map(|a| a.source_path.clone())
        .collect();
    let mut result = ImportResult::default();
    for path in paths {
        let path_str = path.to_string_lossy().to_string();
        if existing.contains(&path_str) {
            result.skipped_duplicates.push(path_str);
            continue;
        }
        match build_artifact(path) {
            Ok(artifact) => {
                result.added.push(artifact.clone());
                library.artifacts.push(artifact);
            }
            Err(_) => {
                result.skipped_unsupported.push(path_str);
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
        // generatedAt は YYYY-MM-DD 形式（10 文字）
        assert_eq!(a.generated_at.len(), 10);
        assert!(a.generated_at.contains('-'));
        // imported_at は ISO8601 → 'T' を含む
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
}
