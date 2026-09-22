import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Zap, Bot, ArrowLeft,
  X, Check, Square, ChevronRight, Clock, BarChart2, KeyRound, Play,
} from 'lucide-react';
import { DropdownNavigation } from '@/components/ui/dropdown-navigation';
import type { NavItem } from '@/components/ui/dropdown-navigation';
import { AGENTS, AGENT_INFO, fmtTime, fmtDate } from './dashboard/types';
import type { AgentResult, RunState, HistoryEntry, AgentIconKey } from './dashboard/types';
import { NexusLogo, StatusDot, AgentBadge, StatCard, AGENT_ICONS } from './dashboard/shared';
import AgentOutput from './dashboard/AgentOutput';
import ThemeToggle from '@/components/ThemeToggle';
import LogoScatter from '@/components/LogoScatter';
import { useSmoothScroll } from '@/lib/useSmoothScroll';

const API_BASE = 'http://localhost:3000';

export default function DashboardPage() {
  const navigate = useNavigate();
  useSmoothScroll();
  const [goal, setGoal] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('nexus_api_key') || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState('Pipeline');
  const [activeFilter, setActiveFilter] = useState('All');
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexus_history') || '[]'); } catch { return []; }
  });
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [run, setRun] = useState<RunState>({
    runId: null, goal: '', status: 'idle',
    agents: AGENTS.map(n => ({ name: n, status: 'idle' })),
    elapsed: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (run.status === 'running') {
      timerRef.current = setInterval(() => setRun(r => ({ ...r, elapsed: r.elapsed + 1 })), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [run.status]);

  useEffect(() => {
    if (run.status === 'done' || run.status === 'error') {
      const entry: HistoryEntry = {
        id: run.runId || `local_${Date.now()}`,
        goal: run.goal,
        status: run.status === 'error' ? 'error' : 'done',
        elapsed: run.elapsed,
        timestamp: Date.now(),
        agents: run.agents,
      };
      setHistory(prev => {
        const next = [entry, ...prev].slice(0, 50);
        try { localStorage.setItem('nexus_history', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [run.status]);

  async function startRun() {
    if (!goal.trim()) return;
    setRun({ runId: null, goal: goal.trim(), status: 'running', agents: AGENTS.map(n => ({ name: n, status: 'idle' })), elapsed: 0 });
    setActiveTab('Pipeline');
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: goal.trim(), api_key: apiKey || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const runId = data.run_id || data.id || null;
      setRun(r => ({ ...r, runId }));
      if (runId) {
        pollRef.current = setInterval(async () => {
          try {
            const pr = await fetch(`${API_BASE}/status/${runId}`);
            if (!pr.ok) return;
            const pd = await pr.json();
            const agents: AgentResult[] = AGENTS.map(name => {
              const a = pd.agents?.[name.toLowerCase()] || pd.agents?.[name] || {};
              return { name, status: a.status || 'idle', duration: a.duration, output: a.output || a.result };
            });
            const allDone = agents.every(a => a.status === 'done' || a.status === 'error');
            setRun(r => ({ ...r, agents, status: allDone ? 'done' : pd.status === 'error' ? 'error' : 'running' }));
            if (allDone || pd.status === 'error') { if (pollRef.current) clearInterval(pollRef.current); }
          } catch (_) {}
        }, 2000);
      } else {
        const agents: AgentResult[] = AGENTS.map(name => ({ name, status: 'done' as const, output: data[name.toLowerCase()] || data.result }));
        setRun(r => ({ ...r, status: 'done', agents }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRun(r => ({ ...r, status: 'error', error: msg }));
    }
  }

  function cancelRun() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setRun(r => ({ ...r, status: 'idle', error: undefined }));
  }

  function saveApiKey() {
    localStorage.setItem('nexus_api_key', apiKeyInput);
    setApiKey(apiKeyInput);
    setApiKeyInput('');
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem('nexus_history');
  }

  const doneCount = run.agents.filter(a => a.status === 'done').length;
  const pct = Math.round((doneCount / AGENTS.length) * 100);
  const filteredAgents = activeFilter === 'All' ? run.agents : run.agents.filter(a => a.name === activeFilter);

  const successCount = history.filter(h => h.status === 'done').length;
  const avgElapsed = history.length ? Math.round(history.reduce((s, h) => s + h.elapsed, 0) / history.length) : 0;
  const selectedEntry = history.find(h => h.id === selectedHistoryId) || history[0] || null;

  const dashNavItems: NavItem[] = [
    { id: 1, label: 'Overview', link: '#' },
    { id: 2, label: 'Pipeline', link: '#' },
    { id: 3, label: 'Agents',   link: '#' },
    { id: 4, label: 'Reports',  link: '#' },
    { id: 5, label: 'History',  link: '#' },
    { id: 6, label: 'API Key',  link: '#' },
  ];

  const sidebarItems = [
    { icon: <LayoutGrid size={16} strokeWidth={1.6} />, label: 'Overview', tab: 'Overview' },
    { icon: <Zap        size={16} strokeWidth={1.6} />, label: 'Pipeline', tab: 'Pipeline' },
    { icon: <Bot        size={16} strokeWidth={1.6} />, label: 'Agents',   tab: 'Agents'   },
    { icon: <BarChart2  size={16} strokeWidth={1.6} />, label: 'Reports',  tab: 'Reports'  },
  ];

  const sectionHeader = (title: string, sub: string) => (
    <div>
      <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--color-ink)' }}>{title}</h2>
      <p style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>{sub}</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-family-body)',
      animation: 'dash-enter .5s cubic-bezier(.16,1,.3,1) both',
      color: 'var(--color-ink)',
    }}>
      <div className="surface-shell" style={{ margin: '14px auto', maxWidth: 1080, overflow: 'hidden', display: 'grid', gridTemplateColumns: '52px 1fr', minHeight: 'calc(100vh - 28px)' }}>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-surface-border)', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {sidebarItems.map(({ icon, label, tab }) => (
            <div key={label} title={label} onClick={() => setActiveTab(tab)} style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeTab === tab ? 'var(--color-accent-dim)' : 'transparent',
              color: activeTab === tab ? 'var(--color-ink)' : 'var(--color-ink-faint)',
              cursor: 'pointer', transition: 'background .2s, color .2s',
            }}>{icon}</div>
          ))}
          <div style={{ flex: 1 }} />
          <div title="Back to Landing" onClick={() => navigate('/')} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-faint)', cursor: 'pointer' }}>
            <ArrowLeft size={15} strokeWidth={1.6} />
          </div>
        </div>

        {/* ── Main ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogoScatter size={20}><NexusLogo size={20} /></LogoScatter>
              <span style={{ fontFamily: 'var(--font-family-label)', fontWeight: 700, fontSize: 13, letterSpacing: '.1em', color: 'var(--color-ink)' }}>NEXUS</span>
            </div>
            <DropdownNavigation navItems={dashNavItems} activeItem={activeTab} onItemClick={setActiveTab} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThemeToggle />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--color-surface-border)', padding: '3px 10px 3px 3px' }}>
                <div style={{ width: 22, height: 22, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-accent-ink)' }}>G</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-ink-dim)' }}>Guru</span>
              </div>
            </div>
          </div>

          <div key={activeTab} className="tab-content" style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

            {/* ══ OVERVIEW ══ */}
            {activeTab === 'Overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sectionHeader('Product Intelligence', 'Six-agent pipeline for automated product analysis.')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  <StatCard label="Total Runs" value={String(history.length)} sub="all time" />
                  <StatCard label="Successful" value={String(successCount)} sub={history.length ? `${Math.round(successCount / history.length * 100)}% success rate` : '—'} />
                  <StatCard label="Avg Runtime" value={avgElapsed ? fmtTime(avgElapsed) : '—'} sub="per full pipeline" />
                  <StatCard label="API Status" value={apiKey ? 'Live' : 'No key'} sub={apiKey ? 'gemini-2.0-flash' : 'Set key → API Key tab'} />
                </div>
                <div className="surface-panel" style={{ padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-faint)', marginBottom: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>Quick Start</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && startRun()} placeholder="Enter product URL…" style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '8px 12px', fontSize: 12, color: 'var(--color-ink-dim)', outline: 'none', fontFamily: 'var(--font-family-body)' }} />
                    <button onClick={startRun} disabled={!goal.trim() || run.status === 'running'} className="btn-sharp" style={{ padding: '8px 20px', fontSize: 11, background: goal.trim() ? 'var(--color-accent)' : 'var(--color-surface-strong)', color: goal.trim() ? 'var(--color-accent-ink)' : 'var(--color-ink-faint)', border: 'none' }}>
                      {run.status === 'running' ? 'Running…' : 'Analyze →'}
                    </button>
                  </div>
                </div>
                {history.length > 0 && (
                  <div className="surface-panel" style={{ padding: 16 }}>
                    <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-faint)', marginBottom: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>Recent Runs</div>
                    {history.slice(0, 4).map(h => (
                      <div key={h.id} onClick={() => { setSelectedHistoryId(h.id); setActiveTab('Reports'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--color-surface-border)', cursor: 'pointer' }}>
                        <span style={{ width: 6, height: 6, background: h.status === 'done' ? 'var(--color-success)' : 'var(--color-error)', flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--color-ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.goal}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(h.elapsed)}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtDate(h.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ AGENTS ══ */}
            {activeTab === 'Agents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sectionHeader('Pipeline Agents', 'Six specialized agents run sequentially on every analysis.')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {AGENTS.map((name, idx) => {
                    const info = AGENT_INFO[name];
                    const agentRun = run.agents.find(a => a.name === name);
                    return (
                      <div key={name} className="surface-panel" style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 30, height: 30, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-dim)', flexShrink: 0 }}>
                            {AGENT_ICONS[name as AgentIconKey]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>{idx + 1}. {name}</div>
                            {agentRun && <AgentBadge status={agentRun.status} />}
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-ink-faint)', lineHeight: 1.6, margin: 0 }}>{info.desc}</p>
                        {agentRun?.duration && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-ink-faint)' }}>Last run: {fmtTime(agentRun.duration)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ PIPELINE ══ */}
            {activeTab === 'Pipeline' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--color-ink)' }}>Product<br />Intelligence</h2>
                  <div style={{ width: 44, height: 44, border: '2px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-ink-dim)' }}>{doneCount}/{AGENTS.length}</div>
                  {[{ label: 'STATUS', val: run.status === 'idle' ? 'Idle' : run.status === 'running' ? 'Running' : run.status === 'done' ? 'Done' : 'Error' }, { label: 'ELAPSED', val: fmtTime(run.elapsed) }, { label: 'AGENTS DONE', val: `${doneCount}/${AGENTS.length}` }].map(({ label, val }) => (
                    <div key={label} style={{ borderLeft: '1px solid var(--color-surface-border)', paddingLeft: 16 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', color: 'var(--color-ink-faint)' }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 1, color: 'var(--color-ink)' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '8px 10px' }}>
                  <input type="text" value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && run.status !== 'running' && startRun()} placeholder="Enter product URL or name  (e.g. amazon.com/dp/B09B93ZDG4)" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--color-ink-dim)', fontFamily: 'var(--font-family-body)' }} />
                  {run.status === 'running'
                    ? <button onClick={cancelRun} className="btn-sharp" style={{ padding: '6px 16px', fontSize: 11, background: 'rgba(248,113,113,.14)', color: 'var(--color-error)', border: '1px solid rgba(248,113,113,.3)' }}>Cancel</button>
                    : <button onClick={startRun} disabled={!goal.trim()} className="btn-sharp" style={{ padding: '6px 18px', fontSize: 11, background: goal.trim() ? 'var(--color-accent)' : 'var(--color-surface-strong)', color: goal.trim() ? 'var(--color-accent-ink)' : 'var(--color-ink-faint)', border: 'none' }}>Analyze →</button>
                  }
                </div>

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {['All', ...AGENTS].map(f => (
                    <button key={f} onClick={() => setActiveFilter(f)} className="btn-sharp" style={{ padding: '4px 13px', fontSize: 11, fontWeight: 500, background: activeFilter === f ? 'var(--color-accent)' : 'transparent', color: activeFilter === f ? 'var(--color-accent-ink)' : 'var(--color-ink-faint)', border: `1px solid ${activeFilter === f ? 'transparent' : 'var(--color-surface-border)'}`, textTransform: 'none', letterSpacing: 'normal' }}>{f}</button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 188px', gap: 12, flex: 1 }}>
                  <div className="surface-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 26, height: 26, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-dim)' }}>
                        {run.status === 'running' ? <Zap size={13} strokeWidth={2} /> : run.status === 'done' ? <Check size={13} strokeWidth={2} /> : <Square size={13} strokeWidth={1.6} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>{run.goal || 'Ready for analysis'}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>
                          {run.status === 'idle' ? 'Enter a product URL above' : run.status === 'running' ? `${doneCount}/6 agents complete · ${fmtTime(run.elapsed)}` : run.status === 'done' ? `Completed in ${fmtTime(run.elapsed)}` : run.error || 'Error'}
                        </div>
                      </div>
                      {run.status !== 'idle' && (
                        <div style={{ width: 100, height: 3, background: 'var(--color-surface-strong)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '100%', background: pct === 100 ? 'var(--color-success)' : 'var(--color-accent)', transformOrigin: 'left center', transform: `scaleX(${pct / 100})`, transition: 'transform .4s ease, background .3s ease' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {filteredAgents.map(agent => (
                        <div key={agent.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
                          <StatusDot status={agent.status} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: agent.output ? 4 : 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: agent.status === 'idle' ? 'var(--color-ink-faint)' : 'var(--color-ink-dim)' }}>{agent.name}</span>
                              <AgentBadge status={agent.status} />
                              {agent.duration && <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(agent.duration)}</span>}
                            </div>
                            {agent.output && (
                              <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {typeof agent.output === 'string' ? agent.output.slice(0, 160) : JSON.stringify(agent.output).slice(0, 160)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {run.status === 'done' && (
                      <div style={{ margin: '0 14px 12px', display: 'flex', gap: 8 }}>
                        <button onClick={() => setActiveTab('Reports')} className="btn-sharp" style={{ flex: 1, padding: '7px 0', fontSize: 11, background: 'rgba(74,222,128,.12)', color: 'var(--color-success)', border: '1px solid rgba(74,222,128,.25)' }}>View Full Report →</button>
                      </div>
                    )}
                    {run.status === 'error' && run.error && (
                      <div style={{ margin: '0 14px 12px', padding: '8px 12px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', fontSize: 11, color: 'var(--color-error)' }}>{run.error}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="surface-panel" style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8 }}>Current Run</div>
                      <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>{pct}<span style={{ fontSize: 14, color: 'var(--color-ink-faint)' }}>%</span></div>
                      <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 3 }}>
                        {run.status === 'running' ? `${run.agents.find(a => a.status === 'running')?.name || 'Waiting'}...` : run.status === 'done' ? 'All done' : 'Not started'}
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                        <button onClick={cancelRun} disabled={run.status !== 'running'} className="btn-sharp" style={{ flex: 1, padding: '5px 0', fontSize: 10, background: 'var(--color-surface)', color: 'var(--color-ink-faint)', border: '1px solid var(--color-surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><X size={10} strokeWidth={2} /> Cancel</button>
                        <button onClick={startRun} disabled={!goal.trim() || run.status === 'running'} className="btn-sharp" style={{ flex: 1, padding: '5px 0', fontSize: 10, background: 'var(--color-accent)', color: 'var(--color-accent-ink)', border: 'none', opacity: (!goal.trim() || run.status === 'running') ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Play size={10} strokeWidth={2} fill="var(--color-accent-ink)" /> Run</button>
                      </div>
                    </div>
                    <div className="surface-panel" style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8 }}>Gemini API</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, flexShrink: 0, background: apiKey ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: apiKey ? 'var(--color-success)' : 'var(--color-ink-faint)' }}>{apiKey ? 'Connected' : 'Not set'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 3 }}>gemini-2.0-flash</div>
                      <button onClick={() => setActiveTab('API Key')} className="btn-sharp" style={{ marginTop: 10, width: '100%', padding: '5px 0', fontSize: 10, background: 'var(--color-surface)', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>{apiKey ? 'Update Key' : 'Set Key →'}</button>
                    </div>
                    <div className="surface-panel" style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 10 }}>Session</div>
                      {[{ label: 'Agents', val: '6' }, { label: 'Backend', val: 'FastAPI' }, { label: 'Port', val: '3000' }].map(({ label, val }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
                          <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-ink-dim)' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══ REPORTS ══ */}
            {activeTab === 'Reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {sectionHeader('Reports', 'Full agent outputs from completed runs.')}
                  {history.length > 1 && (
                    <select value={selectedHistoryId || ''} onChange={e => setSelectedHistoryId(e.target.value)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '6px 10px', fontSize: 11, color: 'var(--color-ink-dim)', outline: 'none', cursor: 'pointer' }}>
                      {history.map(h => <option key={h.id} value={h.id} style={{ background: '#FFFFFF' }}>{h.goal.slice(0, 50)} — {fmtDate(h.timestamp)}</option>)}
                    </select>
                  )}
                </div>
                {selectedEntry ? (
                  <>
                    <div className="surface-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 7, height: 7, background: selectedEntry.status === 'done' ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{selectedEntry.goal}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtDate(selectedEntry.timestamp)} · {fmtTime(selectedEntry.elapsed)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedEntry.agents.map(agent => (
                        <div key={agent.name} className="surface-panel" style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: agent.output ? 10 : 0 }}>
                            <div style={{ width: 22, height: 22, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-dim)', flexShrink: 0 }}>
                              {AGENT_ICONS[agent.name as AgentIconKey]}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>{agent.name}</span>
                            <AgentBadge status={agent.status} />
                            {agent.duration && <span style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(agent.duration)}</span>}
                          </div>
                          <AgentOutput name={agent.name} output={agent.output} runId={selectedEntry?.id} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="surface-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--color-ink-faint)' }}><BarChart2 size={20} strokeWidth={1.5} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink-dim)', marginBottom: 8 }}>No reports yet</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>Run a pipeline analysis to generate your first report.</div>
                    <button onClick={() => setActiveTab('Pipeline')} className="btn-sharp" style={{ marginTop: 16, padding: '8px 20px', fontSize: 11, background: 'var(--color-accent)', color: 'var(--color-accent-ink)', border: 'none' }}>Go to Pipeline →</button>
                  </div>
                )}
              </div>
            )}

            {/* ══ HISTORY ══ */}
            {activeTab === 'History' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {sectionHeader('History', `${history.length} run${history.length !== 1 ? 's' : ''} recorded in this browser.`)}
                  {history.length > 0 && <button onClick={clearHistory} className="btn-sharp" style={{ padding: '6px 14px', fontSize: 11, background: 'rgba(248,113,113,.1)', color: 'var(--color-error)', border: '1px solid rgba(248,113,113,.2)' }}>Clear All</button>}
                </div>
                {history.length > 0 ? (
                  <div className="surface-panel" style={{ overflow: 'hidden' }}>
                    {history.map((h, i) => (
                      <div key={h.id} onClick={() => { setSelectedHistoryId(h.id); setActiveTab('Reports'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < history.length - 1 ? '1px solid var(--color-surface-border)' : 'none', cursor: 'pointer' }}>
                        <span style={{ width: 7, height: 7, background: h.status === 'done' ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.goal}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 2 }}>{fmtDate(h.timestamp)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: h.status === 'done' ? 'var(--color-success)' : 'var(--color-error)' }}>{h.status === 'done' ? 'Success' : 'Error'}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-ink-faint)' }}>{fmtTime(h.elapsed)}</div>
                        </div>
                        <ChevronRight size={13} strokeWidth={1.6} style={{ color: 'var(--color-ink-faint)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="surface-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, background: 'var(--color-surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--color-ink-faint)' }}><Clock size={20} strokeWidth={1.5} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink-dim)', marginBottom: 8 }}>No history yet</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>Completed runs will appear here automatically.</div>
                  </div>
                )}
              </div>
            )}

            {/* ══ API KEY ══ */}
            {activeTab === 'API Key' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-ink)' }}>
                    <KeyRound size={18} strokeWidth={1.8} style={{ color: 'var(--color-ink-faint)' }} />API Key
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--color-ink-faint)' }}>Your Gemini API key is stored in this browser only — never sent to any server except Google.</p>
                </div>
                <div className="surface-panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 7, height: 7, background: apiKey ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: apiKey ? 'var(--color-success)' : 'var(--color-ink-faint)' }}>{apiKey ? 'Key saved' : 'No key set'}</span>
                    {apiKey && <span style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginLeft: 4 }}>{apiKey.slice(0, 8)}••••••••</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && apiKeyInput && saveApiKey()} placeholder={apiKey ? 'Enter new key to replace…' : 'AIza…'} style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-surface-border)', padding: '9px 12px', fontSize: 12, color: 'var(--color-ink-dim)', outline: 'none', fontFamily: 'var(--font-family-body)' }} />
                    <button onClick={saveApiKey} disabled={!apiKeyInput.trim()} className="btn-sharp" style={{ padding: '9px 20px', fontSize: 11, background: apiKeyInput.trim() ? 'var(--color-accent)' : 'var(--color-surface-strong)', color: apiKeyInput.trim() ? 'var(--color-accent-ink)' : 'var(--color-ink-faint)', border: 'none' }}>Save</button>
                  </div>
                  {apiKey && <button onClick={() => { localStorage.removeItem('nexus_api_key'); setApiKey(''); }} style={{ marginTop: 12, fontSize: 11, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove saved key</button>}
                </div>
                <div className="surface-panel" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-faint)', marginBottom: 8 }}>Model in use</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-dim)' }}>gemini-2.0-flash</div>
                  <div style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 4 }}>Fast inference · supports long context · free tier available</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
