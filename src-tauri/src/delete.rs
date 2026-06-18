use std::collections::HashSet;

use crate::store::Library;

/// `ids` に含まれる Artifact をライブラリから取り除く。
/// 実ファイル (source_path) には一切触らない。
/// 戻り値は実際に削除されたエントリ数。
pub fn remove_artifacts(library: &mut Library, ids: &[String]) -> usize {
    let id_set: HashSet<&str> = ids.iter().map(String::as_str).collect();
    let before = library.artifacts.len();
    library.artifacts.retain(|a| !id_set.contains(a.id.as_str()));
    before - library.artifacts.len()
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
            generated_at: "2026-06-18".into(),
            imported_at: "2026-06-18T00:00:00Z".into(),
            updated_at: "2026-06-18T00:00:00Z".into(),
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
    fn single_id_is_removed() {
        let mut lib = lib_with(&["a", "b", "c"]);
        let removed = remove_artifacts(&mut lib, &["b".into()]);
        assert_eq!(removed, 1);
        let remaining: Vec<&str> = lib.artifacts.iter().map(|a| a.id.as_str()).collect();
        assert_eq!(remaining, vec!["a", "c"]);
    }

    #[test]
    fn multiple_ids_are_removed_in_one_call() {
        let mut lib = lib_with(&["a", "b", "c", "d"]);
        let removed = remove_artifacts(&mut lib, &["a".into(), "c".into()]);
        assert_eq!(removed, 2);
        let remaining: Vec<&str> = lib.artifacts.iter().map(|a| a.id.as_str()).collect();
        assert_eq!(remaining, vec!["b", "d"]);
    }

    #[test]
    fn missing_ids_are_silently_ignored() {
        let mut lib = lib_with(&["a", "b"]);
        let removed = remove_artifacts(&mut lib, &["x".into(), "a".into()]);
        assert_eq!(removed, 1);
        let remaining: Vec<&str> = lib.artifacts.iter().map(|a| a.id.as_str()).collect();
        assert_eq!(remaining, vec!["b"]);
    }

    #[test]
    fn empty_id_list_is_noop() {
        let mut lib = lib_with(&["a"]);
        let removed = remove_artifacts(&mut lib, &[]);
        assert_eq!(removed, 0);
        assert_eq!(lib.artifacts.len(), 1);
    }

    #[test]
    fn source_paths_are_left_untouched_in_state() {
        // pure 関数なので fs を触らないことは型で担保される。
        // ここでは保存パスが Library 上にも残らない（=エントリごと消える）ことを確認するだけ。
        let mut lib = lib_with(&["a"]);
        let before_path = lib.artifacts[0].source_path.clone();
        remove_artifacts(&mut lib, &["a".into()]);
        assert!(lib.artifacts.is_empty());
        // before_path は呼び出し側で参照可能（ファイル自体は外部に存在し続ける）
        assert!(before_path.ends_with("a.md"));
    }
}
