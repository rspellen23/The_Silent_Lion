# ADR 0001 — Technology Stack

Status: Approved (Phase 1).

## Decision

- TypeScript
- Phaser 3 for scene backgrounds, hotspots, transitions, and sprite (portrait) placement
- HTML/CSS DOM overlays for dialogue, evidence, journal, deduction, menus, and settings
- Vite for build/dev tooling
- JSON content files under `/src/content`
- Vitest for unit tests
- Versioned `localStorage` saves
- Static deployment via Vercel

## Context

The Silent Lion is a 90-minute, single-player, browser-based narrative
mystery structured as fixed illustrated scenes with point-and-click
hotspots (Ace Attorney-inspired), not an open world. There is no
requirement anywhere in the design documentation for a backend, accounts,
or multiplayer.

## Rationale

- **Phaser 3** handles the point-and-click surface (backgrounds, hotspot
  hit-testing across mouse and touch, transitions, sprite placement) with
  a mature, well-documented API, avoiding a hand-rolled canvas layer.
- **DOM/CSS for UI chrome** is a deliberate split, not a default: dialogue
  text, the evolving Insight Journal, and the deduction screen are
  text/data-heavy and benefit from native HTML semantics (screen readers,
  keyboard navigation, `<button>`/`<input>` accessibility) that would have
  to be reimplemented by hand inside a canvas.
- **No framework (React/Vue/etc.) for the DOM layer** — the UI surface is
  small and mostly static-shaped (a handful of panels), so a framework
  would add a dependency without solving a problem "minimize dependencies
  where practical" (docs/CLAUDE.md) tells us to avoid.
- **No backend** — nothing documented requires server-side logic; a
  90-minute single-player experience persists fine to `localStorage`.
- **Vercel static hosting** — the build output is a static bundle; no
  server runtime is needed.

## Consequences

- If a future requirement needs server-side state (e.g. cross-device
  save sync), that is a new architectural decision, not an extension of
  this one — flag it for a new ADR rather than bolting a backend on ad hoc.
- The DOM/Phaser split means every cross-layer interaction must go through
  either the EventBus or an explicit callback (see ARCHITECTURE.md) —
  developers should not reach into Phaser internals from DOM UI code or
  vice versa.
