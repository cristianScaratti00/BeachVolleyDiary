import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import Root from './Root'
import { AuthProvider } from './hooks/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
    {/* Vercel Web Analytics + Speed Insights: attivi solo in produzione su Vercel. */}
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
