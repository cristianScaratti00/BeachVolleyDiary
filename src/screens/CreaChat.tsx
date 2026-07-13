import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, ChangeEvent, FormEvent } from 'react'
import { CATEGORIES, FORMATS, SURFACES, PHASES } from '../lib/db.enums'
import { MONTHS_SHORT } from '../lib/theme'
import type {
  AnyForm, Option, GuidedMatch,
  Category, Format, Surface, Phase, Placement,
} from '../lib/models'

// ============================================================================
// Assistente guidato in stile chat AI per creare un torneo.
// Non c'è nessun modello linguistico: è una conversazione scriptata con una
// macchina a stati (`Step`). Gli step si adattano ai dati esistenti (propone i
// compagni già salvati) e chiedono se il torneo è finito o in corso e se
// registrare subito i risultati delle partite.
// ============================================================================

const INK = '#1B2A4A'
const ORANGE = '#FF6B35'

// Colori scelti dall'assistente per l'etichetta, così ogni torneo è un po' diverso.
const LABEL_COLORS = ['#FF6B35', '#00B4D8', '#FFD23F', '#FF477E', '#1B2A4A']

type Step =
  | 'boot'
  | 'name'
  | 'partner'
  | 'partnerName'
  | 'date'
  | 'city'
  | 'category'
  | 'format'
  | 'surface'
  | 'status'
  | 'placement'
  | 'askResults'
  | 'resultsPartner'
  | 'resultsPartnerName'
  | 'matchOpponents'
  | 'matchPhase'
  | 'matchScore'
  | 'matchMore'
  | 'recap'
  | 'saving'
  | 'done'

interface Draft {
  name: string
  partnerId: string // '' = nessuno, 'new', oppure un id compagno
  newPartnerName: string
  date: string
  city: string
  category: Category
  format: Format
  surface: Surface
  status: 'finished' | 'ongoing' | ''
  placement: Placement
  color: string
  matches: GuidedMatch[]
}

interface Msg {
  id: number
  role: 'ai' | 'user'
  text?: string
  card?: ReactNode
}

interface CreaChatProps {
  wide: boolean
  partners: Option[]
  onCreate: (form: AnyForm, matches: GuidedMatch[]) => Promise<string | null>
  onDone: (tournamentId: string) => void
  onExit: () => void
}

const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))
const todayISO = () => new Date().toISOString().slice(0, 10)
const shiftISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
const fmtDate = (iso: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}
const fmtSets = (sets: GuidedMatch['sets']) =>
  sets.length ? sets.map((s) => `${s.us}–${s.them}`).join(' · ') : 'senza punteggio'

const initialDraft = (): Draft => ({
  name: '',
  partnerId: '',
  newPartnerName: '',
  date: todayISO(),
  city: '',
  category: 'Amatoriale',
  format: '2vs2',
  surface: 'Sabbia outdoor',
  status: '',
  placement: 'In corso',
  color: LABEL_COLORS[0],
  matches: [],
})

