// ============================================================================
// Lo stato dell'assistente: la trascrizione, lo step corrente, la bozza e le
// risposte. La vista (CreaChat.tsx) disegna, questo hook decide.
//
// La pausa "sta scrivendo" è INTERROMPIBILE (MOTION.md §5 F11, R3): il dock
// dello step successivo è già montato (attenuato) mentre l'assistente
// "scrive", e qualunque input sul dock fa comparire subito la domanda — il
// tasto o il tocco vanno comunque a segno. Con reduced-motion la pausa è 0 e
// l'indicatore non c'è.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { AnyForm, Bracket, Category, Format, GuidedMatch, Option, Phase, Placement, Surface } from '../../lib/models'
import {
  INTRO,
  RIPARTENZA,
  battitura,
  coloreDelNome,
  domanda,
  fmtDate,
  fmtSets,
  formDaBozza,
  initialDraft,
  todayISO,
} from './copione'
import type { Draft, Step } from './copione'

export interface Msg {
  id: number
  role: 'ai' | 'user'
  text?: string
  /** Il riepilogo è una card, non un testo: snapshot della bozza. */
  recap?: Draft
}

export interface ScoreRow {
  us: string
  them: string
}

export type CreaRisultato = { id: string; partiteNonSalvate: number } | null

interface Deps {
  partners: Option[]
  venues: Option[]
  onCreate: (form: AnyForm, matches: GuidedMatch[]) => Promise<CreaRisultato>
}

const righeVuote = (): ScoreRow[] => [
  { us: '', them: '' },
  { us: '', them: '' },
]

let idSeq = 0
const nextId = () => ++idSeq

const plurale = (n: number, uno: string, tanti: string) => (n === 1 ? `1 ${uno}` : `${n} ${tanti}`)

