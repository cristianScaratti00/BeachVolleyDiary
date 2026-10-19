// ============================================================================
// TabBar del redesign (ART_DIRECTION §0, UX §7.1): sotto i 900px, una capsula
// di VETRO LIQUIDO con quattro tab — Home · Tornei · Compagni · Diario — e,
// staccato alla sua destra, il ＋ arancio. Il Profilo non è più una tab: ci
// si arriva dall'avatar in Home.
//
// - Le quattro tab sono `<a href>` veri con `aria-current="page"`; il ＋ è un
//   `<button aria-haspopup="menu" aria-expanded>` chiamato «Crea».
// - Etichette visibili a 10.5px sotto le icone.
// - Stato attivo = una LENTE di vetro liquido UNICA che scivola sotto la tab
//   (molla con un filo di rimbalzo) + etichetta e icona in arancio scuro:
//   forma e colore, non solo colore (WCAG 1.4.1).
// - Si nasconde mentre si scrive in un campo fuori da uno sheet (su Android
//   salirebbe sopra la tastiera).
// - Ritoccare la tab attiva alla sua radice riporta in cima (convenzione iOS).
// ============================================================================
import { forwardRef, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, scrollToTop } from '../../app/router'
import type { Route, TabKey } from '../../app/routes'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import './TabBar.css'

export interface TabDef {
  key: TabKey
  label: string
  icon: IconName
  to: Route
}

/** Un campo di testo ha il focus fuori da uno sheet: la tastiera è su. */
function useTastieraFuori(): boolean {
  const [su, setSu] = useState(false)
  useEffect(() => {
    const testuale = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.matches('textarea, select, [contenteditable="true"]') ||
        (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(el.type))) &&
      !el.closest('[role="dialog"], [role="alertdialog"]')
    const dentro = (e: FocusEvent) => {
      if (testuale(e.target)) setSu(true)
    }
    // Passando da un campo all'altro la barra non deve lampeggiare: si
    // controlla al fotogramma dopo.
    const fuori = () => {
      window.requestAnimationFrame(() => setSu(testuale(document.activeElement)))
    }
    document.addEventListener('focusin', dentro)
    document.addEventListener('focusout', fuori)
    return () => {
      document.removeEventListener('focusin', dentro)
      document.removeEventListener('focusout', fuori)
    }
  }, [])
  return su
}

export interface TabBarProps {
  tabs: TabDef[]
  active: TabKey | null
  /** La rotta corrente è la radice della tab attiva: il ritocco porta in cima. */
  atRoot: boolean
  menuOpen: boolean
  /** Sopra il velo mentre il menu ＋ è aperto (MOTION.md §3.4.4). */
  lifted: boolean
  onPlus: () => void
}

export const TabBar = forwardRef<HTMLButtonElement, TabBarProps>(function TabBar(
  { tabs, active, atRoot, menuOpen, lifted, onPlus },
  plusRef,
) {
  const tastiera = useTastieraFuori()
  const i = tabs.findIndex((t) => t.key === active)

  return (
    <nav
      className="ui-tabbar"
      aria-label="Principale"
      data-lifted={lifted ? '' : undefined}
      data-hidden={tastiera ? '' : undefined}
    >
      <div className="ui-tabbar-capsule" style={{ '--i': Math.max(0, i), '--n': tabs.length } as CSSProperties}>
        <LiquidGlass layer />
        {/* Il selettore: una lente di vetro liquido che scorre sotto la tab
            accesa; il colore sta solo su icona ed etichetta. */}
        <span className="ui-tabbar-pill" aria-hidden="true" data-hidden={i < 0 ? '' : undefined}>
          <LiquidGlass layer variante="lente" />
        </span>
        {tabs.map((t) => {
          const on = t.key === active
          return (
            <Link
              key={t.key}
              to={t.to}
              className="ui-tab"
              aria-current={on ? 'page' : undefined}
              onClick={(e) => {
                if (on && atRoot) {
                  e.preventDefault()
                  scrollToTop(true)
                }
              }}
            >
              <Icon name={t.icon} size={24} />
              <span className="ui-tab-label">{t.label}</span>
            </Link>
          )
        })}
      </div>
      <button
        ref={plusRef}
        type="button"
        className="ui-tab-plus"
        aria-label="Crea"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={onPlus}
      >
        <Icon name="plus" size={24} />
      </button>
    </nav>
  )
})
