// ============================================================================
// La cornice dell'app (UX §7.1–7.3, §8.2–8.4): «Vai al contenuto», Sidebar dai
// 900px o TabBar sotto, `<main id="contenuto">`, la regione degli avvisi.
//
// Ordine nel DOM (§8.2): desktop Sidebar → main; mobile main → TabBar (la
// barra è DOPO il contenuto anche se sta in basso sullo schermo).
//
// A ogni navigazione, nello stesso fotogramma (nessuna animazione di rotta):
// titolo della scheda, scroll in cima (push) o ripristinato (indietro), focus
// all'h1 oppure, tornando indietro, al link che aveva aperto il dettaglio.
// ============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { scroller, takeKeepScroll, useNav, useOverlays } from './router'
import { routeTab, routeTitle } from './routes'
import type { Route, TabKey, TorneiVista } from './routes'
import { useIsWide } from '../hooks/useMedia'
import { Sidebar } from '../components/ui/Sidebar'
import { TabBar } from '../components/ui/TabBar'
import type { TabDef } from '../components/ui/TabBar'
import { ToastRegion } from '../components/ui/Toast'
import './AppShell.css'

export function tabsFor(vista: TorneiVista): TabDef[] {
  return [
    { key: 'home', label: 'Home', icon: 'home', to: { name: 'home' } },
    { key: 'tornei', label: 'Tornei', icon: 'trophy', to: { name: 'tornei', vista } },
    { key: 'compagni', label: 'Compagni', icon: 'people', to: { name: 'compagni' } },
    { key: 'profilo', label: 'Profilo', icon: 'person', to: { name: 'profilo' } },
  ]
}

function radiceDellaTab(r: Route, tab: TabKey | null): boolean {
  if (!tab) return false
  if (tab === 'tornei') return r.name === 'tornei' && !r.q
  return r.name === tab
}

/** La fine dell'entrata dello sheet che sostituisce il menu: --dur-molla (MOTION.md §3.4.4). */
const FINE_ENTRATA_SHEET_MS = 320

/** Resta acceso per `ms` dopo essere tornato falso: il cambio si fa dove non si vede. */
function useRitardoSpegnimento(v: boolean, ms: number): boolean {
  const [acceso, setAcceso] = useState(v)
  useEffect(() => {
    if (v) {
      setAcceso(true)
      return
    }
    const t = window.setTimeout(() => setAcceso(false), ms)
    return () => window.clearTimeout(t)
  }, [v, ms])
  return v || acceso
}

export interface ShellUser {
  name: string
  email: string
  avatar: string | null
  admin: boolean
}

export function AppShell({ children, vista, user, entityTitle, onPlus, fullscreen }: {
  children: ReactNode
  vista: TorneiVista
  user: ShellUser
  /** Il nome del torneo o del compagno aperto: il titolo della scheda. */
  entityTitle?: string
  /** Il ＋ (TabBar) e «＋ Nuovo» (Sidebar): apre il menu delle azioni. */
  onPlus: (anchor: HTMLElement | null) => void
  /** `/crea` e `/wrapped`: niente TabBar, niente margini. */
  fullscreen: boolean
}) {
  const nav = useNav()
  const route = nav.route
  const wide = useIsWide()
  const stack = useOverlays()
  const tab = routeTab(route)
  const tabs = tabsFor(vista)
  const plusRef = useRef<HTMLButtonElement>(null)
  const nuovoRef = useRef<HTMLButtonElement>(null)

  const azioniTop = stack.find((e) => e.overlay.kind === 'azioni')
  const menuAperto = !!azioniTop
  // La TabBar sale sopra il velo solo per il menu ＋, e torna giù a fine
  // entrata dello sheet che lo sostituisce (MOTION.md §3.4.4).
  const sollevata = useRitardoSpegnimento(!!azioniTop && azioniTop.overlay.kind === 'azioni' && azioniTop.overlay.anchor !== 'popover', FINE_ENTRATA_SHEET_MS)

  // Titolo della scheda: cambia con la rotta e con il nome dell'entità.
  useEffect(() => {
    document.title = routeTitle(route, entityTitle)
  }, [route, entityTitle])

  // Focus e scroll a ogni navigazione, nello stesso fotogramma.
  useLayoutEffect(() => {
    if (nav.kind === 'init') return
    const el = scroller()
    const fermo = takeKeepScroll()
    if (nav.kind === 'pop') {
      const y = nav.state.scroll ?? 0
      el.scrollTop = y
      // Il contenuto può arrivare un fotogramma dopo (dati dal server).
      window.requestAnimationFrame(() => {
        if (Math.abs(el.scrollTop - y) > 1) el.scrollTop = y
      })
    } else if (!fermo) {
      el.scrollTop = 0
    }
    if (nav.keepFocus) return
    let target: HTMLElement | null = null
    if (nav.kind === 'pop' && nav.state.focusHref) {
      const href = nav.state.focusHref.replace(/"/g, '\\"')
      target = document.querySelector<HTMLElement>(`main a[href="${href}"]`)
    }
    target ??= document.querySelector<HTMLElement>('main h1')
    target?.focus({ preventScroll: true })
    // Solo quando la navigazione cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.seq])

  const atRoot = radiceDellaTab(route, tab)

  return (
    <>
      <a href="#contenuto" className="skip-link">Vai al contenuto</a>
      {wide && (
        <Sidebar
          ref={nuovoRef}
          tabs={tabs}
          active={tab}
          menuOpen={menuAperto}
          onNew={() => onPlus(nuovoRef.current)}
          user={{ name: user.name, email: user.email, avatar: user.avatar, admin: user.admin }}
        />
      )}
      <main
        id="contenuto"
        className="app-main"
        tabIndex={-1}
        data-scroller={wide ? '' : undefined}
        data-fullscreen={fullscreen ? '' : undefined}
      >
        {children}
      </main>
      {!wide && !fullscreen && (
        <TabBar
          ref={plusRef}
          tabs={tabs}
          active={tab}
          atRoot={atRoot}
          menuOpen={menuAperto}
          lifted={sollevata}
          onPlus={() => onPlus(null)}
          avatar={{ name: user.name, src: user.avatar }}
        />
      )}
      <ToastRegion />
    </>
  )
}
