// ============================================================================
// Partita live (il redesign, schermata 17): il segnapunti da bordo campo.
//
// Due modi, scelti in cima all'impostazione:
//   - «Torneo»: la partita si salva nel torneo a fine partita (`onSave`);
//   - «Tra amici»: niente torneo né fase, nomi facoltativi («Noi» / «Loro»),
//     set e punti a scelta. Nel database una partita senza torneo non può
//     stare: a fine partita va nello STORICO di questo telefono (le ultime 20,
//     `PartitaLive.storico.ts`), perché chi gioca con gli amici i punti se li
//     dimentica. Da lì, se si vuole, «Salva in un torneo…».
// Si apre su «Torneo» solo se oggi c'è un torneo: altrimenti l'ultimo torneo
// è di giorni fa, e chi apre il segnapunti sta quasi certamente giocando con
// gli amici.
//
// Tre momenti nella stessa rotta a tutto schermo:
//   1. l'IMPOSTAZIONE, nello stile del modulo «Nuova partita»: il modo, poi
//      torneo, fase, avversari (o compagno, avversari, formato), «Inizia»; tra
//      amici, sotto, «Le tue partite tra amici»;
//   2. il TABELLONE: due pannelli enormi (in alto loro, in basso noi) che sono
//      il pulsante «+1», il «−1» di vetro nell'angolo, Pallo in mezzo che
//      esulta o si preoccupa, «Timeout» e «Chiudi il set» in fondo;
//   3. il RIEPILOGO a partita finita: nel torneo «Salva la partita», che
//      consegna a `onSave` la stessa forma dello sheet «Nuova partita»; tra
//      amici il risultato (già nello storico), «Nuova partita» e «Salva in un
//      torneo…», che sceglie torneo e fase e passa dallo stesso `onSave`.
//
// Le regole sono quelle del beach volley: set a 21 (il terzo a 15) con due
// punti di scarto, cambio campo ogni 7 punti (ogni 5 nei set a 15), al meglio
// dei tre set. Tra amici si può giocare un set solo e/o a 15 (la partitella).
// Quando il set è finito lo si propone; «Chiudi il set» resta sempre
// possibile, con una conferma se il set non è finito.
//
// La partita in corso vive in sessionStorage: un refresh, la scheda scaricata
// dal telefono o un'app aperta sopra non la perdono. Si cancella quando è
// salvata (nel torneo o, tra amici, nello storico) o quando si esce
// scartandola (con conferma: il dialogo è della schermata, perché solo lei sa
// che cosa va perso e deve cancellare la memoria).
//
// Bordo campo vuol dire dita sabbiose e occhi altrove: bersagli enormi, una
// live region col punteggio («14 a 12»), le frecce da tastiera, una vibrazione
// leggera al punto dove c'è, e lo schermo che non si spegne (Wake Lock).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { AnimatePresence } from 'motion/react'
import type { LiveTorneo, PartitaLiveProps } from '../app/contracts'
import { PHASES } from '../lib/db.enums'
import type { AnyForm, Phase } from '../lib/models'
import { Pallo } from '../components/Pallo'
import type { PalloUmore } from '../components/Pallo'
import {
  Button,
  ConfirmDialog,
  FilterChips,
  IconButton,
  List,
  ListGroup,
  ListItem,
  ListRow,
  NavBar,
  Note,
  Page,
  Section,
  SegmentedControl,
  Select,
  TextArea,
  TextField,
} from '../components/ui/index'
import {
  MAX_STORICO,
  esitoAmici,
  leggiStorico,
  nomeLoro as nomeLoroAmici,
  nomeNoi as nomeNoiAmici,
  nuovoId,
  quandoDetto,
  registraPartita,
  svuotaStorico,
  togliPartita,
} from './PartitaLive.storico'
import type { PartitaAmici } from './PartitaLive.storico'
import './PartitaLive.css'
import { LiquidGlass } from '../components/ui/LiquidGlass'

/** La chiave della partita in corso (una per scheda: è sessionStorage). */
export const CHIAVE_LIVE = 'bvd_partita_live'

const TIMEOUT_S = 30

type Squadra = 'noi' | 'loro'
/** Chi ha mosso il punteggio per ultimo: decide Pallo, la nuvoletta e il «pop». */
type Ultimo = Squadra | 'tolto' | null
/** Dove va a finire la partita: nel torneo, o nello storico di questo telefono. */
export type Modo = 'torneo' | 'amici'

/** Quanti set e a quanti punti. Il torneo gioca sempre quello del beach. */
export interface Formato {
  set: 1 | 3
  punti: 21 | 15
}
export const FORMATO_BEACH: Formato = { set: 3, punti: 21 }

