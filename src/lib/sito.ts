// ============================================================================
// L'indirizzo dell'app a cui tornano i link delle mail (conferma della
// registrazione) e gli accessi social. NON è l'origine da cui ci si registra:
// un deploy di anteprima di Vercel (`*-team.vercel.app`) è protetto dalla
// Deployment Protection, e chi apriva la mail finiva sul login di Vercel.
//
//   - `VITE_SITE_URL`, se c'è (Vercel → Environment Variables, o
//     `.env.local` per provare il giro in locale), vince;
//   - altrimenti SEMPRE la produzione, anche in sviluppo: chi si registrava
//     dal server locale riceveva una mail che apriva localhost, e la mail
//     deve aprire l'app (2026-10-21).
//
// Supabase accetta il ritorno solo verso la Site URL e le Redirect URLs del
// progetto (Authentication → URL Configuration): vedi supabase/templates/README.md.
// ============================================================================

/** La produzione: la stessa di `presentazione/index.html`. */
export const SITO_PRODUZIONE = 'https://bv-diary.vercel.app'

function urlApp(): string {
  const env = import.meta.env.VITE_SITE_URL?.trim()
  return env ? env.replace(/\/+$/, '') : SITO_PRODUZIONE
}

export const URL_APP = urlApp()
