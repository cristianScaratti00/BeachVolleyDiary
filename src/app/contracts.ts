// ============================================================================
// I contratti fra la shell (App, ModalHost, useActions) e le schermate e gli
// overlay. Le schermate sono PRESENTAZIONALI: ricevono dati già derivati e
// callback; non parlano con la rete e non conoscono i permessi. Navigano con
// `<Link>` (link veri) e chiedono gli overlay con le callback.
//
// Le chiamate restituiscono l'esito (`Promise<boolean>`): chi salva sa se
// chiudere; gli errori li dice useActions con un Toast (UX §7.8).
// ============================================================================
import type { ReactNode } from 'react'
import type {
  CompagnoCard,
  CompagnoDetailData,
  DashboardStats,
  DiaryEntry,
  StoryData,
  TorneiListData,
  TorneoDetailData,
  WrappedData,
} from '../lib/derive'
import type { MappaData } from '../lib/derive.mappa'
import type { AnyForm, AppUser, CheckIn, CheckInInput, GuidedMatch, Match, Option, PresentUser, Tournament, Venue } from '../lib/models'
import type { AuthResult, Session } from '../lib/auth'
import type { Scelta } from '../lib/consenso'
import type { EsitoInvio, NuovaSegnalazione, Segnalazione, StatoSegnalazione } from '../lib/segnalazioni'
import type { NavBarBack } from '../components/ui/NavBar'
import type { TorneiVista } from './routes'
import type { HomeVista } from './selectors'
import type { Filtri } from './useScreenData'

// ------------------------------------------------------------------ overlay
/** Quello che ModalHost passa a ogni sheet, visore o dialogo. */
export interface OverlayBase {
  /** Chiude con la guardia: modulo sporco → «Scartare le modifiche?»; occupato → niente. */
  onClose: () => void
  /** È l'overlay in cima: solo lui risponde a Esc. */
  top: boolean
  /** Aperto da un dito: il focus va al titolo, non al primo campo (MOTION.md M3). */
  byTouch: boolean
  /** Il focus torna qui all'inizio dell'uscita. */
  opener: HTMLElement | null
  /** Il modulo ha almeno un campo diverso dal valore iniziale. */
  setDirty: (dirty: boolean) => void
  /** Salvataggio in corso: lo sheet non si chiude né col dito né col velo. */
  setBusy: (busy: boolean) => void
}

export type ViaCreazione = 'rapido' | 'completo'

/** Sheet unico «Nuovo torneo» / «Torneo rapido» / «Modifica torneo» (UX §5 F2, design 15). */
export interface TorneoSheetProps extends OverlayBase {
  mode: 'nuovo' | 'modifica'
  /**
   * «Torneo rapido» dal ＋: in vista solo Nome, Data e Piazzamento, il resto
   * in «Altri dettagli». Senza, il modulo è intero (design 15).
   */
  rapido?: boolean
  /** In modifica: il torneo. */
  torneo?: Tournament
  partners: Option[]
  venues: Venue[]
  /** Q21: il compagno del torneo proprio più recente (id) o ''. */
  compagnoDefault: string
  /** "Oggi" per il default della data: la stessa funzione del resto (Q20). */
  today: string
  canAddPartner: boolean
  /**
   * Crea o salva. `via` = 'rapido' se è il torneo rapido e «Altri dettagli»
   * non è mai stato aperto, altrimenti 'completo' (analytics, UX §13).
   * true = fatto: la shell chiude e naviga.
   */
  onSave: (form: AnyForm, via: ViaCreazione) => Promise<boolean>
  /** Solo in modifica: apre il ConfirmDialog «Eliminare «X»?». */
  onDelete?: () => void
  /** «Usa l'assistente guidato»: con il modulo sporco la shell chiede prima. */
  onUseAssistant: (dirty: boolean) => void
  onMergeVenues: (fromId: string, toId: string) => Promise<boolean>
}

