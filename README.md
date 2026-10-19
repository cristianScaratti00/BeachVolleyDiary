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

- **Accesso** — Supabase Auth (email + password). Benvenuto con la scena del tramonto e un
  carosello di tre messaggi, Accedi, Registrati in due passi (nickname verificato live dalla Edge
  Function `check-name`, poi email e password). Gate in `Root.tsx`: splash → login → app.
- **Home** — una frase su come stai andando, periodo (Sempre / stagioni) e filtro per compagno;
  **Pallo**, la mascotte, dà un consiglio alla volta calcolato dai dati (oggi si gioca → aggiungi
  partita, piazzamento da aggiornare, serie record, posto migliore, Wrapped pronto…); poi la % di
  partite vinte (link a Statistiche), Beach Wrapped, tornei vinti, serie record, ultimi tornei.
  L'avatar in alto apre il Profilo.
- **Statistiche** (`/statistiche`) — win rate, differenziale, andamento vittorie per mese, anello
  vinte/perse, punti fatti vs subiti, piazzamenti, win rate per fase e per compagno. Filtri per
  compagno e stagione, visibili. Aggregazione server-side (RPC `dashboard_stats`) con fallback al
  calcolo client.
- **Tornei** — due viste sotto un'unica ricerca: **Lista** (i tornei da oggi in poi restano in cima
  sotto "Prossimi tornei", i passati sono raggruppati per formato con filtro a chip; ogni riga ha la
  medaglia del piazzamento) e **Mappa**. La ricerca fuzzy trova per nome, città, avversario, nota o
  didascalia. Dettaglio con medaglia, record, set, differenziale, luogo, partite e foto, e in fondo
  le azioni «Storia» e «Aggiungi partita».
- **Diario** (`/diario`, tab) — la stagione mese per mese, dal torneo più recente, con foto, nota
  e storia Instagram; ha la sua ricerca (`?q=`). `/tornei/timeline` porta qui.
- **Partita live** (`/live`) — segnapunti da bordo campo, **in torneo o tra amici**. In torneo si
  sceglie torneo, fase e avversari e a fine partita si salva come una partita normale; tra amici
  non serve un torneo (squadre e formato facoltativi: 1 set o 2 su 3, a 21 o a 15) e il risultato
  resta nello **storico locale** delle ultime 20 partite (`localStorage`, per account), da cui si può
  anche salvare in un torneo dopo. Ogni tocco su un pannello è un punto (−1 per correggere), due
  punti di scarto, timeout da 30", Pallo che tifa. La partita in corso vive in `sessionStorage` (un
  refresh non la perde) e lo schermo resta acceso dove si può.
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
- **Beach Wrapped** — recap di stagione sfogliabile stile storia IG, **solo a ottobre**
  (`wrappedAOttobre` in `src/app/selectors.ts`), con export PNG per slide, "scarica tutte" e
  condivisione nativa; le foto non vengono mai ritagliate.
- **Storia Instagram** — immagine 1080×1920 del singolo torneo, generata con `html-to-image` e
  scaricabile: **3 layout** (Tabellone, Foto, Polaroid) × 3 colori, scelta ricordata per dispositivo;
  le foto restano sempre intere, con la loro proporzione.
- **Assistente guidato («Raccontalo a Pallo»)** — creazione conversazionale del torneo in stile
  chat. Nessun modello linguistico: è una macchina a stati scriptata (`src/screens/CreaChat.tsx`).
- **Profilo** — si apre dall'avatar in Home (o dalla Sidebar) e si chiude col ×: nome visualizzato,
  password, foto profilo (bucket `avatars` + RPC `set_avatar`), condivisioni ricevute, l'interruttore
  «Statistiche d'uso anonime» (lo stesso consenso del dialogo dei cookie), «Segnala un problema»,
  bacheca delle segnalazioni (solo admin), logout con conferma.
- **CRUD completo** — dal ＋ (o «Nuovo» della Sidebar) si apre «Cosa registriamo?»: *Partita
  live*, *Torneo* (il modulo completo), *Partita* (sa già in quale torneo), *Torneo rapido* (nome,
  data e piazzamento; il resto dopo) e *Raccontalo a Pallo*. Partite con punteggi per set, foto e
  compagni negli sheet; ogni eliminazione chiede conferma (il torneo si elimina dal suo sheet di
  modifica). Un compagno nuovo si crea al volo dal torneo; la partita eredita il compagno del torneo.
- **URL vere** — ogni schermata e ogni dettaglio ha il suo percorso (`/tornei/:id`,
  `/compagni/:id`…): il tasto indietro chiude gli sheet, il refresh e i link diretti funzionano.
  Router senza dipendenze in `src/app/router.ts`; rewrite SPA in `vercel.json`.
- **Persistenza** — Postgres su Supabase con Row Level Security per-utente; client tipizzato in
  `src/lib/supabase.ts`, mutazioni in `useDiary`. Foto dei tornei su Storage privato
  (bucket `tournament-photos`) con URL firmati.
