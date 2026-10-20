// ============================================================================
// Pallo, la mascotte del redesign: un pallone da beach con la fascia arancio,
// due braccini e una faccia. Compare dove l'app parla con te — il consiglio in
// Home, il ＋ che sbircia dallo sheet, l'assistente, la partita live, la
// segnalazione inviata, gli stati vuoti, Beach Wrapped.
//
// È SEMPRE decorativo (`aria-hidden`): quello che dice sta nel testo accanto.
// Le animazioni sono CSS (Pallo.css), solo transform e opacità, e si fermano
// con reduced-motion: ogni umore è disegnato perché anche il fotogramma fermo
// (reduced-motion, export PNG) si legga da solo. Ogni istanza ha i suoi
// `clipPath` (useId): due Pallo nella stessa pagina non si rubano il ritaglio.
//
// L'API, dalla più semplice:
//   <Pallo umore="saluta" size={96} />
//     `umore`      uno dei 14 di `PalloUmore`; `testa` è la sola testa di sempre.
//     `soloTesta`  l'inquadratura della sola testa per qualunque umore (avatar).
//     `segui`      gli occhi (e un filo la faccia) seguono il dito e il
//                  puntatore: transform sulle pupille in rAF, nessun render.
//     `vivo`       (di serie) ammicca e fa piccoli gesti a caso, mai a tempo.
//   ref → PalloHandle: `reagisci(umore?, ms?)` una reazione breve, `tocca()`
//     un tocco (il quinto di fila è la sorpresa), `sorpresa()` l'easter egg.
//   usePalloTocco(ref, onTocco) i gesti del pulsante che contiene Pallo: tocco
//     → reazione, tocco lungo o cinque di fila → sorpresa.
//
// Lo sguardo e la vita girano solo quando servono: Pallo in vista
// (IntersectionObserver), pagina visibile, niente reduced-motion. Senza
// IntersectionObserver (jsdom) resta il disegno, animato dal solo CSS.
// ============================================================================
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react'
import { LIT } from '../lib/theme'
import {
  ALLEGRI,
  CON_OMBRA,
  OCCHIALI_MS,
  PALLEGGIO_MS,
  PRESSIONE_LUNGA_MS,
  REAZIONE_MS,
  TOCCHI_DI_FILA,
  TOCCHI_GAP_MS,
  avviaVita,
} from './Pallo.vita'
import type { PalloSorpresa, PalloUmore } from './Pallo.vita'
import './Pallo.css'

export type { PalloUmore, PalloSorpresa } from './Pallo.vita'
export { PALLO_UMORI, REAZIONE_MS } from './Pallo.vita'

export interface PalloHandle {
  /**
   * Una reazione breve: un salto schiacciato e, per `ms`, `umore` (di default
   * uno a caso fra gli allegri, mai quello che ha già). Poi torna il suo.
   */
  reagisci: (umore?: PalloUmore, ms?: number) => void
  /** Un tocco: reagisce; il quinto di fila (a meno di 0,7s l'uno dall'altro) è la sorpresa. */
  tocca: () => void
  /** La sorpresa: senza tipo, a turno il palleggio e gli occhiali. */
  sorpresa: (tipo?: PalloSorpresa) => void
}

export interface PalloProps {
  umore?: PalloUmore
  /** Larghezza in px; l'altezza segue il disegno (120×130, la testa 96×96). */
  size?: number
  /** Il colore delle mani: bianco sulle slide arancioni di Wrapped. */
  mani?: string
  /** L'ellisse d'ombra sotto, che si stringe quando salta. Di serie negli umori in piedi. */
  ombra?: boolean
  /** Solo la testa (come `testa`), con la faccia dell'umore: l'avatar che pensa. */
  soloTesta?: boolean
  /** Gli occhi seguono il dito e il puntatore. */
  segui?: boolean
  /** Ammicca e fa piccoli gesti a caso. */
  vivo?: boolean
  className?: string
  style?: CSSProperties
}

