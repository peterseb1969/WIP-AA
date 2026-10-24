import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import UnsavedDraftBanner from './UnsavedDraftBanner'
import LanguageSwitcher from './LanguageSwitcher'
import { StructureUndoControl } from '../lib/structureUndo'
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
  FileDown,
  Settings,
  Sparkles,
  Menu,
  X,
  Images,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/scenes', labelKey: 'nav.scenes', icon: PenTool },
  { to: '/corkboard', labelKey: 'nav.corkboard', icon: LayoutGrid },
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/characters', labelKey: 'nav.characters', icon: Users },
  { to: '/chapters', labelKey: 'nav.chapters', icon: BookOpen },
  { to: '/timeline', labelKey: 'nav.timeline', icon: Clock },
  { to: '/locations', labelKey: 'nav.locations', icon: MapPin },
  { to: '/plot-threads', labelKey: 'nav.plot_threads', icon: GitBranch },
  { to: '/notes', labelKey: 'nav.notes', icon: StickyNote },
  { to: '/world-rules', labelKey: 'nav.world_rules', icon: Globe },
  { to: '/media', labelKey: 'nav.media', icon: Images },
  { to: '/prompts', labelKey: 'nav.prompts', icon: Sparkles },
  { to: '/import', labelKey: 'nav.import', icon: Upload },
  { to: '/export', labelKey: 'nav.export', icon: FileDown },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
] as const

export default function Layout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: projects } = useDocuments({ template_id: TEMPLATES.PROJECT, status: 'active', namespace: NAMESPACE })
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
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
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
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-primary-light">
          <LanguageSwitcher />
        </div>
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
          <div className="ml-auto flex items-center gap-1">
            {/* Unsaved scene drafts (a save failed) and structure undo */}
            <UnsavedDraftBanner />
            <StructureUndoControl />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {/* Pages load on first visit (App.tsx); the sidebar stays meanwhile. */}
          <Suspense fallback={<div className="p-6 text-text-muted">{t('common.loading')}</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
