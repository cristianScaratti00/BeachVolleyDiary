// ============================================================================
// Solby nell'accesso: al posto del tramonto animato, la mascotte dell'app
// sulla carta, ferma, che dice a che cosa serve il diario.
//
//   - Benvenuto: Solby in piedi su una card dell'app, che cambia col
//     messaggio del carosello. Il diario (un torneo e la sua finale), i
//     numeri (le partite vinte, come in Home), i compagni. L'umore va col
//     messaggio: saluta, cool, cuori.
//   - Accedi e Registrati: Solby da solo, più grande, con l'umore del
//     momento (occhiolino; pensa sul nome, contento sull'ultimo passo).
//
// Le card sono i componenti veri dell'app (Card, Medal, MatchRow, Tabellone,
// Avatar) coi dati del diario di prova: la schermata mostra l'app com'è.
// Decorativa (`aria-hidden`): quello che dice lo dicono i titoli accanto.
// Quando l'altezza non basta (un telefono piccolo, la tastiera su) se ne va
// prima la card, poi Solby (Login.solby.css).
// ============================================================================
import type { CSSProperties } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Pallo } from '../components/Pallo'
import type { PalloUmore } from '../components/Pallo'
import { Avatar, Badge, Card, MatchRow, Tabellone } from '../components/ui/index'
import { Medal } from '../components/ui/Medal'
import { ENTRATA, SVELTO } from '../components/Motion'
import './Login.solby.css'

export type Momento = 'diario' | 'numeri' | 'compagni' | 'accedi' | 'nome' | 'credenziali'

const UMORE: Record<Momento, PalloUmore> = {
  diario: 'saluta',
  numeri: 'cool',
  compagni: 'cuori',
  accedi: 'occhiolino',
  nome: 'pensa',
  credenziali: 'contento',
}

/** Il set vinto e la partita vinta, nei colori della libreria dei dati (`dataTone`). */
const VINTO = { bg: '#FFF1EA', color: '#C4501E' }

export function SolbyAccesso({ momento }: { momento: Momento }) {
  const conCarta = momento === 'diario' || momento === 'numeri' || momento === 'compagni'
  return (
    <div className="accesso-solby" data-carta={conCarta ? '' : undefined} aria-hidden="true">
      <div className="solby">
        <Pallo umore={UMORE[momento]} size={conCarta ? 116 : 148} ombra className="solby-pallo" />
        {conCarta && (
          <div className="solby-carte">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div
                key={momento}
                className="solby-carta-posto"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: ENTRATA }}
                exit={{ opacity: 0, transition: SVELTO }}
              >
                {momento === 'diario' ? <CartaDiario /> : momento === 'numeri' ? <CartaNumeri /> : <CartaCompagni />}
              </m.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

/** Un torneo del diario: la medaglia, il nome, il record, e la finale coi set. */
function CartaDiario() {
  return (
    <Card as="div" className="solby-carta">
      <div className="solby-torneo">
        <Medal placement="1° 🏆" size="md" />
        <span className="solby-testo">
          <span className="solby-nome">Cervia Beach Party</span>
          <span className="solby-meta">8 ott · con Giulia</span>
        </span>
        <span className="solby-record">2–0</span>
      </div>
      <ul className="solby-lista">
        <MatchRow
          esitoShort="V"
          esitoColor={VINTO.color}
          title="Finale"
          detail="vs Conti / Gallo"
          sets={[
            { txt: '21–15', ...VINTO },
            { txt: '21–18', ...VINTO },
          ]}
        />
      </ul>
    </Card>
  )
}

/** I numeri della stagione, come la card del rendimento in Home. */
function CartaNumeri() {
  return (
    <Card as="div" className="solby-carta">
      <div className="solby-numeri">
        <span className="solby-testo">
          <span className="solby-etichetta">Partite vinte</span>
          <span className="solby-pct">
            <Tabellone value={63} size="hero" rise="accesso" />
            <span className="solby-pct-s">%</span>
          </span>
        </span>
        <span className="solby-scarto">
          <span className="solby-scarto-n">+36</span>
          <span className="solby-etichetta">punti di scarto</span>
        </span>
      </div>
      <div className="solby-barra">
        <span data-v="" style={{ flexGrow: 5 } as CSSProperties} />
        <span style={{ flexGrow: 3 } as CSSProperties} />
      </div>
      <div className="solby-piede">
        <span><strong>5</strong> vinte</span>
        <span>3 perse · 8 giocate</span>
      </div>
    </Card>
  )
}

/** Con chi giochi meglio: due compagni, uno collegato all'app. */
function CartaCompagni() {
  return (
    <Card as="div" className="solby-carta">
      <div className="solby-compagni">
        {[
          { nome: 'Giulia', partite: '5 partite insieme', pct: '60%', collegato: false },
          { nome: 'Marco', partite: '1 partita insieme', pct: '100%', collegato: true },
        ].map((c) => (
          <div key={c.nome} className="solby-compagno">
            <Avatar name={c.nome} size={40} />
            <span className="solby-testo">
              <span className="solby-nome">
                {c.nome}
                {c.collegato && <Badge>Collegato</Badge>}
              </span>
              <span className="solby-meta">{c.partite}</span>
            </span>
            <span className="solby-quanto">
              <span className="solby-quanto-n">{c.pct}</span>
              <span className="solby-etichetta">vittorie</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
