// ============================================================================
// Visore della Storia Instagram (UX §6.5, §11; ART_DIRECTION §10.4): anteprima
// scalata della tela 1080×1920 e generazione del PNG. La cornice è quella di
// Wrapped: ✕, `role="dialog"`, Esc, focus al ✕ a t0, barre di vetro scuro.
//
// La TELA è l'unico posto dell'interfaccia con colori letterali e misure in px
// letterali: sono quelli del PNG, che html-to-image fotografa così com'è. Solo
// colori opachi da `wrapped/palette.ts`, solo Inter (incorporabile), niente
// ombre, gradienti o `backdrop-filter`.
//
// Il PNG si prepara PRIMA del tocco (come Wrapped): iOS concede
// `navigator.share` solo a ridosso del gesto, e generarlo dopo farebbe scadere
// il permesso. Scarico via Blob URL: il `data:` di prima su iOS non partiva.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { toBlob } from 'html-to-image'
import * as m from 'motion/react-m'
import { useIsPresent, useReducedMotion } from 'motion/react'
import { track } from '@vercel/analytics'
import type { StoriaViewerProps } from '../../app/contracts'
import { ENTRATA, SVELTO } from '../Motion'
import { BrandMark } from '../Logo'
import { Icon } from '../ui/Icon'
import { useEscape, useFocusTrap, useInitialFocus, useReturnFocus } from '../ui/overlay'
import { STORY_PALETTES, caricaFontExport } from '../wrapped/palette'
import type { PaletteKey, WrappedPalette } from '../wrapped/palette'
import './StoryModal.css'

const W = 1080
const H = 1920
/** Tetto all'intera generazione: html-to-image può restare appeso sui font. */
const TETTO_MS = 20000

/** Il numero di partite dal record «3–1». */
function partiteDa(record: string): string {
  const [a, b] = record.split(/[–-]/).map((x) => Number(x) || 0)
  return String(a + b)
}

function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

type Stato = 'font' | 'pronto' | 'genera'

