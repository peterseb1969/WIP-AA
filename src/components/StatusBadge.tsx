interface StatusBadgeProps {
  label: string
  colorClass?: string
}

const DEFAULT_COLOR = 'bg-gray-200 text-gray-700'

export default function StatusBadge({ label, colorClass = DEFAULT_COLOR }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
