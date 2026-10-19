---
name: mappa-conquiste-leaflet
description: Why the redesigned "Mappa delle conquiste" keeps Leaflet+OSM (not the design's schematic Italy SVG) and the Leaflet styling traps met while dressing it
metadata:
  type: project
---

Decision (2026-10-19, redesign versione D): the Tornei · Mappa keeps the real Leaflet map (`ConquisteMap`) dressed like the design, instead of the design's static `italy-map.svg`.

**Why:** the design SVG has no Sicily and crops the south; riviera players (the real data: 5 cities within 40 km) collapse into one blob at Italy scale, which only clusters + zoom solve; the SVG has no georeference (pins drift into the sea); CSP in `vercel.json` only allows `*.tile.openstreetmap.org`, so a label-free tile provider would need a config change.

**How to apply / traps:**
- Leaflet CSS is OUTSIDE `@layer` and beats every layered rule: style only own classes/children, or inline style (the `.leaflet-container` #ddd background is overridden inline). `.leaflet-marker-icon` is `display:block`: center icon content with `position:absolute; left/top:50%; translate:-50% -50%`.
- Pale look = `.conquiste-tiles { filter: grayscale(1) contrast(1.25) brightness(1.1); opacity: .4 }` (tileLayer `className`). Hue tricks to make water lighter than land don't work.
- Pins keep the double border (white halo + INK contour, even for "giocato") — `src/test/contrast.test.ts`.
- City labels live inside the divIcon HTML; placement is computed arithmetically (container points + label offsetWidth), not with getBoundingClientRect, because the drop animation scales the dots. Prefer "top": OSM writes its own name centered on the point.
- Initial view = fitBounds(pins, maxZoom 9), not all of Italy.
See [[redesign-d-gotchas]].
