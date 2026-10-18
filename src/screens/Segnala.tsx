// ============================================================================
// "Segnala un problema" (UX §5 F10, §6.8): presentazionale, props e callback,
// niente rete. Ci si arriva dal banner alpha in Home e da Profilo.
//
// La rete e la validazione stanno in `src/lib/segnalazioni.ts`: qui il modulo,
// il suo stato (a riposo / invio / inviata) e l'errore che torna da `onInvia`.
// La validazione è richiamata anche qui per dire PRIMA cosa manca; l'esito
// autorevole resta quello del salvataggio.
//
// «Invia segnalazione» è disattivo (`aria-disabled`) finché manca qualcosa,
// ma non muto: il tocco porta al primo campo da completare e dice perché
// (MOTION.md §8.1, M15).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AREE, DESCRIZIONE_MAX, DESCRIZIONE_MIN, TITOLO_MAX, TITOLO_MIN, validaSegnalazione } from '../lib/segnalazioni'
import type { AreaSegnalazione, NuovaSegnalazione } from '../lib/segnalazioni'
import type { SegnalaProps } from '../app/contracts'
import { NavBar, Page, Button, Select, TextField, TextArea, FormGroup, Icon } from '../components/ui/index'
import './Segnala.css'

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

  const bozza: NuovaSegnalazione = { titolo, descrizione, area }
  const completa = validaSegnalazione(bozza) === null
  const errT = tentato ? erroreTitolo(titolo) : null
  const errD = tentato ? erroreDescrizione(descrizione) : null

  // Dopo l'invio il focus va al titolo del pannello, a t0 (MOTION.md §5 F10).
  useEffect(() => {
    if (inviata) grazieRef.current?.focus({ preventScroll: true })
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
    setInviata(false)
  }

  return (
    <Page width="reading">
      <NavBar
        title="Segnala un problema"
        subtitle="L'app è in versione alpha: se qualcosa non funziona, scrivilo qui."
        back={back}
      />

      {inviata ? (
        <section className="segnala-grazie" aria-labelledby="segnala-grazie-t">
          <Icon name="check-circle" size={24} className="segnala-grazie-icon" />
          <h2 id="segnala-grazie-t" ref={grazieRef} tabIndex={-1} className="segnala-grazie-title">
            Grazie, l'abbiamo ricevuta
          </h2>
          <p className="segnala-grazie-text">
            La segnalazione è arrivata a chi sviluppa l'app. Non riceverai una risposta automatica: se serve un
            chiarimento ti scriviamo all'email del tuo account.
          </p>
          <div className="segnala-grazie-actions">
            <Button variant="tinted" onClick={daCapo}>Segnala un altro problema</Button>
            <Button variant="neutral" icon="chevron-left" onClick={onBack}>Torna indietro</Button>
          </div>
        </section>
      ) : (
        <form className="segnala-form" onSubmit={(e) => void invia(e)} noValidate>
          <FormGroup>
            <Select
              label="Dove succede"
              value={area}
              onChange={(v) => setArea(v as AreaSegnalazione)}
              options={AREE.map((a) => ({ value: a.value, label: a.label }))}
            />
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
              counter
              rows={6}
              placeholder="Cosa stavi facendo, cosa ti aspettavi e cosa è successo invece. Se sai come farlo ricapitare, scrivi i passaggi."
              hint="Alleghiamo il browser che stai usando: aiuta a riprodurre il problema."
              readOnly={busy}
              error={errD}
            />
          </FormGroup>

          {errore && (
            <p className="segnala-errore" role="alert">
              <Icon name="alert" size={16} />
              <span>{errore}</span>
            </p>
          )}

          <Button
            type="submit"
            variant="filled"
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
