import { Sheet, Title } from './Sheet'

interface UpgradeSheetProps {
  title?: string
  message: string
  onUpgrade: () => void
  onSeePlans: () => void
  onClose: () => void
}

const PREMIUM_FEATURES = ['Tornei illimitati', 'Compagni illimitati', 'Tutte le statistiche', 'Galleria senza limiti']

// Bottom-sheet mostrato quando un utente base raggiunge un limite o tocca una
// funzione Premium: spiega il motivo e mostra l'anteprima del piano acquistabile.
export default function UpgradeSheet({ title = 'Limite raggiunto', message, onUpgrade, onSeePlans, onClose }: UpgradeSheetProps) {
  return (
    <Sheet onClose={onClose} maxWidth={440} scroll={false}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: '#FFF1EA', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 22px 'Space Grotesk'", margin: '0 auto 12px' }}>★</div>
        <Title>{title}</Title>
      </div>
      <div style={{ font: "600 13.5px 'Nunito Sans'", color: 'rgba(27,42,74,.6)', textAlign: 'center', marginTop: -8, marginBottom: 18 }}>{message}</div>

      {/* anteprima piano Premium */}
      <div className="card" style={{ padding: 20, border: '2px solid #FF6B35' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="lbl" style={{ color: '#FF6B35' }}>Premium</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span className="num" style={{ fontSize: 26, fontWeight: 600 }}>€5</span>
            <span style={{ font: "700 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>/mese</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
          {PREMIUM_FEATURES.map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, font: "600 13px 'Nunito Sans'" }}>
              <span style={{ color: '#FF6B35', fontWeight: 800 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <button onClick={onUpgrade} className="chip" style={{ width: '100%', marginTop: 16, padding: 13, borderRadius: 11, border: 'none', cursor: 'pointer', background: '#FF6B35', color: '#fff', font: "700 14.5px 'Nunito Sans'" }}>Passa a Premium · €5</button>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button onClick={onSeePlans} className="chip" style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(27,42,74,.16)', background: 'transparent', color: '#1B2A4A', cursor: 'pointer', font: "700 13px 'Nunito Sans'" }}>Vedi i piani</button>
        <button onClick={onClose} className="chip" style={{ flex: 1, padding: 12, borderRadius: 11, border: '1px solid rgba(27,42,74,.16)', background: 'transparent', color: 'rgba(27,42,74,.6)', cursor: 'pointer', font: "700 13px 'Nunito Sans'" }}>Chiudi</button>
      </div>
    </Sheet>
  )
}
