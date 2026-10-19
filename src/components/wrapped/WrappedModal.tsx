// ============================================================================
// Beach Wrapped (il redesign, schermata 18): slide a tutto schermo col fondo
// pieno — arancio col testo d'inchiostro, inchiostro col testo bianco, sabbia
// col testo d'inchiostro, a turno — sfogliabili come una storia.
//
// In cima le barre d'avanzamento, «Beach Wrapped · 2026» e il × di vetro; in
// mezzo Pallo che esulta, l'occhiello, il numero enorme, il titolo e la
// didascalia, che entrano salendo di 16px; in fondo «Scarica tutte» e
// «Condividi», di vetro, su ogni slide.
//
// Gesti (invariati): tocco = avanti, sul terzo sinistro = indietro; swipe;
// dito premuto = pausa; ← / → e la barra spaziatrice da tastiera; avanzamento
// automatico (spento con reduced-motion).
//
// Gli export restano quelli di prima, col nuovo look: una tela fissa
// 1080×1920 per slide (WrappedSlideCard) in un livello nascosto, catturata da
// html-to-image a piena risoluzione (foto CORS inlinate come data-URL, Geist
// caricato prima). «Scarica tutte» scarica un PNG per slide; «Condividi» passa
// allo share sheet nativo la slide che si guarda (sull'ultima, il saluto, il
// RIEPILOGO), e dove lo share sheet non c'è copia l'immagine negli appunti.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { toBlob } from 'html-to-image'
import { track } from '@vercel/analytics'
import { useReducedMotion } from 'motion/react'
import type { WrappedData, WrappedSlide } from '../../lib/derive'
import { Button, IconButton } from '../ui/Button'
import { Pallo } from '../Pallo'
import { useEscape, useFocusTrap, useInitialFocus, useScrollLock } from '../ui/overlay'
import { caricaFontExport, wrappedPalette } from './palette'
import type { PaletteKey } from './palette'
import { caricaFoto } from './foto'
import type { FotoTela } from './foto'
import { annoDi, fotoStretta, tagliaTitolo, umoreSlide } from './slide'
import WrappedSlideCard from './WrappedSlideCard'
import './WrappedModal.css'

/** Durata dell'auto-avanzamento per slide: è anche la durata delle barre. */
const SLIDE_MS = 5200
/** Fra un download e l'altro di «Scarica tutte»: i browser li accodano meglio distanziati. */
const PASSO_DOWNLOAD_MS = 150
/** Tetto all'intera generazione di un PNG: html-to-image può restare appeso sui font. */
const TETTO_MS = 20000
const pad2 = (n: number) => String(n).padStart(2, '0')

export type TipoAvviso = 'info' | 'error' | 'success'

interface WrappedModalProps {
  wrapped: WrappedData
  onClose: () => void
  onNotice?: (msg: string, type?: TipoAvviso) => void
}

/**
 * La cornice: il dialogo a tutto schermo col fondo della slide. Sull'inchiostro
 * è una superficie scura (anello di focus bianco).
 */
