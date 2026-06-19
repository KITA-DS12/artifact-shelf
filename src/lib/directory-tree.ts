import type { Artifact } from "../types/artifact";

export interface DirNode {
  /** 表示用ラベル。共通プレフィックス圧縮済み（例: "kita/works/repo"） */
  name: string;
  /** 絶対パス。フィルタの prefix として使う */
  path: string;
  /** この配下の Artifact 数（自分 + 子孫すべての合計） */
  count: number;
  /** 子ディレクトリ */
  children: DirNode[];
}

interface RawNode {
  name: string;
  fullPath: string;
  count: number;
  children: Map<string, RawNode>;
}

function detectSep(path: string): "/" | "\\" {
  if (isWindowsLike(path)) return "\\";
  return "/";
}

function isWindowsLike(path: string): boolean {
  // ドライブレター先頭、または \ を含み / を含まない
  if (/^[a-zA-Z]:/.test(path)) return true;
  return path.includes("\\") && !path.includes("/");
}

function dirPathOf(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  const lastBack = filePath.lastIndexOf("\\");
  const lastSep = Math.max(lastSlash, lastBack);
  if (lastSep <= 0) return "";
  return filePath.slice(0, lastSep);
}

function components(dirPath: string): string[] {
  return dirPath.split(/[\\/]/).filter((c) => c.length > 0);
}

function joinedPath(parts: string[], sep: "/" | "\\"): string {
  if (sep === "/") return "/" + parts.join("/");
  return parts.join("\\");
}

function buildRawForest(artifacts: readonly Artifact[]): Map<string, RawNode> {
  const roots = new Map<string, RawNode>();
  for (const a of artifacts) {
    const sep = detectSep(a.sourcePath);
    const dir = dirPathOf(a.sourcePath);
    const parts = components(dir);
    if (parts.length === 0) continue;

    let bucket = roots;
    const accum: string[] = [];
    let node: RawNode | undefined;
    for (const part of parts) {
      accum.push(part);
      node = bucket.get(part);
      if (!node) {
        node = {
          name: part,
          fullPath: joinedPath([...accum], sep),
          count: 0,
          children: new Map(),
        };
        bucket.set(part, node);
      }
      bucket = node.children;
    }
    if (node) node.count += 1;
  }
  return roots;
}

function compress(raw: RawNode): DirNode {
  let current = raw;
  let displayName = raw.name;

  // 自分に直接 artifact がいない & 子が 1 つだけ → 親と連結
  while (current.count === 0 && current.children.size === 1) {
    const onlyChild = current.children.values().next().value!;
    const sep = isWindowsLike(current.fullPath) ? "\\" : "/";
    displayName = displayName + sep + onlyChild.name;
    current = onlyChild;
  }

  const children = [...current.children.values()]
    .map(compress)
    .sort((a, b) => a.name.localeCompare(b.name));
  const count = current.count + children.reduce((s, c) => s + c.count, 0);
  return { name: displayName, path: current.fullPath, count, children };
}

/**
 * 全 Artifact の sourcePath からディレクトリの森を構築する。
 * 子が 1 つしかない中間ノードは親と連結してリポジトリ単位の塊を見せる。
 */
export function buildDirectoryTree(
  artifacts: readonly Artifact[],
): DirNode[] {
  const roots = buildRawForest(artifacts);
  return [...roots.values()]
    .map(compress)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * sourcePath が directory プレフィックスにマッチするか。
 * `dir + sep` で始まる、または完全一致を許可。
 */
export function isUnderDirectory(
  sourcePath: string,
  directory: string,
): boolean {
  if (sourcePath === directory) return true;
  return (
    sourcePath.startsWith(directory + "/") ||
    sourcePath.startsWith(directory + "\\")
  );
}
