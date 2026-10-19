// ============================================================================
// La riga di un set (design 16), condivisa da «Nuova partita» e dal punteggio
// dell'assistente: «Set N» a sinistra, i due punteggi 64×48 centrati col
// trattino in mezzo, «Togli set N» in fondo. Sopra le righe, una volta sola,
// l'intestazione «Noi – Loro» allineata ai campi.
// ============================================================================
import { useId } from 'react'
import { Icon } from '../ui/Icon'
import './RigaSet.css'

/** L'intestazione delle colonne: solo per gli occhi, ogni campo ha già il suo nome. */
export function SetIntestazione() {
  return (
    <div className="riga-set-cols" aria-hidden="true">
      <span>Noi</span>
      <span />
      <span>Loro</span>
    </div>
  )
}

/**
 * Un set (design 16): «Set N» a sinistra, i due punteggi 64×48 con il
 * trattino in mezzo, «Togli set N» in fondo alla riga. È un `group` col nome
 * «Set N»: dentro, i campi si chiamano «Noi» e «Loro».
 */
export function RigaSet({ n, us, them, onChange, onRemove, error, firstRef }: {
  n: number
  us: string
  them: string
  onChange: (key: 'us' | 'them', value: string) => void
  onRemove?: () => void
  error?: string
  firstRef?: (el: HTMLInputElement | null) => void
}) {
  const id = useId()
  const solo = (v: string) => v.replace(/\D/g, '')
  return (
    <div
      role="group"
      aria-labelledby={`${id}-l`}
      aria-describedby={error ? `${id}-e` : undefined}
      className="riga-set"
      data-invalid={error ? '' : undefined}
    >
      <div className="riga-set-line">
        <span id={`${id}-l`} className="riga-set-n">Set {n}</span>
        <input
          ref={firstRef}
          className="ui-input riga-set-punti"
          aria-label="Noi"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={us}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange('us', solo(e.target.value))}
        />
        <span className="riga-set-dash" aria-hidden="true">–</span>
        <input
          className="ui-input riga-set-punti"
          aria-label="Loro"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={them}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange('them', solo(e.target.value))}
        />
        {onRemove && (
          <button type="button" className="ui-icon-button riga-set-remove" aria-label={`Togli set ${n}`} onClick={onRemove}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-e`} className="ui-field-error" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
