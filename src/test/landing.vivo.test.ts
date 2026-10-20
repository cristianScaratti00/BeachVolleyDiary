// ============================================================================
// La landing viva, come la vive chi la apre (UX.md §L4–§L8, §L14.2): la barra
// e i salti, Pallo guida col suo menu, «Ferma le animazioni», il primo
// fotogramma con e senza memoria, axe sugli stati principali. Le sezioni con
// un gioco (chat, demo live, numeri) stanno in landing.sezioni.test.ts, il
// foglio d'installazione in landing.installa.test.ts.
//
// Ci si muove per ruolo, nome e testo; lo scroll è quello del dito
// (`scorri`), il tempo è finto (`passa`). L'harness è src/test/landing.ts.
// ============================================================================
import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, within } from '@testing-library/dom'
import { montaLanding } from './landing'
import type { Landing, OpzioniLanding } from './landing'
import { DATI } from '../../presentazione/js/generati/dati'

let h: Landing | null = null
const monta = async (o: OpzioniLanding = {}) => (h = await montaLanding(o))
afterEach(() => {
  h?.smonta()
  h = null
})

const barra = () => screen.getByRole('navigation', { name: 'Sezioni' })
const tab = (nome: string) => within(barra()).getByRole('link', { name: nome })
const guida = () => document.querySelector<HTMLButtonElement>('button.guida') as HTMLButtonElement
const inScena = () => guida().dataset.stato === 'dentro' && !guida().inert
const menu = () => document.getElementById('guida-menu') as HTMLElement
const ATTERRAGGIO = 'Quando vuoi, il + arancio apre il diario.'

describe('la pagina si accende (UX §L6.0)', () => {
  it('ogni sezione passa alla versione viva, e la demo diventa un gioco', async () => {
    await monta()
    for (const s of document.querySelectorAll('main > section')) expect(s.hasAttribute('data-viva'), s.id).toBe(true)
    expect(screen.queryByRole('img', { name: /Esempio: Noi 20/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Punto per noi, ora 3' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Cosa registriamo?' })).toBeInTheDocument()
  })

  it('in cima Pallo guida c\'è ma è fuori scena: il Pallo che parla è quello dell\'hero', async () => {
    await monta()
    expect(guida().hidden).toBe(false)
    expect(guida().inert).toBe(true)
    expect(guida().dataset.stato).toBeUndefined()
  })

  it('un modulo che fallisce non ferma gli altri, e la sua sezione resta nella versione di base', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await monta({
      prima: () => {
        CSS.supports = () => {
          throw new Error('rotto')
        }
      },
    })
    const wrapped = document.getElementById('wrapped') as HTMLElement
    expect(wrapped.hasAttribute('data-viva')).toBe(false)
    expect(screen.getByRole('region', { name: 'Slide di Beach Wrapped' })).toHaveAttribute('tabindex', '0')
    expect(errore).toHaveBeenCalledWith('[landing] wrapped:', expect.objectContaining({ message: 'rotto' }))
    for (const id of ['dati', 'comincia', 'live', 'numeri']) expect(document.getElementById(id)?.hasAttribute('data-viva'), id).toBe(true)
    await h!.scorri('diario', { frazione: 0.1 })
    expect(inScena()).toBe(true)
  })
})

