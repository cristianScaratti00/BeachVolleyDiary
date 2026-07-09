import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { toPng } from 'html-to-image'
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

const igKey = (partner: string) => 'bvd_ig_' + partner.toLowerCase()
const cleanHandle = (v: string) => v.replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '')

// Modale della storia Instagram: anteprima scalata della card 1080×1920, con foto
// di copertina (o visual con emoji), tag IG del compagno, e generazione PNG.
export default function StoryModal({ story, onClose, onNotice }: StoryModalProps) {
  const [variant, setVariant] = useState<PaletteKey>('navy')
  const [busy, setBusy] = useState(false)
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900))
  const [cover, setCover] = useState<string | null>(null)
  const [handle, setHandle] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const pal = PALETTES[variant]

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Tag IG memorizzato per compagno (ricompare la volta dopo).
  useEffect(() => {
    try { setHandle(localStorage.getItem(igKey(story.partner)) || '') } catch { /* ignore */ }
  }, [story.partner])
  const onHandle = (e: ChangeEvent<HTMLInputElement>) => {
    const h = cleanHandle(e.target.value)
    setHandle(h)
    try { localStorage.setItem(igKey(story.partner), h) } catch { /* ignore */ }
  }

  // Copertina: scarica la foto firmata e la inline come data URL (così html-to-image
  // la incorpora nel PNG senza problemi di canvas "tainted").
  useEffect(() => {
    let alive = true
    setCover(null)
    if (!story.coverUrl) return
    fetch(story.coverUrl, { mode: 'cors' })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http ' + r.status))))
      .then((blob) => new Promise<string>((res, rej) => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result as string)
        fr.onerror = rej
        fr.readAsDataURL(blob)
      }))
      .then((durl) => { if (alive) setCover(durl) })
      .catch((e) => { /* fallback al visual con emoji */ console.warn('[story] cover', e) })
    return () => { alive = false }
  }, [story.coverUrl])

  const scale = Math.max(0.26, Math.min(0.5, (vh - 300) / 1920))
  const boxW = Math.round(1080 * scale)
  const boxH = Math.round(1920 * scale)
  const partnerLabel = handle ? '@' + handle : story.partner

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

            <div style={{ font: "700 38px 'Nunito Sans'", color: pal.fg }}>in coppia con <span style={{ color: pal.accent }}>{partnerLabel}</span></div>
          </div>

          {/* media: foto di copertina, oppure visual con emoji */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
            <div style={{ width: '100%', height: 360, borderRadius: 30, overflow: 'hidden', position: 'relative', background: pal.accent }}>
              {cover ? (
                <>
                  <img src={cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.02) 40%, rgba(0,0,0,.42))' }} />
                  <div style={{ position: 'absolute', left: 34, bottom: 30, font: "800 26px 'Nunito Sans'", letterSpacing: 3, color: '#fff', textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>{story.year} · {story.name}</div>
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(140deg, rgba(255,255,255,.16), rgba(0,0,0,.34))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.09) 0 26px, transparent 26px 52px)' }} />
                  <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', border: '3px solid rgba(255,255,255,.22)', top: -80, right: -50 }} />
                  <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.12)', bottom: -34, left: 70 }} />
                  <div style={{ position: 'relative', fontSize: 190, lineHeight: 1 }}>{story.emoji}</div>
                </div>
              )}
            </div>
            <div style={{ font: "700 28px 'Nunito Sans'", letterSpacing: 4, color: pal.muted }}>IL MIO DIARIO · BEACH VOLLEY</div>
          </div>
        </div>
      </div>

      {/* controlli */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '4px 6px 4px 14px' }}>
          <span style={{ font: "800 15px 'Nunito Sans'", color: 'rgba(255,255,255,.6)' }}>@</span>
          <input value={handle} onChange={onHandle} placeholder="tag Instagram del compagno" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', font: "700 14px 'Nunito Sans'", padding: '9px 0' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.12)', padding: 4, borderRadius: 12 }}>
            {VARIANTS.map((v) => {
              const active = variant === v.k
              return (
                <div key={v.k} className="chip" onClick={() => setVariant(v.k)} style={{ font: "700 13px 'Nunito Sans'", padding: '9px 16px', borderRadius: 9, cursor: 'pointer', background: active ? '#fff' : 'transparent', color: active ? '#1B2A4A' : 'rgba(255,255,255,.7)' }}>{v.label}</div>
              )
            })}
          </div>
          <div className="chip" onClick={download} style={{ display: 'flex', alignItems: 'center', gap: 8, font: "700 14px 'Nunito Sans'", padding: '11px 22px', borderRadius: 11, background: '#FF6B35', color: '#fff', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Generazione…' : '↓ Scarica immagine'}</div>
          <div className="chip" onClick={onClose} style={{ font: "700 14px 'Nunito Sans'", padding: '11px 18px', borderRadius: 11, background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer' }}>Chiudi</div>
        </div>
      </div>
    </div>
  )
}
