import { cn } from "@/lib/utils";
import mermaid from "mermaid";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createHighlighter, type Highlighter } from "shiki";

mermaid.initialize({ startOnLoad: false });
let _mermaidId = 0;

type MarkdownProps = {
  content: string;
  className?: string;
};

const THEMES = {
  light: "github-light-default",
  dark: "github-dark-default",
} as const;

// supporting languages. Add it.
const LANGS = [
  "text",
  "javascript",
  "typescript",
  "tsx",
  "json",
  "bash",
  "css",
  "html",
  "python",
  "java",
] as const;

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = `mermaid-diagram-${++_mermaidId}`;
    setSvg("");
    setError(null);

    mermaid
      .render(id, code)
      .then(({ svg }) => setSvg(svg))
      .catch((err) => setError(String(err)));
  }, [code]);

  if (error) {
    return (
      <pre className="my-6 overflow-x-auto rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto rounded-lg border p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function Markdown({ content, className }: MarkdownProps) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const h = await createHighlighter({
        themes: [THEMES.light, THEMES.dark],
        langs: [...LANGS],
      });

      if (alive) setHighlighter(h);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={cn("font-markdown text-[17px] leading-7", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="scroll-m-20 text-4xl font-extrabold tracking-tight mb-6"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mb-4"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-2"
              {...props}
            >
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className="leading-7 not-first:mt-6" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props}>
              {children}
            </ol>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="mt-6 border-l-2 pl-6 italic text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const lang = (match?.[1] || "text").toLowerCase();
            const code = String(children).replace(/\n$/, "");

            // inline codes
            if (!match) {
              return (
                <code
                  className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // mermaid diagrams
            if (lang === "mermaid") {
              return <MermaidBlock code={code} />;
            }

            // use common pre to occupy when highlighter is not ready.
            if (!highlighter) {
              return (
                <pre className="my-6 overflow-x-auto rounded-lg border bg-muted p-4">
                  <code className="font-mono text-sm">{code}</code>
                </pre>
              );
            }

            // Shiki：output two themes. Adapt to light and dark themes automatically.
            const html = highlighter.codeToHtml(code, {
              lang,
              themes: { light: THEMES.dark, dark: THEMES.light },
            });

            return (
              <div
                className="my-6 overflow-x-auto rounded-lg border text-sm
                           [&_.shiki]:p-4
                           [&_.shiki]:overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          },
          table: ({ children, ...props }) => (
            <div className="my-6 w-full overflow-x-auto">
              <table className="w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border px-4 py-2 text-left font-bold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border px-4 py-2 text-left" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
