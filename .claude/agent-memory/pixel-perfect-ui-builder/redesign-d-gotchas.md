---
name: redesign-d-gotchas
description: Non-obvious traps of the "versione D" (Liquid Glass) design system in BeachVolleyDiary — .rise vs press, glass material in utilities layer, grid overflow, StatTile line-height, Button aria-disabled, inert in tests
metadata:
  type: project
---

Gotchas found while porting screens to the "versione D" redesign (Claude Design, 2026-10).

- `.rise` (base.css) is a CSS animation with fill `both`: once finished it keeps `transform: none` with animation priority, so a `:active { transform: scale() }` on the SAME element (`.press`, Card's `:has(.ui-card-link:active)`, Motion `layout`) never shows. Put `.rise` on a wrapper.
- `StatTile` values that are not a single number ("3–1", "4–1") render as plain text with line-height 1.15, while numeric ones go through `Tabellone` (`--lh` 1.875rem): labels misalign. Screens fix it locally with `.x-stats .ui-stat-value { line-height: 1.875rem }`; a primitive fix was requested.
- Floating glass (fixed bars, NavBar buttons) = plain element + `<LiquidGlass layer />` (refraction on Blink); in-page glass = `<Button variant="glass">` (CSS material only). `Button` has no slot for a layer.
- Section/StatGrid accept only `className`, not `style`: stagger `.rise` with per-class `--rise-i` in CSS.
- Alternative to a `.rise` wrapper: `animation: ui-rise var(--dur-rise) var(--ease-rise) backwards` + `animation-delay: calc(var(--rise-i) * var(--rise-step))` — no fill after the end, so the press `:active` scale works on the same element (used by the ＋ sheet cards).
- `[data-material]` rules live in `@layer utilities`: a component (layer `components`) can NOT change a glass element's border, background or box-shadow (accent edge, dashed border, hover edge). Paint an extra `::after` ring above the border (`inset: calc(-1 * var(--border-w))`) or drop the material.
- A single-column `display: grid` stack is widened by any nowrap text inside (e.g. the `Disclosure` summary) and pushes every field past the gutter: give it `grid-template-columns: minmax(0, 1fr)`.
- `<Button aria-disabled>` passed as a raw prop is overwritten by the Button's own `aria-disabled={disabled}`: use `disabled` (it also swallows the click).
- Testing Library does not treat `inert` subtrees as hidden: assert closed disclosures with `el.closest('[inert]')`.
- `Tabellone` digit strips (21 rows, up to ~1237px) are clipped with `clip-path`, which hides paint but NOT scrollable overflow: a big number near the bottom of a page adds hundreds of px of empty scroll below `<main>` (Home had 313px). Fix: `.ui-odo-d { overflow-y: clip }` (keeps the horizontal glyph bleed). Home has it locally; the primitive fix was requested (2026-10-19). Diagnose by listing elements whose bottom exceeds `.app-main`'s bottom.
- A timed UI change (Home tips every 40s) is checked live by injecting `window.setTimeout` that maps 40000→4000 via `Page.addScriptToEvaluateOnNewDocument`, then sampling per rAF inside the page.

**Why:** these cost a debug round each; the design prototype itself has the `.rise`+`.press` conflict.
**How to apply:** check them before writing a new redesigned screen; see [[ui-qa-workflow]] for screenshots.
