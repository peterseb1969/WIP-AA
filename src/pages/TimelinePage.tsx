import { Clock } from 'lucide-react'

export default function TimelinePage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Timeline</h1>
      </div>
      <p className="text-text-muted">Chronological event visualization</p>
    </div>
  )
}
