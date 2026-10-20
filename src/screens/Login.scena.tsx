// ============================================================================
// La scena dell'accesso: il tramonto in spiaggia, con due giocatori che
// palleggiano sopra la rete, la palma, i gabbiani, una barca a vela e il
// sole che tocca il mare (il disegno del redesign, 390×844). È UNA scena per
// tutte e tre le viste: il Benvenuto la mostra intera, Accedi e Registrati
// la avvicinano appena (l'«inquadratura» della camera), così passare da una
// vista all'altra è un movimento di macchina e non un cambio di fondale.
// Il palleggio sta tutto sopra la linea della sabbia: i moduli, ancorati in
// basso, non lo coprono, e la camera non deve più alzare la scena.
//
// Il disegno è largo 390 (il telefono del design), ma il viewBox è 1350:
// cielo, mare e sabbia proseguono ai lati. Su un telefono in verticale lo
// `slice` mostra esattamente i 390 centrali, come nel design; su un tablet o
// un desktop in orizzontale si vede il panorama.
//
// I movimenti:
//   - in CSS (Login.scena.css): lo zoom lento della scena, la palma che ondeggia,
//     le nuvole, i gabbiani, la barca, la schiuma, l'alone del sole e il
//     riflesso sull'acqua;
//   - in JS (`avviaPalleggio`, Login.palleggio.dom.ts): i due giocatori e il
//     pallone, calcolati in Login.palleggio.ts e scritti negli attributi a
//     ogni fotogramma, senza rifare il render di React.
// Con reduced-motion è tutto fermo: resta un fotogramma del palleggio.
//
// Decorativa (`aria-hidden`): quello che dice lo dicono i titoli accanto. I
// colori sono quelli dell'illustrazione, letterali come in Pallo e nella
// mappa: non sono palette dell'interfaccia.
// ============================================================================
import { useEffect, useId, useRef } from 'react'
import type { RefObject } from 'react'
import { FERMO } from './Login.palleggio'
import { avviaPalleggio } from './Login.palleggio.dom'
import './Login.scena.css'

export type Inquadratura = 'benvenuto' | 'accedi' | 'registrati'

const OMINO = '#1A1012'
const OMINO_DIETRO = '#2E1A20'

// La schiuma è un'onda di passo 20 che scorre di 40: si allunga a tutto il
// panorama tenendo la fase del disegno (che parte da -20).
const SCHIUMA = `M-500 343 q10 -4 20 0${' t20 0'.repeat(71)}`

