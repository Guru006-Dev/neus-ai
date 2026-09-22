---
name: APIP — Autonomous Product Intelligence Platform
description: A light-mode, typography-led product intelligence platform, redesigned around the visual language of Aspen Search (Awwwards Site of the Day, Sep 15 2026) — white/near-black/mint, Schibsted Grotesk type, monospace micro-labels.
colors:
  bg: "#FFFFFF"
  ink: "#232323"
  ink-dim: "rgba(35,35,35,0.62)"
  ink-faint: "rgba(35,35,35,0.38)"
  accent: "#A1FFCB"
  accent-ink: "#232323"
  success: "#16A34A"
  error: "#DC2626"
  warning: "#B45309"
  surface: "#FFFFFF"
  surface-strong: "#F4F4F4"
  surface-border: "#E0E0E0"
typography:
  display:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "clamp(44px,7vw,92px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  panel: "0px"
  button: "0px"
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "13px 26px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.button}"
    padding: "13px 26px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.button}"
    padding: "13px 26px"
    border: "1px solid {colors.surface-border}"
  input-goal:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "9px 12px"
  card-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
    border: "1px solid {colors.surface-border}"
---

# Design System: APIP — Autonomous Product Intelligence Platform

## Overview

**Creative North Star: "Boutique Precision"**

APIP's visual language is now modeled on Aspen Search — a boutique executive-search firm for quant/tech talent, and Awwwards Site of the Day (Sep 15 2026, score 7.48/10) — chosen after the prior Sharplink-based direction fell short: Sharplink's identity leans on a bespoke photoreal 3D product render, which is not achievable at genuine fidelity through hand-written code without a real asset pipeline, and the attempt read as a generic approximation rather than a premium result. Aspen's premium quality comes from typography, layout discipline, a strict 2-color-plus-one-accent palette, and small interaction details (a live clock, scroll-revealed copy) — all things buildable at real fidelity in code.

This is a full reversal of the previous dark-mode system: light background, near-black ink, exactly one mint-green accent used sparingly as a section band and interactive fill, never as body-text color (mint-on-white fails contrast for text).

**Key Characteristics:**
- White substrate (`#FFFFFF`) with near-black ink (`#232323`) as the default/primary theme; a toggle-driven dark variant (`#0B0B0C` bg / `#F4F4F4` ink) is supported for viewers who prefer it, matching Aspen's own light/dark toggle — light is what the brand ships as, dark is an accommodation, not a second identity
- Exactly one accent, mint green (`#A1FFCB`), used as a solid section band or button fill with dark ink text on top of it — never as text color on white
- Sharp rectangular geometry (0px radius) on every panel and button, unchanged from the prior direction
- Schibsted Grotesk for all display/body text; IBM Plex Mono reserved for tracked micro-labels, eyebrows, and the nav clock — the monospace face is what reads as "technical precision" here, not color or glow
- Scroll-revealed paragraph copy (earlier sentences fully opaque, later sentences fading toward transparent) as the signature motion moment, echoing Aspen's about section

## Colors

### Primary
- **Ink** (`#232323`): Primary text, primary button fill (dark button with white text), borders on dark elements.

### Accent
- **Mint** (`#A1FFCB`): The only brand accent. Used as a full-bleed section background or a button/badge fill with `#232323` text on top — never as small text on white (fails contrast).

### Status (functional only)
- **Success** (`#16A34A`), **Warning** (`#B45309`), **Error** (`#DC2626`): chosen for AA contrast on white backgrounds, unlike the previous dark-mode-tuned status colors.

### Neutral
- **Background** (`#FFFFFF` light / `#0B0B0C` dark): Page background, set via `[data-theme]` on the root element and a `--color-bg`/`--color-ink`/etc. token swap — every component reads the tokens, never a literal hex, so it works in both themes automatically. Mint and the status colors stay fixed across themes (only their `-dim` companions adjust); everything else inverts.
- **Ink Dim** (`rgba(35,35,35,.62)`): Secondary text.
- **Ink Faint** (`rgba(35,35,35,.38)`): Tertiary labels, metadata, disabled state.
- **Surface Strong** (`#F4F4F4`): Input fills, icon chips.
- **Surface Border** (`#E0E0E0`): Every panel border, divider, input border at rest.

### Named Rules
**The One-Accent Rule** (carried over): mint is the only brand color, and it never appears as text on the white background — only as a filled band or button/badge surface with dark ink text on top.

**The No-Blur Constraint** (carried over): no `backdrop-filter`, no glow shadows at rest. Flat fills, 1px borders.

## Typography

**Font family:** Schibsted Grotesk (display/body) — a distinctive open neo-grotesque, not a metric clone of Aspen's actual Suisse Int'l (a paid font), chosen deliberately over Inter/Geist-class defaults that read as generic AI-tool output. IBM Plex Mono for labels/eyebrows/the nav clock, matching the monospace face Aspen loads for its own micro-copy.

### Hierarchy

- **Display** (700, `clamp(44px,7vw,92px)`, line-height 0.98, letter-spacing -0.03em): Landing hero wordmark/headline.
- **Headline** (700, 22px, letter-spacing -0.02em): Dashboard section titles.
- **Title** (600, 13px): Card titles, agent names.
- **Body** (450, 13px, line-height 1.6): Card copy, descriptions, status text.
- **Label** (500, 10px, letter-spacing 0.04em, IBM Plex Mono): Buttons, badges, eyebrows, nav items, the live clock.

## Shapes

Unchanged from the prior direction: sharp, not rounded.

- **Panel radius** (0px): All cards, panels — fully sharp now, no longer even the 2px compromise.
- **Button radius** (0px): All buttons.

## Components

### Buttons
- **Primary (dark):** `background: #232323`, white text, IBM Plex Mono label, 0 radius.
- **Accent (mint):** `background: #A1FFCB`, `#232323` text, 0 radius — used for the single highest-priority CTA per view.
- **Ghost / secondary:** transparent background, `1px solid #E0E0E0`, ink-dim text.

### Panels / Cards
- `background: #FFFFFF` or `#F4F4F4`, `1px solid #E0E0E0`, `border-radius: 0`, no shadow, no blur.

### Status badges
- Small (9–10px), IBM Plex Mono, uppercase, tracked. Background is the status color at 12% opacity on white, text at the full (AA-contrast) status color.

## Do's and Don'ts

### Do:
- Do treat `#FFFFFF`/light as the default theme; only enter dark via the explicit toggle, never automatically from `prefers-color-scheme`.
- Do reserve mint (`#A1FFCB`) for filled bands/buttons with dark text on top — never as text color on the page background in either theme.
- Do pair any element meant to read as "the opposite of the page" (e.g. the hero's statement card) using `background: var(--color-ink)` with `color: var(--color-bg)` — both theme tokens, so the contrast direction correctly flips with the theme. Never hardcode `#fff`/`#000` next to a theme token; that pairing breaks in the other theme.
- Do keep every panel/button fully sharp (0px radius).
- Do use IBM Plex Mono only for tracked uppercase micro-copy — never for body paragraphs.
- Do add `prefers-reduced-motion` guards to all animations, including the scroll-reveal text effect.

### Don't:
- Don't reintroduce glassmorphism from either prior direction — dark mode here is a flat inverted palette, not a return to blur/glow surfaces.
- Don't use mint as a text color on the page background — it fails contrast in both themes.
- Don't attempt a bespoke 3D product render as a hero centerpiece — that was the specific failure mode of the prior direction; motion and typography carry the "premium" feeling here instead.
- Don't use more than one accent hue for brand/interactive purposes.
