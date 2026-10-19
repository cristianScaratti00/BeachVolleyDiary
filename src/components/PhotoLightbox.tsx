// ============================================================================
// Visore delle foto (MOTION.md §4.2, UX §6.5, §8.2). Lo disegna ModalHost, che
// lo mette in un portal su `document.body` e blocca lo scroll sotto.
//
// - `role="dialog"` «Foto i di n»; il focus va al ✕ a t0 e torna alla
//   miniatura all'inizio dell'uscita.
// - Sfoglia: il dito porta la foto 1:1; oltre ¼ della larghezza o 550px/s si
//   passa alla foto accanto, che arriva con la molla. ← / → e i pulsanti fanno
//   la stessa cosa. Giù per chiudere: l'immagine rimpicciolisce e il fondo si
//   schiarisce col dito; oltre 120px o 550px/s si chiude.
// - Le barre sono `glass-dark` (sopra una foto c'è di tutto) con bersagli da 44.
// - Lo spinner è solo sull'immagine: è uno dei due posti dove esiste.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence, useIsPresent, useMotionValue, useTransform } from 'motion/react'
import type { PanInfo } from 'motion/react'
import type { LightboxProps } from '../app/contracts'
import { ENTRATA, MOLLA, SVELTO } from './Motion'
import { Icon } from './ui/Icon'
import { useEscape, useFocusTrap, useInitialFocus, useReturnFocus } from './ui/overlay'
import { isOnline } from '../hooks/useConnection'
import './PhotoLightbox.css'

// Le stesse soglie dello sheet: un gesto deciso basta, uno lento va finito.
const CHIUDI_OLTRE_PX = 120
const CHIUDI_OLTRE_VELOCITA = 550

// Ricava l'estensione dal path della URL firmata, con ripiego dal MIME.
function extOf(url: string, mime: string): string {
  const path = url.split('?')[0]
  const e = path.match(/\.([a-zA-Z0-9]{3,4})$/)
  if (e) return e[1].toLowerCase()
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'jpg'
}

type Stato = 'carica' | 'pronta' | 'errore'

export default function PhotoLightbox({ photos, startIndex, nameBase, onClose, top, opener }: LightboxProps) {
  const [i, setI] = useState(startIndex)
  const [dir, setDir] = useState(0)
  const [stato, setStato] = useState<Stato>('carica')
  const [scarica, setScarica] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const presente = useIsPresent()
  const n = photos.length
  const shot = photos[i]
  const molte = n > 1

  useFocusTrap(ref, presente)
  useEscape(onClose, top && presente)
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[data-close]'))
  useReturnFocus(presente, opener, ref)

  const vai = (d: number) => {
    if (!molte) return
    setDir(d)
    setStato('carica')
    setI((v) => (v + d + n) % n)
  }

  // ← / → cambiano foto (solo se il visore è in cima).
  useEffect(() => {
    if (!top || !presente) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key === 'ArrowLeft') vai(-1)
      else if (e.key === 'ArrowRight') vai(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Giù per chiudere: il fondo si schiarisce e l'immagine rimpicciolisce col dito.
  const y = useMotionValue(0)
  const fondo = useTransform(y, (v) => 1 - Math.min(Math.max(v, 0), 300) / 400)
  const scala = useTransform(y, (v) => 1 - Math.min(Math.max(v, 0), 400) / 1600)
  const [trascina, setTrascina] = useState(false)

  const fine = (_e: unknown, info: PanInfo) => {
    setTrascina(false)
    const { offset, velocity } = info
    if (offset.y > CHIUDI_OLTRE_PX || velocity.y > CHIUDI_OLTRE_VELOCITA) {
      onClose()
      return
    }
    const w = ref.current?.clientWidth ?? window.innerWidth
    if (offset.x < -w / 4 || velocity.x < -CHIUDI_OLTRE_VELOCITA) vai(1)
    else if (offset.x > w / 4 || velocity.x > CHIUDI_OLTRE_VELOCITA) vai(-1)
  }

  const download = async () => {
    if (scarica || !shot) return
    setScarica(true)
    try {
      const res = await fetch(shot.url, { mode: 'cors' })
      if (!res.ok) throw new Error('http ' + res.status)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${nameBase}-${i + 1}.${extOf(shot.url, blob.type)}`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[foto] download', e)
      window.open(shot.url, '_blank', 'noopener') // ripiego: la foto in una scheda nuova
    } finally {
      setScarica(false)
    }
  }

  if (!shot) return null

  return (
    <m.div
      ref={ref}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${i + 1} di ${n}`}
      data-surface="dark"
      {...(presente ? {} : { inert: '' })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTRATA }}
      exit={{ opacity: 0, transition: SVELTO }}
    >
      <m.div className="lightbox-bg" aria-hidden="true" style={{ opacity: fondo }} onClick={onClose} />

      <div className="lightbox-bar lightbox-bar-top" data-material="glass-dark" data-hidden={trascina ? '' : undefined}>
        <button type="button" className="lightbox-btn" data-close="" aria-label="Chiudi" onClick={onClose}>
          <Icon name="close" size={24} />
        </button>
        <p className="lightbox-count" aria-hidden="true">{i + 1} / {n}</p>
        <span className="lightbox-spacer" />
      </div>

      <div className="lightbox-stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <m.div
            key={shot.url}
            className="lightbox-frame"
            custom={dir}
            variants={{
              entra: (d: number) => ({ x: `${d * 40}%`, opacity: 0 }),
              qui: { x: 0, opacity: 1 },
              esce: (d: number) => ({ x: `${d * -40}%`, opacity: 0 }),
            }}
            initial="entra"
            animate="qui"
            exit="esce"
            transition={{ x: MOLLA, opacity: SVELTO }}
            drag
            dragDirectionLock
            dragSnapToOrigin
            dragTransition={{ bounceStiffness: MOLLA.stiffness, bounceDamping: MOLLA.damping }}
            onDragStart={() => setTrascina(true)}
            onDragEnd={fine}
            style={{ y, scale: scala }}
          >
            <img
              className="lightbox-img"
              src={shot.url}
              alt={shot.caption || ''}
              data-ready={stato === 'pronta' ? '' : undefined}
              onLoad={() => setStato('pronta')}
              onError={() => setStato('errore')}
              draggable={false}
            />
            {stato === 'carica' && (
              <span className="lightbox-spinner" role="status">
                <span className="ui-spinner" aria-hidden="true" />
                <span className="sr-only">Carico la foto…</span>
              </span>
            )}
            {stato === 'errore' && (
              <p className="lightbox-error" role="status">
                {isOnline() ? 'Foto non disponibile.' : 'Foto non disponibile offline.'}
              </p>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <div className="lightbox-bar lightbox-bar-bottom" data-material="glass-dark" data-hidden={trascina ? '' : undefined}>
        {shot.caption && <p className="lightbox-caption">{shot.caption}</p>}
        <div className="lightbox-actions">
          {molte && (
            <button type="button" className="lightbox-btn" aria-label="Precedente" onClick={() => vai(-1)}>
              <Icon name="chevron-left" size={24} />
            </button>
          )}
          {molte && (
            <button type="button" className="lightbox-btn" aria-label="Successiva" onClick={() => vai(1)}>
              <Icon name="chevron-right" size={24} />
            </button>
          )}
          <button
            type="button"
            className="lightbox-btn lightbox-download"
            aria-busy={scarica || undefined}
            onClick={() => void download()}
          >
            <Icon name="download" size={20} />
            <span>{scarica ? 'Download…' : 'Scarica'}</span>
          </button>
        </div>
      </div>
    </m.div>
  )
}
