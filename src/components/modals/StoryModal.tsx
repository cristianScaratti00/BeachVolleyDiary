import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { track } from '@vercel/analytics'
import type { StoryData } from '../../lib/derive'

type PaletteKey = 'navy' | 'sand' | 'orange'
interface Palette { bg: string; fg: string; accent: string; muted: string; line: string }

const PALETTES: Record<PaletteKey, Palette> = {
  sand: { bg: '#FAF8F5', fg: '#1B2A4A', accent: '#FF6B35', muted: 'rgba(27,42,74,.5)', line: 'rgba(27,42,74,.12)' },
  orange: { bg: '#FF6B35', fg: '#FFFFFF', accent: '#16233F', muted: 'rgba(255,255,255,.75)', line: 'rgba(255,255,255,.32)' },
  navy: { bg: '#16233F', fg: '#FAF8F5', accent: '#FF6B35', muted: 'rgba(250,248,245,.55)', line: 'rgba(250,248,245,.16)' },
}
const VARIANTS: { k: PaletteKey; label: string }[] = [
  { k: 'navy', label: 'Navy' },
  { k: 'sand', label: 'Sabbia' },
  { k: 'orange', label: 'Arancio' },
]

interface StoryModalProps {
  story: StoryData
  onClose: () => void
  onNotice?: (msg: string) => void
}

function StatCell({ val, label, pal, valColor }: { val: string; label: string; pal: Palette; valColor?: string }) {
  return (
    <div style={{ background: pal.bg, padding: '52px 56px' }}>
      <div className="num" style={{ fontSize: 96, lineHeight: 1, color: valColor || pal.fg }}>{val}</div>
      <div style={{ font: "700 26px 'Nunito Sans'", letterSpacing: 2.5, color: pal.muted, marginTop: 16 }}>{label}</div>
    </div>
  )
}

