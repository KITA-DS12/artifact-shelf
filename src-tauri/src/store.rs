use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Markdown,
    Html,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Source {
    Claude,
    #[serde(rename = "ChatGPT")]
    ChatGpt,
    Gemini,
    Manual,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Artifact {
    pub id: String,
    pub title: String,
    pub source_path: String,
    pub file_type: FileType,
    pub tags: Vec<String>,
    pub generated_at: String,
    pub imported_at: String,
    pub updated_at: String,
    pub is_read: bool,
    pub is_favorite: bool,
    pub source: Source,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Library {
    pub version: u32,
    pub artifacts: Vec<Artifact>,
}

impl Library {
    pub fn empty() -> Self {
        Self {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: Vec::new(),
        }
    }
}

#[derive(Debug)]
pub enum StoreError {
    Io(String),
    Parse(String),
}

impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreError::Io(m) => write!(f, "I/O error: {m}"),
            StoreError::Parse(m) => write!(f, "Parse error: {m}"),
        }
    }
}

impl std::error::Error for StoreError {}

pub fn load_library(path: &Path) -> Result<Library, StoreError> {
    if !path.exists() {
        return Ok(Library::empty());
    }
    let content = fs::read_to_string(path).map_err(|e| StoreError::Io(e.to_string()))?;
    serde_json::from_str(&content).map_err(|e| StoreError::Parse(e.to_string()))
}

pub fn save_library(path: &Path, library: &Library) -> Result<(), StoreError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| StoreError::Io(e.to_string()))?;
    }
    let json =
        serde_json::to_string_pretty(library).map_err(|e| StoreError::Parse(e.to_string()))?;
    fs::write(path, json).map_err(|e| StoreError::Io(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn sample_artifact() -> Artifact {
        Artifact {
            id: "01HXYZ".into(),
            title: "認証フローのレビュー".into(),
            source_path: "/tmp/review.md".into(),
            file_type: FileType::Markdown,
            tags: vec!["review".into(), "auth".into()],
            generated_at: "2026-06-18".into(),
            imported_at: "2026-06-18T10:00:00+09:00".into(),
            updated_at: "2026-06-18T10:00:00+09:00".into(),
            is_read: false,
            is_favorite: false,
            source: Source::Claude,
            note: "Next.jsの認証設計レビュー".into(),
        }
    }

    #[test]
    fn empty_library_uses_current_schema_version() {
        let lib = Library::empty();
        assert_eq!(lib.version, CURRENT_SCHEMA_VERSION);
        assert!(lib.artifacts.is_empty());
    }

    #[test]
    fn load_returns_empty_when_file_missing() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("library.json");

        let loaded = load_library(&path).expect("missing file should yield empty");

        assert_eq!(loaded, Library::empty());
    }

    #[test]
    fn round_trip_preserves_library() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("subdir/library.json");

        let library = Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: vec![sample_artifact()],
        };

        save_library(&path, &library).expect("save");
        let loaded = load_library(&path).expect("load");

        assert_eq!(loaded, library);
    }

    #[test]
    fn load_returns_parse_error_for_corrupt_json() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("library.json");
        fs::write(&path, "this is not json").unwrap();

        let result = load_library(&path);

        match result {
            Err(StoreError::Parse(_)) => {}
            other => panic!("expected Parse error, got {other:?}"),
        }
    }

    #[test]
    fn source_chatgpt_serializes_as_chatgpt() {
        let json = serde_json::to_string(&Source::ChatGpt).unwrap();
        assert_eq!(json, "\"ChatGPT\"");
    }

    #[test]
    fn file_type_serializes_as_lowercase() {
        assert_eq!(
            serde_json::to_string(&FileType::Markdown).unwrap(),
            "\"markdown\""
        );
        assert_eq!(
            serde_json::to_string(&FileType::Html).unwrap(),
            "\"html\""
        );
    }
}