/** Un torneo nella scelta di «Nuova partita»: con il compagno che la partita eredita. */
export interface TorneoOption extends Option {
  /** Il nome del compagno del torneo, o '' se non c'è. */
  partner: string
}

/** «Nuova partita» / «Modifica partita» (UX §5 F3, design 16). */
export interface PartitaSheetProps extends OverlayBase {
  mode: 'nuova' | 'modifica'
  match?: Match
  /** Il torneo di destinazione preselezionato (i 5 casi di F3). */
  tournamentId: string | null
  /** Solo i propri tornei: non si aggiungono partite a un condiviso. */
  tournaments: TorneoOption[]
  onSave: (form: AnyForm) => Promise<boolean>
  /** Solo in modifica: apre il ConfirmDialog «Eliminare la partita contro…?». */
  onDelete?: () => void
}

/** «Aggiungi foto» (UX §5 F5). */
export interface FotoSheetProps extends OverlayBase {
  tournamentId: string
  tournamentName: string
  onSave: (form: AnyForm, file: File | null) => Promise<boolean>
}

/** «Nuovo compagno» (UX §5 F7). */
export interface CompagnoSheetProps extends OverlayBase {
  onSave: (name: string) => Promise<boolean>
}

/** «Collega «X» a un utente» (UX §5 F7, §6.6). */
export interface CollegaSheetProps extends OverlayBase {
  partnerName: string
  onSearch: (query: string) => Promise<AppUser[]>
  onLink: (userId: string) => Promise<{ ok: boolean; error?: string }>
}

/** «Cambia password» (UX §5 F9). */
export interface PasswordSheetProps extends OverlayBase {
  onSave: (password: string, confirm: string) => Promise<AuthResult>
}

/** Visore della Storia Instagram (UX §6.5, §11). */
export interface StoriaViewerProps extends OverlayBase {
  story: StoryData
  /**
   * Il piazzamento del torneo («1° 🏆», «Semifinale»): la medaglia della tela.
   * Facoltativo: senza, lo si ricava da `story.resultLabel` («CAMPIONI» → 1°).
   */
  placement?: string
  /**
   * Le didascalie delle foto della storia, nello stesso ordine di
   * `story.photoUrls`: scritte sotto le polaroid. Una vuota (o assente) usa il
   * dove e il quando del torneo.
   */
  didascalie?: string[]
  /** Un messaggio per il Toast (errore di generazione, immagine copiata…). */
  onNotice: (msg: string, type?: 'info' | 'error' | 'success') => void
}

export interface Shot {
  url: string
  caption: string
}

/** Visore delle foto (MOTION.md §4.2). */
export interface LightboxProps extends OverlayBase {
  photos: Shot[]
  startIndex: number
  /** Base del nome file per il download (slug del torneo). */
  nameBase: string
}

// ------------------------------------------------------------------ schermate
/**
 * La Home del redesign. `frase`, `consigli`, `ultimi`, `hasTornei` e
 * `haPartite` arrivano tutti da `deriveHome` (selectors.ts). Il banner alpha
 * e «Chi c'è oggi» non stanno più qui: «Segnala un problema» è nel Profilo,
 * «Chi c'è oggi» in Compagni.
 */
export interface HomeProps extends HomeVista {
  /** Il nome della sessione: le iniziali dell'avatar. */
  nome: string
  /** La foto profilo (`session.avatarUrl`), se c'è. */
  avatar: string | null
  today: string
  /** Le statistiche del periodo scelto; null senza partite nel periodo (una fila di zeri non informa, F1). */
  numeri: DashboardStats | null
  /** Stagione e compagno: gli stessi filtri di Statistiche, Mappa e Wrapped (C10). */
  filtri: Filtri
  wrapped: { visibile: boolean; titolo: string }
  onNuovoTorneo: () => void
  onAggiungiPartita: (tournamentId: string) => void
  /** «Com'è andata a «X»?» → Modifica torneo. */
  onAggiornaPiazzamento: (tournamentId: string) => void
  onStoria: (tournamentId: string) => void
}

