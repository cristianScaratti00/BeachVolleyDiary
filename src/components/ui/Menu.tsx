// ============================================================================
// Menu (UX §7.4, MOTION.md §4.2): lo sheet del ＋ su mobile («Cosa
// registriamo?», design 13) e i popover («Nuovo» della Sidebar, «⋯» della
// NavBar).
//
// Pattern ARIA menu: contenitore `role="menu"` con `aria-labelledby` sul
// titolo, voci `role="menuitem"` che sono `<button>` veri; ↑/↓, Home/Fine,
// Invio/Spazio; Esc chiude; Tab chiude (il focus non resta dietro a un menu
// aperto); il focus va alla prima voce all'apertura e torna a chi l'ha
// aperto alla chiusura, sempre a t0.
//
// - `sheet`: il foglio --bg che sale dal fondo con la maniglia (trascinabile,
//   come gli sheet), il titolo grande, Pallo che sbircia dal bordo e le voci
//   come card di vetro che salgono sfalsate. In fondo «Annulla», capsula di
//   vetro e voce del menu come le altre: il «chiudi» che si vede e che si
//   raggiunge con le frecce (il × del design in alto a sinistra stava fuori
//   dal menu, e a un lettore di schermo non arrivava in ordine).
// - `popover`: ancorato al pulsante, `translateY(-4px)` in SVELTO, senza velo.
// Una voce distruttiva sta su una riga OPACA: danger come testo sul vetro
// fallisce (ART_DIRECTION §4.4).
// ============================================================================
import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import * as m from 'motion/react-m'
import { useDragControls, useIsPresent, useReducedMotion } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { MOLLA, SVELTO } from '../Motion'
import { Pallo } from '../Pallo'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useEscape, useInitialFocus, useReturnFocus } from './overlay'
import './Menu.css'

export interface MenuViewItem {
  key: string
  label: string
  sub?: string
  icon?: IconName
  /** `accent`: la voce in evidenza (la partita live); `destructive`: elimina. */
  tone?: 'destructive' | 'accent'
  onSelect: () => void
}

// Le stesse soglie degli sheet (Sheet.tsx): una buttata giù decisa chiude.
const CHIUDI_OLTRE_PX = 120
const CHIUDI_OLTRE_VELOCITA = 550

