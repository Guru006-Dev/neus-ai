// scripts/capture-fixtures.mjs: records real responses; never edits them
import { mkdir, writeFile } from 'node:fs/promises'
const API = process.env.NEXUS_API ?? 'http://127.0.0.1:3000'
const OUT = new URL('../e2e/fixtures/', import.meta.url)
const save = (name, data) => writeFile(new URL(name, OUT), JSON.stringify(data, null, 2) + '\n')
const get = async (path) => { const r = await fetch(API + path); return { status: r.status, body: await r.json().catch(() => null) } }
const POLL_MS = Number(process.env.POLL_MS ?? 250)
const recorded = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await mkdir(OUT, { recursive: true })
await save('system-status.json', (await get('/system/status')).body)

async function record(goal, prefix) {
  const created = await (await fetch(API + '/workflows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal, user_id: 'dashboard' }) })).json()
  await save(`${prefix}-create.json`, created)
  const seen = new Set()
  let i = 0
  const states = []
  for (let t = 0; t < 600; t++) {
    const { body } = await get(`/workflows/${created.workflow_id}`)
    const key = JSON.stringify([body.status, body.tasks?.map((x) => [x.agent_name, x.status])])
    if (!seen.has(key)) { seen.add(key); states.push(`${body.status} [${(body.tasks ?? []).map((x) => x.agent_name + ':' + x.status).join(', ')}]`); await save(`${prefix}-poll-${String(i++).padStart(2, '0')}.json`, body) }
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(body.status)) break
    await sleep(POLL_MS)
  }
  recorded.push({ prefix, id: created.workflow_id, states })
}
await record('Analyze the onboarding flows of three note-taking apps and compare them', 'full')
await record('Run QA tests on the checkout flow of an online bookstore', 'qa')
await save('not-found.json', await get('/workflows/wf-00000000'))
const lines = recorded.map((r) => `- ${r.prefix} ${r.id}: ${r.states.length} snapshots\n${r.states.map((x, n) => `  - ${String(n).padStart(2, '0')} ${x}`).join('\n')}`)
await writeFile(new URL('RECORDED.md', OUT), `# Capture log (machine written)\n\nRecorded ${new Date().toISOString()} from ${API}. ${process.env.GEMINI_API_KEY ? 'Gemini path (GEMINI_API_KEY set)' : 'fallback path (GEMINI_API_KEY unset)'}. POLL_MS=${POLL_MS}.\n\n${lines.join('\n')}\n`)
