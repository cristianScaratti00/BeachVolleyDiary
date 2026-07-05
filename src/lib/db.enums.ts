// ============================================================================
// Valori ammessi dai CHECK dello schema — union types + costanti runtime.
// Unica fonte di verità per i menu a tendina dei form e per la validazione.
// (Nello schema sono colonne `text` con CHECK, non enum Postgres, quindi in
//  database.types.ts risultano `string`: qui li restringiamo.)
// ============================================================================
import type { Tables } from './database.types'

// King/Queen = "king/queen of the beach": si cambia compagno ad ogni partita e
// si vincono i set singolarmente.
export const CATEGORIES = ['Amatoriale', 'Open', 'Serie', 'Pro', 'King', 'Queen'] as const
export const FORMATS = ['2vs2', '3vs3', '4vs4'] as const
export const SURFACES = ['Sabbia outdoor', 'Indoor', 'Erba'] as const
export const PHASES = ['Girone', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'] as const
export const PLACEMENTS = ['1° 🏆', '2°', '3°', 'Semifinale', 'Quarti', 'Ottavi', 'Gironi', 'In corso'] as const

// Ruoli utente e piani di abbonamento (colonne profiles.role / profiles.plan).
export const ROLES = ['admin', 'user'] as const
export const PLANS = ['base', 'premium'] as const

export type Category = (typeof CATEGORIES)[number]
export type Format = (typeof FORMATS)[number]
export type Surface = (typeof SURFACES)[number]
export type Phase = (typeof PHASES)[number]
export type Placement = (typeof PLACEMENTS)[number]
export type Role = (typeof ROLES)[number]
export type Plan = (typeof PLANS)[number]

// Righe con i campi vincolati ristretti alle union (comode nei form).
export type TournamentTyped = Omit<Tables<'tournaments'>, 'category' | 'format' | 'surface' | 'placement'> & {
  category: Category
  format: Format
  surface: Surface
  placement: Placement
}
export type MatchTyped = Omit<Tables<'matches'>, 'phase'> & { phase: Phase }

// Forma "idratata" usata dall'app: una partita con i suoi set ordinati.
export type MatchWithSets = MatchTyped & {
  match_sets: Array<Pick<Tables<'match_sets'>, 'set_number' | 'us' | 'them'>>
}
