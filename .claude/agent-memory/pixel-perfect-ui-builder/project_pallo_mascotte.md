---
name: project-pallo-mascotte
description: L'utente ama la mascotte Pallo e la vuole espressiva; umori, interazioni e regole che l'illustrazione deve rispettare (redesign versione D, ott 2026)
metadata:
  type: project
---

L'utente ha chiesto (2026-10-19) più espressioni e interazioni per Pallo, la mascotte del redesign: «mi piace un sacco ma ha poche interazioni». Ora ha 14 umori (i 6 storici + festa, triste, pensa, dorme, sorpreso, occhiolino, cool, cuori), lo sguardo che segue il dito (`segui`), l'ammiccare e i gesti «idle» casuali (`vivo`), la reazione al tocco e un easter egg (5 tocchi o tocco lungo: palleggio / occhiali). PartitaLive, Wrapped e StoryModal sono stati lasciati all'orchestratore da collegare.

**Why:** l'utente lo vede come il personaggio che dà voce all'app; un Pallo sempre uguale gli sembra povero.

**How to apply:** dove una schermata «parla» all'utente, scegli l'umore che corrisponde al momento (non sempre `saluta`). Pallo resta decorativo (`aria-hidden`, niente testo nell'SVG), ogni umore deve leggersi anche da fermo (reduced-motion ed export PNG di Story/Wrapped spengono le animazioni). Disegni nuovi: tratto d'inchiostro 3.5, mani arancio r5 col filo 3; prima di consegnarli fai una tavola temporanea in docs/preview/<cartella>/ + CDP (Chrome headless su porte proprie) e guardala, poi cancellala. A 38px (avatar dell'assistente) braccia e mani diventano briciole: con `soloTesta` restano solo palla e faccia. Vedi [[qa-browser-cdp]].
