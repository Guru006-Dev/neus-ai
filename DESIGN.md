---
name: APIP — Autonomous Product Intelligence Platform
description: An institutional-grade product intelligence platform, redesigned around the visual language of Sharplink (Awwwards Site of the Day, Aug 27 2026) — one accent blue, sharp geometry, Archivo type.
colors:
  bg: "#07080B"
  ink: "#F3F3F3"
  ink-dim: "rgba(243,243,243,0.55)"
  ink-faint: "rgba(243,243,243,0.28)"
  accent: "#0E76FF"
  accent-dim: "rgba(14,118,255,0.14)"
  success: "#4ADE80"
  error: "#F87171"
  warning: "#FBBF24"
  surface: "rgba(243,243,243,0.035)"
  surface-strong: "rgba(243,243,243,0.07)"
  surface-border: "rgba(243,243,243,0.1)"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(44px,7vw,92px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo Narrow, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  panel: "2px"
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
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "13px 26px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    opacity: 0.85
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.button}"
    padding: "13px 26px"
    border: "1px solid {colors.surface-border}"
  input-goal:
    backgroundColor: "{colors.surface}"
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

**Creative North Star: "Institutional-Grade Intelligence"**

APIP's visual language is modeled directly on Sharplink — an institutional Ethereum treasury platform and Awwwards Site of the Day (Aug 27 2026, score 7.38/10) — because the tone fits almost exactly: a serious B2B platform that earns trust through restraint rather than decoration. One accent color. Sharp geometry. A single type family doing all the work through weight and tracking, not a mix of display fonts.

The old direction (violet/cyan glassmorphism "war room") is retired. This is a full redesign, not a reskin: sharp-cornered panels replace rounded glass cards, a single electric blue (`#0E76FF`) replaces the five-color operational-signal palette, and Archivo/Archivo Narrow (both real, open Google Fonts — pulled from the extracted Sharplink computed styles, not guessed) replace Syne/Inter.

**Key Characteristics:**
- Near-black substrate (`#07080B`) with exactly one accent color — blue is reserved for primary actions and active/connected states, never decoration
- Sharp rectangular geometry throughout — `border-radius: 0` on buttons, `2px` on panels (just enough to avoid rendering artifacts, not a rounded aesthetic)
- Archivo for all display/body text, Archivo Narrow reserved for tracked uppercase labels, buttons, and eyebrows
- Thin 1px borders define surfaces instead of blur/glow — flat, not glass
- Status colors (success green, error red, warning amber) are used only for literal state, never for brand or decoration

## Colors

A one-accent system over a near-black substrate.

### Primary
- **Accent Blue** (`#0E76FF`): The only brand accent. Primary buttons, active nav/tab state, focused/connected indicators, links. Never used decoratively.

### Status (functional only)
- **Success** (`#4ADE80`): Agent/run completed, connected state.
- **Warning** (`#FBBF24`): Agent running / in-flight.
- **Error** (`#F87171`): Failed run, disconnected, destructive actions.

### Neutral
- **Background** (`#07080B`): Page background. No light mode, no light surfaces.
- **Ink** (`#F3F3F3`): Primary text.
- **Ink Dim** (`rgba(243,243,243,.55)`): Secondary text, descriptions.
- **Ink Faint** (`rgba(243,243,243,.28)`): Tertiary labels, metadata, disabled state.
- **Surface** (`rgba(243,243,243,.035)`): Panel/card fill.
- **Surface Strong** (`rgba(243,243,243,.07)`): Icon chips, active sidebar state fill.
- **Surface Border** (`rgba(243,243,243,.1)`): Every panel border, divider, input border at rest.

### Named Rules
**The One-Accent Rule.** Blue is the only brand color. If a second brand accent feels necessary, that's a sign the hierarchy needs weight/type/spacing work instead — not a new hue.

**The No-Blur Constraint.** No `backdrop-filter`, no glow box-shadows at rest. Surfaces are flat fills with 1px borders. This is a deliberate reversal of the previous glassmorphism direction.

## Typography

**Font family:** Archivo (display/body), Archivo Narrow (labels/buttons/eyebrows) — both loaded from Google Fonts, matching the real computed font-family read off sharplink.com.

**Character:** Archivo at regular/medium weight reads calm and confident rather than shouty — the opposite of the old 900-weight Inter display treatment. Archivo Narrow's tight, tracked uppercase form does the "technical" signaling that used to come from color and glow.

### Hierarchy

- **Display** (500, `clamp(44px,7vw,92px)`, line-height 0.98, letter-spacing -0.03em): Landing hero headline only.
- **Headline** (600, 22px, letter-spacing -0.02em): Dashboard section titles (Product Intelligence, Pipeline Agents, Reports, etc.).
- **Title** (700, 13px): Card titles, agent names.
- **Body** (400, 13px, line-height 1.6): Card copy, descriptions, status text.
- **Label** (600, 10px, letter-spacing 0.08em, uppercase, Archivo Narrow): Buttons, badges, eyebrows, nav items.

### Named Rules
**The 12px Floor Rule** (carried over): no functional text below 12px, except Label-tier metadata (9–10px) which is intentionally small and always uppercase/tracked for legibility at size.

## Shapes

Sharp, not rounded — the single biggest visible break from the previous system.

- **Panel radius** (2px): All cards, panels. Just enough to avoid rendering artifacts on some browsers — reads as sharp, not rounded.
- **Button radius** (0px): All buttons, exactly matching Sharplink's extracted `border-radius: 0` on `.btn-accent`.

No pill shapes, no 20px card radii, anywhere in the system.

## Components

### Buttons
- **Primary:** `background: #0E76FF`, white text, Archivo Narrow 500 weight, uppercase, `letter-spacing: 0.08em`, 0 radius, padding `13px 26px` (hero/nav) or `8–9px 18–20px` (in-app).
- **Ghost / secondary:** transparent background, `1px solid` surface-border, ink-dim text, same type treatment as primary.
- **Disabled:** `opacity: .4`, no pointer.

### Panels / Cards
- `background: var(--color-surface)`, `1px solid var(--color-surface-border)`, `border-radius: 2px`, no shadow, no blur.

### Status badges
- Small (9–10px), Archivo Narrow, uppercase, tracked. Background is the status color at 12% opacity, text at full status color. Success/Warning/Error/Idle only — never brand blue for a status badge.

## Do's and Don'ts

### Do:
- Do use `#07080B` as the only background; no light surfaces.
- Do reserve `#0E76FF` for actions and active/connected state only.
- Do keep every panel/button sharp (0–2px radius).
- Do use Archivo Narrow only for tracked uppercase micro-copy (labels, buttons, eyebrows) — never for body paragraphs.
- Do add `prefers-reduced-motion` guards to all `@keyframes` animations.

### Don't:
- Don't reintroduce glassmorphism (`backdrop-filter`, glow shadows at rest) — this system is flat.
- Don't use more than one accent hue for brand/interactive purposes.
- Don't use rounded/pill shapes on buttons or panels.
- Don't drop below the 12px floor for body/functional text.
