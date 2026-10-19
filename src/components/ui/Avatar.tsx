// ============================================================================
// Avatar (ART_DIRECTION §10.3): un cerchio. Con l'iniziale, carta calda col
// filo --line-strong e la lettera d'inchiostro a peso 700 (il redesign); con
// la foto, lo stesso cerchio con il filo interno. È sempre decorativo: il
// nome sta accanto, o è il nome del controllo che lo contiene («Cambia foto
// profilo»).
// ============================================================================
import './Avatar.css'

export type AvatarSize = 24 | 32 | 40 | 44 | 48 | 64 | 68 | 92

export function Avatar({ name, src, size = 40, busy, className }: {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  /** Foto in caricamento: anteprima al 60% con lo spinner (UX §6.8). */
  busy?: boolean
  className?: string
}) {
  const initial = (name?.trim()[0] ?? '?').toUpperCase()
  return (
    <span className={className ? `ui-avatar ${className}` : 'ui-avatar'} data-size={size} data-busy={busy ? '' : undefined} aria-hidden="true">
      {src ? <img src={src} alt="" /> : <span className="ui-avatar-initial">{initial}</span>}
      {busy && <span className="ui-spinner" />}
    </span>
  )
}

/** Indicatore di attesa. Solo due posti (MOTION.md §6.1): immagine del visore e avatar. */
export function Spinner({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <span className="ui-spinner-wrap" role="status">
      <span className="ui-spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
