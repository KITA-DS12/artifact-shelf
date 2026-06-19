use std::collections::HashSet;

use crate::store::Library;

/// `ids` の Artifact をゴミ箱に移動する（deleted_at を now_iso でセット）。
/// 実体ファイルは触らない。戻り値は新たにゴミ箱に入ったエントリ数（既に入っていたものは含まない）。
pub fn trash_artifacts(library: &mut Library, ids: &[String], now_iso: &str) -> usize {
    let id_set: HashSet<&str> = ids.iter().map(String::as_str).collect();
    let mut moved = 0;
    for a in &mut library.artifacts {
        if id_set.contains(a.id.as_str()) && a.deleted_at.is_none() {
            a.deleted_at = Some(now_iso.to_string());
            moved += 1;
        }
    }
    moved
}

/// `ids` の Artifact をゴミ箱から戻す（deleted_at を None に）。
/// 戻り値は実際に復元された数。
pub fn restore_artifacts(library: &mut Library, ids: &[String]) -> usize {
    let id_set: HashSet<&str> = ids.iter().map(String::as_str).collect();
    let mut restored = 0;
    for a in &mut library.artifacts {
        if id_set.contains(a.id.as_str()) && a.deleted_at.is_some() {
            a.deleted_at = None;
            restored += 1;
        }
    }
    restored
}

/// `ids` の Artifact を library から完全に取り除く（fs::remove_file は呼ばない）。
/// 戻り値は実際に消されたエントリ数。
pub fn purge_artifacts(library: &mut Library, ids: &[String]) -> usize {
    let id_set: HashSet<&str> = ids.iter().map(String::as_str).collect();
    let before = library.artifacts.len();
    library.artifacts.retain(|a| !id_set.contains(a.id.as_str()));
    before - library.artifacts.len()
}

/// ゴミ箱に入っている全 Artifact の id を返す。
pub fn trashed_ids(library: &Library) -> Vec<String> {
    library
        .artifacts
        .iter()
        .filter(|a| a.deleted_at.is_some())
        .map(|a| a.id.clone())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{Artifact, FileType, Library, Source, CURRENT_SCHEMA_VERSION};

    fn artifact(id: &str) -> Artifact {
        Artifact {
            id: id.into(),
            title: id.into(),
            source_path: format!("/tmp/{id}.md"),
            file_type: FileType::Markdown,
            tags: vec![],
            captured_at: "2026-06-18T00:00:00Z".into(),
            generated_at: None,
            imported_at: "2026-06-18T00:00:00Z".into(),
            updated_at: "2026-06-18T00:00:00Z".into(),
            opened_at: None,
            deleted_at: None,
            is_read: false,
            is_favorite: false,
            source: Source::Unknown,
            note: String::new(),
        }
    }

    fn lib_with(ids: &[&str]) -> Library {
        Library {
            version: CURRENT_SCHEMA_VERSION,
            artifacts: ids.iter().map(|id| artifact(id)).collect(),
        }
    }

    #[test]
    fn trash_sets_deleted_at_for_target_ids() {
        let mut lib = lib_with(&["a", "b", "c"]);
        let moved = trash_artifacts(&mut lib, &["b".into()], "2026-06-19T00:00:00Z");
        assert_eq!(moved, 1);
        assert!(lib.artifacts[0].deleted_at.is_none());
        assert_eq!(
            lib.artifacts[1].deleted_at.as_deref(),
            Some("2026-06-19T00:00:00Z")
        );
        assert!(lib.artifacts[2].deleted_at.is_none());
        // library 上から消えていない（trash 状態で残る）
        assert_eq!(lib.artifacts.len(), 3);
    }

    #[test]
    fn trash_is_idempotent_for_already_trashed() {
        let mut lib = lib_with(&["a"]);
        trash_artifacts(&mut lib, &["a".into()], "T1");
        let moved = trash_artifacts(&mut lib, &["a".into()], "T2");
        // 既に trash なので新たに移動した数は 0、時刻は T1 のまま維持
        assert_eq!(moved, 0);
        assert_eq!(lib.artifacts[0].deleted_at.as_deref(), Some("T1"));
    }

    #[test]
    fn restore_clears_deleted_at() {
        let mut lib = lib_with(&["a", "b"]);
        trash_artifacts(&mut lib, &["a".into(), "b".into()], "T1");
        let restored = restore_artifacts(&mut lib, &["a".into()]);
        assert_eq!(restored, 1);
        assert!(lib.artifacts[0].deleted_at.is_none());
        assert!(lib.artifacts[1].deleted_at.is_some());
    }

    #[test]
    fn restore_noop_for_non_trashed() {
        let mut lib = lib_with(&["a"]);
        let restored = restore_artifacts(&mut lib, &["a".into()]);
        assert_eq!(restored, 0);
    }

    #[test]
    fn purge_removes_from_library() {
        let mut lib = lib_with(&["a", "b", "c"]);
        trash_artifacts(&mut lib, &["b".into()], "T1");
        let removed = purge_artifacts(&mut lib, &["b".into()]);
        assert_eq!(removed, 1);
        let remaining: Vec<&str> = lib.artifacts.iter().map(|a| a.id.as_str()).collect();
        assert_eq!(remaining, vec!["a", "c"]);
    }

    #[test]
    fn purge_does_not_require_trash_state() {
        // active のものも purge できる（呼び出し側の責任で trash 経由を強制する）
        let mut lib = lib_with(&["a", "b"]);
        let removed = purge_artifacts(&mut lib, &["a".into()]);
        assert_eq!(removed, 1);
    }

    #[test]
    fn trashed_ids_lists_only_deleted() {
        let mut lib = lib_with(&["a", "b", "c"]);
        trash_artifacts(&mut lib, &["a".into(), "c".into()], "T1");
        let ids = trashed_ids(&lib);
        assert_eq!(ids, vec!["a".to_string(), "c".to_string()]);
    }
}