describe('la barra (UX §L4.1, §L7.1)', () => {
  it('la tab della sezione corrente ha aria-current="true"; «Cosa registriamo?» è del Diario, la mappa dei Numeri', async () => {
    await monta()
    const correnti = () => within(barra()).queryAllByRole('link', { current: true }).map((a) => a.querySelector('[data-liv="spento"]')?.textContent)
    expect(correnti()).toEqual([])
    for (const [sez, attesa] of [
      ['diario', ['Diario']],
      ['registra', ['Diario']],
      ['live', ['Live']],
      ['numeri', ['Numeri']],
      ['mappa', ['Numeri']],
      ['wrapped', ['Wrapped']],
      ['dati', []],
      ['comincia', []],
    ] as const) {
      await h!.scorri(sez, { frazione: 0.2 })
      expect(correnti(), sez).toEqual(attesa)
    }
  })

  it('una tab salta di colpo alla sezione, col fuoco al titolo e senza riempire la history', async () => {
    await monta()
    const voci = history.length
    await h!.user.click(tab('Live'))
    // La lente si decide al fotogramma dopo (l'arbitro, MOTION §L9.1).
    await h!.passa(50)
    expect(h!.y).toBe(h!.cima('live'))
    expect(screen.getByRole('heading', { level: 2, name: 'Partita live' })).toHaveFocus()
    expect(location.hash).toBe('#live')
    expect(history.length).toBe(voci)
    expect(tab('Live')).toHaveAttribute('aria-current', 'true')
  })

  it('il salto non conta come scroll veloce: Pallo non si sorprende', async () => {
    await monta()
    await h!.scorri('diario', { frazione: 0.1 })
    await h!.passa(5000)
    await h!.user.click(tab('Wrapped'))
    await h!.passa(400)
    expect(guida().querySelector('svg')?.dataset.umore).not.toBe('sorpreso')
  })

  it('la capsula sceglie il vetro dal fondo che le passa sotto', async () => {
    await monta()
    const capsula = document.querySelector('.capsula') as HTMLElement
    expect(capsula.dataset.sopra).toBe('scuro')
    await h!.scorri('diario', { frazione: 0.3 })
    expect(capsula.dataset.sopra).toBe('chiaro')
    // La capsula sta in basso: conta ciò che le passa sotto, non la cima.
    await h!.scorri('numeri')
    expect(capsula.dataset.sopra).toBe('scuro')
    expect(capsula.dataset.inchiostro).toBe('scuro')
    await h!.scorri('numeri', { frazione: 0.6 })
    expect(capsula.dataset.sopra).toBe('chiaro')
  })

  it('«Salta al contenuto» resta un\'ancora nativa verso <main>', async () => {
    await monta()
    const salta = screen.getByRole('link', { name: 'Salta al contenuto' })
    expect(salta).toHaveAttribute('href', '#contenuto')
    let prevenuto = true
    salta.addEventListener('click', (e) => (prevenuto = e.defaultPrevented))
    await h!.user.click(salta)
    expect(prevenuto).toBe(false)
  })
})

