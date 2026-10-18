// ============================================================================
// Avvisi (UX §7.8, MOTION.md §4.1). Sostituiscono il "notice" di App e
// ConnectionSnackbar.
//
// - UNA regione in alto, sempre montata e vuota, con due contenitori live:
//   `role="alert"` per gli errori, `role="status"` per il resto. Si riempie
//   quando serve: ConnectionSnackbar di prima teneva sempre lo stesso testo e
//   cambiava solo l'opacità, quindi non annunciava niente.
// - Al massimo due avvisi. Gli identici si fondono con il contatore «×2».
// - info e successo si chiudono da soli a 4s, con pausa su hover, focus e
//   scheda nascosta; gli errori restano finché non li chiudi; «Sei offline»
//   resta finché la rete non torna.
// - Niente azioni dentro gli avvisi: il tempo limitato le renderebbe
//   inaccessibili.
// ============================================================================
import { forwardRef, useEffect, useRef, useSyncExternalStore } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { ENTRATA, MOLLA, SVELTO, TOAST_MS } from '../Motion'
import { useOnline, useSlowConnection } from '../../hooks/useConnection'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './Toast.css'

export type ToastType = 'info' | 'success' | 'error' | 'offline'

export interface ToastItem {
  id: number
  type: ToastType
  text: string
  key: string
  /** Quante volte è arrivato lo stesso avviso. */
  n: number
  /** Si chiude da solo dopo `ms`. */
  ms: number | null
  /** Cresce a ogni ripetizione: fa ripartire il timer e il cenno. */
  arm: number
}

let items: ToastItem[] = []
let nextId = 1
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

/**
 * `conta: false` è per gli avvisi che descrivono uno STATO (offline, rete
 * lenta): ripeterli mentre sono già a schermo non è un secondo evento, quindi
 * niente «×2» e niente cenno.
 */
function show(type: ToastType, text: string, opts: { key?: string; ms?: number | null; conta?: boolean } = {}): number {
  const key = opts.key ?? `${type}|${text}`
  const same = items.find((t) => t.key === key)
  if (same && opts.conta === false) return same.id
  if (same) {
    items = items.map((t) => (t === same ? { ...t, n: t.n + 1, arm: t.arm + 1 } : t))
    emit()
    return same.id
  }
  const auto = type === 'info' || type === 'success'
  const item: ToastItem = {
    id: nextId++,
    type,
    text,
    key,
    n: 1,
    ms: opts.ms !== undefined ? opts.ms : auto ? TOAST_MS : null,
    arm: 0,
  }
  let next = [...items, item]
  if (next.length > 2) {
    // Esce il più vecchio fra quelli che si chiudono da soli, altrimenti il più vecchio.
    const vecchio = next.find((t) => t.ms != null && t !== item) ?? next[0]
    next = next.filter((t) => t !== vecchio)
  }
  items = next
  emit()
  return item.id
}

function dismiss(id: number) {
  if (!items.some((t) => t.id === id)) return
  items = items.filter((t) => t.id !== id)
  emit()
}

function dismissKey(key: string) {
  const t = items.find((x) => x.key === key)
  if (t) dismiss(t.id)
}

/** L'API degli avvisi: si chiama da qualunque punto (azioni, ModalHost). */
export const toast = {
  info: (text: string) => show('info', text),
  success: (text: string) => show('success', text),
  error: (text: string) => show('error', text),
  show,
  dismiss,
  dismissKey,
  /** Solo per i test. */
  __reset: () => {
    items = []
    emit()
  },
}

function subscribe(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}
const EMPTY: ToastItem[] = []
export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, () => items, () => EMPTY)
}

/** «Connessione lenta» dura un po' più degli altri: 5s (UX §6.0). */
const LENTA_MS = 5000

const ICON: Record<ToastType, IconName> = {
  success: 'check-circle',
  error: 'alert',
  offline: 'wifi-off',
  info: 'info',
}

// `forwardRef`: AnimatePresence in `popLayout` misura l'avviso che esce.
const Toast = forwardRef<HTMLDivElement, { t: ToastItem }>(function Toast({ t }, ref) {
  const ctl = useRef<{ parti: () => void; pausa: () => void } | null>(null)
  const fermo = useRef(false)

  // Il timer riparte a ogni ripetizione dello stesso avviso (`arm`).
  useEffect(() => {
    if (t.ms == null) return
    let rimasto = t.ms
    let inizio = 0
    let timer = 0
    let corre = false
    const parti = () => {
      window.clearTimeout(timer)
      if (fermo.current || document.hidden) return
      inizio = Date.now()
      corre = true
      timer = window.setTimeout(() => dismiss(t.id), Math.max(600, rimasto))
    }
    const pausa = () => {
      window.clearTimeout(timer)
      if (corre) rimasto -= Date.now() - inizio
      corre = false
    }
    const vis = () => (document.hidden ? pausa() : parti())
    ctl.current = { parti, pausa }
    parti()
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', vis)
      ctl.current = null
    }
  }, [t.id, t.ms, t.arm])

  const ferma = (on: boolean) => {
    if (fermo.current === on) return
    fermo.current = on
    if (on) ctl.current?.pausa()
    else ctl.current?.parti()
  }

  return (
    <m.div
      ref={ref}
      layout="position"
      className="ui-toast"
      data-type={t.type}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, transition: ENTRATA }}
      exit={{ opacity: 0, transition: SVELTO }}
      transition={{ layout: MOLLA }}
      onMouseEnter={() => ferma(true)}
      onMouseLeave={() => ferma(false)}
      onFocus={() => ferma(true)}
      onBlur={() => ferma(false)}
    >
      <Icon name={ICON[t.type]} size={20} className="ui-toast-icon" />
      <span className="ui-toast-text">
        {t.text}
        {t.n > 1 && (
          <span key={t.arm} className="ui-toast-count">
            <span className="sr-only">, </span>×{t.n}
          </span>
        )}
      </span>
      {t.type !== 'offline' && (
        <button type="button" className="ui-toast-close" aria-label="Chiudi avviso" onClick={() => dismiss(t.id)}>
          <Icon name="close" size={20} />
        </button>
      )}
    </m.div>
  )
})

/**
 * La regione degli avvisi, una per app (sta nella shell). Si occupa anche
 * della rete: «Sei offline» persistente e «Connessione lenta» transitorio.
 */
export function ToastRegion() {
  const list = useToasts()
  const online = useOnline()
  const slow = useSlowConnection()

  useEffect(() => {
    if (!online) show('offline', 'Sei offline', { key: 'offline', ms: null, conta: false })
    else dismissKey('offline')
  }, [online])

  useEffect(() => {
    if (slow && online) show('info', "Connessione lenta: potrebbe volerci un po'.", { key: 'lenta', ms: LENTA_MS, conta: false })
  }, [slow, online])

  const errori = list.filter((t) => t.type === 'error')
  const altri = list.filter((t) => t.type !== 'error')
  return (
    <div className="ui-toasts">
      <div role="alert" className="ui-toasts-live">
        <AnimatePresence mode="popLayout" initial={false}>
          {errori.map((t) => <Toast key={t.id} t={t} />)}
        </AnimatePresence>
      </div>
      <div role="status" aria-live="polite" className="ui-toasts-live">
        <AnimatePresence mode="popLayout" initial={false}>
          {altri.map((t) => <Toast key={t.id} t={t} />)}
        </AnimatePresence>
      </div>
    </div>
  )
}
