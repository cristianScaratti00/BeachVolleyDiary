import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { toPng, toBlob } from 'html-to-image'
import { track } from '@vercel/analytics'
import type { WrappedData } from '../../lib/derive'
import { wrappedPalette } from './palette'
import WrappedSlideCard from './WrappedSlideCard'

// ============================================================================
// Beach Wrapped — visore a schermo intero, sfogliabile stile storia Instagram.
// Riusa la pipeline di StoryModal (card fissa 1080×1920 → toPng/toBlob dopo
// document.fonts.ready, foto CORS inlinate come data-URL) e aggiunge:
//  · barre di avanzamento IG + navigazione tap/swipe/tastiera + auto-avanzamento
//  · export per singola card, "scarica tutte" e Web Share nativo (con fallback)
//  · intervallo di stagione configurabile (input date → onRangeChange)
// Il nodo catturato NON è quello scalato dell'anteprima: c'è un layer nascosto a
// piena risoluzione (una card per slide) così l'immagine esce sempre pixel-perfect.
// ============================================================================

const SLIDE_MS = 5200 // durata dell'auto-avanzamento per slide
const pad2 = (n: number) => String(n).padStart(2, '0')

interface WrappedModalProps {
  wrapped: WrappedData
  onClose: () => void
  onNotice?: (msg: string) => void
  onRangeChange?: (from: string, to: string) => void
}

