use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// Inbox フォルダのパス。設定されていれば起動時 + 手動 scan で対象を取り込む。
    #[serde(default)]
    pub inbox_path: Option<String>,
}

pub fn load_settings(path: &Path) -> Result<Settings, String> {
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_settings(path: &Path, settings: &Settings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json =
        serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    // library.json と同じく tmp → rename で atomic 書き込み
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp_path = PathBuf::from(tmp);
    {
        let mut f = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        f.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp_path, path).map_err(|e| e.to_string())
}

/// Inbox フォルダ直下の対応拡張子ファイルを列挙する（再帰しない）。
pub fn scan_inbox(dir: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut paths = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if !p.is_file() {
            continue;
        }
        if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
            let lower = ext.to_ascii_lowercase();
            if matches!(lower.as_str(), "md" | "mdx" | "html" | "htm") {
                paths.push(p);
            }
        }
    }
    paths.sort();
    Ok(paths)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn default_settings_have_no_inbox() {
        let s = Settings::default();
        assert_eq!(s.inbox_path, None);
    }

    #[test]
    fn round_trip_save_load() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("settings.json");
        let s = Settings {
            inbox_path: Some("/Users/me/inbox".into()),
        };
        save_settings(&path, &s).unwrap();
        let loaded = load_settings(&path).unwrap();
        assert_eq!(loaded, s);
    }

    #[test]
    fn missing_file_returns_default() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("missing.json");
        let loaded = load_settings(&path).unwrap();
        assert_eq!(loaded, Settings::default());
    }

    #[test]
    fn scan_returns_supported_extensions_only() {
        let tmp = TempDir::new().unwrap();
        for name in ["a.md", "b.mdx", "c.html", "d.htm", "e.txt", "f.pdf"] {
            fs::write(tmp.path().join(name), "x").unwrap();
        }
        let paths = scan_inbox(tmp.path()).unwrap();
        let names: Vec<String> = paths
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();
        assert_eq!(names, vec!["a.md", "b.mdx", "c.html", "d.htm"]);
    }

    #[test]
    fn scan_ignores_subdirectories() {
        let tmp = TempDir::new().unwrap();
        let sub = tmp.path().join("sub");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("x.md"), "x").unwrap();
        fs::write(tmp.path().join("y.md"), "y").unwrap();

        let paths = scan_inbox(tmp.path()).unwrap();
        let names: Vec<String> = paths
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();
        // ディレクトリは無視、ファイルだけ
        assert_eq!(names, vec!["y.md"]);
    }

    #[test]
    fn scan_returns_empty_for_missing_dir() {
        let paths = scan_inbox(Path::new("/__nonexistent__/__abc__")).unwrap();
        assert!(paths.is_empty());
    }
}
