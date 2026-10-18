// ============================================================================
// Riga partita (UX §7.6, ART_DIRECTION §4.5 e §8): cerchio V/P a sinistra,
// nome e dettaglio al centro, pastiglie dei set a destra.
//
// - Interattiva: `<button>` SENZA `aria-label`: il nome si compone dal
//   contenuto («Ottavi · vs Bianchi, Vinta, 21-17 21-19»).
// - Non interattiva (sola lettura, riscontri di ricerca): `<div>`, cursore
//   normale, nessun effetto.
// I colori arrivano dalla lib (`esitoColor`, `setChips`) come letterali della
// palette vecchia e si leggono come SEGNALI con `dataTone`.
// ============================================================================
import type { ReactNode } from 'react'
import { dataTone } from '../../lib/theme'
import './MatchRow.css'

export interface SetChipView {
  txt: string
  bg: string
  color: string
}

export interface MatchRowProps {
  esitoShort: string
  esitoColor: string
  title: ReactNode
  detail?: ReactNode
  sets: SetChipView[]
  note?: string
  onClick?: () => void
  /** Sola lettura (torneo condiviso): la riga non si apre. */
  readOnly?: boolean
  traccia?: boolean
}

function Content({ esitoShort, esitoColor, title, detail, sets, note }: MatchRowProps) {
  const vinta = dataTone(esitoColor) === 'win' || esitoShort === 'V'
  return (
    <>
      <span className="ui-match-main">
        <span className="ui-esito" data-win={vinta ? '' : undefined} aria-hidden="true">{esitoShort}</span>
        <span className="ui-match-who">
          <span className="ui-match-title">{title}</span>
          {detail && <span className="ui-match-detail">{detail}</span>}
        </span>
        <span className="sr-only">{vinta ? 'Vinta' : 'Persa'}</span>
        <span className="ui-match-sets">
          {sets.map((c, i) => (
            <span key={i} className="ui-set" data-win={dataTone(c.bg) === 'win' ? '' : undefined}>
              {c.txt}
            </span>
          ))}
        </span>
      </span>
      {note && <span className="ui-match-note">{note}</span>}
    </>
  )
}

export function MatchRow(props: MatchRowProps) {
  const { onClick, readOnly, traccia } = props
  const interattiva = !!onClick && !readOnly
  return (
    <li className="ui-list-item">
      {traccia && <span className="traccia" aria-hidden="true" />}
      {interattiva ? (
        <button type="button" className="ui-row ui-match" onClick={onClick}>
          <Content {...props} />
        </button>
      ) : (
        <div className="ui-row ui-match" data-static="">
          <Content {...props} />
        </div>
      )}
    </li>
  )
}
