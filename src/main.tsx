import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
// Prima i token: il primo foglio dichiara l'ordine dei livelli CSS. Poi i
// materiali (`[data-material]`) e la base degli elementi nudi. index.css è il
// linguaggio di prima, fuori dai livelli: resta finché la Fase 6 non lo toglie.
import './styles/tokens.css'
import './styles/materials.css'
import './styles/base.css'
import './index.css'
import Root from './Root'
import { AuthProvider } from './hooks/useAuth'
import { MotionRoot } from './components/Motion'
import ConsensoCookie from './components/ConsensoCookie'
import { avviaTracciamentoSeConsentito, useScelta } from './lib/consenso'
import { analyticsPath } from './app/routes'

// Riaccende il tracciamento solo se l'utente aveva già detto sì in una visita
// precedente. Clarity si inietta da dentro `lib/consenso.ts`, che è l'unico
// punto autorizzato ad accenderlo.
avviaTracciamentoSeConsentito()

// Vercel Analytics e Speed Insights non sono esenti "perché non usano cookie":
// mandano comunque dati di navigazione a un terzo. Stanno quindi dietro la
// stessa scelta di Clarity — un solo interruttore, così non c'è da spiegare
// all'utente una tassonomia che non gli interessa.
function Tracciamento() {
  const scelta = useScelta()
  if (scelta !== 'accettato') return null
  return (
    <>
      {/* Con gli URL veri ogni torneo sarebbe una "pagina" a sé: gli UUID
          diventano [id] (UX §4.8, Q11). */}
      <Analytics beforeSend={(e) => ({ ...e, url: analyticsPath(e.url) })} />
      <SpeedInsights />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionRoot>
      <AuthProvider>
        <Root />
      </AuthProvider>
      <ConsensoCookie />
    </MotionRoot>
    <Tracciamento />
  </StrictMode>,
)
