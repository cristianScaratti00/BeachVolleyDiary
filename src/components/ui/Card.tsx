// ============================================================================
// Card di contenuto (UX §7.6, ART_DIRECTION §8): carta opaca, filo all'8%,
// nessuna ombra, nessun sollevamento in hover.
//
// Una card di ENTITÀ (torneo, voce di Timeline, compagno) è un `<article>` con
// un titolo `<h3>` che contiene un `<a href>` col nome dell'entità. Il link si
// allarga a tutta la card con uno pseudo-elemento, così:
//   - tutta la card si tocca, ma c'è UNA fermata di tabulazione;
//   - il contenuto resta leggibile dagli screen reader (con `role="button"` di
//     prima la card annunciava solo "Apri il torneo X": difetto #5);
//   - i pulsanti dentro la card (es. [Storia]) sono fratelli del link, non
//     figli, e stanno sopra l'area estesa (`CardAbove`).
// ============================================================================
import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from '../../app/router'
import type { Route } from '../../app/routes'
import './Card.css'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div' | 'section' | 'li'
  /** L'entità è appena stata creata o cambiata da te (MOTION.md §10.4). */
  traccia?: boolean
  /** Variante scura: la card di Beach Wrapped, anteprima del PNG. */
  tone?: 'paper' | 'navy'
}

export function Card({ as: Tag = 'article', traccia, tone, className, children, ...rest }: CardProps) {
  return (
    <Tag {...rest} className={className ? `ui-card ${className}` : 'ui-card'} data-tone={tone === 'navy' ? 'navy' : undefined}>
      {traccia && <span className="traccia" aria-hidden="true" />}
      {children}
    </Tag>
  )
}

/** Il titolo-link di una card di entità: `<h3><a>` esteso a tutta la card. */
export function CardLink({ to, children, describedBy, level = 3, traccia, className }: {
  to: Route
  children: ReactNode
  /** Id della riga `meta`: al focus si sente «Rimini Open, link, Pro · 1° · 12 lug». */
  describedBy?: string
  level?: 2 | 3
  /** Porta l'id dell'entità alla rotta d'arrivo, per la traccia. */
  traccia?: string
  className?: string
}) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <H className={className ? `ui-card-title ${className}` : 'ui-card-title'}>
      <Link to={to} className="ui-card-link" aria-describedby={describedBy} traccia={traccia}>
        {children}
      </Link>
    </H>
  )
}

/** Contenuto della card che deve restare cliccabile sopra il link esteso. */
export function CardAbove({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `ui-card-above ${className}` : 'ui-card-above'}>{children}</div>
}

/**
 * Griglia di card. `data-layout="grid-auto"` è il contratto che i test
 * verificano al posto dello stile calcolato (UX §14.1): colonne
 * `auto-fill, minmax(min(100%, var(--min)), 1fr)`, mai scroll orizzontale.
 */
export function CardGrid({ children, min = 'card', as: Tag = 'ul', className, label }: {
  children: ReactNode
  /** `card` 300px (tornei), `narrow` 250px (compagni). */
  min?: 'card' | 'narrow'
  as?: 'ul' | 'div'
  className?: string
  label?: string
}) {
  return (
    <Tag className={className ? `ui-card-grid ${className}` : 'ui-card-grid'} data-layout="grid-auto" data-min={min} aria-label={label}>
      {children}
    </Tag>
  )
}
