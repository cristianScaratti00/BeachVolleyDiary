# Supabase — Beach Volley Diary

Schema Postgres multi-utente con Row Level Security. Ogni utente vede e modifica
solo i propri dati (`user_id = auth.uid()`).

## Struttura

```
auth.users ──┐ (1:N su tutte le tabelle, ON DELETE CASCADE)
             │
   partners ─┤        tournaments ─┐
      │      │            │        │
      │      └────────────┤        │
      ▼                   ▼        ▼
   matches ── tournament_id ──► tournaments
      │  └─ partner_id ──► partners        photos ── tournament_id ──► tournaments
      ▼
  match_sets (set_number, us, them)   UNIQUE(match_id, set_number)
```

| Tabella | Descrizione | FK / regole |
|---|---|---|
| `partners` | Compagni/soci (anche generici senza partite) | — |
| `tournaments` | Tornei | — |
| `matches` | Partite in un torneo con un compagno | `tournament_id` → tournaments **CASCADE** · `partner_id` → partners **RESTRICT** |
| `match_sets` | Punteggi per set (`us` / `them`) | `match_id` → matches **CASCADE** |
| `photos` | Galleria (segnaposti colorati) | `tournament_id` → tournaments **CASCADE** |

**View** `match_scores` → per ogni partita: `sets_us`, `sets_them`, `points_us`,
`points_them`, `point_diff`, `won`. Usa `security_invoker` (rispetta la RLS del chiamante).

### Vincoli principali
- `color` valida un hex `#RRGGBB`.
- `category` ∈ {Amatoriale, Open, Serie, Pro}; `format` ∈ {2vs2, 3vs3, 4vs4};
  `surface` ∈ {Sabbia outdoor, Indoor, Erba}; `phase` ∈ {Girone, Ottavi, Quarti, Semifinale, Finale};
  `placement` ∈ {1° 🏆, 2°, 3°, Quarti, Ottavi, Gironi, In corso}.
- Eliminare un torneo elimina a cascata partite, set e foto collegate.
- Un socio con partite **non** è eliminabile (RESTRICT); uno senza partite sì.
- `user_id` ha `default auth.uid()`: dal client non serve passarlo esplicitamente.

## Come applicare

Scegli **uno** dei tre modi.

### 1) Supabase CLI (consigliato)
```bash
supabase link --project-ref <PROJECT_REF>
supabase db push          # applica le migration in supabase/migrations/
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
  (`Partner`, `Tournament`, `Match`, `MatchSet`, `Photo`, `MatchScore`).
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
