import type { GalleryItem } from '../lib/derive'

interface GalleriaProps {
  gallery: GalleryItem[]
  onNewFoto: () => void
}

export default function Galleria({ gallery, onNewFoto }: GalleriaProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, paddingBottom: 22, borderBottom: '1px solid rgba(27,42,74,.1)' }}>
        <div>
          <div className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px' }}>Galleria</div>
          <div style={{ font: "600 14px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', marginTop: 4 }}>{gallery.length} foto</div>
        </div>
        <div className="chip" onClick={onNewFoto} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B2A4A', color: '#fff', padding: '11px 16px', borderRadius: 11, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer' }}>＋ Aggiungi foto</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14, marginTop: 22 }}>
        {gallery.map((ph, i) => (
          <div key={i} className="lift" style={{ aspectRatio: '1', borderRadius: 14, background: ph.color, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: 14 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 9px,transparent 9px 18px)' }} />
            <div style={{ position: 'absolute', top: 12, right: 12, font: "700 8.5px ui-monospace,Menlo,monospace", letterSpacing: '.5px', background: 'rgba(0,0,0,.16)', color: '#fff', padding: '4px 7px', borderRadius: 6 }}>FOTO</div>
            <div style={{ position: 'relative' }}>
              <div style={{ font: "700 13.5px 'Nunito Sans'", color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,.3)' }}>{ph.caption}</div>
              <div style={{ font: "600 11px 'Nunito Sans'", color: 'rgba(255,255,255,.82)' }}>{ph.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
