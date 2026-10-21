// ============================================================================
// Client Supabase tipizzato (browser).
// Le variabili arrivano da .env.local (prefisso VITE_ → esposte al client).
// La chiave è pubblica: la sicurezza è garantita dalla Row Level Security.
// ============================================================================
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
// Prima del client: legge l'esito del link della mail di conferma prima che
// supabase-js ripulisca l'indirizzo (ritorno.ts).
import './ritorno'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Configurazione Supabase mancante: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in .env.local (vedi .env.example).',
  )
}

// supabase.from('tournaments').select() → righe tipizzate dal tipo Database.
export const supabase = createClient<Database>(url, anonKey)
