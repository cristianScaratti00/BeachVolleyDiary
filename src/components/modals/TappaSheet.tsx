// ============================================================================
// «Nuova tappa» / «Modifica tappa» del Campionato per Società (CIPS).
//
// Lo stesso linguaggio del modulo del torneo (barra «Annulla · titolo ·
// Salva», chip che vanno a capo), con i campi della FIPAV:
// - che cos'era (Tappa, Platinum, Coppa Italia, Finale) e la categoria;
// - set a 15 o a 21 (nel 2026/27 le tappe invernali sono tutte a 15);
// - il piazzamento in numero (5°, 7°, 9°, 13°… della doppia eliminazione) e
//   su quante coppie;
// - i punti di coppia e quelli alla società, PROPOSTI dalla tabella del
//   regolamento quando la scrive, e sempre correggibili: finché non li tocchi
//   seguono piazzamento e categoria, dopo restano i tuoi.
// Il nome non si scrive: si compone dai campi («Tappa Silver · Milano»).
//
// Società e classifica si chiedono qui, in cima, solo quando la stagione
// della data non ha ancora un'iscrizione (la prima tappa, o una di una
// stagione passata): con Solby che dice a cosa servono.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetBar, SheetChipAdd, SheetChips } from './Sheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Disclosure, Switch, TextArea, TextField } from '../ui/Field'
import { Pallo } from '../Pallo'
import {
  CIPS_CATEGORIE,
  CIPS_TIPI,
  GENERE,
  iscrizioneDi,
  iscrizioniOrdinate,
  nomeTappa,
  puntiProposti,
  stagioneDi,
} from '../../lib/campionato'
import type { CategoriaCips, Genere, PuntiSet, TappaForm, TipoTappa } from '../../lib/campionato'
import { LIMITI } from '../../lib/lunghezze'
import type { TappaSheetProps } from '../../app/contracts'
import './TappaSheet.css'

/** I piazzamenti della doppia eliminazione e dei pool; il resto con «Altro». */
const POSTI = [1, 2, 3, 4, 5, 7, 9, 13, 17]

const CLUB_MANCANTE = 'Scrivi la tua società.'
const GENERE_MANCANTE = 'Scegli la classifica.'
const DATA_MANCANTE = 'Scegli la data della tappa.'

/** Solo cifre, al massimo `n`: i campi dei numeri restano testo mentre si scrive. */
const cifre = (v: string, n = 6) => v.replace(/\D/g, '').slice(0, n)

function formIniziale({ tappa, iscrizioni, partners, compagnoDefault, today }: Pick<TappaSheetProps, 'tappa' | 'iscrizioni' | 'partners' | 'compagnoDefault' | 'today'>): TappaForm {
  const ultima = iscrizioniOrdinate({ iscrizioni, tappe: [], partite: [] })[0]
  if (tappa) {
    return {
      kind: tappa.kind,
      category: tappa.category,
      date: tappa.date,
      city: tappa.city,
      organizer: tappa.organizer,
      partnerId: tappa.partnerId ?? '',
      newPartnerName: '',
      partnerOtherClub: tappa.partnerOtherClub,
      setPoints: tappa.setPoints,
      placement: tappa.placement,
      teams: tappa.teams != null ? String(tappa.teams) : '',
      pairPoints: tappa.pairPoints != null ? String(tappa.pairPoints) : '',
      countsForClub: tappa.countsForClub,
      clubPoints: tappa.clubPoints != null ? String(tappa.clubPoints) : '',
      note: tappa.note,
      club: ultima?.club ?? '',
      gender: ultima?.gender ?? '',
    }
  }
  return {
    kind: 'Tappa',
    category: 'Silver',
    date: today,
    city: '',
    organizer: '',
    partnerId: partners.some((p) => p.id === compagnoDefault) ? compagnoDefault : '',
    newPartnerName: '',
    partnerOtherClub: false,
    setPoints: 15,
    placement: null,
    teams: '',
    pairPoints: '',
    countsForClub: true,
    clubPoints: '',
    note: '',
    // Una stagione nuova riparte dalla società di quella prima: di solito è la stessa.
    club: ultima?.club ?? '',
    gender: ultima?.gender ?? '',
  }
}

