import { X, Check, ChevronRight } from 'lucide-react';

export default function AgentOutput({ name, output, runId }: { name: string; output: unknown; runId?: string | null }) {
  let data: Record<string, unknown> | null = null;
  let rawText: string | null = null;

  const tryParse = (s: string): Record<string, unknown> | null => {
    try { return JSON.parse(s); } catch {}
    try {
      const j = s
        .replace(/'/g, '"')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');
      return JSON.parse(j);
    } catch {}
    return null;
  };

  if (output && typeof output === 'object') {
    data = output as Record<string, unknown>;
  } else if (typeof output === 'string') {
    const s = output.trim();
    if (s.startsWith('#')) {
      rawText = s;
    } else if (s.startsWith('{') || s.startsWith('[')) {
      const parsed = tryParse(s);
      if (parsed) data = parsed;
      else rawText = s;
    } else {
      rawText = s;
    }
  }

  const row = (label: string, val: unknown) => val == null ? null : (
    <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid var(--color-surface-border)' }}>
      <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', minWidth: 90, paddingTop: 2, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--color-ink-dim)', lineHeight: 1.6, wordBreak: 'break-word' }}>{String(val)}</span>
    </div>
  );

  const pill = (text: string, ok = true) => (
    <span key={text} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', background: ok ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)', color: ok ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-block', margin: '2px 3px 2px 0' }}>{text}</span>
  );

  if (!data && !rawText) return <span style={{ fontSize: 11, color: 'var(--color-ink-faint)', fontStyle: 'italic' }}>No output recorded</span>;

  if (name === 'Docs' || rawText) {
    const lines = (rawText || '').split('\n');
    return (
      <div style={{ fontSize: 12, lineHeight: 1.75, color: 'var(--color-ink-dim)', maxHeight: 260, overflowY: 'auto' }}>
        {lines.map((line, i) => {
          if (line.startsWith('## ')) return <div key={i} style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontSize: 13, color: 'var(--color-ink)', marginTop: 10, marginBottom: 2 }}>{line.slice(3)}</div>;
          if (line.startsWith('# '))  return <div key={i} style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-ink)', marginBottom: 4 }}>{line.slice(2)}</div>;
          if (line.startsWith('- '))  return <div key={i} style={{ paddingLeft: 12, color: 'var(--color-ink-dim)' }}>· {line.slice(2)}</div>;
          return <div key={i}>{line || <br />}</div>;
        })}
      </div>
    );
  }

  if (name === 'Explorer' && data) {
    const metrics = data.metrics as Record<string, unknown> | undefined;
    const insights = data.key_insights as string[] | undefined;
    const dims = data.analysis_dimensions as string[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {Object.entries(metrics).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--color-surface)', padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{String(v)}</div>
                <div style={{ fontSize: 9, color: 'var(--color-ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        )}
        {insights && insights.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Key Insights</div>
            {insights.map((ins, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--color-ink-dim)', padding: '4px 0', borderBottom: '1px solid var(--color-surface-border)', lineHeight: 1.5 }}>· {ins}</div>
            ))}
          </div>
        )}
        {dims && dims.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{dims.map(d => pill(d))}</div>
        )}
      </div>
    );
  }

  if (name === 'Knowledge' && data) {
    const nodes = data.nodes as unknown[] | undefined;
    const edges = data.edges as unknown[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['Nodes', nodes?.length], ['Edges', edges?.length], ['Density', data.graph_density]].map(([l, v]) => (
            <div key={String(l)} style={{ background: 'var(--color-surface)', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 18, fontWeight: 600, color: 'var(--color-ink)' }}>{String(v ?? '—')}</div>
              <div style={{ fontSize: 9, color: 'var(--color-ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{String(l)}</div>
            </div>
          ))}
        </div>
        {nodes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(nodes as { label?: string; type?: string }[]).map((n, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', background: 'var(--color-surface-strong)', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>{n.label || String(n)}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (name === 'QA' && data) {
    const tests = data.tests_run as { name: string; result: string; score: string; detail: string }[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[['Total', data.total_validations], ['Passed', data.passed], ['Failed', data.failed], ['Pass Rate', data.pass_rate]].map(([l, v]) => (
            <div key={String(l)} style={{ background: String(l) === 'Failed' && Number(v) > 0 ? 'rgba(248,113,113,.08)' : 'var(--color-surface)', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 600, color: String(l) === 'Failed' && Number(v) > 0 ? 'var(--color-error)' : String(l) === 'Passed' ? 'var(--color-success)' : 'var(--color-ink)' }}>{String(v ?? '—')}</div>
              <div style={{ fontSize: 9, color: 'var(--color-ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{String(l)}</div>
            </div>
          ))}
        </div>
        {tests && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tests.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: 'var(--color-surface)' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>{t.result === 'PASS' ? <Check size={12} color="var(--color-success)" /> : <X size={12} color="var(--color-error)" />}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink-dim)' }}>{t.name} <span style={{ fontWeight: 400, color: 'var(--color-ink-faint)' }}>· {t.score}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--color-ink-faint)', marginTop: 1 }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (name === 'Demo' && data) {
    const demoSrc = runId ? `http://localhost:3000/workflows/${runId}/demo_html` : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {row('Status', data.status)}
        {row('Lines generated', data.line_count)}
        {demoSrc && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Live Preview</div>
            <iframe src={demoSrc} style={{ width: '100%', height: 420, border: '1px solid var(--color-surface-border)', background: 'var(--color-bg)' }} title="Demo Showcase" sandbox="allow-scripts" />
            <a href={demoSrc} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <ChevronRight size={12} /> Open in full screen
            </a>
          </div>
        )}
      </div>
    );
  }

  if (name === 'Release' && data) {
    const comps = data.components_validated as string[] | undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {row('Release ID', data.release_id)}
          {row('QA Pass Rate', data.qa_pass_rate)}
          {row('Deployment', data.deployment_status)}
          {row('Artifacts', data.artifacts_generated)}
        </div>
        {comps && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{comps.map((c) => pill(c, true))}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Object.entries(data!).filter(([, v]) => v !== null && typeof v !== 'object').map(([k, v]) => row(k.replace(/_/g, ' '), v))}
    </div>
  );
}
