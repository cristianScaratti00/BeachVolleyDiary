// ============================================================================
// Impaginazione delle schermate: la colonna del contenuto e le sezioni con il
// loro titolo `<h2>` (UX §8.4: un h1 per schermata, h2 per le sezioni).
// ============================================================================
import type { ReactNode } from 'react'
import './Page.css'

/** La colonna: `content` 1120 (liste, griglie), `reading` 720 (Profilo, moduli). */
export function Page({ children, width = 'content', className }: {
  children: ReactNode
  width?: 'content' | 'reading' | 'timeline'
  className?: string
}) {
  return (
    <div className={className ? `ui-page ${className}` : 'ui-page'} data-width={width}>
      {children}
    </div>
  )
}

/**
 * Una sezione con il suo titolo. Il contatore sta DENTRO l'h2, così finisce
 * nel nome annunciato («2vs2, 4 tornei»).
 */
export function Section({ title, count, action, children, id, className }: {
  title: ReactNode
  count?: ReactNode
  action?: ReactNode
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section className={className ? `ui-section ${className}` : 'ui-section'} aria-labelledby={id}>
      <div className="ui-section-head">
        <h2 className="ui-section-title" id={id}>
          {title}
          {count != null && <> {count}</>}
        </h2>
        {action && <div className="ui-section-action">{action}</div>}
      </div>
      {children}
    </section>
  )
}

/** Testo secondario fuori da una card (note sotto una sezione, avvertenze). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={className ? `ui-note ${className}` : 'ui-note'}>{children}</p>
}
