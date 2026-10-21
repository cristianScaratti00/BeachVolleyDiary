// ============================================================================
// Quanto può essere lungo un testo scritto a mano: UNA fonte per l'assistente
// (CreaChat), i moduli (sheet del torneo, del compagno, il VenuePicker) e il
// database, che ha gli stessi massimi come CHECK
// (supabase/migrations/20261021120000_text_length_checks.sql). Il DB è
// condiviso con l'app mobile: un massimo qui non può superare quello del DB,
// e uno nel DB non può scendere sotto quello di un modulo.
//
// Puro, senza React né rete.
// ============================================================================

export interface Lunghezza {
  /** Il minimo dopo la pulizia (spazi). */
  min: number
  max: number
}

export const LIMITI = {
  /** Il nome mostrato (`profiles.full_name`): registrazione e Profilo. */
  nome: { min: 1, max: 40 },
  torneo: { min: 2, max: 60 },
  compagno: { min: 2, max: 40 },
  citta: { min: 2, max: 50 },
  luogo: { min: 2, max: 60 },
  /** La coppia avversaria («Bianchi / Verdi»), come in Partita live. */
  avversari: { min: 2, max: 60 },
} as const satisfies Record<string, Lunghezza>

export type CampoTesto = keyof typeof LIMITI

/** Toglie gli spazi in testa e in coda e riduce a uno quelli di mezzo (a capo compresi). */
export const compatta = (testo: string) => testo.replace(/\s+/g, ' ').trim()

/** Perché un testo non va: la parola la sceglie chi lo dice (Solby, un modulo). */
export type Motivo = 'vuoto' | 'corto' | 'lungo' | 'aCapo' | 'link' | 'lettere' | 'ripetuto'

export type Verifica = { ok: true; valore: string } | { ok: false; motivo: Motivo }

const LETTERA = /\p{L}/u
const LINK = /https?:\/\/|www\./i
/** Lo stesso carattere più di 6 volte di fila: «aaaaaaaa», «!!!!!!!». */
const RIPETUTO = /(.)\1{6}/u

/**
 * Un nome scritto a mano va bene? Nell'ordine: vuoto, a capo, link, troppo
 * lungo, troppo corto, senza lettere (solo cifre, segni o emoji), lo stesso
 * carattere ripetuto. Il valore buono è già compattato. La lunghezza si conta
 * in caratteri (un'emoji è uno), come `char_length` nel DB.
 */
export function verificaTesto(testo: string, { min, max }: Lunghezza): Verifica {
  if (/[\r\n]/.test(testo.trim())) return { ok: false, motivo: 'aCapo' }
  const valore = compatta(testo)
  if (!valore) return { ok: false, motivo: 'vuoto' }
  if (LINK.test(valore)) return { ok: false, motivo: 'link' }
  const n = [...valore].length
  if (n > max) return { ok: false, motivo: 'lungo' }
  if (n < min) return { ok: false, motivo: 'corto' }
  if (!LETTERA.test(valore)) return { ok: false, motivo: 'lettere' }
  if (RIPETUTO.test(valore)) return { ok: false, motivo: 'ripetuto' }
  return { ok: true, valore }
}
