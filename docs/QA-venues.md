# QA — Luoghi (venues): la città diventa un posto vero

Livello dati/integrazione (ruolo 2 della pipeline) sopra la schermata
presentazionale del commit `686bf2c`. `tournaments.city` — testo libero senza
normalizzazione — smette di essere l'unica idea di "dove ho giocato": nasce
`public.venues` (nome, città, coordinate, superficie tipica) e
`tournaments.venue_id` la referenzia.

| | |
|---|---|
| Ambito | `supabase/migrations/20260725120000_venues.sql` (tabella `venues`, FK `tournaments.venue_id`, RLS, backfill, trigger `sync_tournament_city`, RPC `tornei_list`/`torneo_detail`, `seed_demo`), `src/lib/database.types.ts`, `src/hooks/useDiary.ts` (`resolveVenue`, dual-write, `mergeVenues`), `src/lib/derive.venues.server.test.ts` |
| Ambiente | Node 22 · Vitest 3.2.7 · jsdom 26 · Testing Library React 16 |
| Suite | 211 test: 207 verdi + 4 `skip` preesistenti (difetti noti di Tornei). **+11 nuovi** in `derive.venues.server.test.ts` (i 36 di `derive.venues.test.ts` sono del ruolo 1) |
| Comandi | `npm test` · `npm run typecheck` · `npm run typecheck:test` · `npm run build` |
| DB | Migration **applicate** al progetto `whgotqljwmtsoulwbzyf` via MCP `apply_migration` (`venues`, `venues_seed_demo`) |

Tutti e quattro i comandi passano.

## La decisione che cambia la forma dello schema

Il piano (§1) descriveva `venues` **per-utente**; la risposta alle domande di
chiarimento dice **"catalogo globale condiviso"**, ed è quella che è stata
implementata (il ruolo 1 aveva già modellato così, con `Venue.shared`). Le
conseguenze non sono cosmetiche:

- **Unicità globale** `unique (city_key, name_key)` invece di
  `unique (user_id, city_key, name_key)`: esiste **una** riga "Bagno 26 ·
  Riccione" per tutti. È il presupposto di qualsiasi mappa cross-utente futura.
- **RLS asimmetrica**, unica nel progetto: `select` per tutti gli autenticati
  (`venues_select_all`), `insert/update/delete` solo per chi ha creato la riga
  (`*_own`). Le altre tabelle sono owner-only in lettura e scrittura.
- **Niente `venues_select_shared`**: la policy prevista dal piano (per far
  vedere il luogo a un socio collegato) è superflua, la lettura è già di tutti.
- `venues.user_id` è **nullable** con FK `on delete set null` (non `cascade`):
  cancellare un account non deve svuotare i tornei altrui del loro posto. Un
  luogo orfano risulta `shared: true` lato client, quindi in sola lettura.
- Il backfill deduplica **globalmente**, non per utente: le 4 grafie di
  "Segrate" sparse su 3 utenti sono diventate **un** luogo con 10 tornei.

## Cosa è stato verificato

### Sul DB (query di sola lettura sul progetto reale)

- **Backfill completo**: `select count(*) from tournaments where city <> '' and
  venue_id is null` → **0**. 16 tornei su 16 hanno un luogo, 5 luoghi creati.
- **Nessun doppione di sola grafia**: `Segrate`/`segrate` (3 utenti diversi)
  collassano su una riga sola. `cormano` e `cormank` restano **separati** — è
  un refuso, non una variante di maiuscole, e fonderli è una decisione umana
  (vedi "Unisci a…").
- **RPC**: `tornei_list()` e `torneo_detail()` chiamate come utente autenticato
  reale (`set local role authenticated` + claims JWT, in transazione con
  `rollback`) restituiscono `venue: {id,name,city,lat,lng}` **accanto** a
  `city`, che resta invariata.
- **Trigger `sync_tournament_city`**: rinominando un luogo (`cormank` →
  `Bagno 26 / Riccione`) lo snapshot `tournaments.city` dei tornei collegati
  diventa `Riccione`. Verificato e poi annullato con `rollback`.
