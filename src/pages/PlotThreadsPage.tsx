import { GitBranch } from 'lucide-react'

export default function PlotThreadsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Plot Threads</h1>
      </div>
      <p className="text-text-muted">Narrative arcs and subplots</p>
    </div>
  )
}
