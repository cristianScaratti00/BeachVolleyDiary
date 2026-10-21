# Mail di Supabase Auth

Il repo non ha `supabase/config.toml`: la configurazione di Auth (Site URL,
Redirect URLs, oggetti e modelli delle mail) vive solo nel progetto remoto
`whgotqljwmtsoulwbzyf`. Questi file sono la copia versionata di quello che c'è
lì, e il modo di rimetterlo.

## «Confirm signup» → `conferma.html`

- **Oggetto:** `Conferma il tuo Beach Volley Diary`
- **Modello:** `conferma.html` (tabelle, CSS in linea, larga al massimo 480).
  I colori sono quelli della «versione D»: carta `#F6F6F4`, card bianca
  raggio 20, inchiostro `#1C1C1E`, pulsante arancio `#FF6B1A` con
  l'etichetta d'inchiostro (5.98:1, mai bianco sull'arancio). Geist nei client
  non c'è: la pila ripiega su `-apple-system, 'Segoe UI', Roboto, Arial`.
- **Variabili:** `{{ .ConfirmationURL }}` (il pulsante e il link visibile) e
  `{{ .Data.name }}` (il nickname di `signUp`, `options.data.name`).
- **Solby:** `https://bv-diary.vercel.app/email/solby.png` (`public/email/`,
  192×208 = 96×104 @2x, fondo trasparente). È un PNG perché Gmail e Outlook
  non disegnano l'SVG in linea. `vercel.json` esclude `email/` dalla riscrittura
  verso `index.html`. Si rigenera dal componente `Pallo` (umore `saluta`,
  `ombra`) con `renderToStaticMarkup` + Chrome headless a scala 2.

## URL

- **Site URL:** `https://bv-diary.vercel.app`
- **Redirect URLs:** `https://bv-diary.vercel.app/**`, `http://localhost:5173`,
  `http://localhost:5173/**`

Il ritorno della mail (`emailRedirectTo`) lo decide `src/lib/sito.ts`: la
produzione in build (anche da un deploy di anteprima), localhost in sviluppo,
`VITE_SITE_URL` se c'è. Un `redirect_to` che non è fra le Redirect URLs (e non
ha l'host della Site URL) fa ripiegare Supabase sulla Site URL.

**Perché (2026-10-21):** le Redirect URLs avevano solo gli indirizzi del team
Vercel (`beach-volley-diary-cristian-team2.vercel.app` e
`beach-*-volley-diary-cristian-team2.vercel.app`), protetti dalla Deployment
Protection: chi si registrava da lì riceveva un link che apriva il login di
Vercel. E mancava localhost.

## Come si applica

Con la Management API e il token della CLI Supabase già loggata (nel
portachiavi di macOS, servizio `Supabase CLI`):

```sh
RAW=$(security find-generic-password -s "Supabase CLI" -w)
TOK=$(printf %s "${RAW#go-keyring-base64:}" | base64 -d)   # se ha il prefisso
python3 - <<'EOF' > /tmp/auth-patch.json
import json
print(json.dumps({
  "site_url": "https://bv-diary.vercel.app",
  "uri_allow_list": "https://bv-diary.vercel.app/**,http://localhost:5173,http://localhost:5173/**",
  "mailer_subjects_confirmation": "Conferma il tuo Beach Volley Diary",
  "mailer_templates_confirmation_content": open("supabase/templates/conferma.html").read(),
}))
EOF
curl -X PATCH https://api.supabase.com/v1/projects/whgotqljwmtsoulwbzyf/config/auth \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  --data @/tmp/auth-patch.json
```

Oppure a mano: Dashboard → Authentication → URL Configuration, e
Authentication → Emails → Confirm signup.

## Prima del 2026-10-21 (per tornare indietro)

- `site_url`: `https://bv-diary.vercel.app/`
- `uri_allow_list`: `https://beach-volley-diary-cristian-team2.vercel.app/,https://beach-volley-diary-cristian-team2.vercel.app/**,https://beach-*-volley-diary-cristian-team2.vercel.app,https://beach-*-volley-diary-cristian-team2.vercel.app/**`
- `mailer_subjects_confirmation`: `Confirm your email address`
- `mailer_templates_confirmation_content`: il modello di serie di Supabase
  («Confirm your email address» con il link `{{ .ConfirmationURL }}`).

## Limiti noti

- **Niente SMTP personalizzato** (`smtp_host` vuoto): il mittente di serie di
  Supabase manda le mail SOLO agli indirizzi dei membri dell'organizzazione, e
  al massimo 2 all'ora (`rate_limit_email_sent`). Gli utenti veri non ricevono
  la conferma finché non si configura un SMTP (follow-up a parte).
- «Reset password» e «Magic link» hanno ancora i modelli di serie (in inglese):
  l'app non li usa, ma vanno allineati quando arriveranno.
- Il link vale un'ora (`mailer_otp_exp` = 3600): la mail lo dice.
