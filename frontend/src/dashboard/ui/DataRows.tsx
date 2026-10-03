// A real <table> on wide screens; CSS stacks the cells under 768px
import { Link } from 'react-router'
import type { ReactNode } from 'react'

export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; primary?: boolean }

export function DataRows<T>({ caption, columns, rows, rowKey, rowHref }: { caption: string; columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; rowHref?: (r: T) => string }) {
  return (
    <table className="nx-rows">
      <caption className="sr-only">{caption}</caption>
      <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={rowKey(r)}>
            {columns.map((c) => (
              <td key={c.key} data-label={c.header} data-primary={c.primary || undefined}>
                {c.primary && rowHref ? <Link to={rowHref(r)} className="nx-rows__link">{c.cell(r)}</Link> : c.cell(r)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
