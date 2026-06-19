import { useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { slugify } from "../lib/toc";
import { copyToClipboard } from "../lib/library";

import type { RefObject } from "react";

type Props = {
  content: string;
  rootRef?: RefObject<HTMLDivElement | null>;
};

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return nodeToText(props?.children);
  }
  return "";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="code-copy-btn"
      aria-label="コードをコピー"
      onClick={async () => {
        try {
          await copyToClipboard(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // 失敗時は表示変えない
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 id={slugify(nodeToText(children))}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 id={slugify(nodeToText(children))}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 id={slugify(nodeToText(children))}>{children}</h3>
  ),
  pre: ({ children }) => {
    const text = nodeToText(children);
    return (
      <div className="code-block">
        <pre>{children}</pre>
        <CopyButton text={text} />
      </div>
    );
  },
};

export function MarkdownView({ content, rootRef }: Props) {
  return (
    <div className="markdown-body" ref={rootRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