export default function StoryModal({ story, onClose, onNotice, top, opener }: StoriaViewerProps) {
  const [variant, setVariant] = useState<PaletteKey>('navy')
  const [stato, setStato] = useState<Stato>('font')
  const [covers, setCovers] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const radios = useRef<(HTMLButtonElement | null)[]>([])
  const presente = useIsPresent()
  const ridotto = useReducedMotion()
  const vp = useViewport()
  const pal = STORY_PALETTES.find((p) => p.key === variant) ?? STORY_PALETTES[0]

  useFocusTrap(ref, presente)
  useEscape(onClose, top && presente)
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[data-close]'))
  useReturnFocus(presente, opener)

  // Download disattivo finché i font della tela non sono pronti, al massimo 3s
  // (UX §6.5): dopo, si genera con quel che c'è.
  useEffect(() => {
    let vivo = true
    void caricaFontExport().then(() => {
      if (vivo) setStato((s) => (s === 'font' ? 'pronto' : s))
    })
    return () => {
      vivo = false
    }
  }, [])

  // Foto (fino a 3) come data URL: html-to-image le incorpora senza canvas
  // "tainted". Offline cadono in silenzio e si genera la versione senza foto.
  const photoKey = story.photoUrls.join('|')
  useEffect(() => {
    let vivo = true
    setCovers([])
    const urls = story.photoUrls
    if (!urls.length) return
    const toDataUrl = (u: string) =>
      fetch(u, { mode: 'cors' })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http ' + r.status))))
        .then(
          (blob) =>
            new Promise<string>((res, rej) => {
              const fr = new FileReader()
              fr.onload = () => res(fr.result as string)
              fr.onerror = rej
              fr.readAsDataURL(blob)
            }),
        )
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('[storia] foto', e)
          return null
        })
    void Promise.all(urls.map(toDataUrl)).then((arr) => {
      if (vivo) setCovers(arr.filter((x): x is string => !!x))
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  // Cosa sa fare questo browser con un'immagine: lo share sheet con i file.
  const [canShareFiles] = useState(() => {
    try {
      const probe = new File([new Blob()], 'probe.png', { type: 'image/png' })
      return !!navigator.canShare?.({ files: [probe] })
    } catch {
      return false
    }
  })

  // ------------------------------------------------------- generazione
  const chiave = `${variant}|${covers.length}`
  const shot = useRef<{ key: string; promise: Promise<Blob> } | null>(null)
  const pronto = useRef<{ key: string; blob: Blob } | null>(null)

  const renderBlob = async (): Promise<Blob> => {
    const node = cardRef.current
    if (!node) throw new Error('tela non montata')
    await caricaFontExport()
    const opts = { pixelRatio: 1, cacheBust: true, width: W, height: H, style: { transform: 'none' } }
    // WebKit disegna l'SVG intermedio prima di aver decodificato font e foto
    // inlinati: una passata a vuoto li mette in cache (difetto di html-to-image).
    await toBlob(node, opts).catch(() => null)
    const blob = await toBlob(node, opts)
    if (!blob) throw new Error('immagine vuota')
    return blob
  }

  const prepara = (): Promise<Blob> => {
    if (shot.current?.key === chiave) return shot.current.promise
    const key = chiave
    const promise = Promise.race([
      renderBlob(),
      new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('timeout generazione')), TETTO_MS)),
    ])
    shot.current = { key, promise }
    promise.then(
      (blob) => {
        pronto.current = { key, blob }
      },
      () => {
        if (shot.current?.promise === promise) shot.current = null
      },
    )
    return promise
  }

  // In sottofondo, appena font e foto ci sono: il tocco poi condivide subito.
  useEffect(() => {
    if (stato === 'font') return
    prepara().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave, stato === 'font'])

  const blob = async (): Promise<Blob> => {
    if (pronto.current?.key === chiave) return pronto.current.blob
    setStato('genera')
    try {
      return await prepara()
    } finally {
      setStato('pronto')
    }
  }

  const fallito = (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[storia] immagine', e)
    onNotice('Impossibile generare l\'immagine. Riprova.', 'error')
  }

  const nomeFile = `${story.slug}-story.png`
  const occupato = stato !== 'pronto'

  const scarica = async () => {
    if (occupato) return
    try {
      const b = await blob()
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeFile
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      track('storia_scaricata')
    } catch (e) {
      fallito(e)
    }
  }

  const condividi = async () => {
    if (occupato) return
    let b: Blob
    try {
      b = await blob()
    } catch (e) {
      fallito(e)
      return
    }
    const file = new File([b], nomeFile, { type: 'image/png' })
    try {
      // Solo il file, niente testo: con una didascalia alcune app (Instagram in
      // testa) ricevono il testo e perdono l'immagine.
      await navigator.share({ files: [file], title: story.name })
    } catch (e) {
      const name = (e as { name?: string })?.name
      if (name === 'AbortError') return
      if (name === 'NotAllowedError') {
        onNotice('Immagine pronta: tocca di nuovo "Condividi".', 'info')
        return
      }
      fallito(e)
    }
  }

  // --------------------------------------------------- selettore colore
  const muovi = (i: number) => {
    const n = (i + STORY_PALETTES.length) % STORY_PALETTES.length
    setVariant(STORY_PALETTES[n].key)
    radios.current[n]?.focus()
  }
  const tasti = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); muovi(i + 1) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); muovi(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); muovi(0) }
    else if (e.key === 'End') { e.preventDefault(); muovi(STORY_PALETTES.length - 1) }
  }

  // Anteprima: la tela intera, scalata per stare fra le barre (al massimo
  // l'80% dell'altezza sul desktop).
  const scale = Math.max(0.2, Math.min((vp.h * 0.8 - 120) / H, (vp.w - 32) / W, 0.5))
  const boxW = Math.round(W * scale)
  const boxH = Math.round(H * scale)

  return (
    <m.div
      ref={ref}
      className="storia"
      role="dialog"
      aria-modal="true"
      aria-label={`Storia di ${story.name}`}
      data-surface="dark"
      {...(presente ? {} : { inert: '' })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTRATA }}
      exit={{ opacity: 0, transition: SVELTO }}
    >
      <div className="storia-bar storia-bar-top" data-material="glass-dark">
        <button type="button" className="storia-btn" data-close="" aria-label="Chiudi" onClick={onClose}>
          <Icon name="close" size={24} />
        </button>
        <p className="storia-title" aria-hidden="true">Storia Instagram</p>
        <span className="storia-spacer" />
      </div>

      <div className="storia-stage">
        <div role="radiogroup" aria-label="Colore della storia" className="storia-palette">
          {STORY_PALETTES.map((p, i) => {
            const on = p.key === variant
            return (
              <button
                key={p.key}
                ref={(el) => {
                  radios.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={p.label}
                tabIndex={on ? 0 : -1}
                className="storia-swatch"
                data-dark={p.key === 'navy' ? '' : undefined}
                style={{ '--c': p.bg } as CSSProperties}
                onClick={() => setVariant(p.key)}
                onKeyDown={(e) => tasti(e, i)}
              >
                <Icon name="check" size={20} />
              </button>
            )
          })}
        </div>

        <m.div
          className="storia-preview"
          style={{ width: boxW, height: boxH }}
          initial={{ opacity: 0, scale: ridotto ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1, transition: ENTRATA }}
          aria-hidden="true"
        >
          {/* La tela a piena risoluzione, scalata solo per l'anteprima. */}
          <div ref={cardRef} className="storia-canvas" style={{ transform: `scale(${scale})`, background: pal.bg, color: pal.fg }}>
            <Tela story={story} pal={pal} covers={covers} />
          </div>
        </m.div>
      </div>

      <div className="storia-bar storia-bar-bottom" data-material="glass-dark">
        {canShareFiles && (
          <button
            type="button"
            className="storia-btn storia-action"
            aria-disabled={occupato || undefined}
            aria-busy={stato === 'genera' || undefined}
            onClick={() => void condividi()}
          >
            <Icon name="share" size={20} />
            <span>{stato === 'genera' ? 'Generazione…' : 'Condividi'}</span>
          </button>
        )}
        <button
          type="button"
          className="storia-btn storia-action"
          data-primary=""
          aria-disabled={occupato || undefined}
          aria-busy={stato === 'genera' || undefined}
          onClick={() => void scarica()}
        >
          <Icon name="download" size={20} />
          <span>{stato === 'genera' ? 'Generazione…' : stato === 'font' ? 'Preparo…' : 'Scarica'}</span>
        </button>
      </div>
    </m.div>
  )
}