const INK = LIT.ink
const ARANCIO = LIT.accent
const FILO = LIT.edge
const BIANCO = '#FFFFFF'
/** La sabbia della scena del Benvenuto: i coriandoli chiari. */
const SABBIA = '#FFC184'
/** La lacrima: l'unico azzurro di Pallo. */
const ACQUA = '#A8DCF5'

// ------------------------------------------------------------- le forme

const f = (n: number) => Math.round(n * 100) / 100

/** Un cuore centrato in (cx, cy), largo `l`. */
function cuore(cx: number, cy: number, l: number): string {
  const s = l / 18
  const p = (x: number, y: number) => `${f(cx + x * s)} ${f(cy + y * s)}`
  return `M${p(0, 8)} C${p(-3, 6)} ${p(-9, 1.5)} ${p(-9, -3.5)} C${p(-9, -6.8)} ${p(-6.6, -9)} ${p(-3.9, -9)} C${p(-2.1, -9)} ${p(-0.7, -8)} ${p(0, -6.5)} C${p(0.7, -8)} ${p(2.1, -9)} ${p(3.9, -9)} C${p(6.6, -9)} ${p(9, -6.8)} ${p(9, -3.5)} C${p(9, 1.5)} ${p(3, 6)} ${p(0, 8)}Z`
}

/** Una stellina a quattro punte, raggio `r`. */
function stella(cx: number, cy: number, r: number): string {
  const q = r * 0.2
  return `M${cx} ${cy - r} Q${f(cx + q)} ${f(cy - q)} ${cx + r} ${cy} Q${f(cx + q)} ${f(cy + q)} ${cx} ${cy + r} Q${f(cx - q)} ${f(cy + q)} ${cx - r} ${cy} Q${f(cx - q)} ${f(cy - q)} ${cx} ${cy - r}Z`
}

/** Un coriandolo: un rettangolino ruotato di `deg` (la rotazione è nel disegno, il CSS lo fa cadere). */
function coriandolo(cx: number, cy: number, deg: number, w = 3.4, h = 6.4): string {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const p = (x: number, y: number) => `${f(cx + x * c - y * s)} ${f(cy + x * s + y * c)}`
  return `M${p(-w / 2, -h / 2)} L${p(w / 2, -h / 2)} L${p(w / 2, h / 2)} L${p(-w / 2, h / 2)}Z`
}

/** Una goccia con la punta in alto, il tondo di raggio `r` centrato in (cx, cy). */
function goccia(cx: number, cy: number, r: number): string {
  return `M${cx} ${f(cy - r * 1.8)} C${f(cx + r * 0.25)} ${f(cy - r * 1.2)} ${cx + r} ${f(cy - r * 0.6)} ${cx + r} ${cy} A${r} ${r} 0 0 1 ${cx - r} ${cy} C${cx - r} ${f(cy - r * 0.6)} ${f(cx - r * 0.25)} ${f(cy - r * 1.2)} ${cx} ${f(cy - r * 1.8)}Z`
}

/** Una «z» larga `s`, l'angolo in alto a sinistra in (x, y). */
const zeta = (x: number, y: number, s: number) => `M${x} ${y} h${s} l${-s} ${f(s * 1.1)} h${s}`

const LENTE_SX = 'M34 52 H57 V58 Q57 68 47 68 H44 Q34 68 34 58 Z'
const LENTE_DX = 'M63 52 H86 V58 Q86 68 76 68 H73 Q63 68 63 58 Z'

const CORIANDOLI: [number, number, number, string][] = [
  [32, 9, 25, ARANCIO],
  [47, 3, -35, INK],
  [74, 5, 50, SABBIA],
  [90, 11, -20, ARANCIO],
  [4, 58, 70, SABBIA],
  [116, 66, -50, ARANCIO],
  [9, 100, 30, INK],
  [111, 104, -25, SABBIA],
]
const STELLINE: [number, number, number][] = [
  [60, 5, 4.5],
  [5, 80, 3.5],
  [115, 88, 3.5],
]

const i = (n: number) => ({ '--i': n }) as CSSProperties

