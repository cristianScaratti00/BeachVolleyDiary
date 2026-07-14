import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Session } from '../lib/auth'
import { BASE_LIMITS } from '../lib/limits'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui'

interface ProfiloProps {
  session: Session
  onUpgrade: () => void
  onLogout: () => void
}

interface PlanCard {
  key: 'base' | 'premium'
  name: string
  price: string
  period?: string
  accent: string
  features: string[]
}

const PLANS: PlanCard[] = [
  {
    key: 'base', name: 'Base', price: 'Gratis', accent: 'rgba(27,42,74,.5)',
    features: [`Fino a ${BASE_LIMITS.tournaments} tornei`, `Fino a ${BASE_LIMITS.partners} compagni`, 'Statistiche complete'],
  },
  {
    key: 'premium', name: 'Premium', price: '€5', period: '/mese', accent: '#FF6B35',
    features: ['Assistente AI per creare i tornei', 'Tornei e compagni illimitati', 'Diario dei tornei con foto', 'Filtri avanzati dashboard', 'Tutto del piano Base'],
  },
]

export default function Profilo({ session, onUpgrade, onLogout }: ProfiloProps) {
  const initial = session.name?.[0]?.toUpperCase() || '?'
  const { refresh } = useAuth()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Cambia foto profilo: upload sul bucket pubblico `avatars`, poi RPC set_avatar
  // e refresh della sessione. Pulisce i vecchi avatar (best-effort).
  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset: permette di riselezionare lo stesso file
    if (!file || busy) return
    setBusy(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) throw new Error('Sessione non valida.')
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
      const newPath = `${uid}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(newPath, file, { contentType: file.type || 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(newPath)
      const { error: rpcErr } = await supabase.rpc('set_avatar', { p_url: pub.publicUrl })
      if (rpcErr) throw rpcErr
      try {
        const { data: existing } = await supabase.storage.from('avatars').list(uid)
        const stale = (existing ?? []).map((f) => `${uid}/${f.name}`).filter((p) => p !== newPath)
        if (stale.length) await supabase.storage.from('avatars').remove(stale)
      } catch { /* ignore cleanup errors */ }
      await refresh()
    } catch (err) {
      alert('Impossibile aggiornare la foto: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px' }}>Profilo</div>

      {/* utente */}
      <div className="card" style={{ padding: 22, marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          onClick={() => { if (!busy) fileRef.current?.click() }}
          title="Cambia foto profilo"
          style={{ position: 'relative', flex: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          <Avatar initial={initial} size={54} font={22} uri={session.avatarUrl} />
          <div style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', fontSize: 10 }}>📷</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: 'none' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ font: "700 17px 'Nunito Sans'" }}>{session.name}</div>
            {session.role === 'admin' && <span style={{ font: "800 9px 'Nunito Sans'", letterSpacing: '.5px', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 6, background: '#1B2A4A', color: '#fff' }}>Admin</span>}
          </div>
          <div style={{ font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.email}</div>
        </div>
      </div>

      {/* piani */}
      <div className="lbl" style={{ marginTop: 26, marginBottom: 12 }}>Il tuo piano</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 14 }}>
        {PLANS.map((p) => {
          const current = session.plan === p.key
          return (
            <div key={p.key} className="card" style={{ padding: 22, position: 'relative', border: current ? '2px solid #FF6B35' : '1px solid rgba(27,42,74,.1)' }}>
              {current && <span style={{ position: 'absolute', top: 14, right: 14, font: "800 9px 'Nunito Sans'", letterSpacing: '.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: '#FF6B35', color: '#fff' }}>Attuale</span>}
              <div className="lbl" style={{ color: p.accent }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 8 }}>
                <span className="num" style={{ fontSize: 30, fontWeight: 600 }}>{p.price}</span>
                {p.period && <span style={{ font: "700 13px 'Nunito Sans'", color: 'rgba(27,42,74,.5)' }}>{p.period}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, font: "600 13px 'Nunito Sans'", color: '#1B2A4A' }}>
                    <span style={{ color: '#FF6B35', fontWeight: 800 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              {p.key === 'premium' && !current && (
                <button onClick={onUpgrade} className="chip" style={{ width: '100%', marginTop: 18, padding: 12, borderRadius: 11, border: 'none', cursor: 'pointer', background: '#FF6B35', color: '#fff', font: "700 14px 'Nunito Sans'" }}>Passa a Premium · €5</button>
              )}
              {current && (
                <div style={{ marginTop: 18, padding: 12, borderRadius: 11, textAlign: 'center', background: '#F2F0EC', color: 'rgba(27,42,74,.55)', font: "700 13px 'Nunito Sans'" }}>Piano attivo</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', marginTop: 14 }}>
        Con il piano Base puoi creare fino a {BASE_LIMITS.tournaments} tornei e {BASE_LIMITS.partners} compagni. Con Premium sono illimitati e sblocchi l’assistente AI che crea i tornei per te.
      </div>

      <div className="chip" onClick={onLogout} style={{ display: 'inline-flex', marginTop: 26, padding: '11px 18px', borderRadius: 11, border: '1px solid rgba(255,71,126,.4)', color: '#FF477E', cursor: 'pointer', font: "700 13.5px 'Nunito Sans'" }}>Esci</div>
    </div>
  )
}
