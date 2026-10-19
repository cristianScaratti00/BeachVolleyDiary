// ============================================================================
// Il set di icone dell'app (ART_DIRECTION.md §10.1): estensione di quello che
// era NavIcons.tsx. ViewBox 24, area viva 20, tratto che si ispessisce quando
// l'icona rimpicciolisce (--icon-stroke-*), sempre `currentColor`.
//
// Sostituisce le emoji usate come icone (＋ 📷 🔗 ✨ ⚡ 🏐 📍 🔒 ↻). Le emoji
// restano CONTENUTO (l'emoji del torneo, le slide Wrapped), mai interfaccia.
//
// Un'icona è sempre `aria-hidden`: il nome lo porta il controllo che la
// contiene (etichetta visibile o `aria-label`).
// ============================================================================
import './Icon.css'

// Le icone della TabBar, del ＋ e delle azioni sono quelle del redesign.
const PATHS = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7',
  people: 'M9 11.7a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15.5 5.6a3 3 0 0 1 0 5.8M17 14.6c1.9.5 3.1 2 3.5 4.4',
  book: 'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 8h6',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6z',
  'chat-dots': 'M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01',
  volley: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM5 9.5c4-2 10-2 14 0M9 19.5c-1.5-4-1-10 2-15M19 14c-4 0-7.5 2-9 5.5',
  instagram: 'M8.5 4h7A4.5 4.5 0 0 1 20 8.5v7a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5v-7A4.5 4.5 0 0 1 8.5 4zM12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z',
  phone: 'M9 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM9 7h6M9 17h3',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'share-up': 'M12 15V4M8 7.5 12 4l4 3.5M6 11v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c.8-3.5 3.6-6 7-6s6.2 2.5 7 6',
  'person-plus': 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 20c.8-3.5 3.6-6 7-6 1.4 0 2.7.4 3.8 1.1M18 14v6M15 17h6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  'chevron-left': 'm15 6-6 6 6 6',
  'chevron-right': 'm9 6 6 6-6 6',
  'chevron-down': 'm6 9 6 6 6-6',
  search: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.2-4.2',
  ellipsis: 'M6 12h.01M12 12h.01M18 12h.01',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 10.5v5M13.5 10.5v5',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  share: 'M12 4v11M8 8l4-4 4 4M6 12v7h12v-7',
  download: 'M12 4v11M8 11l4 4 4-4M6 19h12',
  camera: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  pin: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  refresh: 'M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  chat: 'M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z',
  ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3c2.6 2.1 4.1 5.4 4.1 9M3.3 9.6C6.5 9 9.8 10 12 12M12 12c-.9 3.3-3.1 6.2-6 7.6M12 12c3.3.1 6.4 1.6 8.4 3.9',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  timeline: 'M6 4v16M10 6h9M10 12h9M10 18h6M6 6h.01M6 12h.01M6 18h.01',
  map: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14',
  chart: 'M4 4v16h16M8 16v-4M12 16V8M16 16v-6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  inbox: 'M4 13l2.5-8h11L20 13v6H4zM4 13h4.5l1 2.5h5l1-2.5H20',
  shield: 'M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  logout: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
  external: 'M7 17 17 7M8.5 7H17v8.5',
  send: 'M4.5 12 19.5 4.5 16 19.5l-4-6z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  'wifi-off': 'M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5-2.7M14.5 10.3a10 10 0 0 1 4.5 2.6M2 9.3a15 15 0 0 1 4.5-2.8M11 5.6A15 15 0 0 1 22 9.3M12 20h.01',
  alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5v5.5M12 16.5h.01',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5h.01',
} as const

// Le varianti piene delle tab: sagoma piena, dettagli interni ritagliati. La
// tab attiva le usa (bianche sulla pillola navy): lo stato si legge dalla
// FORMA, non solo dal colore (WCAG 1.4.1).
const FILLS: Partial<Record<IconName, string>> = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  trophy: 'M7.5 3.5h9V9a4.5 4.5 0 0 1-9 0zM10.4 16.5h3.2l.6 3.5H9.8zM11 12.8h2v4h-2zM7.5 5.5h-3V7.5A3 3 0 0 0 7.5 10.5zM16.5 5.5h3V7.5a3 3 0 0 1-3 3z',
  people: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.8 19.5c.5-3.4 3-5.8 6.2-5.8s5.7 2.4 6.2 5.8zM16 11.5a3 3 0 1 0 0-6zM16.8 13.6c2.4.5 4 2.7 4.4 5.9h-4.3a8 8 0 0 0-2-5.6z',
  person: 'M12 12.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4.5 20.5c.7-4 3.8-6.8 7.5-6.8s6.8 2.8 7.5 6.8z',
}

export type IconName = keyof typeof PATHS
export type IconSize = 12 | 16 | 20 | 24

export function Icon({ name, size = 20, filled = false, className }: {
  name: IconName
  size?: IconSize
  /** Variante piena (solo le icone delle tab ce l'hanno). */
  filled?: boolean
  className?: string
}) {
  const fill = filled ? FILLS[name] : undefined
  return (
    <svg
      className={className ? `ui-icon ${className}` : 'ui-icon'}
      data-size={size}
      data-filled={fill ? '' : undefined}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={fill ?? PATHS[name]} />
    </svg>
  )
}