export default function CreaChat({ wide, partners, onCreate, onDone, onExit }: CreaChatProps) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [typing, setTyping] = useState(true)
  const [step, setStep] = useState<Step>('boot')
  const [createdId, setCreatedId] = useState<string | null>(null)

  // Stati locali del "dock" di input (input attivo in basso).
  const [text, setText] = useState('')
  const [dateVal, setDateVal] = useState(todayISO())
  const [scoreRows, setScoreRows] = useState<{ us: string; them: string }[]>([
    { us: '', them: '' },
    { us: '', them: '' },
  ])

  // La bozza vive in un ref: l'UI è guidata dai messaggi/step, non dalla bozza
  // (il riepilogo è uno snapshot), quindi non serve uno state reattivo.
  const draftRef = useRef<Draft>(initialDraft())
  const pendingMatch = useRef<{ opponents: string; phase: Phase; sets: GuidedMatch['sets'] } | null>(null)
  const idRef = useRef(0)
  const alive = useRef(true)
  const started = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const patch = (p: Partial<Draft>) => {
    draftRef.current = { ...draftRef.current, ...p }
  }
  const nextId = () => ++idRef.current
  const pushUser = (t: string) => setMessages((m) => [...m, { id: nextId(), role: 'user', text: t }])

  // Bolla dell'assistente preceduta dal "sta scrivendo…". La durata scala con la
  // lunghezza del testo (più naturale e non troppo veloce); si può forzare.
  const say = async (content: string | { text?: string; card?: ReactNode }, delay?: number) => {
    if (!alive.current) return
    const payload = typeof content === 'string' ? { text: content } : content
    const textLen = (payload.text ?? '').length
    const d = delay ?? Math.min(1700, 780 + textLen * 17)
    setTyping(true)
    await wait(d)
    if (!alive.current) return
    setTyping(false)
    setMessages((m) => [...m, { id: nextId(), role: 'ai', ...payload }])
  }

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // Intro (una volta sola, resistente al doppio-mount di StrictMode).
  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      await say('Ciao! 🏐 Sono l’assistente di Beach Diary.')
      await say('Creiamo insieme un nuovo torneo — ti faccio due domande al volo. 😎')
      await say('Come si chiama il torneo?')
      setStep('name')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll: scorre SOLO il contenitore della chat (non la pagina) fino in
  // fondo ad ogni nuovo messaggio, cambio di "typing" o di step (il dock cambia
  // altezza), così la vista segue sempre l'ultimo messaggio.
  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, step])

  // ---------------------------------------------------------------- prompts
  // Manda il/i messaggio/i dell'assistente per lo step di destinazione e poi
  // abilita il dock corrispondente. Il dock resta nascosto durante il "typing".
  const goStep = async (target: Step) => {
    const d = draftRef.current
    switch (target) {
      case 'partner':
        if (partners.length)
          await say(`Perfetto, «${d.name}». Con chi hai giocato?`)
        else await say(`Perfetto, «${d.name}». Con chi hai giocato? Scrivi il nome del tuo compagno.`)
        break
      case 'partnerName':
      case 'resultsPartnerName':
        await say('Come si chiama il compagno?')
        break
      case 'resultsPartner':
        await say('Con quale compagno registriamo le partite?')
        break
      case 'date':
        await say('Quando si è svolto? 📅')
        break
      case 'city':
        await say('In che città? (puoi saltare)')
        break
      case 'category':
        await say('Che categoria era?')
        break
      case 'format':
        await say('Con che formato avete giocato?')
        break
      case 'surface':
        await say('E su che superficie?')
        break
      case 'status':
        await say('Il torneo è già finito o è ancora in corso?')
        break
      case 'placement':
        await say('Ottimo! Che piazzamento hai ottenuto? 🏆')
        break
      case 'askResults':
        if (d.status === 'ongoing')
          await say('Vuoi già registrare le partite giocate finora?')
        else await say('Vuoi aggiungere anche i risultati delle partite?')
        break
      case 'matchOpponents':
        await say(
          d.matches.length
            ? 'Contro chi era la prossima partita?'
            : 'Iniziamo con le partite. Contro chi era la prima? (coppia avversaria)',
        )
        break
      case 'matchPhase':
        await say('In che fase del torneo?')
        break
      case 'matchScore':
        await say('Come è finita? Inserisci il punteggio dei set.')
        break
      case 'matchMore':
        await say('Partita registrata ✅. Vuoi aggiungerne un’altra?')
        break
      case 'recap':
        await say({ card: <Recap d={draftRef.current} partners={partners} /> })
        await say('Ecco il riepilogo. Confermo la creazione? 👇')
        break
      default:
        break
    }
    if (alive.current) setStep(target)
  }

  // ---------------------------------------------------------------- handlers
  const submitName = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    pushUser(v)
    setText('')
    patch({ name: v, color: LABEL_COLORS[v.length % LABEL_COLORS.length] })
    goStep('partner')
  }

  const pickPartner = (p: Option) => {
    pushUser(p.name)
    patch({ partnerId: p.id, newPartnerName: '' })
    goStep('date')
  }
  const pickNoPartner = () => {
    pushUser('Ho giocato da solo')
    patch({ partnerId: '', newPartnerName: '' })
    goStep('date')
  }
  const chooseNewPartner = () => {
    // Passa all'input testuale per il nome (nessun messaggio utente).
    setText('')
    goStep('partnerName')
  }
  const submitPartnerName = (raw: string, fromResults: boolean) => {
    const v = raw.trim()
    if (!v) return
    pushUser(v)
    setText('')
    patch({ partnerId: 'new', newPartnerName: v })
    goStep(fromResults ? 'matchOpponents' : 'date')
  }

  const pickDate = (iso: string, label: string) => {
    pushUser(label)
    patch({ date: iso })
    goStep('city')
  }
  const submitCity = (raw: string) => {
    const v = raw.trim()
    pushUser(v || 'Salto la città')
    setText('')
    patch({ city: v })
    goStep('category')
  }
  const pickCategory = (c: Category) => {
    pushUser(c)
    patch({ category: c })
    goStep('format')
  }
  const pickFormat = (f: Format) => {
    pushUser(f)
    patch({ format: f })
    goStep('surface')
  }
  const pickSurface = (s: Surface) => {
    pushUser(s)
    patch({ surface: s })
    goStep('status')
  }
  const pickStatus = (s: 'finished' | 'ongoing') => {
    if (s === 'ongoing') {
      pushUser('⏳ È ancora in corso')
      patch({ status: 'ongoing', placement: 'In corso' })
      goStep('askResults')
    } else {
      pushUser('🏁 È finito')
      patch({ status: 'finished' })
      goStep('placement')
    }
  }
  const pickPlacement = (p: Placement) => {
    pushUser(p)
    patch({ placement: p })
    goStep('askResults')
  }

  const answerResults = (yes: boolean) => {
    if (!yes) {
      pushUser('No, va bene così')
      goStep('recap')
      return
    }
    pushUser('Sì, aggiungiamole')
    const d = draftRef.current
    const hasPartner = d.partnerId === 'new' ? !!d.newPartnerName : d.partnerId !== ''
    // Le partite hanno bisogno di un compagno: se il torneo è "da solo",
    // chiediamolo ora (proponendo i compagni esistenti se ce ne sono).
    if (hasPartner) goStep('matchOpponents')
    else if (partners.length) goStep('resultsPartner')
    else goStep('resultsPartnerName')
  }
  const pickResultsPartner = (p: Option) => {
    pushUser(p.name)
    patch({ partnerId: p.id, newPartnerName: '' })
    goStep('matchOpponents')
  }

  const submitOpponents = (raw: string) => {
    const v = raw.trim()
    pushUser(v || 'Avversari')
    setText('')
    // Bozza in costruzione: la salvo temporaneamente sull'ultimo slot.
    pendingMatch.current = { opponents: v || 'Avversari', phase: 'Girone', sets: [] }
    goStep('matchPhase')
  }
  const pickPhase = (ph: Phase) => {
    pushUser(ph)
    if (pendingMatch.current) pendingMatch.current.phase = ph
    setScoreRows([
      { us: '', them: '' },
      { us: '', them: '' },
    ])
    goStep('matchScore')
  }
  const submitScore = (rows: { us: string; them: string }[]) => {
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
    goStep('matchMore')
  }
  const answerMore = (yes: boolean) => {
    if (yes) {
      pushUser('➕ Aggiungi un’altra')
      goStep('matchOpponents')
    } else {
      pushUser('✅ Ho finito con le partite')
      goStep('recap')
    }
  }

  const confirmCreate = async () => {
    pushUser('✅ Crea torneo')
    setStep('saving')
    setTyping(false)
    const d = draftRef.current
    await say('Sto creando il torneo… ⏳', 500)
    const form: AnyForm = {
      name: d.name,
      partnerId: d.partnerId,
      newPartnerName: d.newPartnerName,
      date: d.date,
      city: d.city,
      category: d.category,
      format: d.format,
      surface: d.surface,
      placement: d.placement,
      color: d.color,
      emoji: '🏖️',
    }
    setTyping(true)
    const id = await onCreate(form, d.matches)
    if (!alive.current) return
    if (id) {
      setCreatedId(id)
      await say(`🎉 Fatto! Ho creato «${d.name}».`)
      if (d.matches.length)
        await say(`Ho registrato anche ${d.matches.length} ${d.matches.length === 1 ? 'partita' : 'partite'}. 💪`)
      setStep('done')
    } else {
      await say('Ops, qualcosa è andato storto nel salvataggio. Puoi riprovare. 🙏')
      setStep('recap')
    }
  }

  const restart = () => {
    draftRef.current = initialDraft()
    pendingMatch.current = null
    idRef.current = 0
    started.current = false
    setCreatedId(null)
    setText('')
    setDateVal(todayISO())
    setMessages([])
    setTyping(true)
    setStep('boot')
    ;(async () => {
      started.current = true
      await say('Ripartiamo da capo! ✨')
      await say('Come si chiama il torneo?')
      setStep('name')
    })()
  }

  // ---------------------------------------------------------------- render
  // Colonna a tutta altezza: header e dock fissi, la trascrizione è l'UNICO
  // elemento scrollabile (la pagina non scorre).
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 720, margin: '0 auto', padding: wide ? '16px 20px 0' : '10px 12px 0' }}>
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div onClick={onExit} className="chip" style={{ cursor: 'pointer', width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(27,42,74,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }} title="Indietro">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${ORANGE}, #FF9558)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flex: 'none', boxShadow: '0 6px 16px -6px rgba(255,107,53,.7)' }}>✨</div>
        <div style={{ minWidth: 0 }}>
          <div className="num" style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-.2px' }}>Assistente torneo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: "700 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2FBF71' }} />
            Creazione guidata
          </div>
        </div>
      </div>

      {/* transcript — unico elemento con scroll interno */}
      <div ref={transcriptRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 2px' }}>
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.card ?? m.text}
          </Bubble>
        ))}
        {typing && <Typing />}
        <div ref={endRef} />
      </div>

      {/* dock (input attivo) — sempre fisso in basso */}
      <div style={{ flex: 'none', borderTop: '1px solid rgba(27,42,74,.08)', paddingTop: 12, paddingBottom: wide ? 16 : 'max(14px, env(safe-area-inset-bottom))', background: '#FFF8F0' }}>
        {typing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(27,42,74,.42)', font: "700 12.5px 'Nunito Sans'", padding: '6px 2px' }}>
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(27,42,74,.4)', animation: `blink 1.1s ${i * 0.16}s infinite ease-in-out` }} />
              ))}
            </span>
            l’assistente sta scrivendo…
          </div>
        ) : (
          <Dock
            step={step}
            partners={partners}
            text={text}
            setText={setText}
            dateVal={dateVal}
            setDateVal={setDateVal}
            scoreRows={scoreRows}
            setScoreRows={setScoreRows}
            createdId={createdId}
            handlers={{
              submitName,
              pickPartner,
              pickNoPartner,
              chooseNewPartner,
              submitPartnerName,
              pickDate,
              submitCity,
              pickCategory,
              pickFormat,
              pickSurface,
              pickStatus,
              pickPlacement,
              answerResults,
              pickResultsPartner,
              submitOpponents,
              pickPhase,
              submitScore,
              answerMore,
              confirmCreate,
              restart,
              onDone,
            }}
          />
        )}
      </div>
    </div>
  )
}