- **Piani e permessi** — `limits.ts` (cosa sblocca ciascun piano) + `permissions.ts` ("posso fare X
  adesso?"), con enforcement autoritativo lato DB. **Oggi sospesi**: `PLANS_ENABLED = false`
  (`src/lib/limits.ts`), quindi ogni utente ha tutto sbloccato.
- **Responsive** — Sidebar flottante su desktop (≥900px), su mobile la TabBar: una capsula di vetro
  liquido (Home · Tornei · Compagni · Diario) con il ＋ arancio staccato; da 600px gli sheet
  diventano form sheet centrati.
  Avvisi in alto (Toast) per salvataggi, errori, rete lenta o assente.
- **Telemetria e performance** — Vercel Analytics + Speed Insights; eventi `track(...)` sulle azioni
  principali (nomi invariati); i percorsi con un UUID arrivano come `/tornei/[id]`. Code-splitting
  di Timeline del Diario, assistente, partita live, storia, Wrapped, visore foto, mappe (Leaflet)
  e vetro liquido (solo Blink).

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
│   └── …                 # Logo, Splash, Pallo, PhotoLightbox, mappe
├── screens/              # Home, Statistiche, Tornei (+ Mappa), Diario (+ Timeline), TorneoDetail,
│                         # Compagni, CompagnoDetail, ChiCeOggi, Profilo, Segnala,
│                         # Segnalazioni, CreaChat, Wrapped, Login, NonTrovato
└── test/                 # setup Vitest, factories, wrapper axe, contrasto WCAG
```

Fuori da `src/`:

```
supabase/migrations/          # schema, RLS, RPC
supabase/functions/check-name # Edge Function: nickname già in uso?
docs/                         # report QA per feature; QA-refactor.md = stati di UX §6 → test
docs/motion/                  # demo del movimento (MOTION.md), fuori dalla build
docs/preview/ · docs/qa/      # l'app con dati finti + script CDP (axe, Tab, bersagli, sweep)
UX.md · ART_DIRECTION.md · MOTION.md  # flussi, sistema visivo, movimento
POLISH.md                     # misure della rifinitura e come rifarle con docs/qa
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
`src/test/app.tsx` monta l'app intera (`AppView`) con un diario in memoria: ci girano i test dei
flussi in `src/app/AppView.test.tsx` (menu ＋, sheet, conferme, focus, indietro, breakpoint).
I report QA per feature stanno in `docs/`; [`docs/QA-refactor.md`](docs/QA-refactor.md) dice dove è
verificato ogni stato dell'interfaccia.

## Design tokens

Il sistema visivo si chiama **"Bagnasciuga"** ed è descritto in [`ART_DIRECTION.md`](ART_DIRECTION.md)
(il movimento in [`MOTION.md`](MOTION.md)); i valori di oggi sono quelli della **versione D**, il
redesign Liquid Glass (prima sezione di ART_DIRECTION.md). In breve:

- **Token** solo in `src/styles/tokens.css` (custom properties). I componenti usano i ruoli
  semantici (`--ink`, `--ink-2`, `--accent`, `--accent-text`, `--select`…), mai un esadecimale; in
  JS ci sono `TOKEN` (riferimenti `var(--…)`) e `LIT` (letterali per canvas e SVG) in
  `src/lib/theme.ts`. `src/styles/tokens.test.ts` ricalcola ogni contrasto citato nel documento.
- **Font**: Geist variabile, servito dall'app (`@fontsource-variable/geist`), anche nei PNG
  esportati. Scala tipografica `--type-*` + `--track-*` (titoli a 800); numeri tabellari ovunque.
- **Colore**: un inchiostro neutro (`#1C1C1E`), il fondo piatto `#F6F6F4`, la carta bianca col filo
  `#E2E2DE`, un accento (arancio `#FF6B1A` col filo `#E05A10`; come testo `--accent-text`). Il CTA
  è arancio con l'etichetta d'inchiostro; la tab accesa è una pillola arancio tenue; la chip scelta
  è d'inchiostro pieno.
- **Vetro liquido** con [`liquid-glass-react`](https://github.com/rdev/liquid-glass-react) in tutta
  l'app, via `LiquidGlass` (`src/components/ui/LiquidGlass.tsx`): TabBar (con la lente che scorre
  sotto la tab accesa), Sidebar, pulsanti di vetro in cima ai dettagli, azioni in fondo, ogni
  `Button variant="glass"`, voci del ＋, risposte rapide dell'assistente; sopra i media (Wrapped,
  Storia) il vetro `glass-media`, quasi trasparente con la sola luce sul bordo. Su Chrome/Android il
  bordo piega il contenuto (filtro SVG); su Safari/iOS e Firefox restano sfocatura, luce sul bordo e
  ombra. Della libreria si usa solo il vetro: i suoi bordi di luce e i suoi veli sono spenti
  (`LiquidGlass.css`), la luce la disegna il materiale. Il materiale CSS (`data-material`,
  `materials.css`) è la base e il ripiego. La libreria dichiara React 19 ma usa solo API di React
  18: `overrides` in `package.json`. Il contenuto (card, liste, grafici) è carta opaca.
  `node docs/qa/barra.mjs` controlla a ogni fotogramma che la TabBar resti ferma cambiando tab e
  scorrendo (niente che sbordi a destra).
- **Movimento**: `ENTRATA` / `SVELTO` / `MOLLA` (`src/components/Motion.tsx`, libreria Motion) =
  `--dur-*` + `--ease-*`, più la SALITA sfalsata (`.rise`) e la PRESSIONE a molla (`.press`) del
  redesign; solo `transform` e `opacity`; tutto rispetta `prefers-reduced-motion`.
- **Pallo** (`src/components/Pallo.tsx`): la mascotte, decorativa, con 14 espressioni animate
  (saluta, esulta, contento, preoccupato, sbircia, testa, festa, triste, pensa, dorme, sorpreso,
  occhiolino, cool, cuori), lo sguardo che segue il dito, le reazioni al tocco e un paio di
  sorprese; tutto fermo con reduced-motion.
- **Primitive** in `src/components/ui/*`: un file `.tsx` e uno `.css` per componente, classi con il
  prefisso `ui-`, varianti come `data-variant` / `data-size`. Le schermate hanno il loro `.css`
  accanto, con il prefisso della schermata.
