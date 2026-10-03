import { Route, Routes } from 'react-router'
import './dashboard.css'
import NotFoundPage from './pages/NotFoundPage'
import DashboardLayout from './shell/DashboardLayout'
import { useBreadcrumb } from './shell/breadcrumb'
import { EmptyState } from './ui/EmptyState'

// Stand-in for pages whose task has not landed yet; each owns exactly one h1.
function Placeholder({ name }: { name: string }) {
  useBreadcrumb([{ label: name }])
  return (
    <>
      <h1 className="nx-h1">{name}</h1>
      <EmptyState title={name} body="This page is not available yet." />
    </>
  )
}

const page = (name: string) => <Placeholder name={name} />

export default function NexusDashboard() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={page('Overview')} />
        <Route path="runs" element={page('Runs')} />
        <Route path="runs/:runId" element={page('Run')} />
        <Route path="agents" element={page('Agents')} />
        <Route path="knowledge" element={page('Knowledge')} />
        <Route path="documentation" element={page('Documentation')} />
        <Route path="qa" element={page('QA')} />
        <Route path="demos" element={page('Demos')} />
        <Route path="releases" element={page('Releases')} />
        <Route path="settings" element={page('Settings')} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
