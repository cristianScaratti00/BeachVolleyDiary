import { useEffect, useRef, useState } from 'react'
import { useSlowConnection } from '../hooks/useConnection'
import { useIsWide } from '../hooks/useMedia'

// Snackbar momentaneo: compare per qualche secondo a ogni "episodio" di
// connessione lenta, poi svanisce da solo. Se la rete torna buona e poi rallenta
// di nuovo, riappare.
const SHOW_MS = 5000

export default function ConnectionSnackbar() {
  const slow = useSlowConnection()
  const wide = useIsWide()
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!slow) { setVisible(false); return }
    setVisible(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), SHOW_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [slow])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: wide ? 24 : 96, // sopra la BottomNav su mobile
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity .28s ease, transform .28s ease',
        zIndex: 2000,
        maxWidth: 'calc(100vw - 32px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#1B2A4A',
        color: '#fff',
        borderRadius: 12,
        padding: '11px 15px',
        boxShadow: '0 12px 30px -8px rgba(27,42,74,.55)',
        font: "700 13px 'Nunito Sans'",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35', flex: '0 0 auto' }} />
      <span>Connessione internet lenta — potrebbero esserci dei rallentamenti.</span>
    </div>
  )
}
