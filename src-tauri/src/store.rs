use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

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

    pub fn find_by_id(&self, id: &str) -> Option<&Artifact> {
        self.artifacts.iter().find(|a| a.id == id)
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

fn tmp_path(path: &Path) -> PathBuf {
    let mut s = path.as_os_str().to_owned();
    s.push(".tmp");
    PathBuf::from(s)
}

fn bak_path(path: &Path) -> PathBuf {
    let mut s = path.as_os_str().to_owned();
    s.push(".bak");
    PathBuf::from(s)
}

/// `library.json` を **原子的に** 書き出す。
///
/// 1. `library.json.tmp` に書く + fsync
/// 2. 既存 `library.json` を `library.json.bak` へ rename（直前世代を 1 つ残す）
/// 3. `library.json.tmp` を `library.json` へ rename
///
/// 途中で kill / 電源断が起きても、本体が 0 バイト化して全データが消える事態を避ける。
pub fn save_library(path: &Path, library: &Library) -> Result<(), StoreError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| StoreError::Io(e.to_string()))?;
    }
    let json =
        serde_json::to_string_pretty(library).map_err(|e| StoreError::Parse(e.to_string()))?;

    let tmp = tmp_path(path);
    {
        let mut f = fs::File::create(&tmp).map_err(|e| StoreError::Io(e.to_string()))?;
        f.write_all(json.as_bytes())
            .map_err(|e| StoreError::Io(e.to_string()))?;
        // ディスクへの永続化を保証してから rename する
        f.sync_all().map_err(|e| StoreError::Io(e.to_string()))?;
    }

    if path.exists() {
        let bak = bak_path(path);
        // bak への rename は失敗してもファタルではない（古い世代の保持に失敗しただけ）。
        // ただし主目的の本体差し替えには影響しないので、エラーは握りつぶす。
        let _ = fs::rename(path, &bak);
    }

    fs::rename(&tmp, path).map_err(|e| StoreError::Io(e.to_string()))
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

    #[test]
    fn find_by_id_returns_artifact_when_present() {
        let lib = Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: vec![sample_artifact()],
        };
        assert!(lib.find_by_id("01HXYZ").is_some());
    }

    #[test]
    fn find_by_id_returns_none_when_missing() {
        let lib = Library::empty();
        assert!(lib.find_by_id("missing").is_none());
    }

    #[test]
    fn save_keeps_previous_generation_as_bak() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("library.json");

        let v1 = Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: vec![sample_artifact()],
        };
        save_library(&path, &v1).unwrap();
        assert!(path.exists());
        assert!(!bak_path(&path).exists(), "初回保存では bak は無い");

        let v2 = Library::empty();
        save_library(&path, &v2).unwrap();

        // 直前世代が .bak として残っている
        let bak = bak_path(&path);
        assert!(bak.exists(), ".bak が残るべき");
        let bak_loaded = load_library(&bak).unwrap();
        assert_eq!(bak_loaded, v1);
    }

    #[test]
    fn save_does_not_leave_tmp_file_on_success() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("library.json");

        save_library(&path, &Library::empty()).unwrap();

        assert!(!tmp_path(&path).exists(), ".tmp は残らない");
    }

    #[test]
    fn load_ignores_stale_tmp_file() {
        // .tmp が中途半端に残っている状況でも、本体が正しく読めることを確認。
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("library.json");

        save_library(&path, &Library::empty()).unwrap();

        // 後から壊れた .tmp を意図的に置く
        fs::write(tmp_path(&path), "broken {{ not json").unwrap();

        // 本体側を読みに行くので壊れていないこと
        let loaded = load_library(&path).unwrap();
        assert_eq!(loaded, Library::empty());
    }

    #[test]
    fn save_writes_via_tmp_then_rename() {
        // tmp ファイルが作られて、最終的に rename されることを path 比較で確認。
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("library.json");
        let tmp_p = tmp_path(&path);
        assert!(!tmp_p.exists());
        save_library(&path, &Library::empty()).unwrap();
        assert!(path.exists());
        assert!(!tmp_p.exists());
    }
}
