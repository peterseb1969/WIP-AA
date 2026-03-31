import { MapPin } from 'lucide-react'

export default function LocationsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Locations</h1>
      </div>
      <p className="text-text-muted">Places and containment hierarchy</p>
    </div>
  )
}
