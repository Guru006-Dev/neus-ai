import type { ReactNode } from 'react'
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return <details className="nx-disclosure"><summary>{summary}</summary><div className="nx-disclosure__body">{children}</div></details>
}
