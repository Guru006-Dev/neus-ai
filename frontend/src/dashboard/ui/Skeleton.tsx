export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return (
    <div className="nx-skeleton" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => <span key={i} aria-hidden="true" className="nx-skeleton__line" />)}
    </div>
  )
}
