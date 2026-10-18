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
- **Home** — dice cosa serve adesso: il torneo di oggi (o il prossimo), l'ultimo risultato, il
  check-in di oggi; poi i numeri chiave della stagione e i link a Statistiche e Beach Wrapped.
- **Statistiche** (`/statistiche`) — win rate, differenziale, andamento vittorie per mese, anello
  vinte/perse, punti fatti vs subiti, piazzamenti, win rate per fase e per compagno. Filtri per
  compagno e stagione, visibili. Aggregazione server-side (RPC `dashboard_stats`) con fallback al
  calcolo client.
- **Tornei** — tre viste sotto un'unica ricerca: **Lista** (i tornei da oggi in poi restano in cima
  sotto "Prossimi tornei", i passati sono raggruppati per formato con filtro a chip), **Timeline**
  (l'ex Diario: cronologia con foto e storia Instagram) e **Mappa**. La ricerca fuzzy trova per
  nome, città, avversario, nota o didascalia. Dettaglio con record, set, differenziale, partite e foto.
  Accanto al piazzamento si può indicare il **tabellone** in cui è arrivato (Gold / Silver / Bronze /
  Girone unico, facoltativo): compare nel badge ("2° · Silver"), nella story e nella ricerca del diario, ma non
  cambia le statistiche — un 1° nel Bronze resta un 1° per podi e miglior piazzamento.
- **Luoghi** — il posto in cui si gioca è un'entità, non più una città a testo libero: si sceglie
  da un elenco (o si crea al volo con nome, città e coordinate) e il dettaglio torneo mostra
  "quante volte hai giocato qui" più una mappa OpenStreetMap. Le coordinate si prendono in tre
  modi: cercando il luogo su **Photon** (geocoder OpenStreetMap, senza chiave API — trova la
  singola spiaggia, non solo il comune), dal GPS del dispositivo, o incollate a mano. La ricerca
  è l'unico punto in cui del testo scritto nell'app esce verso un servizio esterno, ed è
  facoltativa: se non risponde, gli altri due modi restano.
  Il catalogo è **condiviso fra gli utenti** ("Bagno 26 · Riccione" è lo stesso posto per tutti):
  tutti lo leggono, ognuno può correggere solo le voci che ha creato. I tornei conservano
  comunque la città come testo (`tournaments.city` scritta accanto a `venue_id`), così quelli
  senza luogo restano leggibili.
- **La mappa delle conquiste** — vista dentro Tornei (`/tornei/mappa`): una mappa Leaflet con
  tile OpenStreetMap e un pin per ogni città giocata, colorato dal miglior piazzamento ottenuto
  lì; la stagione si sceglie lì. Il contorno navy dei pin porta il
  contrasto WCAG 1.4.11 (i riempimenti da soli non basterebbero, vedi `src/test/contrast.test.ts`).
- **Chi c'è oggi** — check-in per città + giorno con flag "cerco compagno"; in reciprocità si
  vedono gli altri presenti oggi (RPC `who_is_here`) e li si aggiunge come compagno sul posto.
- **Compagni** — statistiche per compagno + dettaglio. Un compagno può essere collegato a un
  utente dell'app, che vede i tornei condivisi in sola lettura.
- **Beach Wrapped** — recap di stagione sfogliabile stile storia IG (intervallo configurabile),
  con export PNG per slide, "scarica tutte" e condivisione nativa.
- **Storia Instagram** — immagine 1080×1920 del singolo torneo, generata con `html-to-image` e scaricabile.
- **Assistente guidato** — creazione conversazionale del torneo in stile chat. Nessun modello
  linguistico: è una macchina a stati scriptata (`src/screens/CreaChat.tsx`).
- **Profilo** — nome visualizzato, password, foto profilo (bucket `avatars` + RPC `set_avatar`),
  condivisioni ricevute, consenso ai cookie, «Segnala un problema», bacheca delle segnalazioni
  (solo admin), logout con conferma.
- **CRUD completo** — dal ＋ della TabBar (o «＋ Nuovo» della Sidebar): *Nuovo torneo* apre UN
  solo sheet con i campi essenziali e «Altri dettagli» espandibile (l'assistente guidato resta un
  percorso facoltativo), *Aggiungi partita* sa già in quale torneo, *Check-in oggi*. Partite con
  punteggi per set, foto e compagni negli sheet; ogni eliminazione chiede conferma. Un compagno
  nuovo si crea al volo dal torneo; la partita eredita il compagno del torneo.
- **URL vere** — ogni schermata e ogni dettaglio ha il suo percorso (`/tornei/:id`,
  `/compagni/:id`…): il tasto indietro chiude gli sheet, il refresh e i link diretti funzionano.
  Router senza dipendenze in `src/app/router.ts`; rewrite SPA in `vercel.json`.
- **Persistenza** — Postgres su Supabase con Row Level Security per-utente; client tipizzato in
  `src/lib/supabase.ts`, mutazioni in `useDiary`. Foto dei tornei su Storage privato
  (bucket `tournament-photos`) con URL firmati.
- **Piani e permessi** — `limits.ts` (cosa sblocca ciascun piano) + `permissions.ts` ("posso fare X
  adesso?"), con enforcement autoritativo lato DB. **Oggi sospesi**: `PLANS_ENABLED = false`
  (`src/lib/limits.ts`), quindi ogni utente ha tutto sbloccato.
- **Responsive** — Sidebar flottante su desktop (≥900px), TabBar di vetro a capsula su mobile
  (Home · Tornei · ＋ · Compagni · Profilo); da 600px gli sheet diventano form sheet centrati.
  Avvisi in alto (Toast) per salvataggi, errori, rete lenta o assente.
- **Telemetria e performance** — Vercel Analytics + Speed Insights; eventi `track(...)` sulle azioni
  principali (nomi invariati); i percorsi con un UUID arrivano come `/tornei/[id]`. Code-splitting
  di Timeline, assistente, storia, Wrapped, visore foto e mappe (Leaflet).

## Struttura

Progetto **TypeScript** in `strict` mode (config: `tsconfig.json` → `tsconfig.app.json` /
`tsconfig.node.json` / `tsconfig.test.json`).

```
src/
├── main.tsx              # bootstrap: token CSS, AuthProvider, Analytics/Speed Insights
├── Root.tsx              # auth gate: splash → login → app
├── App.tsx               # composizione: rotta → schermata, con dati e azioni
├── app/
│   ├── routes.ts         # Route, TabKey, parseLocation/routeHref, OGGI_ATTIVO
│   ├── router.ts         # History API + popstate, <Link>, pila degli overlay
│   ├── overlays.ts       # tipo Overlay e riduttore della pila
│   ├── useScreenData.ts  # effetti RPC per rotta + derivate, primo carico fallito
│   ├── useActions.ts     # salvataggi, eliminazioni con conferma, permessi, analytics
│   ├── ModalHost.tsx     # sheet, menu, dialoghi e visori in un portal
│   ├── AppShell.tsx      # Sidebar/TabBar, <main>, focus e titolo per rotta
│   ├── selectors.ts      # regole di questa interfaccia (Adesso, destinazione partita…)
│   └── contracts.ts      # le props delle schermate e degli overlay
├── styles/
│   ├── tokens.css        # SOLO custom properties: il sistema "Bagnasciuga"
│   ├── materials.css     # [data-material]: il vetro e i suoi fallback
│   └── base.css          # elementi nudi, focus, scrollbar, utilità
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
│   ├── derive.mappa.ts   # dati della mappa delle conquiste (pin, città, tier)
│   ├── geo.ts            # coordinate: parsing, chiavi, distanze
│   ├── dashboard.ts      # wrapper RPC dashboard_stats
│   ├── serverviews.ts    # wrapper RPC liste/dettagli + who_is_here
│   ├── limits.ts         # entitlements per piano (oggi sospesi)
│   ├── permissions.ts    # "posso fare X adesso?" (piano + conteggi)
│   └── theme.ts          # TOKEN (var()), LIT (letterali), BP, dataTone, swatches
├── components/
│   ├── ui/               # primitive: Button, Card, ListGroup, NavBar, TabBar, Sheet…
│   │                     #   (.tsx + .css affiancati, classi `ui-`, varianti data-*;
│   │                     #   si importano da `components/ui/index`)
│   ├── VenueMap.tsx      # mappa del luogo e mappa delle conquiste: gli unici punti
│   ├── ConquisteMap.tsx  #   che importano leaflet, entrambi caricati in lazy()
│   ├── MapZoom.tsx       # i +/− di vetro sopra le due mappe (al posto di quelli di Leaflet)
│   ├── dashboard/        # una card per ogni grafico della Home
│   ├── modals/           # Sheet + sheet: torneo (unico), partita, foto, compagno,
│   │                     #   collega, password; StoryModal; VenuePicker
│   ├── wrapped/          # visore Beach Wrapped + palette delle slide
│   └── …                 # Logo, Splash, PhotoLightbox, BannerAlpha, mappe
├── screens/              # Home, Statistiche, Tornei (+ Timeline, Mappa), TorneoDetail,
│                         # Compagni, CompagnoDetail, ChiCeOggi, Profilo, Segnala,
│                         # Segnalazioni, CreaChat, Wrapped, Login, NonTrovato
└── test/                 # setup Vitest, factories, wrapper axe, contrasto WCAG
```

Fuori da `src/`:

```
supabase/migrations/          # schema, RLS, RPC
supabase/functions/check-name # Edge Function: nickname già in uso?
docs/                         # report QA per feature
docs/motion/                  # demo del movimento (MOTION.md), fuori dalla build
UX.md · ART_DIRECTION.md · MOTION.md  # flussi, sistema visivo, movimento
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

Il sistema visivo si chiama **"Bagnasciuga"** ed è descritto in [`ART_DIRECTION.md`](ART_DIRECTION.md)
(il movimento in [`MOTION.md`](MOTION.md)). In breve:

- **Token** solo in `src/styles/tokens.css` (custom properties). I componenti usano i ruoli
  semantici (`--ink`, `--ink-2`, `--accent`, `--accent-text`, `--select`…), mai un esadecimale; in
  JS ci sono `TOKEN` (riferimenti `var(--…)`) e `LIT` (letterali per canvas e SVG) in
  `src/lib/theme.ts`. `src/styles/tokens.test.ts` ricalcola ogni contrasto citato nel documento.
- **Font**: SF Pro su Apple, Inter altrove (`--font-ui`); i PNG esportati usano solo Inter.
  Scala tipografica `--type-*` + `--track-*`; numeri tabellari `--type-num-*`.
- **Colore**: un inchiostro (navy `#1B2A4A`), due superfici (sabbia e carta), un accento (arancio
  `#FF6B35`, come riempimento; come testo `--accent-text`). Il CTA è arancio con l'etichetta navy;
  il selezionato è una pillola navy con il contenuto bianco.
- **Vetro** solo sui livelli di navigazione e controllo, via `data-material` (`materials.css`):
  TabBar, NavBar dopo lo scroll, sheet, menu, toolbar dei visori; al massimo tre superfici
  sfocate. Il contenuto (card, liste, grafici) è carta opaca.
- **Movimento**: `ENTRATA` / `SVELTO` / `MOLLA` (`src/components/Motion.tsx`) = `--dur-*` +
  `--ease-*`; solo `transform` e `opacity`; tutto rispetta `prefers-reduced-motion`.
- **Primitive** in `src/components/ui/*`: un file `.tsx` e uno `.css` per componente, classi con il
  prefisso `ui-`, varianti come `data-variant` / `data-size`. Le schermate hanno il loro `.css`
  accanto, con il prefisso della schermata.
