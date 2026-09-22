import { useRef, useState, useCallback } from 'react';

interface Particle { id: number; x: number; y: number; dx: number; dy: number; rot: number; size: number; }

let uid = 0;

/**
 * Wraps the Nexus logo mark: moving the cursor over it scatters small
 * fading clones of the mark, echoing Aspen's mouse-reactive logo interaction.
 * Pure CSS-driven (no physics library) — each clone is a short-lived,
 * self-removing particle with a randomized fall/drift/rotation.
 */
export default function LogoScatter({ children, size = 22 }: { children: React.ReactNode; size?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastSpawn = useRef(0);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now - lastSpawn.current < 90) return;
    lastSpawn.current = now;
    const rect = e.currentTarget.getBoundingClientRect();
    const p: Particle = {
      id: uid++,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      dx: (Math.random() - 0.5) * 90,
      dy: 40 + Math.random() * 50,
      rot: (Math.random() - 0.5) * 240,
      size: size * (0.35 + Math.random() * 0.3),
    };
    setParticles(prev => [...prev.slice(-14), p]);
    setTimeout(() => {
      setParticles(prev => prev.filter(x => x.id !== p.id));
    }, 900);
  }, [size]);

  return (
    <div
      onMouseMove={onMouseMove}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, overflow: 'visible' }}
    >
      {children}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute', top: p.y, left: p.x, width: p.size, height: p.size,
            pointerEvents: 'none', borderRadius: '50%', background: 'var(--color-ink)',
            opacity: 0.85,
            animation: 'logo-scatter .85s cubic-bezier(.2,.7,.3,1) forwards',
            '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes logo-scatter {
          0%   { transform: translate(0,0) rotate(0deg); opacity: .85; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes logo-scatter { from { opacity: 0; } to { opacity: 0; } }
        }
      `}</style>
    </div>
  );
}