// Modale della storia Instagram: anteprima scalata della card 1080×1920, con
// foto di copertina e generazione PNG.
//
// Il campo per il tag Instagram del compagno è stato rimosso: chiedeva un dato
// che l'app non ha (e che andava ricordato a mano, per compagno, in
// localStorage) per scrivere una @ dentro un'immagine, dove comunque non è
// cliccabile. Il nome del compagno basta, e chi vuole taggarlo lo fa da
// Instagram al momento della pubblicazione.
export default function StoryModal({ story, onClose, onNotice }: StoryModalProps) {
  const [variant, setVariant] = useState<PaletteKey>('navy')
  const [busy, setBusy] = useState(false)
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900))
  const [covers, setCovers] = useState<string[]>([])
  const cardRef = useRef<HTMLDivElement>(null)
  const pal = PALETTES[variant]

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Foto (fino a 3): scarica le foto firmate e le inline come data URL (così
  // html-to-image le incorpora nel PNG senza problemi di canvas "tainted").
  const photoKey = story.photoUrls.join('|')
  useEffect(() => {
    let alive = true
    setCovers([])
    const urls = story.photoUrls
    if (!urls.length) return
    const toDataUrl = (u: string) =>
      fetch(u, { mode: 'cors' })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http ' + r.status))))
        .then((blob) => new Promise<string>((res, rej) => {
          const fr = new FileReader()
          fr.onload = () => res(fr.result as string)
          fr.onerror = rej
          fr.readAsDataURL(blob)
        }))
        .catch((e) => { console.warn('[story] foto', e); return null })
    Promise.all(urls.map(toDataUrl)).then((arr) => {
      if (alive) setCovers(arr.filter((x): x is string => !!x))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  // Il margine è sceso da 300 a 260: sotto la card è rimasta una riga sola
  // (scarica + chiudi), la palette è passata sopra e il campo del tag non c'è più.
  const scale = Math.max(0.26, Math.min(0.5, (vh - 260) / 1920))
  const boxW = Math.round(1080 * scale)
  const boxH = Math.round(1920 * scale)

  const download = async () => {
    const node = cardRef.current
    if (!node || busy) return
    setBusy(true)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      const url = await toPng(node, { pixelRatio: 1, cacheBust: true, width: 1080, height: 1920, style: { transform: 'none' } })
      const a = document.createElement('a')
      a.href = url
      a.download = `${story.slug}-story.png`
      a.click()
      track('storia_scaricata')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[story] toPng', e)
      onNotice?.('Impossibile generare l’immagine. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,33,.72)', backdropFilter: 'blur(6px)', zIndex: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 20, animation: 'overlay .2s ease' }}>
      {/* Palette sopra l'anteprima: è la scelta che si fa PRIMA di guardare il
          risultato, e stando in alto il pollice non copre la card mentre la si
          confronta. Sotto resta solo l'azione finale. */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="radiogroup"
        aria-label="Colore della storia"
        style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.12)', padding: 4, borderRadius: 12 }}
      >
        {VARIANTS.map((v) => {
          const active = variant === v.k
          return (
            <button
              key={v.k}
              type="button"
              role="radio"
              aria-checked={active}
              className="chip"
              onClick={() => setVariant(v.k)}
              style={{ font: "700 13px 'Nunito Sans'", padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? '#fff' : 'transparent', color: active ? '#1B2A4A' : 'rgba(255,255,255,.7)' }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      {/* anteprima scalata */}
      <div onClick={(e) => e.stopPropagation()} style={{ width: boxW, height: boxH, position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)', animation: 'sheet .3s cubic-bezier(.2,.8,.2,1) both' }}>
        {/* nodo full-res catturato (1080×1920), scalato solo per l'anteprima */}
        <div ref={cardRef} style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: 'top left', background: pal.bg, color: pal.fg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '96px 92px', fontFamily: "'Nunito Sans',sans-serif" }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: pal.accent }} />
              <div style={{ font: "600 34px 'Space Grotesk'", letterSpacing: 2 }}>BEACH DIARY</div>
            </div>
            <div className="num" style={{ fontSize: 34, color: pal.muted, letterSpacing: 1 }}>{story.year}</div>
          </div>

          {/* hero */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            <div>
              <div style={{ font: "700 32px 'Nunito Sans'", letterSpacing: 6, color: pal.accent }}>{story.resultLabel}</div>
              <div className="num" style={{ fontSize: 118, fontWeight: 500, lineHeight: 0.94, letterSpacing: -4, marginTop: 24 }}>{story.name}</div>
              <div style={{ font: "600 38px 'Nunito Sans'", color: pal.muted, marginTop: 26 }}>{story.meta}</div>
            </div>

            {/* griglia stat 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: pal.line, border: `1px solid ${pal.line}`, borderRadius: 28, overflow: 'hidden', marginTop: 4 }}>
              <StatCell val={story.winPct + '%'} label="VITTORIE" pal={pal} valColor={pal.accent} />
              <StatCell val={story.record} label="RECORD PARTITE" pal={pal} />
              <StatCell val={story.setStr} label="SET" pal={pal} />
              <StatCell val={story.diffStr} label="DIFFERENZIALE" pal={pal} valColor={story.diffPositive ? pal.accent : pal.muted} />
            </div>

            <div style={{ font: "700 38px 'Nunito Sans'", color: pal.fg }}>in coppia con <span style={{ color: pal.accent }}>{story.partner}</span></div>
          </div>

          {/* media: striscia di fino a 3 foto del torneo; senza foto non si
              mostra nulla (nessun segnaposto con emoji). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
            {covers.length > 0 && (
              <div style={{ display: 'flex', gap: 16 }}>
                {/* Il radius sta sull'<img>, non sul contenitore, e dietro non
                    c'è nessun colore: clippando con `overflow` su uno sfondo
                    accent l'antialiasing lasciava trapelare un filo arancione
                    lungo la curva, invisibile nell'anteprima scalata ma ben
                    visibile nel PNG a 1080px. */}
                {covers.map((src, i) => (
                  <div key={i} style={{ flex: 1, height: 320 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 26, display: 'block' }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ font: "700 28px 'Nunito Sans'", letterSpacing: 4, color: pal.muted }}>IL MIO DIARIO · BEACH VOLLEY</div>
          </div>
        </div>
      </div>

      {/* controlli: solo l'azione finale */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="chip" onClick={download} style={{ display: 'flex', alignItems: 'center', gap: 8, font: "700 14px 'Nunito Sans'", padding: '11px 22px', borderRadius: 11, border: 'none', background: '#FF6B35', color: '#fff', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Generazione…' : '↓ Scarica immagine'}</button>
        <button type="button" className="chip" onClick={onClose} style={{ font: "700 14px 'Nunito Sans'", padding: '11px 18px', borderRadius: 11, border: 'none', background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer' }}>Chiudi</button>
      </div>
    </div>
  )
}