export default function TappaSheet({
  mode,
  tappa,
  iscrizioni,
  partners,
  compagnoDefault,
  today,
  canAddPartner,
  onSave,
  onDelete,
  onClose,
  top,
  byTouch,
  opener,
  setDirty,
  setBusy,
}: TappaSheetProps) {
  const modifica = mode === 'modifica'
  const iniziale = useMemo(() => formIniziale({ tappa, iscrizioni, partners, compagnoDefault, today }), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<TappaForm>(iniziale)
  const [occupato, setOccupato] = useState(false)
  const [dettagli, setDettagli] = useState(false)
  const [altro, setAltro] = useState(() => iniziale.placement != null && !POSTI.includes(iniziale.placement))
  const [errori, setErrori] = useState<{ club?: string; gender?: string; date?: string }>({})
  // I punti seguono la tabella finché non li tocchi tu (in modifica sono già tuoi).
  const [tuoi, setTuoi] = useState({ coppia: modifica, societa: modifica })
  const clubRef = useRef<HTMLInputElement>(null)
  const dataRef = useRef<HTMLInputElement>(null)
  const generiRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof TappaForm>(k: K, v: TappaForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k in errori) setErrori((e) => ({ ...e, [k]: undefined }))
  }

  const sporco = JSON.stringify(form) !== JSON.stringify(iniziale)
  useEffect(() => {
    setDirty(sporco)
  }, [sporco, setDirty])

  const season = stagioneDi(form.date)
  const iscritta = season ? iscrizioneDi({ iscrizioni, tappe: [], partite: [] }, season) : undefined
  const chiediSocieta = !!season && !iscritta
  const prima = iscrizioni.length === 0
  const proposti = puntiProposti(season, form.category, form.placement)

  // Piazzamento, categoria o stagione cambiano: i punti non toccati seguono la tabella.
  useEffect(() => {
    setForm((f) => {
      const coppia = tuoi.coppia ? f.pairPoints : proposti.coppia != null ? String(proposti.coppia) : ''
      const societa = tuoi.societa ? f.clubPoints : proposti.societa != null ? String(proposti.societa) : ''
      return coppia === f.pairPoints && societa === f.clubPoints ? f : { ...f, pairPoints: coppia, clubPoints: societa }
    })
  }, [proposti.coppia, proposti.societa, tuoi.coppia, tuoi.societa])

  const mancano = () => {
    const e: typeof errori = {}
    if (!form.date) e.date = DATA_MANCANTE
    if (chiediSocieta && [...form.club.trim()].length < LIMITI.societa.min) e.club = CLUB_MANCANTE
    if (chiediSocieta && !form.gender) e.gender = GENERE_MANCANTE
    return e
  }
  const incompleto = Object.keys(mancano()).length > 0

  const segnala = () => {
    const e = mancano()
    setErrori(e)
    if (e.date) dataRef.current?.focus()
    else if (e.club) clubRef.current?.focus()
    else if (e.gender) generiRef.current?.querySelector('button')?.focus()
  }

  const salva = async () => {
    if (occupato) return
    if (incompleto) {
      segnala()
      return
    }
    setOccupato(true)
    setBusy(true)
    try {
      await onSave({ ...form, newPartnerName: form.newPartnerName.trim() })
    } finally {
      setOccupato(false)
      setBusy(false)
    }
  }

  const nuovoCompagno = form.partnerId === 'new'
  const compagno = nuovoCompagno ? form.newPartnerName.trim() : partners.find((p) => p.id === form.partnerId)?.name ?? ''
  const nome = nomeTappa(form)
  const sub = [nome, iscritta?.club ?? (form.club.trim() || null)].filter(Boolean).join(' · ')

  const valorePosto = form.placement == null ? (altro ? 'altro' : 'corso') : altro || !POSTI.includes(form.placement) ? 'altro' : String(form.placement)
  const scegliPosto = (v: string) => {
    if (v === 'altro') {
      setAltro(true)
      return
    }
    setAltro(false)
    set('placement', v === 'corso' ? null : Number(v))
  }

  const riassunto = [form.organizer.trim() && `Organizza ${form.organizer.trim()}`, form.note.trim() && 'nota'].filter(Boolean).join(' · ')

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={sporco}
      busy={occupato}
      header={
        <SheetBar
          title={modifica ? 'Modifica tappa' : 'Nuova tappa'}
          sub={sub}
          onCancel={onClose}
          cancelBusy={occupato}
          action={
            <Button
              variant="filled"
              disabled={incompleto}
              onDisabledClick={segnala}
              busy={occupato}
              busyLabel={modifica ? 'Salvataggio…' : 'Creo…'}
              onClick={() => void salva()}
            >
              Salva
            </Button>
          }
        />
      }
    >
      <form
        className="tappa-sheet-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        <fieldset className="ui-sheet-stack tappa-sheet-fields" disabled={occupato}>
          {chiediSocieta && (
            <div className="tappa-sheet-societa">
              {prima && (
                <div className="tappa-sheet-solby">
                  <Pallo umore="saluta" size={64} className="tappa-sheet-pallo" />
                  <p className="tappa-sheet-nuvola">
                    <span className="tappa-sheet-firma">Solby</span>
                    Il Campionato per Società va da ottobre a maggio. Dimmi per chi giochi: tengo le tappe e i loro numeri a parte dalle tue statistiche.
                  </p>
                </div>
              )}
              <TextField
                ref={clubRef}
                label={prima ? 'La tua società' : `La tua società nel ${season}`}
                value={form.club}
                onChange={(v) => set('club', v)}
                placeholder="es. Lido Nord Volley"
                autoComplete="off"
                maxLength={LIMITI.societa.max}
                required
                aria-required="true"
                error={errori.club}
              />
              <div ref={generiRef}>
                <SheetChips
                  label="Classifica"
                  options={(['F', 'M'] as Genere[]).map((g) => ({ value: g, label: GENERE[g] }))}
                  value={form.gender}
                  onChange={(v) => v && set('gender', v as Genere)}
                  hint={errori.gender}
                />
              </div>
            </div>
          )}

          <SheetChips
            label="Che cos'era"
            options={CIPS_TIPI.map((k) => ({ value: k, label: k }))}
            value={form.kind}
            onChange={(v) => {
              if (!v) return
              set('kind', v as TipoTappa)
              // La Platinum è anche la sua categoria.
              if (v === 'Platinum') set('category', 'Platinum')
              else if (form.category === 'Platinum') set('category', 'Gold')
            }}
          />

          <SheetChips
            label="Categoria"
            options={CIPS_CATEGORIE.filter((c) => c !== 'Platinum' || form.kind === 'Platinum').map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(v) => v && set('category', v as CategoriaCips)}
          />

          <div className="ui-sheet-pair">
            <TextField ref={dataRef} label="Data" type="date" value={form.date} onChange={(v) => set('date', v)} error={errori.date} />
            <TextField
              label="Città"
              value={form.city}
              onChange={(v) => set('city', v)}
              placeholder="es. Milano"
              autoComplete="off"
              maxLength={LIMITI.citta.max}
            />
          </div>

          <div className="tappa-sheet-partner">
            <SheetChips
              label="Con chi l'hai giocata"
              options={partners.map((p) => ({ value: p.id, label: p.name }))}
              value={nuovoCompagno ? '' : form.partnerId}
              onChange={(v) => set('partnerId', v)}
              toggle
            >
              {(canAddPartner || nuovoCompagno) && (
                <SheetChipAdd pressed={nuovoCompagno} onClick={() => set('partnerId', nuovoCompagno ? '' : 'new')}>
                  <Icon name="plus" size={16} />
                  Nuovo compagno
                </SheetChipAdd>
              )}
            </SheetChips>
            {nuovoCompagno && (
              <TextField
                label="Nome del nuovo compagno"
                value={form.newPartnerName}
                onChange={(v) => set('newPartnerName', v)}
                placeholder="es. Giulia"
                autoComplete="off"
                maxLength={LIMITI.compagno.max}
                autoFocus
              />
            )}
            {compagno && (
              <Switch
                label={`${compagno} gioca per un'altra società`}
                hint="Coppia di due società: i punti si dividono a metà."
                checked={form.partnerOtherClub}
                onChange={(v) => set('partnerOtherClub', v)}
              />
            )}
          </div>

          <SheetChips
            label="Set"
            options={([15, 21] as PuntiSet[]).map((n) => ({ value: String(n), label: `A ${n}` }))}
            value={String(form.setPoints)}
            onChange={(v) => v && set('setPoints', Number(v) as PuntiSet)}
            hint={season === '2026/27' ? 'Nel 2026/27 le tappe invernali si giocano tutte a 15.' : undefined}
          />

          <div className="tappa-sheet-posto">
            <SheetChips
              label="Piazzamento"
              options={[
                { value: 'corso', label: 'In corso' },
                ...POSTI.map((n) => ({ value: String(n), label: `${n}°` })),
                { value: 'altro', label: 'Altro' },
              ]}
              value={valorePosto}
              onChange={(v) => v && scegliPosto(v)}
            />
            <div className="ui-sheet-pair" data-ratio="numeri">
              {valorePosto === 'altro' && (
                <TextField
                  label="Posto"
                  inputMode="numeric"
                  value={form.placement != null ? String(form.placement) : ''}
                  onChange={(v) => {
                    const n = cifre(v, 3)
                    set('placement', n ? Number(n) || null : null)
                  }}
                  placeholder="es. 25"
                  autoComplete="off"
                />
              )}
              <TextField
                label={<>Su quante coppie <span className="ui-sheet-optional">(facoltativo)</span></>}
                inputMode="numeric"
                value={form.teams}
                onChange={(v) => set('teams', cifre(v, 3))}
                placeholder="es. 16"
                autoComplete="off"
              />
            </div>
          </div>

          <TextField
            label="Punti di coppia"
            inputMode="numeric"
            value={form.pairPoints}
            onChange={(v) => {
              setTuoi((t) => ({ ...t, coppia: true }))
              set('pairPoints', cifre(v))
            }}
            placeholder="Dal portale BVL"
            autoComplete="off"
            hint={
              proposti.coppia != null && !tuoi.coppia
                ? `Proposti dalla tabella ${form.category} ${season} per il ${form.placement}° posto. Se sul portale BVL leggi un altro numero, correggilo.`
                : form.placement != null && proposti.coppia == null
                  ? 'Il regolamento non li scrive per questo posto: li trovi sul portale BVL.'
                  : undefined
            }
          />

          <div className="tappa-sheet-club">
            <Switch
              label={`Contano per ${iscritta?.club ?? (form.club.trim() || 'la società')}`}
              hint="La società somma i 3 piazzamenti migliori delle sue coppie in ogni tappa."
              checked={form.countsForClub}
              onChange={(v) => set('countsForClub', v)}
            />
            {form.countsForClub && (
              <TextField
                label="Punti alla società"
                inputMode="numeric"
                value={form.clubPoints}
                onChange={(v) => {
                  setTuoi((t) => ({ ...t, societa: true }))
                  set('clubPoints', cifre(v))
                }}
                placeholder="—"
                autoComplete="off"
              />
            )}
          </div>

          <Disclosure title="Altri dettagli" summary={riassunto} open={dettagli} onToggle={() => setDettagli((d) => !d)}>
            <div className="ui-sheet-stack tappa-sheet-more">
              <TextField
                label="Chi l'ha organizzata"
                value={form.organizer}
                onChange={(v) => set('organizer', v)}
                placeholder="es. Duna Rossa BV"
                autoComplete="off"
                maxLength={LIMITI.societa.max}
              />
              <TextArea label="Note" value={form.note} onChange={(v) => set('note', v)} placeholder="Com'è andata?" rows={2} maxLength={500} />
            </div>
          </Disclosure>
        </fieldset>

        {!modifica && <p className="tappa-sheet-dopo">Le partite le aggiungi dopo, dal dettaglio della tappa.</p>}

        {modifica && onDelete && (
          <Button variant="glass" tone="danger" icon="trash" block className="ui-sheet-danger" disabled={occupato} onClick={onDelete}>
            Elimina tappa
          </Button>
        )}
      </form>
    </Sheet>
  )
}
