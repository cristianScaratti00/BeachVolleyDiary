// ============================================================================
// Dettaglio compagno (UX §5 F7, §6.6; il redesign, versione D).
// Presentazionale: collegare, scollegare ed eliminare li chiede alla shell,
// che apre lo sheet o il ConfirmDialog. La ricerca dell'utente da collegare
// vive in CollegaSheet.
//
// In cima la pillola di vetro «‹ Compagni»; il titolo ha l'avatar a sinistra.
// Poi la card del collegamento (stato + «Scollega», o l'invito a collegarlo),
// il tabellone 2×2, le partite giocate insieme e, in fondo, «Elimina
// compagno» di vetro rosso: il menu «⋯» di prima aveva solo quella voce.
//
// `cp === null` è lo stato "non trovato" (eliminato, oppure un id che non è
// tuo): mai la lista al suo posto (C9).
// ============================================================================
import { useId } from 'react'
import type { CompagnoDetailProps } from '../app/contracts'
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  List,
  MatchRow,
  NavBar,
  Page,
  Section,
  StatGrid,
  StatTile,
} from '../components/ui/index'
import './CompagnoDetail.css'

export default function CompagnoDetail({ cp, linked, back, traccia, onOpenMatch, onCollega, onScollega, onElimina }: CompagnoDetailProps) {
  const id = useId()
  if (!cp) {
    return (
      <Page width="reading">
        <NavBar title="Compagno non trovato" back={back} />
        <EmptyState
          icon="alert"
          title="Questo compagno non c'è più"
          text="Potrebbe essere stato eliminato, o non è uno dei tuoi compagni."
          action={<ButtonLink to={{ name: 'compagni' }} variant="glass">Vai ai compagni</ButtonLink>}
        />
      </Page>
    )
  }

  const senzaPartite = cp.played === 0 || cp.matches.length === 0
  return (
    <Page width="reading" className="compagno-page">
      <NavBar
        title={cp.name}
        back={back}
        eyebrow={<Avatar name={cp.name} size={68} />}
        subtitle={`${cp.played === 1 ? '1 partita insieme' : `${cp.played} partite insieme`} · ${cp.won} ${cp.won === 1 ? 'vinta' : 'vinte'}`}
      />

      <Card as="section" className="compagno-link rise" aria-labelledby={`${id}-l`} traccia={traccia === 'collegato'}>
        <div className="compagno-link-text">
          <h2 id={`${id}-l`} className="compagno-link-title">
            <span className="compagno-link-dot" data-on={linked ? '' : undefined} aria-hidden="true" />
            {linked ? 'Collegato a un utente' : 'Non collegato'}
          </h2>
          <p className="compagno-link-sub">
            {linked
              ? 'I tornei giocati insieme sono condivisi con il suo account.'
              : 'Collegalo al suo account per condividere i tornei giocati insieme.'}
          </p>
        </div>
        {linked ? (
          <Button variant="glass" size="sm" onClick={onScollega}>Scollega</Button>
        ) : (
          <Button variant="glass" size="sm" icon="link" onClick={onCollega}>Collega</Button>
        )}
      </Card>

      {senzaPartite ? (
        <Card as="div" className="compagno-vuoto rise">
          <p>Ancora nessuna partita insieme.</p>
        </Card>
      ) : (
        <>
          <StatGrid cols={4} className="compagno-stats rise" label="Statistiche insieme">
            <StatTile value={`${cp.winPct}%`} label="vittorie" tone="win" rise={`compagno:${cp.name}`} />
            <StatTile value={`${cp.setPct}%`} label="set vinti" rise={`compagno:${cp.name}`} />
            <StatTile value={cp.diffStr} label="differenziale" rise={`compagno:${cp.name}`} />
            <StatTile value={cp.streak} label="serie record" rise={`compagno:${cp.name}`} />
          </StatGrid>
          <Section title="Partite insieme" id="compagno-partite" className="compagno-sez rise">
            <List label="Partite insieme">
              {cp.matches.map((m) => (
                <MatchRow
                  key={m.id}
                  esitoShort={m.esitoShort}
                  esitoColor={m.esitoColor}
                  title={m.tournamentName}
                  detail={`${m.phase} · vs ${m.opponents}`}
                  sets={m.setChips}
                  onClick={() => onOpenMatch(m.id)}
                  traccia={traccia === m.id}
                />
              ))}
            </List>
          </Section>
        </>
      )}

      <div className="compagno-elimina rise">
        <Button variant="glass" tone="danger" onClick={onElimina}>Elimina compagno</Button>
      </div>
    </Page>
  )
}
