// Palette del mazzo "Beach Wrapped". Sono le stesse tre della storia Instagram
// (StoryModal), qui però ruotate per slide così il recap risulta colorato e
// variabile come uno Spotify Wrapped, invece di monocromo.
export interface WrappedPalette { bg: string; fg: string; accent: string; muted: string; line: string }

// Ordine del ciclo: navy → orange → sand. Con 3 colori l'indice `i % 3` garantisce
// che due slide adiacenti non abbiano mai lo stesso sfondo.
export const WRAPPED_PALETTES: WrappedPalette[] = [
  { bg: '#16233F', fg: '#FAF8F5', accent: '#FF6B35', muted: 'rgba(250,248,245,.55)', line: 'rgba(250,248,245,.16)' },
  { bg: '#FF6B35', fg: '#FFFFFF', accent: '#16233F', muted: 'rgba(255,255,255,.78)', line: 'rgba(255,255,255,.34)' },
  { bg: '#FAF8F5', fg: '#1B2A4A', accent: '#FF6B35', muted: 'rgba(27,42,74,.5)', line: 'rgba(27,42,74,.12)' },
]

export function wrappedPalette(index: number): WrappedPalette {
  return WRAPPED_PALETTES[((index % WRAPPED_PALETTES.length) + WRAPPED_PALETTES.length) % WRAPPED_PALETTES.length]
}
