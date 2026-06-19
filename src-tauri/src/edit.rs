use serde::{Deserialize, Serialize};

use crate::store::{Artifact, Library, Source};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactUpdate {
    pub title: String,
    pub tags: Vec<String>,
    pub note: String,
    pub is_read: bool,
    pub is_favorite: bool,
    pub source: Source,
}

pub fn apply_update(
    library: &mut Library,
    id: &str,
    update: &ArtifactUpdate,
    now_iso: &str,
) -> Result<Artifact, String> {
    let artifact = library
        .artifacts
        .iter_mut()
        .find(|a| a.id == id)
        .ok_or_else(|| format!("Artifact が見つかりません: {id}"))?;
    artifact.title = update.title.clone();
    artifact.tags = update.tags.clone();
    artifact.note = update.note.clone();
    artifact.is_read = update.is_read;
    artifact.is_favorite = update.is_favorite;
    artifact.source = update.source;
    artifact.updated_at = now_iso.to_string();
    Ok(artifact.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{Artifact, FileType, Library, CURRENT_SCHEMA_VERSION};

    fn sample() -> Artifact {
        Artifact {
            id: "id-1".into(),
            title: "old title".into(),
            source_path: "/tmp/a.md".into(),
            file_type: FileType::Markdown,
            tags: vec!["t1".into()],
            captured_at: "2026-06-18T10:00:00+09:00".into(),
            generated_at: Some("2026-06-18".into()),
            imported_at: "2026-06-18T10:00:00+09:00".into(),
            updated_at: "2026-06-18T10:00:00+09:00".into(),
            opened_at: None,
            deleted_at: None,
            is_read: false,
            is_favorite: false,
            source: Source::Unknown,
            note: "old note".into(),
        }
    }

    fn lib_with_sample() -> Library {
        Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: vec![sample()],
        }
    }

    fn update() -> ArtifactUpdate {
        ArtifactUpdate {
            title: "new title".into(),
            tags: vec!["a".into(), "b".into()],
            note: "new note".into(),
            is_read: true,
            is_favorite: true,
            source: Source::Claude,
        }
    }

    #[test]
    fn apply_update_overwrites_editable_fields() {
        let mut lib = lib_with_sample();
        let updated =
            apply_update(&mut lib, "id-1", &update(), "2026-06-19T00:00:00Z").unwrap();
        assert_eq!(updated.title, "new title");
        assert_eq!(updated.tags, vec!["a", "b"]);
        assert_eq!(updated.note, "new note");
        assert!(updated.is_read);
        assert!(updated.is_favorite);
        assert_eq!(updated.source, Source::Claude);
        assert_eq!(updated.updated_at, "2026-06-19T00:00:00Z");
    }

    #[test]
    fn apply_update_preserves_immutable_fields() {
        let mut lib = lib_with_sample();
        let before = sample();
        apply_update(&mut lib, "id-1", &update(), "now").unwrap();
        let after = &lib.artifacts[0];
        assert_eq!(after.id, before.id);
        assert_eq!(after.source_path, before.source_path);
        assert_eq!(after.file_type, before.file_type);
        assert_eq!(after.imported_at, before.imported_at);
        assert_eq!(after.generated_at, before.generated_at);
    }

    #[test]
    fn apply_update_returns_error_when_id_missing() {
        let mut lib = lib_with_sample();
        let err = apply_update(&mut lib, "missing", &update(), "now").unwrap_err();
        assert!(err.contains("見つかりません"));
    }

    #[test]
    fn apply_update_persists_in_library() {
        let mut lib = lib_with_sample();
        apply_update(&mut lib, "id-1", &update(), "now").unwrap();
        assert_eq!(lib.artifacts[0].title, "new title");
    }
}
