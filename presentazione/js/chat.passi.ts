// ============================================================================
// «Raccontalo a Pallo» sulla landing: i passi della mini chat (UX §L12.5).
//
// Le domande sono quelle VERE dell'assistente (`src/screens/crea/copione.ts`:
// `INTRO`, `RIPARTENZA`, `domanda`, `righeRiepilogo`); la landing sceglie solo
// un sottoinsieme di passi e le risposte rapide, coi nomi del diario di
// fabbrica. Puro, senza DOM: lo usano la chat viva (`chat.ts`) e il test che
// scrive la trascrizione per la versione senza JavaScript
// (`src/app/landing.dati.test.ts`), così le due non divergono.
// ============================================================================
import { domanda, initialDraft, righeRiepilogo } from '../../src/screens/crea/copione'
import type { Draft } from '../../src/screens/crea/copione'
import type { Option } from '../../src/lib/models'

export { INTRO, RIPARTENZA, battitura } from '../../src/screens/crea/copione'

/** I passi della landing, nell'ordine; `fine` c'è solo qui (non salva niente). */
export type PassoChat = 'name' | 'partner' | 'date' | 'status' | 'placement' | 'recap' | 'fine'

/** L'ultima frase di Pallo: nell'app il torneo sarebbe salvato, qui no. */
export const FINE = "Fatto. Nell'app adesso sarebbe nel tuo diario."

export interface NomiChat {
  /** Due nomi di torneo per la prima domanda. */
  tornei: readonly string[]
  /** Due compagni per «Con chi hai giocato?». */
  compagni: readonly string[]
  /** «Oggi» in ISO: iniettabile, così la trascrizione generata non cambia col giorno. */
  oggi: string
}

export interface Contesto {
  partners: Option[]
  venues: Option[]
}

export interface Scelta {
  testo: string
  prossimo: PassoChat
  applica: (d: Draft) => Draft
}

/** I compagni della chat, con un id finto: `righeRiepilogo` li ritrova per id. */
export function contesto(nomi: NomiChat): Contesto {
  return { partners: nomi.compagni.map((name, i) => ({ id: `compagno-${i}`, name })), venues: [] }
}

const ieri = (oggi: string) => new Date(Date.parse(oggi) - 86400000).toISOString().slice(0, 10)

/** Le risposte rapide di un passo. «Ricomincia» a fine chat lo gestisce `chat.ts`. */
export function scelte(passo: PassoChat, nomi: NomiChat): Scelta[] {
  const ctx = contesto(nomi)
  switch (passo) {
    case 'name':
      return nomi.tornei.map((n) => ({ testo: n, prossimo: 'partner', applica: (d) => ({ ...d, name: n }) }))
    case 'partner':
      return ctx.partners.map((p) => ({ testo: p.name, prossimo: 'date', applica: (d) => ({ ...d, partnerId: p.id }) }))
    case 'date':
      return [
        { testo: 'Oggi', prossimo: 'status', applica: (d) => ({ ...d, date: nomi.oggi }) },
        { testo: 'Ieri', prossimo: 'status', applica: (d) => ({ ...d, date: ieri(nomi.oggi) }) },
      ]
    case 'status':
      return [
        { testo: 'Finito', prossimo: 'placement', applica: (d) => ({ ...d, status: 'finished' }) },
        { testo: 'In corso', prossimo: 'recap', applica: (d) => ({ ...d, status: 'ongoing', placement: 'In corso' }) },
      ]
    case 'placement':
      return [
        { testo: '1°', prossimo: 'recap', applica: (d) => ({ ...d, placement: '1° 🏆' }) },
        { testo: '2°', prossimo: 'recap', applica: (d) => ({ ...d, placement: '2°' }) },
        { testo: '3°', prossimo: 'recap', applica: (d) => ({ ...d, placement: '3°' }) },
      ]
    case 'recap':
      return [{ testo: 'Conferma', prossimo: 'fine', applica: (d) => d }]
    default:
      return []
  }
}

/** Che cosa chiede Pallo a un passo: la domanda dell'app, o la frase di fine. */
export function domandaDi(passo: PassoChat, d: Draft, nomi: NomiChat): string {
  if (passo === 'fine') return FINE
  return domanda(passo, d, contesto(nomi)) ?? ''
}

/** Le righe della card di riepilogo (`righeRiepilogo` dell'app). */
export function riepilogo(d: Draft, nomi: NomiChat): [string, string][] {
  return righeRiepilogo(d, contesto(nomi))
}

/** La bozza di partenza, col giorno della landing. */
export function bozza(nomi: NomiChat): Draft {
  return { ...initialDraft(), date: nomi.oggi }
}

export type { Draft }
