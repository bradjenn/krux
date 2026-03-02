import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/atom-one-dark.css'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-primary">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold mb-3 mt-5 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mb-2 mt-3 text-muted-foreground">{children}</h4>
  ),
  p: ({ children }) => <p className="text-base mb-3 leading-relaxed text-foreground">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-base mb-3 space-y-1 text-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-base mb-3 space-y-1 text-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-base">{children}</li>,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="border-collapse w-full text-base">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-1.5 text-left font-semibold border border-border text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5 border border-border text-muted-foreground">{children}</td>
  ),
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mr-2 [accent-color:var(--accent)]"
      {...props}
    />
  ),
  pre: ({ children }) => (
    <pre className="p-4 mb-4 overflow-x-auto text-base rounded-lg bg-background border border-border">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('hljs') || className?.startsWith('language-')
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="px-1.5 py-0.5 rounded text-base bg-surface text-primary" {...props}>
        {children}
      </code>
    )
  },
  blockquote: ({ children }) => (
    <blockquote className="pl-4 my-3 border-l-2 border-l-primary text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  a: ({ href, children }) => (
    <a href={href} className="underline text-primary" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
}

export function DocViewer({ content }: { content: string }) {
  return (
    <div className="max-w-4xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
