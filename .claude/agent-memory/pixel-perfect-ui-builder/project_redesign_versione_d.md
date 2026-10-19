---
name: project-redesign-versione-d
description: Oct 2026 redesign "versione D" (Liquid Glass) from Claude Design, reproduced screen by screen by parallel agents on branch `redesign`; what Home/Statistiche became
metadata:
  type: project
---

In Oct 2026 the user had Claude Design produce a redesign ("versione D", Liquid Glass, Pallo the mascot) and wants it reproduced FAITHFULLY in the real app, screen by screen, by parallel agents coordinated through a shared brief (no commits, no `graphify update`, only own files; App.tsx/contracts.ts edited only in your own case/interface, re-read before each edit).

**Why:** the user judges the work by side-by-side comparison with the design screenshots (390×844), so fidelity of measures/colors/animations matters as much as keeping every old function reachable.

**How to apply:** for later UI work on this app, expect the design language of versione D (white cards with `--edge` hairline, 17/700 section titles, lowercase 13/600 labels, glass secondary buttons, `.rise` staggered entrance, Pallo). As of 2026-10-19 Home (`/`) is a sentence-title + Pallo tips page fed by `deriveHome` in `src/app/selectors.ts`; Profilo opens from the Home avatar (not a tab); the alpha banner and "Chi c'è oggi" card left Home; Statistiche stays a route reached from the Home "Partite vinte" card. See [[home-statistiche-redesign]] if written later.
