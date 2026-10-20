// ============================================================================
// «I numeri li fa l'app» (UX §L6.5, §L7.7; MOTION §L5.10, LM7).
//
// Le cifre girano con `Odometro`, la stessa classe del Tabellone dell'app
// (`src/components/ui/Odometro.ts`): strisce in `translateY`, il valore
// vero nel testo nascosto da t0. Salgono da zero una volta per sessione,
// quando il numero entra in vista: tutte insieme (stessa causa, nessuno
// sfalsamento), con la barra vinte/perse che cresce dentro il binario.
// Già in vista all'avvio, già viste, o col fermo: valori finali, fermi.
// ============================================================================
import { Odometro } from '../../src/components/ui/Odometro'
import { arma } from './movimento'

/** Quando il numero da manifesto è visibile almeno così, i numeri salgono. */
const SOGLIA_NUMERI = 0.5

export function avviaNumeri() {
  const sezione = document.getElementById('numeri')
  const poster = sezione?.querySelector<HTMLElement>('.poster')
  if (!sezione || !poster) return
  const numeri = [...sezione.querySelectorAll<HTMLElement>('[data-odo]')].map((el) => {
    const finale = (el.textContent ?? '').trim()
    el.classList.add('ui-tabellone')
    // Il posto del valore finale (numeri.css): salendo, il «%» non si sposta.
    el.dataset.fin = finale
    const odo = new Odometro(el)
    odo.set(finale, false)
    return { odo, finale }
  })
  const zero = (t: string) => t.replace(/\d+/, (n) => '0'.repeat(Math.min(1, n.length)))
  sezione.setAttribute('data-viva', '')

  arma(poster, {
    chiave: 'numeri',
    soglia: SOGLIA_NUMERI,
    fuoco: sezione,
    // Armato fuori vista: a zero, senza transizione (nessuno lo vede). Il
    // valore per gli screen reader resta quello vero.
    prepara: () => {
      sezione.setAttribute('data-subito', '')
      for (const { odo, finale } of numeri) {
        odo.set(zero(finale), false)
        odo.annuncia(finale)
      }
      void sezione.offsetWidth
      sezione.removeAttribute('data-subito')
    },
    // Scatta: dal suo zero al valore, in RACCONTO; la barra torna alla sua
    // quota togliendo `data-armato` (lo fa `arma`).
    scatta: () => {
      for (const { odo, finale } of numeri) odo.set(finale, true)
    },
    finale: () => {
      for (const { odo, finale } of numeri) odo.set(finale, false)
    },
  })
}