export function Scena({ inquadratura }: { inquadratura: Inquadratura }) {
  // Gli id dei gradienti sono per istanza: due scene montate insieme (il
  // passaggio fra due viste in un test, un'anteprima) non si rubano i `url()`.
  const uid = useId().replace(/:/g, '')
  const id = (n: string) => `scena-${n}-${uid}`
  const url = (n: string) => `url(#${id(n)})`
  const svg = useRef<SVGSVGElement>(null)
  usePalleggio(svg)

  const { pallone, ombra } = FERMO

  return (
    <div className="accesso-scena" data-inquadratura={inquadratura} aria-hidden="true">
      <div className="accesso-camera">
        <svg ref={svg} className="accesso-scena-svg" viewBox="-480 0 1350 844" preserveAspectRatio="xMidYMid slice" focusable="false">
          {/* Tre piani, dal fondo: cielo, sole, terra. Il disegno e l'ordine
              di pittura sono quelli di sempre. Ogni piano porta le sue
              definizioni. */}
          <g data-piano="cielo">
            <defs>
              <linearGradient id={id('cielo')} x1="0" y1="0" x2="0" y2="340" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#1B1626" />
                <stop offset=".42" stopColor="#6E3440" />
                <stop offset=".72" stopColor="#E06B35" />
                <stop offset="1" stopColor="#FFB46A" />
              </linearGradient>
            </defs>

            {/* Il cielo, con le nuvole e i gabbiani che lo attraversano. */}
            <rect x="-480" width="1350" height="844" fill={url('cielo')} />
            <g className="accesso-nuvola" fill="#F6A07A" opacity=".45">
              <rect x="40" y="132" width="150" height="7" rx="3.5" />
              <rect x="80" y="144" width="96" height="5" rx="2.5" />
            </g>
            <g className="accesso-nuvola" data-nuvola="2" fill="#FFC08F" opacity=".4">
              <rect x="210" y="196" width="130" height="6" rx="3" />
              <rect x="236" y="207" width="70" height="4" rx="2" />
            </g>
            <g className="accesso-gabbiani" stroke="#2A1620" strokeWidth="2" fill="none" strokeLinecap="round">
              <g transform="translate(0 92)">
                <path className="accesso-ala" d="M-7 0 Q-3.5 -5 0 0 Q3.5 -5 7 0" />
              </g>
              <g transform="translate(20 80)">
                <path className="accesso-ala" data-ala="2" d="M-5 0 Q-2.5 -4 0 0 Q2.5 -4 5 0" />
              </g>
              <g transform="translate(34 98)">
                <path className="accesso-ala" d="M-4 0 Q-2 -3 0 0 Q2 -3 4 0" />
              </g>
            </g>
          </g>

          {/* Il sole col suo alone. */}
          <g data-piano="sole">
            <defs>
              <radialGradient id={id('sole')}>
                <stop offset="0" stopColor="#FFE3BC" />
                <stop offset=".55" stopColor="#FFC184" stopOpacity=".55" />
                <stop offset="1" stopColor="#FF9A4D" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="accesso-alone" cx="300" cy="300" r="140" fill={url('sole')} />
            <circle cx="300" cy="300" r="42" fill="#FFE1B8" />
          </g>

          <g data-piano="terra">
            <defs>
              <linearGradient id={id('mare')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5A2E3C" />
                <stop offset="1" stopColor="#2E1E2A" />
              </linearGradient>
              <linearGradient id={id('sabbia')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#C98C5E" />
                <stop offset="1" stopColor="#4A2E22" />
              </linearGradient>
              <pattern id={id('rete')} width="9" height="9" patternUnits="userSpaceOnUse">
                <path d="M0 0H9M0 0V9" stroke="#140C0C" strokeOpacity=".6" strokeWidth="1" fill="none" />
              </pattern>
              <clipPath id={id('palla')}>
                <circle r="11" />
              </clipPath>
            </defs>

            {/* Il mare, il riflesso che luccica, la barca. */}
            <rect x="-480" y="300" width="1350" height="60" fill={url('mare')} />
            <g className="accesso-riflesso" fill="#FFC48A">
              <rect x="262" y="306" width="76" height="2.5" rx="1" />
              <rect x="272" y="314" width="56" height="2" rx="1" />
              <rect x="282" y="322" width="36" height="2" rx="1" />
              <rect x="290" y="330" width="20" height="1.5" rx="1" />
            </g>
            <g className="accesso-barca" fill="#2A1620">
              <g transform="translate(40 300)">
                <path d="M0 -2 L0 -22 L12 -2Z" />
                <path d="M-1 -20 L-9 -3 L-1 -3Z" opacity=".8" />
                <path d="M-11 -1 H15 L12 3 H-8Z" />
              </g>
            </g>

            {/* La spiaggia e la schiuma sulla riva. */}
            <path d="M-480 348 L0 346 Q120 334 220 340 T390 342 L870 344 V844 H-480Z" fill={url('sabbia')} />
            <path className="accesso-schiuma" d={SCHIUMA} fill="none" stroke="#FFD9B5" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />

            {/* La palma: il tronco prosegue sotto il bordo, per il panorama. */}
            <g className="accesso-palma" fill="none" stroke={OMINO} strokeLinecap="round">
              <path d="M-20.8 521 L-4 430 Q20 300 52 164" strokeWidth="11" />
              <g transform="translate(52 164)" strokeWidth="6">
                <path d="M0 0 Q30 -26 70 -4" />
                <path d="M0 0 Q40 -4 62 30" />
                <path d="M0 0 Q10 -36 46 -46" />
                <path d="M0 0 Q-24 -30 -50 -18" />
                <path d="M0 0 Q-30 2 -44 30" />
                <path d="M0 0 Q-4 -30 10 -56" />
              </g>
              <g transform="translate(52 164)" fill={OMINO} stroke="none">
                <circle cx="-4" cy="6" r="5" />
                <circle cx="5" cy="8" r="5" />
              </g>
            </g>

            {/* La rete, vista di taglio: la maglia, i pali, le due bande. */}
            <polygon points="180,240 212,253 212,280 180,272" fill={OMINO} />
            <polygon points="180,240 212,253 212,280 180,272" fill={url('rete')} />
            <rect x="178" y="236" width="4" height="116" rx="1.5" fill="#140C0C" />
            <rect x="210" y="250" width="3.5" height="74" rx="1.5" fill="#140C0C" />
            <path d="M180 240 L212 253" stroke="#F2E9DE" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M180 272 L212 280" stroke="#F2E9DE" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />

            {/* L'ombra del pallone, i due giocatori, il pallone. */}
            <g data-ombra="" transform={`translate(${ombra.x.toFixed(1)} 344) scale(${ombra.scala.toFixed(2)} 1)`}>
              <ellipse rx="12" ry="3" fill="#2A1A14" opacity={ombra.opacita.toFixed(2)} />
            </g>
            <Giocatore lato={0} />
            <Giocatore lato={1} />
            <g data-pallone="" transform={`translate(${pallone.x.toFixed(1)} ${pallone.y.toFixed(1)}) rotate(${pallone.giro.toFixed(1)})`}>
              <circle r="11" fill="#FFF7EE" />
              <g clipPath={url('palla')}>
                <path d="M-13 -5 C-4 -11 6 -11 13 -4" stroke="#FF6B1A" strokeWidth="3.4" fill="none" />
                <path d="M8 -11 C13 -2 11 7 5 13" stroke="#E8D9C8" strokeWidth="2.6" fill="none" />
                <path d="M-11 7 C-6 11 0 12 5 11" stroke="#E8D9C8" strokeWidth="2.6" fill="none" />
              </g>
              <circle r="11" fill="none" stroke="#1C1C1E" strokeWidth="1.5" />
            </g>
          </g>
        </svg>
      </div>
      {/* I due veli dal basso: uno per il Benvenuto, uno più scuro per i moduli. */}
      <div className="accesso-velo" data-velo="benvenuto" />
      <div className="accesso-velo" data-velo="modulo" />
    </div>
  )
}

/**
 * Un giocatore: la giocatrice con la coda a sinistra, quello col cappellino
 * a destra (lo stesso omino, specchiato). Ogni tratto porta il nome della
 * sua parte di `Posa`: `avviaPalleggio` lo ritrova e lo riscrive.
 */
function Giocatore({ lato }: { lato: 0 | 1 }) {
  const p = FERMO.giocatori[lato]
  return (
    <g
      data-giocatore={lato}
      transform={lato === 0 ? 'translate(84 336)' : 'translate(306 336) scale(-1 1)'}
      fill="none"
      stroke={OMINO}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path data-parte="braccioLontano" d={p.braccioLontano} stroke={OMINO_DIETRO} strokeWidth="5" />
      <path data-parte="gambaDietro" d={p.gambaDietro} stroke={OMINO_DIETRO} strokeWidth="7.5" />
      <path data-parte="gambaAvanti" d={p.gambaAvanti} strokeWidth="7.5" />
      <path data-parte="busto" d={p.busto} strokeWidth="12.5" />
      {lato === 0 && <path data-parte="coda" d={p.coda} strokeWidth="4" />}
      <circle data-parte="testa" cx={p.testa[0].toFixed(1)} cy={p.testa[1].toFixed(1)} r="7.5" fill={OMINO} stroke="none" />
      {lato === 1 && <path data-parte="visiera" d={p.visiera} strokeWidth="3" />}
      <path data-parte="braccioVicino" d={p.braccioVicino} strokeWidth="5.5" />
    </g>
  )
}

/**
 * Il palleggio vivo: il pilota DOM di Login.palleggio.dom.ts, che scrive gli
 * attributi dei tratti, del pallone e della sua ombra a ogni fotogramma senza
 * passare da React. Si ferma con reduced-motion (anche se la preferenza cambia
 * mentre l'accesso è aperto: si torna al fotogramma fermo), fuori vista, con
 * la scheda nascosta e allo smontaggio.
 */
function usePalleggio(svg: RefObject<SVGSVGElement>) {
  useEffect(() => {
    const el = svg.current
    if (!el) return
    return avviaPalleggio(el)
  }, [svg])
}
