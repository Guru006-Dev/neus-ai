// Markdown subset: block parser + inline (**bold**, `code`). Text goes through React, so it is escaped by construction.
import type { ReactNode } from 'react'

function inline(s: string, key: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((t, i) =>
    t.startsWith('**') ? <strong key={`${key}-${i}`}>{t.slice(2, -2)}</strong> : t.startsWith('`') ? <code key={`${key}-${i}`}>{t.slice(1, -1)}</code> : t)
}

export function renderMarkdown(src: string): ReactNode[] {
  const out: ReactNode[] = []
  const lines = src.replace(/\r\n|[\r\u2028\u2029]/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) { const Tag = (['h3', 'h4', 'h5'] as const)[h[1].length - 1]; out.push(<Tag key={i}>{inline(h[2], `h${i}`)}</Tag>); i++; continue }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: ReactNode[] = []
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) { items.push(<li key={i}>{inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''), `l${i}`)}</li>); i++ }
      out.push(ordered ? <ol key={`o${i}`}>{items}</ol> : <ul key={`u${i}`}>{items}</ul>)
      continue
    }
    if (!line.trim()) { i++; continue }
    const para: string[] = []
    para.push(lines[i++]) // always consume the current line: guarantees progress
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) para.push(lines[i++])
    out.push(<p key={`p${i}`}>{inline(para.join(' '), `p${i}`)}</p>)
  }
  return out
}
