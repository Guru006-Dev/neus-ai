import { Disclosure } from '../ui/Disclosure'

export function RawOutput({ raw }: { raw: unknown }) {
  return (
    <Disclosure summary="Raw output">
      <pre>{typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)}</pre>
    </Disclosure>
  )
}
