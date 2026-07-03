import type { CSSProperties, ReactNode } from 'react'

interface SheetProps {
  maxWidth?: number
  scroll?: boolean
  onClose: () => void
  children: ReactNode
}

// Shared bottom-sheet modal shell used by all forms.
export function Sheet({ maxWidth = 520, scroll = true, onClose, children }: SheetProps) {
  const inner: CSSProperties = {
    background: '#FAF8F5', width: '100%', maxWidth,
    borderRadius: '22px 22px 0 0', padding: 24,
    animation: 'sheet .26s cubic-bezier(.2,.8,.2,1) both',
  }
  if (scroll) { inner.maxHeight = '92vh'; inner.overflowY = 'auto' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(27,42,74,.35)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'overlay .2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={inner}>
        <div style={{ width: 40, height: 4, background: 'rgba(27,42,74,.15)', borderRadius: 4, margin: '0 auto 18px' }} />
        {children}
      </div>
    </div>
  )
}

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

// footer action buttons
export function Actions({ onDelete, deleteLabel = 'Elimina', onCancel, onSave, saveLabel = 'Salva' }: ActionsProps) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' }}>
      {onDelete && <div className="chip" onClick={onDelete} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 16px', borderRadius: 11, border: '1px solid rgba(255,71,126,.4)', color: '#FF477E', cursor: 'pointer' }}>{deleteLabel}</div>}
      <div style={{ flex: 1 }} />
      <div className="chip" onClick={onCancel} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 20px', borderRadius: 11, border: '1px solid rgba(27,42,74,.16)', color: '#1B2A4A', cursor: 'pointer' }}>Annulla</div>
      <div className="chip" onClick={onSave} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 24px', borderRadius: 11, background: '#FF6B35', color: '#fff', cursor: 'pointer' }}>{saveLabel}</div>
    </div>
  )
}
