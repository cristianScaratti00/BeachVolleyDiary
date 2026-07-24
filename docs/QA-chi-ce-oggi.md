# QA — "Chi c'è oggi?" (check-in + stanza reciproca)

Verifica della nuova superficie opt-in **"Chi c'è oggi"**: un utente fa check-in
per città + giorno e, in reciprocità, vede gli altri utenti presenti nella stessa
città oggi e li aggiunge come compagno sul posto. Livello dati/integrazione
(ruolo 2 della pipeline), sopra la schermata presentazionale del commit `3b13c2f`.

| | |
|---|---|
| Ambito | `supabase/migrations/20260724120000_checkins_who_is_here.sql` (nuova tabella `check_ins` + RPC `who_is_here`), `src/lib/database.types.ts`, `src/hooks/useCheckIn.ts` (implementazione dei corpi), `src/hooks/useDiary.ts` (`saveCompagno` → id), `src/lib/serverviews.ts` (`getWhoIsHere`), `src/lib/derive.ts` (`deriveWhoIsHere`, `normalizeCity`, `todayISO` esportata), `src/App.tsx` (fetch-on-open), `src/screens/ChiCeOggi.tsx` (presentazionale, dal ruolo 1) |
| Ambiente | Node 22 · Vitest 3.2.7 · jsdom 26 · Testing Library React 16 · axe-core 4.12 |
| Suite | 115 test: 111 verdi + 4 `skip` preesistenti (difetti noti di Tornei). **+37 nuovi**: `derive.checkins.test.ts` (12) e `ChiCeOggi.test.tsx` (25) |
| Comandi | `npm test` · `npm run typecheck` · `npm run typecheck:test` · `npm run build` |

Tutti e quattro i comandi passano.

## Cosa è stato verificato (automatico)

**Regole del data layer** (`src/lib/derive.checkins.test.ts`, 12 test) — funzioni
pure, nessuna rete, nessun orologio:

- `normalizeCity` — `lower(btrim(city))` come il `city_key` del DB: `"Rimini"` e
  `" rimini "` finiscono nella stessa stanza; una città di soli spazi → `''`
  (la guardia che impedisce di interrogare la stanza senza una città vera); gli
  spazi interni restano.
- `deriveWhoIsHere` — mappa snake_case→camelCase, ordina **"cerca compagno"
  prima**, poi per **nome** (case-insensitive) dentro ogni gruppo; taglia la
  nota; rimpiazza un nome vuoto con `"Utente"`; stanza vuota → `[]`; non muta
  l'input.

**Schermata** (`src/screens/ChiCeOggi.test.tsx`, 25 test) — montata con `vi.fn()`
e dati di fabbrica (`makePresentUser`), **niente mock di Supabase**:

- Form di check-in: prefill città, pulsante disabilitato senza città, invio del
  payload `{city, lookingForPartner, note}` con trim della città, switch "Cerco
  compagno" (attivo di default, disattivabile), reciprocità (senza check-in la
  stanza non è visibile, invito a fare check-in).
- Stato "sei qui": `"Sei a {città} oggi"`, stato cerco/non-cerco + nota, `Esci`
  → `onCheckOut`, sparizione del form.
- Stanza: elenco con nome + badge (scoperto **dentro la card**, perché il badge
  "Cerca compagno" ha lo stesso testo del chip di filtro) + nota; contatore
  persone; `Aggiungi come compagno` passa l'utente giusto e conferma al successo;
  errore mostrato in `role="alert"` e azione ri-tentabile; `Aggiorna` →
  `onRefresh`; stanza vuota; stato di caricamento (`role="status"`).
- Filtro: compare solo con stati misti (≥2 persone, non tutti uguali), filtra su
  "Cerca compagno" e torna a "Tutti".
- Accessibilità: unico `h1`; tre scansioni **axe** senza violazioni (form,
  check-in attivo con stanza piena, stanza vuota).

## Decisioni e assunzioni (documentate)

- **Reciprocità (Q3)** — `who_is_here` restituisce righe **solo se il chiamante
  è a sua volta in check-in** nella stessa città+giorno (`exists(... me ...)`
  nella RPC). Devi metterti in vetrina per vedere gli altri. Lo screen rispecchia
  la regola lato UI (niente stanza senza `own`), ma **l'autorità è il DB**.
- **Esposizione minima (Q3)** — la RPC espone `nome + avatar_url + cerco compagno
  + nota`. **Mai l'email** (a differenza di `search_users`, che è per il flusso
  "collega socio"). Contenimento come `partner_user_link_sharing`: le righe
  altrui non sono leggibili via RLS, solo via RPC `SECURITY DEFINER`.