function Cornice({ children, onClose, tono, label = 'Beach Wrapped' }: { children: ReactNode; onClose: () => void; tono: PaletteKey; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollLock(true)
  useFocusTrap(ref)
  useEscape(onClose)
  // Il focus va al ✕ a t0 (MOTION.md §3.5): è il primo comando del visore.
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[data-chiudi]'))
  return (
    <div ref={ref} className="wrapped" role="dialog" aria-modal="true" aria-label={label} data-tone={tono} data-surface={tono === 'ink' ? 'dark' : undefined}>
      {children}
    </div>
  )
}

function Chiudi({ onClose }: { onClose: () => void }) {
  return <IconButton icon="close" label="Chiudi" variant="glass" iconSize={20} className="wrapped-close" data-chiudi="" onClick={onClose} />
}

/**
 * Wrapped non disponibile (UX §6.5): fuori stagione o con pochi dati. Mai una
 * pagina vuota: il motivo e un [Ho capito] che chiude, sulla sabbia. Beach
 * Wrapped c'è solo a ottobre (la regola sta in App): fuori mese Pallo saluta
 * e dà appuntamento; con pochi dati sbircia in attesa delle partite.
 */
export function WrappedNonDisponibile({ motivo, onClose }: { motivo: 'stagione' | 'dati'; onClose: () => void }) {
  return (
    <Cornice onClose={onClose} tono="sand">
      <div className="wrapped-top">
        <div className="wrapped-head">
          <h1 className="wrapped-brand">Beach Wrapped</h1>
          <Chiudi onClose={onClose} />
        </div>
      </div>
      <div className="wrapped-empty">
        <Pallo umore={motivo === 'stagione' ? 'saluta' : 'sbircia'} size={104} ombra={false} />
        <h2 className="wrapped-empty-t">Beach Wrapped in arrivo</h2>
        <p className="wrapped-empty-p">
          {motivo === 'stagione'
            ? 'Beach Wrapped arriva a ottobre: torna a trovarci allora.'
            : 'Servono almeno qualche partita in questo periodo per generare il tuo recap di stagione. Aggiungi tornei e partite e torna a trovarci.'}
        </p>
        <Button size="lg" onClick={onClose}>
          Ho capito
        </Button>
      </div>
    </Cornice>
  )
}

/**
 * La slide a schermo: lo stesso contenuto della tela, coi token. La foto è
 * intera, con la sua proporzione (mai ritagliata): finché il data URL non è
 * pronto si mostra l'indirizzo originale, che il browser misura da sé.
 */
function Slide({ slide, mani, foto }: { slide: WrappedSlide; mani: string; foto: Pick<FotoTela, 'src'> & Partial<Pick<FotoTela, 'w' | 'h'>> | null }) {
  const stretta = !!foto?.w && !!foto.h && fotoStretta({ w: foto.w, h: foto.h })
  return (
    <>
      {foto ? (
        <div className="wrapped-cover">
          <img className="wrapped-photo" src={foto.src} alt="" width={foto.w} height={foto.h} />
          {stretta && <Pallo umore={umoreSlide(slide.kind)} size={88} mani={mani} ombra={false} className="wrapped-pallo" />}
        </div>
      ) : (
        <Pallo umore={umoreSlide(slide.kind)} size={slide.stats.length > 4 ? 80 : 104} mani={mani} ombra={false} className="wrapped-pallo" />
      )}
      <p className="wrapped-eyebrow">{slide.eyebrow}</p>
      <p className="wrapped-big" data-taglia={tagliaTitolo(slide.headline)}>
        {slide.headline.trim()}
      </p>
      {slide.title && <p className="wrapped-title">{slide.title}</p>}
      {slide.caption && <p className="wrapped-caption">{slide.caption}</p>}
      {slide.stats.length > 0 && (
        <dl className="wrapped-stats" data-cols={slide.stats.length === 1 ? 1 : slide.stats.length >= 5 ? 3 : 2}>
          {slide.stats.map((st, i) => (
            <div key={i} className="wrapped-stat">
              <dt className="wrapped-stat-l">{st.label}</dt>
              <dd className="wrapped-stat-v">{st.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  )
}

export default function WrappedModal({ wrapped, onClose, onNotice }: WrappedModalProps) {
  const slides = wrapped.slides
  const n = slides.length
  const [idx, setIdx] = useState(0)
  // Un PNG in preparazione per «Condividi»: pausa e «Preparo…».
  const [busy, setBusy] = useState(false)
  // «Scarica tutte» in corso: a che slide è arrivato.
  const [scaricando, setScaricando] = useState<{ i: number; n: number } | null>(null)
  const [autoplay, setAutoplay] = useState(true)
  // Dito premuto sulla slide: è la pausa, lo stesso gesto delle storie. Un
  // contenuto che scorre da solo deve poter essere fermato da chi lo guarda.
  const [held, setHeld] = useState(false)
  const [photos, setPhotos] = useState<Record<string, FotoTela>>({})
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
  const [canCopyImage] = useState(() => typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function')
  const canShare = canShareFiles || canCopyImage
  const captureRefs = useRef<(HTMLDivElement | null)[]>([])
  const downX = useRef<number | null>(null)

  // Se l'intervallo cambia (nuove slide), riparte dall'inizio.
  const rangeKey = wrapped.range.from + '|' + wrapped.range.to + '|' + wrapped.partnerName
  useEffect(() => {
    setIdx(0)
  }, [rangeKey])

  // Foto delle slide (intro/podio): scaricate e inlinate come data-URL, così
  // html-to-image le incorpora nel PNG senza canvas "tainted", con le misure
  // naturali che decidono quanto sono grandi (intere, mai ritagliate).
  const photoUrls = Array.from(new Set(slides.map((s) => s.photoUrl).filter((u): u is string => !!u)))
  const photoKey = photoUrls.join('|')
  useEffect(() => {
    let alive = true
    if (!photoUrls.length) {
      setPhotos({})
      return
    }
    void Promise.all(photoUrls.map((u) => caricaFoto(u, '[wrapped]'))).then((foto) => {
      if (!alive) return
      const map: Record<string, FotoTela> = {}
      foto.forEach((f, i) => {
        if (f) map[photoUrls[i]] = f
      })
      setPhotos(map)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  const photoFor = (url?: string | null): FotoTela | null => (url ? photos[url] ?? null : null)

  // Auto-avanzamento: il timer è l'unica fonte di verità (la barra è solo la
  // sua immagine). Si ferma sull'ultima slide, in pausa, durante gli export e
  // con reduced-motion.
  const occupato = busy || !!scaricando
  useEffect(() => {
    if (!autoplay || held || occupato || reduceMotion || idx >= n - 1) return
    const t = setTimeout(() => setIdx((i) => Math.min(n - 1, i + 1)), SLIDE_MS)
    return () => clearTimeout(t)
  }, [autoplay, held, occupato, reduceMotion, idx, n])

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
  // Il dito che esce dalla slide senza rilasciare lascerebbe il mazzo fermo
  // per sempre: qualunque uscita dal gesto rimette in moto.
  const onPointerCancel = () => {
    downX.current = null
    setHeld(false)
  }

  // ------------------------------------------------------------- export
  const renderBlob = async (i: number): Promise<Blob> => {
    const node = captureRefs.current[i]
    if (!node) throw new Error('tela non montata')
    // Geist prima della foto: senza, il PNG esce in Arial. Dentro il tetto
    // di 3s (UX §6.5): oltre, si genera con quel che c'è.
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

  // Che cosa condivide «Condividi»: la slide che si guarda; sull'ultima (il
  // saluto, «Grazie») il RIEPILOGO, che porta tutta la stagione.
  const recapIdx = slides.findIndex((s) => s.kind === 'recap')
  const shareIdx = slides[idx]?.kind === 'outro' && recapIdx >= 0 ? recapIdx : idx

  // Un PNG per slide, preparato una volta sola: la promessa in corso e il Blob
  // pronto. Un errore non resta in cache (il tocco dopo riprova).
  const fotoKey = Object.keys(photos).length
  const chiave = (i: number) => `${rangeKey}|${i}|${fotoKey}`
  const inCorso = useRef(new Map<string, Promise<Blob>>())
  const pronti = useRef(new Map<string, Blob>())
  // Le due mappe sono ref (servono subito, dentro il gesto): questo numero
  // ridisegna i pulsanti quando una preparazione parte, finisce o fallisce.
  const [, setVersione] = useState(0)

  const prepare = (i: number): Promise<Blob> => {
    const key = chiave(i)
    const gia = inCorso.current.get(key)
    if (gia) return gia
    const promise = Promise.race([
      renderBlob(i),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout generazione')), TETTO_MS)),
    ])
    inCorso.current.set(key, promise)
    setVersione((v) => v + 1)
    promise.then(
      (blob) => {
        pronti.current.set(key, blob)
        setVersione((v) => v + 1)
      },
      () => {
        if (inCorso.current.get(key) === promise) inCorso.current.delete(key)
        setVersione((v) => v + 1)
      },
    )
    return promise
  }

  // L'immagine da condividere si prepara PRIMA del tocco appena si arriva
  // all'ultima slide: iOS concede `navigator.share` solo a ridosso del gesto, e
  // generare il PNG dopo il tocco (secondi, su un telefono) fa scadere il
  // permesso. Sulle altre slide si genera al tocco (e se il permesso scade, lo
  // si dice: il secondo tocco trova l'immagine pronta).
  const atEnd = idx === n - 1
  useEffect(() => {
    if (!atEnd || !wrapped.hasEnoughData) return
    // In sottofondo: un fallimento qui non si mostra, lo dirà il tocco.
    prepare(shareIdx).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atEnd, shareIdx, rangeKey, fotoKey, wrapped.hasEnoughData])

  const shareReady = pronti.current.has(chiave(shareIdx))
  const shareInPreparazione = inCorso.current.has(chiave(shareIdx)) && !shareReady

  /** Il Blob pronto, oppure lo genera adesso; `busy` copre l'attesa visibile. */
  const getBlob = async (i: number): Promise<Blob> => {
    const pronto = pronti.current.get(chiave(i))
    if (pronto) return pronto
    setBusy(true)
    try {
      return await prepare(i)
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
  const salvaFile = (blob: Blob, nome: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const scaricaTutte = async () => {
    if (occupato) return
    try {
      for (let i = 0; i < n; i++) {
        setScaricando({ i: i + 1, n })
        const blob = pronti.current.get(chiave(i)) ?? (await prepare(i))
        salvaFile(blob, fileName(i))
        if (i < n - 1) await new Promise((r) => setTimeout(r, PASSO_DOWNLOAD_MS))
      }
      track('wrapped_scaricato')
    } catch (e) {
      failed(e)
    } finally {
      setScaricando(null)
    }
  }

  const share = async () => {
    if (occupato) return
    const i = shareIdx
    let blob: Blob
    try {
      blob = await getBlob(i)
    } catch (e) {
      failed(e)
      return
    }
    const file = new File([blob], fileName(i), { type: 'image/png' })
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

  const pal = wrappedPalette(idx)
  const slide = slides[idx]
  const anno = annoDi(wrapped.range.label)

  return (
    <Cornice onClose={onClose} tono={pal.key}>
      <div className="wrapped-top">
        {/* Le barre: un riempimento per la durata della slide. Dicono il
            tempo; il numero della slide lo dice il gruppo qui sotto. */}
        <div className="wrapped-progress" aria-hidden="true">
          {slides.map((_, i) => {
            const animating = i === idx && autoplay && !occupato && !reduceMotion
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
        <div className="wrapped-head">
          <h1 className="wrapped-brand">Beach Wrapped · {anno}</h1>
          <Chiudi onClose={onClose} />
        </div>
      </div>

      {/* La slide: tutta l'area in mezzo è il tocco. */}
      <div
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
      >
        <div key={idx} className="wrapped-slide">
          <Slide slide={slide} mani={pal.mani} foto={photoFor(slide.photoUrl) ?? (slide.photoUrl ? { src: slide.photoUrl } : null)} />
        </div>
      </div>

      <div className="wrapped-actions" data-solo={canShare ? undefined : ''}>
        <Button
          variant="glass"
          size="lg"
          className="wrapped-action"
          busy={!!scaricando}
          busyLabel={scaricando ? `Preparo ${scaricando.i}/${scaricando.n}…` : undefined}
          disabled={busy}
          onClick={() => void scaricaTutte()}
        >
          Scarica tutte
        </Button>
        {canShare && (
          <Button
            variant="glass"
            size="lg"
            className="wrapped-action wrapped-share"
            busy={busy || shareInPreparazione}
            busyLabel="Preparo…"
            disabled={!!scaricando}
            onClick={() => void share()}
          >
            Condividi
          </Button>
        )}
      </div>

      {/* Il livello nascosto a piena risoluzione: una tela per slide,
          sorgente degli export (mai scalata, quindi immagine pixel-perfect). */}
      <div aria-hidden="true" className="wrapped-capture">
        {slides.map((sl, i) => (
          <div
            key={i}
            ref={(el) => {
              captureRefs.current[i] = el
            }}
            className="wrapped-capture-card"
          >
            <WrappedSlideCard slide={sl} pal={wrappedPalette(i)} index={i} total={n} label={wrapped.range.label} foto={photoFor(sl.photoUrl)} />
          </div>
        ))}
      </div>
    </Cornice>
  )
}
