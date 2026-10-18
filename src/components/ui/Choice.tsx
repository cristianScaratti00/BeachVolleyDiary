// ============================================================================
// SegmentedControl e FilterChips (UX §7.10). API e contratto ARIA invariati:
// `role="group"` con `aria-label`, `<button aria-pressed>`.
//
// Due forme per due gesti diversi (ART_DIRECTION D3): il segmented CAMBIA
// VISTA (guida rettangolare, segmenti uguali), le chip FILTRANO (capsule).
//
// La pillola della selezione è UNA e scivola da un'opzione all'altra: si vede
// da dove a dove. Solo transform (MOTION.md §4.3):
//   - segmented: segmenti di larghezza uguale → `translateX(i · 100%)`;
//   - chip: larghezze diverse → pillola in TRE pezzi (due tappi tondi che
//     traslano, una barra senza raggio in scaleX), perché scalare una capsula
//     ne schiaccia le estremità e `layoutId` di Motion correggerebbe il raggio
//     a ogni fotogramma.
// L'inchiostro (scuro → bianco) sono due livelli sovrapposti che si scambiano
// l'opacità con il tempo della pillola (MOLLA, M8): in SVELTO l'etichetta
// bianca arriverebbe prima del fondo navy.
// ============================================================================
import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import './Choice.css'

export interface FilterOption {
  value: string
  label: ReactNode
}

interface ChoiceProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  /** Etichetta del gruppo per gli screen reader (unica per schermata). */
  label: string
  className?: string
}

function Inchiostro({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="ui-ink">{children}</span>
      {/* Il secondo livello è solo pittura: il nome lo dà il primo. */}
      <span className="ui-ink-on" aria-hidden="true">{children}</span>
    </>
  )
}

/**
 * Interruttore fra due o tre VISTE degli stessi dati. `data-fill="equal"` è il
 * contratto dei test (segmenti uguali) al posto dello stile calcolato.
 */
export function SegmentedControl({ options, value, onChange, label, className }: ChoiceProps) {
  const i = options.findIndex((o) => o.value === value)
  return (
    <div
      role="group"
      aria-label={label}
      className={className ? `ui-segmented ${className}` : 'ui-segmented'}
      data-fill="equal"
      style={{ '--n': options.length, '--i': Math.max(0, i) } as CSSProperties}
    >
      <span className="ui-segmented-pill" aria-hidden="true" data-hidden={i < 0 ? '' : undefined} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="ui-segment"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          <Inchiostro>{o.label}</Inchiostro>
        </button>
      ))}
    </div>
  )
}

/**
 * Filtro a scelta singola («Tutti · 2vs2 · 3vs3»). Una riga sola che scorre in
 * orizzontale (`data-overflow="scroll"`), con 2px per l'anello di focus.
 */
export function FilterChips({ options, value, onChange, label, className }: ChoiceProps) {
  const box = useRef<HTMLDivElement>(null)
  const posata = useRef(false)
  const ridotto = useReducedMotion()

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const posa = (anima: boolean) => {
      const btn = el.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
      const pill = el.querySelector<HTMLElement>('.ui-chips-pill')
      if (!pill) return
      pill.toggleAttribute('data-hidden', !btn)
      if (!btn) return
      const [mid, capL, capR] = Array.from(pill.children) as HTMLElement[]
      const b = el.getBoundingClientRect()
      const r = btn.getBoundingClientRect()
      const x = r.left - b.left + el.scrollLeft
      const w = r.width
      const h = r.height
      // Prima posizione (e ridimensionamenti) senza animazione: è lo stato di
      // partenza, non un cambio.
      if (!anima) pill.setAttribute('data-still', '')
      capL.style.transform = `translateX(${x}px)`
      capR.style.transform = `translateX(${x + w - h}px)`
      // La barra va da metà del tappo sinistro a metà del destro.
      mid.style.transform = `translateX(${x + h / 2}px) scaleX(${Math.max(0, w - h)})`
      if (!anima) {
        void pill.offsetWidth
        pill.removeAttribute('data-still')
      }
    }
    posa(posata.current)
    posata.current = true
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => posa(false))
    ro.observe(el)
    return () => ro.disconnect()
  }, [value, options.length])

  return (
    <div
      ref={box}
      role="group"
      aria-label={label}
      className={className ? `ui-chips ${className}` : 'ui-chips'}
      data-overflow="scroll"
    >
      <span className="ui-chips-pill" aria-hidden="true">
        <i className="ui-chips-mid" />
        <i className="ui-chips-cap" />
        <i className="ui-chips-cap" />
      </span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="ui-chip"
          aria-pressed={o.value === value}
          onClick={(e) => {
            onChange(o.value)
            // In una riga che scorre, la chip scelta entra in vista.
            e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: ridotto ? 'auto' : 'smooth' })
          }}
        >
          <Inchiostro>{o.label}</Inchiostro>
        </button>
      ))}
    </div>
  )
}
