import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { slugify } from "../lib/toc";

type Props = {
  content: string;
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
};

export function MarkdownView({ content }: Props) {
  return (
    <div className="markdown-body">
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
