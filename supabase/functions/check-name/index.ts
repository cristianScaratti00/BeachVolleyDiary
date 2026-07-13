// ============================================================================
// Edge Function: check-name
// Verifica se un nome utente è già in uso (confronto case-insensitive su
// public.profiles.full_name). Usata in fase di registrazione per evitare nomi
// duplicati. Usa la service_role per leggere tutti i profili bypassando la RLS.
// Richiesta:  POST { "name": "Marco" }
// Risposta:   { "available": true }  oppure  { "available": false, "error": "..." }
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ available: false, error: 'Metodo non consentito.' }, 405)

  let name = ''
  try {
    const body = await req.json()
    name = String(body?.name ?? '').trim()
  } catch {
    return json({ available: false, error: 'Richiesta non valida.' }, 400)
  }
  if (!name) return json({ available: false, error: 'Inserisci un nome.' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Match case-insensitive esatto: escape dei wildcard LIKE (% e _) nel nome.
  const pattern = name.replace(/[%_\\]/g, (c) => '\\' + c)
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .ilike('full_name', pattern)
    .limit(1)

  if (error) return json({ available: false, error: 'Errore nella verifica del nome.' }, 500)

  const taken = (data?.length ?? 0) > 0
  return json(
    taken
      ? { available: false, error: 'Questo nome è già in uso, scegline un altro.' }
      : { available: true },
  )
})
