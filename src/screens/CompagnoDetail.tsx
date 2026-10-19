// ============================================================================
// Dettaglio compagno (UX §5 F7, §6.6). Presentazionale: collegare, scollegare
// ed eliminare li chiede alla shell, che apre lo sheet o il ConfirmDialog.
// La ricerca dell'utente da collegare vive in CollegaSheet.
//
// `cp === null` è lo stato "non trovato" (eliminato, oppure un id che non è
// tuo): mai la lista al suo posto (C9).
// ============================================================================
import type { CompagnoDetailProps } from '../app/contracts'
import {
  Avatar,
  ButtonLink,
  EmptyState,
  IconButton,
  List,
  ListGroup,
  ListRow,
  MatchRow,
  NavBar,
  Note,
  Page,
  Section,
  StatGrid,
  StatTile,
} from '../components/ui/index'
import './CompagnoDetail.css'

export default function CompagnoDetail({ cp, linked, back, traccia, onOpenMatch, onCollega, onScollega, onMenu }: CompagnoDetailProps) {
  if (!cp) {
    return (
      <Page>
        <NavBar title="Compagno non trovato" back={back} />
        <EmptyState
          icon="alert"
          title="Questo compagno non c'è più"
          text="Potrebbe essere stato eliminato, o non è uno dei tuoi compagni."
          action={<ButtonLink to={{ name: 'compagni' }} variant="tinted">Vai ai compagni</ButtonLink>}
        />
      </Page>
    )
  }

  const senzaPartite = cp.played === 0 || cp.matches.length === 0
  return (
    <Page>
      <NavBar
        title={cp.name}
        back={back}
        eyebrow={<Avatar name={cp.name} size={64} />}
        subtitle={`${cp.played === 1 ? '1 partita insieme' : `${cp.played} partite insieme`} · ${cp.won} ${cp.won === 1 ? 'vinta' : 'vinte'}`}
        actions={
          <IconButton
            icon="ellipsis"
            label="Altre azioni"
            aria-haspopup="menu"
            onClick={(e) => onMenu(e.currentTarget)}
          />
        }
      />

      <ListGroup title="Condivisione" id="compagno-condivisione" className="compagno-share">
        {linked ? (
          <>
            <ListRow
              icon="check-circle"
              title="Collegato a un utente"
              subtitle="I tornei giocati con questo compagno sono condivisi con il suo account."
              traccia={traccia === 'collegato'}
            />
            <ListRow tone="danger" title="Scollega" onClick={onScollega} />
          </>
        ) : (
          <ListRow
            icon="link"
            title="Collega a un utente"
            subtitle="Per condividere i tornei giocati insieme."
            onClick={onCollega}
          />
        )}
      </ListGroup>

      {senzaPartite ? (
        <Note className="compagno-vuoto">Ancora nessuna partita insieme.</Note>
      ) : (
        <>
          <div className="compagno-stats">
            <StatGrid cols={4} label="Statistiche insieme">
              <StatTile value={`${cp.winPct}%`} label="win rate" tone="win" rise={`compagno:${cp.name}`} />
              <StatTile value={`${cp.setPct}%`} label="set vinti" rise={`compagno:${cp.name}`} />
              <StatTile value={cp.diffStr} label="differenziale" rise={`compagno:${cp.name}`} />
              <StatTile value={cp.streak} label="serie record" rise={`compagno:${cp.name}`} />
            </StatGrid>
          </div>
          <Section title="Partite insieme" id="compagno-partite">
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
    </Page>
  )
}
