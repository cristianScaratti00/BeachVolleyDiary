// ============================================================================
// Numeri da tabellone (ART_DIRECTION §2.4.3): cifre tabellari pesanti con
// l'etichetta maiuscola sotto; le celle di una griglia sono separate da un
// filo, non da spazio, come un segnapunti.
// ============================================================================
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { Tabellone } from './Tabellone'
import type { TabelloneSize } from './Tabellone'
import './Stat.css'

/**
 * Griglia di statistiche. `cols` è il numero di colonne da 600px in su; sotto
 * scende a metà (6 → 3×2, 4 → 2×2), come chiede UX §9.2.
 */
export function StatGrid({ children, cols = 4, className, label }: {
  children: ReactNode
  cols?: 2 | 3 | 4 | 6
  className?: string
  label?: string
}) {
  return (
    <div className={className ? `ui-stat-grid ${className}` : 'ui-stat-grid'} data-cols={cols} role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  )
}

const NUMERICO = /^\D*\d+\D*$/

export function StatTile({ value, label, tone, size = 'l', rise, delay }: {
  value: ReactNode
  label: ReactNode
  /** `win`: il numero È una vittoria o un primo posto (ART_DIRECTION §3.3.8). */
  tone?: 'win'
  size?: Extract<TabelloneSize, 'hero' | 'xl' | 'l'>
  /** Chiave della schermata: la salita da zero una volta per sessione. */
  rise?: string
  delay?: number
}) {
  const numero = (typeof value === 'number' || typeof value === 'string') && NUMERICO.test(String(value))
  return (
    <div className="ui-stat" data-size={size}>
      <div className="ui-stat-value" data-tone={tone}>
        {numero ? <Tabellone value={value as string | number} size={size} rise={rise} delay={delay} /> : value}
      </div>
      <div className="ui-stat-label">{label}</div>
    </div>
  )
}

export interface StatItem {
  value: ReactNode
  label: string
  tone?: 'win'
}

/** Riga di 3–4 statistiche in fondo alle card di entità (torneo, compagno). */
export function StatFooter({ items }: { items: StatItem[] }) {
  return (
    <dl className="ui-stat-footer">
      {items.map((it) => (
        <div key={it.label}>
          {/* Etichetta prima nel DOM (dt prima di dd), numero sopra a vista. */}
          <dt className="ui-stat-footer-label">{it.label}</dt>
          <dd className="ui-stat-footer-value" data-tone={it.tone}>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Riga con barra (win rate per fase, per compagno). La barra è larga quanto il
 * binario e ci scorre dentro con `translateX` (MOTION.md §4.4): `scaleX`
 * schiaccerebbe le estremità tonde, `width` farebbe layout a ogni fotogramma.
 * Al montaggio sale da zero in RACCONTO; con reduced-motion arriva ferma.
 */
export function MeterRow({ label, pct, sub, valueLabel }: {
  label: ReactNode
  /** 0–100 */
  pct: number
  sub?: ReactNode
  /** Il valore scritto a destra; di default «{pct}%». */
  valueLabel?: ReactNode
}) {
  return (
    <div className="ui-meter">
      <div className="ui-meter-head">
        <span className="ui-meter-label">{label}</span>
        <span className="ui-meter-value">{valueLabel ?? `${pct}%`}</span>
      </div>
      <Bar pct={pct} />
      {sub && <div className="ui-meter-sub">{sub}</div>}
    </div>
  )
}

/** Il binario con la barra. `tone` sceglie la tinta del dato (un colore solo). */
export function Bar({ pct, tone = 'win', size = 'md' }: { pct: number; tone?: 'win' | 'rest' | 'podium' | 'ink'; size?: 'md' | 'lg' }) {
  const ridotto = useReducedMotion()
  const fill = useRef<HTMLDivElement>(null)
  // Al montaggio la barra parte vuota e, al fotogramma dopo, corre al valore
  // (RACCONTO). Il primo passo si fa sul DOM e non con uno stato: nessun
  // render in più. Dopo, `pct` cambia lo stile e la transizione fa il resto.
  const arrivata = useRef(!!ridotto)
  const v = Math.max(0, Math.min(100, pct))
  const meta = `translateX(${v - 100}%)`
  useEffect(() => {
    if (arrivata.current) return
    const raf = window.requestAnimationFrame(() => {
      arrivata.current = true
      if (fill.current) fill.current.style.transform = meta
    })
    return () => window.cancelAnimationFrame(raf)
    // Solo al montaggio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="ui-bar" data-size={size} aria-hidden="true">
      <div
        ref={fill}
        className="ui-bar-fill"
        data-tone={tone}
        style={{ transform: arrivata.current ? meta : 'translateX(-100%)' }}
      />
    </div>
  )
}
