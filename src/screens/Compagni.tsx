// ============================================================================
// Compagni (UX §5 F7, §6.6; il redesign, versione D): le persone con cui
// giochi. Il titolo apre la pagina (schermata radice, nessuna barra) con
// «＋ Nuovo» di vetro a destra.
//
// Ogni card è un `<article>` col nome come link (UX §7.6): tutta la card si
// tocca, una sola fermata di Tab, il contenuto resta leggibile. Sopra l'avatar
// e il nome (con «Collegato» se il compagno è legato a un utente), sotto il
// filo la riga dei numeri: vittorie in arancio, vinte, perse.
//
// In fondo la card che porta a «Chi c'è oggi», se la funzione è accesa.
// ============================================================================
import type { CSSProperties } from 'react'
import type { CompagniProps } from '../app/contracts'
import { OGGI_ATTIVO } from '../app/routes'
import { Avatar, Badge, Button, Card, CardGrid, CardLink, EmptyState, Icon, NavBar, Page, StatFooter } from '../components/ui/index'
import './Compagni.css'

const partite = (n: number) => (n === 1 ? '1 partita insieme' : `${n} partite insieme`)
const salita = (i: number) => ({ '--rise-i': i }) as CSSProperties

export default function Compagni({ compagni, collegati, traccia, onNuovoCompagno }: CompagniProps) {
  const vuoto = compagni.length === 0
  return (
    <Page className="compagni-page">
      <NavBar
        title="Compagni"
        subtitle={vuoto ? undefined : 'Con chi giochi meglio'}
        aside={
          // «Nuovo» a vista, «Nuovo compagno» per gli screen reader: il nome
          // comincia con l'etichetta (WCAG 2.5.3).
          <Button variant="glass" size="sm" icon="plus" aria-label="Nuovo compagno" onClick={onNuovoCompagno}>
            Nuovo
          </Button>
        }
      />
      {vuoto ? (
        <EmptyState
          variant="primo"
          zero="Compagni"
          title="Nessun compagno ancora."
          text="Aggiungi le persone con cui giochi: vedrai con chi vinci di più."
          action={<Button variant="filled" icon="plus" onClick={onNuovoCompagno}>Aggiungi un compagno</Button>}
        />
      ) : (
        <>
          {/* Le card hanno il nome in un h3 (UX §7.6): senza un h2 in mezzo
              l'indice dei titoli saltava dal h1 della pagina al h3. */}
          <h2 className="sr-only">I tuoi compagni</h2>
          <CardGrid min="narrow" className="compagni-grid" label="I tuoi compagni">
            {compagni.map((p, i) => {
              const meta = `compagno-meta-${p.id}`
              return (
                <li key={p.id} className="compagni-item rise" style={salita(i + 1)}>
                  <Card className="compagni-card" traccia={traccia === p.id}>
                    <div className="compagni-head">
                      <Avatar name={p.name} size={48} />
                      <div className="compagni-who">
                        <div className="compagni-name">
                          <CardLink to={{ name: 'compagno', id: p.id }} describedBy={meta}>
                            {p.name}
                          </CardLink>
                          {collegati?.has(p.id) && <Badge>Collegato</Badge>}
                        </div>
                        <p id={meta} className="compagni-meta">{partite(p.played)}</p>
                      </div>
                      <Icon name="chevron-right" size={16} className="compagni-chev" />
                    </div>
                    <StatFooter
                      items={[
                        { value: `${p.winPct}%`, label: 'vittorie', tone: p.played > 0 ? 'win' : undefined },
                        { value: p.won, label: 'vinte' },
                        // Le perse in --ink-2: contano, ma non sono il dato.
                        { value: <span className="compagni-perse">{p.lost}</span>, label: 'perse' },
                      ]}
                    />
                  </Card>
                </li>
              )
            })}
          </CardGrid>
        </>
      )}

      {/* La salita sta sul contenitore: l'animazione, finita, terrebbe fermo
          il `transform` della card e la pressione non si vedrebbe più. */}
      {OGGI_ATTIVO && (
        <div className="compagni-oggi-wrap rise" style={salita(compagni.length + 1)}>
          <Card as="div" className="compagni-oggi">
            <span className="compagni-oggi-icon" aria-hidden="true">
              <Icon name="sun" size={24} />
            </span>
            <div className="compagni-oggi-text">
              <CardLink to={{ name: 'oggi' }} level={2} describedBy="compagni-oggi-sub" className="compagni-oggi-title">
                Chi c'è in spiaggia oggi?
              </CardLink>
              <p id="compagni-oggi-sub" className="compagni-meta">Fai check-in e trova un compagno sul posto</p>
            </div>
            <Icon name="chevron-right" size={16} className="compagni-chev" />
          </Card>
        </div>
      )}
    </Page>
  )
}
