import { useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import type { Session } from '../lib/auth'
import { updateDisplayName, updatePassword } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Avatar, Badge, MUTED } from '../components/ui'
import { Label, inputStyle } from '../components/modals/Sheet'

interface ProfiloProps {
  session: Session
  onLogout: () => void
  /** Quanti altri utenti ti hanno collegato come loro socio. */
  condivisioniRicevute: number
  /** Toglie TUTTE le condivisioni ricevute. Ritorna quante ne ha tolte. */
  onRimuoviCondivisioni: () => Promise<number>
}

// Esito dell'ultima azione di un riquadro (verde = fatto, rosso = errore).
type Msg = { ok: boolean; text: string } | null

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <div style={{ font: "700 12.5px 'Nunito Sans'", color: msg.ok ? '#14B87A' : '#FF477E', marginTop: 12 }}>
      {msg.text}
    </div>
  )
}

const hintStyle: CSSProperties = { font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', marginTop: 7 }
const readOnlyStyle: CSSProperties = { ...inputStyle, background: '#F7F5F1', color: MUTED, cursor: 'not-allowed' }

function SaveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="chip"
      style={{
        marginTop: 16, padding: '12px 22px', borderRadius: 11, border: 'none',
        background: '#FF6B35', color: '#fff', font: "700 13.5px 'Nunito Sans'",
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  )
}

export default function Profilo({ session, onLogout, condivisioniRicevute, onRimuoviCondivisioni }: ProfiloProps) {
  const initial = session.name?.[0]?.toUpperCase() || '?'
  const { refresh } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [busyAvatar, setBusyAvatar] = useState(false)
  const [name, setName] = useState(session.name)
  const [busyName, setBusyName] = useState(false)
  const [nameMsg, setNameMsg] = useState<Msg>(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busyPw, setBusyPw] = useState(false)
  const [busyCond, setBusyCond] = useState(false)
  const [condMsg, setCondMsg] = useState<Msg>(null)

  const rimuoviCondivisioni = async () => {
    if (busyCond) return
    if (!window.confirm('Togliere tutte le condivisioni ricevute? I tornei degli altri spariranno dal tuo diario e dalle tue statistiche.')) return
    setBusyCond(true)
    setCondMsg(null)
    const n = await onRimuoviCondivisioni()
    setBusyCond(false)
    setCondMsg(
      n > 0
        ? { ok: true, text: n === 1 ? 'Condivisione rimossa.' : `${n} condivisioni rimosse.` }
        : { ok: false, text: 'Non è stato possibile rimuoverle. Riprova.' },
    )
  }
  const [pwMsg, setPwMsg] = useState<Msg>(null)

  const nameDirty = name.trim() !== session.name.trim()

  // Cambia foto profilo: upload sul bucket pubblico `avatars`, poi RPC set_avatar
  // e refresh della sessione. Pulisce i vecchi avatar (best-effort).
  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset: permette di riselezionare lo stesso file
    if (!file || busyAvatar) return
    setBusyAvatar(true)
    setNameMsg(null)
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
      setNameMsg({ ok: false, text: 'Impossibile aggiornare la foto: ' + (err instanceof Error ? err.message : String(err)) })
    } finally {
      setBusyAvatar(false)
    }
  }

  const saveName = async () => {
    if (busyName || !nameDirty) return
    setBusyName(true)
    setNameMsg(null)
    const res = await updateDisplayName(name, session.name)
    if (res.ok) await refresh()
    else setName(session.name) // nome rifiutato: torna a quello in sessione
    setNameMsg({ ok: res.ok, text: res.ok ? res.notice ?? 'Nome aggiornato.' : res.error ?? 'Operazione non riuscita.' })
    setBusyName(false)
  }

  const savePassword = async () => {
    if (busyPw) return
    setBusyPw(true)
    setPwMsg(null)
    const res = await updatePassword(pw, pw2)
    if (res.ok) { setPw(''); setPw2('') }
    setPwMsg({ ok: res.ok, text: res.ok ? res.notice ?? 'Password aggiornata.' : res.error ?? 'Operazione non riuscita.' })
    setBusyPw(false)
  }

  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <div className="num" style={{ fontSize: 'clamp(26px,4vw,34px)', fontWeight: 500, letterSpacing: '-.5px' }}>Profilo</div>

      {/* utente */}
      <div className="card" style={{ padding: 22, marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          onClick={() => { if (!busyAvatar) fileRef.current?.click() }}
          title="Cambia foto profilo"
          style={{ position: 'relative', flex: 'none', cursor: busyAvatar ? 'default' : 'pointer', opacity: busyAvatar ? 0.6 : 1 }}
        >
          <Avatar initial={initial} size={54} font={22} uri={session.avatarUrl} />
          <div style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', fontSize: 10 }}>📷</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: 'none' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ font: "700 17px 'Nunito Sans'" }}>{session.name}</div>
            {session.role === 'admin' && <Badge tone="dark" size="lg">Admin</Badge>}
          </div>
          <div style={{ font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.email}</div>
        </div>
      </div>

      {/* informazioni account */}
      <div className="lbl" style={{ marginTop: 26, marginBottom: 12 }}>Informazioni account</div>
      <div className="card" style={{ padding: 22 }}>
        <Label>Nome</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="nickname"
          style={inputStyle}
        />
        <div style={hintStyle}>Con questo nome ti trovano gli altri giocatori quando ti collegano come compagno.</div>

        <div style={{ marginTop: 18 }}>
          <Label>Email</Label>
          <input value={session.email} readOnly disabled style={readOnlyStyle} />
          <div style={hintStyle}>L’email dell’account non è modificabile.</div>
        </div>

        <Feedback msg={nameMsg} />
        {nameDirty && (
          <SaveButton label={busyName ? 'Salvataggio…' : 'Salva nome'} disabled={busyName} onClick={saveName} />
        )}
      </div>

      {/* sicurezza */}
      <div className="lbl" style={{ marginTop: 26, marginBottom: 12 }}>Sicurezza</div>
      {session.hasPassword ? (
        <div className="card" style={{ padding: 22 }}>
          <Label>Nuova password</Label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="Almeno 6 caratteri" style={inputStyle} />
          <div style={{ marginTop: 18 }}>
            <Label>Conferma password</Label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="Ripeti la nuova password" style={inputStyle} />
          </div>
          <Feedback msg={pwMsg} />
          <SaveButton
            label={busyPw ? 'Aggiornamento…' : 'Aggiorna password'}
            disabled={busyPw || !pw || !pw2}
            onClick={savePassword}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 22, font: "600 13px 'Nunito Sans'", color: MUTED, lineHeight: 1.5 }}>
          Hai effettuato l’accesso con Google o Apple: la password si gestisce direttamente dal tuo account, non da qui.
        </div>
      )}

      {/* Chi ti collega come suo socio ti riversa i propri tornei nel diario e
          nelle statistiche, senza chiedere. Questa è la via d'uscita: prima
          non esisteva, e il collegamento era a senso unico e definitivo. */}
      <div className="lbl" style={{ marginTop: 26, marginBottom: 12 }}>Condivisioni ricevute</div>
      <div className="card" style={{ padding: 22 }}>
        {condivisioniRicevute === 0 ? (
          <div style={{ font: "600 13px 'Nunito Sans'", color: MUTED, lineHeight: 1.5 }}>
            Nessuno ti ha collegato come suo compagno. Quando succede, i tornei
            che avete giocato insieme compaiono nel tuo diario in sola lettura.
          </div>
        ) : (
          <>
            <div style={{ font: "600 13px 'Nunito Sans'", lineHeight: 1.5 }}>
              {condivisioniRicevute === 1
                ? 'Un altro giocatore ti ha collegato come suo compagno.'
                : `${condivisioniRicevute} giocatori ti hanno collegato come loro compagno.`}{' '}
              I loro tornei compaiono nel tuo diario e contano nelle tue statistiche.
            </div>
            <div style={hintStyle}>
              Togliendo la condivisione spariscono dal tuo diario. I tuoi tornei
              non vengono toccati, e chi ti aveva collegato può rifarlo.
            </div>
            <Feedback msg={condMsg} />
            <button
              onClick={rimuoviCondivisioni}
              disabled={busyCond}
              className="chip"
              style={{
                marginTop: 16, padding: '12px 22px', borderRadius: 11,
                border: '1px solid rgba(255,71,126,.4)', background: 'transparent',
                color: '#FF477E', font: "700 13.5px 'Nunito Sans'",
                cursor: busyCond ? 'default' : 'pointer', opacity: busyCond ? 0.45 : 1,
              }}
            >
              {busyCond ? 'Rimozione…' : 'Togli tutte le condivisioni'}
            </button>
          </>
        )}
      </div>

      <div className="chip" onClick={onLogout} style={{ display: 'inline-flex', marginTop: 26, padding: '11px 18px', borderRadius: 11, border: '1px solid rgba(255,71,126,.4)', color: '#FF477E', cursor: 'pointer', font: "700 13.5px 'Nunito Sans'" }}>Esci</div>
    </div>
  )
}
