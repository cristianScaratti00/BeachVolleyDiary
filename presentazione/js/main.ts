// ============================================================================
// La landing /presentazione, a pagina viva. Niente React né Supabase: chi la
// apre non scarica l'app (vite.config.ts). La versione ferma è l'HTML; questo
// modulo la arricchisce, una parte alla volta.
//
// Ogni parte si avvia nel suo try/catch (UX §L6.0): un errore non tocca le
// altre, e la sezione che non parte resta nella sua versione di base, che si
// legge per intero. «Chi arma, arma per ultimo» (MOTION §L8): gli stati di
// partenza si scrivono solo con gli observer già in piedi.
// ============================================================================
import { avviaMovimento, avviaSalti, avviaScroll } from './movimento'
import { avviaSezioni } from './sezioni'
import { avviaNav } from './nav'
import { avviaGuida } from './guida'
import { avviaAvanzamento, avviaDiario, avviaEroe, avviaFinale, avviaFuoriVista, avviaMappa, avviaRiaggancio, avviaWrapped } from './scene'
import { avviaRegistra } from './chat'
import { avviaLive } from './live'
import { avviaNumeri } from './numeri'
import { avviaInstalla } from './install'

const PARTI: [string, () => void][] = [
  ['movimento', avviaMovimento],
  ['scroll', avviaScroll],
  ['salti', avviaSalti],
  ['riaggancio', avviaRiaggancio],
  ['fuori vista', avviaFuoriVista],
  ['eroe', avviaEroe],
  ['avanzamento', avviaAvanzamento],
  ['diario', avviaDiario],
  ['registra', avviaRegistra],
  ['live', avviaLive],
  ['numeri', avviaNumeri],
  ['mappa', avviaMappa],
  ['wrapped', avviaWrapped],
  ['finale', avviaFinale],
  ['installa', avviaInstalla],
  ['nav', avviaNav],
  ['guida', avviaGuida],
  // Per ultime le sezioni: la loro prima notizia trova barra e guida già in ascolto.
  ['sezioni', avviaSezioni],
]

function avvia() {
  for (const [nome, parte] of PARTI) {
    try {
      parte()
    } catch (e) {
      console.error(`[landing] ${nome}:`, e)
    }
  }
  // «Il diario resta tuo» non ha niente da accendere: è viva così com'è.
  document.getElementById('dati')?.setAttribute('data-viva', '')
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia, { once: true })
else avvia()
