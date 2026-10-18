// ============================================================================
// Contrasto WCAG 2.x, la stessa formula di contrast.test.ts (che la definisce
// in linea e resta com'è finché la Fase 1 non lo riscrive sui token nuovi).
// Qui in più legge la sintassi `rgb(r g b / a)` usata in src/styles/tokens.css
// e sa comporre un colore semitrasparente su un fondo — è così che si misura il
// testo sul vetro: vetro composto sul fondo peggiore, poi testo sopra.
// ============================================================================

export type RGB = [number, number, number]

export function parseColor(color: string): { rgb: RGB; alpha: number } {
  const fn = color.match(/rgba?\(([^)]+)\)/)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    return { rgb: [parts[0], parts[1], parts[2]], alpha: parts[3] ?? 1 }
  }
  const hex = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return { rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB, alpha: 1 }
  }
  throw new Error(`Colore non riconosciuto: ${color}`)
}

/** `color` disegnato sopra `background`, come lo vede l'occhio. */
export function over(color: string, background: string): string {
  const fg = parseColor(color)
  const bg = parseColor(background)
  const rgb = fg.rgb.map((c, i) => fg.alpha * c + (1 - fg.alpha) * bg.rgb[i])
  return `rgb(${rgb.join(' ')})`
}

function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Rapporto arrotondato a due decimali, come in contrast.test.ts. */
export function contrast(color: string, background: string): number {
  const bg = parseColor(over(background, '#FFFFFF'))
  const fg = parseColor(over(color, over(background, '#FFFFFF')))
  const [hi, lo] = [luminance(fg.rgb), luminance(bg.rgb)].sort((a, b) => b - a)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

export const AA_TEXT = 4.5 // WCAG 1.4.3, testo normale
export const AA_NON_TEXT = 3 // WCAG 1.4.11, componenti, icone, anelli di focus
