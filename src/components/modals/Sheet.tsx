// ============================================================================
// Bottom sheet (UX §7.5, MOTION.md §4.2), sul linguaggio del redesign: fondo
// --bg pieno col filo, raggio 34 in alto, maniglia 38×5 --line-strong; da
// 600px form sheet centrato.
//
// Da conservare (lo fissa Sheet.test.tsx):
// - il trascinamento parte SOLO dalla maniglia (`dragListener={false}`): con
//   `drag` attivo sul foglio Motion gli scrive sopra `touch-action: pan-x`, e
//   il dito non poteva più scorrere il contenuto («Salva» restava sotto il
//   bordo dello schermo). La barra in cima dei moduli è una presa in più, ma
//   la avvia a mano (`dragControls.start`), come la maniglia;
// - si chiude oltre 120px oppure oltre 550px/s;
// - l'area che scorre ha `overflow-y: auto` e `overscroll-behavior: contain`;
// - `max-height` in `dvh` (sul telefono `vh` conta anche la barra
//   dell'indirizzo);
// - la maniglia sta fuori dall'area che scorre ed è `aria-hidden`;
// - il tocco sullo sfondo chiude, quello dentro no.
//
// Il resto (UX §7.5): `role="dialog"` con il titolo `<h2>`; focus a t0
// (primo campo da tastiera e mouse, il titolo da tocco: M3); trappola del
// focus e ritorno a chi ha aperto; Esc; resistenza e conferma con il modulo
// sporco; tastiera virtuale (`visualViewport`); azioni sempre in vista.
//
// Due teste, come nel design: i MODULI hanno la barra «Annulla · titolo ·
// Salva» (`SheetBar`, fuori dall'area che scorre: le azioni restano in vista
// anche con la tastiera su); gli sheet di CONTENUTO hanno il titolo grande
// (`SheetTitle`) e, se serve, il piè (`footer`).
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
import { LIMITI } from '../../lib/lunghezze'
import { ENTRATA, MOLLA, SVELTO } from '../Motion'
import { useSheetCentered } from '../../hooks/useMedia'
import { Button } from '../ui/Button'
import { firstField, useEscape, useFocusTrap, useInitialFocus, useReturnFocus } from '../ui/overlay'
import './Sheet.css'

// Quanto in basso va portato il foglio perché il rilascio lo chiuda, e quanto
// veloce deve andare il dito perché la distanza non conti più. Insieme danno
// il comportamento dei bottom sheet di sistema: una buttata giù decisa basta,
// un trascinamento lento va portato a termine.
export const CHIUDI_OLTRE_PX = 120
export const CHIUDI_OLTRE_VELOCITA = 550
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
  /** La barra in cima dei moduli (`SheetBar`): fuori dall'area che scorre. */
  header?: ReactNode
  /** Le azioni in fondo, sempre in vista (sheet di contenuto). */
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
  /** Nome accessibile se lo sheet non ha un titolo. */
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

/** Un tocco che parte da un controllo è un tocco, non l'inizio di un gesto. */
const suUnControllo = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest('button, a, input, select, textarea, label, [role="button"]')