export function Menu({
  title,
  sub,
  items,
  onClose,
  placement = 'sheet',
  anchor,
  opener,
  top = true,
  cancel = placement === 'sheet',
}: {
  title: string
  /** La riga sotto il titolo dello sheet («Scegli tu, al resto penso io.»). */
  sub?: string
  items: MenuViewItem[]
  onClose: () => void
  placement?: 'sheet' | 'popover'
  anchor?: HTMLElement | null
  opener?: HTMLElement | null
  top?: boolean
  /** La voce «Annulla» in fondo (lo sheet su mobile). */
  cancel?: boolean
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const presente = useIsPresent()
  const ridotto = useReducedMotion()
  const trascinamento = useDragControls()
  const [velocitaUscita, setVelocitaUscita] = useState<number | null>(null)
  const [pos, setPos] = useState<CSSProperties | null>(null)

  useEscape(onClose, top && presente)
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[role="menuitem"]'))
  useReturnFocus(presente, opener, ref)

  // Il popover si posa accanto al pulsante che l'ha aperto, dal lato in cui
  // c'è spazio (sotto se ci sta, altrimenti sopra). Sono misure calcolate al
  // volo: lo stacco dal pulsante è --space-2.
  useLayoutEffect(() => {
    if (placement !== 'popover' || !anchor) return
    const stacco = parseFloat(getComputedStyle(anchor).getPropertyValue('--space-2')) || 8
    const r = anchor.getBoundingClientRect()
    const sotto = window.innerHeight - r.bottom
    const style: CSSProperties = {}
    if (r.left + r.width / 2 > window.innerWidth / 2) style.right = Math.max(stacco, window.innerWidth - r.right)
    else style.left = Math.max(stacco, r.left)
    if (sotto >= r.top) style.top = r.bottom + stacco
    else style.bottom = window.innerHeight - r.top + stacco
    setPos(style)
  }, [placement, anchor])

  const voci = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = voci()
    const i = list.indexOf(document.activeElement as HTMLElement)
    const vai = (n: number) => list[(n + list.length) % list.length]?.focus()
    if (e.key === 'ArrowDown') { e.preventDefault(); vai(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); vai(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); vai(0) }
    else if (e.key === 'End') { e.preventDefault(); vai(list.length - 1) }
    else if (e.key === 'Tab') { e.preventDefault(); onClose() }
  }

  if (placement === 'popover') {
    return (
      <m.div
        ref={ref}
        className="ui-menu"
        data-placement="popover"
        role="menu"
        aria-labelledby={`${id}-t`}
        data-material={presente ? 'glass-thick' : 'frost'}
        {...(presente ? {} : { inert: '' })}
        style={{ ...(pos ?? {}), '--material-elev': 'var(--elev-overlay)' } as CSSProperties}
        onKeyDown={onKey}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: ridotto ? 0 : -4 }}
        animate={{ opacity: 1, y: 0, transition: SVELTO }}
        exit={{ opacity: 0, transition: SVELTO }}
      >
        <p className="ui-menu-title" id={`${id}-t`}>{title}</p>
        {items.map((it) => (
          <button key={it.key} type="button" role="menuitem" className="ui-menu-item" data-tone={it.tone} onClick={it.onSelect}>
            {it.icon && (
              <span className="ui-menu-icon">
                <Icon name={it.icon} size={20} />
              </span>
            )}
            <span className="ui-menu-text">
              <span className="ui-menu-label">{it.label}</span>
              {it.sub && <span className="ui-menu-sub">{it.sub}</span>}
            </span>
          </button>
        ))}
      </m.div>
    )
  }

  // ----------------------------------------------------------------- sheet
  const fineTrascinamento = (_e: unknown, info: PanInfo) => {
    if (info.offset.y <= CHIUDI_OLTRE_PX && info.velocity.y <= CHIUDI_OLTRE_VELOCITA) return
    // L'uscita continua il gesto con la velocità del dito (M7).
    setVelocitaUscita(info.velocity.y)
    onClose()
  }
  const anim = ridotto
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: SVELTO },
        exit: { opacity: 0, transition: SVELTO },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0, transition: MOLLA },
        exit: { y: '100%', transition: velocitaUscita != null ? { ...MOLLA, velocity: velocitaUscita } : SVELTO },
      }

  return (
    <>
      <m.div
        ref={ref}
        className="ui-menu-sheet"
        {...(presente ? {} : { inert: '' })}
        onClick={(e) => e.stopPropagation()}
        {...anim}
        drag="y"
        dragListener={false}
        dragControls={trascinamento}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.9 }}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: MOLLA.stiffness, bounceDamping: MOLLA.damping }}
        onDragEnd={fineTrascinamento}
      >
        {/* Pallo sbircia dal bordo, con le mani appoggiate al foglio. */}
        <Pallo umore="sbircia" size={84} className="ui-menu-pallo" />
        <div
          className="ui-menu-handle"
          aria-hidden="true"
          onPointerDown={(e: ReactPointerEvent) => trascinamento.start(e)}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <span />
        </div>
        <div className="ui-menu-head">
          <h2 className="ui-menu-heading" id={`${id}-t`}>{title}</h2>
          {sub && <p className="ui-menu-lead">{sub}</p>}
        </div>
        <div role="menu" aria-labelledby={`${id}-t`} className="ui-menu-list" onKeyDown={onKey}>
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className="ui-menu-opt"
              data-material="glass-regular"
              data-tone={it.tone}
              // Salgono una dopo l'altra mentre il foglio arriva (design 13).
              style={{ '--rise-i': i + 2 } as CSSProperties}
              onClick={it.onSelect}
            >
              {it.icon && (
                <span className="ui-menu-ico">
                  <Icon name={it.icon} size={20} />
                </span>
              )}
              <span className="ui-menu-text">
                <span className="ui-menu-label">{it.label}</span>
                {it.sub && <span className="ui-menu-sub">{it.sub}</span>}
              </span>
            </button>
          ))}
          {cancel && (
            <button
              type="button"
              role="menuitem"
              className="ui-menu-cancel"
              data-material="glass-regular"
              style={{ '--rise-i': items.length + 2 } as CSSProperties}
              onClick={onClose}
            >
              Annulla
            </button>
          )}
        </div>
      </m.div>
    </>
  )
}
