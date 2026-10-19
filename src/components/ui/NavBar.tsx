// ============================================================================
// NavBar con large title (UX §7.3, MOTION.md §4.1, ART_DIRECTION §9.3).
//
// - In cima è trasparente: il large title è nel flusso del contenuto (`<h1>`),
//   con il sottotitolo e, sotto, quello che la schermata ci mette (ricerca).
// - Quando il large title esce dalla vista (una sentinella e un
//   IntersectionObserver: nessun listener di scroll) la barra diventa vetro e
//   compare il titolo compatto, in SVELTO. È un CAMBIO DI STATO a soglia, non
//   un'animazione legata allo scroll: su iOS quelle scattano.
// - Il vetro è un livello sempre presente a opacità 0, e quando è a 0 è anche
//   `visibility: hidden`: una sfocatura trasparente costa e conta nel budget.
//   Si anima l'opacità, mai il raggio della sfocatura.
// - Il titolo compatto è `aria-hidden`: l'h1 resta l'unico titolo.
//
// La barra è `sticky` e deve essere figlia diretta della pagina (non di un
// header che esce di vista con lei): per questo il componente restituisce un
// frammento.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { nomeVisibile } from './Card'
import './NavBar.css'

export interface NavBarBack {
  label: string
  onClick: () => void
}

export function NavBar({ title, subtitle, subtitleLive, back, leading, actions, scrolledActions, children, eyebrow }: {
  title: ReactNode
  /** Riga sotto il large title. */
  subtitle?: ReactNode
  /** Il sottotitolo è la live region della schermata (`role="status"`). */
  subtitleLive?: boolean
  /** ‹ Indietro con l'etichetta della schermata precedente (UX §4.2). */
  back?: NavBarBack
  /** Al posto dell'Indietro (il marchio in Home). */
  leading?: ReactNode
  /** Al massimo due azioni, icone da 44 con nome accessibile. */
  actions?: ReactNode
  /** Azioni che compaiono solo dopo lo scroll (la lente in Tornei). */
  scrolledActions?: (visible: boolean) => ReactNode
  /** Contenuto sotto il titolo che scorre con lui (ricerca, segmented). */
  children?: ReactNode
  /** Riga sopra il large title (categoria e badge nel dettaglio). */
  eyebrow?: ReactNode
}) {
  const bar = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLSpanElement>(null)
  const [scattata, setScattata] = useState(false)

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
  }, [])

  return (
    <>
      <div ref={bar} className="ui-navbar" data-scrolled={scattata ? '' : undefined}>
        <div className="ui-navbar-glass" data-material="glass-regular" aria-hidden="true" />
        <div className="ui-navbar-lead">
          {back ? (
            <button type="button" className="ui-navbar-back" onClick={back.onClick}>
              <Icon name="chevron-left" size={24} />
              <span className="ui-navbar-back-label">{back.label}</span>
            </button>
          ) : (
            leading
          )}
        </div>
        <div className="ui-navbar-compact" aria-hidden="true">{nomeVisibile(title)}</div>
        <div className="ui-navbar-trail">
          {scrolledActions?.(scattata)}
          {actions}
        </div>
      </div>
      <div className="ui-largetitle">
        {eyebrow && <div className="ui-largetitle-eyebrow">{eyebrow}</div>}
        <h1 className="ui-largetitle-h1" tabIndex={-1}>{nomeVisibile(title)}</h1>
        {subtitle != null && subtitle !== '' && (
          <p className="ui-largetitle-sub" role={subtitleLive ? 'status' : undefined}>{subtitle}</p>
        )}
      </div>
      <span ref={sentinel} className="ui-navbar-sentinel" aria-hidden="true" />
      {children}
    </>
  )
}
