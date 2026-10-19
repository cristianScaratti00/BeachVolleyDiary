// ============================================================================
// TabBar (UX §7.1, MOTION.md §4.1, ART_DIRECTION §2.4.6): capsula di vetro
// flottante sotto i 900px. Home · Tornei · ＋ · Compagni · Profilo.
//
// - Le quattro tab sono `<a href>` veri con `aria-current="page"`; il ＋ è un
//   `<button aria-haspopup="menu" aria-expanded>` chiamato «Crea».
// - Etichette visibili a 11px sotto le icone (Q16).
// - Stato attivo = pillola navy UNICA che scivola (MOLLA) + icona che passa dal
//   contorno al pieno: forma e riempimento, non solo colore (WCAG 1.4.1). Il
//   bianco arriva con la pillola: due livelli d'inchiostro che si scambiano
//   l'opacità con lo stesso tempo (M8).
// - Il ＋ non ruota in ×: il nome sotto il dito non cambia.
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
import { Avatar } from './Avatar'
import './TabBar.css'

export interface TabDef {
  key: TabKey
  label: string
  icon: IconName
  to: Route
}

const POSTO: Record<TabKey, number> = { home: 0, tornei: 1, compagni: 3, profilo: 4 }

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
  avatar?: { name?: string | null; src?: string | null }
}

export const TabBar = forwardRef<HTMLButtonElement, TabBarProps>(function TabBar(
  { tabs, active, atRoot, menuOpen, lifted, onPlus, avatar },
  plusRef,
) {
  const tastiera = useTastieraFuori()
  const i = active ? POSTO[active] : 0
  const prima = tabs.slice(0, 2)
  const dopo = tabs.slice(2)

  const tab = (t: TabDef) => {
    const on = t.key === active
    const avatarTab = t.key === 'profilo' && avatar?.src
    const disegno = (pieno: boolean) =>
      avatarTab ? (
        <span className="ui-tab-avatar" data-on={pieno ? '' : undefined}>
          <Avatar name={avatar?.name} src={avatar?.src} size={24} />
        </span>
      ) : (
        <Icon name={t.icon} size={24} filled={pieno} />
      )
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
        <span className="ui-ink">
          {disegno(false)}
          <span className="ui-tab-label">{t.label}</span>
        </span>
        <span className="ui-ink-on" aria-hidden="true">
          {disegno(true)}
          <span className="ui-tab-label">{t.label}</span>
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="ui-tabbar"
      aria-label="Principale"
      data-material="glass-regular"
      data-lifted={lifted ? '' : undefined}
      data-hidden={tastiera ? '' : undefined}
      style={{ '--i': i, '--material-elev': 'var(--elev-float)' } as CSSProperties}
    >
      <span className="ui-tabbar-pill" aria-hidden="true" data-hidden={active ? undefined : ''} />
      {prima.map(tab)}
      <div className="ui-tab-plus-slot">
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
      </div>
      {dopo.map(tab)}
    </nav>
  )
})
