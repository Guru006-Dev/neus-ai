/** The Nexus brand mark — two overlapping squares, ink + accent. Used across landing and dashboard. */
export default function NexusLogo({ size = 22 }: { size?: number }) {
  const big = Math.round(size * 0.65);
  const sm = Math.round(size * 0.44);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: big, height: big, background: 'var(--color-ink)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: sm, height: sm, background: 'var(--color-accent)' }} />
    </div>
  );
}
