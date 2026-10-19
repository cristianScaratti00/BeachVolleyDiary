// ============================================================================
// Il vetro liquido (ART_DIRECTION §0) di tutta l'app: le barre e i pulsanti
// che galleggiano sopra il contenuto — TabBar e la sua pillola, i pulsanti di
// vetro in cima ai dettagli, le azioni in fondo al torneo, il campo
// dell'assistente — e ogni pulsante `variant="glass"`.
//
// È uno STRATO dietro a un controllo (`layer`: assoluto, `inset: 0`, raggio
// ereditato, `aria-hidden`, niente tocchi): il ruolo e il nome stanno sul
// controllo che lo contiene. Due livelli, uno sopra l'altro:
//   1. il MATERIALE (`data-material`, materials.css): tinta, luce sul bordo,
//      spessore e ombra. È ciò che si vede finché la libreria non c'è, e il
//      ripiego dappertutto dove il vetro non si vuole (test, trasparenza
//      ridotta, contrasto alto, colori forzati);
//   2. **liquid-glass-react** (rdev): il vetro vero — la sfocatura col filtro
//      SVG di spostamento e l'aberrazione cromatica sul bordo. I suoi bordi di
//      luce si spengono (LiquidGlass.css): la luce la disegna il materiale,
//      sopra la sfocatura. La libreria è fatta per un elemento
//      centrato in posizione assoluta: qui la si centra nello strato e le si
//      dà la misura dell'elemento che la ospita (ResizeObserver; a ogni cambio
//      di misura si rimonta, perché lei si misura solo all'inizio). La sua
//      luce segue il puntatore sull'elemento ospite (`mouseContainer`).
//
// Il filtro SVG di spostamento dentro un `backdrop-filter` lo sa disegnare
// solo Blink (Chrome, Edge, Android). Su WebKit (Safari, ogni browser di iOS)
// e Gecko la libreria resta — bordi, luce, ombra, sfocatura — e si spegne
// soltanto il filtro (`data-engine`, LiquidGlass.css), che lì farebbe sparire
// la sfocatura invece di piegarla.
//
// Costi: la libreria arriva in lazy (un chunk suo) al primo vetro montato, e
// ogni strato la monta solo mentre è in vista (IntersectionObserver): una lista
// di quaranta «Storia» non tiene accesi quaranta filtri.
// ============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, CSSProperties, HTMLAttributes, ReactNode, RefObject } from 'react'
import './LiquidGlass.css'

type LibProps = {
  children: ReactNode
  displacementScale?: number
  blurAmount?: number
  saturation?: number
  aberrationIntensity?: number
  elasticity?: number
  cornerRadius?: number
  mouseContainer?: RefObject<HTMLElement | null> | null
  className?: string
  padding?: string
  style?: CSSProperties
  overLight?: boolean
  mode?: 'standard' | 'polar' | 'prominent' | 'shader'
}
type Lib = ComponentType<LibProps>

/** Le ricette: quanto piega il bordo, quanto sfoca, quanto separa i colori. */
export type Variante = 'regular' | 'lente' | 'clear'
const RICETTE: Record<Variante, Pick<LibProps, 'displacementScale' | 'blurAmount' | 'saturation' | 'aberrationIntensity'>> = {
  // blur = 4 + blurAmount × 32 (la formula della libreria): 10px.
  regular: { displacementScale: 46, blurAmount: 0.1875, saturation: 180, aberrationIntensity: 1.6 },
  // La pillola della tab accesa: una lente sopra la capsula, piega di più.
  lente: { displacementScale: 70, blurAmount: 0.0625, saturation: 190, aberrationIntensity: 2 },
  // Il vetro chiaro sul buio (Benvenuto, Accedi) e sopra i media (Wrapped, Storia).
  clear: { displacementScale: 40, blurAmount: 0.3125, saturation: 170, aberrationIntensity: 1.2 },
}

type Motore = 'blink' | 'webkit' | 'gecko'

let deciso: { attivo: boolean; motore: Motore } | null = null

function ambiente(): { attivo: boolean; motore: Motore } {
  if (deciso) return deciso
  deciso = { attivo: false, motore: 'webkit' }
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return deciso
  const ua = navigator.userAgent
  if (/jsdom/i.test(ua)) return deciso
  const mq = (q: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(q).matches : false)
  if (mq('(prefers-reduced-transparency: reduce)') || mq('(prefers-contrast: more)') || mq('(forced-colors: active)')) return deciso
  if (typeof CSS === 'undefined' || !(CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))) return deciso
  // Su iOS ogni browser è WebKit, anche quelli che si chiamano Chrome; l'iPad
  // si presenta come un Mac col touch, ma senza «Chrome/» nella UA.
  const chromium = /(?:Chrome|Chromium|Edg)\//.test(ua)
  const ios = /iPhone|iPad|iPod|CriOS|EdgiOS|FxiOS/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && !chromium)
  const motore: Motore = /firefox|fxios/i.test(ua) && !ios ? 'gecko' : !ios && chromium ? 'blink' : 'webkit'
  deciso = { attivo: true, motore }
  return deciso
}

