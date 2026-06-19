/// 本文クエリのマッチ判定（case-insensitive 部分一致）。
/// 空クエリは常に true。
pub fn matches_query(content: &str, query: &str) -> bool {
    let q = query.trim();
    if q.is_empty() {
        return true;
    }
    content.to_lowercase().contains(&q.to_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_query_matches_everything() {
        assert!(matches_query("hello", ""));
        assert!(matches_query("", ""));
    }

    #[test]
    fn case_insensitive_contains() {
        assert!(matches_query("Hello World", "world"));
        assert!(matches_query("Hello WORLD", "WoRlD"));
        assert!(!matches_query("Hello", "world"));
    }

    #[test]
    fn japanese_substring() {
        assert!(matches_query("認証フローのレビュー", "認証"));
        assert!(matches_query("認証フローのレビュー", "フロー"));
        assert!(!matches_query("認証フローのレビュー", "決済"));
    }

    #[test]
    fn whitespace_only_query_matches_everything() {
        assert!(matches_query("hello", "   "));
    }
}
