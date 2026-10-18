// ============================================================================
// Bottom sheet (UX §7.5, MOTION.md §4.2), restyle di quello che c'era.
//
// Da conservare (lo fissa Sheet.test.tsx):
// - il trascinamento parte SOLO dalla maniglia (`dragListener={false}`): con
//   `drag` attivo sul foglio Motion gli scrive sopra `touch-action: pan-x`, e
//   il dito non poteva più scorrere il contenuto («Salva» restava sotto il
//   bordo dello schermo);
// - si chiude oltre 120px oppure oltre 550px/s;
// - l'area che scorre ha `overflow-y: auto` e `overscroll-behavior: contain`;
// - `max-height` in `dvh` (sul telefono `vh` conta anche la barra
//   dell'indirizzo);
// - la maniglia sta fuori dall'area che scorre ed è `aria-hidden`;
// - il tocco sullo sfondo chiude, quello dentro no.
//
// Da aggiungere (UX §7.5): `role="dialog"` con il titolo `<h2>`; focus a t0
// (primo campo da tastiera e mouse, il titolo da tocco: M3); trappola del
// focus e ritorno a chi ha aperto; Esc; resistenza e conferma con il modulo
// sporco; tastiera virtuale (`visualViewport`); piè delle azioni sempre in
// vista; da 600px form sheet centrato senza trascinamento.
//
// Il VELO non è dello sheet: è di ModalHost e resta fermo quando uno overlay
// ne sostituisce un altro (MOTION.md §3.4.3). Qui c'è solo lo strato
// trasparente che raccoglie il tocco fuori dal foglio. Il portal su
// `document.body` lo fa ModalHost: da solo (nei test) lo sheet resta dove lo
// si monta.
// ============================================================================
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import * as m from 'motion/react-m'
import { useDragControls, useIsPresent, useReducedMotion } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { CITTA_SUGGERITE } from '../../lib/geo'
import { ENTRATA, MOLLA, SVELTO } from '../Motion'
import { useSheetCentered } from '../../hooks/useMedia'
import { firstField, useEscape, useFocusTrap, useInitialFocus, useReturnFocus } from '../ui/overlay'
import './Sheet.css'

// Quanto in basso va portato il foglio perché il rilascio lo chiuda, e quanto
// veloce deve andare il dito perché la distanza non conti più. Insieme danno
// il comportamento dei bottom sheet di sistema: una buttata giù decisa basta,
// un trascinamento lento va portato a termine.
const CHIUDI_OLTRE_PX = 120
const CHIUDI_OLTRE_VELOCITA = 550
// Elasticità verso il basso: con il modulo sporco il foglio cede meno del
// dito, e anticipa il "no" prima del rilascio (MOTION.md §2.3).
const ELASTICO = 0.9
const ELASTICO_SPORCO = 0.35

interface SheetCtx {
  titleId: string
}
const Ctx = createContext<SheetCtx | null>(null)

export interface SheetProps {
  /** Chiede la chiusura: chi ospita lo sheet decide (guardia "sporco"). */
  onClose: () => void
  children: ReactNode
  /** Le azioni, sempre in vista in fondo allo sheet. */
  footer?: ReactNode
  /** Con `false` niente area che scorre (sheet corti). */
  scroll?: boolean
  /** Il modulo ha almeno un campo cambiato: più resistenza al trascinamento. */
  dirty?: boolean
  /** Salvataggio in corso: il gesto non chiude. */
  busy?: boolean
  /** Aperto da un dito: il focus va al titolo, non al primo campo (M3). */
  byTouch?: boolean
  /** Chi l'ha aperto: il focus ci torna all'inizio dell'uscita. */
  opener?: HTMLElement | null
  /** È l'overlay in cima: solo lui risponde a Esc. */
  top?: boolean
  /** Nome accessibile se lo sheet non ha un `SheetTitle`. */
  label?: string
  /** @deprecated la larghezza la decide il CSS (--sheet-max). */
  maxWidth?: number
}

function useTastiera(enabled: boolean) {
  // iOS non ridimensiona il layout quando sale la tastiera: si guarda il
  // `visualViewport` e lo sheet ci sta dentro, SENZA transizione (iOS anima
  // la tastiera da sé: qualunque transizione nostra le correrebbe dietro).
  const [kb, setKb] = useState<{ h: number; gap: number } | null>(null)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv || !enabled) return
    const on = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop
      setKb(gap > 80 ? { h: vv.height, gap } : null)
    }
    vv.addEventListener('resize', on)
    vv.addEventListener('scroll', on)
    on()
    return () => {
      vv.removeEventListener('resize', on)
      vv.removeEventListener('scroll', on)
    }
  }, [enabled])
  return kb
}