describe('Pallo guida (UX §L6.10, §L7.2, FL7)', () => {
  it('al primo scroll in #diario salta nell\'angolo, entra in scena e dice la battuta d\'arrivo, una volta', async () => {
    await monta()
    await h!.scorri('diario')
    expect(document.querySelector('.eroe-pallo')).toHaveAttribute('data-partito')
    expect(inScena()).toBe(true)
    expect(screen.getByRole('button', { name: 'Pallo: dove vuoi andare?' })).toHaveAccessibleDescription(ATTERRAGGIO)
    // La nuvoletta non è una live region: è solo la descrizione del pulsante.
    expect(document.getElementById('guida-bolla')).toHaveAttribute('aria-hidden', 'true')
    await h!.passa(4000)
    expect(document.getElementById('guida-bolla')).not.toHaveAttribute('data-visibile')
    expect(JSON.parse(sessionStorage.getItem('bvd_landing_visti') ?? '[]')).toEqual(expect.arrayContaining(['salto', 'bolla:diario-1']))
  })

  it('una battuta per sezione, solo a scroll fermo, e mai due volte nella sessione', async () => {
    await monta()
    await h!.scorri('diario', { frazione: 0.1 })
    await h!.passa(4500)
    await h!.scorri('numeri', { frazione: 0.2, poi: 100 })
    // Lo scroll si è appena fermato: la battuta aspetta la quiete.
    expect(guida()).toHaveAccessibleDescription('')
    await h!.passa(300)
    expect(guida()).toHaveAccessibleDescription(DATI.guida.numeri)
    expect(guida().querySelector('svg')?.dataset.umore).toBe('cool')
    await h!.passa(4500)
    await h!.scorri('mappa', { frazione: 0.3 })
    expect(guida()).toHaveAccessibleDescription(DATI.guida.mappa)
    await h!.passa(4500)
    await h!.scorri('numeri', { frazione: 0.2 })
    await h!.passa(500)
    expect(guida()).toHaveAccessibleDescription('')
  })

  it('esce dove la sezione ha un Pallo suo (#live), e rientra dopo', async () => {
    await monta()
    await h!.scorri('diario', { frazione: 0.1 })
    await h!.scorri('live', { frazione: 0.3 })
    expect(inScena()).toBe(false)
    expect(guida().inert).toBe(true)
    await h!.scorri('numeri', { frazione: 0.3 })
    expect(inScena()).toBe(true)
  })

  it('non esce col fuoco addosso: aspetta che il fuoco vada altrove', async () => {
    await monta()
    await h!.scorri('diario', { frazione: 0.1 })
    guida().focus()
    await h!.scorri('live', { frazione: 0.3 })
    expect(inScena()).toBe(true)
    expect(guida()).toHaveFocus()
    ;(screen.getByRole('heading', { name: 'Partita live' }) as HTMLElement).focus()
    await h!.passa(50)
    expect(inScena()).toBe(false)
  })

  it('tornando su nell\'hero la guida esce e il Pallo dell\'hero torna', async () => {
    await monta()
    await h!.scorri('diario', { frazione: 0.1 })
    await h!.scorri(0)
    expect(inScena()).toBe(false)
    expect(document.querySelector('.eroe-pallo')).not.toHaveAttribute('data-partito')
  })

  it('senza uno scroll dell\'utente non salta mai (deep link: è già nell\'angolo, senza il salto)', async () => {
    await monta({ hash: '#numeri' })
    await h!.passa(400)
    expect(inScena()).toBe(true)
    expect(JSON.parse(sessionStorage.getItem('bvd_landing_visti') ?? '[]')).not.toContain('salto')
  })
})

