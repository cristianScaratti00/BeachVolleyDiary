// ============================================================================
// Le sezioni della landing che si usano (UX.md §L6.2–§L6.9, §L7.5–§L7.10,
// §L14.2): «Cosa registriamo?» con la mini chat, la demo di Partita live, i
// numeri che salgono una volta, la mappa, Wrapped e la Storia, le immagini
// del telefono, il finale. Gli stati sono quelli dell'inventario di §L6:
// pronta fuori vista, in vista la prima volta, già vista, deep link, fermo.
//
// L'harness è src/test/landing.ts: scroll a passi, tempo finto, moduli veri.
// ============================================================================
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/dom'
import { montaLanding, ultimo } from './landing'
import type { Landing, OpzioniLanding } from './landing'
import { DATI } from '../../presentazione/js/generati/dati'
import { FINE } from '../../presentazione/js/chat.passi'
import { INTRO, RIPARTENZA, battitura } from '../screens/crea/copione'

let h: Landing | null = null
const monta = async (o: OpzioniLanding = {}) => (h = await montaLanding(o))
afterEach(() => {
  h?.smonta()
  h = null
})
const FERMO = { locale: { bvd_landing_fermo: '1' } }

// ------------------------------------------------------ Cosa registriamo?
describe('«Cosa registriamo?»: le voci del ＋ (UX §L6.3, §L7.9)', () => {
  const lista = () => screen.getByRole('tablist', { name: 'Cosa registriamo?' })
  const voce = (nome: RegExp) => within(lista()).getByRole('tab', { name: nome })

  it('una tablist verticale; «Raccontalo a Pallo» scelta di serie, l\'unica nel giro del Tab', async () => {
    await monta()
    expect(lista()).toHaveAttribute('aria-orientation', 'vertical')
    const tabs = within(lista()).getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(voce(/Raccontalo a Pallo/)).toHaveAttribute('aria-selected', 'true')
    expect(tabs.filter((t) => t.tabIndex === 0)).toEqual([voce(/Raccontalo a Pallo/)])
    expect(screen.getByRole('tabpanel', { name: /Raccontalo a Pallo/ })).toBeVisible()
    for (const t of tabs.filter((t) => t !== voce(/Raccontalo a Pallo/))) expect(t).toHaveAttribute('aria-selected', 'false')
  })

  it('↑ ↓ Home e Fine scelgono subito, e il pannello è quello della voce', async () => {
    await monta()
    voce(/Raccontalo a Pallo/).focus()
    await h!.user.keyboard('{ArrowDown}')
    expect(voce(/Partita live/)).toHaveFocus()
    expect(voce(/Partita live/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: /Partita live/ })).toBeVisible()
    expect(screen.queryByRole('tabpanel', { name: /Raccontalo a Pallo/ })).toBeNull()
    await h!.user.keyboard('{ArrowDown}')
    expect(voce(/^Torneo Luogo/)).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('img', { name: /Il foglio «Nuovo torneo» dell'app/ })).toBeInTheDocument()
    await h!.user.keyboard('{End}')
    expect(voce(/Raccontalo a Pallo/)).toHaveFocus()
    await h!.user.keyboard('{Home}')
    expect(voce(/Partita live/)).toHaveFocus()
    await h!.user.keyboard('{ArrowUp}')
    expect(voce(/Raccontalo a Pallo/)).toHaveFocus()
    expect(within(lista()).getAllByRole('tab').filter((t) => t.tabIndex === 0)).toEqual([voce(/Raccontalo a Pallo/)])
  })

  it('un tocco sceglie la voce; «Provala qui sotto» salta a #live col fuoco al titolo', async () => {
    await monta()
    await h!.user.click(voce(/Torneo rapido/))
    expect(screen.getByRole('tabpanel', { name: /Torneo rapido/ })).toHaveTextContent('Nome e piazzamento, i dettagli dopo.')
    await h!.user.click(voce(/Partita live/))
    await h!.user.click(screen.getByRole('link', { name: 'Provala qui sotto' }))
    await h!.passa(50)
    expect(screen.getByRole('heading', { level: 2, name: 'Partita live' })).toHaveFocus()
    expect(h!.y).toBe(h!.cima('live'))
  })

  it('il ＋ si arma fuori vista e si apre una volta, quando entra in vista', async () => {
    await monta()
    const piu = document.querySelector('.registra-piu') as HTMLElement
    expect(piu).toHaveAttribute('data-armato')
    await h!.scorri('registra')
    expect(piu).not.toHaveAttribute('data-armato')
    expect(piu).toHaveAttribute('data-aperto')
    expect(JSON.parse(sessionStorage.getItem('bvd_landing_visti') ?? '[]')).toContain('registra')
  })

  it('armato, il fuoco che arriva sulle voci lo apre subito, senza aspettare la soglia (RL4)', async () => {
    await monta()
    const piu = document.querySelector('.registra-piu') as HTMLElement
    expect(piu).toHaveAttribute('data-armato')
    voce(/Raccontalo a Pallo/).focus()
    expect(piu).not.toHaveAttribute('data-armato')
  })

  it('già visto nella sessione, o col movimento fermo: aperto da subito, mai armato', async () => {
    await monta({ sessione: { bvd_landing_visti: '["registra"]' } })
    expect(document.querySelector('.registra-piu')).not.toHaveAttribute('data-armato')
    h!.smonta()
    await monta(FERMO)
    expect(document.querySelector('.registra-piu')).not.toHaveAttribute('data-armato')
  })
})

// ------------------------------------------------------- la mini chat
describe('«Raccontalo a Pallo»: la mini chat (UX FL4, §L6.3)', () => {
  const log = () => screen.getByRole('log', { name: 'Conversazione con Pallo' })
  const risposte = () => screen.getByRole('group', { name: 'Le tue risposte' })
  const bolle = () => within(log()).getAllByRole('listitem').filter((li) => li.getAttribute('aria-hidden') !== 'true').map((li) => li.textContent)
  const rispondi = async (nome: string) => {
    await h!.user.click(within(risposte()).getByRole('button', { name: nome }))
    await h!.passa(800)
  }

  it('l\'apertura è già scritta, senza pausa, e sotto le prime risposte rapide', async () => {
    await monta()
    expect(bolle()).toEqual(INTRO)
    expect(within(risposte()).getAllByRole('button').map((b) => b.textContent)).toEqual([...DATI.chat.tornei])
  })

  it('una risposta: l\'eco a destra, il fuoco al gruppo che aspetta (aria-busy), Pallo «pensa», poi la domanda vera', async () => {
    await monta()
    const [torneo] = DATI.chat.tornei
    await h!.user.click(within(risposte()).getByRole('button', { name: torneo }))
    expect(ultimo(bolle())).toBe(torneo)
    expect(ultimo(within(log()).getAllByRole('listitem'))).toHaveAttribute('data-chi', 'tu')
    expect(risposte()).toHaveFocus()
    expect(risposte()).toHaveAttribute('aria-busy', 'true')
    expect(within(risposte()).queryAllByRole('button')).toHaveLength(0)
    expect(document.querySelector('.chat-avatar svg')).toHaveAttribute('data-umore', 'pensa')
    // I tre puntini sono per gli occhi: il log non li legge.
    expect(log().querySelector('.msg-scrive')).toHaveAttribute('aria-hidden', 'true')
    const domanda = `Perfetto, «${torneo}». Con chi hai giocato?`
    await h!.passa(battitura(domanda.length) - 10)
    expect(bolle()).not.toContain(domanda)
    await h!.passa(20)
    expect(ultimo(bolle())).toBe(domanda)
    expect(risposte()).not.toHaveAttribute('aria-busy')
    expect(within(risposte()).getAllByRole('button').map((b) => b.textContent)).toEqual([...DATI.chat.compagni])
  })

  it('qualunque tasto durante la pausa la salta: ritmo, non un cancello', async () => {
    await monta()
    await h!.user.click(within(risposte()).getByRole('button', { name: DATI.chat.tornei[0] }))
    await h!.user.keyboard('{Shift}')
    expect(ultimo(bolle())).toMatch(/Con chi hai giocato\?$/)
  })

  it('fino in fondo: il riepilogo dell\'app, «Conferma», la frase finale col fuoco, e «Ricomincia»', async () => {
    await monta()
    await rispondi(DATI.chat.tornei[1])
    await rispondi(DATI.chat.compagni[0])
    expect(ultimo(bolle())).toBe('Quando si è svolto?')
    await rispondi('Oggi')
    expect(ultimo(bolle())).toBe('Il torneo è già finito o è ancora in corso?')
    await rispondi('Finito')
    expect(ultimo(bolle())).toBe('Ottimo. Che piazzamento hai ottenuto?')
    await rispondi('1°')
    const card = log().querySelector('.chat-riepilogo:last-child') as HTMLElement
    const righe = Object.fromEntries([...card.querySelectorAll('dl > div')].map((r) => [r.querySelector('dt')?.textContent, r.querySelector('dd')?.textContent]))
    expect(righe).toMatchObject({ Nome: DATI.chat.tornei[1], Compagno: DATI.chat.compagni[0], Stato: 'Finito · 1°' })
    await rispondi('Conferma')
    expect(screen.getByText(FINE)).toHaveFocus()
    expect(document.querySelector('.chat-avatar svg')).toHaveAttribute('data-umore', 'contento')
    await h!.user.click(within(risposte()).getByRole('button', { name: 'Ricomincia' }))
    expect(bolle()).toEqual(RIPARTENZA)
    expect(within(risposte()).getByRole('button', { name: DATI.chat.tornei[0] })).toHaveFocus()
  })

  it('«In corso» salta il piazzamento e va dritto al riepilogo', async () => {
    await monta()
    await rispondi(DATI.chat.tornei[0])
    await rispondi(DATI.chat.compagni[1])
    await rispondi('Ieri')
    await rispondi('In corso')
    expect(ultimo(bolle(), 2)).toBe('Ecco il riepilogo. Confermo la creazione?')
    expect(within(risposte()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Conferma'])
  })

  it('col movimento fermo Pallo risponde subito, senza puntini', async () => {
    await monta(FERMO)
    await h!.user.click(within(risposte()).getByRole('button', { name: DATI.chat.tornei[0] }))
    expect(log().querySelector('.msg-scrive')).toBeNull()
    expect(ultimo(bolle())).toMatch(/Con chi hai giocato\?$/)
  })
})

// ------------------------------------------------------- Partita live
describe('Partita live: la demo (UX FL3, §L6.4, §L7.6)', () => {
  const demo = () => document.querySelector('#live .demo') as HTMLElement
  const pannello = (chi: 'noi' | 'loro') => within(demo()).getByRole('button', { name: new RegExp(`^Punto per ${chi}, ora \\d+$`) })
  const meno = (chi: 'noi' | 'loro') => within(demo()).getByRole('button', { name: `Togli un punto a ${chi}` })
  const punteggio = () => `${pannello('noi').getAttribute('aria-label')?.match(/\d+$/)?.[0]}–${pannello('loro').getAttribute('aria-label')?.match(/\d+$/)?.[0]}`
  const stato = () => within(demo()).getByRole('status')
  const bolla = () => (demo().querySelector('.live-bolla') as HTMLElement).textContent
  const umore = () => demo().querySelector('.demo-pallo svg')?.getAttribute('data-umore')
  const segna = async (chi: 'noi' | 'loro', n: number) => {
    for (let i = 0; i < n; i++) await h!.user.click(pannello(chi))
  }
  /** Da 0–0, senza autoplay: «Ricomincia». */
  const daCapo = async () => {
    await h!.user.click(within(demo()).getByRole('button', { name: 'Ricomincia' }))
    await h!.passa(10)
  }

  it('il tabellone fermo diventa un gioco: «+1» e «−1» per squadra, con le scorciatoie dichiarate', async () => {
    await monta()
    expect(pannello('loro')).toHaveAccessibleName('Punto per loro, ora 2')
    expect(pannello('noi')).toHaveAccessibleName('Punto per noi, ora 3')
    expect(pannello('noi')).toHaveAttribute('aria-keyshortcuts', 'ArrowDown')
    expect(pannello('loro')).toHaveAttribute('aria-keyshortcuts', 'ArrowUp')
    expect(meno('noi')).toHaveAttribute('aria-keyshortcuts', 'Shift+ArrowDown')
    expect(screen.getByRole('heading', { level: 3, name: 'Set 1 di 3' })).toBeInTheDocument()
    expect(bolla()).toBe('Si comincia! Tocca chi fa punto.')
    expect(stato()).toHaveTextContent('')
  })

  it('Pallo e la sua nuvoletta sono aria-hidden, come nell\'app: le notizie le dice lo status', async () => {
    await monta()
    const mezzo = demo().querySelector('.demo-mezzo') as HTMLElement
    expect(mezzo.closest('[aria-hidden="true"]')).not.toBeNull()
    await segna('noi', 1)
    expect(demo().querySelector('.live-bolla')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('l\'autoplay: in vista al 60%, qualche punto fino al primo «Cambio campo!», poi «Tocca tu»; senza annunci né vibrazione', async () => {
    await monta()
    await h!.scorri('live', { poi: 0 })
    await h!.passa(1000)
    expect(punteggio()).toBe('4–2')
    await h!.passa(1000)
    expect(punteggio()).toBe('4–3')
    expect(bolla()).toBe('Cambio campo!')
    await h!.passa(1000)
    expect(bolla()).toBe('Tocca tu: chi fa punto?')
    expect(stato()).toHaveTextContent('')
    expect(h!.vibra).not.toHaveBeenCalled()
    // Una volta per visita.
    await h!.scorri('numeri')
    await h!.scorri('live')
    await h!.passa(3000)
    expect(punteggio()).toBe('4–3')
  })

  it('il primo tocco spegne l\'autoplay per sempre; il punteggio resta quello che è', async () => {
    await monta()
    await h!.scorri('live', { poi: 0 })
    await h!.passa(1000)
    expect(punteggio()).toBe('4–2')
    await h!.user.click(pannello('noi'))
    expect(punteggio()).toBe('5–2')
    await h!.passa(3000)
    expect(punteggio()).toBe('5–2')
    expect(bolla()).not.toBe('Tocca tu: chi fa punto?')
  })

  it('niente autoplay col movimento ridotto, col «fermo», o col fuoco già dentro la demo', async () => {
    for (const o of [{ ridotto: true }, FERMO]) {
      await monta(o)
      await h!.scorri('live')
      await h!.passa(3000)
      expect(punteggio(), JSON.stringify(o)).toBe('3–2')
      h!.smonta()
    }
    await monta()
    pannello('loro').focus()
    await h!.scorri('live')
    await h!.passa(3000)
    expect(punteggio()).toBe('3–2')
  })

  it('i punti dell\'utente: status «{noi} a {loro}» più la notizia, e una vibrazione leggera', async () => {
    await monta()
    await h!.user.click(pannello('noi'))
    expect(stato()).toHaveTextContent('4 a 2.')
    expect(h!.vibra).toHaveBeenLastCalledWith(12)
    await h!.user.click(pannello('loro'))
    expect(stato()).toHaveTextContent('4 a 3. Cambio campo!')
    await h!.user.click(meno('loro'))
    expect(stato()).toHaveTextContent('4 a 2.')
    expect(bolla()).toBe('Punto tolto: si riparte da qui.')
  })

  it('col fermo nessuna vibrazione, e il numero cambia senza «pop»', async () => {
    await monta(FERMO)
    await h!.user.click(pannello('noi'))
    expect(h!.vibra).not.toHaveBeenCalled()
    expect(stato()).toHaveTextContent('4 a 2.')
  })

  it('le scorciatoie valgono solo col fuoco dentro la demo; fuori le frecce restano della pagina', async () => {
    await monta()
    ;(screen.getByRole('heading', { level: 2, name: 'Partita live' }) as HTMLElement).focus()
    const freccia = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    document.activeElement?.dispatchEvent(freccia)
    expect(freccia.defaultPrevented).toBe(false)
    expect(punteggio()).toBe('3–2')
    pannello('loro').focus()
    await h!.user.keyboard('{ArrowDown}')
    expect(punteggio()).toBe('4–2')
    await h!.user.keyboard('{ArrowUp}')
    expect(punteggio()).toBe('4–3')
    await h!.user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(punteggio()).toBe('4–2')
    expect(stato()).toHaveTextContent('4 a 2.')
  })

  it('«−1» a zero è aria-disabled e non fa niente', async () => {
    await monta()
    await daCapo()
    expect(meno('noi')).toHaveAttribute('aria-disabled', 'true')
    await h!.user.click(meno('noi'))
    expect(punteggio()).toBe('0–0')
    await h!.user.click(pannello('noi'))
    expect(meno('noi')).toHaveAttribute('aria-disabled', 'false')
  })

  it('set point, ai vantaggi, set vinto: le battute dell\'app; a set finito il «+1» è disattivo e dice perché', async () => {
    await monta()
    await daCapo()
    await segna('loro', 18)
    await segna('noi', 20)
    expect(bolla()).toBe('Set point per voi!')
    expect(stato()).toHaveTextContent('20 a 18. Set point per voi!')
    await segna('loro', 2)
    expect(bolla()).toBe('Ai vantaggi: servono due punti di fila.')
    await segna('noi', 2)
    expect(bolla()).toBe('Set vostro! Chiudetelo.')
    expect(umore()).toBe('festa')
    const chiudi = within(demo()).getByRole('button', { name: 'Chiudi il set' })
    expect(chiudi).toHaveAttribute('data-pronto')
    expect(pannello('noi')).toHaveAttribute('aria-disabled', 'true')
    // Il fuoco resta sul pannello toccato; un altro tocco non segna e spiega.
    expect(pannello('noi')).toHaveFocus()
    await h!.user.click(pannello('noi'))
    expect(punteggio()).toBe('22–20')
    expect(stato()).toHaveTextContent('Set finito, 22 a 20: prima chiudi il set.')
  })

  it('«Chiudi il set» compare solo a set finito, e porta al set dopo col fuoco al suo titolo', async () => {
    await monta()
    await daCapo()
    const chiudi = within(demo()).getByRole('button', { name: 'Chiudi il set' })
    expect(chiudi).not.toHaveAttribute('data-pronto')
    // Prima del tempo non fa niente.
    await h!.user.click(chiudi)
    expect(screen.getByRole('heading', { level: 3, name: 'Set 1 di 3' })).toBeInTheDocument()
    await segna('noi', 21)
    await h!.user.click(chiudi)
    expect(screen.getByRole('heading', { level: 3, name: 'Set 2 di 3' })).toHaveFocus()
    expect(punteggio()).toBe('0–0')
    expect(demo().querySelector('.demo-pillole')).toHaveTextContent('Set 1 21–0')
    expect(chiudi).not.toHaveAttribute('data-pronto')
    expect(bolla()).toBe('Set 2: si riparte da zero.')
  })

  it('il terzo set va a 15, col match point che sorprende Pallo', async () => {
    await monta()
    await daCapo()
    const chiudi = () => within(demo()).getByRole('button', { name: 'Chiudi il set' })
    await segna('noi', 21)
    await h!.user.click(chiudi())
    await segna('loro', 21)
    await h!.user.click(chiudi())
    expect(screen.getByRole('heading', { level: 3, name: 'Set 3 di 3' })).toHaveFocus()
    await segna('noi', 14)
    expect(bolla()).toBe('Match point per voi!')
    expect(umore()).toBe('sorpreso')
    await segna('noi', 1)
    expect(bolla()).toBe('Set vostro! Chiudetelo.')
    expect(chiudi()).toHaveAttribute('data-pronto')
  })

  it('la partita finita: il riepilogo col fuoco al titolo, i pannelli inerti; «Ricomincia» torna a 0–0', async () => {
    await monta()
    await daCapo()
    const chiudi = () => within(demo()).getByRole('button', { name: 'Chiudi il set' })
    await segna('noi', 21)
    await h!.user.click(chiudi())
    await segna('noi', 21)
    await h!.user.click(chiudi())
    const titolo = screen.getByRole('heading', { level: 3, name: 'Partita vostra, 2–0' })
    expect(titolo).toHaveFocus()
    expect(demo().querySelector('.demo-riepilogo-set')).toHaveTextContent('Set 1 21–0 · Set 2 21–0')
    expect(umore()).toBe('festa')
    for (const b of demo().querySelectorAll<HTMLElement>('.demo-box')) expect(b.inert).toBe(true)
    const ricomincia = within(demo()).getByRole('button', { name: 'Ricomincia' })
    await h!.user.click(ricomincia)
    await h!.passa(50)
    expect(ricomincia).toHaveFocus()
    expect(punteggio()).toBe('0–0')
    expect(demo().querySelector('.demo-riepilogo') as HTMLElement).not.toBeVisible()
    for (const b of demo().querySelectorAll<HTMLElement>('.demo-box')) expect(b.inert).toBe(false)
    expect(demo().querySelector('.demo-pillole')?.children).toHaveLength(0)
    expect(stato()).toHaveTextContent('')
  })

  it('persa: «Partita loro, 0–2» e Pallo triste', async () => {
    await monta()
    await daCapo()
    const chiudi = () => within(demo()).getByRole('button', { name: 'Chiudi il set' })
    for (let s = 0; s < 2; s++) {
      await segna('loro', 21)
      await h!.user.click(chiudi())
    }
    expect(screen.getByRole('heading', { level: 3, name: 'Partita loro, 0–2' })).toHaveFocus()
    expect(umore()).toBe('triste')
  })

  it('axe a metà partita, a set finito e sul riepilogo', async () => {
    await monta()
    await daCapo()
    await segna('noi', 21)
    await h!.axe(demo())
    await h!.user.click(within(demo()).getByRole('button', { name: 'Chiudi il set' }))
    await segna('noi', 21)
    await h!.user.click(within(demo()).getByRole('button', { name: 'Chiudi il set' }))
    await h!.axe(demo())
  })
})

// --------------------------------------------------------------- Numeri
describe('«I numeri li fa l\'app» (UX §L6.5, LM7)', () => {
  const odo = () => [...document.querySelectorAll<HTMLElement>('#numeri [data-odo]')]
  const finali = [String(DATI.numeri.winPct), DATI.numeri.diff, String(DATI.numeri.torneiVinti), String(DATI.numeri.serie), String(DATI.numeri.podi)]
  /** Le cifre DISEGNATE (le strisce dell'Odometro), non il testo letto. */
  const viste = (el: HTMLElement) => {
    const t = [...el.querySelectorAll<HTMLElement>('.ui-odo-t')].map((x) => x.dataset.t ?? '')
    const c = [...el.querySelectorAll<HTMLElement>('.ui-odo-strip')].map((s) => {
      const k = Number(s.style.getPropertyValue('--k'))
      return k ? String((k - 1) % 10) : ''
    })
    return (t[0] ?? '') + c.join('') + (t[1] ?? '')
  }

  it('fuori vista all\'avvio: armati a zero per gli occhi, col valore vero per gli screen reader', async () => {
    await monta()
    expect(document.querySelector('#numeri .poster')).toHaveAttribute('data-armato')
    expect(odo().map((e) => e.textContent)).toEqual(finali)
    expect(odo().map(viste)).toEqual(finali.map((f) => f.replace(/\d+/, '0')))
    for (const e of odo()) expect(e.querySelector('.ui-odo')).toHaveAttribute('aria-hidden', 'true')
  })

  it('alla prima entrata in vista salgono fino al valore, una volta sola', async () => {
    await monta()
    await h!.scorri('numeri')
    expect(document.querySelector('#numeri .poster')).not.toHaveAttribute('data-armato')
    await h!.passa(1000)
    expect(odo().map(viste)).toEqual(finali)
    expect(JSON.parse(sessionStorage.getItem('bvd_landing_visti') ?? '[]')).toContain('numeri')
  })

  it('già in vista (deep link), già visti nella sessione, o fermi: valori finali, mai armati', async () => {
    for (const o of [{ hash: '#numeri' }, { sessione: { bvd_landing_visti: '["numeri"]' } }, FERMO, { ridotto: true }] as OpzioniLanding[]) {
      await monta(o)
      expect(document.querySelector('#numeri .poster'), JSON.stringify(o)).not.toHaveAttribute('data-armato')
      expect(odo().map(viste), JSON.stringify(o)).toEqual(finali)
      h!.smonta()
    }
  })

  it('il fuoco che arriva in #numeri armata la porta subito allo stato finale (RL4)', async () => {
    await monta()
    await h!.user.click(screen.getByRole('link', { name: 'Numeri' }))
    await h!.passa(50)
    expect(screen.getByRole('heading', { level: 2, name: 'I numeri li fa l\'app' })).toHaveFocus()
    expect(document.querySelector('#numeri .poster')).not.toHaveAttribute('data-armato')
    expect(odo().map(viste)).toEqual(finali)
  })
})

// --------------------------------------------------------- Mappa, Wrapped
describe('la mappa e Wrapped (UX §L6.6, §L6.7)', () => {
  it('i pin si armano fuori vista e cadono all\'entrata; fermi sono già posati', async () => {
    await monta()
    const mappa = document.querySelector('#mappa .mappa') as HTMLElement
    expect(mappa).toHaveAttribute('data-armato')
    await h!.scorri('mappa')
    expect(mappa).not.toHaveAttribute('data-armato')
    expect(mappa).toHaveAttribute('data-cade')
    h!.smonta()
    await monta(FERMO)
    expect(document.querySelector('#mappa .mappa')).not.toHaveAttribute('data-armato')
    expect(document.querySelector('#mappa .mappa')).not.toHaveAttribute('data-cade')
  })

  it('Wrapped bloccato (timeline native, altezza ≥ 600, movimento permesso): la fila esce dal giro del Tab', async () => {
    await monta({ timeline: true })
    const fila = screen.getByRole('region', { name: 'Slide di Beach Wrapped' })
    expect(fila).not.toHaveAttribute('tabindex')
    // «Ferma le animazioni»: la riga torna manuale, e si scorre da tastiera.
    await h!.user.click(screen.getAllByRole('button', { name: 'Ferma le animazioni' })[1])
    expect(fila).toHaveAttribute('tabindex', '0')
  })

  it('senza timeline native, o su uno schermo basso, o fermo: la riga si scorre a mano', async () => {
    for (const o of [{}, { timeline: true, altezza: 560 }, { timeline: true, ...FERMO }] as OpzioniLanding[]) {
      await monta(o)
      expect(screen.getByRole('region', { name: 'Slide di Beach Wrapped' }), JSON.stringify(o)).toHaveAttribute('tabindex', '0')
      h!.smonta()
    }
    await monta({ timeline: true })
    await h!.finestra({ h: 500 })
    expect(screen.getByRole('region', { name: 'Slide di Beach Wrapped' })).toHaveAttribute('tabindex', '0')
  })

  it('la Storia: armata fuori vista, aperta a ventaglio all\'entrata; le tre impaginazioni hanno il loro alt', async () => {
    await monta()
    const storia = document.querySelector('#wrapped .storia') as HTMLElement
    expect(storia).toHaveAttribute('data-armato')
    await h!.scorri(h!.cima('wrapped') + 1800)
    expect(storia).not.toHaveAttribute('data-armato')
    expect(within(storia).getAllByRole('img').map((i) => i.getAttribute('alt'))).toEqual([
      'Storia, layout Tabellone, in inchiostro',
      'Storia, layout Foto, in sabbia',
      'Storia, layout Polaroid, in arancio',
    ])
  })
})

// ------------------------------------------------- il telefono di #diario
describe('il telefono di #diario e le immagini (UX §L6.2, §L6.0)', () => {
  const pagine = () => [...document.querySelectorAll<HTMLElement>('#diario .telefono .pagina')]

  it('lo schermo segue il capitolo che passa la linea, a soglia', async () => {
    await monta()
    expect(pagine()[0]).toHaveAttribute('data-attiva')
    for (const k of [1, 2, 3]) {
      await h!.scorri(h!.cima('diario') + 200 + k * 700 - 300)
      expect(pagine().filter((p) => p.hasAttribute('data-attiva')), `capitolo ${k}`).toEqual([pagine()[k]])
    }
  })

  it('un\'immagine che arriva prende il posto dello skeleton; una che non arriva lascia le forme, senza icona rotta', async () => {
    await monta()
    await h!.scorri('diario')
    const [prima, seconda] = pagine()
    expect(prima).toHaveAttribute('data-attesa')
    prima.querySelector('img')?.dispatchEvent(new Event('load'))
    await h!.passa(10)
    expect(prima).toHaveAttribute('data-pronta')
    expect(prima).not.toHaveAttribute('data-attesa')
    seconda.querySelector('img')?.dispatchEvent(new Event('error'))
    expect(seconda).toHaveAttribute('data-errore')
    expect(seconda).not.toHaveAttribute('data-attesa')
  })
})

// ---------------------------------------------------------------- Finale
describe('il finale (UX §L6.9)', () => {
  const pallo = () => document.querySelector('#comincia .finale-pallo svg') as SVGElement
  const cta = () => within(document.getElementById('comincia') as HTMLElement).getByRole('link', { name: 'Crea il tuo diario' })

  it('col mouse sul CTA Pallo fa festa, e torna ai cuori quando esce', async () => {
    await monta({ mouse: true, ua: undefined })
    expect(pallo()).toHaveAttribute('data-umore', 'cuori')
    await h!.user.hover(cta())
    expect(pallo()).toHaveAttribute('data-umore', 'festa')
    await h!.user.unhover(cta())
    expect(pallo()).toHaveAttribute('data-umore', 'cuori')
  })

  it('col dito no: il CTA porta via subito', async () => {
    await monta()
    // Il dito che arriva sul CTA. (Il fuoco del tocco non conta: nel browser
    // non è :focus-visible, in jsdom sì, e il test misurerebbe jsdom.)
    cta().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    expect(pallo()).toHaveAttribute('data-umore', 'cuori')
    h!.smonta()
    // Anche un mouse su un telefono senza hover (`hover: none`) non basta.
    await monta({ mouse: false })
    cta().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    expect(pallo()).toHaveAttribute('data-umore', 'cuori')
  })

  it('con la tastiera (:focus-visible) fa festa anche lui, e torna ai cuori al blur', async () => {
    await monta()
    cta().focus()
    expect(pallo()).toHaveAttribute('data-umore', 'festa')
    cta().blur()
    expect(pallo()).toHaveAttribute('data-umore', 'cuori')
  })

  it('il CTA ha un href vero: si arriva al Login con la registrazione già scelta', async () => {
    await monta()
    expect(cta()).toHaveAttribute('href', '/?accesso=registrati')
  })
})