// =============================================================== sub-components

function Bubble({ role, children }: { role: 'ai' | 'user'; children: ReactNode }) {
  const isAi = role === 'ai'
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end', flexDirection: isAi ? 'row' : 'row-reverse' }}>
      {isAi && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${ORANGE}, #FF9558)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>✨</div>
      )}
      <div
        style={{
          maxWidth: '84%',
          padding: '11px 14px',
          borderRadius: isAi ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isAi ? '#fff' : INK,
          color: isAi ? INK : '#fff',
          border: isAi ? '1px solid rgba(27,42,74,.1)' : 'none',
          font: "600 14.5px 'Nunito Sans'",
          lineHeight: 1.45,
          animation: 'bubble .28s cubic-bezier(.2,.8,.2,1) both',
          boxShadow: isAi ? '0 4px 14px -10px rgba(27,42,74,.4)' : '0 6px 16px -8px rgba(27,42,74,.5)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${ORANGE}, #FF9558)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>✨</div>
      <div style={{ padding: '13px 16px', borderRadius: '4px 16px 16px 16px', background: '#fff', border: '1px solid rgba(27,42,74,.1)', display: 'flex', gap: 5, animation: 'bubble .28s ease both' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(27,42,74,.5)', animation: `blink 1.1s ${i * 0.16}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  )
}

function Recap({ d, partners }: { d: Draft; partners: Option[] }) {
  const partnerName =
    d.partnerId === '' ? 'Da solo' : d.partnerId === 'new' ? d.newPartnerName || 'Nuovo compagno' : partners.find((p) => p.id === d.partnerId)?.name || '—'
  const rows: [string, string][] = [
    ['Nome', d.name],
    ['Compagno', partnerName],
    ['Data', fmtDate(d.date)],
    ['Città', d.city || '—'],
    ['Categoria', d.category],
    ['Formato', d.format],
    ['Superficie', d.surface],
    ['Stato', d.status === 'ongoing' ? 'In corso ⏳' : `Finito · ${d.placement}`],
  ]
  return (
    <div style={{ minWidth: 240 }}>
      <div style={{ font: "800 12px 'Nunito Sans'", letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(27,42,74,.45)', marginBottom: 10 }}>Riepilogo torneo</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
            <span style={{ font: "700 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>{k}</span>
            <span style={{ font: "700 13.5px 'Nunito Sans'", textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      {d.matches.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(27,42,74,.1)' }}>
          <div style={{ font: "800 12px 'Nunito Sans'", letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(27,42,74,.45)', marginBottom: 8 }}>
            {d.matches.length} {d.matches.length === 1 ? 'partita' : 'partite'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.matches.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <span style={{ font: "700 12.5px 'Nunito Sans'", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'rgba(27,42,74,.45)' }}>{m.phase} · </span>{m.opponents}
                </span>
                <span className="num" style={{ fontSize: 13, color: ORANGE, flex: 'none' }}>{fmtSets(m.sets)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------- the dock

interface Handlers {
  submitName: (v: string) => void
  pickPartner: (p: Option) => void
  pickNoPartner: () => void
  chooseNewPartner: () => void
  submitPartnerName: (v: string, fromResults: boolean) => void
  pickDate: (iso: string, label: string) => void
  submitCity: (v: string) => void
  pickCategory: (c: Category) => void
  pickFormat: (f: Format) => void
  pickSurface: (s: Surface) => void
  pickStatus: (s: 'finished' | 'ongoing') => void
  pickPlacement: (p: Placement) => void
  answerResults: (yes: boolean) => void
  pickResultsPartner: (p: Option) => void
  submitOpponents: (v: string) => void
  pickPhase: (ph: Phase) => void
  submitScore: (rows: { us: string; them: string }[]) => void
  answerMore: (yes: boolean) => void
  confirmCreate: () => void
  restart: () => void
  onDone: (id: string) => void
}

interface DockProps {
  step: Step
  partners: Option[]
  text: string
  setText: (v: string) => void
  dateVal: string
  setDateVal: (v: string) => void
  scoreRows: { us: string; them: string }[]
  setScoreRows: (r: { us: string; them: string }[]) => void
  createdId: string | null
  handlers: Handlers
}

// Piazzamenti proposti quando il torneo è finito (senza "In corso").
const FINISHED_PLACEMENTS: Placement[] = ['1° 🏆', '2°', '3°', 'Semifinale', 'Quarti', 'Ottavi', 'Gironi']

function Dock(props: DockProps) {
  const { step, partners, text, setText, dateVal, setDateVal, scoreRows, setScoreRows, createdId, handlers: h } = props

  switch (step) {
    case 'name':
      return <TextDock value={text} setValue={setText} placeholder="es. Summer Cup Rimini" onSubmit={() => h.submitName(text)} />

    case 'partner':
      // Senza compagni salvati non ha senso una lista: si chiede il nome (o "Da solo").
      if (!partners.length)
        return <TextDock value={text} setValue={setText} placeholder="es. Giulia" skipLabel="🙋 Ho giocato da solo" onSkip={h.pickNoPartner} onSubmit={() => h.submitPartnerName(text, false)} />
      return (
        <ChipsDock>
          {partners.map((p) => (
            <Chip key={p.id} onClick={() => h.pickPartner(p)}>{p.name}</Chip>
          ))}
          <Chip tone="primary" onClick={h.chooseNewPartner}>➕ Nuovo compagno</Chip>
          <Chip onClick={h.pickNoPartner}>🙋 Da solo</Chip>
        </ChipsDock>
      )

    case 'partnerName':
      return <TextDock value={text} setValue={setText} placeholder="es. Giulia" onSubmit={() => h.submitPartnerName(text, false)} />
    case 'resultsPartnerName':
      return <TextDock value={text} setValue={setText} placeholder="es. Giulia" onSubmit={() => h.submitPartnerName(text, true)} />

    case 'resultsPartner':
      return (
        <ChipsDock>
          {partners.map((p) => (
            <Chip key={p.id} onClick={() => h.pickResultsPartner(p)}>{p.name}</Chip>
          ))}
        </ChipsDock>
      )

    case 'date':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ChipsDock>
            <Chip tone="primary" onClick={() => h.pickDate(todayISO(), 'Oggi')}>Oggi</Chip>
            <Chip onClick={() => h.pickDate(shiftISO(-1), 'Ieri')}>Ieri</Chip>
            <Chip onClick={() => h.pickDate(shiftISO(-7), 'La scorsa settimana')}>Settimana scorsa</Chip>
          </ChipsDock>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={dateVal} onChange={(e: ChangeEvent<HTMLInputElement>) => setDateVal(e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
            <SendBtn label="Usa" onClick={() => h.pickDate(dateVal, fmtDate(dateVal))} />
          </div>
        </div>
      )

    case 'city':
      return <TextDock value={text} setValue={setText} placeholder="es. Rimini" skipLabel="Salta" onSkip={() => h.submitCity('')} onSubmit={() => h.submitCity(text)} />

    case 'category':
      return (
        <ChipsDock>
          {CATEGORIES.map((c) => <Chip key={c} onClick={() => h.pickCategory(c)}>{c}</Chip>)}
        </ChipsDock>
      )

    case 'format':
      return (
        <ChipsDock>
          {FORMATS.map((f) => <Chip key={f} onClick={() => h.pickFormat(f)}>{f}</Chip>)}
        </ChipsDock>
      )

    case 'surface':
      return (
        <ChipsDock>
          {SURFACES.map((s) => <Chip key={s} onClick={() => h.pickSurface(s)}>{s}</Chip>)}
        </ChipsDock>
      )

    case 'status':
      return (
        <ChipsDock>
          <Chip tone="primary" onClick={() => h.pickStatus('finished')}>🏁 È finito</Chip>
          <Chip onClick={() => h.pickStatus('ongoing')}>⏳ È ancora in corso</Chip>
        </ChipsDock>
      )

    case 'placement':
      return (
        <ChipsDock>
          {FINISHED_PLACEMENTS.map((p) => <Chip key={p} onClick={() => h.pickPlacement(p)}>{p}</Chip>)}
        </ChipsDock>
      )

    case 'askResults':
      return (
        <ChipsDock>
          <Chip tone="primary" onClick={() => h.answerResults(true)}>✅ Sì, aggiungiamole</Chip>
          <Chip onClick={() => h.answerResults(false)}>No, va bene così</Chip>
        </ChipsDock>
      )

    case 'matchOpponents':
      return <TextDock value={text} setValue={setText} placeholder="es. Bianchi / Verdi" skipLabel="Senza nome" onSkip={() => h.submitOpponents('')} onSubmit={() => h.submitOpponents(text)} />

    case 'matchPhase':
      return (
        <ChipsDock>
          {PHASES.map((ph) => <Chip key={ph} onClick={() => h.pickPhase(ph)}>{ph}</Chip>)}
        </ChipsDock>
      )

    case 'matchScore':
      return <ScoreDock rows={scoreRows} setRows={setScoreRows} onSave={() => h.submitScore(scoreRows)} onSkip={() => h.submitScore([])} />

    case 'matchMore':
      return (
        <ChipsDock>
          <Chip tone="primary" onClick={() => h.answerMore(true)}>➕ Aggiungi partita</Chip>
          <Chip onClick={() => h.answerMore(false)}>✅ Ho finito</Chip>
        </ChipsDock>
      )

    case 'recap':
      return (
        <ChipsDock>
          <Chip tone="dark" onClick={h.confirmCreate}>✅ Crea torneo</Chip>
          <Chip onClick={h.restart}>✏️ Ricomincia</Chip>
        </ChipsDock>
      )

    case 'done':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div className="chip" onClick={() => createdId && h.onDone(createdId)} style={{ flex: 1, minWidth: 180, textAlign: 'center', background: ORANGE, color: '#fff', padding: '14px 18px', borderRadius: 12, font: "700 14px 'Nunito Sans'", cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(255,107,53,.6)' }}>Apri il torneo →</div>
          <div className="chip" onClick={h.restart} style={{ flex: 1, minWidth: 160, textAlign: 'center', border: '1px solid rgba(27,42,74,.18)', color: INK, padding: '14px 18px', borderRadius: 12, font: "700 14px 'Nunito Sans'", cursor: 'pointer' }}>Crea un altro</div>
        </div>
      )

    // 'boot' | 'saving' | fallback: nessun input mentre l'assistente lavora.
    default:
      return null
  }
}

// ---------------------------------------------------------------- dock atoms

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(27,42,74,.16)',
  borderRadius: 13,
  padding: '13px 15px',
  font: "600 15px 'Nunito Sans'",
  background: '#fff',
}

function TextDock({ value, setValue, placeholder, onSubmit, onSkip, skipLabel }: {
  value: string
  setValue: (v: string) => void
  placeholder: string
  onSubmit: () => void
  onSkip?: () => void
  skipLabel?: string
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {onSkip && (
        <ChipsDock>
          <Chip onClick={onSkip}>{skipLabel || 'Salta'}</Chip>
        </ChipsDock>
      )}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input autoFocus value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)} placeholder={placeholder} style={{ ...fieldStyle, flex: 1 }} />
        <SendBtn onClick={onSubmit} disabled={!value.trim() && !onSkip} />
      </form>
    </div>
  )
}

function SendBtn({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 'none',
        border: 'none',
        background: disabled ? 'rgba(27,42,74,.18)' : ORANGE,
        color: '#fff',
        borderRadius: 13,
        padding: label ? '0 18px' : 0,
        width: label ? undefined : 48,
        height: 48,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        font: "700 14px 'Nunito Sans'",
        transition: 'background .15s ease',
      }}
    >
      {label || <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
    </button>
  )
}

function ChipsDock({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>{children}</div>
}

function Chip({ children, onClick, tone = 'light' }: { children: ReactNode; onClick: () => void; tone?: 'light' | 'primary' | 'dark' }) {
  const styles: Record<string, CSSProperties> = {
    light: { background: '#fff', color: INK, border: '1px solid rgba(27,42,74,.16)' },
    primary: { background: 'rgba(255,107,53,.12)', color: '#C4501E', border: '1px solid rgba(255,107,53,.35)' },
    dark: { background: INK, color: '#fff', border: '1px solid ' + INK },
  }
  return (
    <div className="chip" onClick={onClick} style={{ ...styles[tone], padding: '11px 16px', borderRadius: 12, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>
      {children}
    </div>
  )
}

function ScoreDock({ rows, setRows, onSave, onSkip }: {
  rows: { us: string; them: string }[]
  setRows: (r: { us: string; them: string }[]) => void
  onSave: () => void
  onSkip: () => void
}) {
  const update = (i: number, key: 'us' | 'them', v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const removeRow = (i: number) => setRows(rows.filter((_, j) => j !== i))
  const addRow = () => rows.length < 3 && setRows([...rows, { us: '', them: '' }])
  const setInput: CSSProperties = { flex: 1, minWidth: 0, border: '1px solid rgba(27,42,74,.16)', borderRadius: 11, padding: 12, font: "600 17px 'Space Grotesk'", textAlign: 'center', background: '#fff' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((st, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="lbl" style={{ width: 42, flex: 'none' }}>Set {i + 1}</div>
          <input type="number" inputMode="numeric" value={st.us} onChange={(e: ChangeEvent<HTMLInputElement>) => update(i, 'us', e.target.value)} placeholder="21" style={setInput} />
          <span className="num" style={{ color: 'rgba(27,42,74,.3)' }}>–</span>
          <input type="number" inputMode="numeric" value={st.them} onChange={(e: ChangeEvent<HTMLInputElement>) => update(i, 'them', e.target.value)} placeholder="18" style={setInput} />
          {rows.length > 1 && <div onClick={() => removeRow(i)} style={{ font: "700 18px 'Nunito Sans'", color: 'rgba(27,42,74,.3)', cursor: 'pointer', padding: '0 2px', flex: 'none' }}>×</div>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {rows.length < 3 && <Chip onClick={addRow}>＋ Aggiungi set</Chip>}
        <div style={{ flex: 1 }} />
        <Chip onClick={onSkip}>Senza punteggio</Chip>
        <div className="chip" onClick={onSave} style={{ background: ORANGE, color: '#fff', padding: '11px 18px', borderRadius: 12, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>Salva partita</div>
      </div>
    </div>
  )
}
