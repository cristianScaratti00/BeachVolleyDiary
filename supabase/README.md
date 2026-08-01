# Supabase — Beach Volley Diary

Schema Postgres multi-utente con Row Level Security. Ogni utente vede e modifica
solo i propri dati (`user_id = auth.uid()`) — **tranne `venues`**, che è un
catalogo condiviso (vedi sotto).

## Struttura

```
auth.users ──┐ (1:N su tutte le tabelle, ON DELETE CASCADE)
             │
   partners ─┤        tournaments ─┐
      │      │            │        │
      │      └────────────┤        │
      ▼                   ▼        ▼
   matches ── tournament_id ──► tournaments ── venue_id ──► venues
      │  └─ partner_id ──► partners        photos ── tournament_id ──► tournaments
      ▼
  match_sets (set_number, us, them)   UNIQUE(match_id, set_number)

  venues (catalogo condiviso, NON per-utente)   UNIQUE(city_key, name_key)
```

| Tabella | Descrizione | FK / regole |
|---|---|---|
| `partners` | Compagni/soci (anche generici senza partite) | — |
| `tournaments` | Tornei | `venue_id` → venues **SET NULL** |
| `matches` | Partite in un torneo con un compagno | `tournament_id` → tournaments **CASCADE** · `partner_id` → partners **RESTRICT** |
| `match_sets` | Punteggi per set (`us` / `them`) | `match_id` → matches **CASCADE** |
| `photos` | Galleria (segnaposti colorati) | `tournament_id` → tournaments **CASCADE** |
| `venues` | Luoghi di gioco (nome, città, coordinate, superficie tipica) | `user_id` → auth.users **SET NULL** (il luogo sopravvive al suo autore) |
| `check_ins` | Presenza opt-in di giornata ("Chi c'è oggi") | `tournament_id` → tournaments **SET NULL** |
| `bug_reports` | Segnalazioni di problemi (app in alpha) | `user_id` → auth.users **CASCADE** |

### `bug_reports` — l'altra asimmetria: owner in scrittura, admin in lettura

Chi segnala scrive e rilegge solo le proprie righe; l'elenco completo (con nome
ed email di chi ha segnalato) passa dalla RPC **`bug_reports_list()`**, gated su
`is_admin()` — a un non admin restituisce zero righe. Gli admin fanno avanzare
`status` (`nuovo → in_corso → risolto → chiuso`) via la policy
`bug_reports_update_admin`. Nessuna policy di DELETE: una segnalazione si chiude,
non si cancella. `area` è uno slug (le etichette italiane stanno in
`src/lib/segnalazioni.ts`).

### `venues` — l'eccezione alla regola owner-only

È l'unica tabella con RLS **asimmetrica**: la legge chiunque sia autenticato
(`venues_select_all`), la scrive solo chi ha creato la riga (`venues_*_own`).
Il motivo è di prodotto: "Bagno 26 · Riccione" è lo stesso posto per tutti,
quindi la riga è **unica globalmente** su `(city_key, name_key)` — le chiavi
sono colonne generate `lower(btrim(...))`, come `check_ins.city_key`.

`tournaments.city` **resta popolato** accanto a `venue_id` (dual-write): è lo
snapshot testuale che rende leggibili i tornei senza luogo (creati da un altro
client, o antecedenti alla migration). Il trigger `sync_tournament_city`
propaga la rinomina di un luogo su quello snapshot.

**View** `match_scores` → per ogni partita: `sets_us`, `sets_them`, `points_us`,
`points_them`, `point_diff`, `won`. Usa `security_invoker` (rispetta la RLS del chiamante).

### Vincoli principali
- `color` valida un hex `#RRGGBB`.
- `category` ∈ {Amatoriale, Open, Serie, Pro}; `format` ∈ {2vs2, 3vs3, 4vs4};
  `surface` ∈ {Sabbia outdoor, Indoor, Erba}; `phase` ∈ {Girone, Ottavi, Quarti, Semifinale, Finale};
  `placement` ∈ {1° 🏆, 2°, 3°, Semifinale, Quarti, Ottavi, Gironi, In corso}.
- Eliminare un torneo elimina a cascata partite, set e foto collegate.
- Un socio con partite **non** è eliminabile (RESTRICT); uno senza partite sì.
- `user_id` ha `default auth.uid()`: dal client non serve passarlo esplicitamente.
- `venues`: `lat`/`lng` o entrambe o nessuna (`(lat is null) = (lng is null)`),
  entro ±90 / ±180; `surface` ha lo stesso CHECK dei tornei ma è **nullable**
  (è un default suggerito, non un vincolo sul torneo).
- Eliminare un luogo **non** tocca i tornei (SET NULL): restano leggibili con
  la loro `city`.

## Come applicare

> ⚠️ **Su questo progetto `supabase db push` non è utilizzabile**: la cronologia
> migration remota è disallineata rispetto a `supabase/migrations/` (alcune
> migration sono state applicate direttamente al progetto remoto e mai
> committate). Le migration si applicano via **SQL Editor** o **MCP
> `apply_migration`** — è la prassi già seguita dalle ultime.

### 1) Supabase CLI (solo per uno stack locale nuovo)
```bash
supabase link --project-ref <PROJECT_REF>
```
Sviluppo locale:
```bash
supabase start
supabase db reset         # ricrea da zero applicando le migration
```

### 2) Dashboard → SQL Editor
Incolla ed esegui, in ordine:
1. `migrations/20260703120000_init.sql`
2. `migrations/20260703120100_seed_demo.sql` (opzionale — crea solo la funzione)

### 3) Claude + Supabase MCP
Posso applicarla io con `apply_migration` sul progetto che indichi
(serve conferma: è un'operazione sul tuo DB remoto).

## Dati demo (opzionale)
Dopo esserti autenticato nell'app:
```sql
select public.seed_demo();   -- popola tornei/soci/partite/foto per l'utente loggato
```

## Tipi TypeScript
Già generati dallo schema (`--strict` ✅):
- **`src/lib/database.types.ts`** — tipo `Database` in formato Supabase (Tables/Views/Functions),
  più helper `Tables<'…'>`, `TablesInsert<'…'>`, `TablesUpdate<'…'>` e alias di dominio
  (`Partner`, `Tournament`, `Match`, `MatchSet`, `Photo`, `Venue`, `MatchScore`).
  È mantenuto **a mano**: le colonne generate (`venues.name_key`/`city_key`,
  `check_ins.city_key`) compaiono in `Row` ma non in `Insert`/`Update`.
- **`src/lib/db.enums.ts`** — union + costanti runtime dei campi vincolati
  (`CATEGORIES`, `FORMATS`, `SURFACES`, `PHASES`, `PLACEMENTS`) usabili nei form.

Uso con il client tipizzato:
```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './lib/database.types'

export const supabase = createClient<Database>(URL, ANON_KEY)
// supabase.from('tournaments').select() → righe tipizzate come Tournament
```

Dopo aver applicato lo schema puoi rigenerarli (identici) con:
```bash
supabase gen types typescript --linked > src/lib/database.types.ts
```

## Prossimi passi
- **Client**: sostituire `useDiary` (localStorage) con chiamate `supabase-js`,
  mantenendo le stesse funzioni `save*/delete*`. Le tabelle rispecchiano 1:1 il modello del frontend
  (i set diventano righe in `match_sets`).
