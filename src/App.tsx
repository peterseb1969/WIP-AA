import { lazy } from 'react'
import './i18n'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { WipProvider } from '@wip/react'
import { StructureUndoProvider } from './lib/structureUndo'
import { wipClient, queryClient } from './lib/wip'
import { BootstrapGate } from './components/BootstrapGate'
import Layout from './components/Layout'
import AskBar from './components/AskBar'
// Each page is its own chunk, loaded on first visit: one bundle held every
// page, the editor and the import wizard (1.26 MB). Layout shows a loading
// line meanwhile.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ScenesPage = lazy(() => import('./pages/ScenesPage'))
const CorkboardPage = lazy(() => import('./pages/CorkboardPage'))
const CharactersPage = lazy(() => import('./pages/CharactersPage'))
const ChaptersPage = lazy(() => import('./pages/ChaptersPage'))
const TimelinePage = lazy(() => import('./pages/TimelinePage'))
const LocationsPage = lazy(() => import('./pages/LocationsPage'))
const PlotThreadsPage = lazy(() => import('./pages/PlotThreadsPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))
const WorldRulesPage = lazy(() => import('./pages/WorldRulesPage'))
const PromptsPage = lazy(() => import('./pages/PromptsPage'))
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage'))
const ImportPage = lazy(() => import('./pages/ImportPage'))
const ExportPage = lazy(() => import('./pages/ExportPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// CASE-370 surface #10: when the app is mounted under a path prefix
// (e.g. /apps/aa behind the wip-deploy gateway), the router must know the
// prefix or every client-side route 404s. Vite's BASE_URL mirrors
// config.base (always ends with '/'); strip the trailing slash.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  return (
    <BootstrapGate>
      <QueryClientProvider client={queryClient}>
        <WipProvider client={wipClient}>
          <StructureUndoProvider>
          <BrowserRouter basename={BASENAME}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/scenes" element={<ScenesPage />} />
                <Route path="/corkboard" element={<CorkboardPage />} />
                <Route path="/characters" element={<CharactersPage />} />
                <Route path="/chapters" element={<ChaptersPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/plot-threads" element={<PlotThreadsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/world-rules" element={<WorldRulesPage />} />
                <Route path="/prompts" element={<PromptsPage />} />
                <Route path="/media" element={<MediaLibraryPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
            <AskBar />
          </BrowserRouter>
          </StructureUndoProvider>
        </WipProvider>
      </QueryClientProvider>
    </BootstrapGate>
  )
}
