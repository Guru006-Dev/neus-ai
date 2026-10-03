import type { ReactNode } from 'react'
export function Panel({ title, actions, children, id }: { title?: string; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="nx-panel" aria-labelledby={title ? `${id}-title` : undefined} id={id}>
      {title && (
        <header className="nx-panel__head">
          <h2 id={`${id}-title`} className="nx-eyebrow">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
