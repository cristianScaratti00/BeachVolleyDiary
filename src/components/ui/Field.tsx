// ============================================================================
// Campi e controlli di modulo (UX §7.11, ART_DIRECTION §8).
//
// - Ogni campo ha un `<label for>` vero (il vecchio `Label` era un `div`).
// - Il suggerimento va in `aria-describedby`; l'errore usa `aria-invalid` più
//   un messaggio `role="alert"` collegato, mostrato al tentativo d'invio e non a
//   ogni tasto (UX §8.9). Niente scossone (MOTION.md §8.1).
// - I campi usano il Body (17px): sopra i 16px iOS non ingrandisce la pagina.
// - Il focus non toglie il bordo: si aggiunge l'anello.
// ============================================================================
import { forwardRef, useId, useRef } from 'react'
import type { CSSProperties, InputHTMLAttributes, KeyboardEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Icon } from './Icon'
import './Field.css'

function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const v = ids.filter(Boolean).join(' ')
  return v || undefined
}

interface FieldChrome {
  label: ReactNode
  /** L'etichetta c'è per gli screen reader ma non si vede (la ricerca). */
  labelHidden?: boolean
  hint?: ReactNode
  error?: ReactNode
  /** Contenuto dopo il campo (un pulsante "Usa la mia posizione"). */
  trailing?: ReactNode
  className?: string
}

function Chrome({ id, label, labelHidden, hint, error, trailing, className, children }: FieldChrome & { id: string; children: ReactNode }) {
  return (
    <div className={className ? `ui-field ${className}` : 'ui-field'} data-invalid={error ? '' : undefined}>
      <label htmlFor={id} className={labelHidden ? 'sr-only' : 'ui-field-label'}>{label}</label>
      {trailing ? <div className="ui-field-row">{children}{trailing}</div> : children}
      {hint && <p id={`${id}-h`} className="ui-field-hint">{hint}</p>}
      {error && (
        <p id={`${id}-e`} className="ui-field-error" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>, FieldChrome {
  value: string
  onChange: (value: string) => void
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, labelHidden, hint, error, trailing, className, id, value, onChange, type = 'text', ...rest },
  ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Chrome id={fid} label={label} labelHidden={labelHidden} hint={hint} error={error} trailing={trailing} className={className}>
      <input
        {...rest}
        ref={ref}
        id={fid}
        type={type}
        className="ui-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint ? `${fid}-h` : false, error ? `${fid}-e` : false, rest['aria-describedby'])}
      />
    </Chrome>
  )
})

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'>, FieldChrome {
  value: string
  onChange: (value: string) => void
  /** Mostra «n/max» sotto il campo. */
  counter?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, labelHidden, hint, error, className, id, value, onChange, counter, maxLength, ...rest },
  ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Chrome
      id={fid}
      label={label}
      labelHidden={labelHidden}
      hint={
        counter && maxLength ? (
          <>
            {hint}
            <span className="ui-field-counter">{value.length}/{maxLength}</span>
          </>
        ) : (
          hint
        )
      }
      error={error}
      className={className}
    >
      <textarea
        {...rest}
        ref={ref}
        id={fid}
        className="ui-input ui-textarea"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint || counter ? `${fid}-h` : false, error ? `${fid}-e` : false)}
      />
    </Chrome>
  )
})

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>, FieldChrome {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, labelHidden, hint, error, trailing, className, id, value, onChange, options, ...rest },
  ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Chrome id={fid} label={label} labelHidden={labelHidden} hint={hint} error={error} trailing={trailing} className={className}>
      <span className="ui-select-wrap">
        <select
          {...rest}
          ref={ref}
          id={fid}
          className="ui-input ui-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hint ? `${fid}-h` : false, error ? `${fid}-e` : false)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className="ui-select-chev" />
      </span>
    </Chrome>
  )
})