- **RLS**: come utente B, `update venues ... where user_id <> auth.uid()` →
  **0 righe modificate**, mentre `select` ne vede **5**. Lettura globale,
  scrittura owner-only, come progettato.
- **Advisor**: `get_advisors` security e performance confrontati prima/dopo →
  **69 lint prima, 69 dopo, zero nuovi** (e zero spariti). Per ottenerlo le
  policy di `venues` usano `(select auth.uid())` invece di `auth.uid()` nudo:
  le policy più vecchie del progetto sono tutte segnalate da
  `auth_rls_initplan`, questa no. Stessa semantica, una valutazione invece di N.

### Automatico (`src/lib/derive.venues.server.test.ts`, 11 test)

Il contratto fra RPC e client, nelle **tre** forme di payload che i mapper
devono reggere insieme:

1. `venue` valorizzato → si mostra il nome del luogo;
2. `venue: null` (torneo senza luogo) → si ricade sullo snapshot `city`;
3. **chiave `venue` assente** → RPC non ancora aggiornata sul progetto.

La terza è quella che protegge davvero: `SvVenue` è opzionale proprio perché il
client può essere deployato prima della migration. Coperti anche: il nome del
luogo che vince sullo snapshot rimasto indietro, l'assenza di separatore doppio
quando non c'è né luogo né città, `venueMapUrl` null senza coordinate, e il
fatto che `venueHistory` ("2° torneo qui · 1 podio") sia calcolata dai dati
client e non dalla RPC (che aggrega un torneo alla volta e non vede gli altri).

## Decisioni e assunzioni (documentate)

- **Dual-write `city` + `venue_id`** — ogni scrittura di torneo salva entrambi
  (`citySnapshot` + `resolveVenue`). `city` resta `not null`: la migration è
  puramente additiva e un torneo inserito senza `venue_id` continua a
  funzionare. Lo snapshot è ciò che rende leggibile la storia mista.
- **Il duplicato in catalogo non è un errore** — con l'unicità globale, due
  utenti che digitano lo stesso posto devono finire sulla stessa riga.
  `resolveVenue` intercetta il `23505` (unique_violation) e **riusa** la riga
  esistente invece di mostrare un errore. Copre anche il doppio-submit e due
  schede aperte.
- **Esito esplicito invece di `string | null`** — `resolveVenue` ritorna
  `{ok:true,id}` / `{ok:false,error}`: con un solo `null` "nessun luogo" e
  "salvataggio fallito" sarebbero indistinguibili e l'errore verrebbe ingoiato.
- **Coordinate malformate → nessuna coordinata**, non un salvataggio rifiutato.
  Il vincolo DB le vuole in coppia (`(lat is null) = (lng is null)`) e il picker
  segnala già l'errore mentre si digita: bloccare l'intero torneo per una
  virgola sarebbe peggio. Stessa logica per "＋ Nuovo luogo" lasciato senza
  nome: il torneo si salva senza luogo, con la sua città.
- **`venues.surface` ereditata dal torneo che inaugura il posto** — la colonna
  serve a suggerire un default ai tornei successivi; nessun campo nuovo nella
  UI, il dato arriva da quello che l'utente ha già scelto.
- **Trigger `security invoker`, non `definer`** — rinominare un luogo del
  catalogo condiviso propaga lo snapshot **solo** sui tornei che il chiamante
  può già scrivere. Un `definer` avrebbe propagato ovunque, ma avrebbe anche
  permesso a un utente di riscrivere righe altrui rinominando una voce comune.
  Per gli altri utenti lo snapshot resta indietro: l'app legge comunque il nome
  vivo dal join, quindi la differenza si vede solo fuori dall'app.
- **`merge` = due scritture, nessuna SQL nuova** (come da piano §6): prima
  `update tournaments set venue_id = toId where venue_id = fromId`, poi
  `delete from venues where id = fromId`. L'ordine è obbligato: all'inverso la
  FK `on delete set null` azzererebbe i `venue_id` un istante prima di poterli
  spostare.