interface SetChiuso {
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
const setFinito = (a: number, b: number, t: number) => Math.max(a, b) >= t && Math.abs(a - b) >= 2
/** Il cambio campo del beach: ogni 7 punti nei set a 21, ogni 5 in quelli a 15. */
const cambioOgni = (t: number) => (t >= 21 ? 7 : 5)
/** I set da vincere: 2 su 3, o quello unico. */
const daVincere = (f: Formato) => Math.ceil(f.set / 2)

function vinti(chiusi: SetChiuso[]) {
  return { noi: chiusi.filter((s) => s.us > s.them).length, loro: chiusi.filter((s) => s.them > s.us).length }
}

/** I set vinti che servono, o tutti i set giocati: la partita è chiusa. */
function partitaChiusa(chiusi: SetChiuso[], f: Formato) {
  const v = vinti(chiusi)
  return v.noi >= daVincere(f) || v.loro >= daVincere(f) || chiusi.length >= f.set
}

/** «Set 2 di 3», o «Set unico». */
const titoloSet = (indice: number, f: Formato) => (f.set === 1 ? 'Set unico' : `Set ${indice + 1} di ${f.set}`)

/** Le regole del formato scelto, dette per intero sotto la scelta. */
function regole(f: Formato) {
  if (f.set === 1) return f.punti === 15 ? 'Un set solo a 15: la partitella. Due punti di scarto.' : 'Un set solo a 21, con due punti di scarto.'
  return f.punti === 15
    ? 'Al meglio dei tre set, tutti a 15. Sempre due punti di scarto.'
    : 'Al meglio dei tre set: a 21, il terzo a 15. Sempre due punti di scarto.'
}

interface Battuta {
  testo: string
  umore: PalloUmore
  /** Va detta anche allo screen reader, insieme al punteggio. */
  notizia: boolean
}

/** Che cosa dice Pallo: la cosa più importante che sta succedendo. */
function battuta(p: PartitaInCorso): Battuta {
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

// --------------------------------------------------------------- memoria
const intero = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 1000

function formatoValido(x: unknown): Formato | null {
  if (!x || typeof x !== 'object') return null
  const f = x as Partial<Formato>
  return (f.set === 1 || f.set === 3) && (f.punti === 21 || f.punti === 15) ? { set: f.set, punti: f.punti } : null
}

/** La partita lasciata in questa scheda, se è ancora valida (torneo compreso). */
function leggi(tornei: LiveTorneo[]): PartitaInCorso | null {
  try {
    const raw = window.sessionStorage.getItem(CHIAVE_LIVE)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<PartitaInCorso> | null
    if (!p || p.v !== 1) return null
    // Senza `modo` è una partita lasciata prima che ci fosse «Tra amici»:
    // era di un torneo.
    const modo: Modo = p.modo === 'amici' ? 'amici' : 'torneo'
    const torneoId = typeof p.torneoId === 'string' ? p.torneoId : ''
    // Il torneo non c'è più (eliminato in un'altra scheda): la partita non
    // avrebbe dove andare.
    if (modo === 'torneo' && !tornei.some((t) => t.id === torneoId)) return null
    const fase = PHASES.find((f) => f === p.fase)
    if (!fase || !intero(p.noi) || !intero(p.loro)) return null
    const formato = (modo === 'amici' && formatoValido(p.formato)) || FORMATO_BEACH
    const chiusi = Array.isArray(p.chiusi) ? p.chiusi : null
    if (!chiusi || chiusi.length > formato.set || !chiusi.every((s) => intero(s?.us) && intero(s?.them))) return null
    return {
      v: 1,
      modo,
      id: typeof p.id === 'string' && p.id ? p.id : nuovoId(),
      torneoId: modo === 'torneo' ? torneoId : '',
      fase,
      compagno: modo === 'amici' && typeof p.compagno === 'string' ? p.compagno : '',
      avversari: typeof p.avversari === 'string' ? p.avversari : '',
      formato,
      chiusi: chiusi.map((s) => ({ us: s.us, them: s.them })),
      noi: p.noi,
      loro: p.loro,
      ultimo: p.ultimo === 'noi' || p.ultimo === 'loro' || p.ultimo === 'tolto' ? p.ultimo : null,
      colpo: 0,
      finita: p.finita === true,
      aMano: p.aMano === true,
      note: typeof p.note === 'string' ? p.note : '',
    }
  } catch {
    return null
  }
}

function scrivi(p: PartitaInCorso | null) {
  try {
    if (p) window.sessionStorage.setItem(CHIAVE_LIVE, JSON.stringify(p))
    else window.sessionStorage.removeItem(CHIAVE_LIVE)
  } catch {
    /* navigazione privata o memoria piena: la partita resta in pagina */
  }
}

// --------------------------------------------------------------- telefono
function vibra(schema: number | number[]) {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(schema)
  } catch {
    /* non c'è (iPhone): il punto si vede e si sente lo stesso */
  }
}

/**
 * Lo schermo resta acceso mentre si gioca. Il blocco cade da solo quando la
 * scheda va in background: lo si richiede al ritorno. Si rilascia all'uscita.
 */
function useSchermoAcceso(attivo: boolean) {
  useEffect(() => {
    if (!attivo || typeof navigator === 'undefined' || !('wakeLock' in navigator) || !navigator.wakeLock) return
    const wl = navigator.wakeLock
    let sentinella: WakeLockSentinel | null = null
    let vivo = true
    const chiedi = () => {
      if (document.visibilityState !== 'visible') return
      wl.request('screen')
        .then((s) => {
          if (vivo) sentinella = s
          else void s.release().catch(() => undefined)
        })
        .catch(() => undefined)
    }
    const alRitorno = () => {
      if (document.visibilityState === 'visible') chiedi()
    }
    chiedi()
    document.addEventListener('visibilitychange', alRitorno)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', alRitorno)
      void sentinella?.release().catch(() => undefined)
    }
  }, [attivo])
}

/** «Ferrari / Conti» → «Ferrari e Conti», per i nomi dei pulsanti. */
const nomeDetto = (avversari: string, altrimenti: string) => (avversari.trim() ? avversari.trim().replace(/\s*\/\s*/g, ' e ') : altrimenti)

/** Il torneo proposto, se è fra i tornei; altrimenti il primo. */
const primoTorneo = (tornei: LiveTorneo[], torneoDefault: string | null) =>
  torneoDefault && tornei.some((t) => t.id === torneoDefault) ? torneoDefault : tornei[0]?.id ?? ''

/** Quello che serve per cominciare: lo raccoglie l'impostazione. */
interface Avvio {
  modo: Modo
  torneoId: string
  fase: Phase
  compagno: string
  avversari: string
  formato: Formato
}

type Dialogo = 'esci' | 'set' | 'elimina' | 'svuota' | null

