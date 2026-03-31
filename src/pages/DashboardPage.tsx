import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
      </div>
      <p className="text-text-muted">Project overview, stats, and recent activity</p>
    </div>
  )
}