export default function WrappedModal({ wrapped, onClose, onNotice, onRangeChange }: WrappedModalProps) {
  const slides = wrapped.slides
  const n = slides.length
  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900))
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [reduceMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [shareSupported] = useState(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  const captureRefs = useRef<(HTMLDivElement | null)[]>([])
  const downX = useRef<number | null>(null)

  // Se l'intervallo cambia (nuovi slide), riparte dall'inizio.
  const rangeKey = wrapped.range.from + '|' + wrapped.range.to + '|' + wrapped.partnerName
  useEffect(() => { setIdx(0) }, [rangeKey])

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Escape chiude (come il click sul backdrop).
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Foto delle slide (intro/podio): scaricate e inlinate come data-URL, così
  // html-to-image le incorpora nel PNG senza canvas "tainted" (come StoryModal).
  const photoUrls = Array.from(new Set(slides.map((s) => s.photoUrl).filter((u): u is string => !!u)))
  const photoKey = photoUrls.join('|')
  useEffect(() => {
    let alive = true
    if (!photoUrls.length) { setPhotos({}); return }
    const toDataUrl = (u: string) =>
      fetch(u, { mode: 'cors' })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http ' + r.status))))
        .then((blob) => new Promise<[string, string]>((resolve, reject) => {
          const fr = new FileReader()
          fr.onload = () => resolve([u, fr.result as string])
          fr.onerror = reject
          fr.readAsDataURL(blob)
        }))
        .catch((e) => { console.warn('[wrapped] foto', e); return null })
    Promise.all(photoUrls.map(toDataUrl)).then((pairs) => {
      if (!alive) return
      const map: Record<string, string> = {}
      pairs.forEach((p) => { if (p) map[p[0]] = p[1] })
      setPhotos(map)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  const photoFor = (url?: string | null): string | null => (url ? photos[url] ?? null : null)

  // Auto-avanzamento: timer come unica fonte di verità (la barra CSS è solo
  // decorativa). Si ferma su ultima slide, in pausa, durante l'export o con
  // "riduci animazioni" attivo.
  useEffect(() => {
    if (!autoplay || busy || reduceMotion || idx >= n - 1) return
    const t = setTimeout(() => setIdx((i) => Math.min(n - 1, i + 1)), SLIDE_MS)
    return () => clearTimeout(t)
  }, [autoplay, busy, reduceMotion, idx, n])

  const go = (i: number) => setIdx(Math.max(0, Math.min(n - 1, i)))
  const next = () => go(idx + 1)
  const prev = () => go(idx - 1)

  // Un solo handler pointer copre mouse/touch/pen: swipe se lo spostamento è
  // ampio, altrimenti tap (terzo sinistro = indietro, resto = avanti).
  const onPointerDown = (e: ReactPointerEvent) => { downX.current = e.clientX }
  const onPointerUp = (e: ReactPointerEvent) => {
    const sx = downX.current
    downX.current = null
    if (sx == null) return
    const dx = e.clientX - sx
    if (Math.abs(dx) > 60) { if (dx < 0) next(); else prev(); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientX - rect.left < rect.width * 0.32) prev(); else next()
  }

  const scale = Math.max(0.22, Math.min(0.46, (vh - 340) / 1920))
  const boxW = Math.round(1080 * scale)
  const boxH = Math.round(1920 * scale)

  const capturePng = async (i: number): Promise<string | null> => {
    const node = captureRefs.current[i]
    if (!node) return null
    if (document.fonts?.ready) await document.fonts.ready
    // pixelRatio 2 → PNG 2160×3840: nitido su schermi retina e dopo l'upload IG.
    return toPng(node, { pixelRatio: 2, cacheBust: true, width: 1080, height: 1920 })
  }

  const fileName = (i: number) => `${wrapped.slug}-${pad2(i + 1)}.png`

  const downloadCurrent = async () => {
    if (busy) return
    setBusy(true)
    try {
      const url = await capturePng(idx)
      if (!url) throw new Error('nodo assente')
      const a = document.createElement('a')
      a.href = url
      a.download = fileName(idx)
      a.click()
      track('wrapped_scaricato')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[wrapped] toPng', e)
      onNotice?.('Impossibile generare l’immagine. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  const downloadAll = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      for (let i = 0; i < n; i++) {
        const node = captureRefs.current[i]
        if (!node) continue
        const url = await toPng(node, { pixelRatio: 2, cacheBust: true, width: 1080, height: 1920 })
        const a = document.createElement('a')
        a.href = url
        a.download = fileName(i)
        a.click()
        // I browser bloccano download multipli troppo ravvicinati: piccola pausa.
        await new Promise((r) => setTimeout(r, 200))
      }
      track('wrapped_scaricato')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[wrapped] toPng all', e)
      onNotice?.('Impossibile generare le immagini. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  const shareCurrent = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      const node = captureRefs.current[idx]
      const blob = node ? await toBlob(node, { pixelRatio: 2, cacheBust: true, width: 1080, height: 1920 }) : null
      if (!blob) throw new Error('blob assente')
      const file = new File([blob], fileName(idx), { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Beach Wrapped', text: `Il mio Beach Wrapped · ${wrapped.range.label}` })
        track('wrapped_condiviso')
      } else {
        // Niente condivisione di file: ripiego sul download.
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        track('wrapped_scaricato')
      }
    } catch (e) {
      // L'utente che annulla il foglio di condivisione non è un errore.
      if ((e as { name?: string })?.name !== 'AbortError') {
        // eslint-disable-next-line no-console
        console.error('[wrapped] share', e)
        onNotice?.('Condivisione non riuscita.')
      }
    } finally {
      setBusy(false)
    }
  }

  // ---- empty state: pochi dati, il recap non ha senso ----
  if (!wrapped.hasEnoughData) {
    return (
      <div onClick={onClose} style={overlayStyle}>
        <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 420, width: '100%', padding: 32, textAlign: 'center', background: '#16233F', border: '1px solid rgba(255,255,255,.14)', borderRadius: 22 }}>
          <div style={{ fontSize: 64, lineHeight: 1 }}>🏖️</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 500, color: '#fff', marginTop: 16 }}>Beach Wrapped in arrivo</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: 'rgba(255,255,255,.7)', marginTop: 10, lineHeight: 1.45 }}>
            Servono almeno qualche partita in questo periodo per generare il tuo recap di stagione. Aggiungi tornei e partite e torna a trovarci!
          </div>
          <div className="chip" onClick={onClose} style={{ display: 'inline-block', marginTop: 22, font: "700 14px 'Nunito Sans'", padding: '11px 22px', borderRadius: 11, background: '#FF6B35', color: '#fff', cursor: 'pointer' }}>Ho capito</div>
        </div>
      </div>
    )
  }

  const inputStyle: CSSProperties = {
    background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 9,
    color: '#fff', font: "700 12px 'Nunito Sans'", padding: '7px 9px', colorScheme: 'dark', cursor: 'pointer',
  }
  const chip = (bg: string, color = '#fff'): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7, font: "700 13.5px 'Nunito Sans'",
    padding: '10px 18px', borderRadius: 11, background: bg, color, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
  })

  return (
    <div onClick={onClose} style={overlayStyle}>
      {/* barre di avanzamento (fuori dalla card per contrasto costante) */}
      <div onClick={(e) => e.stopPropagation()} style={{ width: boxW, display: 'flex', gap: 6 }}>
        {slides.map((_, i) => {
          const animating = i === idx && autoplay && !busy && !reduceMotion
          const filled = i < idx || (i === idx && !animating)
          return (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.28)', overflow: 'hidden' }}>
              <div
                key={i === idx ? 'active-' + idx : 'seg-' + i}
                style={{
                  height: '100%', background: '#fff', transformOrigin: 'left center',
                  transform: filled ? 'scaleX(1)' : 'scaleX(0)',
                  ...(animating ? { animation: `wrappedbar ${SLIDE_MS}ms linear both` } : {}),
                }}
              />
            </div>
          )
        })}
      </div>

      {/* anteprima scalata sfogliabile */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); next() }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
          else if (e.key === ' ') { e.preventDefault(); setAutoplay((a) => !a) }
        }}
        tabIndex={0}
        role="group"
        aria-label={`Beach Wrapped, slide ${idx + 1} di ${n}`}
        style={{ width: boxW, height: boxH, position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)', cursor: 'pointer', touchAction: 'pan-y', outline: 'none', userSelect: 'none' }}
      >
        {/* Due layer separati: quello ESTERNO fa l'animazione d'entrata
            (fade+slide), quello INTERNO tiene lo scale d'anteprima. Sono divisi
            perché `wrappedin` termina con `transform: none` e, se fosse sullo
            stesso nodo dello scale, con fill-mode `both` sovrascriverebbe lo
            `scale(${scale})` facendo esplodere la card a piena risoluzione. */}
        <div
          key={idx}
          className="wrapped-card-anim"
          style={{ position: 'absolute', top: 0, left: 0, width: boxW, height: boxH, animation: reduceMotion ? undefined : 'wrappedin .4s cubic-bezier(.2,.8,.2,1) both' }}
        >
          <div style={{ width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <WrappedSlideCard slide={slides[idx]} pal={wrappedPalette(idx)} index={idx} total={n} photoSrc={photoFor(slides[idx].photoUrl)} />
          </div>
        </div>
      </div>

      {/* controlli */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 520 }}>
        {/* riga nav: indietro · contatore · avanti · play/pausa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="chip" onClick={prev} disabled={idx === 0} aria-label="Slide precedente" style={{ ...chip('rgba(255,255,255,.14)'), padding: '10px 16px', border: 'none', opacity: idx === 0 ? 0.4 : 1 }}>‹</button>
          <span className="num" style={{ color: 'rgba(255,255,255,.85)', fontSize: 14, minWidth: 70, textAlign: 'center' }}>{pad2(idx + 1)} / {pad2(n)}</span>
          <button type="button" className="chip" onClick={next} disabled={idx === n - 1} aria-label="Slide successiva" style={{ ...chip('rgba(255,255,255,.14)'), padding: '10px 16px', border: 'none', opacity: idx === n - 1 ? 0.4 : 1 }}>›</button>
          <button type="button" className="chip" onClick={() => setAutoplay((a) => !a)} aria-pressed={autoplay} aria-label={autoplay ? 'Metti in pausa' : 'Riproduci'} style={{ ...chip('rgba(255,255,255,.14)'), padding: '10px 16px', border: 'none' }}>{autoplay ? '❚❚' : '▶'}</button>
        </div>

        {/* riga azioni: condividi · scarica · scarica tutte · chiudi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {shareSupported && (
            <button type="button" className="chip" onClick={shareCurrent} style={{ ...chip('#FF6B35'), border: 'none' }}>↗ Condividi</button>
          )}
          <button type="button" className="chip" onClick={downloadCurrent} style={{ ...chip(shareSupported ? 'rgba(255,255,255,.16)' : '#FF6B35'), border: 'none' }}>{busy ? 'Genero…' : '↓ Scarica'}</button>
          <button type="button" className="chip" onClick={downloadAll} style={{ ...chip('rgba(255,255,255,.14)'), border: 'none' }}>↓ Tutte</button>
          <button type="button" className="chip" onClick={onClose} style={{ ...chip('rgba(255,255,255,.14)'), border: 'none', opacity: 1, cursor: 'pointer' }}>Chiudi</button>
        </div>

        {/* intervallo stagione configurabile */}
        {onRangeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ font: "700 12px 'Nunito Sans'", color: 'rgba(255,255,255,.55)' }}>Periodo</span>
            <input type="date" value={wrapped.range.from} max={wrapped.range.to} onChange={(e) => e.target.value && onRangeChange(e.target.value, wrapped.range.to)} aria-label="Data inizio" style={inputStyle} />
            <span style={{ color: 'rgba(255,255,255,.45)' }}>→</span>
            <input type="date" value={wrapped.range.to} min={wrapped.range.from} onChange={(e) => e.target.value && onRangeChange(wrapped.range.from, e.target.value)} aria-label="Data fine" style={inputStyle} />
          </div>
        )}
      </div>

      {/* layer nascosto a piena risoluzione: una card per slide, sorgente degli
          export (mai scalata, quindi immagine pixel-perfect a 1080×1920) */}
      <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, width: 1080, height: 1920, pointerEvents: 'none' }}>
        {slides.map((sl, i) => (
          <div key={i} ref={(el) => { captureRefs.current[i] = el }} style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920 }}>
            <WrappedSlideCard slide={sl} pal={wrappedPalette(i)} index={i} total={n} photoSrc={photoFor(sl.photoUrl)} />
          </div>
        ))}
      </div>
    </div>
  )
}

const overlayStyle: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(11,18,33,.82)', backdropFilter: 'blur(6px)', zIndex: 70,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20,
  animation: 'overlay .2s ease',
}
