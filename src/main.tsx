import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import Root from './Root'
import { AuthProvider } from './hooks/useAuth'
import { MotionRoot } from './components/Motion'
import ConsensoCookie from './components/ConsensoCookie'
import { avviaTracciamentoSeConsentito, useScelta } from './lib/consenso'

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
      <Analytics />
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
