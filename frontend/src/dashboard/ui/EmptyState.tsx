import type { ReactNode } from 'react'
export function EmptyState({ title, body, action, tone = 'neutral' }: { title: string; body: ReactNode; action?: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div className="nx-empty" data-tone={tone}>
      <p className="nx-empty__title">{title}</p>
      <div className="nx-empty__body">{body}</div>
      {action}
    </div>
  )
}
