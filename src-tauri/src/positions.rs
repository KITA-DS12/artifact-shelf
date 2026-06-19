use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

pub type Positions = HashMap<String, f64>;

pub fn load_positions(path: &Path) -> Result<Positions, String> {
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_positions(path: &Path, positions: &Positions) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(positions).map_err(|e| e.to_string())?;
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

/// 単一 id のスクロール位置を上書き保存する。他の id は維持。
pub fn save_position_for(
    path: &Path,
    id: &str,
    position: f64,
) -> Result<(), String> {
    let mut positions = load_positions(path).unwrap_or_default();
    positions.insert(id.to_string(), position);
    save_positions(path, &positions)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn missing_file_returns_empty_map() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("positions.json");
        let positions = load_positions(&path).unwrap();
        assert!(positions.is_empty());
    }

    #[test]
    fn save_and_load_round_trip() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("positions.json");
        let mut p = Positions::new();
        p.insert("a".into(), 100.0);
        p.insert("b".into(), 250.5);
        save_positions(&path, &p).unwrap();
        let loaded = load_positions(&path).unwrap();
        assert_eq!(loaded, p);
    }

    #[test]
    fn save_position_for_preserves_other_entries() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("positions.json");
        let mut p = Positions::new();
        p.insert("keep".into(), 42.0);
        save_positions(&path, &p).unwrap();

        save_position_for(&path, "new", 99.0).unwrap();

        let loaded = load_positions(&path).unwrap();
        assert_eq!(loaded.get("keep").copied(), Some(42.0));
        assert_eq!(loaded.get("new").copied(), Some(99.0));
    }

    #[test]
    fn save_position_for_overwrites_same_id() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("positions.json");
        save_position_for(&path, "id", 10.0).unwrap();
        save_position_for(&path, "id", 20.0).unwrap();
        let loaded = load_positions(&path).unwrap();
        assert_eq!(loaded.get("id").copied(), Some(20.0));
    }
}
