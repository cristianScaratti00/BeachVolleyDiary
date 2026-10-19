// ============================================================================
// Il copione dell'assistente guidato: gli step, la bozza, le domande e la
// forma del modulo che si consegna a `onCreate`. Puro, senza React.
//
// Non c'è nessun modello linguistico: è una conversazione scriptata con una
// macchina a stati (`Step`) che si adatta ai dati esistenti (propone i compagni
// e i luoghi già salvati) e chiede se il torneo è finito o in corso e se
// registrare subito i risultati delle partite.
// ============================================================================
import { MONTHS_SHORT, SWATCH_COLORS } from '../../lib/theme'
import type { AnyForm, Bracket, Category, Format, GuidedMatch, Option, Placement, Surface } from '../../lib/models'

export type Step =
  | 'boot'
  | 'name'
  | 'partner'
  | 'partnerName'
  | 'date'
  | 'venue'
  | 'venueName'
  | 'category'
  | 'format'
  | 'surface'
  | 'status'
  | 'placement'
  | 'bracket'
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

export interface Draft {
  name: string
  partnerId: string // '' = nessuno, 'new', oppure un id compagno
  newPartnerName: string
  date: string
  venueId: string // '' = saltato, 'new', oppure un id luogo
  newVenueName: string // nome del luogo digitato quando venueId === 'new'
  city: string // snapshot testuale, tenuto allineato al luogo scelto
  category: Category
  format: Format
  surface: Surface
  status: 'finished' | 'ongoing' | ''
  placement: Placement
  bracket: Bracket | '' // '' = nessun tabellone
  color: string
  matches: GuidedMatch[]
}

/**
 * La pausa "sta scrivendo" (MOTION.md §2.3, M10): ritmo, non un cancello.
 * Prima era `min(1700, 780 + 17·n)`: con 9–11 domande arrivava a ~15s di
 * attesa per una procedura scriptata. Qualunque input la interrompe; con
 * reduced-motion è 0.
 */
export const battitura = (n: number) => Math.min(700, 250 + 6 * n)

/** I colori dell'etichetta, a rotazione sul nome: ogni torneo è un po' diverso. */
const LABEL_COLORS = SWATCH_COLORS

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const shiftISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
export const fmtDate = (iso: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}
export const fmtSets = (sets: GuidedMatch['sets']) =>
  sets.length ? sets.map((s) => `${s.us}–${s.them}`).join(' · ') : 'senza punteggio'

export const initialDraft = (): Draft => ({
  name: '',
  partnerId: '',
  newPartnerName: '',
  date: todayISO(),
  venueId: '',
  newVenueName: '',
  city: '',
  category: 'Amatoriale',
  format: '2vs2',
  surface: 'Sabbia outdoor',
  status: '',
  placement: 'In corso',
  bracket: '',
  color: LABEL_COLORS[0],
  matches: [],
})

export const coloreDelNome = (name: string) => LABEL_COLORS[name.length % LABEL_COLORS.length]

/** Piazzamenti proposti quando il torneo è finito (senza «In corso»). */
export const FINISHED_PLACEMENTS: Placement[] = ['1° 🏆', '2°', '3°', 'Semifinale', 'Quarti', 'Ottavi', 'Gironi']

/** L'apertura: c'è già quando la schermata si apre, senza pausa (MOTION.md §5 F11). Parla Pallo. */
export const INTRO = ['Ciao! Sono Pallo. Ti faccio qualche domanda e il torneo lo compilo io.', 'Come si chiama il torneo?']

export const RIPARTENZA = ['Ripartiamo da capo.', 'Come si chiama il torneo?']

/**
 * I passi che si contano nella testata («Nuovo torneo · passo 2 di 8»): le
 * domande che chiedono la stessa cosa stanno nello stesso passo (il nome di
 * un compagno nuovo è ancora «con chi»; categoria, formato e superficie sono
 * «com'era»; le partite, quante che siano, sono un passo solo).
 */
export const PASSI = 8

export function passoDi(step: Step): number {
  switch (step) {
    case 'boot':
    case 'name':
      return 1
    case 'partner':
    case 'partnerName':
      return 2
    case 'date':
      return 3
    case 'venue':
    case 'venueName':
      return 4
    case 'category':
    case 'format':
    case 'surface':
      return 5
    case 'status':
    case 'placement':
    case 'bracket':
      return 6
    case 'askResults':
    case 'resultsPartner':
    case 'resultsPartnerName':
    case 'matchOpponents':
    case 'matchPhase':
    case 'matchScore':
    case 'matchMore':
      return 7
    default:
      return 8
  }
}

