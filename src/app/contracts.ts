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
import type { AdessoData } from './selectors'
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

/** Sheet unico «Nuovo torneo» / «Modifica torneo» (UX §5 F2). */
export interface TorneoSheetProps extends OverlayBase {
  mode: 'nuovo' | 'modifica'
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
   * Crea o salva. `via` = 'completo' se «Altri dettagli» è stato aperto almeno
   * una volta (analytics, UX §13). true = fatto: la shell chiude e naviga.
   */
  onSave: (form: AnyForm, via: ViaCreazione) => Promise<boolean>
  /** Solo in modifica: apre il ConfirmDialog «Eliminare «X»?». */
  onDelete?: () => void
  /** «Usa l'assistente guidato»: con il modulo sporco la shell chiede prima. */
  onUseAssistant: (dirty: boolean) => void
  onMergeVenues: (fromId: string, toId: string) => Promise<boolean>
}

/** «Nuova partita» / «Modifica partita» (UX §5 F3). */
export interface PartitaSheetProps extends OverlayBase {
  mode: 'nuova' | 'modifica'
  match?: Match
  /** Il torneo di destinazione preselezionato (i 5 casi di F3). */
  tournamentId: string | null
  /** Solo i propri tornei: non si aggiungono partite a un condiviso. */
  tournaments: Option[]
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
export interface HomeProps {
  nome: string
  today: string
  adesso: AdessoData
  /** null finché non c'è almeno una partita: una fila di zeri non informa (F1). */
  numeri: DashboardStats | null
  hasTornei: boolean
  /** Etichetta della stagione condivisa («Stagione 2026», «Sempre»). */
  stagione: string
  wrapped: { visibile: boolean; titolo: string }
  banner: { visibile: boolean; onChiudi: () => void }
  /** `null` con OGGI_ATTIVO spento. */
  checkIn: { own: CheckIn | null } | null
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
  /** Le voci del diario: la Timeline e i risultati della ricerca. */
  entries: DiaryEntry[]
  mappa: MappaData
  /** La stagione della Mappa: si vede e si cambia lì (C10). */
  stagione: Pick<Filtri, 'fYear' | 'setFYear' | 'yearOptions'>
  onNuovoTorneo: () => void
  onStoria: (tournamentId: string) => void
  /** Id dell'entità appena creata o cambiata: la sua card porta la traccia. */
  traccia?: string
}

export interface TorneoDetailProps {
  /** `null` = non trovato (eliminato o non più condiviso, C9). */
  t: TorneoDetailData | null
  back: NavBarBack
  traccia?: string
  onAddPartita: () => void
  onOpenMatch: (matchId: string) => void
  onAddFoto: () => void
  onOpenFoto: (index: number) => void
  onDeleteFoto: (photoId: string) => void
  onStoria: () => void
  /** Il menu «⋯» della NavBar, ancorato al pulsante. */
  onMenu: (anchor: HTMLElement) => void
}

export interface CompagniProps {
  compagni: CompagnoCard[]
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
  onMenu: (anchor: HTMLElement) => void
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
  onCookie: () => void
  onEsci: () => void
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
