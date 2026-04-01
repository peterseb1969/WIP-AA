import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import { TEMPLATES } from '../lib/constants'
import UnsavedDraftBanner from './UnsavedDraftBanner'
import {
  PenTool,
  LayoutGrid,
  LayoutDashboard,
  Users,
  BookOpen,
  Clock,
  MapPin,
  GitBranch,
  StickyNote,
  Globe,
  Upload,
  Menu,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/scenes', label: 'Scene Editor', icon: PenTool },
  { to: '/corkboard', label: 'Corkboard', icon: LayoutGrid },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/characters', label: 'Characters', icon: Users },
  { to: '/chapters', label: 'Chapters', icon: BookOpen },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/plot-threads', label: 'Plot Threads', icon: GitBranch },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/world-rules', label: 'World Rules', icon: Globe },
  { to: '/import', label: 'Import Book', icon: Upload },
] as const

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: projects } = useDocuments({ template_id: TEMPLATES.PROJECT, status: 'active' })
  const projectTitle = (projects?.items?.[0]?.data as Record<string, unknown> | undefined)?.title as string | undefined

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-primary text-white flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-primary-light">
          <span className="font-bold text-lg tracking-tight">AuthorAssist</span>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-text" />
          </button>
          <h1 className="text-sm font-medium text-text-muted truncate">
            {projectTitle ?? 'AuthorAssist'}
          </h1>
        </header>

        {/* Unsaved scene drafts — global reminder */}
        <UnsavedDraftBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