describe('il menu «Dove vuoi andare?» (UX §L7.2, FL2)', () => {
  const apri = async () => {
    await h!.scorri('diario')
    await h!.passa(4500)
    await h!.user.click(screen.getByRole('button', { name: 'Pallo: dove vuoi andare?' }))
  }

  it('si apre al tocco: aria-expanded, la nuvoletta via, il fuoco sulla prima voce a t0; la sezione corrente è marcata', async () => {
    await monta()
    await apri()
    expect(guida()).toHaveAttribute('aria-expanded', 'true')
    expect(menu().hidden).toBe(false)
    const nav = screen.getByRole('navigation', { name: 'Dove vuoi andare?' })
    expect(within(nav).getByRole('link', { name: 'Il diario in tasca' })).toHaveFocus()
    expect(within(nav).getByRole('link', { name: 'Il diario in tasca' })).toHaveAttribute('aria-current', 'true')
    expect(within(nav).getAllByRole('link', { current: true })).toHaveLength(1)
  })

  it('Esc chiude e riporta il fuoco a Pallo', async () => {
    await monta()
    await apri()
    await h!.user.keyboard('{Escape}')
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
    expect(guida()).toHaveFocus()
    await h!.passa(200)
    expect(menu().hidden).toBe(true)
  })

  it('↑ e ↓ girano fra le voci; Maiusc+Tab dalla prima torna a Pallo e il menu resta aperto', async () => {
    await monta()
    await apri()
    await h!.user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: 'Raccontalo a Pallo' })).toHaveFocus()
    await h!.user.keyboard('{ArrowUp}{ArrowUp}')
    expect(within(menu()).getByRole('link', { name: 'Apri il diario' })).toHaveFocus()
    await h!.user.keyboard('{ArrowDown}')
    await h!.user.tab({ shift: true })
    expect(guida()).toHaveFocus()
    expect(guida()).toHaveAttribute('aria-expanded', 'true')
  })

  it('Tab dopo l\'ultima voce esce dal menu e lo chiude, col fuoco dove va', async () => {
    await monta()
    await apri()
    within(menu()).getByRole('link', { name: 'Apri il diario' }).focus()
    await h!.user.tab()
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
    expect(menu().contains(document.activeElement)).toBe(false)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('una voce chiude il menu, salta alla sezione e porta il fuoco al suo titolo', async () => {
    await monta()
    await apri()
    await h!.user.click(screen.getByRole('link', { name: 'Beach Wrapped' }))
    await h!.passa(20)
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { level: 2, name: 'Beach Wrapped' })).toHaveFocus()
    expect(h!.y).toBe(h!.cima('wrapped'))
  })

  it('un tocco fuori lo chiude e lascia il fuoco dove l\'utente l\'ha messo', async () => {
    await monta()
    await apri()
    await h!.user.click(screen.getByRole('heading', { name: 'Il diario in tasca' }))
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
  })

  it('«Ferma le animazioni» dal menu: aria-pressed e il menu resta aperto', async () => {
    await monta()
    await apri()
    const ferma = within(menu()).getByRole('button', { name: 'Ferma le animazioni' })
    await h!.user.click(ferma)
    expect(ferma).toHaveAttribute('aria-pressed', 'true')
    expect(guida()).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('giocare con Pallo (FL7)', () => {
  const umore = () => guida().querySelector('svg')?.dataset.umore
  const sorpresa = () => guida().querySelector('svg')?.getAttribute('data-sorpresa')
  const entra = async () => {
    await h!.scorri('diario')
    await h!.passa(4500)
  }

  it('un tocco: una reazione allegra per un secondo, e il menu si apre', async () => {
    await monta()
    await entra()
    const prima = umore()
    await h!.user.click(guida())
    expect(umore()).not.toBe(prima)
    expect(guida()).toHaveAttribute('aria-expanded', 'true')
    await h!.passa(1100)
    expect(umore()).toBe(prima)
  })

  it('i tocchi di fila non richiudono il menu; il quinto è la sorpresa, e il menu si chiude', async () => {
    await monta()
    await entra()
    for (let i = 0; i < 4; i++) {
      await h!.user.click(guida())
      await h!.passa(200)
      expect(guida(), `tocco ${i + 1}`).toHaveAttribute('aria-expanded', 'true')
    }
    await h!.user.click(guida())
    expect(sorpresa()).toBe('palleggio')
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
  })

  it('un altro tocco dopo una pausa richiude il menu', async () => {
    await monta()
    await entra()
    await h!.user.click(guida())
    await h!.passa(800)
    await h!.user.click(guida())
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
  })

  it('il tocco lungo col dito: la sorpresa e basta, niente menu né menu contestuale', async () => {
    await monta()
    await entra()
    let contestuale = true
    guida().addEventListener('contextmenu', (e) => (contestuale = !e.defaultPrevented))
    await h!.user.pointer({ keys: '[TouchA>]', target: guida() })
    await h!.passa(650)
    guida().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await h!.user.pointer({ keys: '[/TouchA]', target: guida() })
    expect(sorpresa()).toBe('palleggio')
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
    expect(contestuale).toBe(false)
  })

  it('dopo 10 secondi fermi si addormenta; il primo gesto lo sveglia sorpreso, senza battuta', async () => {
    await monta()
    await entra()
    await h!.passa(10_000)
    expect(umore()).toBe('dorme')
    await h!.user.keyboard('{Shift}')
    expect(umore()).toBe('sorpreso')
    expect(document.getElementById('guida-bolla')).not.toHaveAttribute('data-visibile')
  })

  it('non si addormenta col menu aperto', async () => {
    await monta()
    await entra()
    await h!.user.click(guida())
    await h!.passa(11_000)
    expect(umore()).not.toBe('dorme')
  })

  it('uno scroll veloce dell\'utente lo sorprende, al più una volta ogni 8 secondi', async () => {
    await monta()
    await entra()
    const visti: string[] = []
    new MutationObserver(() => visti.push(umore() ?? '')).observe(guida(), { subtree: true, attributes: true, attributeFilter: ['data-umore'] })
    // Dentro #diario (3000px), dove la guida resta in scena: ~17.000 px/s per 190ms.
    const fondo = h!.cima('diario') + 2700
    await h!.scorri(fondo, { passi: 12, ogni: 16, poi: 0 })
    expect(visti).toContain('sorpreso')
    visti.length = 0
    await h!.passa(1200)
    await h!.scorri(h!.cima('diario'), { passi: 12, ogni: 16, poi: 0 })
    expect(visti).not.toContain('sorpreso')
    // Piano, invece, non lo sorprende mai.
    await h!.passa(9000)
    await h!.scorri(fondo, { passi: 30, ogni: 50, poi: 0 })
    expect(visti).not.toContain('sorpreso')
  })
})

describe('«Ferma le animazioni» (UX §L7.13, FL8)', () => {
  const comandi = () => screen.getAllByRole('button', { name: 'Ferma le animazioni', hidden: true })

  it('le tre istanze cambiano insieme; lo stato sta sull\'<html> e nel dispositivo', async () => {
    await monta()
    expect(comandi()).toHaveLength(3)
    const [, eroe, piede] = comandi()
    await h!.user.click(eroe)
    for (const b of comandi()) expect(b).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.movimento).toBe('fermo')
    expect(localStorage.getItem('bvd_landing_fermo')).toBe('1')
    await h!.user.click(piede)
    for (const b of comandi()) expect(b).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset.movimento).toBeUndefined()
    expect(localStorage.getItem('bvd_landing_fermo')).toBeNull()
  })

  it('la scelta di una visita passata vale dal primo disegno (fermo.js, prima dei moduli)', async () => {
    await monta({ locale: { bvd_landing_fermo: '1' } })
    expect(document.documentElement.dataset.movimento).toBe('fermo')
    for (const b of comandi()) expect(b).toHaveAttribute('aria-pressed', 'true')
  })

  it('senza memoria (accesso che lancia) la pagina parte lo stesso e il comando vale fino alla ricarica', async () => {
    await monta({ memoriaRotta: true })
    for (const s of document.querySelectorAll('main > section')) expect(s.hasAttribute('data-viva'), s.id).toBe(true)
    await h!.user.click(comandi()[1])
    for (const b of comandi()) expect(b).toHaveAttribute('aria-pressed', 'true')
    await h!.scorri('diario', { frazione: 0.1 })
    expect(inScena()).toBe(true)
  })

  it('col movimento già ridotto dal sistema il comando è disattivato, con la spiegazione', async () => {
    await monta({ ridotto: true })
    for (const b of comandi()) {
      expect(b).toHaveAttribute('aria-disabled', 'true')
      expect(b).toHaveAccessibleDescription('Animazioni già ridotte dalle impostazioni del telefono.')
    }
    await h!.user.click(comandi()[1])
    for (const b of comandi()) expect(b).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset.movimento).toBeUndefined()
  })

  it('se il sistema cambia a pagina aperta, il comando lo segue', async () => {
    await monta()
    expect(comandi()[0]).not.toHaveAttribute('aria-disabled')
    await h!.finestra({ ridotto: true })
    for (const b of comandi()) expect(b).toHaveAttribute('aria-disabled', 'true')
    await h!.finestra({ ridotto: false })
    for (const b of comandi()) expect(b).not.toHaveAttribute('aria-disabled')
  })
})

