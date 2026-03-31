import { LayoutGrid } from 'lucide-react'

export default function CorkboardPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Corkboard</h1>
      </div>
      <p className="text-text-muted">Visual story structure with draggable cards</p>
    </div>
  )
}
