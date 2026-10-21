// ============================================================================
// I limiti delle risposte scritte nell'assistente: quanto può essere lungo un
// nome (src/lib/lunghezze.ts, gli stessi dei moduli e del DB) e che cosa dice
// Solby quando una risposta non va. Puro, senza React.
//
// Una risposta che non va non fa avanzare il copione: resta nella
// trascrizione, Solby dice perché e come rimediare, e il campo tiene il testo
// da correggere (useAssistente, `rifiuta`).
// ============================================================================
import { LIMITI, verificaTesto } from '../../lib/lunghezze'
import type { Lunghezza, Motivo } from '../../lib/lunghezze'
import type { Step } from './copione'

/**
 * Il luogo nuovo, nella chat, è una riga sola che vale anche da città
 * (`formDaBozza`: `newVenueCity` = `newVenueName`, e `city` della bozza): il
 * suo massimo è quello più stretto dei due, o la città non entrerebbe nel DB.
 */
const LUOGO_IN_CHAT: Lunghezza = { min: LIMITI.luogo.min, max: Math.min(LIMITI.luogo.max, LIMITI.citta.max) }

/** Il campo sui passi a scelte: le scelte sono corte, il compagno nuovo ha il suo limite. */
export const RISPOSTA_MAX = LIMITI.compagno.max

interface Libero {
  limite: Lunghezza
  /** Che cosa si sta nominando, nelle frasi di Solby. */
  cosa: 'nome' | 'nomi'
  /** Il campo vuoto vale (gli avversari diventano «Avversari»). */
  vuotoOk?: boolean
}

/** I passi che si rispondono (anche) scrivendo un nome, e il loro limite. */
function liberoDi(step: Step): Libero | null {
  switch (step) {
    case 'name':
      return { limite: LIMITI.torneo, cosa: 'nome' }
    case 'partner':
    case 'partnerName':
    case 'resultsPartner':
    case 'resultsPartnerName':
      return { limite: LIMITI.compagno, cosa: 'nome' }
    case 'venue':
    case 'venueName':
      return { limite: LUOGO_IN_CHAT, cosa: 'nome' }
    case 'matchOpponents':
      return { limite: LIMITI.avversari, cosa: 'nomi', vuotoOk: true }
    default:
      return null
  }
}

/** Quanti caratteri lascia scrivere il campo del dock su questo passo. */
export function maxDelPasso(step: Step): number {
  return liberoDi(step)?.limite.max ?? RISPOSTA_MAX
}

/** Le parole di Solby: dicono che cosa non va e come rimediare. */
function frase(motivo: Motivo, { limite, cosa }: Libero): string {
  const uno = cosa === 'nome'
  switch (motivo) {
    case 'vuoto':
      return 'Scrivimi almeno un nome.'
    case 'lungo':
      return `${uno ? 'Mi serve un nome più corto' : 'Mi servono nomi più corti'}: massimo ${limite.max} caratteri. Riprova?`
    case 'corto':
      return `${uno ? 'Mi serve un nome un po’ più lungo' : 'Mi servono nomi un po’ più lunghi'}: almeno ${limite.min} caratteri. Riprova?`
    case 'lettere':
      return `${uno ? 'Nel nome' : 'Nei nomi'} mi serve almeno una lettera, non solo numeri, simboli o emoji. Riprova?`
    case 'aCapo':
      return 'Scrivimelo su una riga sola, senza andare a capo. Riprova?'
    case 'link':
      return `Niente link: ${uno ? 'mi basta il nome, come lo diresti' : 'mi bastano i nomi, come li diresti'} a voce. Riprova?`
    case 'ripetuto':
      return 'Sembra un tasto rimasto premuto. Riscrivimelo?'
  }
}

export type Risposta = { ok: true; valore: string } | { ok: false; motivo: string }

/**
 * Una risposta scritta a un passo da scrivere: il valore pulito (spazi
 * compattati) o il motivo, con le parole di Solby. Sui passi senza testo
 * libero passa com'è.
 */
export function validaRisposta(step: Step, testo: string): Risposta {
  const libero = liberoDi(step)
  if (!libero) return { ok: true, valore: testo.trim() }
  if (libero.vuotoOk && !testo.trim()) return { ok: true, valore: '' }
  const v = verificaTesto(testo, libero.limite)
  return v.ok ? v : { ok: false, motivo: frase(v.motivo, libero) }
}
