import { BookOpen } from 'lucide-react'

export default function ChaptersPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Chapters</h1>
      </div>
      <p className="text-text-muted">Chapter management and scene ordering</p>
    </div>
  )
}