/**
 * Le parti di un umore, dal fondo: ciò che sta dietro la palla, la faccia, ciò
 * che sta davanti, ciò che gira intorno. Con la sola testa restano la palla e
 * la faccia: braccia e contorno a 38px sarebbero briciole (la mano sul mento
 * di `pensa` diventava la coda di una «Q»).
 */
interface Disegno {
  /** L'animazione continua del corpo (classe in Pallo.css). */
  anim?: string
  /** L'animazione con la sola testa: solo quelle che non spostano (la testa sta in un avatar). */
  animTesta?: string
  /** Dietro la palla: le braccia che partono dai fianchi. */
  dietro?: ReactNode
  /** Gli occhi: ammiccano e seguono lo sguardo. */
  occhi?: ReactNode
  /** Il resto della faccia: bocca, sopracciglia, guance, occhiali, lacrima. Segue un filo lo sguardo. */
  viso?: ReactNode
  /** Davanti alla palla: le mani appoggiate di `sbircia`, la mano sul mento di `pensa`. */
  davanti?: ReactNode
  /** Intorno, fermi rispetto al corpo: coriandoli, «z», puntini, cuoricini. */
  intorno?: ReactNode
  defs?: ReactNode
}

const tratto = { fill: 'none', stroke: INK, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function disegna(umore: PalloUmore, mani: string, lenti: string): Disegno {
  const braccio = (d: string, cx: number, cy: number) => (
    <>
      <path d={d} {...tratto} />
      <circle cx={cx} cy={cy} r="5" fill={mani} stroke={INK} strokeWidth="3" />
    </>
  )
  const occhiAperti = (dy = 0, dx = 0) => (
    <>
      <ellipse cx={47 + dx} cy={60 + dy} rx="5" ry="7" fill={INK} />
      <ellipse cx={73 + dx} cy={60 + dy} rx="5" ry="7" fill={INK} />
      <circle cx={49 + dx} cy={57 + dy} r="1.8" fill={BIANCO} />
      <circle cx={75 + dx} cy={57 + dy} r="1.8" fill={BIANCO} />
    </>
  )
  const occhiFelici = <path d="M41 60 Q47 52 53 60M67 60 Q73 52 79 60" {...tratto} />
  const bracciaSu = (
    <>
      {braccio('M20 62 C8 54 6 40 12 30', 13, 28)}
      {braccio('M100 62 C112 54 114 40 108 30', 107, 28)}
    </>
  )
  const bracciaGiu = braccio('M20 76 C10 82 10 92 16 98', 17, 99)

  switch (umore) {
    case 'testa':
      return {
        occhi: (
          <>
            <ellipse cx="47" cy="62" rx="5" ry="7" fill={INK} />
            <ellipse cx="73" cy="62" rx="5" ry="7" fill={INK} />
          </>
        ),
        viso: <path d="M51 75 Q60 84 69 75" {...tratto} strokeWidth="4" />,
      }
    case 'esulta':
      return {
        anim: 'pallo-salto',
        dietro: bracciaSu,
        occhi: occhiFelici,
        viso: <path d="M49 70 Q60 70 71 70 Q68 84 60 84 Q52 84 49 70z" fill={INK} />,
      }
    case 'contento':
      return {
        anim: 'pallo-rimbalzo',
        dietro: bracciaSu,
        occhi: occhiFelici,
        viso: <path d="M51 72 Q60 82 69 72" {...tratto} />,
      }
    case 'preoccupato':
      return {
        anim: 'pallo-tentenna',
        occhi: (
          <>
            <circle cx="47" cy="62" r="5" fill={INK} />
            <circle cx="73" cy="62" r="5" fill={INK} />
          </>
        ),
        viso: <path d="M40 50 L53 54M80 50 L67 54M51 80 Q60 74 69 80" {...tratto} />,
      }
    case 'sbircia':
      return {
        anim: 'pallo-sbircia',
        occhi: occhiAperti(-4, -2),
        viso: <path d="M51 70 Q58 77 65 70" {...tratto} />,
        davanti: (
          <>
            {braccio('M18 98 C14 92 16 86 22 84', 24, 83)}
            {braccio('M102 98 C106 92 104 86 98 84', 96, 83)}
          </>
        ),
      }
    case 'festa':
      return {
        anim: 'pallo-festa',
        dietro: (
          <>
            <g className="pallo-agita-sx">{braccio('M20 60 C8 50 4 36 10 24', 11, 22)}</g>
            <g className="pallo-agita-dx">{braccio('M100 60 C112 50 116 36 110 24', 109, 22)}</g>
          </>
        ),
        occhi: occhiFelici,
        viso: (
          <>
            <path d="M48 70 Q60 70 72 70 Q69 86 60 86 Q51 86 48 70z" fill={INK} />
            <path d="M53.5 81 Q60 76.5 66.5 81 Q64 84.6 60 84.6 Q56 84.6 53.5 81z" fill={ARANCIO} />
          </>
        ),
        intorno: (
          <>
            {CORIANDOLI.map(([x, y, r, c], n) => (
              <path key={`c${n}`} className="pallo-coriandolo" style={i(n)} d={coriandolo(x, y, r)} fill={c} />
            ))}
            {STELLINE.map(([x, y, r], n) => (
              <path key={`s${n}`} className="pallo-stella" style={i(n)} d={stella(x, y, r)} fill={ARANCIO} />
            ))}
          </>
        ),
      }
    case 'triste':
      return {
        anim: 'pallo-affloscia',
        dietro: (
          <>
            {braccio('M19 74 C13 84 13 96 17 104', 17, 106)}
            {braccio('M101 74 C107 84 107 96 103 104', 103, 106)}
          </>
        ),
        occhi: (
          <>
            <ellipse cx="47" cy="65" rx="4.5" ry="6" fill={INK} />
            <ellipse cx="73" cy="65" rx="4.5" ry="6" fill={INK} />
            <circle cx="48.4" cy="62.6" r="1.6" fill={BIANCO} />
            <circle cx="74.4" cy="62.6" r="1.6" fill={BIANCO} />
          </>
        ),
        viso: (
          <>
            <path d="M39 53 L52 48M81 53 L68 48M50 85 Q60 76 70 85" {...tratto} />
            <path className="pallo-lacrima" d={goccia(39, 76, 3.6)} fill={ACQUA} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          </>
        ),
      }
    case 'pensa':
      return {
        anim: 'pallo-pensa',
        animTesta: 'pallo-pensa',
        dietro: bracciaGiu,
        occhi: (
          <g className="pallo-pensa-occhi">
            <ellipse cx="49" cy="55" rx="5" ry="7" fill={INK} />
            <ellipse cx="75" cy="55" rx="5" ry="7" fill={INK} />
            <circle cx="51" cy="52" r="1.8" fill={BIANCO} />
            <circle cx="77" cy="52" r="1.8" fill={BIANCO} />
          </g>
        ),
        viso: <path d="M42 45 Q48 43 54 44M68 41 Q75 35 82 40M54 78 Q59 75.5 66 78.5" {...tratto} />,
        davanti: braccio('M100 79 C107 97 99 112 85 111 C77 110 72 103 69 97', 68, 95),
        intorno: (
          <>
            <circle className="pallo-puntino" style={i(0)} cx="90" cy="16" r="3.2" fill={INK} />
            <circle className="pallo-puntino" style={i(1)} cx="100" cy="11" r="3.2" fill={INK} />
            <circle className="pallo-puntino" style={i(2)} cx="110" cy="6" r="3.2" fill={INK} />
          </>
        ),
      }
    case 'dorme':
      return {
        anim: 'pallo-respira',
        dietro: (
          <>
            {braccio('M20 80 C12 88 12 100 18 106', 18, 108)}
            {braccio('M100 80 C108 88 108 100 102 106', 102, 108)}
          </>
        ),
        occhi: <path d="M40 62 Q47 68 54 62M66 62 Q73 68 80 62" {...tratto} />,
        viso: <ellipse className="pallo-russa" cx="60" cy="80" rx="3.4" ry="4" fill={INK} />,
        intorno: (
          <>
            <path className="pallo-zeta" style={i(0)} d={zeta(96, 22, 5)} {...tratto} strokeWidth="2.6" />
            <path className="pallo-zeta" style={i(1)} d={zeta(103, 11, 6.5)} {...tratto} strokeWidth="2.6" />
            <path className="pallo-zeta" style={i(2)} d={zeta(111, 0, 8)} {...tratto} strokeWidth="2.6" />
          </>
        ),
      }
    case 'sorpreso':
      return {
        anim: 'pallo-sobbalza',
        dietro: (
          <>
            {braccio('M18 66 C6 62 2 50 6 40', 6, 38)}
            {braccio('M102 66 C114 62 118 50 114 40', 114, 38)}
          </>
        ),
        occhi: (
          <>
            <ellipse cx="46" cy="57" rx="6.5" ry="8.5" fill={INK} />
            <ellipse cx="74" cy="57" rx="6.5" ry="8.5" fill={INK} />
            <circle cx="48.6" cy="53.4" r="2.4" fill={BIANCO} />
            <circle cx="76.6" cy="53.4" r="2.4" fill={BIANCO} />
          </>
        ),
        viso: (
          <>
            <path d="M38 43 Q45 37 53 41M67 41 Q75 37 82 43" {...tratto} />
            <ellipse cx="60" cy="81" rx="6" ry="7.5" fill={INK} />
          </>
        ),
        intorno: (
          <g className="pallo-stupore">
            <path d="M60 10 V3M45 13 L41 7M75 13 L79 7" {...tratto} strokeWidth="3" />
          </g>
        ),
      }
    case 'occhiolino':
      return {
        anim: 'pallo-strizza',
        dietro: (
          <>
            {bracciaGiu}
            {braccio('M100 66 C111 60 113 50 109 42', 109, 40)}
          </>
        ),
        occhi: (
          <>
            <ellipse cx="47" cy="60" rx="5" ry="7" fill={INK} />
            <circle cx="49" cy="57" r="1.8" fill={BIANCO} />
          </>
        ),
        viso: <path d="M66 61 Q73 54 80 61M49 73 Q61 85 72 71" {...tratto} />,
        intorno: <path className="pallo-stella" style={i(0)} d={stella(97, 21, 6)} fill={ARANCIO} />,
      }
    case 'cool':
      return {
        anim: 'pallo-dondola',
        dietro: (
          <>
            {braccio('M19 72 C6 74 6 90 22 93', 25, 93)}
            {braccio('M100 64 C112 58 116 46 112 36', 112, 34)}
          </>
        ),
        viso: (
          <>
            <g className="pallo-occhiali">
              <path d="M34 55 L18 50M86 55 L102 50M57 55 Q60 52.5 63 55" {...tratto} strokeWidth="3" />
              <path d={LENTE_SX} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d={LENTE_DX} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M38.5 56 L42.5 62M67.5 56 L71.5 62" stroke={BIANCO} strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
              <g clipPath={`url(#${lenti})`}>
                <path className="pallo-riflesso" d="M18 70 L30 50" stroke={BIANCO} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
              </g>
            </g>
            <path d="M52 77 Q62 83 70 74" {...tratto} />
            <path className="pallo-stella" style={i(1)} d={stella(30, 46, 4.5)} fill={ARANCIO} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          </>
        ),
        defs: (
          <clipPath id={lenti}>
            <path d={LENTE_SX} />
            <path d={LENTE_DX} />
          </clipPath>
        ),
      }
    case 'cuori':
      return {
        anim: 'pallo-dondola',
        dietro: bracciaSu,
        occhi: (
          <>
            <path className="pallo-cuore" d={cuore(47, 60, 17)} fill={ARANCIO} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
            <path className="pallo-cuore" d={cuore(73, 60, 17)} fill={ARANCIO} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          </>
        ),
        viso: (
          <>
            <ellipse cx="35" cy="73" rx="5" ry="3" fill={ARANCIO} opacity="0.3" />
            <ellipse cx="85" cy="73" rx="5" ry="3" fill={ARANCIO} opacity="0.3" />
            <path d="M50 72 Q60 72 70 72 Q68 83 60 83 Q52 83 50 72z" fill={INK} />
          </>
        ),
        intorno: (
          <>
            <path className="pallo-cuoricino" style={i(0)} d={cuore(86, 8, 10)} fill={ARANCIO} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
            <path className="pallo-cuoricino" style={i(1)} d={cuore(34, 7, 8)} fill={ARANCIO} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          </>
        ),
      }
    default:
      // saluta
      return {
        anim: 'pallo-rimbalzo',
        dietro: (
          <>
            {bracciaGiu}
            <g className="pallo-saluto">{braccio('M100 66 C111 60 113 50 109 42', 109, 40)}</g>
          </>
        ),
        occhi: occhiAperti(),
        viso: <path d="M51 73 Q60 83 69 73" {...tratto} />,
      }
  }
}

// ------------------------------------------------------------- Pallo

export const Pallo = forwardRef<PalloHandle, PalloProps>(function Pallo(
  { umore = 'saluta', size = 96, mani = ARANCIO, ombra = CON_OMBRA.has(umore), soloTesta = false, segui = false, vivo = true, className, style },
  ref,
) {
  const id = useId().replace(/:/g, '')
  const clip = `pallo-c-${id}`
  const svgRef = useRef<SVGSVGElement>(null)
  const [reazione, setReazione] = useState<{ umore: PalloUmore; n: number } | null>(null)
  const [sorpresa, setSorpresa] = useState<PalloSorpresa | null>(null)
  const visibile: PalloUmore = sorpresa === 'occhiali' ? 'cool' : sorpresa === 'palleggio' ? 'esulta' : (reazione?.umore ?? umore)
  const testa = umore === 'testa' || soloTesta
  const box = testa ? ([12, 12, 96, 96] as const) : ([0, 0, 120, 130] as const)
  const h = testa ? size : Math.round((size * 130) / 120)

  const visibileRef = useRef(visibile)
  visibileRef.current = visibile
  const boxRef = useRef(box)
  boxRef.current = box
  // Lo sguardo e la vita sono codice DOM (Pallo.vita.ts, lo usa anche la
  // landing): umore e inquadratura si leggono dai ref a ogni giro, cambiarli
  // non riaccende niente.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    return avviaVita(svg, { segui, vivo, umore: () => visibileRef.current, box: () => boxRef.current })
  }, [segui, vivo])

  const stato = useRef({ fine: 0, n: 0, tocchi: 0, ultimo: 0, turno: 0 })
  useEffect(() => {
    const s = stato.current
    return () => window.clearTimeout(s.fine)
  }, [])

  useImperativeHandle(ref, () => {
    const s = stato.current
    const reagisci = (u?: PalloUmore, ms = REAZIONE_MS) => {
      window.clearTimeout(s.fine)
      const scelte = ALLEGRI.filter((x) => x !== visibileRef.current)
      s.n++
      setSorpresa(null)
      setReazione({ umore: u ?? scelte[Math.floor(Math.random() * scelte.length)], n: s.n })
      s.fine = window.setTimeout(() => setReazione(null), ms)
    }
    const sorprendi = (tipo?: PalloSorpresa) => {
      window.clearTimeout(s.fine)
      const scelta = tipo ?? (s.turno++ % 2 === 0 ? 'palleggio' : 'occhiali')
      setReazione(null)
      setSorpresa(scelta)
      s.fine = window.setTimeout(() => setSorpresa(null), scelta === 'palleggio' ? PALLEGGIO_MS : OCCHIALI_MS)
    }
    return {
      reagisci,
      sorpresa: sorprendi,
      tocca: () => {
        const ora = Date.now()
        s.tocchi = ora - s.ultimo < TOCCHI_GAP_MS ? s.tocchi + 1 : 1
        s.ultimo = ora
        if (s.tocchi >= TOCCHI_DI_FILA) {
          s.tocchi = 0
          sorprendi()
        } else reagisci()
      },
    }
  }, [])

  const d = disegna(visibile, mani, `pallo-l-${id}`)
  const anim = testa ? d.animTesta : d.anim

  return (
    <svg
      ref={svgRef}
      className={className ? `pallo ${className}` : 'pallo'}
      data-umore={visibile}
      data-testa={testa ? '' : undefined}
      // Due nomi che si alternano: la reazione riparte a ogni tocco.
      data-tocco={reazione ? reazione.n % 2 : undefined}
      data-sorpresa={sorpresa ?? undefined}
      width={size}
      height={h}
      viewBox={box.join(' ')}
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="60" r="44" />
        </clipPath>
        {d.defs}
      </defs>
      {ombra && !testa && <ellipse className="pallo-ombra" cx="60" cy="122" rx="30" ry="4" fill={FILO} />}
      <g className="pallo-tocco">
        <g className="pallo-giro">
          <g className="pallo-idle">
            <g className={anim ? `pallo-corpo ${anim}` : 'pallo-corpo'}>
              {!testa && d.dietro}
              <circle cx="60" cy="60" r="44" fill={BIANCO} />
              <g clipPath={`url(#${clip})`}>
                <path d="M8 36 C40 16 84 16 114 38" stroke={ARANCIO} strokeWidth="13" fill="none" />
                <path d="M98 16 C116 48 110 86 88 108" stroke={FILO} strokeWidth="11" fill="none" />
                {!testa && <path d="M12 96 C30 108 52 112 74 108" stroke={FILO} strokeWidth="10" fill="none" />}
              </g>
              <circle cx="60" cy="60" r="44" fill="none" stroke={INK} strokeWidth={testa ? 4 : 3.5} />
              <g className="pallo-volto">
                {d.occhi && (
                  <g className="pallo-sguardo">
                    <g className="pallo-guarda">
                      <g className="pallo-occhi">{d.occhi}</g>
                    </g>
                  </g>
                )}
                {d.viso}
              </g>
              {!testa && d.davanti}
            </g>
          </g>
        </g>
      </g>
      {!testa && d.intorno}
    </svg>
  )
})

