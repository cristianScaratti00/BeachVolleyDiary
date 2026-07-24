# 🏐 Beach Volley Diary

Diario di beach volley in **React + Vite + TypeScript** — tornei, partite, compagni, statistiche e recap di stagione.
Dati e autenticazione su **Supabase** (Postgres + RLS per-utente).

## Avvio

Prima di tutto servono le credenziali Supabase: copia `.env.example` in `.env.local` e compila
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Senza, il client si rifiuta di partire
(`src/lib/supabase.ts`). Come preparare il progetto Supabase: `supabase/README.md`.

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

- **Accesso** — Supabase Auth (email + password). In registrazione il nickname è verificato
  live dalla Edge Function `check-name`. Gate in `Root.tsx`: splash → login → app.
- **Dashboard** — win rate, differenziale, andamento vittorie per mese, donut vinte/perse,
  punti fatti vs subiti, distribuzione piazzamenti, win rate per fase e per compagno,
  tornei recenti. Filtri per compagno e stagione. Aggregazione server-side
  (RPC `dashboard_stats`) con fallback al calcolo client.
- **Tornei** — i tornei da oggi in poi restano in cima sotto "Prossimi tornei", i passati sono
  raggruppati per formato con filtro a chip; dettaglio con record, set, differenziale, partite e foto.
- **Luoghi** — il posto in cui si gioca è un'entità (`venues`), non più una città a testo libero:
  si sceglie da un elenco, o si crea al volo con nome, città e coordinate. Il dettaglio torneo
  mostra "quante volte hai giocato qui". Le coordinate arrivano **solo** dal GPS del dispositivo o
  incollate a mano: nessuna chiamata a servizi di geocoding.
  Il catalogo è **condiviso fra gli utenti** ("Bagno 26 · Riccione" è lo stesso posto per tutti):
  tutti lo leggono, ognuno può correggere solo le voci che ha creato, e "Unisci a…" fonde due
  doppioni. I tornei conservano comunque la città come testo (`tournaments.city`), così quelli
  senza luogo — vecchi o creati da un altro client — restano leggibili e mappabili.
- **Due mappe, due domande diverse.** *La mappa delle conquiste* (seconda vista di **Tornei**) è
  l'insieme: sagoma dell'Italia in SVG, un pin per città, colore = miglior piazzamento e
  dimensione = quanti tornei. Zero dipendenze e zero rete — il geocoding è un gazetteer
  committato (`src/lib/geo.ts`), quindi funziona offline. *La mappa del luogo* (dettaglio torneo)
  è il singolo posto a zoom di strada: Leaflet con tile OpenStreetMap, in `lazy()` e mostrata solo
  per i tornei che hanno davvero delle coordinate — l'unico punto dell'app che scarica tile.
- **Chi c'è oggi** — check-in per città + giorno con flag "cerco compagno"; in reciprocità si
  vedono gli altri presenti oggi (RPC `who_is_here`) e li si aggiunge come compagno sul posto.
- **Compagni** — statistiche per compagno + dettaglio. Un compagno può essere collegato a un
  utente dell'app, che vede i tornei condivisi in sola lettura.
- **Diario** — timeline cronologica dei tornei con thumb delle foto e scorciatoia alla storia Instagram.
- **Beach Wrapped** — recap di stagione sfogliabile stile storia IG (intervallo configurabile),
  con export PNG per slide, "scarica tutte" e condivisione nativa.
- **Storia Instagram** — immagine 1080×1920 del singolo torneo, generata con `html-to-image` e scaricabile.
- **Assistente guidato** — creazione conversazionale del torneo in stile chat. Nessun modello
  linguistico: è una macchina a stati scriptata (`src/screens/CreaChat.tsx`).
- **Profilo** — nome visualizzato, password, foto profilo (bucket `avatars` + RPC `set_avatar`), logout.
- **CRUD completo** — tornei (form completo, creazione rapida o assistente), partite con punteggi
  per set, foto e compagni, tramite bottom-sheet modali. Un compagno nuovo si crea al volo dal
  torneo ("＋ Nuovo compagno"), in tutti e tre i percorsi di creazione; la partita eredita il
  compagno del torneo.
- **Persistenza** — Postgres su Supabase con Row Level Security per-utente; client tipizzato in
  `src/lib/supabase.ts`, mutazioni in `useDiary`. Foto dei tornei su Storage privato
  (bucket `tournament-photos`) con URL firmati.
