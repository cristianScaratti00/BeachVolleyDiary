---
name: qa-tastiera-ios
description: How to check iPhone keyboard behaviour (visualViewport, no page scroll) in headless Chrome, and the headless :focus trap — learned fixing the login scroll, Oct 2026
metadata:
  type: reference
---

The user uses the app almost only on iPhone/Safari. Keyboard bugs there ("I can scroll and the inputs disappear") do not show in desktop Chrome.

- Shrinking the CDP viewport (e.g. 390×470) simulates Android `resizes-content`, NOT iOS: the layout viewport shrinks too, so `position: fixed; inset: 0` backgrounds rescale. Use it only to check that title + fields + button fit.
- To simulate iOS (layout stays 390×844, the visible part shrinks and moves down), replace `window.visualViewport` via `Page.addScriptToEvaluateOnNewDocument` with an `EventTarget` whose `height`/`offsetTop`/`scale` are getters, plus a `__tastiera(h, top)` helper that dispatches `resize` and `scroll`. Then assert controls lie inside `[offsetTop, offsetTop + height]` and `document.scrollingElement.scrollHeight <= innerHeight`.
- Test drag blocking in the page with `new TouchEvent('touchmove', { cancelable: true, touches: [new Touch(...)] })` and read `defaultPrevented`. In jsdom `Touch` is missing: use a plain cancelable `Event` with `touches` added by `defineProperty`.
- In headless Chrome, `el.focus()` after a JS `.click()` sets `activeElement`, but `:focus` / `:focus-visible` do not match (no focus ring in shots) until `Emulation.setFocusEmulationEnabled({ enabled: true })`.
- Real taps: `P.tap(x, y)` in `docs/qa/cdp.mjs` sends genuine touch → pointer → compat mouse events. Use it to prove a button keeps focus in a field (pointerdown/mousedown preventDefault).

The login's working pattern lives in `useAccessoFermo` (src/screens/Login.tsx). Related: [[ui-qa-workflow]], [[preview-schermate-senza-sessione]].
