// ============================================================================
// NavBar del redesign (ART_DIRECTION §0, UX §7.3).
//
// - Le schermate radice (Home, Tornei, Compagni, Diario) NON hanno barra: il
//   titolo grande (34/800) apre la pagina, con il sottotitolo e, a destra,
//   quello che la schermata ci mette (`aside`: l'avatar in Home, «＋ Nuovo»
//   in Compagni).
// - I dettagli hanno i pulsanti di VETRO LIQUIDO che galleggiano in cima:
//   «‹ Compagni» (o solo «‹» con `backIcon`) a sinistra, le azioni raccolte in
//   una capsula di vetro a destra, oppure il × di `close`. Restano lì mentre
//   il contenuto scorre sotto di loro, ed è lì che la rifrazione si vede.
// - Quando il titolo grande esce dalla vista (una sentinella e un
//   IntersectionObserver: nessun listener di scroll) compare il titolo
//   compatto, in una capsula di vetro al centro. È un CAMBIO DI STATO a
//   soglia, non un'animazione legata allo scroll.
// - Il titolo compatto è `aria-hidden`: l'h1 resta l'unico titolo. Con
//   `hideLargeTitle` l'h1 lo mette la schermata (Profilo: il nome), e la barra
//   mostra sempre il titolo compatto.
//
// La barra è `sticky` e deve essere figlia diretta della pagina: per questo il
// componente restituisce un frammento.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { nomeVisibile } from './Card'
import { LiquidGlass } from './LiquidGlass'
import './NavBar.css'

export interface NavBarBack {
  label: string
  onClick: () => void
}

export function NavBar({
  title,
  subtitle,
  subtitleLive,
  back,
  backIcon,
  close,
  leading,
  actions,
  scrolledActions,
  children,
  eyebrow,
  kicker,
  aside,
  hideLargeTitle,
}: {
  title: ReactNode
  /** Riga sotto il large title. */
  subtitle?: ReactNode
  /** Il sottotitolo è la live region della schermata (`role="status"`). */
  subtitleLive?: boolean
  /** ‹ Indietro con l'etichetta della schermata precedente (UX §4.2). */
  back?: NavBarBack
  /** Solo la freccia nel cerchio di vetro (il nome va nell'`aria-label`). */
  backIcon?: boolean
  /** Il × di vetro a destra: le schermate che si chiudono (Profilo). */
  close?: NavBarBack
  /** Al posto dell'Indietro. */
  leading?: ReactNode
  /** Al massimo due azioni, icone da 44 con nome accessibile: stanno in una
   *  capsula di vetro. */
  actions?: ReactNode
  /** Azioni che compaiono solo dopo lo scroll (la lente in Tornei). */
  scrolledActions?: (visible: boolean) => ReactNode
  /** Contenuto sotto il titolo che scorre con lui (ricerca, segmented). */
  children?: ReactNode
  /** Accanto al large title, a sinistra (la medaglia del torneo, l'avatar). */
  eyebrow?: ReactNode
  /** La riga piccola SOPRA il large title («Amatoriale · 2vs2 · Sabbia»). */
  kicker?: ReactNode
  /** A destra del large title (l'avatar in Home, «＋ Nuovo» in Compagni). */
  aside?: ReactNode
  /** L'h1 lo mette la schermata; la barra mostra sempre il titolo compatto. */
  hideLargeTitle?: boolean
}) {
  const bar = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLSpanElement>(null)
  const [scattata, setScattata] = useState(false)
  const scrolled = scrolledActions?.(scattata)
  const fissa = !!(back || close || leading || actions || hideLargeTitle)
  const conBarra = fissa || !!scrolled

  useEffect(() => {
    const s = sentinel.current
    const b = bar.current
    if (!s || !b || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => setScattata(!e.isIntersecting && e.boundingClientRect.top < b.getBoundingClientRect().bottom),
      { rootMargin: `-${b.offsetHeight}px 0px 0px 0px` },
    )
    io.observe(s)
    return () => io.disconnect()
  }, [conBarra])

  const compatto = hideLargeTitle || scattata

  return (
    <>
      <div
        ref={bar}
        className="ui-navbar"
        data-scrolled={compatto ? '' : undefined}
        data-empty={conBarra ? undefined : ''}
        // Solo azioni «dopo lo scroll» (la lente di Tornei): la barra galleggia
        // sopra il titolo invece di spingerlo giù.
        data-float={conBarra && !fissa ? '' : undefined}
      >
        <div className="ui-navbar-lead">
          {back ? (
            <button
              type="button"
              className="ui-navbar-back press"
              data-icon={backIcon ? '' : undefined}
              aria-label={backIcon ? `Torna a ${back.label.replace(/^Torna a /, '')}` : undefined}
              onClick={back.onClick}
            >
              <LiquidGlass layer />
              <Icon name="chevron-left" size={20} />
              {!backIcon && <span className="ui-navbar-back-label">{back.label}</span>}
            </button>
          ) : (
            leading
          )}
        </div>
        <div className="ui-navbar-compact" aria-hidden="true">
          <LiquidGlass layer />
          <span>{nomeVisibile(title)}</span>
        </div>
        <div className="ui-navbar-trail">
          {(scrolled || actions) && (
            <div className="ui-navbar-actions" data-hidden={!actions && !scattata ? '' : undefined}>
              <LiquidGlass layer />
              {scrolled}
              {actions}
            </div>
          )}
          {close && (
            <button type="button" className="ui-navbar-close press" aria-label={close.label} onClick={close.onClick}>
              <LiquidGlass layer />
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>
      {!hideLargeTitle && (
        // Il titolo sale per primo, come l'intestazione del redesign.
        <div className="ui-largetitle rise" data-eyebrow={eyebrow ? '' : undefined}>
          {eyebrow && <div className="ui-largetitle-eyebrow">{eyebrow}</div>}
          <div className="ui-largetitle-text">
            {kicker && <div className="ui-largetitle-kicker">{kicker}</div>}
            <h1 className="ui-largetitle-h1" tabIndex={-1}>{nomeVisibile(title)}</h1>
            {subtitle != null && subtitle !== '' && (
              <p className="ui-largetitle-sub" role={subtitleLive ? 'status' : undefined}>{subtitle}</p>
            )}
          </div>
          {aside && <div className="ui-largetitle-aside">{aside}</div>}
        </div>
      )}
      <span ref={sentinel} className="ui-navbar-sentinel" aria-hidden="true" />
      {children}
    </>
  )
}
