import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// A step's text: one paragraph that may carry bold, italics and links. react-markdown
// doesn't render raw HTML, so user-entered text is safe to show here.
const components: Components = {
  p: ({ children }) => <>{children}</>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

export function InlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
      allowedElements={["p", "strong", "em", "del", "code", "a"]}
      unwrapDisallowed
    >
      {children}
    </ReactMarkdown>
  );
}
