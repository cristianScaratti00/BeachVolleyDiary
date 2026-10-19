// ============================================================================
// Lista raggruppata stile "inset grouped" di iOS (UX §7.11, ART_DIRECTION §8):
// Profilo, info del torneo, partite, compagni in Statistiche.
//
// Una riga che NAVIGA è un `<a>` con il chevron; una riga che FA qualcosa è un
// `<button>`; una riga che mostra e basta è un `<div>`. Il valore a destra fa
// parte del nome accessibile («Condivisioni ricevute, 2»). Le righe
// distruttive sono testo --danger e aprono sempre un ConfirmDialog.
// ============================================================================
import type { ReactNode } from 'react'
import { Link } from '../../app/router'
import type { Route } from '../../app/routes'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './List.css'

export function ListGroup({ title, footer, children, id, className, titleLevel = 2 }: {
  /** Intestazione del gruppo («Account», «Supporto»). */
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
  id?: string
  className?: string
  titleLevel?: 2 | 3
}) {
  const H = titleLevel === 3 ? 'h3' : 'h2'
  return (
    <section className={className ? `ui-list-section ${className}` : 'ui-list-section'} aria-labelledby={title && id ? `${id}-t` : undefined}>
      {title && <H className="ui-list-title" id={id ? `${id}-t` : undefined}>{title}</H>}
      <ul className="ui-list">{children}</ul>
      {footer && <p className="ui-list-footer">{footer}</p>}
    </section>
  )
}

/** Una lista senza intestazione (le partite, i risultati di una ricerca). */
export function List({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <ul className={className ? `ui-list ${className}` : 'ui-list'} aria-label={label}>
      {children}
    </ul>
  )
}

/** Una voce con contenuto libero (un campo in linea, una riga composta). */
export function ListItem({ children, className, traccia }: { children: ReactNode; className?: string; traccia?: boolean }) {
  return (
    <li className={className ? `ui-list-item ${className}` : 'ui-list-item'}>
      {traccia && <span className="traccia" aria-hidden="true" />}
      {children}
    </li>
  )
}

interface RowContent {
  icon?: IconName
  /** Avatar o miniatura al posto dell'icona. */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Il valore a destra: «2», «Accettati». */
  value?: ReactNode
  tone?: 'danger'
  traccia?: boolean
}

export interface ListRowProps extends RowContent {
  /** Naviga a una rotta: `<a>` con chevron. Vince su `href` e `onClick`. */
  to?: Route
  /** Link fuori dall'app («Apri la mappa ↗»). */
  href?: string
  external?: boolean
  /** Esegue un'azione: `<button>`. */
  onClick?: () => void
  busy?: boolean
  disabled?: boolean
}

function Body({ icon, leading, title, subtitle, value }: RowContent) {
  return (
    <>
      {leading ?? (icon && <Icon name={icon} size={20} className="ui-row-icon" />)}
      <span className="ui-row-text">
        <span className="ui-row-title">{title}</span>
        {subtitle && <span className="ui-row-sub">{subtitle}</span>}
      </span>
      {value != null && value !== '' && <span className="ui-row-value">{value}</span>}
    </>
  )
}

export function ListRow(props: ListRowProps) {
  const { tone, traccia, to, href, external, onClick, busy, disabled } = props
  const content = <Body {...props} />
  let row: ReactNode
  if (to) {
    row = (
      <Link to={to} className="ui-row" data-tone={tone}>
        {content}
        <Icon name="chevron-right" size={20} className="ui-row-chev" />
      </Link>
    )
  } else if (href) {
    row = (
      <a href={href} className="ui-row" data-tone={tone} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {content}
        <Icon name={external ? 'external' : 'chevron-right'} size={20} className="ui-row-chev" />
      </a>
    )
  } else if (onClick) {
    row = (
      <button
        type="button"
        className="ui-row"
        data-tone={tone}
        aria-busy={busy || undefined}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!busy && !disabled) onClick()
        }}
      >
        {content}
      </button>
    )
  } else {
    row = (
      <div className="ui-row" data-tone={tone} data-static="">
        {content}
      </div>
    )
  }
  return (
    <li className="ui-list-item">
      {traccia && <span className="traccia" aria-hidden="true" />}
      {row}
    </li>
  )
}
