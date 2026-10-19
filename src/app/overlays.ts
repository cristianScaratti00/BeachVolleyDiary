// ============================================================================
// Gli overlay dell'app (UX.md §4.3): sheet, menu, dialoghi e visori. Qui i
// tipi e il riduttore, puri. La pila vera e la sua voce di history stanno in
// `router.ts`; chi li disegna è `ModalHost`.
//
// Decisione presa una volta per tutte (UX §4.3 lasciava la scelta): lo sheet
// del ＋ («Cosa registriamo?») si chiama `azioni`, non `crea`, perché `crea`
// è già la rotta dell'assistente. `anchor: 'tabbar'` è lo sheet che sale dal
// fondo (mobile), `'popover'` il menu accanto a «Nuovo» della Sidebar.
// ============================================================================
import type { ReactNode } from 'react'

export interface ConfirmSpec {
  /** La domanda: «Eliminare «Rimini Open»?». */
  title: string
  /** La conseguenza: «Spariscono anche le sue 4 partite…». */
  text?: ReactNode
  /** Dice cosa fa: «Elimina torneo», mai «OK». */
  confirmLabel: string
  /** Etichetta mentre l'azione è in corso: «Eliminazione…». */
  busyLabel?: string
  cancelLabel?: string
  tone?: 'destructive' | 'default'
  /**
   * L'azione. Finché è in corso il pulsante resta occupato («Eliminazione…»).
   * Quando finisce, se il dialogo è ancora aperto lo chiude l'host: si resta
   * dove si era (in caso d'errore lo dice il toast). Chi deve andare altrove
   * chiude da sé gli overlay e naviga (`closeAllOverlays(then)`).
   */
  onConfirm: () => unknown
  /** Chiamato con «Annulla», Esc, velo e indietro. */
  onCancel?: () => void
}

export interface MenuItem {
  key: string
  label: string
  sub?: string
  icon?: import('../components/ui/Icon').IconName
  /** `accent`: la voce in evidenza (la partita live nel ＋). */
  tone?: 'destructive' | 'accent'
  onSelect: () => void
}

export interface MenuSpec {
  title: string
  items: MenuItem[]
}

export type Overlay =
  | { kind: 'azioni'; anchor?: 'tabbar' | 'popover' }
  | { kind: 'menu'; spec: MenuSpec }
  | { kind: 'torneo'; mode: 'nuovo'; rapido?: boolean }
  | { kind: 'torneo'; mode: 'modifica'; id: string }
  | { kind: 'partita'; mode: 'nuova'; tournamentId: string | null }
  | { kind: 'partita'; mode: 'modifica'; matchId: string }
  | { kind: 'foto'; tournamentId: string }
  | { kind: 'compagno' }
  | { kind: 'collega'; partnerId: string }
  | { kind: 'password' }
  | { kind: 'storia'; tournamentId: string }
  | { kind: 'lightbox'; tournamentId: string; index: number }
  | { kind: 'conferma'; spec: ConfirmSpec }

export type OverlayKind = Overlay['kind']

export interface OverlayEntry {
  /** Chiave della voce di history (`history.state.overlay`). */
  key: string
  overlay: Overlay
  /** Modulo con almeno un campo diverso dal valore iniziale. */
  dirty: boolean
  /** Salvataggio in corso: non si chiude né col dito né col velo. */
  busy: boolean
  /** Chi l'ha aperto: il focus ci torna alla chiusura (UX §8.3). */
  opener: HTMLElement | null
  /** L'apertura è arrivata da un dito (MOTION.md §3.5, M3). */
  byTouch: boolean
  /** Elemento dell'àncora per i popover (Sidebar «＋ Nuovo», «⋯»). */
  anchor: HTMLElement | null
}

export type OverlayAction =
  | { type: 'push'; entry: OverlayEntry }
  | { type: 'replaceTop'; entry: OverlayEntry }
  | { type: 'pop'; n: number }
  | { type: 'truncate'; length: number }
  | { type: 'flags'; key: string; dirty?: boolean; busy?: boolean }
  | { type: 'clear' }

/** Al massimo due overlay impilati (UX §4.3.5): sheet + dialogo, o menu → sheet. */
export const MAX_OVERLAYS = 3

export function overlayReducer(stack: OverlayEntry[], a: OverlayAction): OverlayEntry[] {
  switch (a.type) {
    case 'push':
      return [...stack, a.entry].slice(-MAX_OVERLAYS)
    case 'replaceTop':
      return stack.length ? [...stack.slice(0, -1), a.entry] : [a.entry]
    case 'pop':
      return stack.slice(0, Math.max(0, stack.length - a.n))
    case 'truncate':
      return stack.slice(0, Math.max(0, a.length))
    case 'flags':
      return stack.map((e) =>
        e.key === a.key
          ? { ...e, dirty: a.dirty ?? e.dirty, busy: a.busy ?? e.busy }
          : e,
      )
    case 'clear':
      return []
  }
}

/** Il dialogo «Scartare le modifiche?» (UX §7.7), uguale ovunque. */
export function discardSpec(onDiscard: () => void, onKeep?: () => void): ConfirmSpec {
  return {
    title: 'Scartare le modifiche?',
    text: 'Quello che hai scritto andrà perso.',
    confirmLabel: 'Scarta',
    cancelLabel: 'Continua a modificare',
    tone: 'destructive',
    // Chi scarta chiude da sé anche lo sheet sotto (`closeOverlays(2, …)`).
    onConfirm: onDiscard,
    onCancel: onKeep,
  }
}