/**
 * I gesti del pulsante che contiene Pallo (in Home: «un altro consiglio»).
 * Il click — tocco, Invio, Spazio — fa reagire Pallo e chiama `onTocco`; il
 * quinto di fila è la sorpresa. Un tocco lungo fa la sorpresa e basta: il
 * click che arriva quando si stacca il dito non cambia anche il consiglio.
 * Da spargere sul `<button>` (`{...gesti}`).
 */
export function usePalloTocco(ref: RefObject<PalloHandle | null>, onTocco?: () => void) {
  const s = useRef({ timer: 0, premuto: false, lungo: false, ignoraFino: 0 })
  useEffect(() => {
    const x = s.current
    return () => window.clearTimeout(x.timer)
  }, [])
  const fine = () => {
    const x = s.current
    window.clearTimeout(x.timer)
    x.premuto = false
    if (x.lungo) {
      x.lungo = false
      x.ignoraFino = Date.now() + 500
    }
  }
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      // Solo il tasto principale: il destro apre il suo menu.
      if (e.button > 0) return
      const x = s.current
      window.clearTimeout(x.timer)
      x.premuto = true
      x.lungo = false
      x.timer = window.setTimeout(() => {
        x.lungo = true
        ref.current?.sorpresa()
      }, PRESSIONE_LUNGA_MS)
    },
    onPointerUp: fine,
    onPointerLeave: fine,
    onPointerCancel: fine,
    // Il tocco lungo non apre il menu contestuale (Android).
    onContextMenu: (e: ReactMouseEvent<HTMLElement>) => {
      if (s.current.premuto) e.preventDefault()
    },
    onClick: () => {
      if (Date.now() < s.current.ignoraFino) return
      ref.current?.tocca()
      onTocco?.()
    },
  }
}