describe('il giro del Tab (UX §L8.1)', () => {
  /** Le fermate del Tab come le vede il browser: niente nascosti, inerti o tabindex negativi. */
  const giro = () =>
    [...document.querySelectorAll<HTMLElement>('a[href], button, [tabindex]')]
      .filter((e) => e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && !e.closest('[hidden], [inert]'))
      // Due fermate le toglie il CSS, che jsdom non ha (le misura docs/qa/landing.mjs):
      // il marchio della barra sotto i 900px, «Chiudi il set» finché il set non è finito.
      .filter((e) => !e.matches('.barra-marchio, .chiudi-set:not([data-pronto])'))
      .map((e) => {
        if (e.getAttribute('aria-label')) return e.getAttribute('aria-label') as string
        const c = e.cloneNode(true) as HTMLElement
        c.querySelectorAll('[aria-hidden="true"], .voce-sotto').forEach((n) => n.remove())
        return (c.textContent ?? '').replace(/\s+/g, ' ').trim()
      })

  it('dalla cima, sul telefono: salto, barra, hero col comando, una fermata per la tablist, la demo, il finale, il footer', async () => {
    await monta()
    expect(giro()).toEqual([
      'Salta al contenuto',
      'Diario', 'Live', 'Numeri', 'Wrapped', 'Apri il diario',
      'Crea il tuo diario', 'Ho già un account', 'Installa sul telefono', 'Ferma le animazioni',
      'Raccontalo a Pallo', 'Conversazione con Pallo', ...DATI.chat.tornei,
      'Punto per loro, ora 2', 'Togli un punto a loro', 'Punto per noi, ora 3', 'Togli un punto a noi', 'Ricomincia',
      'Slide di Beach Wrapped',
      'Crea il tuo diario', 'Installa sul telefono', 'Ho già un account',
      'Apri il diario', 'Ferma le animazioni', 'Torna su',
    ])
  })

  it('con la guida in scena, Pallo viene subito dopo la barra; col menu aperto, le sue voci fra Pallo e l\'hero', async () => {
    await monta()
    await h!.scorri('diario')
    const g = giro()
    expect(g.slice(5, 7)).toEqual(['Apri il diario', 'Pallo: dove vuoi andare?'])
    await h!.passa(4500)
    await h!.user.click(guida())
    expect(giro().slice(6, 17)).toEqual([
      'Pallo: dove vuoi andare?',
      'Il diario in tasca', 'Raccontalo a Pallo', 'Partita live', 'I numeri e la mappa', 'Beach Wrapped', 'I tuoi dati', 'Torna su',
      "Installa l'app", 'Ferma le animazioni', 'Apri il diario',
    ])
  })

  it('a set finito «Chiudi il set» entra nel giro, fra i pannelli e «Ricomincia»', async () => {
    await monta()
    await h!.user.click(screen.getByRole('button', { name: 'Ricomincia' }))
    for (let i = 0; i < 21; i++) await h!.user.click(screen.getByRole('button', { name: /^Punto per noi/ }))
    const g = giro()
    expect(g.slice(g.indexOf('Togli un punto a noi'), g.indexOf('Ricomincia') + 1)).toEqual(['Togli un punto a noi', 'Chiudi il set', 'Ricomincia'])
  })

  it('col foglio aperto, solo il foglio', async () => {
    await monta()
    await h!.user.click(within(document.getElementById('inizio') as HTMLElement).getByRole('button', { name: 'Installa sul telefono' }))
    expect(giro()).toEqual(['Chiudi', 'Ho capito'])
  })
})