/**
 * La tela 1080×1920 (ART_DIRECTION §10.4): margini 88, niente testo
 * essenziale nei primi e negli ultimi 250px (zone di Instagram), il sole come
 * disco tagliato in alto a destra, numeri enormi e celle separate da filetti.
 */
function Tela({ story, pal, covers }: { story: { year: string; name: string; resultLabel: string; meta: string; winPct: number; record: string; setStr: string; diffStr: string; diffPositive: boolean; partner: string }; pal: WrappedPalette; covers: string[] }) {
  const linea = { borderColor: pal.line } as CSSProperties
  const etichetta = { color: pal.muted } as CSSProperties
  return (
    <>
      <span className="storia-disc" style={{ background: pal.disc }} />
      <div className="storia-content">
        <p className="storia-eyebrow" style={etichetta}>
          {story.resultLabel} · {story.year}
        </p>
        <h2 className="storia-name">{story.name}</h2>
        <p className="storia-meta" style={etichetta}>{story.meta}</p>

        <div className="storia-hero">
          <span className="storia-hero-n" style={{ color: pal.accent }}>{story.winPct}%</span>
          <span className="storia-hero-l" style={etichetta}>
            Vittorie{story.partner && story.partner !== '—' ? ` · in coppia con ${story.partner}` : ''}
          </span>
        </div>

        <div className="storia-cells" style={linea}>
          <Cella n={story.record} l="Record" pal={pal} linea={linea} />
          <Cella n={partiteDa(story.record)} l="Partite" pal={pal} linea={linea} />
          <Cella n={story.setStr} l="Set" pal={pal} linea={linea} />
          <Cella n={story.diffStr} l="Differenziale" pal={pal} linea={linea} accent={story.diffPositive} />
        </div>

        {covers.length > 0 && (
          <div className="storia-photos">
            {covers.map((src, i) => (
              // Il raggio sta sull'<img>, senza colore dietro: l'antialiasing
              // della curva non lascia trapelare niente nel PNG a 1080px.
              <img key={i} src={src} alt="" className="storia-photo" style={{ borderColor: pal.line }} />
            ))}
          </div>
        )}
      </div>

      <div className="storia-foot">
        <BrandMark size={72} bare={pal.key === 'navy'} />
        <span className="storia-brand" style={{ color: pal.fg }}>Beach Diary</span>
      </div>
    </>
  )
}

function Cella({ n, l, pal, linea, accent }: { n: string; l: string; pal: WrappedPalette; linea: CSSProperties; accent?: boolean }) {
  return (
    <div className="storia-cell" style={linea}>
      <span className="storia-cell-n" style={{ color: accent ? pal.accent : pal.fg }}>{n}</span>
      <span className="storia-cell-l" style={{ color: pal.muted }}>{l}</span>
    </div>
  )
}
