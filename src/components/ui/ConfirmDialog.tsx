// ============================================================================
// ConfirmDialog (UX §7.7, MOTION.md §4.2): ogni azione distruttiva passa da
// qui. `role="alertdialog"`, titolo come domanda, testo con la conseguenza.
//
// - Focus iniziale su «Annulla» (l'azione NON distruttiva), a t0. Esc = Annulla.
// - Il pulsante distruttivo dice cosa fa («Elimina torneo», mai «OK»).
// - Una card bianca opaca (`--surface`) raggio 28, nel linguaggio del
//   redesign: la conferma è la capsula arancio (o rossa se distrugge),
//   «Annulla» è la capsula di vetro. Opaca anche perché sopra uno sheet una
//   superficie sfocata in più non aggiunge niente (UX §10).
// - Su mobile galleggia in basso, vicino al pollice (origine 50% 100%); da
//   600px è un dialogo centrato largo 320.
// - Il suo velo è suo, sopra lo sheet: due veli dicono profondità (§3.7).
// ============================================================================
import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { useIsPresent, useReducedMotion } from 'motion/react'
import { ENTRATA, SVELTO } from '../Motion'
import { useSheetCentered } from '../../hooks/useMedia'
import { Button } from './Button'
import { useEscape, useFocusTrap, useInitialFocus, useReturnFocus } from './overlay'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
  title: string
  text?: ReactNode
  confirmLabel: string
  busyLabel?: string
  cancelLabel?: string
  tone?: 'destructive' | 'default'
  onConfirm: () => unknown
  onCancel: () => void
  opener?: HTMLElement | null
  top?: boolean
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Annulla',
  tone = 'destructive',
  onConfirm,
  onCancel,
  opener,
  top = true,
}: ConfirmDialogProps) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const presente = useIsPresent()
  const centrato = useSheetCentered()
  const ridotto = useReducedMotion()
  const [busy, setBusy] = useState(false)

  useFocusTrap(ref, presente)
  useEscape(() => {
    if (!busy) onCancel()
  }, top && presente)
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[data-cancel]'))
  useReturnFocus(presente, opener, ref)

  const conferma = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  const y = centrato || ridotto ? 0 : 12
  return (
    <div className="ui-dialog-layer" onClick={() => !busy && onCancel()}>
      <m.div
        className="ui-dialog-scrim"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: ENTRATA }}
        exit={{ opacity: 0, transition: SVELTO }}
      />
      <m.div
        ref={ref}
        className="ui-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={text ? `${id}-d` : undefined}
        onClick={(e) => e.stopPropagation()}
        {...(presente ? {} : { inert: '' })}
        initial={{ opacity: 0, y, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: ENTRATA }}
        exit={{ opacity: 0, y, scale: 0.96, transition: SVELTO }}
      >
        <h2 id={`${id}-t`} className="ui-dialog-title">{title}</h2>
        {text && <p id={`${id}-d`} className="ui-dialog-text">{text}</p>}
        <div className="ui-dialog-actions">
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'filled'}
            block
            busy={busy}
            busyLabel={busyLabel}
            onClick={() => void conferma()}
          >
            {confirmLabel}
          </Button>
          <Button variant="glass" block data-cancel="" onClick={() => !busy && onCancel()}>
            {cancelLabel}
          </Button>
        </div>
      </m.div>
    </div>
  )
}