export interface StatisticheProps {
  s: DashboardStats
  filtri: Filtri
  back: NavBarBack
  wrapped: { visibile: boolean; titolo: string }
}

export interface TorneiProps {
  vista: TorneiVista
  q: string
  onVista: (v: TorneiVista) => void
  onQuery: (q: string) => void
  list: TorneiListData
  /** Le voci del diario: ciò su cui cerca la ricerca (i risultati hanno la forma del Diario). */
  entries: DiaryEntry[]
  mappa: MappaData
  /** La stagione della Mappa: si vede e si cambia lì (C10). */
  stagione: Pick<Filtri, 'fYear' | 'setFYear' | 'yearOptions'>
  onNuovoTorneo: () => void
  onStoria: (tournamentId: string) => void
  /** Id dell'entità appena creata o cambiata: la sua riga porta la traccia. */
  traccia?: string
}

export interface DiarioProps {
  q: string
  onQuery: (q: string) => void
  /** Le voci del diario, dalla più recente. */
  entries: DiaryEntry[]
  onNuovoTorneo: () => void
  onStoria: (tournamentId: string) => void
  traccia?: string
  /** La riga sotto il titolo di ogni voce (`metaDiario`). */
  meta?: (tournamentId: string) => string | undefined
}

/** Un torneo in cui si può giocare una partita live: i propri, col compagno. */
export interface LiveTorneo {
  id: string
  name: string
  /** Il nome del compagno del torneo, o '' se non c'è. */
  partner: string
}

export interface PartitaLiveProps {
  tornei: LiveTorneo[]
  /** Il torneo proposto all'apertura (quello di oggi, o l'ultimo). */
  torneoDefault: string | null
  /**
   * `torneoDefault` è un torneo di OGGI: l'impostazione si apre su «Torneo».
   * Altrimenti si apre su «Tra amici» (l'ultimo torneo è di giorni fa).
   */
  torneoOggi?: boolean
  /**
   * L'account: lo storico delle partite tra amici (localStorage) è suo, e su
   * un browser condiviso non lo vede chi entra dopo.
   */
  utente?: string | null
  /**
   * Salva la partita finita (stesso modulo dello sheet «Nuova partita»): nel
   * suo torneo, o tra amici in quello scelto con «Salva in un torneo…».
   */
  onSave: (form: AnyForm) => Promise<boolean>
  /**
   * Dopo il salvataggio, se `onSave` non ha già portato altrove: al dettaglio
   * del torneo. (`salvaPartita` naviga da sé, e la schermata se ne va prima.)
   */
  onDone: (tournamentId: string) => void
  /**
   * ✕ e indietro, a conferma già data: la conferma la chiede la schermata,
   * perché solo lei sa che cosa va perso e deve svuotare la sua memoria
   * (sessionStorage). Qui si esce e basta.
   */
  onExit: () => void
  /** «Torneo» senza tornei: «Crea un torneo» (la partita si salva dentro un torneo). */
  onNuovoTorneo?: () => void
  /** Il tasto indietro con una partita iniziata: `onBlocked` apre la conferma della schermata. */
  registerExitGuard?: (isDirty: () => boolean, onBlocked: () => void) => void | (() => void)
}

/**
 * Quello che l'intestazione del redesign legge e la derivata fonde in `meta`:
 * il formato e la superficie per la riga sopra il titolo («Amatoriale · 2vs2
 * · Sabbia outdoor»), la data ISO per quella lunga sotto («Sabato 28 giugno
 * 2025 · con Luca»).
 */
export interface TorneoScheda {
  date: string
  format: string
  surface: string
}

export interface TorneoDetailProps {
  /** `null` = non trovato (eliminato o non più condiviso, C9). */
  t: TorneoDetailData | null
  /** Senza (dati che non la conoscono): kicker = categoria, sottotitolo = `meta`. */
  scheda?: TorneoScheda | null
  back: NavBarBack
  traccia?: string
  onAddPartita: () => void
  onOpenMatch: (matchId: string) => void
  onAddFoto: () => void
  onOpenFoto: (index: number) => void
  onDeleteFoto: (photoId: string) => void
  /** La Storia Instagram: nella capsula in cima e nella barra in fondo. */
  onStoria: () => void
  /** La matita della capsula in cima: lo sheet di modifica, che ha anche «Elimina torneo». */
  onModifica: () => void
}

