// ============================================================================
// L'indirizzo dell'app a cui tornano i link delle mail (conferma della
// registrazione) e gli accessi social. NON è l'origine da cui ci si registra:
// un deploy di anteprima di Vercel (`*-team.vercel.app`) è protetto dalla
// Deployment Protection, e chi apriva la mail finiva sul login di Vercel.
//
//   - `VITE_SITE_URL`, se c'è (Vercel → Environment Variables), vince;
//   - in build (produzione e anteprime) la produzione;
//   - in sviluppo l'origine corrente (localhost).
//
// Supabase accetta il ritorno solo verso la Site URL e le Redirect URLs del
// progetto (Authentication → URL Configuration): vedi supabase/templates/README.md.
// ============================================================================

/** La produzione: la stessa di `presentazione/index.html`. */
export const SITO_PRODUZIONE = 'https://bv-diary.vercel.app'

function urlApp(): string {
  const env = import.meta.env.VITE_SITE_URL?.trim()
  if (env) return env.replace(/\/+$/, '')
  if (import.meta.env.PROD) return SITO_PRODUZIONE
  return window.location.origin
}

export const URL_APP = urlApp()
