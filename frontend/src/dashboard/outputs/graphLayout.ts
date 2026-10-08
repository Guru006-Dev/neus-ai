const RING: Record<string, number> = { CoreEntity: 0, Component: 1, SubEntity: 1, AnalysisDimension: 2, Relationship: 2 }

export function layoutGraph(nodes: { id: string; type: string }[], _edges: unknown[], size: number) {
  const c = size / 2
  const rings = new Map<number, number[]>()
  nodes.forEach((n, i) => { const r = n.id === 'root' ? 0 : (RING[n.type] ?? 2) || 1; rings.set(r, [...(rings.get(r) ?? []), i]) })
  const pos: { x: number; y: number }[] = nodes.map(() => ({ x: c, y: c }))
  for (const [r, idx] of rings) {
    if (r === 0) continue
    const radius = (size / 2 - 24) * (r / 2)
    idx.forEach((i, k) => { const a = (2 * Math.PI * k) / idx.length - Math.PI / 2; pos[i] = { x: Math.round((c + radius * Math.cos(a)) * 100) / 100, y: Math.round((c + radius * Math.sin(a)) * 100) / 100 } })
  }
  return pos
}