- **Piani e permessi** — `limits.ts` (cosa sblocca ciascun piano) + `permissions.ts` ("posso fare X
  adesso?"), con enforcement autoritativo lato DB. **Oggi sospesi**: `PLANS_ENABLED = false`
  (`src/lib/limits.ts`), quindi ogni utente ha tutto sbloccato.
- **Responsive** — sidebar su desktop (≥900px), bottom nav + FAB speed-dial su mobile,
  snackbar quando la connessione è lenta o assente.
- **Telemetria e performance** — Vercel Analytics + Speed Insights; eventi `track(...)` sulle azioni
  principali; code-splitting di Diario, assistente, storia, Wrapped e mappa del luogo (Leaflet).

## Struttura

Progetto **TypeScript** in `strict` mode (config: `tsconfig.json` → `tsconfig.app.json` /
`tsconfig.node.json` / `tsconfig.test.json`).

```
src/
├── main.tsx              # bootstrap: AuthProvider + Analytics/Speed Insights
├── Root.tsx              # auth gate: splash → login → app
├── App.tsx               # stato, navigazione, modali, orchestrazione
├── hooks/
│   ├── useAuth.tsx       # contesto di sessione (Supabase Auth)
│   ├── useDiary.ts       # dati + mutazioni (save/delete) su Supabase
│   ├── useCheckIn.ts     # "Chi c'è oggi": check-in di giornata + stanza live
│   ├── useConnection.ts  # rilevamento connessione lenta/offline
│   └── useMedia.ts       # breakpoint responsive (≥900px)
├── lib/
│   ├── supabase.ts       # client tipizzato (VITE_SUPABASE_*)
│   ├── auth.ts           # login, registrazione, profilo
│   ├── models.ts         # tipi di dominio + Screen/ModalKind/form
│   ├── db.enums.ts       # union + costanti dei campi vincolati
│   ├── database.types.ts # contratto DB Supabase (mantenuto a mano)
│   ├── stats.ts          # helper puri (res, computeStats, streak, ...)
│   ├── derive.ts         # selettori per ogni schermata + view-model types
│   ├── derive.mappa.ts   # selettore della mappa delle conquiste (pin, bucket, legenda)
│   ├── geo.ts            # proiezione, gazetteer città→coordinate, declustering dei pin
│   ├── italy.ts          # tracciato SVG dell'Italia — solo dati, già proiettati con geo.ts
│   ├── dashboard.ts      # wrapper RPC dashboard_stats
│   ├── serverviews.ts    # wrapper RPC liste/dettagli + who_is_here
│   ├── limits.ts         # entitlements per piano (oggi sospesi)
│   ├── permissions.ts    # "posso fare X adesso?" (piano + conteggi)
│   └── theme.ts          # palette, font, swatches
├── components/
│   ├── ui.tsx            # primitive condivise (Badge, StatTile, MatchRow, ...)
│   ├── VenueMap.tsx      # mappa del singolo luogo — unico punto che importa leaflet,
│   │                     #   in lazy() e solo per i tornei con coordinate
│   ├── dashboard/        # una card per ogni grafico della Home
│   ├── modals/           # bottom-sheet: torneo, rapido, partita, foto, socio, story
│   │                     #   + VenuePicker, il selettore luogo dei due form torneo
│   ├── wrapped/          # visore Beach Wrapped + palette delle slide
│   └── …                 # Sidebar, BottomNav, Logo, Splash, PhotoLightbox, snackbar
├── screens/              # Home, Tornei, Mappa, TorneoDetail, Compagni, CompagnoDetail,
│                         # ChiCeOggi, Diario, CreaChat, Profilo, Login
└── test/                 # setup Vitest, factories, wrapper axe, contrasto WCAG
```

Fuori da `src/`:

```
supabase/migrations/          # schema, RLS, RPC
supabase/functions/check-name # Edge Function: nickname già in uso?
docs/                         # report QA per feature
```

## Test

```bash
npm test               # suite Vitest (jsdom + Testing Library + axe-core)
npm run test:watch
npm run typecheck:test # tipi dei soli test (tsconfig.test.json)
```

I test sono co-locati accanto al codice che coprono (`*.test.ts` / `*.test.tsx`).
`src/test/setup.ts` smonta l'albero fra un test e l'altro; `src/test/factories.ts` costruisce i dati
di fabbrica con "oggi" congelato al `2026-07-22`, così la suite non cambia colore a mezzanotte;
`src/test/axe.ts` è un wrapper su axe-core limitato alle regole WCAG 2.1 A/AA;
`src/test/contrast.test.ts` calcola il contrasto sui colori veri, che axe in jsdom non può misurare.
I report QA per feature stanno in `docs/`.

## Design tokens

- Font: **Space Grotesk** (numeri/titoli, classe `.num`) · **Nunito Sans** (testo)
- Colori: `#FF6B35` arancio · `#F7A883` arancio soft · `#C4501E` arancio scuro · `#1B2A4A` blu notte ·
  bordi `rgba(27,42,74,.1)` · fill `#F2F0EC` · sfondo `#FAF8F5`
- Stile: superfici piatte con bordo (classe `.card`), etichette maiuscole (`.lbl`), pallino colore
  per piazzamento del torneo (oro/soft/neutro, `dotForRank`), esito partita a cerchio **V/P**.
