---
name: qa-export-png-preview
description: How to check the real PNG export (Story/Wrapped canvases) in the live docs/preview without a build, and what the canvases look like after the 2026-10 redesign
metadata:
  type: reference
---

To see the actual PNG that html-to-image produces (font embedding, Pallo frozen, layout at 1080×1920), drive the live preview (`http://localhost:5173/docs/preview/?r=/wrapped`) over CDP (`docs/qa/cdp.mjs`, own port 945x) and in `P.eval` do
`const m = await import('/node_modules/.vite/deps/html-to-image.js')`, then `m.toPng(node, { pixelRatio: 0.5, width: 1080, height: 1920 })` on `.wrapped-capture-card` (Wrapped) or `.storia-canvas` with `style: { transform: 'none' }` (Story). Call it twice (first pass warms the cache, as the app does), write the data URL to the scratchpad and Read it.

This only proves dev-mode rendering; production font/CSP issues need the harness in [[export-immagini-html-to-image]].

Canvas rules worth remembering: literal colours only from `src/components/wrapped/palette.ts` (ink / sand / orange since the redesign), family `EXPORT_FONT` (Geist Variable), and Pallo's ink strokes need a white drop-shadow halo on the ink palette or the arms disappear.