export default function PartitaLive({
  tornei,
  torneoDefault,
  torneoOggi = false,
  utente,
  onSave,
  onDone,
  onExit,
  onNuovoTorneo,
  registerExitGuard,
}: PartitaLiveProps) {
  const [partita, setPartita] = useState<PartitaInCorso | null>(() => leggi(tornei))
  const [storico, setStorico] = useState<PartitaAmici[]>(() => leggiStorico(utente))
  // «Nuova partita» dopo una tra amici: l'impostazione riparte da lì (rivincita).
  const [ultime, setUltime] = useState<Avvio | null>(null)
  const [annuncio, setAnnuncio] = useState('')
  const [avviso, setAvviso] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [daEliminare, setDaEliminare] = useState<PartitaAmici | null>(null)
  const [apertoDa, setApertoDa] = useState<HTMLElement | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [timeoutFine, setTimeoutFine] = useState<number | null>(null)
  const [adesso, setAdesso] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const timeoutBtn = useRef<HTMLButtonElement>(null)
  const riprendiBtn = useRef<HTMLButtonElement>(null)
  // Uscita confermata o partita salvata: la guardia dell'indietro tace.
  const uscendo = useRef(false)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  const vista = !partita ? 'imposta' : partita.finita ? 'fine' : 'gioco'

  // La memoria segue la partita: c'è finché c'è lei.
  useEffect(() => {
    scrivi(partita)
  }, [partita])

  useSchermoAcceso(vista !== 'imposta')

  // Il focus va al titolo a ogni cambio di momento (e all'apertura: la shell
  // lo cerca prima che il chunk arrivi).
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [vista])

  // ---------------------------------------------------- guardia d'uscita
  // Una partita tra amici finita è già nello storico: uscire non perde niente.
  const alSicuro = !!partita && partita.modo === 'amici' && partita.finita
  const sporca = !!partita && !alSicuro && (partita.noi + partita.loro > 0 || partita.chiusi.length > 0)
  const sporcaRef = useRef(sporca)
  sporcaRef.current = sporca
  const chiediUscita = useRef<() => void>(() => undefined)
  chiediUscita.current = () => {
    setApertoDa(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setDialogo('esci')
  }
  useEffect(() => {
    const off = registerExitGuard?.(
      () => sporcaRef.current && !uscendo.current,
      () => chiediUscita.current(),
    )
    return () => {
      if (typeof off === 'function') off()
    }
  }, [registerExitGuard])

  const esci = () => {
    if (sporca) {
      chiediUscita.current()
      return
    }
    // Niente di giocato (o già al sicuro): si esce e basta, senza lasciare
    // niente in memoria.
    uscendo.current = true
    scrivi(null)
    onExit()
  }

  const scarta = () => {
    uscendo.current = true
    scrivi(null)
    setDialogo(null)
    onExit()
  }

  // ------------------------------------------------------------- punti
  const aggiorna = (next: PartitaInCorso, parole: string) => {
    setPartita(next)
    setAvviso(null)
    setAnnuncio(parole)
  }

  const punto = (chi: Squadra) => {
    if (!partita || partita.finita) return
    const segnato = chi === 'noi' ? { ...partita, noi: partita.noi + 1 } : { ...partita, loro: partita.loro + 1 }
    const next: PartitaInCorso = { ...segnato, ultimo: chi, colpo: partita.colpo + 1 }
    const b = battuta(next)
    vibra(12)
    aggiorna(next, `${next.noi} a ${next.loro}${b.notizia ? `. ${b.testo}` : ''}`)
  }

  const togli = (chi: Squadra) => {
    if (!partita || partita.finita || partita[chi] === 0) return
    const tolto = chi === 'noi' ? { ...partita, noi: partita.noi - 1 } : { ...partita, loro: partita.loro - 1 }
    const next: PartitaInCorso = { ...tolto, ultimo: 'tolto' }
    aggiorna(next, `Tolto un punto: ${next.noi} a ${next.loro}`)
  }

  /** Tra amici, la partita finita va nello storico (o ci torna, aggiornata). */
  const nelloStorico = (p: PartitaInCorso) => {
    if (p.modo !== 'amici') return
    setStorico(registraPartita({ id: p.id, quando: new Date().toISOString(), compagno: p.compagno, avversari: p.avversari, set: p.chiusi }, utente))
  }

  const chiusura = () => {
    if (!partita) return
    const i = partita.chiusi.length
    const chiusi = [...partita.chiusi, { us: partita.noi, them: partita.loro }]
    const fine = partitaChiusa(chiusi, partita.formato)
    const next: PartitaInCorso = { ...partita, chiusi, noi: 0, loro: 0, ultimo: null, finita: fine, aMano: false }
    vibra([20, 60, 20])
    setDialogo(null)
    if (fine) nelloStorico(next)
    aggiorna(next, fine ? 'Partita finita.' : `Set ${i + 1} chiuso ${partita.noi} a ${partita.loro}. Set ${i + 2}: 0 a 0.`)
  }

  const chiudiSet = () => {
    if (!partita) return
    const { noi, loro, chiusi } = partita
    if (noi === 0 && loro === 0) {
      // 0–0 con set alle spalle: il pulsante è «Finisci la partita».
      if (chiusi.length > 0) {
        const next: PartitaInCorso = { ...partita, finita: true, aMano: true }
        nelloStorico(next)
        aggiorna(next, 'Partita finita.')
      }
      return
    }
    if (setFinito(noi, loro, obiettivo(chiusi.length, partita.formato))) {
      chiusura()
      return
    }
    setApertoDa(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setDialogo('set')
  }

  // Le frecce: su il pannello in alto (loro), giù quello in basso (noi);
  // con Maiuscolo tolgono il punto.
  const tasti = useRef<(e: KeyboardEvent) => void>(() => undefined)
  tasti.current = (e: KeyboardEvent) => {
    if (vista !== 'gioco' || dialogo || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    if (timeoutFine != null) {
      if (e.key === 'Escape') {
        e.preventDefault()
        fermaTimeout('Timeout finito.')
      }
      return
    }
    const el = e.target instanceof HTMLElement ? e.target : null
    if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
    const chi: Squadra | null = e.key === 'ArrowUp' ? 'loro' : e.key === 'ArrowDown' ? 'noi' : null
    if (!chi) return
    e.preventDefault()
    if (e.shiftKey) togli(chi)
    else punto(chi)
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => tasti.current(e)
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [])

  // ----------------------------------------------------------- timeout
  const resto = timeoutFine == null ? TIMEOUT_S : Math.max(0, Math.ceil((timeoutFine - adesso) / 1000))
  useEffect(() => {
    if (timeoutFine == null) return
    const id = window.setInterval(() => setAdesso(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [timeoutFine])

  const iniziaTimeout = () => {
    const ora = Date.now()
    setAdesso(ora)
    setTimeoutFine(ora + TIMEOUT_S * 1000)
    setAnnuncio(`Timeout: ${TIMEOUT_S} secondi.`)
  }
  function fermaTimeout(parole: string) {
    setTimeoutFine(null)
    setAnnuncio(parole)
    // Il focus torna a chi l'ha chiesto, quando il tabellone non è più inerte.
    window.requestAnimationFrame(() => timeoutBtn.current?.focus({ preventScroll: true }))
  }
  useEffect(() => {
    if (timeoutFine == null) return
    if (resto === 10) setAnnuncio('10 secondi.')
    if (resto === 0) {
      vibra([80, 60, 80])
      fermaTimeout('Fine del timeout: si riprende.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resto])
  useEffect(() => {
    if (timeoutFine != null) riprendiBtn.current?.focus({ preventScroll: true })
  }, [timeoutFine])

  // --------------------------------------------------------- salvataggio
  /** Nel torneo della partita, o (tra amici) in quello scelto con «Salva in un torneo…». */
  const salva = async (torneoId: string, fase: Phase) => {
    if (!partita || salvando || !torneoId) return
    const form: AnyForm = {
      tournamentId: torneoId,
      phase: fase,
      opponents: partita.avversari.trim(),
      note: partita.note.trim(),
      sets: partita.chiusi.map((s) => ({ us: String(s.us), them: String(s.them) })),
    }
    setSalvando(true)
    let ok = false
    try {
      ok = await onSave(form)
    } finally {
      if (vivo.current) setSalvando(false)
    }
    if (!ok) return
    // Salvata: la memoria si svuota e la guardia tace. Tra amici esce anche
    // dallo storico: adesso sta nel torneo, due copie confonderebbero.
    // `onSave` di solito porta già al torneo (e questa schermata se ne va);
    // se non l'ha fatto, ci pensa `onDone`.
    uscendo.current = true
    scrivi(null)
    if (partita.modo === 'amici') {
      const lista = togliPartita(partita.id, utente)
      if (vivo.current) setStorico(lista)
    }
    window.setTimeout(() => {
      if (vivo.current) onDone(torneoId)
    }, 0)
  }

  const riprendi = () => {
    if (!partita) return
    // Tra amici, la partita torna in gioco: esce dallo storico finché non
    // finisce di nuovo.
    if (partita.modo === 'amici') setStorico(togliPartita(partita.id, utente))
    if (partita.aMano || !partita.chiusi.length) {
      aggiorna({ ...partita, finita: false, aMano: false, ultimo: null }, `Set ${partita.chiusi.length + 1}: ${partita.noi} a ${partita.loro}.`)
      return
    }
    const ultimo = partita.chiusi[partita.chiusi.length - 1]
    aggiorna(
      { ...partita, chiusi: partita.chiusi.slice(0, -1), noi: ultimo.us, loro: ultimo.them, finita: false, aMano: false, ultimo: null },
      `Set ${partita.chiusi.length} riaperto: ${ultimo.us} a ${ultimo.them}.`,
    )
  }

  const inizia = (a: Avvio) => {
    uscendo.current = false
    aggiorna(
      {
        v: 1,
        modo: a.modo,
        id: nuovoId(),
        torneoId: a.modo === 'torneo' ? a.torneoId : '',
        fase: a.fase,
        compagno: a.modo === 'amici' ? a.compagno.trim() : '',
        avversari: a.avversari.trim(),
        formato: a.modo === 'amici' ? a.formato : FORMATO_BEACH,
        chiusi: [],
        noi: 0,
        loro: 0,
        ultimo: null,
        colpo: 0,
        finita: false,
        aMano: false,
        note: '',
      },
      a.formato.set === 1 && a.modo === 'amici' ? 'Set unico: 0 a 0.' : 'Set 1: 0 a 0.',
    )
  }

  /** Dal riepilogo tra amici: di nuovo all'impostazione, con gli stessi nomi e formato. */
  const nuovaPartita = () => {
    if (!partita) return
    setUltime({ modo: 'amici', torneoId: '', fase: 'Girone', compagno: partita.compagno, avversari: partita.avversari, formato: partita.formato })
    setAnnuncio('')
    setPartita(null)
  }

  // -------------------------------------------------------------- storico
  const chiediElimina = (p: PartitaAmici, da: HTMLElement) => {
    setDaEliminare(p)
    setApertoDa(da)
    setDialogo('elimina')
  }
  const elimina = () => {
    const p = daEliminare
    if (!p) return
    // Il cestino che l'ha chiesto sparisce con la riga: il focus va a quello
    // della riga dopo (o di quella prima), o al titolo se non resta niente.
    const righe = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-riga]') ?? [])
    const i = righe.findIndex((r) => r.dataset.riga === p.id)
    const vicina = (righe[i + 1] ?? righe[i - 1])?.querySelector<HTMLElement>('button')
    ;(vicina ?? rootRef.current?.querySelector<HTMLElement>('h1'))?.focus({ preventScroll: true })
    setStorico(togliPartita(p.id, utente))
    setAnnuncio('Partita eliminata.')
    setDialogo(null)
  }
  const svuota = () => {
    rootRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    svuotaStorico(utente)
    setStorico([])
    setAnnuncio('Partite tra amici cancellate.')
    setDialogo(null)
  }

  // ------------------------------------------------------------- disegno
  const torneo = partita ? tornei.find((t) => t.id === partita.torneoId) : undefined
  const amici = partita?.modo === 'amici'
  const nomeNoi = !partita ? '' : amici ? nomeNoiAmici(partita.compagno) : torneo?.partner ? `Tu e ${torneo.partner}` : 'Tu'
  const nomeLoro = !partita ? '' : amici ? nomeLoroAmici(partita.avversari) : partita.avversari || 'Avversari'

  let corpo: ReactNode
  if (!partita) {
    corpo = (
      <Impostazione
        tornei={tornei}
        torneoDefault={torneoDefault}
        torneoOggi={torneoOggi}
        iniziale={ultime}
        storico={storico}
        onInizia={inizia}
        onEsci={esci}
        onNuovoTorneo={onNuovoTorneo}
        onElimina={chiediElimina}
        onSvuota={(da) => {
          setApertoDa(da)
          setDialogo('svuota')
        }}
      />
    )
  } else if (partita.finita) {
    corpo = (
      <Riepilogo
        p={partita}
        contesto={amici ? 'Tra amici' : [torneo?.name, partita.fase].filter(Boolean).join(' · ')}
        nomeNoi={nomeNoi}
        nomeLoro={nomeLoro}
        tornei={tornei}
        torneoDefault={torneoDefault}
        salvando={salvando}
        onNote={(note) => setPartita({ ...partita, note })}
        onSalva={(torneoId, fase) => void salva(torneoId, fase)}
        onRiprendi={riprendi}
        onNuova={nuovaPartita}
        onEsci={esci}
      />
    )
  } else {
    const i = partita.chiusi.length
    const t = obiettivo(i, partita.formato)
    const finito = setFinito(partita.noi, partita.loro, t)
    const zero = partita.noi === 0 && partita.loro === 0
    const b = battuta(partita)
    const precedente = partita.chiusi[i - 1]
    const detto = nomeDetto(partita.avversari, amici ? 'loro' : 'gli avversari')
    const pop = (chi: Squadra) => (partita.ultimo === chi && partita.colpo > 0 ? (partita.colpo % 2 ? 'a' : 'b') : undefined)
    const inPausa = timeoutFine != null
    corpo = (
      <div className="live" data-vista="gioco">
        <header className="live-head">
          <IconButton icon="close" label="Chiudi la partita live" variant="glass" iconSize={20} onClick={esci} />
          <div className="live-head-text">
            <p className="live-kicker">{amici ? `Tra amici · set a ${t}` : [torneo?.name, partita.fase].filter(Boolean).join(' · ')}</p>
            <h1 className="live-title" tabIndex={-1}>
              {titoloSet(i, partita.formato)}
            </h1>
          </div>
          {precedente && (
            <p className="live-pill">
              Set {i}
              <span className="live-pill-n">
                {precedente.us}–{precedente.them}
              </span>
            </p>
          )}
        </header>

        <div className="live-campo">
          <div className="live-gioco" {...(inPausa ? { inert: '' } : {})}>
            <Pannello
              chi="loro"
              nome={nomeLoro}
              punti={partita.loro}
              pop={pop('loro')}
              etichetta={`Punto per ${detto}, ora ${partita.loro}`}
              etichettaMeno={`Togli un punto a ${detto}`}
              onPiu={() => punto('loro')}
              onMeno={() => togli('loro')}
            />
            <div className="live-pallo" aria-hidden="true">
              <div className="live-pallo-in">
                <Pallo key={b.umore} umore={b.umore} size={80} ombra={false} />
                <p key={avviso ?? b.testo} className="live-bolla">
                  {avviso ?? b.testo}
                </p>
              </div>
            </div>
            <Pannello
              chi="noi"
              nome={nomeNoi}
              punti={partita.noi}
              pop={pop('noi')}
              etichetta={`Punto per noi, ora ${partita.noi}`}
              etichettaMeno="Togli un punto a noi"
              onPiu={() => punto('noi')}
              onMeno={() => togli('noi')}
            />
          </div>
          {inPausa && <Timeout resto={resto} riprendiRef={riprendiBtn} onRiprendi={() => fermaTimeout('Timeout finito.')} />}
        </div>

        <div className="live-azioni" {...(inPausa ? { inert: '' } : {})}>
          <Button ref={timeoutBtn} variant="glass" size="lg" className="live-timeout-btn" onClick={iniziaTimeout}>
            Timeout
          </Button>
          <Button
            size="lg"
            className="live-chiudi"
            data-pronto={finito ? '' : undefined}
            disabled={zero && i === 0}
            onDisabledClick={() => {
              setAvviso('Prima segna qualche punto.')
              setAnnuncio('Prima segna qualche punto: il set è 0 a 0.')
            }}
            onClick={chiudiSet}
          >
            {zero && i > 0 ? 'Finisci la partita' : 'Chiudi il set'}
          </Button>
        </div>
      </div>
    )
  }

  const t = partita ? obiettivo(partita.chiusi.length, partita.formato) : 21
  const chiEliminare = daEliminare ? `${nomeNoiAmici(daEliminare.compagno)} vs ${nomeLoroAmici(daEliminare.avversari)}` : ''
  return (
    <div ref={rootRef} className="live-root">
      {corpo}
      {/* Il punteggio per chi non guarda: «14 a 12», gli eventi del set. */}
      <p className="sr-only" role="status" aria-live="polite">
        {annuncio}
      </p>
      <AnimatePresence>
        {dialogo === 'set' && partita && (
          <ConfirmDialog
            key="set"
            title={`Chiudere il set sul ${partita.noi}–${partita.loro}?`}
            text={
              partita.noi === partita.loro
                ? `Il set non è finito ed è in parità: non lo vince nessuno. Si vince a ${t} con due punti di scarto.`
                : `Il set non è finito: si vince a ${t} con due punti di scarto.`
            }
            confirmLabel="Chiudi il set"
            cancelLabel="Continua a giocare"
            tone="default"
            opener={apertoDa}
            onConfirm={chiusura}
            onCancel={() => setDialogo(null)}
          />
        )}
        {dialogo === 'esci' && (
          <ConfirmDialog
            key="esci"
            title={partita?.finita ? 'Uscire senza salvare?' : 'Uscire dalla partita?'}
            text={
              amici
                ? 'Il punteggio va perso: fra le tue partite tra amici restano solo quelle finite.'
                : 'Il punteggio non è salvato: uscendo, questa partita va persa.'
            }
            confirmLabel="Esci e scarta"
            cancelLabel={partita?.finita ? 'Resta' : 'Continua la partita'}
            opener={apertoDa}
            onConfirm={scarta}
            onCancel={() => setDialogo(null)}
          />
        )}
        {dialogo === 'elimina' && daEliminare && (
          <ConfirmDialog
            key="elimina"
            title="Eliminare questa partita?"
            text={`${chiEliminare} (${quandoDetto(daEliminare.quando).toLowerCase()}) sparisce dalle tue partite tra amici.`}
            confirmLabel="Elimina"
            opener={apertoDa}
            onConfirm={elimina}
            onCancel={() => setDialogo(null)}
          />
        )}
        {dialogo === 'svuota' && (
          <ConfirmDialog
            key="svuota"
            title="Cancellare tutte le partite tra amici?"
            text={`Sono ${storico.length} e stanno solo su questo telefono: non si possono recuperare.`}
            confirmLabel="Cancella tutte"
            opener={apertoDa}
            onConfirm={svuota}
            onCancel={() => setDialogo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ================================================================ pezzi
function Pannello({ chi, nome, punti, pop, etichetta, etichettaMeno, onPiu, onMeno }: {
  chi: Squadra
  nome: string
  punti: number
  pop?: 'a' | 'b'
  etichetta: string
  etichettaMeno: string
  onPiu: () => void
  onMeno: () => void
}) {
  const freccia = chi === 'loro' ? 'ArrowUp' : 'ArrowDown'
  const numero = (
    <span className="live-num" data-pop={pop}>
      {punti}
    </span>
  )
  const etichettaVista = <span className="live-nome">{nome}</span>
  return (
    <div className="live-panel" data-chi={chi}>
      {/* Tutto il pannello è il «+1»: si segna senza mirare. */}
      <button type="button" className="live-punto press" aria-label={etichetta} aria-keyshortcuts={freccia} onClick={onPiu}>
        {chi === 'loro' ? (
          <>
            {etichettaVista}
            {numero}
          </>
        ) : (
          <>
            {numero}
            {etichettaVista}
          </>
        )}
      </button>
      <button
        type="button"
        className="live-meno press"
        aria-label={etichettaMeno}
        aria-keyshortcuts={`Shift+${freccia}`}
        aria-disabled={punti === 0 || undefined}
        onClick={onMeno}
      >
        <LiquidGlass layer />
        <span aria-hidden="true">−1</span>
      </button>
    </div>
  )
}

function Timeout({ resto, riprendiRef, onRiprendi }: { resto: number; riprendiRef: RefObject<HTMLButtonElement>; onRiprendi: () => void }) {
  return (
    <section className="live-timeout" aria-labelledby="live-timeout-t">
      <Pallo umore="pensa" size={72} ombra={false} />
      <h2 id="live-timeout-t" className="live-timeout-t">
        Timeout
      </h2>
      {/* Un timer non si annuncia a ogni secondo: lo dice la live region a 30, 10 e 0. */}
      <p className="live-timeout-n" role="timer" aria-live="off">
        {resto}
        <span className="live-timeout-u"> {resto === 1 ? 'secondo' : 'secondi'}</span>
      </p>
      <span className="live-timeout-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${resto / TIMEOUT_S})` }} />
      </span>
      <Button ref={riprendiRef} size="lg" onClick={onRiprendi}>
        Riprendi il gioco
      </Button>
    </section>
  )
}

/** La fase, con l'etichetta visibile sopra le chip (il gruppo ha la sua). */
function SceltaFase({ value, onChange }: { value: Phase; onChange: (f: Phase) => void }) {
  return (
    <div className="live-scelta">
      <p className="live-label" aria-hidden="true">
        Fase
      </p>
      <FilterChips label="Fase" value={value} onChange={(v) => onChange(PHASES.find((f) => f === v) ?? 'Girone')} options={PHASES.map((f) => ({ value: f, label: f }))} />
    </div>
  )
}

function Impostazione({ tornei, torneoDefault, torneoOggi, iniziale, storico, onInizia, onEsci, onNuovoTorneo, onElimina, onSvuota }: {
  tornei: LiveTorneo[]
  torneoDefault: string | null
  torneoOggi: boolean
  iniziale: Avvio | null
  storico: PartitaAmici[]
  onInizia: (a: Avvio) => void
  onEsci: () => void
  onNuovoTorneo?: () => void
  onElimina: (p: PartitaAmici, da: HTMLElement) => void
  onSvuota: (da: HTMLElement) => void
}) {
  const [modo, setModo] = useState<Modo>(() => iniziale?.modo ?? (torneoOggi && tornei.length > 0 ? 'torneo' : 'amici'))
  const [torneoId, setTorneoId] = useState(() => primoTorneo(tornei, torneoDefault))
  const [fase, setFase] = useState<Phase>('Girone')
  // Gli avversari passano da un modo all'altro: chi li ha scritti e poi cambia
  // idea non li riscrive.
  const [avversari, setAvversari] = useState(iniziale?.avversari ?? '')
  const [compagno, setCompagno] = useState(iniziale?.compagno ?? '')
  const [formato, setFormato] = useState<Formato>(iniziale?.formato ?? FORMATO_BEACH)
  const modoRef = useRef<HTMLDivElement>(null)
  const scelto = tornei.find((t) => t.id === torneoId)

  const avvio = (m: Modo): Avvio => ({ modo: m, torneoId, fase, compagno, avversari, formato })

  // «Gioca tra amici» dal vuoto del torneo: il pulsante sparisce, il focus va
  // al segmento scelto.
  const versoAmici = () => {
    setModo('amici')
    window.requestAnimationFrame(() => modoRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true }))
  }

  let modulo: ReactNode
  if (modo === 'torneo' && tornei.length === 0) {
    modulo = (
      <div className="live-vuoto">
        <Pallo umore="sbircia" size={96} ombra={false} />
        <h2 className="live-vuoto-t">Prima serve un torneo</h2>
        <p className="live-vuoto-p">La partita di un torneo si salva dentro il torneo: crealo in un attimo. Se giochi con gli amici, segna i punti «Tra amici».</p>
        <div className="live-vuoto-azioni">
          {onNuovoTorneo && (
            <Button size="lg" icon="plus" block onClick={onNuovoTorneo}>
              Crea un torneo
            </Button>
          )}
          <Button variant="glass" size="lg" block onClick={versoAmici}>
            Gioca tra amici
          </Button>
        </div>
      </div>
    )
  } else if (modo === 'torneo') {
    modulo = (
      <form
        className="live-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (torneoId) onInizia(avvio('torneo'))
        }}
      >
        <Select
          label="Torneo"
          value={torneoId}
          onChange={setTorneoId}
          options={tornei.map((t) => ({ value: t.id, label: t.name }))}
          hint={scelto?.partner ? `Compagno: ${scelto.partner}, come nel torneo` : 'Nessun compagno nel torneo: si gioca come «Tu».'}
        />
        <SceltaFase value={fase} onChange={setFase} />
        <TextField label="Avversari (coppia)" value={avversari} onChange={setAvversari} placeholder="es. Bianchi / Verdi" autoComplete="off" />
        <Button type="submit" size="lg" block className="live-inizia">
          Inizia
        </Button>
      </form>
    )
  } else {
    modulo = (
      <>
        <form
          className="live-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            onInizia(avvio('amici'))
          }}
        >
          <TextField label="Il tuo compagno (facoltativo)" value={compagno} onChange={setCompagno} placeholder="es. Luca" autoComplete="off" maxLength={40} />
          <TextField
            label="Avversari (facoltativo)"
            value={avversari}
            onChange={setAvversari}
            placeholder="es. Marco / Gio"
            autoComplete="off"
            maxLength={60}
            hint="Se li lasci vuoti, sul tabellone siete «Noi» e «Loro»."
          />
          <div className="live-formato">
            <div className="live-formato-scelte">
              <div className="live-scelta">
                <p className="live-label" aria-hidden="true">
                  Set
                </p>
                <SegmentedControl
                  label="Set"
                  value={String(formato.set)}
                  onChange={(v) => setFormato({ ...formato, set: v === '1' ? 1 : 3 })}
                  options={[
                    { value: '1', label: '1 set' },
                    { value: '3', label: '2 su 3' },
                  ]}
                />
              </div>
              <div className="live-scelta">
                <p className="live-label" aria-hidden="true">
                  Punti
                </p>
                <SegmentedControl
                  label="Punti"
                  value={String(formato.punti)}
                  onChange={(v) => setFormato({ ...formato, punti: v === '15' ? 15 : 21 })}
                  options={[
                    { value: '21', label: 'a 21' },
                    { value: '15', label: 'a 15' },
                  ]}
                />
              </div>
            </div>
            <p className="live-regole">{regole(formato)}</p>
          </div>
          <Button type="submit" size="lg" block className="live-inizia">
            Inizia
          </Button>
        </form>
        <Storico storico={storico} onElimina={onElimina} onSvuota={onSvuota} />
      </>
    )
  }

  return (
    <div className="live-setup">
      <Page width="reading">
        <NavBar title="Partita live" subtitle="Il segnapunti da bordo campo, in torneo o tra amici." close={{ label: 'Chiudi la partita live', onClick: onEsci }}>
          <div ref={modoRef} className="live-modo rise">
            <SegmentedControl
              label="Che partita è"
              value={modo}
              onChange={(v) => setModo(v === 'torneo' ? 'torneo' : 'amici')}
              options={[
                { value: 'torneo', label: 'Torneo' },
                { value: 'amici', label: 'Tra amici' },
              ]}
            />
          </div>
        </NavBar>
        {modulo}
      </Page>
    </div>
  )
}

/** «Le tue partite tra amici»: una riga per partita, col cestino. */
function Storico({ storico, onElimina, onSvuota }: {
  storico: PartitaAmici[]
  onElimina: (p: PartitaAmici, da: HTMLElement) => void
  onSvuota: (da: HTMLElement) => void
}) {
  return (
    <Section
      id="live-storico-t"
      title="Le tue partite tra amici"
      className="live-storico"
      action={
        storico.length > 1 ? (
          <Button variant="destructive-plain" size="sm" onClick={(e) => onSvuota(e.currentTarget)}>
            Cancella tutte
          </Button>
        ) : undefined
      }
    >
      {storico.length > 0 ? (
        <>
          <List className="live-storico-lista">
            {storico.map((p) => (
              <RigaStorico key={p.id} p={p} onElimina={onElimina} />
            ))}
          </List>
          <Note className="live-storico-nota">Restano su questo telefono: le ultime {MAX_STORICO}.</Note>
        </>
      ) : (
        <Note className="live-storico-nota">Ancora nessuna. A fine partita il risultato resta qui, anche se chiudi l'app.</Note>
      )}
    </Section>
  )
}

function RigaStorico({ p, onElimina }: { p: PartitaAmici; onElimina: (p: PartitaAmici, da: HTMLElement) => void }) {
  const esito = esitoAmici(p.set)
  const chi = `${nomeNoiAmici(p.compagno)} vs ${nomeLoroAmici(p.avversari)}`
  const quando = quandoDetto(p.quando)
  return (
    <ListItem>
      <div className="live-riga" data-riga={p.id}>
        <span className="live-riga-main">
          {/* Forma e riempimento, come la riga partita: V piena, P col filo, = per il pari. */}
          <span className="live-esito" data-esito={esito} aria-hidden="true">
            {esito === 'vinta' ? 'V' : esito === 'persa' ? 'P' : '='}
          </span>
          <span className="live-riga-testo">
            <span className="live-riga-chi">{chi}</span>
            {/* Quando e i set sulla stessa riga; se non ci stanno, i set vanno
                sotto, sempre allineati al nome (mai appesi a destra). */}
            <span className="live-riga-sotto">
              <span className="live-riga-quando">{quando}</span>
              <span className="sr-only">{esito === 'vinta' ? 'Vinta' : esito === 'persa' ? 'Persa' : 'Pari'}</span>
              <span className="live-riga-set">
                {p.set.map((s, i) => (
                  <span key={i} className="live-set" data-vinto={s.us > s.them ? '' : undefined}>
                    {s.us}–{s.them}
                  </span>
                ))}
              </span>
            </span>
          </span>
        </span>
        <IconButton icon="trash" variant="quiet" iconSize={20} label={`Elimina la partita ${chi}, ${quando.toLowerCase()}`} onClick={(e) => onElimina(p, e.currentTarget)} />
      </div>
    </ListItem>
  )
}

function Riepilogo({ p, contesto, nomeNoi, nomeLoro, tornei, torneoDefault, salvando, onNote, onSalva, onRiprendi, onNuova, onEsci }: {
  p: PartitaInCorso
  contesto: string
  nomeNoi: string
  nomeLoro: string
  tornei: LiveTorneo[]
  torneoDefault: string | null
  salvando: boolean
  onNote: (note: string) => void
  onSalva: (torneoId: string, fase: Phase) => void
  onRiprendi: () => void
  onNuova: () => void
  onEsci: () => void
}) {
  const amici = p.modo === 'amici'
  const [inTorneo, setInTorneo] = useState(false)
  const salvaInBtn = useRef<HTMLButtonElement>(null)
  const chiuso = useRef(false)
  // «Annulla» del pannello: il focus torna a «Salva in un torneo…».
  useEffect(() => {
    if (!inTorneo && chiuso.current) salvaInBtn.current?.focus({ preventScroll: true })
  }, [inTorneo])

  const v = vinti(p.chiusi)
  const esito = v.noi > v.loro ? 'Vinta' : v.loro > v.noi ? 'Persa' : 'Finita'
  const vittoria = v.noi > v.loro
  // Un set solo: il titolo dice i punti, non «1–0».
  const unico = p.formato.set === 1 && p.chiusi.length === 1 ? p.chiusi[0] : null
  const risultato = unico ? `${unico.us}–${unico.them}` : `${v.noi}–${v.loro}`
  const riprendi = p.aMano || !p.chiusi.length ? `Torna al set ${p.chiusi.length + 1}` : `Riapri il set ${p.chiusi.length}`
  const bolla = amici
    ? vittoria
      ? 'Che partita! Me la segno io.'
      : v.loro > v.noi
        ? 'Testa alta: la prossima è nostra.'
        : 'Partita chiusa: me la segno io.'
    : vittoria
      ? 'Che partita! Salvala nel diario.'
      : v.loro > v.noi
        ? 'Testa alta: la prossima è nostra.'
        : 'Partita chiusa: salvala nel diario.'

  let azioni: ReactNode
  if (!amici) {
    azioni = (
      <>
        <TextArea label="Note" value={p.note} onChange={onNote} placeholder="Com'è andata?" rows={2} />
        <div className="live-fine-azioni">
          <Button size="lg" block busy={salvando} busyLabel="Salvataggio…" onClick={() => onSalva(p.torneoId, p.fase)}>
            Salva la partita
          </Button>
          <Button variant="glass" size="lg" block onClick={onRiprendi} disabled={salvando}>
            {riprendi}
          </Button>
        </div>
      </>
    )
  } else if (inTorneo) {
    azioni = (
      <SalvaInTorneo
        tornei={tornei}
        torneoDefault={torneoDefault}
        note={p.note}
        salvando={salvando}
        onNote={onNote}
        onSalva={onSalva}
        onAnnulla={() => {
          chiuso.current = true
          setInTorneo(false)
        }}
      />
    )
  } else {
    azioni = (
      <div className="live-fine-azioni">
        <Button size="lg" block onClick={onNuova}>
          Nuova partita
        </Button>
        {tornei.length > 0 && (
          <Button ref={salvaInBtn} variant="glass" size="lg" block onClick={() => setInTorneo(true)}>
            Salva in un torneo…
          </Button>
        )}
        <Button variant="quiet" block onClick={onRiprendi}>
          {riprendi}
        </Button>
      </div>
    )
  }

  return (
    <div className="live live-fine" data-vista="fine">
      <header className="live-head">
        <IconButton icon="close" label="Chiudi la partita live" variant="glass" iconSize={20} onClick={onEsci} />
        <div className="live-head-text">
          <p className="live-kicker">{contesto}</p>
          <h1 className="live-title" tabIndex={-1}>
            {esito} {risultato}
          </h1>
        </div>
      </header>

      <div className="live-fine-pallo" aria-hidden="true">
        <Pallo umore={vittoria ? 'festa' : 'triste'} size={96} ombra={false} />
        <p className="live-bolla">{bolla}</p>
      </div>

      <ListGroup
        id="live-set"
        title={amici ? `${nomeNoi} contro ${nomeLoro}` : `Contro ${nomeLoro}`}
        footer={amici && !inTorneo ? 'Salvata su questo telefono, fra le tue partite tra amici.' : undefined}
        className="live-fine-set"
      >
        {p.chiusi.map((s, i) => (
          <ListRow key={i} title={`Set ${i + 1}`} subtitle={s.us > s.them ? 'Vinto' : s.them > s.us ? 'Perso' : 'Pari'} value={`${s.us}–${s.them}`} />
        ))}
      </ListGroup>

      {azioni}
    </div>
  )
}

/** Tra amici, «Salva in un torneo…»: torneo, fase e note, poi lo stesso salvataggio del torneo. */
function SalvaInTorneo({ tornei, torneoDefault, note, salvando, onNote, onSalva, onAnnulla }: {
  tornei: LiveTorneo[]
  torneoDefault: string | null
  note: string
  salvando: boolean
  onNote: (note: string) => void
  onSalva: (torneoId: string, fase: Phase) => void
  onAnnulla: () => void
}) {
  const [torneoId, setTorneoId] = useState(() => primoTorneo(tornei, torneoDefault))
  const [fase, setFase] = useState<Phase>('Girone')
  const titolo = useRef<HTMLHeadingElement>(null)
  // Il pannello compare sotto i set: il focus (e lo sguardo) vanno lì.
  useEffect(() => {
    titolo.current?.focus()
  }, [])
  const scelto = tornei.find((t) => t.id === torneoId)
  return (
    <section className="live-salva rise" aria-labelledby="live-salva-t">
      <div>
        <h2 ref={titolo} id="live-salva-t" className="live-salva-t" tabIndex={-1}>
          Salva in un torneo
        </h2>
        <p className="live-salva-p">La partita entra nel torneo con i suoi set, come se l'avessi segnata lì.</p>
      </div>
      <Select
        label="Torneo"
        value={torneoId}
        onChange={setTorneoId}
        options={tornei.map((t) => ({ value: t.id, label: t.name }))}
        hint={scelto?.partner ? `Compagno: ${scelto.partner}, come nel torneo` : 'Nessun compagno nel torneo.'}
      />
      <SceltaFase value={fase} onChange={setFase} />
      <TextArea label="Note" value={note} onChange={onNote} placeholder="Com'è andata?" rows={2} />
      <div className="live-fine-azioni">
        <Button size="lg" block busy={salvando} busyLabel="Salvataggio…" onClick={() => onSalva(torneoId, fase)}>
          Salva nel torneo
        </Button>
        <Button variant="glass" size="lg" block onClick={onAnnulla} disabled={salvando}>
          Annulla
        </Button>
      </div>
    </section>
  )
}
