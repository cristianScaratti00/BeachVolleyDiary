// ============================================================================
// Entitlements per piano di abbonamento — UNICA fonte di verità lato client per
// "cosa sblocca ciascun abbonamento". Aggiungere una feature = una riga qui.
// I limiti NUMERICI (tournaments/partners) devono restare allineati ai trigger
// DB (public.enforce_plan_limits): piano base = 5 tornei, 2 compagni.
// Premium (o ruolo admin) → tutto sbloccato.
// ============================================================================
import type { Plan, Role } from './db.enums'

export const BASE_LIMITS = { tournaments: 5, partners: 2 } as const

export interface Entitlements {
  tournaments: number      // limite tornei (Infinity = illimitato)
  partners: number         // limite compagni
  dashboardFilters: boolean // filtri per compagno/anno nella dashboard
  diary: boolean            // sezione "Diario" dei tornei
  tournamentPhotos: boolean // foto collegate al singolo torneo
}

// Tabella piano → capacità. Per decidere cosa dà il Premium, guarda questa mappa.
export const ENTITLEMENTS: Record<Plan, Entitlements> = {
  base: {
    tournaments: BASE_LIMITS.tournaments,
    partners: BASE_LIMITS.partners,
    dashboardFilters: false,
    diary: false,
    tournamentPhotos: false,
  },
  premium: {
    tournaments: Infinity,
    partners: Infinity,
    dashboardFilters: true,
    diary: true,
    tournamentPhotos: true,
  },
}

// Entitlements effettivi dell'utente. Admin = tutto sbloccato (come Premium).
export function entitlements(plan: Plan | undefined, role: Role | undefined): Entitlements {
  if (role === 'admin') return ENTITLEMENTS.premium
  return ENTITLEMENTS[plan ?? 'base']
}

export function isUnlimited(plan: Plan | undefined, role: Role | undefined): boolean {
  return entitlements(plan, role).tournaments === Infinity
}

// Accesso alle funzioni Premium (filtri dashboard, diario, foto nei tornei...).
export function hasPremium(plan: Plan | undefined, role: Role | undefined): boolean {
  return plan === 'premium' || role === 'admin'
}

export function tournamentLimit(plan: Plan | undefined, role: Role | undefined): number {
  return entitlements(plan, role).tournaments
}

export function partnerLimit(plan: Plan | undefined, role: Role | undefined): number {
  return entitlements(plan, role).partners
}
