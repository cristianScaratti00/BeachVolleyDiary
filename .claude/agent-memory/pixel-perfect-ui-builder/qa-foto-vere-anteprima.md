---
name: qa-foto-vere-anteprima
description: How to test share-image canvases (Story/Wrapped) with real raster photos of any proportion without touching docs/preview/main.tsx
metadata:
  type: reference
---

The preview data (docs/preview/main.tsx) only has SVG gradient "photos" (2 for Cervia, 3rd url null), so crops are invisible there. To QA with real photos without editing shared files: in the CDP script, `Page.addScriptToEvaluateOnNewDocument` generates JPEG data URLs on a canvas (red 10px border + «TESTA» top / «PIEDI» bottom, any w×h) into `window.__QA_FOTO`, and `Fetch.enable` on `*docs/preview/main.tsx*` (Response stage) rewrites the served module so Cervia's photo urls read `window.__QA_FOTO[i]` (Vite serves it with double quotes: `url: foto("#F7C59F", "#FF8657")`, `caption: "Vecchio segnaposto", url: null`). A crop shows as a missing red edge or head.

**Why:** other agents edit main.tsx in parallel; in-memory patching avoids conflicts. Real download check: `Browser.setDownloadBehavior` + click «Scarica».

**How to apply:** any time a share PNG layout changes. Scripts kept in the session scratchpad (storiaqa.mjs / wrappedqa.mjs) are ephemeral; rebuild from this recipe. See also the user's memory on html-to-image exports (CSP + fonts in prod).
