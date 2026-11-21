// ============================================================================
// Dettaglio di una tappa del Campionato per Società `/campionato/:id`.
//
// La stessa forma del dettaglio torneo (medaglia e titolo, tabellone 3×2,
// partite, la barra di vetro in fondo), con i numeri del CIPS: punti di
// coppia, punti alla società, record, partite, set, differenziale. I numeri
// sono SOLO della tappa: non entrano in nessuna statistica dei tornei.
// Niente foto né Storia Instagram: per ora sono dei tornei.
// ============================================================================
import { Medal } from '../components/ui/Medal'
import { Badge, ButtonLink, Button, Card, EmptyState, IconButton, List, MatchRow, NavBar, Page, Section, StatGrid, StatTile } from '../components/ui/index'
import type { TappaDetailProps } from '../app/contracts'
import './TappaDetail.css'

export default function TappaDetail({ t, back, traccia, onAddPartita, onOpenMatch, onModifica }: TappaDetailProps) {
  if (!t) {
    return (
      <Page width="reading" className="tappa-page">
        <NavBar title="Tappa non trovata" back={back} backIcon />
        <div className="tappa-missing rise">
          <p className="tappa-missing-text">Potrebbe essere stata eliminata.</p>
          <ButtonLink to={{ name: 'campionato' }} variant="glass">Vai al Campionato</ButtonLink>
        </div>
      </Page>
    )
  }

  const rise = `tappa:${t.id}`
  return (
    <Page width="reading" className={traccia === t.id ? 'tappa-page tappa-traccia' : 'tappa-page'}>
      <NavBar
        title={t.nome}
        back={back}
        backIcon
        eyebrow={<Medal placement={t.medaglia} size="lg" />}
        kicker={t.kicker}
        subtitle={t.sottotitolo}
        actions={<IconButton icon="pencil" iconSize={20} label="Modifica tappa" onClick={onModifica} />}
      />

      {t.tag.length > 0 && (
        <p className="tappa-tags rise">
          {t.tag.map((x) => (
            <Badge key={x}>{x}</Badge>
          ))}
        </p>
      )}

      <StatGrid cols={6} className="tappa-stats rise" label="I numeri della tappa">
        <StatTile value={t.numeri.puntiCoppia} label="punti di coppia" tone="win" rise={rise} />
        <StatTile value={t.numeri.societa} label="alla società" rise={rise} />
        <StatTile value={t.numeri.record} label="record" rise={rise} />
        <StatTile value={t.numeri.partite} label="partite" rise={rise} />
        <StatTile value={t.numeri.set} label="set" rise={rise} />
        <StatTile value={t.numeri.diff} label="differenziale" rise={rise} />
      </StatGrid>

      <Section id="tappa-partite" title="Partite" className="tappa-sez rise">
        {t.conPartite ? (
          <List className="tappa-partite" label="Partite della tappa">
            {t.partite.map((p) => (
              <MatchRow
                key={p.id}
                esitoShort={p.esitoShort}
                esitoColor={p.esitoColor}
                title={p.titolo}
                detail={p.dettaglio || undefined}
                sets={p.sets}
                note={p.note || undefined}
                onClick={() => onOpenMatch(p.id)}
                traccia={traccia === p.id}
              />
            ))}
          </List>
        ) : (
          <Card as="div" className="tappa-vuoto">
            <EmptyState icon="ball" level={3} title="Nessuna partita ancora." text="Segna i risultati della tappa: pool, tabellone e finali, ognuna con la società delle avversarie." />
          </Card>
        )}
      </Section>

      <div className="tappa-azioni">
        <Button size="lg" icon="plus" className="tappa-aggiungi" onClick={onAddPartita}>
          Aggiungi partita
        </Button>
      </div>
    </Page>
  )
}
