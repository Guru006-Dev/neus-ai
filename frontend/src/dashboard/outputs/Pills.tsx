export function Pills({ items }: { items: string[] }) {
  return <ul className="nx-pills">{items.map((c, i) => <li key={`${c}-${i}`} className="nx-pill">{c}</li>)}</ul>
}
