import { Globe } from 'lucide-react'

export default function WorldRulesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">World Rules</h1>
      </div>
      <p className="text-text-muted">Laws and constraints of the story universe</p>
    </div>
  )
}
