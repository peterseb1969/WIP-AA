import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { WipProvider } from '@wip/react'
import { wipClient, queryClient } from './lib/wip'
import Layout from './components/Layout'
import AskBar from './components/AskBar'
import DashboardPage from './pages/DashboardPage'
import ScenesPage from './pages/ScenesPage'
import CorkboardPage from './pages/CorkboardPage'
import CharactersPage from './pages/CharactersPage'
import ChaptersPage from './pages/ChaptersPage'
import TimelinePage from './pages/TimelinePage'
import LocationsPage from './pages/LocationsPage'
import PlotThreadsPage from './pages/PlotThreadsPage'
import NotesPage from './pages/NotesPage'
import WorldRulesPage from './pages/WorldRulesPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WipProvider client={wipClient}>
        <BrowserRouter>
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
            </Route>
          </Routes>
          <AskBar />
        </BrowserRouter>
      </WipProvider>
    </QueryClientProvider>
  )
}
