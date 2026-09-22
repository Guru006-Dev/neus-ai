# APIP Redesign — Sharplink-Inspired Design System

## Source

- **Target:** [Sharplink](https://www.sharplink.com/) — Awwwards Site of the Day, Aug 27 2026 (SOTD score 7.38/10, Dev Award 7.42/10), built by Studio Freight (GSAP + Three.js + Vue).
- **Why this site:** APIP is a B2B "institutional-grade" product intelligence platform. Sharplink is a literal institutional-grade fintech platform with the same tone — dark, restrained, single-accent-color, technical. Its nav even has a "Dashboard" CTA, which maps directly onto APIP's own dashboard entry point.
- **Scope:** brand new visual design and structure for the whole app — landing page and dashboard both rebuilt, not restyled on top of the old DOM. All existing backend/API behavior (workflow submission, polling, Reports tab data, Demo iframe, agent output parsing) is preserved as-is; only presentation is replaced.

## Extracted tokens (real computed values, read from the live site)

| Token | Value | Source |
|---|---|---|
| Accent (only color accent in the palette) | `#0E76FF` (`rgb(14,118,255)`) | Awwwards palette card + `getComputedStyle` scan |
| Secondary / hero text on dark | `#F3F3F3` | Awwwards palette card |
| Page background (light sections) | `#F7F7F5` | `getComputedStyle(body).backgroundColor` |
| Ink / text on light | `#000000` | `getComputedStyle` on body/nav |
| Dark overlay grays | `rgba(38,38,41,.45)`, `rgba(0,0,0,.1)`, `rgba(0,0,0,.18)` | bg-color scan |
| Headline font | **Archivo** (open Google Font — no substitution needed), weight 400, tight tracking (`-1.3px` at 52px, ≈ ‑2.5%) | `document.fonts` + computed style on hero letters |
| UI / button / label font | **Archivo Narrow**, weight 500, uppercase, tracked (`+1.04px` at 13px, ≈ +8%) | computed style on `<button>` |
| Buttons | sharp corners, `border-radius: 0` — rectangular, not pill | computed style on `.btn-accent` |
| Motion | GSAP-driven scroll reveals, per-letter hero split-text animation, hover-state easing on nav | observed in Elements/recon |

Fonts are both real open Google Fonts, so no substitution is needed — this is one of the rare cases where we can match exactly rather than swap for an equivalent.

## Design language for APIP

- **Palette:** one accent blue (`#0E76FF`) on a two-value neutral system — near-black ink (`#0A0B0D`-ish navy, since APIP is dark-first per the existing app) and off-white (`#F3F3F3`/`#F7F7F5`) for text/surfaces on dark. This replaces APIP's current warm cream (`#f2eee4`) CTA + purple/pink accents with the single disciplined blue.
- **Type:** Archivo for all display/headline text (replacing Syne), Archivo Narrow for nav/button/label/eyebrow text (uppercase, tracked). Both pulled from Google Fonts CDN.
- **Shape language:** sharp rectangular buttons and cards (0 or minimal radius) instead of the current pill-heavy UI — this is a deliberate, visible break from the current look, satisfying "brand new, not the same dashboard with new colors."
- **Motion:** scroll-triggered reveals and a per-letter hero headline animation (GSAP-equivalent via CSS/Framer Motion stagger, since we're not adding GSAP as a new dependency unless needed), nav background solidifying on scroll (APIP already has this pattern — keep it, retune colors).
- **3D hero:** an original abstract wireframe form built in react-three-fiber/Three.js — a rotating polytope built from APIP's own pipeline/node motif (not Ethereum's diamond), styled in the extracted palette. This replaces the current canvas showcase's sphere/particle scene at the landing hero, and is a fresh asset — nothing lifted from Sharplink.

## Landing page rebuild

New section structure (content is entirely APIP's own, structure inspired by Sharplink's real layout):

1. Sticky nav — logo, Archivo Narrow tracked nav items, one blue "Launch App" button (rectangular, not pill).
2. Hero — eyebrow line, big Archivo headline ("Autonomous Product Intelligence" split-letter reveal), muted continuation line, one blue primary CTA ("Explore the Dashboard") + one ghost secondary CTA, 3D wireframe node-form on the right/behind.
3. "Opportunity" statement band — large multi-weight paragraph (bold lead-in + muted continuation), matching Sharplink's `ETH emergence as global financial infrastructure...` block, rewritten for APIP's pitch.
4. Agent pipeline showcase — replaces the current marquee strip with a real structured section (6 agent cards: Explorer/Knowledge/Docs/QA/Demo/Release) in the new card language.
5. Footer — giant blurred "NEXUS" wordmark as background type, nav/social columns, accordion FAQ, email capture — matching Sharplink's footer pattern.

## Dashboard rebuild

- Same nav component (shared with landing), restyled to the new palette/type/shape.
- Existing tab structure (Submit / Live Status / Reports) kept functionally identical, but every surface rebuilt in the new card/section language: sharp-cornered panels, Archivo Narrow tracked labels, blue accent for active/primary states only (no more multi-color accents), consistent with Sharplink's single-accent discipline.
- `AgentOutput` renderers (Explorer, Knowledge, Docs, QA, Demo, Release) keep their data logic; visual containers rebuilt to match.
- Demo iframe preview and Reports cards restyled, not re-architected.

## Non-goals / explicit exclusions

- No hotlinked Sharplink assets, images, or fonts-by-URL from their CDN — fonts come from Google Fonts, the 3D form is original geometry.
- No formal `assert-styles.mjs` gate or external repo clone — practical fidelity, verified by real computed-style extraction (done above) plus visual comparison at each breakpoint.
- No backend/API changes — this is a pure front-end presentation layer replacement.

## Files touched

- `landing/src/pages/LandingPage.tsx` — full rebuild
- `landing/src/pages/DashboardPage.tsx` — full rebuild of presentation, same data/handlers
- `landing/src/components/ui/dropdown-navigation.tsx` — restyle to new shape/type language
- New: `landing/src/components/HeroScene.tsx` (or similar) — react-three-fiber wireframe hero
- New/updated global tokens (CSS variables or a `tokens.ts`) for the palette/type/spacing above
- `landing/index.html` or font-loading entry point — swap Syne/current fonts for Archivo + Archivo Narrow

## Verification plan

- Read real computed styles from sharplink.com at desktop/tablet/mobile widths for anything not yet captured above, as needed during build.
- Run the Vite dev server in the built-in browser, compare each rebuilt section side-by-side with the live Sharplink page at the same viewport.
- Confirm existing dashboard functionality (submit workflow, live polling, Reports tab rendering, Demo iframe) still works after the rebuild — no regressions.
