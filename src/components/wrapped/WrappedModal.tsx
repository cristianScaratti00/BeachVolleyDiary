// ============================================================================
// Beach Wrapped: il visore a tutto schermo, sfogliabile come una storia
// (UX §5 F8, §6.5, §11; MOTION.md §4.2). La cornice è la stessa della Storia:
// ✕, `role="dialog"`, Esc, focus, blocco dello scroll, barre di vetro scuro
// da 44px sopra il fondo dei visori.
//
// Riusa la pipeline della Storia (card fissa 1080×1920 → toBlob, foto CORS
// inlinate come data-URL) e aggiunge:
//  · barre di avanzamento + navigazione tap/swipe/tastiera + auto-avanzamento;
//  · sull'ultima slide due azioni sul riepilogo: «Condividi» (share sheet
//    nativo col PNG; dove non c'è, copia negli appunti) e «Scarica».
// Il nodo catturato NON è quello scalato dell'anteprima: c'è un layer nascosto a
// piena risoluzione (una card per slide), così l'immagine esce pixel-perfect.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { toBlob } from 'html-to-image'
import { track } from '@vercel/analytics'
import { useReducedMotion } from 'motion/react'
import type { WrappedData } from '../../lib/derive'
import { Button, IconButton } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/Feedback'
import { useEscape, useFocusTrap, useInitialFocus, useScrollLock } from '../ui/overlay'
import { caricaFontExport, wrappedPalette } from './palette'
import WrappedSlideCard from './WrappedSlideCard'
import './WrappedModal.css'

/** Durata dell'auto-avanzamento per slide: è anche la durata delle barre. */
const SLIDE_MS = 5200
/** Spazio dell'anteprima occupato dalle barre e dalle azioni, sopra e sotto. */
const CORNICE_PX = 230
const pad2 = (n: number) => String(n).padStart(2, '0')

export type TipoAvviso = 'info' | 'error' | 'success'

interface WrappedModalProps {
  wrapped: WrappedData
  onClose: () => void
  onNotice?: (msg: string, type?: TipoAvviso) => void
}

