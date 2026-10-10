import { useId, type ReactNode } from 'react'
export function Panel({ title, actions, children, id }: { title?: string; actions?: ReactNode; children: ReactNode; id?: string }) {
  const auto = useId()
  const titleId = `${id ?? auto}-title`
  return (
    <section className="nx-panel" aria-labelledby={title ? titleId : undefined} id={id}>
      {title && (
        <header className="nx-panel__head">
          <h2 id={titleId} className="nx-eyebrow">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
