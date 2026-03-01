import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0" style={{ color: 'var(--accent)' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold mb-3 mt-5" style={{ color: 'var(--text)' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4" style={{ color: 'var(--text)' }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mb-2 mt-3" style={{ color: 'var(--text-muted)' }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text)' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-sm mb-3 space-y-1" style={{ color: 'var(--text)' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-sm mb-3 space-y-1" style={{ color: 'var(--text)' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-sm">{children}</li>,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="border-collapse w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: 'var(--bg2)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      className="px-3 py-1.5 text-left font-semibold"
      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-3 py-1.5"
      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
    >
      {children}
    </td>
  ),
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mr-2"
      style={{ accentColor: 'var(--accent)' }}
      {...props}
    />
  ),
  pre: ({ children }) => (
    <pre
      className="p-4 mb-4 overflow-x-auto text-sm rounded-lg"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.startsWith('hljs') || className?.startsWith('language-')
    if (isBlock) {
      return <code className={className} {...props}>{children}</code>
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded text-sm"
        style={{ background: 'var(--bg2)', color: 'var(--accent)' }}
        {...props}
      >
        {children}
      </code>
    )
  },
  blockquote: ({ children }) => (
    <blockquote
      className="pl-4 my-3"
      style={{ borderLeft: '2px solid var(--accent)', color: 'var(--text-muted)' }}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6" style={{ borderColor: 'var(--border)' }} />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline"
      style={{ color: 'var(--accent)' }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-bold" style={{ color: 'var(--text)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic" style={{ color: 'var(--text-muted)' }}>{children}</em>
  ),
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
