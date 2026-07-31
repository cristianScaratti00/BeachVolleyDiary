import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Clarity from '@microsoft/clarity'
import './index.css'
import Root from './Root'
import { AuthProvider } from './hooks/useAuth'
import { MotionRoot } from './components/Motion'

// ---------------------------------------------------------------------------
// Microsoft Clarity (heatmap e session replay).
//
// Dal pacchetto npm e non più dallo snippet inline in index.html: il bootstrap
// così viaggia dentro il bundle, quindi alla CSP basta `'self'` e non serve
// tenere allineato l'hash dello script inline — che se qualcuno avesse
// ritoccato lo snippet si sarebbe rotto in silenzio.
//
// L'id di progetto è pubblico per costruzione (finisce comunque nel bundle che
// scarica il browser): tenerlo qui, e non in una variabile d'ambiente, evita il
// caso peggiore, cioè un deploy senza la variabile che spegne la raccolta senza
// dire niente a nessuno.
const CLARITY_PROJECT_ID = 'xup74f9x8b'

// Solo in produzione, come Vercel Analytics: in sviluppo le registrazioni
// sarebbero quasi tutte nostre, e sporcherebbero le sessioni vere.
if (import.meta.env.PROD) Clarity.init(CLARITY_PROJECT_ID)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionRoot>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </MotionRoot>
    {/* Vercel Web Analytics + Speed Insights: attivi solo in produzione su Vercel. */}
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