/** Minuscole, senza accenti né segni: «Sì, aggiungiamole» → «si aggiungiamole», «2°» → «2». */
const pulisci = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Una risposta SCRITTA su uno step a scelte: l'indice della scelta che
 * corrisponde (uguale, oppure l'unica che comincia così), o -1. «sabbia»
 * vale «Sabbia outdoor», «si» vale «Sì, aggiungiamole».
 */
export function trovaRisposta(testo: string, scelte: string[]): number {
  const t = pulisci(testo)
  if (!t) return -1
  const pulite = scelte.map(pulisci)
  const uguale = pulite.indexOf(t)
  if (uguale >= 0) return uguale
  const inizio = pulite.flatMap((s, i) => (s.startsWith(t) ? [i] : []))
  return inizio.length === 1 ? inizio[0] : -1
}

interface Contesto {
  partners: Option[]
  venues: Option[]
}

/**
 * La domanda di uno step. È anche il nome accessibile del campo del dock,
 * quando il dock ha un campo di testo (UX §5 F11.3).
 */
export function domanda(step: Step, d: Draft, { partners, venues }: Contesto): string | null {
  switch (step) {
    case 'name':
      return 'Come si chiama il torneo?'
    case 'partner':
      return partners.length
        ? `Perfetto, «${d.name}». Con chi hai giocato?`
        : `Perfetto, «${d.name}». Con chi hai giocato? Scrivi il nome del tuo compagno.`
    case 'partnerName':
    case 'resultsPartnerName':
      return 'Come si chiama il compagno?'
    case 'resultsPartner':
      return 'Con quale compagno registriamo le partite?'
    case 'date':
      return 'Quando si è svolto?'
    case 'venue':
      return venues.length ? 'Dove avete giocato? (puoi saltare)' : 'Dove avete giocato? Scrivi il nome del posto, o salta.'
    case 'venueName':
      return 'Come si chiama il posto?'
    case 'category':
      return 'Che categoria era?'
    case 'format':
      return 'Con che formato avete giocato?'
    case 'surface':
      return 'E su che superficie?'
    case 'status':
      return 'Il torneo è già finito o è ancora in corso?'
    case 'placement':
      return 'Ottimo. Che piazzamento hai ottenuto?'
    case 'bracket':
      return 'In che tabellone? (se il torneo li aveva)'
    case 'askResults':
      return d.status === 'ongoing' ? 'Vuoi già registrare le partite giocate finora?' : 'Vuoi aggiungere anche i risultati delle partite?'
    case 'matchOpponents':
      return d.matches.length ? 'Contro chi era la prossima partita?' : 'Iniziamo con le partite. Contro chi era la prima? (coppia avversaria)'
    case 'matchPhase':
      return 'In che fase del torneo?'
    case 'matchScore':
      return 'Come è finita? Inserisci il punteggio dei set.'
    case 'matchMore':
      return 'Partita registrata. Vuoi aggiungerne un’altra?'
    case 'recap':
      return 'Ecco il riepilogo. Confermo la creazione?'
    default:
      return null
  }
}

/**
 * Il modulo che si consegna a `onCreate`: identico a quello di prima del
 * refactor, campo per campo.
 */
export function formDaBozza(d: Draft): AnyForm {
  return {
    name: d.name,
    partnerId: d.partnerId,
    newPartnerName: d.newPartnerName,
    date: d.date,
    venueId: d.venueId,
    newVenueName: d.newVenueName,
    newVenueCity: d.newVenueName, // una riga sola: il nome vale anche da città
    city: d.city,
    category: d.category,
    format: d.format,
    surface: d.surface,
    placement: d.placement,
    bracket: d.bracket,
    color: d.color,
    emoji: '🏖️',
  }
}

/** Le righe del riepilogo. */
export function righeRiepilogo(d: Draft, { partners, venues }: Contesto): [string, string][] {
  const partnerName =
    d.partnerId === ''
      ? 'Da solo'
      : d.partnerId === 'new'
        ? d.newPartnerName || 'Nuovo compagno'
        : partners.find((p) => p.id === d.partnerId)?.name || '—'
  const venueName =
    d.venueId === '' ? '—' : d.venueId === 'new' ? d.newVenueName || 'Nuovo luogo' : venues.find((v) => v.id === d.venueId)?.name || '—'
  return [
    ['Nome', d.name],
    ['Compagno', partnerName],
    ['Data', fmtDate(d.date)],
    ['Luogo', venueName],
    ['Categoria', d.category],
    ['Formato', d.format],
    ['Superficie', d.surface],
    ['Stato', d.status === 'ongoing' ? 'In corso' : `Finito · ${d.placement.replace(/\s*🏆\s*/u, '')}${d.bracket ? ' · ' + d.bracket : ''}`],
  ]
}
