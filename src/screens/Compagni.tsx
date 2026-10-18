// ============================================================================
// Compagni (UX §5 F7, §6.6): la griglia delle persone con cui giochi. Ogni
// card è un `<article>` col nome come link (UX §7.6): tutta la card si tocca,
// una sola fermata di Tab, il contenuto resta leggibile.
// ============================================================================
import type { CompagniProps } from '../app/contracts'
import { Avatar, Button, Card, CardGrid, CardLink, EmptyState, IconButton, NavBar, Page, StatFooter } from '../components/ui/index'
import './Compagni.css'

export default function Compagni({ compagni, traccia, onNuovoCompagno }: CompagniProps) {
  return (
    <Page>
      <NavBar
        title="Compagni"
        subtitle={compagni.length ? 'Con chi giochi meglio' : undefined}
        actions={<IconButton icon="plus" label="Nuovo compagno" onClick={onNuovoCompagno} />}
      />
      {compagni.length === 0 ? (
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
            {compagni.map((p) => {
              const meta = `compagno-meta-${p.id}`
              return (
                <li key={p.id} className="compagni-item">
                  <Card traccia={traccia === p.id}>
                    <div className="compagni-head">
                      <Avatar name={p.name} size={48} />
                      <div className="compagni-who">
                        <CardLink to={{ name: 'compagno', id: p.id }} describedBy={meta}>
                          {p.name}
                        </CardLink>
                        <p id={meta} className="compagni-meta">
                          {p.played === 1 ? '1 partita insieme' : `${p.played} partite insieme`}
                        </p>
                      </div>
                    </div>
                    <StatFooter
                      items={[
                        { value: `${p.winPct}%`, label: 'vittorie', tone: p.played > 0 ? 'win' : undefined },
                        { value: p.won, label: 'vinte' },
                        { value: p.lost, label: 'perse' },
                      ]}
                    />
                  </Card>
                </li>
              )
            })}
          </CardGrid>
        </>
      )}
    </Page>
  )
}
