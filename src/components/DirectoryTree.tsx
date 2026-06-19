import { useMemo, useState } from "react";
import type { Artifact } from "../types/artifact";
import { buildDirectoryTree, type DirNode } from "../lib/directory-tree";

type Props = {
  artifacts: readonly Artifact[];
  selected: string | null;
  onSelect: (directory: string | null) => void;
};

export function DirectoryTree({ artifacts, selected, onSelect }: Props) {
  const tree = useMemo(() => buildDirectoryTree(artifacts), [artifacts]);

  return (
    <nav className="dir-tree" aria-label="ディレクトリ">
      <div className="dir-tree-header">
        <span className="dir-tree-title">ディレクトリ</span>
      </div>
      <button
        type="button"
        className={`dir-row dir-all${selected === null ? " is-selected" : ""}`}
        onClick={() => onSelect(null)}
      >
        <span className="dir-name">すべて</span>
        <span className="dir-count">{artifacts.length}</span>
      </button>
      {tree.length === 0 ? (
        <p className="dir-tree-empty">登録があるとここに出ます</p>
      ) : (
        <ul className="dir-tree-list">
          {tree.map((node) => (
            <DirRow
              key={node.path}
              node={node}
              depth={0}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}

type RowProps = {
  node: DirNode;
  depth: number;
  selected: string | null;
  onSelect: (directory: string | null) => void;
};

function DirRow({ node, depth, selected, onSelect }: RowProps) {
  const hasChildren = node.children.length > 0;
  // 選択中の祖先は自動展開しておきたい
  const isAncestorOfSelected =
    !!selected &&
    selected !== node.path &&
    (selected.startsWith(node.path + "/") ||
      selected.startsWith(node.path + "\\"));
  const [open, setOpen] = useState(depth === 0 || isAncestorOfSelected);
  const isSelected = selected === node.path;

  return (
    <li className="dir-tree-node">
      <div className={`dir-row${isSelected ? " is-selected" : ""}`}>
        {hasChildren ? (
          <button
            type="button"
            className="dir-toggle"
            aria-label={open ? "閉じる" : "開く"}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="dir-toggle dir-toggle-leaf" aria-hidden="true">
            ・
          </span>
        )}
        <button
          type="button"
          className="dir-label"
          title={node.path}
          onClick={() => onSelect(node.path)}
        >
          <span className="dir-name">{node.name}</span>
          <span className="dir-count">{node.count}</span>
        </button>
      </div>
      {hasChildren && open && (
        <ul className="dir-tree-list">
          {node.children.map((c) => (
            <DirRow
              key={c.path}
              node={c}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
