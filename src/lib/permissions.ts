// ============================================================================
// Permessi per-utente in base al piano attivo + ai conteggi correnti.
// È lo strato "posso fare l'azione X adesso?" che sta sopra a limits.ts
// (che dice solo COSA sblocca ciascun piano). Qui si combinano le capacità del
// piano con quanti tornei/compagni l'utente ha GIÀ creato, così un utente
// declassato da Premium a Base che ha superato i limiti non può più creare.
// Ogni verdetto porta con sé il messaggio da mostrare nella bottom-sheet.
// L'enforcement autoritativo resta comunque il trigger DB enforce_plan_limits.
// ============================================================================
import type { Plan, Role } from './db.enums'
import { entitlements } from './limits'

// Azioni soggette a permesso.
export type PermissionAction =
  | 'createTournament'
  | 'createPartner'
  | 'useAiAssistant'
  | 'uploadPhoto'
  | 'shareStory'
  | 'useDashboardFilters'

// Conteggi correnti dell'utente (per i limiti quantitativi del piano Base).
export interface Usage {
  tournaments: number
  partners: number
}

// Esito di un controllo: se non consentito, `title`/`message` per l'upgrade sheet.
export interface PermissionCheck {
  allowed: boolean
  title?: string
  message?: string
}

const PREMIUM = 'Funzione Premium'
const LIMIT = 'Limite piano Base'

// Insieme di permessi calcolato per un utente (piano + ruolo + conteggi).
export interface Permissions {
  check: (action: PermissionAction) => PermissionCheck
  can: (action: PermissionAction) => boolean
  canCreateTournament: boolean
  canCreatePartner: boolean
  canUseAi: boolean
  canUploadPhoto: boolean
  canShareStory: boolean
  canUseDiary: boolean
  canUseFilters: boolean
}

export function permissionsFor(plan: Plan | undefined, role: Role | undefined, usage: Usage): Permissions {
  const ent = entitlements(plan, role)

  const canCreateTournament = usage.tournaments < ent.tournaments
  const canCreatePartner = usage.partners < ent.partners

  const check = (action: PermissionAction): PermissionCheck => {
    switch (action) {
      case 'createTournament':
        return canCreateTournament
          ? { allowed: true }
          : { allowed: false, title: LIMIT, message: `Con il piano Base puoi avere al massimo ${ent.tournaments} tornei (ne hai ${usage.tournaments}). Passa a Premium per crearne altri.` }
      case 'createPartner':
        return canCreatePartner
          ? { allowed: true }
          : { allowed: false, title: LIMIT, message: `Con il piano Base puoi avere al massimo ${ent.partners} compagni (ne hai ${usage.partners}). Passa a Premium per aggiungerne altri.` }
      case 'useAiAssistant':
        return ent.aiCreate
          ? { allowed: true }
          : { allowed: false, title: PREMIUM, message: 'L’assistente AI che crea i tornei al posto tuo è disponibile con il piano Premium.' }
      case 'uploadPhoto':
        return ent.tournamentPhotos
          ? { allowed: true }
          : { allowed: false, title: PREMIUM, message: 'Le foto nei tornei sono disponibili con il piano Premium.' }
      case 'shareStory':
        return ent.diary
          ? { allowed: true }
          : { allowed: false, title: PREMIUM, message: 'La condivisione della storia è disponibile con il piano Premium.' }
      case 'useDashboardFilters':
        return ent.dashboardFilters
          ? { allowed: true }
          : { allowed: false, title: PREMIUM, message: 'I filtri per compagno e anno sono disponibili con il piano Premium.' }
    }
  }

  return {
    check,
    can: (action) => check(action).allowed,
    canCreateTournament,
    canCreatePartner,
    canUseAi: ent.aiCreate,
    canUploadPhoto: ent.tournamentPhotos,
    canShareStory: ent.diary,
    canUseDiary: ent.diary,
    canUseFilters: ent.dashboardFilters,
  }
}
