// ============================================================================
// Token del design system per gli usi in JS. La fonte è src/styles/tokens.css;
// il perché dei valori è in ART_DIRECTION.md.
//
// `TOKEN.x` è un riferimento `var(--x)`: va negli style inline che restano
// dinamici (colori dei dati, larghezze calcolate) e segue da sé i contesti —
// vetro, superfici scure, preferenze di sistema — che un letterale ignorerebbe.
//
// `LIT.x` è il valore letterale dello stesso token, per i soli posti dove una
// custom property non arriva: canvas, attributi di presentazione SVG
// (`stroke="var(--x)"` non è affidabile: si usa `style` o `currentColor`), le
// stringhe HTML di Leaflet. src/styles/tokens.test.ts verifica che i due non
// divergano.
// ============================================================================
export const TOKEN = {
  ink: 'var(--ink)',
  ink2: 'var(--ink-2)',
  ink3: 'var(--ink-3)',
  inkInverse: 'var(--ink-inverse)',
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  fill: 'var(--fill)',
  separator: 'var(--separator)',
  edge: 'var(--edge)',
  accent: 'var(--accent)',
  onAccent: 'var(--on-accent)',
  accentStrong: 'var(--accent-strong)',
  accentText: 'var(--accent-text)',
  accentWash: 'var(--accent-wash)',
  select: 'var(--select)',
  onSelect: 'var(--on-select)',
  danger: 'var(--danger)',
  success: 'var(--success)',
  dataWin: 'var(--data-win)',
  dataPodium: 'var(--data-podium)',
  dataRest: 'var(--data-rest)',
  dataGrid: 'var(--data-grid)',
  dataTrack: 'var(--data-track)',
} as const

// Solo tema chiaro: è l'unico attivo (risposta 2). Le chiavi coincidono con
// quelle di TOKEN, così il test le confronta una per una con tokens.css.
export const LIT = {
  ink: '#1B2A4A',
  ink2: '#545F77',
  ink3: '#7A8396',
  inkInverse: '#FFFFFF',
  bg: '#F3F1ED',
  surface: '#FFFFFF',
  fill: '#EDEAE5',
  accent: '#FF6B35',
  onAccent: '#16233F',
  accentStrong: '#DC4F17',
  accentText: '#B2461A',
  accentWash: '#FFE8DC',
  select: '#1B2A4A',
  onSelect: '#FFFFFF',
  danger: '#C81F52',
  success: '#11784A',
  dataWin: '#DC4F17',
  dataPodium: '#B87048',
  dataRest: '#7A8396',
  dataTrack: '#EDEAE5',
} as const satisfies Partial<Record<keyof typeof TOKEN, string>>

// Breakpoint di UX §9.1. `lg` è la soglia di `useIsWide` e non si sposta.
export const BP = { sm: 360, md: 600, lg: 900, xl: 1280 } as const

// I file lib condivisi col mobile (derive.ts, stats.ts) restituiscono colori
// LETTERALI della palette vecchia: `dotForRank`, `esitoStyle`, `setChips`, il
// `color` delle barre dei piazzamenti. Non si toccano. L'interfaccia li legge
// come SEGNALI e li ridipinge con i token: `TOKEN[DATA_TONE[dataTone(c)]]`.
//
// I pallini decorativi accanto a un'etichetta possono restare il letterale
// così com'è (sulla mappa DEVONO: lo fissa contrast.test.ts).
export type DataTone = 'win' | 'podium' | 'rest'

const LIB_WIN = ['#FF6B35', '#C4501E', '#FFF1EA'] // 1° · vinta · set vinto (fondo e testo)
const LIB_PODIUM = ['#F7A883']

export function dataTone(libColor: string): DataTone {
  const c = libColor.trim().toUpperCase()
  if (LIB_WIN.includes(c)) return 'win'
  if (LIB_PODIUM.includes(c)) return 'podium'
  return 'rest'
}

export const DATA_TONE: Record<DataTone, 'dataWin' | 'dataPodium' | 'dataRest'> = {
  win: 'dataWin',
  podium: 'dataPodium',
  rest: 'dataRest',
}

// Color assigned to a partner created on the fly (color is no longer shown in the UI).
export const NEW_PARTNER_COLOR = '#FF6B35'

// Swatch colors for the tournament "etichetta colore" and the photo color picker.
export const SWATCH_COLORS: string[] = ['#FF6B35', '#00B4D8', '#FFD23F', '#FF477E', '#1B2A4A']

export const MONTHS_SHORT: string[] = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export const MONTHS_FULL: string[] = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