// --------------------------------------------------------------- Ricerca
export interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Il nome del campo per gli screen reader (UX §7.9: «Cerca nei tornei»). */
  label: string
  placeholder?: string
  id?: string
  className?: string
  /** Esc con il campo vuoto: il campo perde il focus. */
  onEscapeEmpty?: () => void
}

/**
 * Campo di ricerca (UX §7.9): `role="search"`, etichetta (anche solo per gli
 * screen reader), `type="search"` con la crocetta nativa spenta (base.css) e il
 * nostro ✕ con nome, nello spazio riservato: il testo non si sposta.
 * Esc con il campo pieno lo svuota; con il campo vuoto toglie il focus.
 * Il conteggio dei risultati NON sta qui: lo annuncia il sottotitolo.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, label, placeholder, id, className, onEscapeEmpty },
  ref,
) {
  const auto = useId()
  const fid = id ?? auto
  const own = useRef<HTMLInputElement | null>(null)
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Escape') return
    if (value) {
      e.preventDefault()
      onChange('')
    } else {
      e.currentTarget.blur()
      onEscapeEmpty?.()
    }
  }
  return (
    <div role="search" className={className ? `ui-search ${className}` : 'ui-search'} data-has-value={value ? '' : undefined}>
      <label htmlFor={fid} className="sr-only">{label}</label>
      <Icon name="search" size={20} className="ui-search-lens" />
      <input
        ref={(el) => {
          own.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        id={fid}
        type="search"
        className="ui-search-input"
        value={value}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
      />
      <button
        type="button"
        className="ui-search-clear"
        aria-label="Cancella la ricerca"
        tabIndex={value ? 0 : -1}
        aria-hidden={value ? undefined : true}
        onClick={() => {
          onChange('')
          own.current?.focus()
        }}
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  )
})

// ---------------------------------------------------------------- Switch
/** Interruttore (`role="switch"`): pomello in translateX, fondo navy in opacità. */
export function Switch({ checked, onChange, label, hint, disabled, className }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={className ? `ui-switch-row ${className}` : 'ui-switch-row'}>
      <span className="ui-switch-text">
        <span id={`${id}-l`} className="ui-switch-label">{label}</span>
        {hint && <span id={`${id}-h`} className="ui-switch-hint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={hint ? `${id}-h` : undefined}
        aria-disabled={disabled || undefined}
        className="ui-switch"
        onClick={() => {
          if (!disabled) onChange(!checked)
        }}
      >
        <span className="ui-switch-knob" />
      </button>
    </div>
  )
}

// ------------------------------------------------------- Campioni colore
/** I nomi dei campioni di `SWATCH_COLORS` (UX §5 F2). */
export const SWATCH_NAMES: Record<string, string> = {
  '#FF6B35': 'Arancio',
  '#00B4D8': 'Azzurro',
  '#FFD23F': 'Giallo',
  '#FF477E': 'Rosa',
  '#1B2A4A': 'Blu notte',
}

/**
 * Etichetta colore come `radiogroup` (UX §8.4): frecce per scegliere, una
 * fermata di Tab sola, nome accessibile per ogni campione. Il colore è
 * contenuto dell'utente (ART_DIRECTION §4.3.7), non palette: arriva da
 * `SWATCH_COLORS` come letterale.
 */
