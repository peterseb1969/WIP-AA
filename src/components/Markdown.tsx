import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders Markdown from Claude (analysis results, Ask bar answers) as
 * formatted text. Raw HTML in the source is not rendered (react-markdown's
 * default), and link URLs are sanitised, so model output cannot inject
 * markup. GitHub-flavoured extras (tables, strikethrough, task lists) come
 * from remark-gfm. Sized for side panels: compact headings, tight lists.
 */
const components: Components = {
  h1: ({ children }) => <h3 className="text-base font-semibold text-text mt-4 mb-2 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="text-sm font-semibold text-text mt-4 mb-1.5 first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="text-sm font-semibold text-text mt-3 mb-1 first:mt-0">{children}</h5>,
  h4: ({ children }) => <h6 className="text-sm font-medium text-text mt-3 mb-1 first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 pl-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 pl-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => <blockquote className="my-2 pl-3 border-l-2 border-gray-300 text-text-muted italic">{children}</blockquote>,
  hr: () => <hr className="my-3 border-gray-200" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary-dark">{children}</a>
  ),
  code: ({ className, children }) => className
    ? <code className={`${className} block`}>{children}</code>
    : <code className="px-1 py-0.5 rounded bg-gray-100 text-[0.85em] font-mono">{children}</code>,
  pre: ({ children }) => <pre className="my-2 p-2 rounded bg-gray-100 text-xs font-mono overflow-x-auto">{children}</pre>,
  table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="text-xs border-collapse">{children}</table></div>,
  th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-surface text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-gray-200 px-2 py-1 align-top">{children}</td>,
}

export default function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  )
}