- **Una presenza attiva al giorno** — la tabella ammette più città lo stesso
  giorno (`unique (user_id, city_key, date)`), ma la UI modella **un** check-in
  attivo: `fetchOwnCheckIn` prende il più recente di oggi; `checkIn` fa
  `upsert(onConflict user_id,city_key,date)` (ri-check-in stessa città = aggiorna
  nota/toggle); `checkOut` **elimina tutte** le proprie righe di oggi ("esco,
  punto").
- **Link-up (Q2)** — `addAsPartner` = `saveCompagno({name})` → `linkPartner(newId,
  u.id)`. Per renderlo possibile `useDiary.saveCompagno` ora **restituisce l'id**
  del socio creato (prima un booleano). Crea **sempre un nuovo socio** (nessuna
  deduplica per nome — è il comportamento anche del resto dell'app); il
  doppio-submit è impedito dallo stato `idle/busy/done` della card.
- **Fetch-on-open + manuale (Q4)** — nessun realtime. La stanza si carica al
  mount, dopo un check-in, su `refresh()` (pulsante "Aggiorna") e quando si apre
  la schermata (effetto su `screen === 'oggi'` in App). Le risposte "stanza"
  superate vengono scartate con un contatore di richieste (`reqRef`) → niente
  race condition su refresh rapidi o check-in/out ravvicinati.
- **"Oggi" unico (UTC)** — `todayISO()` è ora esportata da `derive.ts` ed è l'unica
  sorgente di "oggi" anche in `useCheckIn`. Client e DB concordano: entrambi UTC
  (`current_date` del DB e `toISOString().slice(0,10)`).

## ⚠️ Da applicare / verificare a mano (fuori dalla portata di jsdom)

1. **Applicare la migration al DB live.** La suite NON tocca Supabase. La
   migration `20260724120000_checkins_who_is_here.sql` va applicata al progetto
   `whgotqljwmtsoulwbzyf` **via SQL Editor o MCP `apply_migration`** — **NON**
   `supabase db push` (la cronologia migration remota è disallineata, vedi nota
   di progetto). Finché non è applicata, `who_is_here` non esiste e la stanza
   resta vuota (la lettura ricade su `[]` via `ok<T>`), mentre il check-in
   fallisce silenziosamente (`console.error`, `own` resta `null`).
2. **Manual step utente:** conferma email disattivata in Dashboard → Auth →
   Providers → Email (necessario per il login immediato dei due account di test).
3. **End-to-end con due account** (due browser): entrambi check-in nella stessa
   città oggi → ciascuno vede l'altro nella stanza; una terza città o la data di
   ieri → nessuno; check-out → sparisci dalla stanza dell'altro. Reciprocità: se
   solo A è in check-in, A **non** vede B (che non è in check-in) e viceversa.
4. **"Aggiungi come compagno"** crea un socio collegato: verificare
   `partners.linked_user_id = <id utente presente>` e la condivisione tornei che
   ne consegue (plumbing esistente).
5. **Grant/containment** come `search_users`: `who_is_here` revocata ad `anon`,
   concessa ad `authenticated`; le righe `check_ins` altrui non leggibili
   direttamente (solo `*_select_own`).

## Limitazioni note

- **Flash iniziale**: al primo mount `own` è `null` finché il fetch non risolve,
  quindi per un istante si vede il form anche se sei già in check-in. Lo screen
  (contratto del ruolo 1) tratta `own === null` come "non in spiaggia" e non
  espone uno stato di boot; il fetch è rapido. Non è una regressione.
- **`refresh()` ricarica la stanza, non `own`**: se ti metti in check-in
  altrove (es. app mobile) dopo il caricamento dell'app, il tuo `own` resta
  quello caricato al mount finché non ricarichi l'app. Accettabile per l'MVP.
- **`tournaments.city` senza indice**: la query della stanza è su `check_ins`
  (indice `(city_key, date)`), non sui tornei; il prefill città scorre i tornei
  in memoria (dataset per-utente piccolo). Nessun impatto.
- **Errore di check-in non mostrato in UI**: `checkIn` logga su console e ritorna
  `false` (form riaperto), ma lo screen non ha una riga d'errore dedicata per il
  check-in (ce l'ha per l'aggiunta socio). Il contratto UI è del ruolo 1.

## Follow-up (fuori scope, come da piano)

- **Realtime presence** (Supabase Realtime + `ConnectionSnackbar` "qualcuno è
  appena arrivato") — l'MVP è fetch-on-open + refresh manuale.
- **Cron di pulizia** dei check-in vecchi (la correttezza è già garantita dal
  filtro `date`; il cron è igiene).
- **Deep-link da `TorneoDetail`** per i tornei di oggi (prefill città + torneo):
  `check_ins.tournament_id` esiste già, il campo `CheckInInput.tournamentId` è
  supportato dal data layer; manca solo l'entry point nella UI del dettaglio.

## Come far girare la suite

```bash
npm test               # vitest run
npm run typecheck      # app (tsc -b)
npm run typecheck:test # test (tsconfig.test.json)
npm run build          # tsc -b && vite build
```