/** La cornice comune: il visore, con il ✕ in alto e il fondo dei visori. */
function Cornice({ children, onClose, label = 'Beach Wrapped' }: { children: ReactNode; onClose: () => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollLock(true)
  useFocusTrap(ref)
  useEscape(onClose)
  // Il focus va al ✕ a t0 (MOTION.md §3.5): è il primo comando del visore.
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[data-chiudi]'))
  return (
    <div ref={ref} className="wrapped" role="dialog" aria-modal="true" aria-label={label} data-surface="dark" onClick={onClose}>
      {children}
    </div>
  )
}

function Chiudi({ onClose }: { onClose: () => void }) {
  return (
    <IconButton
      icon="close"
      label="Chiudi"
      className="wrapped-close"
      data-chiudi=""
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    />
  )
}

/**
 * Wrapped non disponibile (UX §6.5): fuori stagione o con pochi dati. Mai una
 * pagina vuota: il motivo e un [Ho capito] che chiude.
 */
export function WrappedNonDisponibile({ motivo, onClose }: { motivo: 'stagione' | 'dati'; onClose: () => void }) {
  return (
    <Cornice onClose={onClose}>
      <div className="wrapped-bar wrapped-bar-top" data-material="glass-dark" onClick={(e) => e.stopPropagation()}>
        <Chiudi onClose={onClose} />
      </div>
      <div className="wrapped-empty" onClick={(e) => e.stopPropagation()}>
        <EmptyState
          icon="sun"
          title="Beach Wrapped in arrivo"
          text={
            motivo === 'stagione'
              ? 'Il recap arriva a fine stagione, da settembre.'
              : 'Servono almeno qualche partita in questo periodo per generare il tuo recap di stagione. Aggiungi tornei e partite e torna a trovarci.'
          }
          action={
            <Button variant="filled" onClick={onClose}>
              Ho capito
            </Button>
          }
        />
      </div>
    </Cornice>
  )
}

export default function WrappedModal({ wrapped, onClose, onNotice }: WrappedModalProps) {
  const slides = wrapped.slides
  const n = slides.length
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  // Dito premuto sulla card: è la pausa, lo stesso gesto delle storie. Un
  // contenuto che scorre da solo deve poter essere fermato da chi lo guarda.
  const [held, setHeld] = useState(false)
  const [vista, setVista] = useState(() => ({
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
    w: typeof window !== 'undefined' ? window.innerWidth : 390,
  }))
  const [photos, setPhotos] = useState<Record<string, string>>({})
  // Una fonte sola per la preferenza (MOTION.md §11.1): con reduced-motion
  // l'auto-avanzamento è spento e le barre stanno ferme.
  const reduceMotion = !!useReducedMotion()
  // Cosa sa fare questo browser con un'immagine. Share sheet con file: i
  // telefoni (e qualche desktop). Altrimenti gli appunti, dove ci sono.
  const [canShareFiles] = useState(() => {
    try {
      const probe = new File([new Blob()], 'probe.png', { type: 'image/png' })
      return !!navigator.canShare?.({ files: [probe] })
    } catch {
      return false
    }
  })
  const [canCopyImage] = useState(
    () => typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function',
  )
  const canShare = canShareFiles || canCopyImage
  const captureRefs = useRef<(HTMLDivElement | null)[]>([])
  const downX = useRef<number | null>(null)

  // Se l'intervallo cambia (nuove slide), riparte dall'inizio.
  const rangeKey = wrapped.range.from + '|' + wrapped.range.to + '|' + wrapped.partnerName
  useEffect(() => {
    setIdx(0)
  }, [rangeKey])

  useEffect(() => {
    const onResize = () => setVista({ h: window.innerHeight, w: window.innerWidth })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Foto delle slide (intro/podio): scaricate e inlinate come data-URL, così
  // html-to-image le incorpora nel PNG senza canvas "tainted".
  const photoUrls = Array.from(new Set(slides.map((s) => s.photoUrl).filter((u): u is string => !!u)))
  const photoKey = photoUrls.join('|')
  useEffect(() => {
    let alive = true
    if (!photoUrls.length) {
      setPhotos({})
      return
    }
    const toDataUrl = (u: string) =>
      fetch(u, { mode: 'cors' })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http ' + r.status))))
        .then(
          (blob) =>
            new Promise<[string, string]>((resolve, reject) => {
              const fr = new FileReader()
              fr.onload = () => resolve([u, fr.result as string])
              fr.onerror = reject
              fr.readAsDataURL(blob)
            }),
        )
        .catch((e) => {
          console.warn('[wrapped] foto', e)
          return null
        })
    Promise.all(photoUrls.map(toDataUrl)).then((pairs) => {
      if (!alive) return
      const map: Record<string, string> = {}
      pairs.forEach((p) => {
        if (p) map[p[0]] = p[1]
      })
      setPhotos(map)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  const photoFor = (url?: string | null): string | null => (url ? photos[url] ?? null : null)

  // Auto-avanzamento: il timer è l'unica fonte di verità (la barra è solo la
  // sua immagine). Si ferma sull'ultima slide, in pausa, durante l'export e
  // con reduced-motion.
  useEffect(() => {
    if (!autoplay || held || busy || reduceMotion || idx >= n - 1) return
    const t = setTimeout(() => setIdx((i) => Math.min(n - 1, i + 1)), SLIDE_MS)
    return () => clearTimeout(t)
  }, [autoplay, held, busy, reduceMotion, idx, n])

  const go = (i: number) => setIdx(Math.max(0, Math.min(n - 1, i)))
  const next = () => go(idx + 1)
  const prev = () => go(idx - 1)

  // Un solo gestore pointer per mouse, dito e penna: swipe se lo spostamento è
  // ampio, altrimenti tap (terzo sinistro = indietro, il resto = avanti).
  const onPointerDown = (e: ReactPointerEvent) => {
    downX.current = e.clientX
    setHeld(true)
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const sx = downX.current
    downX.current = null
    setHeld(false)
    if (sx == null) return
    const dx = e.clientX - sx
    if (Math.abs(dx) > 60) {
      if (dx < 0) next()
      else prev()
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientX - rect.left < rect.width * 0.32) prev()
    else next()
  }
  // Il dito che esce dalla card senza rilasciare lascerebbe il mazzo fermo per
  // sempre: qualunque uscita dal gesto rimette in moto.
  const onPointerCancel = () => {
    downX.current = null
    setHeld(false)
  }

  // L'anteprima si scala sull'altezza visibile (e sulla larghezza su schermi
  // stretti); da 900px la card resta entro l'80% dell'altezza (UX §9.2).
  const perAltezza = (vista.h - CORNICE_PX) / 1920
  const perLarghezza = (vista.w - 32) / 1080
  const tetto = vista.w >= 900 ? (vista.h * 0.8) / 1920 : 0.56
  const scale = Math.max(0.22, Math.min(0.56, tetto, perAltezza, perLarghezza))
  const boxW = Math.round(1080 * scale)
  const boxH = Math.round(1920 * scale)

  const renderBlob = async (i: number): Promise<Blob> => {
    const node = captureRefs.current[i]
    if (!node) throw new Error('card non montata')
    // Su iPhone e Mac l'interfaccia usa SF e Inter non è mai scaricato: senza
    // questo il PNG esce in Arial. Dentro il tetto di 3s (UX §6.5): oltre, si
    // genera con quel che c'è.
    await caricaFontExport()
    // pixelRatio 2 → PNG 2160×3840: nitido su schermi retina e dopo l'upload IG.
    const opts = { pixelRatio: 2, cacheBust: true, width: 1080, height: 1920 }
    // WebKit disegna l'SVG intermedio prima di aver decodificato font e foto
    // inlinati, e la prima immagine esce senza (difetto noto di html-to-image
    // su Safari/iOS). Una passata a vuoto li mette in cache.
    await toBlob(node, opts).catch(() => null)
    const blob = await toBlob(node, opts)
    if (!blob) throw new Error('immagine vuota')
    return blob
  }

  const fileName = (i: number) => `${wrapped.slug}-${pad2(i + 1)}.png`

  // Quale card finisce nel PNG: il RIEPILOGO, non la slide che si guarda
  // (sull'ultima si legge "Grazie"). Senza riepilogo, la slide corrente.
  const recapIdx = slides.findIndex((s) => s.kind === 'recap')
  const exportIdx = recapIdx >= 0 ? recapIdx : idx

  // L'immagine si prepara PRIMA del tocco, appena si arriva all'ultima slide:
  // iOS concede `navigator.share` solo a ridosso del gesto, e generare il PNG
  // dopo il tocco (secondi, su un telefono) faceva scadere il permesso.
  const shotKey = `${rangeKey}|${exportIdx}|${Object.keys(photos).length}`
  const shotRef = useRef<{ key: string; promise: Promise<Blob> } | null>(null)
  const blobRef = useRef<{ key: string; blob: Blob } | null>(null)
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const ready = readyKey === shotKey
  // «Preparo…» sul pulsante mentre il PNG si sta generando (UX §6.5); se la
  // preparazione fallisce torna l'etichetta di sempre, e il tocco riprova.
  const [inCorso, setInCorso] = useState(false)

  const prepare = (): Promise<Blob> => {
    if (shotRef.current?.key === shotKey) return shotRef.current.promise
    const key = shotKey
    // Tetto all'intera generazione: se html-to-image resta appeso su un font
    // che non arriva, il pulsante non deve restare su «Preparo…» per sempre.
    const promise = Promise.race([
      renderBlob(exportIdx),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout generazione')), 20000)),
    ])
    shotRef.current = { key, promise }
    setInCorso(true)
    promise.then(
      (blob) => {
        blobRef.current = { key, blob }
        setReadyKey(key)
        setInCorso(false)
      },
      // Un errore non resta in cache: il tocco successivo riprova.
      () => {
        if (shotRef.current?.promise === promise) shotRef.current = null
        setInCorso(false)
      },
    )
    return promise
  }

  const atEnd = idx === n - 1
  useEffect(() => {
    if (!atEnd || !wrapped.hasEnoughData) return
    // In sottofondo: un fallimento qui non si mostra, lo dirà il tocco.
    prepare().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atEnd, shotKey, wrapped.hasEnoughData])

  // Il Blob pronto, oppure lo genera adesso (tocco arrivato prima della fine
  // della preparazione). `busy` copre solo l'attesa visibile.
  const getBlob = async (): Promise<Blob> => {
    const pronto = blobRef.current
    if (pronto?.key === shotKey) return pronto.blob
    setBusy(true)
    try {
      return await prepare()
    } finally {
      setBusy(false)
    }
  }

  const failed = (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[wrapped] immagine', e)
    onNotice?.('Impossibile generare l’immagine. Riprova.', 'error')
  }

  // Scarico via Blob URL e ancora agganciata al documento: un `data:` da
  // qualche MB su un'ancora staccata, su iOS, spesso non partiva.
  const download = async () => {
    if (busy) return
    try {
      const blob = await getBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName(exportIdx)
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      track('wrapped_scaricato')
    } catch (e) {
      failed(e)
    }
  }

  const share = async () => {
    if (busy) return
    let blob: Blob
    try {
      blob = await getBlob()
    } catch (e) {
      failed(e)
      return
    }
    const file = new File([blob], fileName(exportIdx), { type: 'image/png' })
    if (canShareFiles) {
      try {
        // Solo il file, niente `text`: con una didascalia alcune app
        // (Instagram in testa) perdono l'immagine.
        await navigator.share({ files: [file], title: 'Il mio Beach Wrapped' })
        track('wrapped_condiviso', { via: 'share' })
      } catch (e) {
        const name = (e as { name?: string })?.name
        // Share sheet chiuso senza scegliere: non è un errore.
        if (name === 'AbortError') return
        // Permesso del gesto scaduto (l'immagine non era ancora pronta al
        // tocco): adesso lo è, quindi il secondo tocco funziona.
        if (name === 'NotAllowedError') {
          onNotice?.('Immagine pronta: tocca di nuovo “Condividi”.', 'info')
          return
        }
        failed(e)
      }
      return
    }
    // Desktop senza share sheet: l'immagine negli appunti.
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      track('wrapped_condiviso', { via: 'appunti' })
      onNotice?.('Immagine copiata: incollala nel post o nella chat.', 'success')
    } catch (e) {
      failed(e)
    }
  }

  // ---- pochi dati: il recap non ha senso ----
  if (!wrapped.hasEnoughData) return <WrappedNonDisponibile motivo="dati" onClose={onClose} />

  const ferma = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return (
    <Cornice onClose={onClose}>
      {/* La barra alta: avanzamento e chiusura. Il ✕ è navigazione, non
          un'azione sul recap: sta nell'angolo, non fra i comandi. */}
      <div className="wrapped-bar wrapped-bar-top" data-material="glass-dark" onClick={ferma}>
        <div className="wrapped-progress" style={{ width: boxW }} aria-hidden="true">
          {slides.map((_, i) => {
            const animating = i === idx && autoplay && !busy && !reduceMotion
            const filled = i < idx || (i === idx && !animating)
            return (
              <div key={i} className="wrapped-progress-track">
                <div
                  key={i === idx ? 'active-' + idx : 'seg-' + i}
                  className="wrapped-progress-fill"
                  data-filled={filled ? '' : undefined}
                  data-animating={animating ? '' : undefined}
                  // In pausa la barra si ferma dov'è: saltare a piena direbbe
                  // il falso su quanto manca.
                  style={
                    animating
                      ? ({ '--slide-ms': `${SLIDE_MS}ms`, animationPlayState: held ? 'paused' : 'running' } as CSSProperties)
                      : undefined
                  }
                />
              </div>
            )
          })}
        </div>
        <Chiudi onClose={onClose} />
      </div>

      {/* L'anteprima scalata sfogliabile. */}
      <div className="wrapped-stage">
        <div
          onClick={ferma}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              next()
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault()
              prev()
            } else if (e.key === ' ') {
              e.preventDefault()
              setAutoplay((a) => !a)
            }
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="slide"
          aria-label={`Beach Wrapped, slide ${idx + 1} di ${n}`}
          className="wrapped-deck"
          style={{ width: boxW, height: boxH }}
        >
          {/* Due livelli: quello ESTERNO entra (opacità e 14px), quello
              INTERNO tiene la scala dell'anteprima. Sullo stesso nodo,
              l'entrata che finisce con `transform: none` cancellerebbe la scala. */}
          <div key={idx} className="wrapped-card" style={{ width: boxW, height: boxH }}>
            <div className="wrapped-card-scale" style={{ transform: `scale(${scale})` }}>
              <WrappedSlideCard slide={slides[idx]} pal={wrappedPalette(idx)} index={idx} total={n} photoSrc={photoFor(slides[idx].photoUrl)} />
            </div>
          </div>
        </div>
      </div>

      {/* Sotto la card nessuna pulsantiera di navigazione: il mazzo si sfoglia
          con il dito e con le frecce. Condividi/Scarica solo sull'ultima slide;
          lo spazio resta riservato, o la card ballerebbe all'ultimo passaggio. */}
      <div className="wrapped-bar wrapped-bar-bottom" data-material="glass-dark" onClick={ferma}>
        {atEnd &&
          (canShare ? (
            <>
              <button
                type="button"
                className="ui-button"
                data-variant="filled"
                onClick={share}
                aria-busy={busy || !ready}
                aria-disabled={busy || undefined}
              >
                <Icon name="share" size={20} />
                <span className="ui-button-label">{inCorso || busy ? 'Preparo…' : 'Condividi'}</span>
              </button>
              <button
                type="button"
                className="ui-button"
                data-variant="quiet"
                onClick={download}
                aria-disabled={busy || undefined}
              >
                <Icon name="download" size={20} />
                <span className="ui-button-label">Scarica</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="ui-button"
              data-variant="filled"
              onClick={download}
              aria-busy={busy || !ready}
              aria-disabled={busy || undefined}
            >
              <Icon name="download" size={20} />
              <span className="ui-button-label">{inCorso || busy ? 'Preparo…' : recapIdx >= 0 ? 'Scarica il riepilogo' : 'Scarica'}</span>
            </button>
          ))}
      </div>

      {/* Il layer nascosto a piena risoluzione: una card per slide, sorgente
          degli export (mai scalata, quindi immagine pixel-perfect). */}
      <div aria-hidden="true" className="wrapped-capture">
        {slides.map((sl, i) => (
          <div
            key={i}
            ref={(el) => {
              captureRefs.current[i] = el
            }}
            className="wrapped-capture-card"
          >
            <WrappedSlideCard slide={sl} pal={wrappedPalette(i)} index={i} total={n} photoSrc={photoFor(sl.photoUrl)} />
          </div>
        ))}
      </div>
    </Cornice>
  )
}
