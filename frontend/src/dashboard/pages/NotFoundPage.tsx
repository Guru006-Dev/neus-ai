import { Link } from 'react-router'
import { EmptyState } from '../ui/EmptyState'
import { useBreadcrumb } from '../shell/breadcrumb'

export default function NotFoundPage() {
  useBreadcrumb([{ label: 'Not found' }])
  return (
    <>
      <h1 className="nx-h1">Page not found</h1>
      <EmptyState
        title="This page doesn't exist"
        body="Check the address, or go back to the overview."
        action={<Link to="/dashboard" className="nx-btn nx-btn--ghost">Go to Overview</Link>}
      />
    </>
  )
}
