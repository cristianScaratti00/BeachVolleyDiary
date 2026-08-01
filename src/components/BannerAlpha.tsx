// ============================================================================
// Banner "versione alpha" — prima cosa che si legge in Home.
//
// Dice due cose e basta: che questa è una prima versione, e che se qualcosa si
// rompe c'è un posto dove dirlo. La CTA non è decorativa: senza una via
// d'uscita, avvisare che ci sono bug è solo uno scarico di responsabilità.
//
// Non è chiudibile di proposito: finché l'app è in alpha l'avviso vale ad ogni
// apertura, e la CTA è l'unico ingresso alla schermata di segnalazione.
// ============================================================================
import { Badge, INK, ORANGE } from './ui'

// Testo secondario più carico del MUTED di casa (.55): su questo fondo caldo
// quello non arriverebbe a 4.5:1. Il valore è fissato in contrast.test.ts.
const TESTO_SU_SABBIA = 'rgba(27,42,74,.72)'
const FONDO = '#FFF1EA'

export default function BannerAlpha({ onSegnala }: { onSegnala: () => void }) {
  return (
    <section
      aria-label="Avviso versione alpha"
      style={{
        marginTop: 16,
        border: '1px solid rgba(255,107,53,.28)',
        background: FONDO,
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: '#fff',
          border: '1px solid rgba(255,107,53,.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flex: 'none',
        }}
      >
        🛠️
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="num" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.2px', color: INK }}>
            Stai usando una versione alpha
          </span>
          <Badge>Alpha</Badge>
        </div>
        <p style={{ font: "600 13px 'Nunito Sans'", color: TESTO_SU_SABBIA, margin: '4px 0 0', lineHeight: 1.45 }}>
          È una prima versione: qualcosa può non funzionare o comportarsi in modo
          strano. Se ti capita, raccontacelo — è così che l’app migliora.
        </p>
      </div>

      <button
        type="button"
        className="chip"
        onClick={onSegnala}
        style={{
          flex: 'none',
          border: 'none',
          borderRadius: 11,
          padding: '11px 18px',
          background: ORANGE,
          color: '#fff',
          font: "700 13px 'Nunito Sans'",
          cursor: 'pointer',
        }}
      >
        Segnala un problema →
      </button>
    </section>
  )
}
