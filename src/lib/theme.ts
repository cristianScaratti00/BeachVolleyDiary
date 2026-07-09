// Central palette + fonts, mirrors the (redesigned) design tokens.
export const C = {
  bg: '#FAF8F5',
  ink: '#1B2A4A',
  orange: '#FF6B35',
  orangeSoft: '#F7A883',
  orangeDeep: '#C4501E',
  line: 'rgba(27,42,74,.1)',
  fill: '#F2F0EC',
} as const

// Color assigned to a partner created on the fly (color is no longer shown in the UI).
export const NEW_PARTNER_COLOR = '#FF6B35'

// Swatch colors for the tournament "etichetta colore" and the photo color picker.
export const SWATCH_COLORS: string[] = ['#FF6B35', '#00B4D8', '#FFD23F', '#FF477E', '#1B2A4A']

export const MONTHS_SHORT: string[] = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export const MONTHS_FULL: string[] = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