export function SwatchPicker({ colors, value, onChange, label }: {
  colors: string[]
  value: string
  onChange: (color: string) => void
  label: string
}) {
  const gid = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const cur = Math.max(0, colors.findIndex((c) => c.toUpperCase() === value.toUpperCase()))
  const muovi = (i: number) => {
    const n = (i + colors.length) % colors.length
    onChange(colors[n])
    refs.current[n]?.focus()
  }
  return (
    <div className="ui-field">
      <span className="ui-field-label" id={`${gid}-l`}>{label}</span>
      <div role="radiogroup" aria-labelledby={`${gid}-l`} className="ui-swatches">
        {colors.map((c, i) => {
          const on = i === cur
          return (
            <button
              key={c}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={SWATCH_NAMES[c.toUpperCase()] ?? c}
              tabIndex={on ? 0 : -1}
              className="ui-swatch"
              data-dark={c.toUpperCase() === '#1B2A4A' ? '' : undefined}
              style={{ '--c': c } as CSSProperties}
              onClick={() => onChange(c)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); muovi(i + 1) }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); muovi(i - 1) }
                else if (e.key === 'Home') { e.preventDefault(); muovi(0) }
                else if (e.key === 'End') { e.preventDefault(); muovi(colors.length - 1) }
              }}
            >
              <Icon name="check" size={20} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------- Disclosure
/**
 * «Altri dettagli» (UX §5 F2): `<button aria-expanded aria-controls>`. È l'unica
 * altezza animata dell'app (MOTION.md E1): lo sheet è ancorato in basso e deve
 * crescere verso l'alto in modo continuo. Con reduced-motion è istantanea.
 */
export function Disclosure({ title, summary, open, onToggle, children, exception = 'altri-dettagli', className }: {
  title: ReactNode
  /** Riassunto dei valori correnti, a destra quando è chiusa. */
  summary?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  exception?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={className ? `ui-disclosure-wrap ${className}` : 'ui-disclosure-wrap'}>
      <button type="button" className="ui-disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <Icon name="chevron-right" size={20} className="ui-disclosure-chev" />
        <span className="ui-disclosure-title">{title}</span>
        {summary && <span className="ui-disclosure-summary" aria-hidden={open || undefined}>{summary}</span>}
      </button>
      <Grow id={id} open={open} exception={exception}>{children}</Grow>
    </div>
  )
}

/** Il contenitore che cresce (E1). Usato da Disclosure e dalle righe dei set. */
export function Grow({ id, open, exception, children }: { id?: string; open: boolean; exception: string; children: ReactNode }) {
  return (
    <div id={id} className="ui-grow" data-open={open ? '' : undefined} data-motion-exception={exception}>
      <div className="ui-grow-inner" {...(open ? {} : { inert: '' })}>
        {children}
      </div>
    </div>
  )
}

// -------------------------------------------------------------- Riga set
/** Un set: «Set N» con «Noi» e «Loro» numerici, ognuno con l'etichetta vera. */
export function SetRow({ index, us, them, onChange, onRemove, error, firstRef }: {
  index: number
  us: string
  them: string
  onChange: (key: 'us' | 'them', value: string) => void
  onRemove?: () => void
  error?: string
  firstRef?: (el: HTMLInputElement | null) => void
}) {
  const id = useId()
  const n = index + 1
  return (
    <fieldset className="ui-setrow" data-invalid={error ? '' : undefined} aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="ui-setrow-legend">Set {n}</legend>
      <div className="ui-setrow-fields">
        <label className="ui-setrow-field">
          <span className="ui-field-label">Noi</span>
          <input
            ref={firstRef}
            className="ui-input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={us}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange('us', e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <span className="ui-setrow-dash" aria-hidden="true">–</span>
        <label className="ui-setrow-field">
          <span className="ui-field-label">Loro</span>
          <input
            className="ui-input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={them}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange('them', e.target.value.replace(/\D/g, ''))}
          />
        </label>
        {onRemove && (
          <button type="button" className="ui-icon-button ui-setrow-remove" aria-label={`Togli set ${n}`} onClick={onRemove}>
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
    </fieldset>
  )
}

/** Gruppo opaco dentro uno sheet di vetro (ART_DIRECTION D6). */
export function FormGroup({ children, title, className }: { children: ReactNode; title?: ReactNode; className?: string }) {
  return (
    <div className={className ? `ui-form-group ${className}` : 'ui-form-group'}>
      {title && <p className="ui-form-group-title">{title}</p>}
      {children}
    </div>
  )
}
