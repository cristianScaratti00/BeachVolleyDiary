import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export interface Shot {
  url: string
  caption?: string
}

interface PhotoLightboxProps {
  photos: Shot[]
  startIndex: number
  nameBase: string // base del nome file per il download (es. slug del torneo)
  onClose: () => void
}

// Ricava l'estensione dal path della URL firmata, con fallback dal MIME.
function extOf(url: string, mime: string): string {
  const path = url.split('?')[0]
  const m = path.match(/\.([a-zA-Z0-9]{3,4})$/)
  if (m) return m[1].toLowerCase()
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'jpg'
}

// Visualizzatore foto a schermo intero (lightbox): mostra la foto per intera
// (object-fit: contain), con navigazione prev/next e download. Chiude con click
// sullo sfondo, tasto Esc o ✕. Le frecce usano ← → da tastiera.
export default function PhotoLightbox({ photos, startIndex, nameBase, onClose }: PhotoLightboxProps) {
  const [i, setI] = useState(startIndex)
  const [busy, setBusy] = useState(false)
  const shot = photos[i]
  const many = photos.length > 1

  const prev = () => setI((v) => (v - 1 + photos.length) % photos.length)
  const next = () => setI((v) => (v + 1) % photos.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, photos.length])

  // Blocca lo scroll della pagina di sfondo mentre il lightbox è aperto.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  const download = async () => {
    if (busy || !shot) return
    setBusy(true)
    try {
      const res = await fetch(shot.url, { mode: 'cors' })
      if (!res.ok) throw new Error('http ' + res.status)
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `${nameBase}-${i + 1}.${extOf(shot.url, blob.type)}`
      a.click()
      URL.revokeObjectURL(objUrl)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[foto] download', e)
      window.open(shot.url, '_blank') // fallback: apri in una nuova scheda
    } finally {
      setBusy(false)
    }
  }

  if (!shot) return null

  const arrow = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    left: side === 'left' ? 'max(12px, 2vw)' : undefined,
    right: side === 'right' ? 'max(12px, 2vw)' : undefined,
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: 'rgba(255,255,255,.14)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
  })

  // Portal su document.body: evita che una `transform`/`animation` su un
  // antenato (es. la schermata TorneoDetail) renda il `position: fixed`
  // relativo a quell'antenato, causando un overlay alto quanto la pagina.
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,18,33,.92)',
        backdropFilter: 'blur(6px)',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        animation: 'overlay .2s ease',
      }}
    >
      {/* chiudi (in alto a destra) */}
      <div
        className="chip"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        title="Chiudi"
        style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </div>

      {/* immagine intera */}
      <img
        onClick={(e) => e.stopPropagation()}
        src={shot.url}
        alt={shot.caption || ''}
        style={{ maxWidth: 'min(94vw, 1100px)', maxHeight: '80vh', objectFit: 'contain', borderRadius: 14, boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)', animation: 'sheet .3s cubic-bezier(.2,.8,.2,1) both' }}
      />

      {/* controlli */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '94vw' }}>
        {shot.caption && (
          <span style={{ font: "700 13px 'Nunito Sans'", color: 'rgba(255,255,255,.82)' }}>{shot.caption}</span>
        )}
        {many && (
          <span className="num" style={{ font: "700 13px 'Nunito Sans'", color: 'rgba(255,255,255,.55)' }}>{i + 1} / {photos.length}</span>
        )}
        <div
          className="chip"
          onClick={download}
          style={{ display: 'flex', alignItems: 'center', gap: 8, font: "700 13.5px 'Nunito Sans'", padding: '11px 20px', borderRadius: 11, background: '#FF6B35', color: '#fff', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
          {busy ? 'Download…' : 'Scarica'}
        </div>
      </div>

      {/* frecce prev/next */}
      {many && (
        <>
          <div className="chip" onClick={(e) => { e.stopPropagation(); prev() }} title="Precedente" style={arrow('left')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </div>
          <div className="chip" onClick={(e) => { e.stopPropagation(); next() }} title="Successiva" style={arrow('right')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
