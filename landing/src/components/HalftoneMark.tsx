/**
 * Original halftone-dot texture, silhouetted to APIP's own two-square Nexus
 * mark (not a copy of any reference site's logo/artwork) — a dot-matrix
 * pattern clipped to an abstract shape, echoing the dithered mountain
 * texture Aspen Search uses as hero-grid filler.
 */
export default function HalftoneMark({ flip = false }: { flip?: boolean }) {
  const dot = 'var(--color-ink)';
  const uid = flip ? 'b' : 'a';
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block', transform: flip ? 'scaleX(-1) scaleY(-1)' : undefined }}
      aria-hidden
    >
      <defs>
        <pattern id={`halftone-dots-${uid}`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="4.5" cy="4.5" r="2.1" fill={dot} />
        </pattern>
        <clipPath id={`halftone-shape-${uid}`}>
          <rect x="40" y="30" width="230" height="230" rx="26" />
          <rect x="180" y="200" width="170" height="170" rx="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#halftone-shape-${uid})`}>
        <rect x="0" y="0" width="400" height="400" fill={`url(#halftone-dots-${uid})`} />
      </g>
    </svg>
  );
}