describe('le misure della pagina (UX §L9)', () => {
  it('da 900px la capsula sta in alto e sceglie il vetro da ciò che le passa in cima', async () => {
    // A metà fra #numeri (inchiostro) e #mappa (carta): in alto c'è il buio, in basso la carta.
    await monta({ larghezza: 1280, altezza: 800 })
    const capsula = document.querySelector('.capsula') as HTMLElement
    await h!.scorri(h!.cima('numeri') + 700)
    expect(capsula.dataset.sopra).toBe('scuro')
    h!.smonta()
    await monta()
    await h!.scorri(h!.cima('numeri') + 700)
    expect((document.querySelector('.capsula') as HTMLElement).dataset.sopra).toBe('chiaro')
  })

  it('ruotando o allargando la finestra, le fasce si rimisurano a gesto finito', async () => {
    await monta()
    const capsula = document.querySelector('.capsula') as HTMLElement
    await h!.scorri(h!.cima('numeri') + 700)
    expect(capsula.dataset.sopra).toBe('chiaro')
    await h!.finestra({ w: 1280, h: 800 })
    await h!.scorri(h!.cima('numeri') + 690)
    expect(capsula.dataset.sopra).toBe('scuro')
  })

  it('il telefono di #diario cambia schermo al 72% sotto i 900px, al 50% da lì', async () => {
    const attiva = () => [...document.querySelectorAll('#diario .telefono .pagina')].findIndex((p) => p.hasAttribute('data-attiva'))
    const y = (d: number) => d + 200 + 700 + 200 // il 50% cade nel capitolo 2, il 72% già nel 3
    await monta({ larghezza: 1280, altezza: 800 })
    await h!.scorri(y(h!.cima('diario')))
    expect(attiva()).toBe(1)
    h!.smonta()
    await monta()
    await h!.scorri(y(h!.cima('diario')))
    expect(attiva()).toBe(2)
  })

  it('col dito: un tocco su Pallo apre il menu, un tocco sul pannello segna e vibra', async () => {
    await monta()
    await h!.scorri('diario')
    await h!.passa(4500)
    await h!.user.pointer({ keys: '[TouchA]', target: guida() })
    expect(guida()).toHaveAttribute('aria-expanded', 'true')
    await h!.user.keyboard('{Escape}')
    await h!.user.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: 'Punto per noi, ora 3' }) })
    expect(screen.getByRole('button', { name: 'Punto per noi, ora 4' })).toBeInTheDocument()
    expect(h!.vibra).toHaveBeenCalledWith(12)
  })
})

