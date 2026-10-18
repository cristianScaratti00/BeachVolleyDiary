// ============================================================================
// TEMPORANEO (Fase 2 → Fase 6): i pezzi del vecchio `Sheet.tsx` che i moduli
// non ancora migrati usano ancora. Il nuovo Sheet sta in `./Sheet` e le
// primitive in `../ui/*`; questo file si cancella quando l'ultimo import
// sparisce (`grep -r "modals/legacy\|./legacy" src`).
// ============================================================================
import type { CSSProperties, ReactNode } from 'react'

export function Title({ children }: { children: ReactNode }) {
  return <div className="num" style={{ fontSize: 21, fontWeight: 500, marginBottom: 18 }}>{children}</div>
}

export function Label({ children, mb = 6 }: { children: ReactNode; mb?: number }) {
  return <div className="lbl" style={{ marginBottom: mb }}>{children}</div>
}

export const inputStyle: CSSProperties = { width: '100%', border: '1px solid rgba(27,42,74,.16)', borderRadius: 11, padding: '12px 14px', font: "700 14px 'Nunito Sans'", background: '#fff' }
export const selectStyle: CSSProperties = { ...inputStyle, cursor: 'pointer' }

interface ActionsProps {
  onDelete?: (() => void) | null
  deleteLabel?: string
  onCancel: () => void
  onSave: () => void
  saveLabel?: string
}

export function Actions({ onDelete, deleteLabel = 'Elimina', onCancel, onSave, saveLabel = 'Salva' }: ActionsProps) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' }}>
      {onDelete && <button type="button" className="chip" onClick={onDelete} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 16px', borderRadius: 11, border: '1px solid rgba(255,71,126,.4)', color: '#FF477E', cursor: 'pointer' }}>{deleteLabel}</button>}
      <div style={{ flex: 1 }} />
      <button type="button" className="chip" onClick={onCancel} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 20px', borderRadius: 11, border: '1px solid rgba(27,42,74,.16)', color: '#1B2A4A', cursor: 'pointer' }}>Annulla</button>
      <button type="button" className="chip" onClick={onSave} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 24px', borderRadius: 11, background: '#FF6B35', color: '#16233F', cursor: 'pointer' }}>{saveLabel}</button>
    </div>
  )
}
