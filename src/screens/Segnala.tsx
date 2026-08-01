// ============================================================================
// "Segnala un problema" — schermata presentazionale (props + callback, niente
// rete). Ci si arriva dal banner alpha in Home.
//
// Tutta la parte di rete e la validazione stanno in `src/lib/segnalazioni.ts`:
// qui vivono solo il form, il suo stato (idle/busy/inviata) e il messaggio
// d'errore che torna da `onInvia`. La validazione è richiamata anche qui, ma
// solo per accendere/spegnere il pulsante — l'esito autorevole è quello che
// torna dal salvataggio.
// ============================================================================
import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AREE,
  DESCRIZIONE_MAX,
  TITOLO_MAX,
  validaSegnalazione,
} from '../lib/segnalazioni'
import type { AreaSegnalazione, EsitoInvio, NuovaSegnalazione } from '../lib/segnalazioni'
import { BackLink, PageHeader, INK, ORANGE, MUTED } from '../components/ui'

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(27,42,74,.16)',
  borderRadius: 10,
  padding: '11px 13px',
  font: "600 14px 'Nunito Sans'",
  background: '#fff',
  color: INK,
}
const labelStyle: CSSProperties = {
  display: 'block',
  font: "700 12px 'Nunito Sans'",
  color: MUTED,
  marginBottom: 7,
}
const hintStyle: CSSProperties = {
  font: "600 12px 'Nunito Sans'",
  color: 'rgba(27,42,74,.45)',
  marginTop: 7,
}
const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  border: 'none',
  borderRadius: 11,
  padding: '12px 18px',
  font: "700 14px 'Nunito Sans'",
  background: ORANGE,
  color: '#fff',
  cursor: 'pointer',
}

interface SegnalaProps {
  onBack: () => void
  /** Salva la segnalazione. L'errore arriva già in italiano. */
  onInvia: (s: NuovaSegnalazione) => Promise<EsitoInvio>
}

export default function Segnala({ onBack, onInvia }: SegnalaProps) {
  const [area, setArea] = useState<AreaSegnalazione>('altro')
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviata, setInviata] = useState(false)

  const bozza: NuovaSegnalazione = { titolo, descrizione, area }
  const completa = validaSegnalazione(bozza) === null

  const invia = async () => {
    if (busy || !completa) return
    setBusy(true)
    setErrore(null)
    const res = await onInvia(bozza)
    setBusy(false)
    if (!res.ok) {
      setErrore(res.error ?? 'Non è stato possibile inviare la segnalazione. Riprova.')
      return
    }
    setInviata(true)
  }

  // Dopo l'invio il form sparisce: lasciarlo pieno inviterebbe a premere di
  // nuovo, e la seconda copia della stessa segnalazione non serve a nessuno.
  const daCapo = () => {
    setTitolo('')
    setDescrizione('')
    setArea('altro')
    setErrore(null)
    setInviata(false)
  }

  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <BackLink onClick={onBack}>← Torna alla home</BackLink>
      <PageHeader
        title="Segnala un problema"
        subtitle="L’app è in versione alpha: se qualcosa non funziona, scrivilo qui."
      />

      {inviata ? (
        <div className="card" style={{ marginTop: 22, padding: 22 }}>
          <div className="num" style={{ fontSize: 18, fontWeight: 500 }}>Grazie, l’abbiamo ricevuta 🙌</div>
          <p style={{ font: "600 13.5px 'Nunito Sans'", color: MUTED, lineHeight: 1.5, margin: '8px 0 0' }}>
            La segnalazione è arrivata a chi sviluppa l’app. Non riceverai una
            risposta automatica: se serve un chiarimento ti scriviamo all’email
            del tuo account.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button type="button" className="chip" onClick={daCapo} style={primaryBtn}>
              Segnala un altro problema
            </button>
            <button
              type="button"
              className="chip"
              onClick={onBack}
              style={{
                ...primaryBtn,
                background: 'transparent',
                color: INK,
                border: '1px solid rgba(27,42,74,.16)',
              }}
            >
              Torna alla home
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 22, padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="segnala-area" style={labelStyle}>Dove succede</label>
              <select
                id="segnala-area"
                value={area}
                onChange={(e) => setArea(e.target.value as AreaSegnalazione)}
                style={{ ...fieldStyle, cursor: 'pointer' }}
              >
                {AREE.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="segnala-titolo" style={labelStyle}>Il problema in una riga</label>
              <input
                id="segnala-titolo"
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                maxLength={TITOLO_MAX}
                placeholder={'Es. "Il torneo salvato non compare nella lista"'}
                autoComplete="off"
                style={fieldStyle}
              />
            </div>

            <div>
              <label htmlFor="segnala-descrizione" style={labelStyle}>Cosa è successo</label>
              <textarea
                id="segnala-descrizione"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                maxLength={DESCRIZIONE_MAX}
                rows={6}
                placeholder="Cosa stavi facendo, cosa ti aspettavi e cosa è successo invece. Se sai come farlo ricapitare, scrivi i passaggi."
                style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
              <div style={hintStyle}>
                {descrizione.trim().length}/{DESCRIZIONE_MAX} caratteri. Alleghiamo
                automaticamente il browser che stai usando: aiuta a riprodurre il problema.
              </div>
            </div>
          </div>

          {errore && (
            <div role="alert" style={{ font: "700 12.5px 'Nunito Sans'", color: '#FF477E', marginTop: 14 }}>
              {errore}
            </div>
          )}

          <button
            type="button"
            className="chip"
            onClick={invia}
            disabled={!completa || busy}
            style={{
              ...primaryBtn,
              marginTop: 18,
              width: '100%',
              opacity: !completa || busy ? 0.5 : undefined,
              cursor: !completa || busy ? 'default' : 'pointer',
            }}
          >
            {busy ? 'Invio…' : 'Invia segnalazione'}
          </button>
        </div>
      )}
    </div>
  )
}
