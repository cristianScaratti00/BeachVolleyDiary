// ============================================================================
// «Non trovato» (UX §4.5, §6.4, §6.6): un percorso che non porta da nessuna
// parte, o un torneo/compagno eliminato o non più condiviso. Mai la lista al
// suo posto (C9): il titolo (h1) dice cosa manca, sotto il perché e il
// pulsante che porta dove andare.
// ============================================================================
import type { NonTrovatoProps } from '../app/contracts'
import { NavBar, Page, Icon } from '../components/ui/index'
import './NonTrovato.css'

export default function NonTrovato({ titolo, testo, azione, back }: NonTrovatoProps) {
  return (
    <Page width="reading">
      <NavBar title={titolo} back={back} />
      <div className="nontrovato-body">
        <Icon name="alert" size={24} className="nontrovato-icon" />
        <p className="nontrovato-text">{testo}</p>
        <div className="nontrovato-action">{azione}</div>
      </div>
    </Page>
  )
}
