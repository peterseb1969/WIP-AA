import { Users } from 'lucide-react'

export default function CharactersPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Characters</h1>
      </div>
      <p className="text-text-muted">Character profiles and relationships</p>
    </div>
  )
}
