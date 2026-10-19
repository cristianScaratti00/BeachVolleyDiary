// ============================================================================
// Le palette della TELA dei PNG esportati (Storia 1080×1920 e Beach Wrapped):
// l'UNICA fonte dei loro colori (ART_DIRECTION §4.7, UX §11.4).
//
// Il redesign (versione D) le porta ai tre fondi pieni dell'app: l'ARANCIO
// con il testo d'inchiostro, l'INCHIOSTRO con il testo bianco, la SABBIA (il
// fondo dell'app) con il testo d'inchiostro. Niente più navy né sole basso: la
// slide è una campitura sola, la gerarchia la fanno peso e taglia, e Pallo.
//
// Letterali e OPACHI, anche le linee: html-to-image non incorpora né
// `backdrop-filter` né le custom property del documento, e un colore
// semitrasparente cambierebbe col fondo sotto. Il testo secondario è il primo
// piano mescolato al fondo (l'opacità .8 del design, scritta opaca): sull'arancio
// all'80% farebbe 4.44, quindi lì è all'85% (4.83). Ogni testo regge ≥ 4.5:1;
// i numeri li verifica palette.test.ts.
// ============================================================================
import { LIT } from '../../lib/theme'

export type PaletteKey = 'ink' | 'sand' | 'orange'

export interface WrappedPalette {
  key: PaletteKey
  /** Nome per il selettore (radiogroup) della Storia. */
  label: string
  bg: string
  fg: string
  /** I numeri d'accento (la percentuale della Storia, il differenziale). */
  accent: string
  /** Il testo secondario: occhielli, didascalie, etichette delle celle. */
  muted: string
  /** I filetti fra le celle. */
  line: string
  /** Le mani di Pallo: bianche sull'arancio (lì l'arancio sparirebbe). */
  mani: string
}

export const PALETTES: Record<PaletteKey, WrappedPalette> = {
  ink: { key: 'ink', label: 'Inchiostro', bg: LIT.ink, fg: LIT.inkInverse, accent: LIT.accent, muted: '#D2D2D2', line: '#4E4E50', mani: LIT.accent },
  sand: { key: 'sand', label: 'Sabbia', bg: LIT.bg, fg: LIT.ink, accent: LIT.accentText, muted: '#484849', line: LIT.lineStrong, mani: LIT.accent },
  orange: { key: 'orange', label: 'Arancio', bg: LIT.accent, fg: LIT.ink, accent: LIT.ink, muted: '#3E281D', line: '#C6571B', mani: LIT.inkInverse },
}

// Il ciclo delle slide, come nel design: arancio → inchiostro → sabbia. Con 3
// colori l'indice `i % 3` garantisce che due slide vicine non si somiglino.
export const WRAPPED_PALETTES: WrappedPalette[] = [PALETTES.orange, PALETTES.ink, PALETTES.sand]

export function wrappedPalette(index: number): WrappedPalette {
  return WRAPPED_PALETTES[((index % WRAPPED_PALETTES.length) + WRAPPED_PALETTES.length) % WRAPPED_PALETTES.length]
}

/** Le varianti della Storia, nell'ordine del selettore. */
export const STORY_PALETTES: WrappedPalette[] = [PALETTES.ink, PALETTES.sand, PALETTES.orange]

/**
 * La famiglia della tela, scritta per esteso: è quella di `--font-export`
 * (Geist variabile, servito dall'app, che html-to-image incorpora nel PNG).
 */
export const EXPORT_FONT = '"Geist Variable", Geist, Arial, sans-serif'

/** Le facce che la tela usa: vanno caricate PRIMA di `toBlob` (ART_DIRECTION §3.1). */
export const EXPORT_FONT_FACES = ['900 100px "Geist Variable"', '800 100px "Geist Variable"', '700 100px "Geist Variable"', '600 100px "Geist Variable"', '500 100px "Geist Variable"']

/**
 * Il font della tela deve essere caricato prima della foto: se il documento
 * non l'ha ancora chiesto (una pagina senza quei pesi), il PNG ripiega su
 * Arial. Dentro il timeout di 3s che i visori hanno già: oltre, si genera con
 * quel che c'è (UX §6.5, offline).
 */
export function caricaFontExport(timeoutMs = 3000): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined
  if (!fonts?.load) return Promise.resolve()
  const tutti = Promise.all(EXPORT_FONT_FACES.map((f) => fonts.load(f))).then(() => undefined)
  const tempo = new Promise<void>((r) => window.setTimeout(r, timeoutMs))
  return Promise.race([tutti.catch(() => undefined), tempo])
}
