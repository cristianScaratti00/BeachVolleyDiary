// ============================================================================
// "Segnala un problema" (UX §5 F10, §6.8), il redesign: presentazionale, props
// e callback, niente rete. Ci si arriva dal Profilo («Versione alpha») e dal
// banner alpha.
//
// La rete e la validazione stanno in `src/lib/segnalazioni.ts`: qui il modulo
// in una card — «Dove succede» a chip, il problema in una riga, cosa è
// successo — il suo stato (a riposo / invio / inviata) e l'errore che torna
// da `onInvia`. La validazione è richiamata anche qui per dire PRIMA cosa
// manca; l'esito autorevole resta quello del salvataggio.
//
// «Invia segnalazione» è disattivo (`aria-disabled`) finché manca qualcosa,
// ma non muto: il tocco porta al primo campo da completare e dice perché
// (MOTION.md §8.1, M15).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { AREE, DESCRIZIONE_MAX, DESCRIZIONE_MIN, TITOLO_MAX, TITOLO_MIN, validaSegnalazione } from '../lib/segnalazioni'
import type { AreaSegnalazione, NuovaSegnalazione } from '../lib/segnalazioni'
import type { SegnalaProps } from '../app/contracts'
import { NavBar, Page, Button, TextField, TextArea, Icon } from '../components/ui/index'
import { Pallo } from '../components/Pallo'
import type { PalloHandle } from '../components/Pallo'
import './Segnala.css'

/** Quanto dura la festa di Pallo a segnalazione inviata. */
const FESTA_MS = 2400

function erroreTitolo(t: string): string | null {
  const n = t.trim().length
  if (n < TITOLO_MIN) return 'Scrivi un titolo (almeno 3 caratteri).'
  if (n > TITOLO_MAX) return `Il titolo è troppo lungo (massimo ${TITOLO_MAX} caratteri).`
  return null
}
function erroreDescrizione(d: string): string | null {
  const n = d.trim().length
  if (n < DESCRIZIONE_MIN) return 'Descrivi il problema: cosa stavi facendo e cosa è successo.'
  if (n > DESCRIZIONE_MAX) return `La descrizione è troppo lunga (massimo ${DESCRIZIONE_MAX} caratteri).`
  return null
}

export default function Segnala({ back, onBack, onInvia }: SegnalaProps) {
  const [area, setArea] = useState<AreaSegnalazione>('altro')
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviata, setInviata] = useState(false)
  // I messaggi dei campi compaiono al tentativo d'invio, non a ogni tasto (UX §8.9).
  const [tentato, setTentato] = useState(false)
  const titoloRef = useRef<HTMLInputElement>(null)
  const descrizioneRef = useRef<HTMLTextAreaElement>(null)
  const grazieRef = useRef<HTMLHeadingElement>(null)
  const palloRef = useRef<PalloHandle>(null)
  // «Segnala altro» riporta il fuoco al modulo nuovo, non lo lascia sul body.
  const daCapoRef = useRef(false)

  const bozza: NuovaSegnalazione = { titolo, descrizione, area }
  const completa = validaSegnalazione(bozza) === null
  const errT = tentato ? erroreTitolo(titolo) : null
  const errD = tentato ? erroreDescrizione(descrizione) : null

  // Dopo l'invio il focus va al titolo del pannello, a t0 (MOTION.md §5 F10),
  // e Pallo fa festa fra i coriandoli prima di restare contento.
  useEffect(() => {
    if (inviata) {
      grazieRef.current?.focus({ preventScroll: true })
      palloRef.current?.reagisci('festa', FESTA_MS)
    } else if (daCapoRef.current) {
      daCapoRef.current = false
      titoloRef.current?.focus()
    }
  }, [inviata])

  const vaiAlCampo = () => {
    setTentato(true)
    const el = erroreTitolo(titolo) ? titoloRef.current : descrizioneRef.current
    el?.focus()
    el?.scrollIntoView({ block: 'center' })
  }

  const invia = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return
    if (!completa) {
      vaiAlCampo()
      return
    }
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

  // Dopo l'invio il modulo sparisce: lasciarlo pieno inviterebbe a premere di
  // nuovo, e la seconda copia della stessa segnalazione non serve a nessuno.
  const daCapo = () => {
    setTitolo('')
    setDescrizione('')
    setArea('altro')
    setErrore(null)
    setTentato(false)
    daCapoRef.current = true
    setInviata(false)
  }

  return (
    <Page width="reading" className="segnala">
      <NavBar
        title="Segnala un problema"
        subtitle="L’app è in versione alpha: se qualcosa non funziona, scrivilo qui."
        back={back}
      />

      {inviata ? (
        <section className="segnala-grazie rise" aria-labelledby="segnala-grazie-t">
          <Pallo ref={palloRef} umore="contento" size={110} segui />
          <h2 id="segnala-grazie-t" ref={grazieRef} tabIndex={-1} className="segnala-grazie-title">
            Grazie, l’abbiamo ricevuta
          </h2>
          <p className="segnala-grazie-text">La leggiamo e ti aggiorniamo quando è sistemata.</p>
          <div className="segnala-grazie-actions">
            <Button variant="glass" onClick={daCapo}>Segnala altro</Button>
            <Button variant="quiet" icon="chevron-left" onClick={onBack}>Torna indietro</Button>
          </div>
        </section>
      ) : (
        <form className="segnala-form rise" style={{ '--rise-i': 1 } as CSSProperties} onSubmit={(e) => void invia(e)} noValidate>
          {/* Una scelta sola fra chip che vanno a capo: la scelta è la chip
              d'inchiostro piena, e si annuncia con `aria-pressed`. */}
          <fieldset className="segnala-aree">
            <legend className="segnala-label">Dove succede</legend>
            <div className="segnala-chips">
              {AREE.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className="segnala-chip"
                  aria-pressed={area === a.value}
                  onClick={() => setArea(a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>
          <TextField
            ref={titoloRef}
            label="Il problema in una riga"
            value={titolo}
            onChange={setTitolo}
            maxLength={TITOLO_MAX}
            placeholder={'Es. "Il torneo salvato non compare nella lista"'}
            autoComplete="off"
            readOnly={busy}
            error={errT}
          />
          <TextArea
            ref={descrizioneRef}
            label="Cosa è successo"
            value={descrizione}
            onChange={setDescrizione}
            maxLength={DESCRIZIONE_MAX}
            rows={4}
            placeholder="Cosa stavi facendo, cosa ti aspettavi e cosa è successo invece."
            hint="Alleghiamo il browser che stai usando: aiuta a riprodurre il problema."
            readOnly={busy}
            error={errD}
          />

          {errore && (
            <p className="segnala-errore" role="alert">
              <Icon name="alert" size={16} />
              <span>{errore}</span>
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            block
            disabled={!completa}
            onDisabledClick={vaiAlCampo}
            busy={busy}
            busyLabel="Invio…"
            className="segnala-invia"
          >
            Invia segnalazione
          </Button>
        </form>
      )}
    </Page>
  )
}
