import { StickyNote } from 'lucide-react'

export default function NotesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <StickyNote className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Notes</h1>
      </div>
      <p className="text-text-muted">Ideas, research, and scratchpad</p>
    </div>
  )
}
