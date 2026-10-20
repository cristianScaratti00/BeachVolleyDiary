// ============================================================================
// Le regole della Partita live, pure: niente React, niente DOM. Le usa il
// segnapunti dell'app (PartitaLive.tsx), e si provano da sole, caso per caso
// (PartitaLive.regole.test.ts).
//
// Le regole sono quelle del beach volley: set a 21 (il terzo a 15) con due
// punti di scarto, cambio campo ogni 7 punti (ogni 5 nei set a 15), al meglio
// dei tre set. Tra amici si può giocare un set solo e/o a 15 (la partitella).
// ============================================================================
import type { PalloUmore } from '../components/Pallo.vita'
import type { Phase } from '../lib/models'

export type Squadra = 'noi' | 'loro'
/** Chi ha mosso il punteggio per ultimo: decide Pallo, la nuvoletta e il «pop». */
export type Ultimo = Squadra | 'tolto' | null
/** Dove va a finire la partita: nel torneo, o nello storico di questo telefono. */
export type Modo = 'torneo' | 'amici'

/** Quanti set e a quanti punti. Il torneo gioca sempre quello del beach. */
export interface Formato {
  set: 1 | 3
  punti: 21 | 15
}
export const FORMATO_BEACH: Formato = { set: 3, punti: 21 }

export interface SetChiuso {
  us: number
  them: number
}

export interface PartitaInCorso {
  v: 1
  modo: Modo
  /** La chiave nello storico tra amici (nel torneo non serve, ma c'è). */
  id: string
  /** Nel torneo: dove si salva. Tra amici: ''. */
  torneoId: string
  fase: Phase
  /** Tra amici: il compagno scritto a mano ('' = la coppia è «Noi»). */
  compagno: string
  avversari: string
  formato: Formato
  chiusi: SetChiuso[]
  /** I punti del set in corso. */
  noi: number
  loro: number
  ultimo: Ultimo
  /** Cresce a ogni punto: fa ripartire il «pop» anche sullo stesso numero. */
  colpo: number
  /** Il riepilogo: la partita è finita, manca solo il salvataggio. */
  finita: boolean
  /** Finita a mano («Finisci la partita» a 0–0), non per i set vinti. */
  aMano: boolean
  note: string
}

// ------------------------------------------------------------------ regole
/**
 * Il set si vince a 21 (o a 15, la partitella), il terzo sempre a 15, con due
 * punti di scarto.
 */
export const obiettivo = (indice: number, f: Formato = FORMATO_BEACH) => (f.set > 1 && indice >= f.set - 1 ? 15 : f.punti)
export const setFinito = (a: number, b: number, t: number) => Math.max(a, b) >= t && Math.abs(a - b) >= 2
/** Il cambio campo del beach: ogni 7 punti nei set a 21, ogni 5 in quelli a 15. */
export const cambioOgni = (t: number) => (t >= 21 ? 7 : 5)
/** I set da vincere: 2 su 3, o quello unico. */
export const daVincere = (f: Formato) => Math.ceil(f.set / 2)

export function vinti(chiusi: SetChiuso[]) {
  return { noi: chiusi.filter((s) => s.us > s.them).length, loro: chiusi.filter((s) => s.them > s.us).length }
}

/** I set vinti che servono, o tutti i set giocati: la partita è chiusa. */
export function partitaChiusa(chiusi: SetChiuso[], f: Formato) {
  const v = vinti(chiusi)
  return v.noi >= daVincere(f) || v.loro >= daVincere(f) || chiusi.length >= f.set
}

/** «Set 2 di 3», o «Set unico». */
export const titoloSet = (indice: number, f: Formato) => (f.set === 1 ? 'Set unico' : `Set ${indice + 1} di ${f.set}`)

export interface Battuta {
  testo: string
  umore: PalloUmore
  /** Va detta anche allo screen reader, insieme al punteggio. */
  notizia: boolean
}

/** Che cosa dice Pallo: la cosa più importante che sta succedendo. */
export function battuta(p: PartitaInCorso): Battuta {
  const i = p.chiusi.length
  const t = obiettivo(i, p.formato)
  const ultimoSet = daVincere(p.formato) - 1
  const { noi, loro, ultimo } = p
  const umore: PalloUmore = ultimo === 'noi' ? 'esulta' : ultimo === 'loro' ? 'preoccupato' : ultimo === 'tolto' ? 'contento' : 'saluta'
  if (setFinito(noi, loro, t)) {
    return noi > loro
      ? { testo: 'Set vostro! Chiudetelo.', umore: 'festa', notizia: true }
      : { testo: 'Set loro: chiudi e si riparte.', umore: 'triste', notizia: true }
  }
  const v = vinti(p.chiusi)
  // Il prossimo punto chiude il set: è set point (o match point).
  // Il match point, nostro o loro, fa strabuzzare gli occhi a Pallo.
  if (noi >= t - 1 && noi > loro) return { testo: v.noi === ultimoSet ? 'Match point per voi!' : 'Set point per voi!', umore: v.noi === ultimoSet ? 'sorpreso' : umore, notizia: true }
  if (loro >= t - 1 && loro > noi) {
    return { testo: v.loro === ultimoSet ? 'Match point loro: concentrati.' : 'Set point loro: concentrati.', umore: v.loro === ultimoSet ? 'sorpreso' : umore, notizia: true }
  }
  if (noi === loro && noi >= t - 1) return { testo: 'Ai vantaggi: servono due punti di fila.', umore, notizia: true }
  const somma = noi + loro
  if (ultimo !== 'tolto' && somma > 0 && somma % cambioOgni(t) === 0) return { testo: 'Cambio campo!', umore, notizia: true }
  if (ultimo === 'noi') return { testo: 'Bel punto! Avanti così.', umore, notizia: false }
  if (ultimo === 'loro') return { testo: 'Testa alta, il prossimo è nostro.', umore, notizia: false }
  if (ultimo === 'tolto') return { testo: 'Punto tolto: si riparte da qui.', umore, notizia: false }
  return { testo: i === 0 ? 'Si comincia! Tocca chi fa punto.' : `Set ${i + 1}: si riparte da zero.`, umore, notizia: false }
}
