// ============================================================================
// DORMIENTE — piani sospesi (src/lib/limits.ts → PLANS_ENABLED = false).
// Nessuno monta questo componente: è conservato pronto all'uso per quando
// arriverà l'integrazione dei pagamenti, isolato dal resto (UX C11). Vedi anche
// la migration supabase/migrations/20260721120000_disable_plans_all_premium.sql.
// ============================================================================
import { Sheet, SheetActions, SheetTitle } from './Sheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import './UpgradeSheet.css'

interface UpgradeSheetProps {
  title?: string
  message: string
  onUpgrade: () => void
  onSeePlans: () => void
  onClose: () => void
}

const PREMIUM_FEATURES = ['Tornei e compagni illimitati', 'Timeline dei tornei con foto', 'Storia Instagram dei tornei', 'Filtri avanzati nelle statistiche']

// Sheet mostrato quando un utente base raggiunge un limite o tocca una funzione
// del piano: spiega il motivo e mostra l'anteprima del piano acquistabile.
export default function UpgradeSheet({ title = 'Limite raggiunto', message, onUpgrade, onSeePlans, onClose }: UpgradeSheetProps) {
  return (
    <Sheet
      onClose={onClose}
      footer={
        <SheetActions>
          <Button variant="quiet" onClick={onSeePlans}>Vedi i piani</Button>
          <Button variant="filled" onClick={onUpgrade}>Passa a Premium · €5</Button>
        </SheetActions>
      }
    >
      <SheetTitle sub={message}>{title}</SheetTitle>
      <div className="upgrade-plan">
        <div className="upgrade-plan-head">
          <span className="upgrade-plan-name">Premium</span>
          <span className="upgrade-plan-price">€5<span className="upgrade-plan-per">/mese</span></span>
        </div>
        <ul className="upgrade-plan-list">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f}>
              <Icon name="check" size={16} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}
