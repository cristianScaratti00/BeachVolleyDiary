// ============================================================================
// Modello di dominio dell'app (forma runtime, quella salvata in localStorage).
// NB: diverso da database.types.ts, che è il contratto del DB Supabase
// (camelCase vs snake_case, set inline vs tabella match_sets).
// I vincoli sui campi enum sono condivisi con db.enums.ts.
// ============================================================================
import type { Category, Format, Surface, Phase, Placement } from './db.enums'

export type { Category, Format, Surface, Phase, Placement }

export interface Partner {
  id: string
  name: string
  color: string
}

export interface SetScore {
  us: number
  them: number
}

export interface Tournament {
  id: string
  name: string
  date: string
  city: string
  category: Category
  format: Format
  surface: Surface
  placement: Placement
  color: string
  emoji: string
}

export interface Match {
  id: string
  tournamentId: string
  partnerId: string
  opponents: string
  phase: Phase
  note: string
  sets: SetScore[]
}

export interface Photo {
  id: string
  tournamentId: string
  color: string
  caption: string
}

export interface DiaryData {
  tournaments: Tournament[]
  matches: Match[]
  partners: Partner[]
  photos: Photo[]
}

// ---------------------------------------------------------------------------
// Form (stato dei modali). Un solo oggetto form condiviso: campi opzionali.
// I set nel form possono avere valori stringa mentre si digita negli input.
// ---------------------------------------------------------------------------
export interface FormSet {
  us: number | string
  them: number | string
}

export interface TorneoForm {
  name: string
  date: string
  city: string
  category: Category
  format: Format
  surface: Surface
  placement: Placement
  color: string
  emoji: string
}

export interface PartitaForm {
  tournamentId: string
  partnerId: string // id di un socio oppure 'new'
  newPartnerName: string
  opponents: string
  phase: Phase
  sets: FormSet[]
  note: string
}

export interface FotoForm {
  caption: string
  tournamentId: string
  color: string
}

export interface CompagnoForm {
  name: string
  color: string
}

// Unione permissiva usata dallo stato `form` in App (tutti i campi opzionali).
export type AnyForm = Partial<TorneoForm & PartitaForm & FotoForm & CompagnoForm>

// Setter generico tipizzato, passato ai modali.
export type SetField = <K extends keyof AnyForm>(key: K, value: AnyForm[K]) => void

// API per la gestione delle righe-set nel modale partita.
export interface SetsApi {
  rows: FormSet[]
  canAdd: boolean
  addSet: () => void
  updateSet: (index: number, key: 'us' | 'them', value: string) => void
  removeSet: (index: number) => void
}

// Coppia {id, name} per i menu a tendina.
export interface Option {
  id: string
  name: string
}

// Navigazione e modali a livello di App.
export type Screen = 'home' | 'tornei' | 'torneo' | 'compagni' | 'compagno' | 'galleria'
export type ModalKind = 'torneo' | 'partita' | 'foto' | 'socio' | null
