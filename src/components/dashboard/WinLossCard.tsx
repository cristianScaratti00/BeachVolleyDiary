// ============================================================================
// Vinte / perse: l'anello del win rate, la legenda e i set vinti.
//
// L'anello è `stroke-dasharray` (MOTION.md E2, `data-motion-exception`): al
// montaggio e a un cambio di filtro passa dal valore di prima al nuovo in
// RACCONTO. Con reduced-motion arriva fermo. Le etichette al centro sono HTML:
// nell'SVG scalato «VINTE» scendeva a 9px.
// ============================================================================
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { DashboardStats } from '../../lib/derive'
import { TOKEN } from '../../lib/theme'
import { ChartCard, EmptyNote } from './Chart'

// La circonferenza del cerchio di raggio 50 (la stessa di `deriveDashboard`).
const CIRC = 2 * Math.PI * 50

export function WinLossCard({ s }: { s: DashboardStats }) {
  const ridotto = useReducedMotion()
  // Al primo fotogramma l'arco è vuoto, poi va al valore: la transizione lo porta.
  const [arrivato, setArrivato] = useState(!!ridotto)
  useEffect(() => {
    if (arrivato) return
    const raf = window.requestAnimationFrame(() => setArrivato(true))
    return () => window.cancelAnimationFrame(raf)
  }, [arrivato])

  if (s.played === 0) {
    return (
      <ChartCard title="Vinte e perse">
        <EmptyNote>Nessuna partita in questo periodo.</EmptyNote>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Vinte e perse"
      summary={`${s.won} ${s.won === 1 ? 'vinta' : 'vinte'} e ${s.lost} ${s.lost === 1 ? 'persa' : 'perse'}: ${s.winPct}% delle partite. Set vinti: ${s.setPct}%.`}
    >
      <div className="dash-wl">
        <div className="dash-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
            <circle cx="60" cy="60" r="50" fill="none" style={{ stroke: TOKEN.dataTrack }} strokeWidth={8} />
            <circle
              className="dash-ring-arc"
              cx="60"
              cy="60"
              r="50"
              fill="none"
              style={{ stroke: TOKEN.dataWin }}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={arrivato ? s.donutDash : `0 ${CIRC.toFixed(1)}`}
              transform="rotate(-90 60 60)"
              data-motion-exception="grafico"
            />
          </svg>
          <div className="dash-ring-center" aria-hidden="true">
            <span className="dash-ring-n">{s.winPct}%</span>
            <span className="dash-eyebrow">Vinte</span>
          </div>
        </div>
        <dl className="dash-legend">
          <div>
            <dt className="dash-eyebrow"><span className="dash-swatch" data-tone="win" aria-hidden="true" />Vinte</dt>
            <dd className="dash-legend-n">{s.won}</dd>
          </div>
          <div>
            <dt className="dash-eyebrow"><span className="dash-swatch" data-tone="rest" aria-hidden="true" />Perse</dt>
            <dd className="dash-legend-n">{s.lost}</dd>
          </div>
          <div className="dash-legend-sep">
            <dt className="dash-eyebrow">Set vinti</dt>
            <dd className="dash-legend-n">{s.setPct}%</dd>
          </div>
        </dl>
      </div>
    </ChartCard>
  )
}
