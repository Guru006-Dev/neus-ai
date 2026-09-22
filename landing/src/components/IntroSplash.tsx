import { useEffect, useState } from 'react';

const SEEN_KEY = 'nexus_intro_seen';

/** Full-screen logo reveal on first load, matching Aspen's splash — plays once per browser session. */
export default function IntroSplash() {
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem(SEEN_KEY); } catch { return true; }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }
    const fadeTimer = setTimeout(() => setFading(true), 700);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
    }, 1100);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: fading ? 0 : 1,
      transition: 'opacity .4s ease',
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <div style={{
        position: 'relative', width: 44, height: 44,
        animation: 'intro-pop .5s cubic-bezier(.16,1,.3,1) both',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 30, height: 30, background: 'var(--color-bg)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, background: 'var(--color-accent)' }} />
      </div>
      <style>{`
        @keyframes intro-pop {
          from { opacity: 0; transform: scale(.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
