// ============================================================================
// Le palette della TELA dei PNG esportati (Storia 1080×1920 e Beach Wrapped):
// l'UNICA fonte dei loro colori (ART_DIRECTION §4.7, UX §11.4). StoryModal ne
// aveva una copia che si discostava su due valori: ora legge da qui.
//
// Letterali e OPACHI, anche le linee: html-to-image non incorpora né
// `backdrop-filter` né le custom property del documento, e un colore
// semitrasparente cambierebbe col fondo sotto. Ogni testo regge ≥ 4.5:1 anche
// sopra il disco del sole (`disc`); i numeri sono in ART_DIRECTION §4.7 e li
// verifica palette.test.ts.
//
// La palette arancio era bianco su #FF6B35 (2.84 ✗): ora è monocroma navy su
// arancio, e la gerarchia la fanno peso e taglia.
// ============================================================================
export type PaletteKey = 'navy' | 'sand' | 'orange'

export interface WrappedPalette {
  key: PaletteKey
  /** Nome per il selettore (radiogroup) della Storia. */
  label: string
  bg: string
  fg: string
  accent: string
  muted: string
  line: string
  /** Il "sole basso": disco pieno tagliato dal bordo della tela. */
  disc: string
}

export const PALETTES: Record<PaletteKey, WrappedPalette> = {
  navy: { key: 'navy', label: 'Navy', bg: '#16233F', fg: '#FAF8F5', accent: '#FF6B35', muted: '#A9B1C2', line: '#3F4960', disc: '#22325A' },
  sand: { key: 'sand', label: 'Sabbia', bg: '#F6F1E8', fg: '#1B2A4A', accent: '#B2461A', muted: '#545F77', line: '#D7D5D2', disc: '#FFE4D5' },
  orange: { key: 'orange', label: 'Arancio', bg: '#FF6B35', fg: '#16233F', accent: '#16233F', muted: '#3A2A26', line: '#C75A37', disc: '#FF8657' },
}

// Ordine del ciclo delle slide: navy → orange → sand. Con 3 colori l'indice
// `i % 3` garantisce che due slide adiacenti non abbiano mai lo stesso sfondo.
export const WRAPPED_PALETTES: WrappedPalette[] = [PALETTES.navy, PALETTES.orange, PALETTES.sand]

export function wrappedPalette(index: number): WrappedPalette {
  return WRAPPED_PALETTES[((index % WRAPPED_PALETTES.length) + WRAPPED_PALETTES.length) % WRAPPED_PALETTES.length]
}

/** Le varianti della Storia, nell'ordine del selettore. */
export const STORY_PALETTES: WrappedPalette[] = [PALETTES.navy, PALETTES.sand, PALETTES.orange]

/** Le facce di Inter che la tela usa: vanno caricate PRIMA di `toPng` (ART_DIRECTION §3.1). */
export const EXPORT_FONT_FACES = ['800 100px Inter', '700 100px Inter', '600 100px Inter']

/**
 * Sui dispositivi Apple l'interfaccia usa SF e non scarica mai Inter: senza
 * questo il PNG ripiega su Arial. Dentro il timeout di 3s che i visori hanno
 * già: oltre, si genera con quel che c'è (UX §6.5, offline).
 */
export function caricaFontExport(timeoutMs = 3000): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined
  if (!fonts?.load) return Promise.resolve()
  const tutti = Promise.all(EXPORT_FONT_FACES.map((f) => fonts.load(f))).then(() => undefined)
  const tempo = new Promise<void>((r) => window.setTimeout(r, timeoutMs))
  return Promise.race([tutti.catch(() => undefined), tempo])
}
