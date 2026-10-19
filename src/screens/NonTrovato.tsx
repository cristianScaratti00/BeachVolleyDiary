// ============================================================================
// «Non trovato» (UX §4.5, §6.4, §6.6): un percorso che non porta da nessuna
// parte, o un torneo/compagno eliminato o non più condiviso. Mai la lista al
// suo posto (C9): il titolo (h1) dice cosa manca, sotto — nella card, con
// Pallo sorpreso (occhi grandi, bocca a O: «qui non c'è niente!»), come il
// ringraziamento di Segnala — il perché e il pulsante che porta dove andare.
// Non «preoccupato»: con le sopracciglia giù sembra arrabbiato, e qui
// nessuno ha sbagliato.
// ============================================================================
import type { CSSProperties } from 'react'
import type { NonTrovatoProps } from '../app/contracts'
import { NavBar, Page } from '../components/ui/index'
import { Pallo } from '../components/Pallo'
import './NonTrovato.css'

export default function NonTrovato({ titolo, testo, azione, back }: NonTrovatoProps) {
  return (
    <Page width="reading" className="nontrovato">
      <NavBar title={titolo} back={back} />
      <section className="nontrovato-body rise" style={{ '--rise-i': 1 } as CSSProperties} aria-label="Cosa è successo">
        <Pallo umore="sorpreso" size={88} ombra={false} segui />
        <p className="nontrovato-text">{testo}</p>
        <div className="nontrovato-action">{azione}</div>
      </section>
    </Page>
  )
}
