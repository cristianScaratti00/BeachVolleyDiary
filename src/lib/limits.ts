// ============================================================================
// Limiti per piano di abbonamento. Devono restare allineati ai trigger DB
// (public.enforce_plan_limits): piano base = 5 tornei, 2 compagni.
// Premium (o ruolo admin) → illimitato.
// ============================================================================
import type { Plan, Role } from './db.enums'

export const BASE_LIMITS = { tournaments: 5, partners: 2 } as const

export function isUnlimited(plan: Plan | undefined, role: Role | undefined): boolean {
  return plan !== 'base' || role === 'admin'
}

// Accesso alle funzioni Premium (es. filtri della dashboard). Admin incluso.
export function hasPremium(plan: Plan | undefined, role: Role | undefined): boolean {
  return plan === 'premium' || role === 'admin'
}

export function tournamentLimit(plan: Plan | undefined, role: Role | undefined): number {
  return isUnlimited(plan, role) ? Infinity : BASE_LIMITS.tournaments
}

export function partnerLimit(plan: Plan | undefined, role: Role | undefined): number {
  return isUnlimited(plan, role) ? Infinity : BASE_LIMITS.partners
}