- **`venues_city_key_idx` non creato**: con l'unicità globale
  `(city_key, name_key)`, `city_key` ne è il prefisso e l'indice esiste già.
  Un indice in più sarebbe stato solo costo di scrittura.

## ⚠️ Limitazione nota: il merge di un luogo condiviso

`mergeVenues` sposta **solo i tornei del chiamante** (la RLS non gli mostra gli
altri), poi elimina il doppione. Se un altro utente aveva tornei su quel luogo,
la FK `on delete set null` li lascia **senza `venue_id`**: restano leggibili con
il loro `city` (nessun dato perso) ma perdono il collegamento strutturato e
vanno ri-agganciati a mano.

È un effetto del catalogo globale, non del merge: **anche la semplice
eliminazione** di un luogo da parte del suo autore fa lo stesso. La UI limita
il comando ai luoghi propri (`!venue.shared`), quindi non è raggiungibile su
righe altrui.

**Rimedio consigliato (follow-up, fuori da questo task)**: una RPC
`merge_venues(p_from, p_to)` `security definer` che ripunti i tornei di *tutti*
e poi elimini il duplicato, autorizzata al solo proprietario di `p_from`. È
strettamente migliore di quello che il proprietario può già fare oggi (spostare
invece di orfanare), al costo di una funzione `definer` in più.

## Non fatto, di proposito

- **`saveVenue` / `deleteVenue` in `useDiary`** (piano §3): nessun chiamante.
  La creazione passa da `resolveVenue` dentro il salvataggio del torneo,
  l'eliminazione dal merge. Sono l'API di una schermata "Luoghi" che il piano
  stesso mette fuori scope: aggiungerle ora sarebbe superficie morta e non
  testata. Da introdurre insieme a quella schermata.
- **Porting dei file condivisi su `~/Desktop/BVDiaryApp`** (app Expo): fuori
  scope per risposta esplicita ("ignore mobile compatibility"). Non serve
  comunque per non romperla: lo schema è additivo e la app mobile continua a
  leggere `city`.

## Da verificare a mano (fuori dalla portata di jsdom)

Le migration sono **già applicate**; la suite non tocca Supabase, quindi questi
passaggi restano da fare a schermo con `npm run dev`:

1. **Nuovo torneo → "＋ Nuovo luogo"** → nome + `📍 Usa la mia posizione` → il
   dettaglio mostra il nome, la mappa in-app e "1° torneo qui".
2. **Secondo torneo sullo stesso luogo** → "2° torneo qui"; Beach Wrapped conta
   **1** città, non 2.
3. **Rinomina del luogo** → la storia si aggiorna (trigger) e le card mostrano
   subito il nome nuovo.
4. **Eliminazione del luogo** → i tornei sopravvivono con il vecchio testo città.
5. **Torneo creato da mobile** (senza `venue_id`) → si continua a leggere con
   la sua `city`.
6. **"Unisci a…"** su `cormank` → `cormano`: i tornei passano, il doppione
   sparisce, la storia del luogo superstite li conta tutti.
7. **Mappa**: le tile arrivano da `tile.openstreetmap.org` — è **l'unica**
   chiamata di rete verso terzi della feature (la ricerca del luogo resta
   offline: GPS o coordinate incollate, nessun geocoding).

## Follow-up

- RPC `merge_venues` `security definer` (vedi limitazione qui sopra).
- Schermata "Luoghi" con statistiche per spiaggia (RPC `venues_list()` sul
  modello di `compagni_list`) + `saveVenue`/`deleteVenue`.
- Geocoding (Nominatim/Photon) per digitare "Riccione" e ottenere le coordinate:
  oggi escluso di proposito, manderebbe i nomi dei luoghi a un servizio terzo.
- `deriveWrapped` conta ora i luoghi con `venueKeyOf`, ma il resto delle
  statistiche per-luogo (miglior spiaggia, win rate per campo) è tutto da fare.

## Come far girare la suite

```bash
npm test               # vitest run
npm run typecheck      # app (tsc -b)
npm run typecheck:test # test (tsconfig.test.json)
npm run build          # tsc -b && vite build
```
