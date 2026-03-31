import { PenTool } from 'lucide-react'

export default function ScenesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <PenTool className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Scene Editor</h1>
      </div>
      <p className="text-text-muted">Write, review, and refine scenes</p>
    </div>
  )
}
