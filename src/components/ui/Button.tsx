// ============================================================================
// Pulsanti (UX §7.11, ART_DIRECTION §8). Sempre un `<button type="button">`
// vero — era un `div`, e da tastiera non si raggiungeva (difetto #4) — oppure
// un `<a href>` vero quando porta a una rotta (`ButtonLink`).
//
// - Disattivato = `aria-disabled`, non l'attributo `disabled`: resta
//   annunciato e raggiungibile, e il tocco può portare al campo che manca
//   invece di non rispondere in silenzio (MOTION.md §8.1, M15).
// - Occupato = l'etichetta cambia nello stesso fotogramma («Creo…»),
//   `aria-busy`, larghezza bloccata alla misura di riposo; i tocchi successivi
//   non fanno niente (il doppio tocco non crea due tornei).
// ============================================================================
import { forwardRef, useLayoutEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Link } from '../../app/router'
import type { LinkProps } from '../../app/router'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './Button.css'

export type ButtonVariant =
  | 'filled' // l'azione principale: arancio, etichetta navy (5.50). Una per vista
  | 'tinted' // secondaria importante: --accent-wash + --accent-text
  | 'glass' // il secondario del redesign: vetro chiaro, etichetta d'inchiostro
  | 'plain' // terziaria: solo testo --accent-text (--ink sul vetro)
  | 'quiet' // terziaria in inchiostro: «Annulla» dentro sheet e dialoghi
  | 'neutral' // --fill + --ink: azione neutra su carta
  | 'destructive' // pieno --danger: conferma di un ConfirmDialog
  | 'destructive-plain' // solo testo --danger, su superficie opaca

export type ButtonSize = 'sm' | 'md' | 'lg'

type Material = 'glass-regular' | 'glass-dark' | 'glass-thin' | 'glass-clear'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  /** Occupa tutta la larghezza disponibile. */
  block?: boolean
  /** Solo per `variant="glass"`: il materiale (default `glass-regular`). */
  material?: Material
  /** Solo per `variant="glass"`: l'etichetta rossa di «Elimina», «Esci». */
  tone?: 'danger'
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'type'>, CommonProps {
  type?: 'button' | 'submit'
  /** Annunciato come disattivato (`aria-disabled`): il clic va a `onDisabledClick`. */
  disabled?: boolean
  onDisabledClick?: () => void
  busy?: boolean
  /** Cosa dice mentre lavora: «Salvataggio…», «Creo…», «Carico…». */
  busyLabel?: string
}

function classes(extra?: string) {
  return extra ? `ui-button ${extra}` : 'ui-button'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'filled',
    size = 'md',
    icon,
    block,
    material,
    tone,
    disabled,
    onDisabledClick,
    busy,
    busyLabel,
    children,
    onClick,
    className,
    style,
    type = 'button',
    ...rest
  },
  ref,
) {
  const own = useRef<HTMLButtonElement | null>(null)
  const riposo = useRef<number | null>(null)
  // La misura di riposo si prende a ogni disegno NON occupato: quando
  // l'etichetta diventa «Salvataggio…» il pulsante non si restringe.
  useLayoutEffect(() => {
    if (!busy && own.current) riposo.current = own.current.offsetWidth || null
  })

  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      e.preventDefault()
      return
    }
    if (disabled) {
      e.preventDefault()
      onDisabledClick?.()
      return
    }
    onClick?.(e)
  }

  return (
    <button
      {...rest}
      ref={(el) => {
        own.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      type={type}
      className={classes(className)}
      data-variant={variant}
      data-size={size}
      data-block={block ? '' : undefined}
      data-material={variant === 'glass' ? material ?? 'glass-regular' : undefined}
      data-tone={tone}
      aria-disabled={disabled || undefined}
      aria-busy={busy || undefined}
      onClick={handle}
      style={busy && riposo.current ? { ...style, minWidth: riposo.current } : style}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 20} />}
      <span className="ui-button-label">{busy && busyLabel ? busyLabel : children}</span>
    </button>
  )
})

export interface ButtonLinkProps extends Omit<LinkProps, 'children'>, CommonProps {
  children: ReactNode
}

/** Un pulsante che porta a una rotta: è un link vero, vestito da pulsante. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'filled', size = 'md', icon, block, material, tone, children, className, ...rest },
  ref,
) {
  return (
    <Link
      {...rest}
      ref={ref}
      className={classes(className)}
      data-variant={variant}
      data-size={size}
      data-block={block ? '' : undefined}
      data-material={variant === 'glass' ? material ?? 'glass-regular' : undefined}
      data-tone={tone}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 20} />}
      <span className="ui-button-label">{children}</span>
    </Link>
  )
})

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-label'> {
  icon: IconName
  /** Il nome accessibile: un pulsante con sola icona deve averne uno. */
  label: string
  variant?: 'plain' | 'glass' | 'filled' | 'quiet'
  material?: Material
  iconSize?: 20 | 24
}

/** Pulsante tondo con sola icona, bersaglio 44×44 (UX §8.6). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'plain', material, iconSize = 24, className, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      aria-label={label}
      className={className ? `ui-icon-button ${className}` : 'ui-icon-button'}
      data-variant={variant}
      data-material={variant === 'glass' ? material ?? 'glass-regular' : undefined}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  )
})
