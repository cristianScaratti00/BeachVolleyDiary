---
name: preview-schermate-senza-sessione
description: How to screenshot Login/Splash/ConsensoCookie and other logged-out UI, since docs/preview always mounts the authenticated app
metadata:
  type: reference
---

docs/preview (http://localhost:5173/docs/preview/?r=/rotta) always mounts AppView with a session, so the
access flow (src/screens/Login.tsx), Splash and the cookie dialog never show there.

What worked (redesign, 2026-10-19): a TEMPORARY harness in docs/preview (login.html + login.tsx) that mounts
`<MotionRoot><AuthProvider><Login/></AuthProvider><ConsensoCookie/></MotionRoot>`, deleted at the end.
- Seed `bvd_consenso_cookie` in an inline `<script>` in the HTML, BEFORE the module: lib/consenso reads
  localStorage at import time, so setting it inside the module is too late and the dialog covers everything.
- Stub `window.fetch` for `/functions/v1/check-name` (live nickname check) and `/auth/v1/token` (login
  error): the preview's Supabase URL points to a dead port.
- Drive views with CDP (docs/qa/cdp.mjs) using your own port (9460+), clicking buttons by text/aria-label.
- When re-injecting axe via `P.eval`, wrap in `void (...)`: returning `window.axe` breaks CDP serialization.

Related: [[anteprima-visiva-senza-login]] in the user's auto-memory covers the same problem from another angle.
