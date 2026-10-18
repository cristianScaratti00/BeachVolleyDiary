// ============================================================================
// Lo splash (UX F0): UNO solo dall'autenticazione ai dati. Root lo mostra
// mentre si ripristina la sessione, App mentre arriva il diario: stessa
// grafica e stesso testo, così non si vedono due caricamenti uno dopo l'altro.
//
// Dopo 10s compare «Ci sta mettendo più del solito.» con [Riprova] (ricarica
// la pagina): `useAuth` non ha un `.catch`, e senza questo lo splash potrebbe
// restare per sempre. Il tempo si conta dall'apertura della PAGINA
// (`performance.now()`), non dal montaggio: il passaggio da Root ad App
// rimonta lo splash e non deve far ripartire l'attesa.
// ============================================================================
import { useEffect, useState } from 'react'
import { BrandMark } from './Logo'
import { Button } from './ui/Button'
import './Splash.css'

/** Oltre questa attesa lo splash lo dice e offre di riprovare (UX F0). */
export const SPLASH_LENTO_MS = 10_000

function trascorso(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0
}

export default function Splash({ label = 'Caricamento…' }: { label?: string }) {
  const [lento, setLento] = useState(() => trascorso() >= SPLASH_LENTO_MS)

  useEffect(() => {
    if (lento) return
    const t = window.setTimeout(() => setLento(true), Math.max(0, SPLASH_LENTO_MS - trascorso()))
    return () => window.clearTimeout(t)
  }, [lento])

  return (
    <div className="splash">
      <BrandMark size={72} />
      {/* Una sola regione live: annuncia il caricamento e, se arriva, l'attesa lunga. */}
      <div className="splash-status" role="status">
        <p className="splash-label">{label}</p>
        {lento && <p className="splash-lento-text">Ci sta mettendo più del solito.</p>}
      </div>
      {lento && (
        <div className="splash-lento">
          <Button variant="tinted" icon="refresh" onClick={() => window.location.reload()}>
            Riprova
          </Button>
        </div>
      )}
    </div>
  )
}
