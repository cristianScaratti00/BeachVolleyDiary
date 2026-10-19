// ============================================================================
// Il vetro liquido (ART_DIRECTION §0): le barre e i pulsanti che galleggiano
// sopra il contenuto — TabBar, i pulsanti di vetro in cima ai dettagli, le
// azioni in fondo al torneo, il campo dell'assistente.
//
// Due strati, uno sopra l'altro:
//   1. il MATERIALE (`data-material="glass-regular"`, materials.css): tinta
//      bianca al 55%, sfocatura, saturazione, bordo bianco, riflesso. Vale
//      dappertutto ed è anche il fallback;
//   2. la RIFRAZIONE (@samasante/liquid-glass): sui browser Blink un filtro
//      SVG di spostamento dentro il `backdrop-filter` piega quello che scorre
//      sotto il bordo, come una goccia. Safari e Firefox non sanno mettere un
//      `url()` nel `backdrop-filter`: lì resta il materiale, che da solo è
//      già il vetro del redesign — la libreria non aggiungerebbe niente.
//
// La rifrazione si spegne (e resta il materiale) anche nei test (jsdom non ha
// canvas né layout), con `prefers-reduced-transparency`, con
// `prefers-contrast: more` e con i colori forzati. Il materiale stesso si fa
// opaco in quei casi (tokens.css e materials.css).
//
// La libreria (≈26 kB gzip) si scarica SOLO dove la rifrazione si vede, con
// un `import()` al primo vetro montato: su iPhone e Safari — la persona
// primaria — non arriva mai. Finché non è arrivata, c'è il materiale.
//
// È SEMPRE un `<div>` di presentazione: il ruolo e il nome stanno sul
// controllo che lo contiene o che ci sta dentro. Per uno strato dietro a un
// controllo si usa `layer` (assoluto, `inset: 0`, raggio ereditato).
// ============================================================================
import { useEffect, useState } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import type { GlassOptics, GlassProps } from '@samasante/liquid-glass'

type GlassComponent = (props: GlassProps) => ReactNode

/**
 * La ricetta del materiale tradotta nelle ottiche della libreria: sfocatura
 * 10, saturazione 180%, un velo bianco al 4%, e una rifrazione concentrata sul
 * bordo — la si deve sentire scorrendo, non leggere come una lente sopra le
 * parole.
 */
export const OTTICHE: Partial<GlassOptics> = {
  frost: 10,
  saturate: 1.8,
  brightness: 0.04,
  strength: 0.08,
  depth: 0.45,
  curvature: 0.25,
  bend: 0.6,
  bendWidth: 0.2,
  dispersion: 0.12,
  // La luce sul bordo la disegna il materiale CSS (direzionale e uguale su
  // tutti i browser): quella della libreria farebbe macchie chiare sopra le
  // foto. Qui resta solo la piega del bordo.
  sheen: 0,
  glow: 0,
  specular: 0,
}

let decisa: boolean | null = null

function rifrazionePossibile(): boolean {
  if (decisa !== null) return decisa
  decisa = false
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return decisa
  const ua = navigator.userAgent
  if (/jsdom/i.test(ua)) return decisa
  const mq = (q: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(q).matches : false)
  if (mq('(prefers-reduced-transparency: reduce)') || mq('(prefers-contrast: more)') || mq('(forced-colors: active)')) return decisa
  // Blink su desktop e Android: lo stesso controllo della libreria, che solo
  // lì mette il filtro nel backdrop. Su iOS ogni browser è WebKit.
  const uaData = (navigator as Navigator & { userAgentData?: unknown }).userAgentData
  const blink = uaData != null || (/\b(?:Chrome|Chromium|Edg)\//.test(ua) && !/\b(?:CriOS|EdgiOS|FxiOS|OPiOS)\b/.test(ua) && !/iPhone|iPad|iPod/.test(ua))
  decisa = blink && typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'blur(1px)')
  return decisa
}

// Un solo download per pagina, condiviso da tutti i vetri.
let caricamento: Promise<GlassComponent | null> | null = null
let caricato: GlassComponent | null = null

function caricaGlass(): Promise<GlassComponent | null> {
  caricamento ??= import('@samasante/liquid-glass')
    .then((m) => (caricato = m.Glass as GlassComponent))
    // Senza rete (o con un deploy nuovo) resta il materiale: niente errore.
    .catch(() => null)
  return caricamento
}

/**
 * Il componente della libreria, dopo il montaggio, solo dove la rifrazione si
 * vede davvero; `null` altrove e finché non è arrivato.
 */
export function useRifrazione(): GlassComponent | null {
  const [glass, setGlass] = useState<GlassComponent | null>(() => caricato)
  useEffect(() => {
    if (!rifrazionePossibile()) return
    let vivo = true
    caricaGlass().then((g) => {
      if (vivo && g) setGlass(() => g)
    })
    return () => {
      vivo = false
    }
  }, [])
  return glass
}

export interface LiquidGlassProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children?: ReactNode
  /** Strato dietro a un controllo: assoluto, `inset: 0`, raggio ereditato. */
  layer?: boolean
  /** Il materiale di base (default `glass-regular`). */
  material?: 'glass-regular' | 'glass-clear'
  optics?: Partial<GlassOptics>
}

export function LiquidGlass({ children, layer, material = 'glass-regular', optics, className, style, ...rest }: LiquidGlassProps) {
  const Glass = useRifrazione()
  const posa: CSSProperties = layer ? { position: 'absolute', inset: 0, borderRadius: 'inherit', zIndex: -1, pointerEvents: 'none' } : {}
  const cls = className ? `ui-liquid ${className}` : 'ui-liquid'
  if (!Glass) {
    return (
      <div {...rest} className={cls} data-material={material} aria-hidden={layer ? true : rest['aria-hidden']} style={{ ...posa, ...style }}>
        {children}
      </div>
    )
  }
  return (
    <Glass
      {...rest}
      className={cls}
      data-material={material}
      data-refraction=""
      aria-hidden={layer ? true : rest['aria-hidden']}
      optics={{ ...OTTICHE, ...optics }}
      // La libreria parte da `display: inline-block`: la stringa vuota lo
      // toglie e lascia decidere al CSS del componente.
      style={{ display: '', ...posa, ...style }}
    >
      {/* La libreria sceglie il modo «materiale» (il vetro che piega quello
          che ha DIETRO) solo se ci sono figli: uno strato vuoto finirebbe nel
          modo «lente», che piega sé stesso e si stringe a 2px. */}
      {children ?? <></>}
    </Glass>
  )
}
