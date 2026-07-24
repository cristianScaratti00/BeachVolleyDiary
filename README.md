# 🏐 Beach Volley Diary

Diario di beach volley in **React + Vite + TypeScript**, con **Supabase** per autenticazione,
dati e foto — tornei, partite, compagni, statistiche, recap di stagione e mappa delle trasferte.

## Avvio

```bash
npm install
cp .env.example .env.local   # e compila con URL e chiave del tuo progetto Supabase

npm run dev            # http://localhost:5173
npm run build          # type-check (tsc -b) + build di produzione in dist/
npm run typecheck      # solo controllo dei tipi dell'app
npm run typecheck:test # controllo dei tipi dei test
npm test               # suite Vitest (jsdom + Testing Library + axe)
npm run preview        # anteprima della build
```

## Funzionalità

- **Dashboard** — win rate, differenziale, andamento vittorie per mese, donut vinte/perse,
  punti fatti vs subiti, distribuzione risultati (2-0 / 2-1 / 1-2 / 0-2), win rate per compagno
  e per fase. Filtri per compagno e stagione.
- **Tornei** — elenco raggruppato per formato con sezione "Prossimi tornei", e dettaglio con
  record, set, differenziale, partite e foto.
- **Mappa delle conquiste** — seconda vista di Tornei: l'Italia in SVG con un pin per ogni città
  in cui hai giocato, colorato dal miglior piazzamento ottenuto lì e dimensionato sul numero di
  tornei. Nessuna libreria di mappe e nessuna rete: tracciato e gazetteer sono dati committati.
- **Compagni** — statistiche per ogni compagno di gioco + dettaglio. Un socio può essere
  collegato a un altro utente dell'app, che condivide i propri tornei in sola lettura.
- **Chi c'è oggi** — check-in per città e giorno; in reciprocità vedi chi altro è in spiaggia
  e lo aggiungi come compagno sul posto.
- **Diario** — ogni torneo diventa una voce con data, emoji, recap e foto.
- **Beach Wrapped** — recap di stagione in card sfogliabili e condivisibili.
- **Storia Instagram** — immagine 1080×1920 scaricabile per un singolo torneo.
- **Assistente AI** — creazione guidata di un torneo in stile chat.
- **CRUD completo** — crea/modifica/elimina tornei (completi o rapidi), partite con punteggi per
  set, foto e compagni, tramite bottom-sheet modali.
- **Persistenza** — Supabase (Postgres + RLS + Storage). Le aggregazioni pesanti hanno una RPC
  server con fallback al calcolo client.
- **Responsive** — sidebar su desktop (≥900px), bottom nav + FAB speed-dial su mobile.

## Struttura

Progetto **TypeScript** in `strict` mode (config: `tsconfig.json` → `tsconfig.app.json` /
`tsconfig.node.json` / `tsconfig.test.json`).

Tre livelli, senza eccezioni: **selettori puri** (`lib/derive*.ts`) → **schermate
presentazionali** (`screens/`, solo props e callback) → **orchestrazione** (`App.tsx`).

```
src/
├── App.tsx               # stato, navigazione, modali, orchestrazione
├── hooks/
│   ├── useAuth.tsx       # sessione, profilo, login/logout
│   ├── useDiary.ts       # dati + mutazioni (save/delete) su Supabase
│   ├── useCheckIn.ts     # check-in di giornata e stanza di "Chi c'è oggi"
│   ├── useConnection.ts  # stato della connessione
│   └── useMedia.ts       # breakpoint responsive (≥900px)
├── lib/
│   ├── models.ts         # tipi di dominio (Partner, Tournament, Match, form...)
│   ├── stats.ts          # helper puri (res, computeStats, streak, placementRank...)
│   ├── derive.ts         # selettori di ogni schermata + view-model types
│   ├── derive.mappa.ts   # selettore della mappa (separato: si porta dietro geo + italy)
│   ├── geo.ts            # proiezione, gazetteer, geocoding, declustering dei pin
│   ├── italy.ts          # tracciato SVG dell'Italia (generato una volta, committato)
│   ├── serverviews.ts    # RPC di aggregazione per schermata
│   ├── dashboard.ts      # RPC della dashboard
│   ├── permissions.ts    # piani e limiti
│   ├── supabase.ts       # client
│   ├── theme.ts          # palette, font, swatches
│   ├── database.types.ts # contratto DB Supabase (mantenuto a mano)
│   └── db.enums.ts       # union + costanti dei campi vincolati
├── components/           # ui.tsx (design system), Sidebar, BottomNav, modali, dashboard, wrapped
├── screens/              # Home, Tornei, Mappa, TorneoDetail, Compagni, CompagnoDetail,
│                         # ChiCeOggi, Diario, CreaChat, Profilo, Login
└── test/                 # factories, wrapper axe, contrasto WCAG dei token
supabase/migrations/      # schema, RLS, RPC
docs/                     # note di QA per feature
```

## Test

`npm test` esegue l'intera suite (Vitest + jsdom). I test sono deterministici per costruzione:
nessuna rete, nessun timer reale, "oggi" sempre iniettato. Ogni schermata passa una scansione
**axe**, e `src/test/contrast.test.ts` fissa a numero i rapporti di contrasto WCAG dei token —
compresi quelli sotto soglia, documentati come debito noto invece che silenziosi.

## Design tokens

- Font: **Space Grotesk** (numeri/titoli, classe `.num`) · **Nunito Sans** (testo)
- Colori: `#FF6B35` arancio · `#F7A883` arancio soft · `#C4501E` arancio scuro · `#1B2A4A` blu notte ·
  bordi `rgba(27,42,74,.1)` · fill `#F2F0EC` · sfondo `#FAF8F5`
- Stile: superfici piatte con bordo (classe `.card`), etichette maiuscole (`.lbl`), pallino colore
  per piazzamento del torneo (oro/soft/neutro, `dotForRank`), esito partita a cerchio **V/P**.