export function useAssistente({ partners, venues, onCreate }: Deps) {
  const ridotto = !!useReducedMotion()
  const ctx = { partners, venues }

  // L'apertura c'è già quando la schermata si apre: nessuna pausa iniziale.
  const [messages, setMessages] = useState<Msg[]>(() => INTRO.map((text) => ({ id: nextId(), role: 'ai', text })))
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState<Step>('name')
  const [createdId, setCreatedId] = useState<string | null>(null)
  /** Cresce quando una domanda nuova è entrata nel DOM: il focus va al dock. */
  const [focusTick, setFocusTick] = useState(1)

  const [text, setText] = useState('')
  const [dateVal, setDateVal] = useState(todayISO())
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(righeVuote)

  // La bozza vive in un ref: l'interfaccia la guidano messaggi e step (il
  // riepilogo è uno snapshot), non serve uno stato reattivo.
  const draftRef = useRef<Draft>(initialDraft())
  const pendingMatch = useRef<{ opponents: string; phase: Phase; sets: GuidedMatch['sets'] } | null>(null)
  const alive = useRef(true)
  const risposte = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // ------------------------------------------------------------ la pausa
  const pending = useRef<{ msg: Msg; resolve: () => void; timer: number } | null>(null)

  /** La domanda in attesa compare subito (input sul dock, o fine della pausa). */
  const interrompi = () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    window.clearTimeout(p.timer)
    setTyping(false)
    setMessages((m) => [...m, p.msg])
    p.resolve()
  }

  const say = (payload: { text?: string; recap?: Draft }, delay?: number) =>
    new Promise<void>((resolve) => {
      if (!alive.current) return resolve()
      interrompi()
      const msg: Msg = { id: nextId(), role: 'ai', ...payload }
      const d = ridotto ? 0 : delay ?? battitura((payload.text ?? '').length)
      if (d <= 0) {
        setMessages((m) => [...m, msg])
        resolve()
        return
      }
      setTyping(true)
      const timer = window.setTimeout(interrompi, d)
      pending.current = { msg, resolve, timer }
    })

  useEffect(
    () => () => {
      if (pending.current) window.clearTimeout(pending.current.timer)
    },
    [],
  )

  const patch = (p: Partial<Draft>) => {
    draftRef.current = { ...draftRef.current, ...p }
  }
  const pushUser = (t: string) => {
    // L'eco del tocco: compare subito (ENTRATA). Una domanda ancora in attesa
    // entra prima della risposta.
    interrompi()
    risposte.current++
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: t }])
  }

  // Lo step di destinazione: il dock si monta subito (attenuato durante la
  // pausa), poi arriva la domanda; quando è nel DOM il focus va al dock.
  const goStep = async (target: Step) => {
    setStep(target)
    if (target === 'recap') await say({ recap: { ...draftRef.current } }, ridotto ? 0 : battitura(0))
    const q = domanda(target, draftRef.current, ctx)
    if (q) await say({ text: q })
    if (alive.current) setFocusTick((t) => t + 1)
  }

  // ------------------------------------------------------------ risposte
  const submitName = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    pushUser(v)
    setText('')
    patch({ name: v, color: coloreDelNome(v) })
    void goStep('partner')
  }
  const pickPartner = (p: Option) => {
    pushUser(p.name)
    patch({ partnerId: p.id, newPartnerName: '' })
    void goStep('date')
  }
  const pickNoPartner = () => {
    pushUser('Ho giocato da solo')
    patch({ partnerId: '', newPartnerName: '' })
    void goStep('date')
  }
  const chooseNewPartner = () => {
    // Passa al campo di testo per il nome (nessun messaggio dell'utente).
    interrompi()
    setText('')
    void goStep('partnerName')
  }
  const submitPartnerName = (raw: string, fromResults: boolean) => {
    const v = raw.trim()
    if (!v) return
    pushUser(v)
    setText('')
    patch({ partnerId: 'new', newPartnerName: v })
    void goStep(fromResults ? 'matchOpponents' : 'date')
  }
  const pickDate = (iso: string, label: string) => {
    pushUser(label)
    patch({ date: iso })
    void goStep('venue')
  }
  const pickDateValue = () => pickDate(dateVal, fmtDate(dateVal))
  // Luogo già salvato: il torneo ci si aggancia. `city` resta vuota, la scrive
  // il data layer dal luogo scelto (unica fonte, niente doppia verità).
  const pickVenue = (v: Option) => {
    pushUser(v.name)
    patch({ venueId: v.id, newVenueName: '', city: '' })
    void goStep('category')
  }
  const chooseNewVenue = () => {
    interrompi()
    setText('')
    void goStep('venueName')
  }
  // Luogo nuovo: la chat chiede una riga sola (non è un form), quindi il nome
  // vale anche da città. Nello sheet del torneo i due campi restano separati.
  const submitVenueName = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    pushUser(v)
    setText('')
    patch({ venueId: 'new', newVenueName: v, city: v })
    void goStep('category')
  }
  const skipVenue = () => {
    pushUser('Salto il luogo')
    setText('')
    patch({ venueId: '', newVenueName: '', city: '' })
    void goStep('category')
  }
  const pickCategory = (c: Category) => {
    pushUser(c)
    patch({ category: c })
    void goStep('format')
  }
  const pickFormat = (f: Format) => {
    pushUser(f)
    patch({ format: f })
    void goStep('surface')
  }
  const pickSurface = (s: Surface) => {
    pushUser(s)
    patch({ surface: s })
    void goStep('status')
  }
  const pickStatus = (s: 'finished' | 'ongoing') => {
    if (s === 'ongoing') {
      pushUser('È ancora in corso')
      patch({ status: 'ongoing', placement: 'In corso' })
      void goStep('askResults')
    } else {
      pushUser('È finito')
      patch({ status: 'finished' })
      void goStep('placement')
    }
  }
  const pickPlacement = (p: Placement) => {
    pushUser(p.replace(/\s*🏆\s*/u, ''))
    patch({ placement: p })
    void goStep('bracket')
  }
  const pickBracket = (b: Bracket | '') => {
    pushUser(b || 'Nessun tabellone')
    patch({ bracket: b })
    void goStep('askResults')
  }
  const answerResults = (yes: boolean) => {
    if (!yes) {
      pushUser('No, va bene così')
      void goStep('recap')
      return
    }
    pushUser('Sì, aggiungiamole')
    const d = draftRef.current
    const hasPartner = d.partnerId === 'new' ? !!d.newPartnerName : d.partnerId !== ''
    // Le partite hanno bisogno di un compagno: se il torneo è "da solo",
    // si chiede adesso (proponendo i compagni esistenti, se ce ne sono).
    if (hasPartner) void goStep('matchOpponents')
    else if (partners.length) void goStep('resultsPartner')
    else void goStep('resultsPartnerName')
  }
  const pickResultsPartner = (p: Option) => {
    pushUser(p.name)
    patch({ partnerId: p.id, newPartnerName: '' })
    void goStep('matchOpponents')
  }
  const submitOpponents = (raw: string) => {
    const v = raw.trim()
    pushUser(v || 'Avversari')
    setText('')
    pendingMatch.current = { opponents: v || 'Avversari', phase: 'Girone', sets: [] }
    void goStep('matchPhase')
  }
  const pickPhase = (ph: Phase) => {
    pushUser(ph)
    if (pendingMatch.current) pendingMatch.current.phase = ph
    setScoreRows(righeVuote())
    void goStep('matchScore')
  }
  const submitScore = (rows: ScoreRow[]) => {
    const sets = rows
      .filter((r) => r.us !== '' && r.them !== '')
      .map((r) => ({ us: Number(r.us), them: Number(r.them) }))
      .filter((s) => Number.isFinite(s.us) && Number.isFinite(s.them))
    const m: GuidedMatch = {
      opponents: pendingMatch.current?.opponents || 'Avversari',
      phase: pendingMatch.current?.phase || 'Girone',
      sets,
    }
    pushUser(fmtSets(sets))
    patch({ matches: [...draftRef.current.matches, m] })
    pendingMatch.current = null
    void goStep('matchMore')
  }
  const answerMore = (yes: boolean) => {
    if (yes) {
      pushUser('Aggiungi un’altra')
      void goStep('matchOpponents')
    } else {
      pushUser('Ho finito con le partite')
      void goStep('recap')
    }
  }

  /**
   * Una risposta scritta che non corrisponde a nessuna scelta dello step:
   * l'eco resta in trascrizione e Pallo lo dice, senza cambiare step. Le
   * scelte restano lì sotto.
   */
  const nonCapito = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    pushUser(v)
    setText('')
    void (async () => {
      await say({ text: `Non ho capito «${v}». Scegli una delle risposte qui sotto.` })
      if (alive.current) setFocusTick((t) => t + 1)
    })()
  }

  const confirmCreate = async () => {
    pushUser('Crea torneo')
    setStep('saving')
    const d = draftRef.current
    await say({ text: 'Sto creando il torneo…' }, 0)
    const res = await onCreate(formDaBozza(d), d.matches)
    if (!alive.current) return
    if (res) {
      setCreatedId(res.id)
      await say({ text: `Fatto! Ho creato «${d.name}».` })
      const k = res.partiteNonSalvate
      const salvate = d.matches.length - k
      if (k > 0) {
        // Successo parziale: va detto (UX §6.10). Prima diceva "Ho registrato
        // anche N partite" anche quando non era vero.
        await say({
          text:
            k === 1
              ? 'Ho creato il torneo, ma 1 partita non è stata salvata. Aggiungila dal torneo.'
              : `Ho creato il torneo, ma ${k} partite non sono state salvate. Aggiungile dal torneo.`,
        })
      } else if (salvate > 0) {
        await say({ text: `Ho registrato anche ${plurale(salvate, 'partita', 'partite')}.` })
      }
      setStep('done')
    } else {
      // Un solo canale d'errore: il messaggio in chat, con i pulsanti di nuovo attivi.
      await say({ text: 'Ops, qualcosa è andato storto nel salvataggio. Puoi riprovare.' })
      setStep('recap')
    }
    if (alive.current) setFocusTick((t) => t + 1)
  }

  const restart = () => {
    interrompi()
    draftRef.current = initialDraft()
    pendingMatch.current = null
    risposte.current = 0
    setCreatedId(null)
    setText('')
    setDateVal(todayISO())
    setScoreRows(righeVuote())
    setMessages([])
    setStep('name')
    void (async () => {
      for (const t of RIPARTENZA) await say({ text: t })
      if (alive.current) setFocusTick((t) => t + 1)
    })()
  }

  /** Risposte date e torneo non ancora creato: uscire le perderebbe. */
  const createdIdRef = useRef<string | null>(null)
  createdIdRef.current = createdId
  const isDirty = () => risposte.current > 0 && !createdIdRef.current

  return {
    messages,
    typing,
    step,
    createdId,
    focusTick,
    text,
    setText,
    dateVal,
    setDateVal,
    scoreRows,
    setScoreRows,
    interrompi,
    isDirty,
    domandaCorrente: domanda(step, draftRef.current, ctx),
    handlers: {
      submitName,
      pickPartner,
      pickNoPartner,
      chooseNewPartner,
      submitPartnerName,
      pickDate,
      pickDateValue,
      pickVenue,
      chooseNewVenue,
      submitVenueName,
      skipVenue,
      pickCategory,
      pickFormat,
      pickSurface,
      pickStatus,
      pickPlacement,
      pickBracket,
      answerResults,
      pickResultsPartner,
      submitOpponents,
      pickPhase,
      submitScore,
      answerMore,
      confirmCreate,
      restart,
      nonCapito,
    },
  }
}

export type Assistente = ReturnType<typeof useAssistente>
export type Handlers = Assistente['handlers']
