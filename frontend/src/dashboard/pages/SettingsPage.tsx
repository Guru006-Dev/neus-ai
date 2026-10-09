import { useState, type FormEvent } from 'react'
import { setApiKey } from '../data/settings'
import { useBreadcrumb } from '../shell/breadcrumb'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'

const CRUMBS = [{ label: 'Settings' }]

export default function SettingsPage() {
  useBreadcrumb(CRUMBS)
  const [key, setKey] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<'saved' | 'failed' | null>(null)
  const canSave = key.trim().length > 0 && !pending

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setPending(true)
    setResult(null)
    try {
      await setApiKey(key)
      setKey('')
      setResult('saved')
    } catch {
      setResult('failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <h1 className="nx-h1">Settings</h1>
      <Panel id="api-key" title="Backend">
        <form className="nx-goal" onSubmit={(e) => void save(e)}>
          <label htmlFor="gemini-key" className="nx-eyebrow">Gemini API key</label>
          <input
            id="gemini-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="nx-goal__input"
            value={key}
            onChange={(e) => { setKey(e.target.value); setResult(null) }}
            aria-describedby="gemini-key-note"
          />
          <p id="gemini-key-note" className="nx-muted">The backend can't report whether a key is already set.</p>
          <div><Button type="submit" variant="primary" disabled={!canSave}>{pending ? 'Saving…' : 'Save'}</Button></div>
          {result === 'saved' && <p role="status" className="nx-muted">Saved. The backend will use this key for new runs.</p>}
          {result === 'failed' && <p role="alert" className="nx-goal__error">Could not save the key. Check that the backend is reachable and try again.</p>}
        </form>
      </Panel>
    </>
  )
}
