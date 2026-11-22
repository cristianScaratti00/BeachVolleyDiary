// ============================================================================
// «Riordina i tornei» (proposta A + B, 22/11/2026): dire il genere dei tornei
// di prima, per separare maschile e misto nelle statistiche.
//
// - Un gruppo per compagno: di solito con la stessa persona il torneo è dello
//   stesso tipo, quindi una scelta vale per tutto il gruppo. «Uno era
//   diverso?» apre i suoi tornei e lì si cambia il singolo.
// - La proposta (King → maschile, i tuoi tornei già segnati con quel
//   compagno…) arriva già scelta, con il perché scritto sotto: la si vede
//   prima di «Fatto». Il genere non si indovina mai dal nome del compagno.
// - Un gruppo lasciato vuoto resta «non indicato»: conta solo in «Tutti».
// ============================================================================
import { useEffect, useId, useMemo, useState } from 'react'
import { Sheet, SheetBar } from './Sheet'
import { Button } from '../ui/Button'
import { GENDERS } from '../../lib/db.enums'
import type { Gender } from '../../lib/db.enums'
import type { RiordinaSheetProps } from '../../app/contracts'
import './RiordinaSheet.css'

type Scelta = Gender | ''

/** Tre pulsanti a interruttore: la scelta del genere, per un gruppo o un torneo. */
function SceltaGenere({ label, value, onChange, piccola }: { label: string; value: Scelta; onChange: (g: Scelta) => void; piccola?: boolean }) {
  return (
    <div className="riordina-scelta" role="group" aria-label={label} data-piccola={piccola ? '' : undefined}>
      {GENDERS.map((g) => (
        <button key={g} type="button" aria-pressed={value === g} onClick={() => onChange(value === g ? '' : g)}>
          {g}
        </button>
      ))}
    </div>
  )
}

export default function RiordinaSheet({ gruppi, onSave, onClose, top, byTouch, opener, setDirty, setBusy }: RiordinaSheetProps) {
  // La scelta del gruppo parte dalla proposta; i singoli tornei seguono il
  // gruppo finché non li cambi tu.
  const iniziali = useMemo(() => Object.fromEntries(gruppi.map((g) => [g.key, (g.proposta?.genere ?? '') as Scelta])), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [perGruppo, setPerGruppo] = useState<Record<string, Scelta>>(iniziali)
  const [perTorneo, setPerTorneo] = useState<Record<string, Scelta>>({})
  const [aperti, setAperti] = useState<Record<string, boolean>>({})
  const [occupato, setOccupato] = useState(false)
  const idBase = useId()

  const sporco = JSON.stringify(perGruppo) !== JSON.stringify(iniziali) || Object.keys(perTorneo).length > 0
  useEffect(() => {
    setDirty(sporco)
  }, [sporco, setDirty])

  const totale = gruppi.reduce((n, g) => n + g.tornei.length, 0)
  const scelte = gruppi.flatMap((g) =>
    g.tornei
      .map((t) => ({ id: t.id, gender: (perTorneo[t.id] ?? perGruppo[g.key] ?? '') as Scelta }))
      .filter((x): x is { id: string; gender: Gender } => !!x.gender),
  )

  const salva = async () => {
    if (occupato) return
    if (!scelte.length) {
      onClose()
      return
    }
    setOccupato(true)
    setBusy(true)
    try {
      await onSave(scelte)
    } finally {
      setOccupato(false)
      setBusy(false)
    }
  }

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
          title="Riordina i tornei"
          sub={totale === 1 ? '1 torneo senza genere' : `${totale} tornei senza genere`}
          onCancel={onClose}
          cancelLabel="Dopo"
          cancelBusy={occupato}
          action={
            <Button variant="filled" busy={occupato} busyLabel="Salvataggio…" onClick={() => void salva()}>
              Fatto
            </Button>
          }
        />
      }
    >
      <div className="riordina">
        <p className="riordina-intro">Di solito con lo stesso compagno il torneo è dello stesso tipo: scegli per gruppo. Se uno era diverso, aprilo e cambialo.</p>
        <ul className="riordina-gruppi">
          {gruppi.map((g) => {
            const scelta = perGruppo[g.key] ?? ''
            const proposto = !!g.proposta && scelta === g.proposta.genere
            const idTornei = `${idBase}-${g.key}`
            return (
              <li key={g.key} className="riordina-gruppo">
                <div className="riordina-testa">
                  <span className="riordina-av" aria-hidden="true">{g.titolo.replace(/^Con /, '').charAt(0).toUpperCase()}</span>
                  <span className="riordina-nome">
                    <span className="riordina-titolo">{g.titolo}</span>
                    <span className="riordina-sub">{g.sub}</span>
                  </span>
                </div>
                <SceltaGenere
                  label={`Genere dei tornei: ${g.titolo.toLowerCase()}`}
                  value={scelta}
                  onChange={(v) => {
                    setPerGruppo((p) => ({ ...p, [g.key]: v }))
                    // La scelta del gruppo vale per tutti i suoi tornei: le eccezioni si azzerano.
                    setPerTorneo((p) => Object.fromEntries(Object.entries(p).filter(([id]) => !g.tornei.some((t) => t.id === id))))
                  }}
                />
                {proposto && <p className="riordina-perche">Proposto: {g.proposta!.motivo.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}. Lo salvo con «Fatto».</p>}
                {g.tornei.length > 1 && (
                  <button
                    type="button"
                    className="riordina-apri"
                    aria-expanded={!!aperti[g.key]}
                    aria-controls={idTornei}
                    onClick={() => setAperti((a) => ({ ...a, [g.key]: !a[g.key] }))}
                  >
                    {aperti[g.key] ? 'Chiudi i tornei' : `Uno era diverso? Mostra i ${g.tornei.length} tornei`}
                  </button>
                )}
                {g.tornei.length > 1 && aperti[g.key] && (
                  <ul className="riordina-tornei" id={idTornei}>
                    {g.tornei.map((t) => (
                      <li key={t.id} className="riordina-torneo">
                        <span className="riordina-nome">
                          <span className="riordina-titolo">{t.nome}</span>
                          <span className="riordina-sub">{t.meta}</span>
                        </span>
                        <SceltaGenere
                          piccola
                          label={`Genere di ${t.nome}`}
                          value={perTorneo[t.id] ?? scelta}
                          onChange={(v) => setPerTorneo((p) => ({ ...p, [t.id]: v }))}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {g.tornei.length === 1 && <p className="riordina-sub riordina-unico">{g.tornei[0].nome} · {g.tornei[0].meta}</p>}
              </li>
            )
          })}
        </ul>
        <p className="riordina-piede">Quelli che lasci vuoti contano solo in «Tutti». Puoi riaprire questo foglio dalle Statistiche.</p>
      </div>
    </Sheet>
  )
}
