---
name: ui-qa-workflow
description: How UI work is verified in BeachVolleyDiary when several agents work in parallel — live preview, own CDP port, axe in real Chrome
metadata:
  type: reference
---

- Live preview with fake data: `http://localhost:5173/docs/preview/?r=/route` (`?vuoto`, `?estremo`, `?fallito`). Entity ids change on every load: reach details by clicking `main a` with the entity name.
- Drive Chrome headless with `docs/qa/cdp.mjs` (`launch(port)`, `page`, `viewport`, `go`, `eval`, `shot`). When other agents run in parallel use a private port (e.g. 9450+N), never the default 9333/9444, and keep scripts in the session scratchpad.
- Contrast is only measurable in a real browser: inject `node_modules/axe-core/axe.min.js` and run on `main` (pattern in `docs/qa/axe.mjs`); "incomplete" color-contrast on pseudo-element separators is expected.
- `npx tsc -p tsconfig.app.json` excludes tests; `tsconfig.test.json` covers them.
- When the shared tree is mid-change (e.g. a dependency being swapped breaks the import), run a private Vite with `--config` from the scratchpad: load `@vitejs/plugin-react` via `createRequire('<repo>/package.json')` (a direct absolute import fails to resolve `react-refresh`), alias the broken package to a stub, and set `cacheDir` in the scratchpad so the re-optimized deps never touch the shared `node_modules/.vite`.

**How to apply:** after any screen change, screenshot 390×844 and 1280 wide, compare with the design PNGs, then axe. Related: [[redesign-d-gotchas]].
