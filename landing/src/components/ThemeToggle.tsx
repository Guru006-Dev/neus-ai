import { useEffect, useState } from 'react';

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('nexus_theme', theme); } catch {}
}

export function useInitTheme() {
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('nexus_theme'); } catch {}
    applyTheme(saved === 'dark' ? 'dark' : 'light');
  }, []);
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    applyTheme(dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      style={{
        width: 34, height: 18, borderRadius: 10, border: '1px solid var(--color-surface-border)',
        background: dark ? 'var(--color-ink)' : 'var(--color-surface-strong)',
        position: 'relative', cursor: 'pointer', flexShrink: 0, padding: 0,
        transition: 'background-color .2s ease',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: dark ? 18 : 2,
        width: 12, height: 12, borderRadius: '50%',
        background: dark ? '#F4F4F4' : 'var(--color-ink)',
        transition: 'left .2s ease',
      }} />
    </button>
  );
}