export interface CompagniProps {
  compagni: CompagnoCard[]
  /** Gli id dei compagni collegati a un utente: il badge «Collegato». */
  collegati?: ReadonlySet<string>
  traccia?: string
  onNuovoCompagno: () => void
}

export interface CompagnoDetailProps {
  cp: CompagnoDetailData | null
  linked: boolean
  back: NavBarBack
  traccia?: string
  onOpenMatch: (matchId: string) => void
  onCollega: () => void
  onScollega: () => void
  /** «Elimina compagno» in fondo alla pagina: la conferma la apre la shell. */
  onElimina: () => void
}

export interface ChiCeOggiProps {
  own: CheckIn | null
  room: PresentUser[]
  loading: boolean
  cityPrefill: string
  back: NavBarBack
  onCheckIn: (input: CheckInInput) => Promise<boolean>
  /** Apre il ConfirmDialog «Terminare il check-in a {città}?». */
  onTerminaCheckIn: () => void
  onRefresh: () => void
  onAddPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }>
  /** Ora dell'ultimo aggiornamento della stanza («Aggiornato alle 15:42»). */
  aggiornatoAlle?: string | null
}

export interface ProfiloProps {
  session: Session
  condivisioni: number
  consenso: Scelta | null
  /** Solo admin: le segnalazioni nuove (riga «Segnalazioni ricevute»). */
  segnalazioniNuove: number | null
  onSalvaNome: (name: string) => Promise<AuthResult>
  onCaricaAvatar: (file: File) => Promise<{ ok: boolean; error?: string }>
  onPassword: () => void
  onTogliCondivisioni: () => void
  /**
   * Lo switch «Statistiche d'uso anonime»: è la stessa scelta del dialogo dei
   * cookie (`decidi` di lib/consenso), e accende o spegne gli stessi strumenti.
   */
  onConsenso: (scelta: Scelta) => void
  onEsci: () => void
  /** Il × in alto: Profilo non è una tab, si chiude e si torna da dove si era. */
  onClose: () => void
}

export interface SegnalaProps {
  back: NavBarBack
  /** «Torna indietro» dopo l'invio (ci si arriva da due posti: goBack). */
  onBack: () => void
  onInvia: (s: NuovaSegnalazione) => Promise<EsitoInvio>
}

export interface SegnalazioniProps {
  back: NavBarBack
  /** `null` = errore di rete (lib/segnalazioni non lancia). */
  carica: () => Promise<Segnalazione[] | null>
  aggiorna: (id: string, stato: StatoSegnalazione) => Promise<boolean>
}

export interface CreaChatProps {
  partners: Option[]
  venues: Option[]
  onCreate: (form: AnyForm, matches: GuidedMatch[]) => Promise<{ id: string; partiteNonSalvate: number } | null>
  /** «Apri il torneo» → replace verso il dettaglio. */
  onDone: (tournamentId: string) => void
  /** ✕ Esci: con `dirty` (risposte date, torneo non creato) la shell chiede prima. */
  onExit: (dirty: boolean) => void
  /** Il router chiede di uscire (tasto indietro): stessa conferma di ✕. */
  registerExitGuard?: (isDirty: () => boolean) => void | (() => void)
}

export interface WrappedProps {
  /** null = non disponibile: fuori stagione o pochi dati (UX §6.5). */
  wrapped: WrappedData | null
  motivo: 'stagione' | 'dati' | null
  onClose: () => void
  onNotice: (msg: string, type?: 'info' | 'error' | 'success') => void
}

export interface NonTrovatoProps {
  titolo: string
  testo: ReactNode
  azione: ReactNode
  back?: NavBarBack
}
