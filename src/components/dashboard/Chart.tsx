// ============================================================================
// La cornice comune delle card di Statistiche (UX §8.4): una card di carta col
// filo (il redesign) con un `<figure>`, il titolo `<h2>` 17/700 dentro la
// `<figcaption>` e, quando il grafico è un disegno, un riassunto testuale
// collegato con `aria-describedby`. Le parti SVG sono `aria-hidden`: il
// riassunto dice la stessa cosa a parole.
// ============================================================================
import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Card } from '../ui/Card'
import './dashboard.css'

export function ChartCard({ title, extra, summary, children, wide, className, rise }: {
  title: ReactNode
  /** A destra del titolo: il delta dell'andamento, «Vedi tutti». */
  extra?: ReactNode
  /** Il grafico detto a parole, per chi non lo vede. */
  summary?: string | null
  children: ReactNode
  /** Occupa tutta la riga della griglia. */
  wide?: boolean
  className?: string
  /** Il posto nella salita sfalsata della schermata (`.rise`, `--rise-i`). */
  rise?: number
}) {
  const id = useId()
  const classi = ['dash-card', rise != null && 'rise', className].filter(Boolean).join(' ')
  return (
    <Card as="div" className={classi} style={rise != null ? ({ '--rise-i': rise } as CSSProperties) : undefined} data-wide={wide ? '' : undefined}>
      {/* Il nome dalla figcaption non tutti gli screen reader lo calcolano:
          `aria-labelledby` sul titolo lo rende esplicito. */}
      <figure className="dash-figure" aria-labelledby={`${id}-t`} aria-describedby={summary ? `${id}-s` : undefined}>
        <figcaption className="dash-head">
          <h2 className="dash-title" id={`${id}-t`}>{title}</h2>
          {extra && <div className="dash-extra">{extra}</div>}
        </figcaption>
        {children}
        {summary && (
          <p id={`${id}-s`} className="sr-only">
            {summary}
          </p>
        )}
      </figure>
    </Card>
  )
}

/** La nota vuota dentro una card: niente zeri, una frase. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="dash-empty">{children}</p>
}
