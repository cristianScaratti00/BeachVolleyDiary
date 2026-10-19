// ============================================================================
// Menu (UX §7.4, MOTION.md §4.2): l'action sheet del ＋ su mobile e i popover
// («＋ Nuovo» della Sidebar, «⋯» della NavBar).
//
// Pattern ARIA menu: contenitore `role="menu"` con `aria-labelledby` sul
// titolo, voci `role="menuitem"` che sono `<button>` veri; ↑/↓, Home/Fine,
// Invio/Spazio; Esc chiude; il focus va alla prima voce all'apertura e torna a
// chi l'ha aperto alla chiusura, sempre a t0.
//
// - `tabbar`: sale DAL ＋ («ciò che hai toccato è ciò che si apre»), origine
//   al centro del ＋, MOLLA per lo spostamento e ENTRATA per l'opacità.
// - `popover`: ancorato al pulsante, `translateY(-4px)` in SVELTO, senza velo.
// Le voci compaiono con il pannello: nessuno sfalsamento.
// Una voce distruttiva sta su una riga OPACA: danger come testo sul vetro
// fallisce (ART_DIRECTION §4.4).
// ============================================================================
import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import * as m from 'motion/react-m'
import { useIsPresent, useReducedMotion } from 'motion/react'
import { ENTRATA, MOLLA, SVELTO } from '../Motion'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useEscape, useInitialFocus, useReturnFocus } from './overlay'
import './Menu.css'

export interface MenuViewItem {
  key: string
  label: string
  sub?: string
  icon?: IconName
  tone?: 'destructive'
  onSelect: () => void
}

export function Menu({ title, items, onClose, placement = 'tabbar', anchor, opener, top = true, cancel = placement === 'tabbar' }: {
  title: string
  items: MenuViewItem[]
  onClose: () => void
  placement?: 'tabbar' | 'popover'
  anchor?: HTMLElement | null
  opener?: HTMLElement | null
  top?: boolean
  /** La voce «Annulla» separata (action sheet su mobile). */
  cancel?: boolean
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const presente = useIsPresent()
  const ridotto = useReducedMotion()
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

  const tabbar = placement === 'tabbar'
  const anim = tabbar
    ? {
        initial: { opacity: 0, y: ridotto ? 0 : 12, scale: ridotto ? 1 : 0.96 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { opacity: ENTRATA, y: MOLLA, scale: MOLLA } },
        exit: { opacity: 0, y: ridotto ? 0 : 12, scale: ridotto ? 1 : 0.96, transition: SVELTO },
      }
    : {
        initial: { opacity: 0, y: ridotto ? 0 : -4 },
        animate: { opacity: 1, y: 0, transition: SVELTO },
        exit: { opacity: 0, transition: SVELTO },
      }

  return (
    <m.div
      ref={ref}
      className="ui-menu"
      data-placement={placement}
      role="menu"
      aria-labelledby={`${id}-t`}
      data-material={presente ? 'glass-thick' : 'frost'}
      {...(presente ? {} : { inert: '' })}
      style={{ ...(pos ?? {}), '--material-elev': 'var(--elev-overlay)' } as CSSProperties}
      onKeyDown={onKey}
      onClick={(e) => e.stopPropagation()}
      {...anim}
    >
      <p className="ui-menu-title" id={`${id}-t`}>{title}</p>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="menuitem"
          className="ui-menu-item"
          data-tone={it.tone}
          onClick={it.onSelect}
        >
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
      {cancel && (
        <>
          <hr className="ui-menu-sep" />
          <button type="button" role="menuitem" className="ui-menu-item ui-menu-cancel" onClick={onClose}>
            <span className="ui-menu-label">Annulla</span>
          </button>
        </>
      )}
    </m.div>
  )
}
