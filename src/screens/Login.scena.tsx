// ============================================================================
// La scena dell'accesso: il campo da beach al tramonto, con la rete, il sole
// che tocca il mare e il pallone in volo (il disegno del redesign, 390×844).
// È UNA scena per tutte e tre le viste: il Benvenuto la mostra intera, Accedi
// e Registrati la alzano (l'«inquadratura» trasla e ingrandisce la camera),
// così passare da una vista all'altra è un movimento di macchina e non un
// cambio di fondale.
//
// Il disegno è largo 390 (il telefono del design), ma il viewBox è 1350:
// cielo, mare e sabbia proseguono ai lati. Su un telefono in verticale lo
// `slice` mostra esattamente i 390 centrali, come nel design; su un tablet o
// un desktop in orizzontale si vede il panorama, invece di uno zoom di 3×
// sulla rete.
//
// Tre movimenti, tutti in CSS (Login.css) e tutti fermi con reduced-motion:
// il lento zoom Ken Burns della scena, il pallone che vola, il riflesso del
// sole che luccica sull'acqua. Sotto, due veli neri dal basso (uno per il
// Benvenuto, uno per i moduli) che si scambiano l'opacità: il testo bianco
// sta sempre su un fondo che lo regge.
//
// Decorativa (`aria-hidden`): quello che dice lo dicono i titoli accanto. I
// colori sono quelli dell'illustrazione, letterali come in Pallo e nella
// mappa: non sono palette dell'interfaccia.
// ============================================================================
import { useId } from 'react'

export type Inquadratura = 'benvenuto' | 'accedi' | 'registrati'

export function Scena({ inquadratura }: { inquadratura: Inquadratura }) {
  // Gli id dei gradienti sono per istanza: due scene montate insieme (il
  // passaggio fra due viste in un test, un'anteprima) non si rubano i `url()`.
  const uid = useId().replace(/:/g, '')
  const id = (n: string) => `scena-${n}-${uid}`
  const url = (n: string) => `url(#${id(n)})`

  return (
    <div className="accesso-scena" data-inquadratura={inquadratura} aria-hidden="true">
      <div className="accesso-camera">
        <svg className="accesso-scena-svg" viewBox="-480 0 1350 844" preserveAspectRatio="xMidYMid slice" focusable="false">
          <defs>
            <linearGradient id={id('cielo')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1B1626" />
              <stop offset=".42" stopColor="#6E3440" />
              <stop offset=".72" stopColor="#E06B35" />
              <stop offset="1" stopColor="#FFB46A" />
            </linearGradient>
            <linearGradient id={id('mare')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5A2E3C" />
              <stop offset="1" stopColor="#2E1E2A" />
            </linearGradient>
            <linearGradient id={id('sabbia')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#C98C5E" />
              <stop offset="1" stopColor="#4A2E22" />
            </linearGradient>
            <radialGradient id={id('sole')}>
              <stop offset="0" stopColor="#FFE3BC" />
              <stop offset=".55" stopColor="#FFC184" stopOpacity=".55" />
              <stop offset="1" stopColor="#FF9A4D" stopOpacity="0" />
            </radialGradient>
            <pattern id={id('rete')} width="9" height="9" patternUnits="userSpaceOnUse">
              <path d="M0 0H9M0 0V9" stroke="#140C0C" strokeOpacity=".6" strokeWidth="1" fill="none" />
            </pattern>
            <clipPath id={id('palla')}>
              <circle r="30" />
            </clipPath>
          </defs>

          {/* Il cielo, il sole e l'alone, il mare. */}
          <rect x="-480" width="1350" height="520" fill={url('cielo')} />
          <circle cx="276" cy="500" r="150" fill={url('sole')} />
          <circle cx="276" cy="500" r="54" fill="#FFE1B8" />
          <rect x="-480" y="500" width="1350" height="80" fill={url('mare')} />
          {/* Il riflesso del sole: luccica (solo opacità). */}
          <g className="accesso-riflesso" fill="#FFC48A">
            <rect x="236" y="508" width="80" height="2.5" rx="1" />
            <rect x="248" y="518" width="56" height="2" rx="1" />
            <rect x="258" y="528" width="36" height="2" rx="1" />
            <rect x="266" y="538" width="20" height="1.5" rx="1" />
          </g>

          {/* La spiaggia con le impronte. */}
          <path d="M-480 572 L0 566 Q120 548 220 556 T390 560 L870 568 V844 H-480Z" fill={url('sabbia')} />
          <g fill="#2A1A14" opacity=".35">
            <ellipse cx="120" cy="690" rx="6" ry="3" />
            <ellipse cx="138" cy="676" rx="6" ry="3" />
            <ellipse cx="150" cy="700" rx="6" ry="3" />
            <ellipse cx="172" cy="684" rx="6" ry="3" />
          </g>

          {/* La rete: i pali, la maglia, la banda in alto e quella in basso. */}
          <rect x="22" y="340" width="7" height="330" fill="#140C0C" />
          <rect x="361" y="340" width="7" height="330" fill="#140C0C" />
          <rect x="29" y="362" width="332" height="74" fill={url('rete')} />
          <rect x="29" y="356" width="332" height="7" fill="#F2E9DE" />
          <rect x="29" y="434" width="332" height="4" fill="#F2E9DE" opacity=".8" />

          {/* La traiettoria e il pallone, che vola sul posto. */}
          <path d="M150 300 Q180 200 214 236" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
          <g transform="translate(232 214)">
            <g className="accesso-palla">
              <circle r="30" fill="#FFF7EE" />
              <g clipPath={url('palla')}>
                <path d="M-34 -14 C-12 -30 16 -30 34 -12" stroke="#FF6B1A" strokeWidth="9" fill="none" />
                <path d="M22 -30 C34 -6 30 18 14 34" stroke="#E8D9C8" strokeWidth="7" fill="none" />
                <path d="M-30 20 C-16 30 0 32 14 30" stroke="#E8D9C8" strokeWidth="7" fill="none" />
              </g>
              <circle r="30" fill="none" stroke="#1C1C1E" strokeWidth="2.5" />
            </g>
          </g>
        </svg>
      </div>
      {/* I due veli dal basso: corto per il Benvenuto, alto per i moduli. */}
      <div className="accesso-velo" data-velo="benvenuto" />
      <div className="accesso-velo" data-velo="modulo" />
    </div>
  )
}
