/**
 * A shell command shown for the reader to copy. It wraps only between
 * arguments: each argument stays whole, so a narrow box never splits
 * `--setting` or a namespace name at a hyphen, and a copy keeps the plain
 * text (no non-breaking characters).
 */
export default function CommandLine({ command, className = '' }: { command: string; className?: string }) {
  const parts = command.split(' ')
  return (
    <pre className={`whitespace-pre-wrap rounded px-2 py-1 text-xs ${className}`}>
      {parts.map((part, i) => (
        <span key={i}>
          <span className="whitespace-nowrap">{part}</span>
          {i < parts.length - 1 ? ' ' : ''}
        </span>
      ))}
    </pre>
  )
}
