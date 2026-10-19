// ============================================================================
// Stati vuoti, errori e caricamenti (UX §6.0, §7.11; ART_DIRECTION §8;
// MOTION.md §6 e §8.4).
//
// - EmptyState: titolo, testo e AL MASSIMO un CTA principale più un link
//   secondario. Il primo avvio non ha illustrazioni: mostra lo «0» da
//   tabellone (mossa firmata 5), che NON sale da zero: è fermo perché è vero.
// - ErrorState: il caricamento fallito non è uno stato vuoto (C8).
// - Skeleton in tre tempi: a 0ms lo spazio è riservato e vuoto, a 150ms le
//   forme, da 600ms il respiro. Contenitore `aria-busy` con «Caricamento…».
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BUSY_MIN_MS } from '../Motion'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Button } from './Button'
import './Feedback.css'

export function EmptyState({ variant = 'filtrato', zero, icon, title, text, action, secondary, level = 2, className }: {
  /** `primo`: account senza dati, con lo «0». `filtrato`: vuoto per un filtro o un errore. */
  variant?: 'primo' | 'filtrato'
  /** L'etichetta sotto lo «0» («Tornei»). */
  zero?: string
  icon?: IconName
  title: ReactNode
  text?: ReactNode
  /** Il CTA principale: un solo pulsante. */
  action?: ReactNode
  /** Il link secondario («Preferisci farti guidare? Usa l'assistente»). */
  secondary?: ReactNode
  level?: 2 | 3
  className?: string
}) {
  const H = level === 3 ? 'h3' : 'h2'
  return (
    <div className={className ? `ui-empty ${className}` : 'ui-empty'} data-variant={variant}>
      {variant === 'primo' && zero && (
        <div className="ui-empty-zero" aria-hidden="true">
          <span className="ui-empty-zero-n">0</span>
          <span className="ui-empty-zero-l">{zero}</span>
        </div>
      )}
      {variant === 'filtrato' && icon && <Icon name={icon} size={24} className="ui-empty-icon" />}
      <H className="ui-empty-title">{title}</H>
      {text && <p className="ui-empty-text">{text}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
      {secondary && <div className="ui-empty-secondary">{secondary}</div>}
    </div>
  )
}

/**
 * Lo stato occupato di un «Riprova»: almeno BUSY_MIN_MS anche se la rete
 * risponde "no" in un fotogramma (MOTION.md §8.4). Restituisce anche un
 * contatore dei tentativi falliti, che fa rientrare il riquadro.
 */
export function useRetry(onRetry: () => unknown) {
  const [busy, setBusy] = useState(false)
  const [tentativi, setTentativi] = useState(0)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])
  const run = async () => {
    if (busy) return
    setBusy(true)
    const t0 = Date.now()
    try {
      await onRetry()
    } finally {
      const resto = BUSY_MIN_MS - (Date.now() - t0)
      if (resto > 0) await new Promise((r) => window.setTimeout(r, resto))
      if (vivo.current) {
        setBusy(false)
        setTentativi((n) => n + 1)
      }
    }
  }
  return { busy, run, tentativi }
}

/**
 * Primo caricamento fallito (UX §6.0, §4.10): a tutta pagina dentro la shell.
 * Con l'evento `online` riprova da solo, una volta.
 */
export function ErrorState({ title, text, onRetry, retryLabel = 'Riprova', autoRetryOnline = false, level = 1, className }: {
  title: ReactNode
  text?: ReactNode
  onRetry?: () => unknown
  retryLabel?: string
  autoRetryOnline?: boolean
  level?: 1 | 2 | 3
  className?: string
}) {
  const retry = useRetry(onRetry ?? (() => undefined))
  const giaRiprovato = useRef(false)
  useEffect(() => {
    if (!autoRetryOnline || !onRetry) return
    const on = () => {
      if (giaRiprovato.current) return
      giaRiprovato.current = true
      void retry.run()
    }
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  })
  const H = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
  return (
    // `data-n` alterna due keyframe identici: la comparsa riparte a ogni
    // tentativo fallito (si vede che il tentativo c'è stato) senza rimontare
    // il pulsante, che perderebbe il focus.
    <div className={className ? `ui-error ${className}` : 'ui-error'} data-n={retry.tentativi ? retry.tentativi % 2 : undefined}>
      <Icon name="alert" size={24} className="ui-error-icon" />
      <H className="ui-error-title" tabIndex={level === 1 ? -1 : undefined}>{title}</H>
      {text && <p className="ui-error-text">{text}</p>}
      {onRetry && (
        <Button variant="tinted" icon="refresh" busy={retry.busy} busyLabel="Riprovo…" onClick={() => void retry.run()}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

/** Un'area lazy che non si è caricata (deploy nuovo, rete): errore locale. */
export function AreaError({ onRetry, minHeight }: { onRetry: () => unknown; minHeight?: 'map' | 'venue' }) {
  return (
    <div className="ui-area-error" data-min={minHeight}>
      <ErrorState level={3} title="Questa parte non si è caricata." onRetry={onRetry} />
    </div>
  )
}

/**
 * Lo skeleton in tre tempi. I figli sono le forme (`Bone`) alte quanto il
 * contenuto che arriva: a 0ms lo spazio c'è ed è vuoto, a 150ms compaiono, da
 * 600ms respirano. Due elementi annidati, due animazioni: sullo stesso nodo la
 * seconda cancellerebbe la prima.
 */
export function Skeleton({ children, label = 'Caricamento…', className }: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <div className={className ? `ui-skeleton ${className}` : 'ui-skeleton'} aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="ui-skeleton-appear" aria-hidden="true">
        <div className="ui-skeleton-breathe">{children}</div>
      </div>
    </div>
  )
}

/** Una forma dello skeleton: misure e raggio dalla classe che la usa. */
export function Bone({ className }: { className?: string }) {
  return <span className={className ? `ui-bone ${className}` : 'ui-bone'} />
}