describe('deep link e movimento fermo (UX §L4.2, §L11.3; MOTION §L4.2)', () => {
  it('col fermo la guida compare dove sta, senza il salto, che non si segna', async () => {
    await monta({ locale: { bvd_landing_fermo: '1' } })
    await h!.scorri('diario')
    expect(inScena()).toBe(true)
    expect(document.querySelector('.eroe-pallo')).toHaveAttribute('data-partito')
    expect(JSON.parse(sessionStorage.getItem('bvd_landing_visti') ?? '[]')).not.toContain('salto')
  })

  it('deep link a #live: le battute delle sezioni già superate non si dicono; il ＋ sopra, armato, si apre risalendo', async () => {
    await monta({ hash: '#live' })
    expect(location.hash).toBe('#live')
    expect(inScena()).toBe(false)
    const piu = document.querySelector('.registra-piu') as HTMLElement
    // MOTION §L4.2: fuori vista, sopra o sotto, si arma (UX §L4.2 diceva «stato finale»).
    expect(piu).toHaveAttribute('data-armato')
    await h!.scorri('registra')
    expect(piu).toHaveAttribute('data-aperto')
  })

  it('il fermo acceso a metà pagina: la guida resta, e la battuta seguente arriva senza movimento', async () => {
    await monta()
    await h!.scorri('diario')
    await h!.passa(4500)
    await h!.user.click(screen.getAllByRole('button', { name: 'Ferma le animazioni', hidden: true })[2])
    await h!.scorri('numeri')
    expect(inScena()).toBe(true)
    expect(guida()).toHaveAccessibleDescription(DATI.guida.numeri)
  })
})

describe('axe sugli stati principali (WCAG 2.1 A/AA)', () => {
  it('la pagina viva in cima, in mezzo, col menu della guida aperto', async () => {
    await monta()
    await h!.axe()
    await h!.scorri('diario', { frazione: 0.1 })
    await h!.passa(4500)
    await h!.user.click(guida())
    await h!.axe()
  })

  it('col movimento fermo', async () => {
    await monta({ locale: { bvd_landing_fermo: '1' } })
    await h!.axe()
  })
})
