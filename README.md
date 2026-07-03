# 🏐 Beach Volley Diary

Diario di beach volley in **React + Vite + TypeScript** — tornei, partite, compagni, statistiche e galleria.
Implementazione fedele del design `Beach Volley Diary.dc.html`.

## Avvio

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check (tsc -b) + build di produzione in dist/
npm run typecheck # solo controllo dei tipi
npm run preview   # anteprima della build
```

## Funzionalità

- **Dashboard** — win rate, differenziale, andamento vittorie per mese, donut vinte/perse,
  punti fatti vs subiti, distribuzione risultati (2-0 / 2-1 / 1-2 / 0-2), win rate per compagno.
  Filtri per compagno e stagione.
- **Tornei** — elenco + dettaglio con record, set, differenziale, partite e foto.
- **Compagni** — statistiche per ogni compagno di gioco + dettaglio.
- **Galleria** — segnaposti colorati collegati ai tornei.
- **CRUD completo** — crea/modifica/elimina tornei, partite (con punteggi per set) e foto,
  tramite bottom-sheet modali. Compagno nuovo creabile al volo dalla partita.
- **Persistenza** — tutti i dati in `localStorage` (chiave `bvd_data_v1`), con dati demo iniziali.
- **Responsive** — sidebar su desktop (≥900px), bottom nav + FAB speed-dial su mobile.

## Struttura

Progetto **TypeScript** in `strict` mode (config: `tsconfig.json` → `tsconfig.app.json` / `tsconfig.node.json`).

```
src/
├── App.tsx               # stato, navigazione, modali, orchestrazione
├── hooks/
│   ├── useDiary.ts       # dati + mutazioni (save/delete) con persistenza
│   └── useMedia.ts       # breakpoint responsive (≥900px)
├── lib/
│   ├── models.ts         # tipi di dominio (Partner, Tournament, Match, form...)
│   ├── seed.ts           # dati demo iniziali
│   ├── storage.ts        # load/save localStorage
│   ├── stats.ts          # helper puri (res, computeStats, streak, ...) + tipi
│   ├── derive.ts         # selettori per ogni schermata + view-model types
│   ├── theme.ts          # palette, font, swatches
│   ├── database.types.ts # contratto DB Supabase (generato)
│   └── db.enums.ts        # union + costanti dei campi vincolati
├── components/           # Sidebar, BottomNav, modali (.tsx con props tipizzate)
└── screens/              # Home, Tornei, TorneoDetail, Compagni, CompagnoDetail, Galleria
```

## Design tokens

- Font: **Space Grotesk** (numeri/titoli, classe `.num`) · **Nunito Sans** (testo)
- Colori: `#FF6B35` arancio · `#F7A883` arancio soft · `#C4501E` arancio scuro · `#1B2A4A` blu notte ·
  bordi `rgba(27,42,74,.1)` · fill `#F2F0EC` · sfondo `#FAF8F5`
- Stile: superfici piatte con bordo (classe `.card`), etichette maiuscole (`.lbl`), pallino colore
  per piazzamento del torneo (oro/soft/neutro), esito partita a cerchio **V/P**.