export function Sheet({
  onClose,
  children,
  header,
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
  useReturnFocus(presente, opener, ref)

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

  const stile: CSSProperties = {
    maxHeight: kb ? `${Math.round(kb.h * 0.92)}px` : '92dvh',
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
          data-centered={centrato ? '' : undefined}
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
          {/* La maniglia è la presa del gesto e sta FUORI dall'area che
              scorre. La barretta è il segno; la presa si allarga sopra il
              bordo del foglio (CSS). `touch-action: none` solo qui. */}
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
          {header && (
            <div
              className="ui-sheet-header"
              // La barra è una presa in più: dove non c'è un pulsante, il dito
              // che scende porta giù il foglio.
              onPointerDown={(e: ReactPointerEvent) => {
                if (!centrato && !suUnControllo(e.target)) trascinamento.start(e)
              }}
              style={centrato ? undefined : { touchAction: 'none' }}
            >
              {header}
            </div>
          )}
          {scroll ? (
            <div className="ui-sheet-area ui-scroll" data-header={header ? '' : undefined} style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>
              {children}
            </div>
          ) : (
            <div className="ui-sheet-body" data-header={header ? '' : undefined}>{children}</div>
          )}
          {footer && <div className="ui-sheet-footer">{footer}</div>}
        </m.div>
      </div>
    </Ctx.Provider>
  )
}

/** Il titolo grande degli sheet di contenuto: `<h2>` 26/800 che dà il nome al dialogo. */
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
 * La barra dei moduli (design 15/16): «Annulla» di vetro · il titolo 16/700
 * al centro · il primario arancio. Il titolo è l'`<h2>` del dialogo; le due
 * colonne ai lati sono larghe uguali, così il titolo sta davvero in mezzo, e
 * se non ci sta si accorcia lui («…»), non i pulsanti.
 */
export function SheetBar({ title, sub, onCancel, cancelLabel = 'Annulla', cancelBusy, action }: {
  title: ReactNode
  /** Una riga piccola sotto il titolo («Rimini Open»). */
  sub?: ReactNode
  onCancel: () => void
  cancelLabel?: string
  /** Salvataggio in corso: «Annulla» resta annunciato ma non fa niente. */
  cancelBusy?: boolean
  /** Il primario: un `<Button variant="filled">`. */
  action?: ReactNode
}) {
  const ctx = useContext(Ctx)
  return (
    <div className="ui-sheet-bar">
      <div className="ui-sheet-bar-side">
        <Button variant="glass" onClick={onCancel} disabled={cancelBusy}>
          {cancelLabel}
        </Button>
      </div>
      <div className="ui-sheet-bar-title">
        <h2 id={ctx?.titleId} tabIndex={-1}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      <div className="ui-sheet-bar-side" data-end="">
        {action}
      </div>
    </div>
  )
}

/**
 * Le azioni in fondo agli sheet di contenuto (UX §7.5.8): veri `<button>`, in
 * ordine [distruttivo a sinistra] · spazio · [Annulla] · [primario].
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
// Le chip dei moduli (design 15/16): un gruppo con l'etichetta 13/600 sopra e
// le chip che VANNO A CAPO (nei moduli si vede tutto, non si scorre di lato
// come nei filtri). La scelta è la chip d'inchiostro pieno, `aria-pressed`.
// Con `toggle` ritoccare la chip scelta la toglie (il Tabellone facoltativo,
// «Con chi»: nessuno).
// ---------------------------------------------------------------------------
export interface SheetChipOption<T extends string> {
  value: T
  label: ReactNode
}

export function SheetChips<T extends string>({ label, hint, options, value, onChange, toggle = false, children, className }: {
  label: ReactNode
  hint?: ReactNode
  options: SheetChipOption<T>[]
  value: T | ''
  onChange: (value: T | '') => void
  toggle?: boolean
  /** Dopo le chip: la chip tratteggiata «+ Nuovo compagno». */
  children?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={className ? `ui-field ${className}` : 'ui-field'}>
      <span id={`${id}-l`} className="ui-field-label">{label}</span>
      <div role="group" aria-labelledby={`${id}-l`} aria-describedby={hint ? `${id}-h` : undefined} className="ui-sheet-chips">
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              className="ui-sheet-chip"
              aria-pressed={on}
              onClick={() => onChange(on && toggle ? '' : o.value)}
            >
              {o.label}
            </button>
          )
        })}
        {children}
      </div>
      {hint && <p id={`${id}-h`} className="ui-field-hint">{hint}</p>}
    </div>
  )
}

/**
 * La chip tratteggiata che aggiunge («+ Nuovo compagno»). Niente materiale:
 * il vetro scriverebbe il suo bordo pieno sopra il tratteggio, che qui è il
 * segno stesso dell'«aggiungi».
 */
export function SheetChipAdd({ children, pressed, onClick }: { children: ReactNode; pressed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="ui-sheet-chip"
      data-variant="add"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
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
        maxLength={LIMITI.citta.max}
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
