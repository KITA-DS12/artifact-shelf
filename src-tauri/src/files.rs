use std::path::Path;

use crate::store::Library;

pub fn missing_artifact_ids(library: &Library) -> Vec<String> {
    library
        .artifacts
        .iter()
        .filter(|a| !Path::new(&a.source_path).exists())
        .map(|a| a.id.clone())
        .collect()
}

pub fn relink(
    library: &mut Library,
    id: &str,
    new_path: &str,
    now_iso: &str,
) -> Result<crate::store::Artifact, String> {
    let artifact = library
        .artifacts
        .iter_mut()
        .find(|a| a.id == id)
        .ok_or_else(|| format!("Artifact が見つかりません: {id}"))?;
    artifact.source_path = new_path.to_string();
    artifact.updated_at = now_iso.to_string();
    Ok(artifact.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{Artifact, FileType, Library, Source, CURRENT_SCHEMA_VERSION};
    use std::fs;
    use tempfile::TempDir;

    fn artifact(id: &str, path: &str) -> Artifact {
        Artifact {
            id: id.into(),
            title: id.into(),
            source_path: path.into(),
            file_type: FileType::Markdown,
            tags: vec![],
            captured_at: "2026-06-18T00:00:00Z".into(),
            generated_at: None,
            imported_at: "2026-06-18T00:00:00Z".into(),
            updated_at: "2026-06-18T00:00:00Z".into(),
            is_read: false,
            is_favorite: false,
            source: Source::Unknown,
            note: String::new(),
        }
    }

    #[test]
    fn missing_returns_ids_for_paths_that_dont_exist() {
        let tmp = TempDir::new().unwrap();
        let existing = tmp.path().join("ok.md");
        fs::write(&existing, "x").unwrap();

        let lib = Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: vec![
                artifact("ok", existing.to_str().unwrap()),
                artifact("ng", "/nonexistent/abcxyz.md"),
            ],
        };

        assert_eq!(missing_artifact_ids(&lib), vec!["ng".to_string()]);
    }

    #[test]
    fn relink_updates_source_path_and_updated_at() {
        let mut lib = Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: vec![artifact("id", "/old.md")],
        };
        let updated = relink(&mut lib, "id", "/new.md", "2026-06-19T00:00:00Z").unwrap();
        assert_eq!(updated.source_path, "/new.md");
        assert_eq!(updated.updated_at, "2026-06-19T00:00:00Z");
        assert_eq!(lib.artifacts[0].source_path, "/new.md");
    }

    #[test]
    fn relink_returns_error_for_missing_id() {
        let mut lib = Library::empty();
        let err = relink(&mut lib, "missing", "/p", "now").unwrap_err();
        assert!(err.contains("見つかりません"));
    }
}
