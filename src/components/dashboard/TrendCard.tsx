// ============================================================================
// Andamento: il win rate mese per mese (una linea, un colore: --data-win).
//
// Le coordinate arrivano già pronte da `deriveDashboard` in un viewBox 340×152.
// Il disegno (griglia, area, linea, punti) è SVG `aria-hidden` che scala
// uniforme; le ETICHETTE sono HTML posato sopra in percentuale, così restano
// a 11–12px veri a qualunque larghezza (nell'SVG scalato scendevano a 8–9px,
// UX §8.1).
//
// Movimento (MOTION.md §4.4, E2): al primo montaggio la linea si disegna
// (`stroke-dashoffset`, RACCONTO); a un cambio di filtro la vecchia linea e la
// nuova si scambiano in dissolvenza (SVELTO), senza ridisegnare da zero. Con
// reduced-motion niente di tutto questo: la linea c'è e basta.
// ============================================================================
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import type { DashboardStats, TrendPoint } from '../../lib/derive'
import { MONTHS_FULL, MONTHS_SHORT, TOKEN, dataTone } from '../../lib/theme'
import { ChartCard, EmptyNote } from './Chart'

const W = 340
const H = 152
// Le linee guida della griglia (100%, 50%, 0%) nel viewBox di `deriveDashboard`.
const ASSE = [
  { y: 24, label: '100' },
  { y: 76, label: '50' },
  { y: 128, label: '0' },
]
const SINISTRA = 20
const DESTRA = 320

const at = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

function riassunto(pts: TrendPoint[]): string | null {
  if (pts.length < 2) return null
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const d = last.pct - prev.pct
  const verso = d > 0 ? 'in salita' : d < 0 ? 'in discesa' : 'stabile'
  const mese = MONTHS_FULL[MONTHS_SHORT.indexOf(last.label)] ?? last.label
  return `Win rate ${verso}: ${last.pct}% a ${mese}, ${d >= 0 ? '+' : ''}${d} sul mese prima.`
}

function Disegno({ s, modo, onUscita }: { s: DashboardStats; modo: 'disegna' | 'compare' | 'esce' | 'fermo'; onUscita?: () => void }) {
  return (
    <g className="dash-trend-g" data-modo={modo} onAnimationEnd={modo === 'esce' ? onUscita : undefined}>
      <polygon points={s.trendArea} style={{ fill: TOKEN.dataWin }} fillOpacity={0.09} />
      <polyline
        className="dash-trend-line"
        points={s.trendLine}
        fill="none"
        style={{ stroke: TOKEN.dataWin }}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        data-motion-exception={modo === 'disegna' ? 'grafico' : undefined}
      />
      {s.trendPts.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={4} style={{ fill: TOKEN.surface, stroke: TOKEN.dataWin }} strokeWidth={2.5} />
      ))}
    </g>
  )
}

export function TrendCard({ s }: { s: DashboardStats }) {
  // La linea con cui la card è nata si disegna; le successive compaiono.
  const [cambiata, setCambiata] = useState(false)
  const [vecchia, setVecchia] = useState<DashboardStats | null>(null)
  const ridotto = useReducedMotion()
  // Stato derivato durante il render (non in un effetto): la linea nuova
  // nasce già in dissolvenza, senza un fotogramma piena. La vecchia resta il
  // tempo della sua uscita (onAnimationEnd).
  const [ultima, setUltima] = useState(s)
  if (ultima.trendLine !== s.trendLine) {
    setUltima(s)
    setCambiata(true)
    setVecchia(!ridotto && ultima.trendHasData ? ultima : null)
  }

  const tono = dataTone(s.trendColor) === 'win' ? 'win' : 'rest'
  return (
    <ChartCard
      title="Andamento"
      extra={s.trendHasData ? <span className="dash-trend-delta" data-tone={tono}>{s.trendLabel}</span> : undefined}
      summary={s.trendHasData ? riassunto(s.trendPts) : null}
    >
      {s.trendHasData ? (
        <div className="dash-trend-plot">
          <svg className="dash-trend-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
            {ASSE.map((a, i) => (
              <line
                key={a.y}
                x1={SINISTRA}
                y1={a.y}
                x2={DESTRA}
                y2={a.y}
                style={{ stroke: i === ASSE.length - 1 ? TOKEN.separator : TOKEN.dataGrid }}
              />
            ))}
            {vecchia && <Disegno key={`v-${vecchia.trendLine}`} s={vecchia} modo="esce" onUscita={() => setVecchia(null)} />}
            <Disegno
              key={s.trendLine}
              s={s}
              modo={!cambiata ? 'disegna' : vecchia ? 'compare' : 'fermo'}
            />
          </svg>
          <div className="dash-trend-labels" aria-hidden="true">
            {ASSE.map((a) => (
              <span key={a.y} className="dash-trend-axis" style={at(0, a.y)}>{a.label}</span>
            ))}
            {s.trendPts.map((pt, i) => (
              <span key={`v${i}`} className="dash-trend-value" style={at(pt.x, pt.y)}>{pt.pct}%</span>
            ))}
            {s.trendPts.map((pt, i) => (
              <span key={`m${i}`} className="dash-trend-month" style={{ left: at(pt.x, 0).left }}>{pt.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyNote>Servono partite in almeno due mesi diversi per vedere l'andamento.</EmptyNote>
      )}
    </ChartCard>
  )
}