// Un solo download per pagina, condiviso da tutti i vetri.
let caricamento: Promise<Lib | null> | null = null
let caricata: Lib | null = null

function caricaLib(): Promise<Lib | null> {
  caricamento ??= import('liquid-glass-react')
    .then((m) => (caricata = m.default as unknown as Lib))
    // Senza rete (o con un deploy nuovo) resta il materiale: niente errore.
    .catch(() => null)
  return caricamento
}

/** La libreria, dopo il montaggio, dove il vetro si vuole; `null` altrove e finché non arriva. */
export function useVetroLiquido(): Lib | null {
  const [lib, setLib] = useState<Lib | null>(() => (ambiente().attivo ? caricata : null))
  useEffect(() => {
    if (!ambiente().attivo) return
    let vivo = true
    caricaLib().then((l) => {
      if (vivo && l) setLib(() => l)
    })
    return () => {
      vivo = false
    }
  }, [])
  return lib
}

interface Misura {
  w: number
  h: number
  r: number
}

/** La misura dello strato (= dell'elemento che lo ospita) e il suo raggio. */
function useMisura(ref: RefObject<HTMLElement | null>, attivo: boolean): Misura | null {
  const [m, setM] = useState<Misura | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !attivo || typeof ResizeObserver === 'undefined') return
    const leggi = () => {
      const w = Math.round(el.offsetWidth)
      const h = Math.round(el.offsetHeight)
      if (!w || !h) return
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2, w / 2)
      setM((p) => (p && p.w === w && p.h === h && p.r === r ? p : { w, h, r }))
    }
    leggi()
    const ro = new ResizeObserver(leggi)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, attivo])
  return m
}

/** In vista (con un margine): fuori, il filtro si smonta. Senza IO, sempre. */
function useInVista(ref: RefObject<HTMLElement | null>, attivo: boolean): boolean {
  const [dentro, setDentro] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || !attivo || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setDentro(e.isIntersecting), { rootMargin: '120px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, attivo])
  return dentro
}

export interface LiquidGlassProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children?: ReactNode
  /** Strato dietro a un controllo: assoluto, `inset: 0`, raggio ereditato. */
  layer?: boolean
  /** Il materiale di base (default `glass-regular`; `glass-media` sopra foto e colori pieni). */
  material?: 'glass-regular' | 'glass-clear' | 'glass-media'
  /** La ricetta del vetro (default: `clear` sul buio e sui media, altrimenti `regular`). */
  variante?: Variante
}

export function LiquidGlass({ children, layer, material = 'glass-regular', variante, className, style, ...rest }: LiquidGlassProps) {
  const ref = useRef<HTMLDivElement>(null)
  const ospite = useRef<HTMLElement | null>(null)
  const Lib = useVetroLiquido()
  const vivo = !!Lib && !!layer
  const misura = useMisura(ref, vivo)
  const inVista = useInVista(ref, vivo)
  const ricetta = variante ?? (material === 'glass-regular' ? 'regular' : 'clear')

  useLayoutEffect(() => {
    ospite.current = ref.current?.parentElement ?? null
  })

  // z-index -2: sotto lo strato di stato (::before, -1) di pulsanti e righe.
  const posa: CSSProperties = layer
    ? { position: 'absolute', inset: 0, borderRadius: 'inherit', zIndex: -2, pointerEvents: 'none' }
    : {}
  const cls = className ? `ui-liquid ${className}` : 'ui-liquid'
  const acceso = vivo && misura && inVista

  return (
    <div
      {...rest}
      ref={ref}
      className={cls}
      data-material={material}
      data-variante={ricetta}
      data-liquid={acceso ? '' : undefined}
      data-engine={acceso ? ambiente().motore : undefined}
      aria-hidden={layer ? true : rest['aria-hidden']}
      style={{ ...posa, ...style }}
    >
      {acceso && Lib && misura && (
        <Lib
          // La libreria misura sé stessa una volta sola: a misura nuova, istanza nuova.
          key={`${misura.w}x${misura.h}x${misura.r}`}
          {...RICETTE[ricetta]}
          elasticity={0}
          cornerRadius={misura.r}
          padding="0"
          mode="standard"
          mouseContainer={ospite}
          style={{ position: 'absolute', top: '50%', left: '50%', width: misura.w, height: misura.h }}
        >
          <span className="ui-liquid-misura" style={{ width: misura.w, height: misura.h }} />
        </Lib>
      )}
      {children}
    </div>
  )
}