export function Sheet({
  onClose,
  children,
  footer,
  scroll = true,
  dirty = false,
  busy = false,
  byTouch = false,
  opener,
  top = true,
  label,
}: SheetProps) {
  const trascinamento = useDragControls()
  const centrato = useSheetCentered()
  const ridotto = useReducedMotion()
  const presente = useIsPresent()
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [velocitaUscita, setVelocitaUscita] = useState<number | null>(null)
  const kb = useTastiera(!centrato)

  useFocusTrap(ref, presente)
  useEscape(onClose, top && presente)
  useInitialFocus(ref, (root) => {
    const titolo = root.querySelector<HTMLElement>(`[id="${titleId}"]`)
    if (byTouch) return titolo
    return firstField(root) ?? titolo
  })
  useReturnFocus(presente, opener)

  const fineTrascinamento = (_e: unknown, info: PanInfo) => {
    const oltre = info.offset.y > CHIUDI_OLTRE_PX || info.velocity.y > CHIUDI_OLTRE_VELOCITA
    // Sotto soglia, o durante un salvataggio, Motion riporta da sé il foglio
    // a 0 con la molla, partendo dalla velocità del dito.
    if (!oltre || busy) return
    // Modulo sporco: il foglio torna su e nello stesso istante si chiede.
    if (dirty) {
      onClose()
      return
    }
    // Pulito: l'uscita continua il gesto con la velocità del dito (M7).
    setVelocitaUscita(info.velocity.y)
    onClose()
  }

  const motion = centrato
    ? {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1, transition: ENTRATA },
        exit: { opacity: 0, scale: 0.96, transition: SVELTO },
      }
    : ridotto
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: SVELTO },
          exit: { opacity: 0, transition: SVELTO },
        }
      : {
          initial: { y: '100%' },
          animate: { y: 0, transition: MOLLA },
          exit: {
            y: '100%',
            transition: velocitaUscita != null ? { ...MOLLA, velocity: velocitaUscita } : SVELTO,
          },
        }

  const stile: CSSProperties & Record<string, string> = {
    maxHeight: kb ? `${Math.round(kb.h * 0.92)}px` : '92dvh',
    '--material-elev': centrato ? 'var(--elev-dialog)' : 'var(--elev-overlay)',
  }

  return (
    <Ctx.Provider value={{ titleId }}>
      {/* Lo strato che raccoglie il tocco fuori dal foglio. */}
      <div className="ui-sheet-layer" onClick={onClose} style={kb ? { bottom: kb.gap } : undefined}>
        <m.div
          ref={ref}
          className="ui-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={label ? undefined : titleId}
          aria-label={label}
          aria-busy={busy || undefined}
          // Chi esce smette di sfocare a t0 (MOTION.md §3.4): il budget di 3
          // superfici vale anche nei 180ms in cui un overlay esce e un altro entra.
          data-material={presente ? 'glass-thick' : 'frost'}
          {...(presente ? {} : { inert: '' })}
          onClick={(e) => e.stopPropagation()}
          {...motion}
          drag={centrato ? false : 'y'}
          dragListener={false}
          dragControls={trascinamento}
          // Solo verso il basso: tirare in su un foglio appoggiato al fondo
          // non vuol dire niente; l'elasticità lascia un cenno di resistenza.
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.02, bottom: dirty || busy ? ELASTICO_SPORCO : ELASTICO }}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: MOLLA.stiffness, bounceDamping: MOLLA.damping }}
          onDragEnd={fineTrascinamento}
          style={stile}
        >
          {/* La maniglia è l'unica presa del gesto e sta FUORI dall'area che
              scorre. La barretta è il segno; il bersaglio è l'involucro alto
              44. `touch-action: none` solo qui. */}
          {!centrato && (
            <div
              className="ui-sheet-handle"
              aria-hidden="true"
              onPointerDown={(e: ReactPointerEvent) => trascinamento.start(e)}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <span />
            </div>
          )}
          {scroll ? (
            <div className="ui-sheet-area ui-scroll" style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {children}
            </div>
          ) : (
            <div className="ui-sheet-body">{children}</div>
          )}
          {footer && <div className="ui-sheet-footer">{footer}</div>}
        </m.div>
      </div>
    </Ctx.Provider>
  )
}

/** Il titolo dello sheet: `<h2>` che dà il nome al dialogo. */
export function SheetTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const ctx = useContext(Ctx)
  return (
    <div className="ui-sheet-head">
      <h2 id={ctx?.titleId} tabIndex={-1} className="ui-sheet-title">
        {children}
      </h2>
      {sub && <p className="ui-sheet-sub">{sub}</p>}
    </div>
  )
}

/**
 * Le azioni dello sheet (UX §7.5.8): veri `<button>`, in ordine
 * [distruttivo a sinistra] · spazio · [Annulla] · [primario].
 */
export function SheetActions({ children, destructive }: { children: ReactNode; destructive?: ReactNode }) {
  return (
    <div className="ui-sheet-actions">
      {destructive && <div className="ui-sheet-actions-danger">{destructive}</div>}
      <div className="ui-sheet-actions-main">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campo città con suggerimenti (C21): `<datalist>` e non un `<select>`: la
// città resta testo libero, ma chi scrive "Rimini" invece di "rimini " ottiene
// un pin sulla mappa. Usato dal check-in di "Chi c'è oggi".
// ---------------------------------------------------------------------------
const CITTA_LIST_ID = 'citta-suggerite'

export function CityInput({ id, value, onChange, describedBy }: {
  id?: string
  value: string
  onChange: (city: string) => void
  describedBy?: string
}) {
  return (
    <>
      <input
        id={id}
        className="ui-input"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder="es. Rimini"
        list={CITTA_LIST_ID}
        autoComplete="off"
        aria-describedby={describedBy}
      />
      <datalist id={CITTA_LIST_ID}>
        {CITTA_SUGGERITE.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  )
}
