import type { ReactNode } from 'react'
import type { Screen } from '../lib/models'

// Line-icon di navigazione: ereditano il colore dal contenitore (currentColor),
// così la logica attivo/inattivo di Sidebar e BottomNav continua a funzionare.
function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export default function NavIcon({ screen, size = 20 }: { screen: Screen; size?: number }) {
  switch (screen) {
    case 'tornei': // coppa / trofeo
      return (
        <Svg size={size}>
          <path d="M6 4h12v3.5a6 6 0 0 1-12 0V4Z" />
          <path d="M6 5.5H3.5v1a3 3 0 0 0 3 3" />
          <path d="M18 5.5h2.5v1a3 3 0 0 1-3 3" />
          <path d="M12 13.5V17" />
          <path d="M8.5 20h7" />
          <path d="M9.5 20a2.5 2.5 0 0 1 5 0" />
        </Svg>
      )
    case 'compagni': // due persone
      return (
        <Svg size={size}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19.5c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" />
          <path d="M16 5.4a3 3 0 0 1 0 5.2" />
          <path d="M17.5 14.6c1.9.5 3.5 1.9 3.5 4.9" />
        </Svg>
      )
    case 'diario': // quaderno / diario
      return (
        <Svg size={size}>
          <path d="M6.5 4H18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4Z" />
          <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H19" />
          <path d="M9 8h6" />
          <path d="M9 11h4" />
        </Svg>
      )
    case 'home':
    default: // casa
      return (
        <Svg size={size}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10.5V20h12v-9.5" />
          <path d="M10 20v-5h4v5" />
        </Svg>
      )
  }
}
