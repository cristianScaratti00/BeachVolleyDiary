// ============================================================================
// Entitlements per piano di abbonamento — UNICA fonte di verità lato client per
// "cosa sblocca ciascun abbonamento". Aggiungere una feature = una riga qui.
// I limiti NUMERICI (tournaments/partners) devono restare allineati ai trigger
// DB (public.enforce_plan_limits): piano base = 5 tornei, 2 compagni.
// Premium (o ruolo admin) → tutto sbloccato.
// ============================================================================
import type { Plan, Role } from './db.enums'

// PIANI SOSPESI: in attesa dell'integrazione dei pagamenti ogni utente ha tutto
// sbloccato, qualunque sia il suo `plan`. La tabella qui sotto resta intatta:
// per riattivare il freemium rimetti `true` e ripristina il trigger DB
// (vedi supabase/migrations/20260721120000_disable_plans_all_premium.sql).
export const PLANS_ENABLED = false

export const BASE_LIMITS = { tournaments: 5, partners: 2 } as const

export interface Entitlements {
  tournaments: number      // limite tornei (Infinity = illimitato)
  partners: number         // limite compagni
  dashboardFilters: boolean // filtri per compagno/anno nella dashboard
  diary: boolean            // sezione "Diario" dei tornei
  tournamentPhotos: boolean // foto collegate al singolo torneo
  aiCreate: boolean         // assistente AI (chat guidata) per creare i tornei
}

// Tabella piano → capacità. Per decidere cosa dà il Premium, guarda questa mappa.
export const ENTITLEMENTS: Record<Plan, Entitlements> = {
  base: {
    tournaments: BASE_LIMITS.tournaments,
    partners: BASE_LIMITS.partners,
    dashboardFilters: false,
    diary: false,
    tournamentPhotos: false,
    aiCreate: false,
  },
  premium: {
    tournaments: Infinity,
    partners: Infinity,
    dashboardFilters: true,
    diary: true,
    tournamentPhotos: true,
    aiCreate: true,
  },
}

// Entitlements effettivi dell'utente. Admin = tutto sbloccato (come Premium).
// Con i piani sospesi (PLANS_ENABLED = false) vale per tutti.
export function entitlements(plan: Plan | undefined, role: Role | undefined): Entitlements {
  if (!PLANS_ENABLED || role === 'admin') return ENTITLEMENTS.premium
  return ENTITLEMENTS[plan ?? 'base']
}

export function isUnlimited(plan: Plan | undefined, role: Role | undefined): boolean {
  return entitlements(plan, role).tournaments === Infinity
}

// Accesso alle funzioni Premium (filtri dashboard, diario, foto nei tornei...).
export function hasPremium(plan: Plan | undefined, role: Role | undefined): boolean {
  return !PLANS_ENABLED || plan === 'premium' || role === 'admin'
}

export function tournamentLimit(plan: Plan | undefined, role: Role | undefined): number {
  return entitlements(plan, role).tournaments
}

export function partnerLimit(plan: Plan | undefined, role: Role | undefined): number {
  return entitlements(plan, role).partners
}
