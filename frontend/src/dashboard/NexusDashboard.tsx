import { Route, Routes } from 'react-router'
import './dashboard.css'
import OverviewPage from './pages/OverviewPage'
import NotFoundPage from './pages/NotFoundPage'
import RunDetailPage from './pages/RunDetailPage'
import RunsPage from './pages/RunsPage'
import AgentsPage from './pages/AgentsPage'
import OutputSectionPage from './pages/OutputSectionPage'
import SettingsPage from './pages/SettingsPage'
import DashboardLayout from './shell/DashboardLayout'

export default function NexusDashboard() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="runs/:runId" element={<RunDetailPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="knowledge" element={<OutputSectionPage kind="knowledge" />} />
        <Route path="documentation" element={<OutputSectionPage kind="documentation" />} />
        <Route path="qa" element={<OutputSectionPage kind="qa" />} />
        <Route path="demos" element={<OutputSectionPage kind="demos" />} />
        <Route path="releases" element={<OutputSectionPage kind="releases" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
