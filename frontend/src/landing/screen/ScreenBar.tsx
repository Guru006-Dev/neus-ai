export function ScreenBar({ title, meta }: { title: string; meta: string }) {
  return (
    <header className="screen__bar">
      <span className="screen__title">{title}</span>
      <span>{meta}</span>
    </header>
  )
}
