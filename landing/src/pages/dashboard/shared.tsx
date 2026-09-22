import {
  Globe, BookOpen, FileText, ShieldCheck, Play, Send,
} from 'lucide-react';
import type { AgentStatus, AgentIconKey } from './types';

export const AGENT_ICONS: Record<AgentIconKey, React.ReactNode> = {
  Explorer:  <Globe    size={15} strokeWidth={1.6} />,
  Knowledge: <BookOpen size={15} strokeWidth={1.6} />,
  Docs:      <FileText size={15} strokeWidth={1.6} />,
  QA:        <ShieldCheck size={15} strokeWidth={1.6} />,
  Demo:      <Play     size={15} strokeWidth={1.6} />,
  Release:   <Send     size={15} strokeWidth={1.6} />,
};

export function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = {
    done: 'var(--color-success)', running: 'var(--color-warning)',
    error: 'var(--color-error)', idle: 'var(--color-surface-border)',
  };
  return (
    <span
      className={status === 'running' ? 'animate-blink-dot' : ''}
      style={{ display: 'inline-block', width: 6, height: 6, background: colors[status], flexShrink: 0 }}
    />
  );
}

export function AgentBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, { bg: string; color: string; label: string }> = {
    done:    { bg: 'rgba(74,222,128,.12)',  color: 'var(--color-success)', label: 'Done' },
    running: { bg: 'rgba(251,191,36,.12)',  color: 'var(--color-warning)', label: 'Running' },
    error:   { bg: 'rgba(248,113,113,.12)', color: 'var(--color-error)',   label: 'Error' },
    idle:    { bg: 'var(--color-surface)',  color: 'var(--color-ink-faint)', label: 'Queued' },
  };
  const s = styles[status];
  return (
    <span style={{
      fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      padding: '2px 7px', background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface-panel" style={{ padding: '14px 16px' }}>
      <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
