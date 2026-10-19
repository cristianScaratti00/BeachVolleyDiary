// ============================================================================
// L'app intera come la vive un utente (UX §4, §6, §7, §8, §14.2): AppView con
// shell, router, ModalHost e schermate veri, un diario in memoria al posto di
// Supabase (src/test/app.tsx). Ci si muove per ruolo, etichetta e testo.
//
// Coperto qui: landmark e ordine di tabulazione, focus e titolo a ogni
// navigazione, indietro (UI e tasto del telefono), menu ＋, sheet con
// trappola del focus e guardia sulle modifiche, conferme distruttive di §7.7,
// avvisi, stati di §6 (primo avvio, primo caricamento fallito, non trovato),
// Sidebar/TabBar ai due lati dei 900px, tocco (M3), reduced-motion, axe.
//
// Fuori dalla portata di jsdom (nessun layout, nessun CSS dei componenti,
// `inert` ignorato): anelli di focus, bersagli, overflow per breakpoint,
// vetro. Li misurano gli script di docs/qa nel browser vero (POLISH.md).
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, screen, within, waitFor } from '@testing-library/react'
import { renderApp, setOnline, setViewport } from '../test/app'
import { expectNoA11yViolations } from '../test/axe'
import { lossSets, makeData, makeMatch, makePartner, makePhoto, makeTournament, winSets } from '../test/factories'
import type { CheckIn, DiaryData } from '../lib/models'

// La rete: le RPC ricadono sul calcolo client (il percorso di ripiego vero).
vi.mock('../lib/dashboard', () => ({ getDashboardStats: () => Promise.resolve(null) }))
vi.mock('../lib/serverviews', () => ({
  getTorneiList: () => Promise.resolve(null),
  getCompagniList: () => Promise.resolve(null),
  getTorneoDetail: () => Promise.resolve(null),
  getCompagnoDetail: () => Promise.resolve(null),
}))
// La Storia trascina html-to-image: qui basta che il visore si apra.
vi.mock('html-to-image', () => ({ toPng: () => Promise.resolve('data:image/png;base64,'), toBlob: () => Promise.resolve(null) }))
vi.mock('../lib/segnalazioni', async (orig) => ({
  ...(await orig<typeof import('../lib/segnalazioni')>()),
  elencoSegnalazioni: () => Promise.resolve([]),
}))

const ID = {
  rimini: '0b6f6a4e-3f6b-4b2a-9a51-000000000001',
  cervia: '0b6f6a4e-3f6b-4b2a-9a51-000000000002',
  sara: '0b6f6a4e-3f6b-4b2a-9a51-000000000003',
  riccione: '0b6f6a4e-3f6b-4b2a-9a51-000000000004',
  giulia: '0b6f6a4e-3f6b-4b2a-9a51-000000000101',
  marco: '0b6f6a4e-3f6b-4b2a-9a51-000000000102',
  condivisa: '0b6f6a4e-3f6b-4b2a-9a51-000000000103',
  conti: '0b6f6a4e-3f6b-4b2a-9a51-000000000201',
  foto: '0b6f6a4e-3f6b-4b2a-9a51-000000000301',
}
const NESSUNO = '0b6f6a4e-3f6b-4b2a-9a51-00000000ffff'

/** Un diario piccolo ma con ogni caso: oggi, futuro, passato con podio, condiviso. */
function diario(): DiaryData {
  return makeData({
    partners: [
      makePartner({ id: ID.giulia, name: 'Giulia' }),
      makePartner({ id: ID.marco, name: 'Marco', linkedUserId: 'u-marco' }),
      makePartner({ id: ID.condivisa, name: 'Sara', shared: true }),
    ],
    tournaments: [
      makeTournament({ id: ID.rimini, name: 'Rimini Open', date: '2026-07-22', placement: 'In corso', partnerId: ID.giulia }),
      makeTournament({ id: ID.riccione, name: 'Riccione Summer Cup', date: '2026-08-03', city: 'Riccione', placement: 'In corso', partnerId: ID.marco }),
      makeTournament({ id: ID.cervia, name: 'Cervia Beach Party', date: '2026-07-13', city: 'Cervia', placement: '1° 🏆', partnerId: ID.giulia }),
      makeTournament({ id: ID.sara, name: 'Torneo di Sara', date: '2026-07-02', city: 'Milano Marittima', placement: 'Ottavi', shared: true }),
    ],
    matches: [
      makeMatch({ id: ID.conti, tournamentId: ID.cervia, partnerId: ID.giulia, opponents: 'Conti / Gallo', phase: 'Finale', sets: winSets() }),
      makeMatch({ tournamentId: ID.cervia, partnerId: ID.giulia, opponents: 'Ferri / Riva', phase: 'Semifinale', sets: winSets() }),
      makeMatch({ tournamentId: ID.sara, opponents: 'Mori / Bassi', sets: lossSets() }),
    ],
    photos: [makePhoto({ id: ID.foto, tournamentId: ID.cervia, caption: 'La finale' })],
  })
}

const OWN: CheckIn = { id: 'c1', city: 'Rimini', date: '2026-07-22', lookingForPartner: false, note: '', tournamentId: null }

const h1 = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name })
const nav = () => screen.getByRole('navigation', { name: 'Principale' })
const statusRegion = () => screen.getAllByRole('status').find((n) => n.closest('[aria-live]') === n || n.getAttribute('aria-live') === 'polite')!

/** Il tasto indietro del telefono o del browser. */
async function indietro() {
  await act(async () => {
    const pop = new Promise<void>((r) => window.addEventListener('popstate', () => r(), { once: true }))
    window.history.back()
    await pop
  })
}

/** Le fermate di Tab, finché non si torna al body o alla prima. */
async function fermate(user: ReturnType<typeof renderApp>['user'], max = 60): Promise<Element[]> {
  const out: Element[] = []
  for (let i = 0; i < max; i++) {
    await user.tab()
    const el = document.activeElement
    if (!el || el === document.body || el === out[0]) break
    out.push(el)
  }
  return out
}

/** Gli elementi hanno questi nomi accessibili, in quest'ordine. */
function expectNomi(els: HTMLElement[], names: string[]) {
  expect(els).toHaveLength(names.length)
  els.forEach((e, i) => expect(e).toHaveAccessibleName(names[i]))
}

beforeEach(() => {
  // "Oggi" fisso: Home, ＋ e date dipendono dal giorno. Solo Date: i timer
  // restano veri, così user-event e le animazioni girano come al solito.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-07-22T09:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

// ============================================================================
describe('shell — landmark e percorso da tastiera (UX §8.2, §8.4)', () => {
  it('mobile: il primo Tab è «Vai al contenuto», poi il contenuto, la TabBar per ultima', async () => {
    const app = renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'contenuto')

    ;(document.activeElement as HTMLElement | null)?.blur()
    const stops = await fermate(app.user)
    const salta = screen.getByRole('link', { name: 'Vai al contenuto' })
    expect(stops[0]).toBe(salta)
    expect(salta).toHaveAttribute('href', '#contenuto')
    // La TabBar è DOPO il contenuto nel DOM, anche se sta in basso sullo schermo.
    const barra = within(nav())
    expect(stops.slice(-5)).toEqual([
      barra.getByRole('link', { name: 'Home' }),
      barra.getByRole('link', { name: 'Tornei' }),
      barra.getByRole('button', { name: 'Crea' }),
      barra.getByRole('link', { name: 'Compagni' }),
      barra.getByRole('link', { name: 'Profilo' }),
    ])
    // In mezzo, il contenuto della Home.
    expect(stops.slice(1, -5)).toContain(screen.getAllByRole('link', { name: 'Rimini Open' })[0])
  })

  it('desktop: «Vai al contenuto» → Sidebar → contenuto', async () => {
    const app = renderApp({ data: diario(), width: 1280 })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    ;(document.activeElement as HTMLElement | null)?.blur()
    const stops = await fermate(app.user)
    const barra = within(nav())
    expect(stops.slice(0, 7)).toEqual([
      screen.getByRole('link', { name: 'Vai al contenuto' }),
      barra.getByRole('link', { name: 'Home' }),
      barra.getByRole('link', { name: 'Tornei' }),
      barra.getByRole('link', { name: 'Compagni' }),
      barra.getByRole('link', { name: 'Profilo' }),
      barra.getByRole('button', { name: 'Nuovo' }),
      barra.getByRole('link', { name: /Marta/ }),
    ])
    expect(screen.getByRole('main')).toContainElement(stops[7] as HTMLElement)
    // Niente ＋ «Crea» della TabBar su desktop.
    expect(screen.queryByRole('button', { name: 'Crea' })).not.toBeInTheDocument()
  })

  it('una sola navigazione «Principale», un solo h1, la tab attiva con aria-current', async () => {
    renderApp({ data: diario(), path: '/compagni' })
    await screen.findByRole('heading', { level: 1, name: 'Compagni' })
    expect(screen.getAllByRole('navigation', { name: 'Principale' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const tabs = within(nav()).getAllByRole('link')
    expect(tabs.map((t) => t.getAttribute('aria-current'))).toEqual([null, null, 'page', null])
    expect(within(nav()).getByRole('link', { name: 'Compagni' })).toHaveAttribute('href', '/compagni')
  })

  it('il ＋ è un pulsante «Crea» che dichiara il menu e lo stato aperto', async () => {
    const app = renderApp({ data: diario() })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    expect(plus).toHaveAttribute('aria-haspopup', 'menu')
    expect(plus).toHaveAttribute('aria-expanded', 'false')
    await app.user.click(plus)
    expect(plus).toHaveAttribute('aria-expanded', 'true')
  })

  it('la tab Tornei riporta all\'ultima vista usata', async () => {
    const app = renderApp({ data: diario(), path: '/tornei/timeline' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await app.user.click(within(nav()).getByRole('link', { name: 'Home' }))
    expect(within(nav()).getByRole('link', { name: 'Tornei' })).toHaveAttribute('href', '/tornei/timeline')
  })
})

// ============================================================================
describe('navigazione — focus, titolo e indietro (UX §4.2, §4.4)', () => {
  it('cambiando tab: URL, titolo della scheda e focus sull\'h1 nello stesso gesto', async () => {
    const app = renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    expect(document.title).toBe('Home · Beach Diary')
    await app.user.click(within(nav()).getByRole('link', { name: 'Tornei' }))
    expect(window.location.pathname).toBe('/tornei')
    expect(document.title).toBe('Tornei · Beach Diary')
    expect(h1('Tornei')).toHaveFocus()
    expect(within(nav()).getByRole('link', { name: 'Tornei' })).toHaveAttribute('aria-current', 'page')
  })

  it('dettaglio dalla lista e ‹ Indietro: il focus torna alla card che l\'ha aperto', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await app.user.click(screen.getByRole('link', { name: 'Cervia Beach Party' }))
    expect(window.location.pathname).toBe(`/tornei/${ID.cervia}`)
    expect(document.title).toBe('Cervia Beach Party · Beach Diary')
    expect(h1('Cervia Beach Party')).toHaveFocus()
    // L'etichetta è il titolo della schermata da cui si è arrivati.
    await app.user.click(screen.getByRole('button', { name: 'Tornei' }))
    await waitFor(() => expect(window.location.pathname).toBe('/tornei'))
    await waitFor(() => expect(screen.getByRole('link', { name: 'Cervia Beach Party' })).toHaveFocus())
  })

  it('il tasto indietro del telefono fa lo stesso', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await app.user.click(screen.getByRole('link', { name: 'Rimini Open' }))
    expect(h1('Rimini Open')).toHaveFocus()
    await indietro()
    expect(window.location.pathname).toBe('/tornei')
    expect(screen.getByRole('link', { name: 'Rimini Open' })).toHaveFocus()
  })

  it('aperto dalla Home, ‹ Indietro si chiama «Home»', async () => {
    const app = renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    await app.user.click(screen.getAllByRole('link', { name: 'Rimini Open' })[0])
    expect(h1('Rimini Open')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })

  it('link diretto senza storia: ‹ Indietro porta al genitore senza aggiungere voci', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    expect(await screen.findByRole('heading', { level: 1, name: 'Cervia Beach Party' })).toBeInTheDocument()
    const prima = window.history.length
    await app.user.click(screen.getByRole('button', { name: 'Tornei' }))
    expect(window.location.pathname).toBe('/tornei')
    expect(window.history.length).toBe(prima)
    expect(h1('Tornei')).toHaveFocus()
  })

  it('il segmented cambia vista senza storia e senza spostare il focus (replace, M4)', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    const prima = window.history.length
    const timeline = screen.getByRole('button', { name: 'Timeline' })
    await app.user.click(timeline)
    expect(window.location.pathname).toBe('/tornei/timeline')
    expect(window.history.length).toBe(prima)
    expect(timeline).toHaveAttribute('aria-pressed', 'true')
    expect(timeline).toHaveFocus()
  })
})

// ============================================================================
describe('stati di §6 — non trovato, primo avvio, primo caricamento fallito', () => {
  it('un torneo che non c\'è: «Torneo non trovato», mai la lista (C9)', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${NESSUNO}` })
    expect(await screen.findByRole('heading', { level: 1, name: 'Torneo non trovato' })).toBeInTheDocument()
    expect(document.title).toBe('Torneo non trovato · Beach Diary')
    expect(screen.getByText('Potrebbe essere stato eliminato, o non è più condiviso con te.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rimini Open' })).not.toBeInTheDocument()
    await app.user.click(screen.getByRole('link', { name: 'Vai ai tornei' }))
    expect(window.location.pathname).toBe('/tornei')
  })

  it('un compagno che non c\'è (o condiviso da altri): «Compagno non trovato»', async () => {
    renderApp({ data: diario(), path: `/compagni/${ID.condivisa}` })
    expect(await screen.findByRole('heading', { level: 1, name: 'Compagno non trovato' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai ai compagni' })).toHaveAttribute('href', '/compagni')
  })

  it('un percorso sconosciuto: «Pagina non trovata» con la via per la Home', async () => {
    renderApp({ data: diario(), path: '/questa/non/esiste' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Pagina non trovata' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai alla Home' })).toHaveAttribute('href', '/')
  })

  it('primo avvio: Home vuota con un solo invito, niente numeri, assistente come link', async () => {
    const app = renderApp({ data: makeData() })
    expect(await screen.findByRole('heading', { name: 'Il tuo diario è vuoto' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Numeri chiave' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Usa l'assistente" })).toHaveAttribute('href', '/crea')
    await app.user.click(screen.getByRole('button', { name: 'Crea il primo torneo' }))
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()
  })

  it('primo avvio: Tornei ha UN EmptyState, senza ricerca né segmented', async () => {
    renderApp({ data: makeData(), path: '/tornei' })
    expect(await screen.findByRole('heading', { name: 'Nessun torneo ancora.' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /vista/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crea il primo torneo' })).toBeInTheDocument()
  })

  it('primo avvio: Compagni invita ad aggiungerne uno', async () => {
    const app = renderApp({ data: makeData(), path: '/compagni' })
    expect(await screen.findByRole('heading', { name: 'Nessun compagno ancora.' })).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: 'Aggiungi un compagno' }))
    expect(screen.getByRole('dialog', { name: 'Nuovo compagno' })).toBeInTheDocument()
  })

  it('primo avvio: il ＋ non propone «Aggiungi partita» senza un torneo di destinazione (F3.5)', async () => {
    const app = renderApp({ data: makeData() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    const menu = screen.getByRole('menu', { name: 'Crea' })
    expect(within(menu).queryByRole('menuitem', { name: /Aggiungi partita/ })).not.toBeInTheDocument()
  })

  it('primo caricamento fallito: ErrorState dentro la shell, non il diario vuoto; Riprova ricarica', async () => {
    const app = renderApp({ data: diario(), fallito: true })
    expect(await screen.findByRole('heading', { name: 'Non riesco a caricare il diario' })).toBeInTheDocument()
    expect(screen.getByText('Qualcosa non ha risposto. I tuoi dati sono al sicuro.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Il tuo diario è vuoto' })).not.toBeInTheDocument()
    // La TabBar resta: si può andare in Profilo, che non dipende dai dati.
    expect(nav()).toBeInTheDocument()
    await app.user.click(within(nav()).getByRole('link', { name: 'Tornei' }))
    expect(screen.getByRole('heading', { name: 'Non riesco a caricare il diario' })).toBeInTheDocument()
    await app.user.click(within(nav()).getByRole('link', { name: 'Profilo' }))
    expect(h1('Profilo')).toBeInTheDocument()

    await app.user.click(within(nav()).getByRole('link', { name: 'Home' }))
    app.failMore(false)
    const prima = app.reloads()
    await app.user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(app.reloads()).toBeGreaterThan(prima)
    expect(await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Non riesco a caricare il diario' })).not.toBeInTheDocument()
  })

  it('primo caricamento fallito offline: il testo lo dice', async () => {
    renderApp({ data: diario(), fallito: true })
    await screen.findByRole('heading', { name: 'Non riesco a caricare il diario' })
    setOnline(false)
    expect(screen.getByText('Sei offline. Il diario si carica quando torni in linea.')).toBeInTheDocument()
  })
})

// ============================================================================
describe('menu ＋ (UX §7.4)', () => {
  it('voci in ordine fisso con il sottotitolo, focus sulla prima, frecce, Home/Fine', async () => {
    const app = renderApp({ data: diario() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    const menu = screen.getByRole('menu', { name: 'Crea' })
    const voci = within(menu).getAllByRole('menuitem')
    expect(voci).toHaveLength(4)
    expect(voci[0]).toHaveAccessibleName(/^Nuovo torneo\s*Nome, data e luogo: il resto dopo$/)
    expect(voci[1]).toHaveAccessibleName(/^Aggiungi partita\s*a «Rimini Open»$/)
    expect(voci[2]).toHaveAccessibleName(/^Check-in oggi\s*Chi c'è in spiaggia$/)
    expect(voci[3]).toHaveAccessibleName('Annulla')
    expect(voci[0]).toHaveFocus()
    await app.user.keyboard('{ArrowDown}')
    expect(voci[1]).toHaveFocus()
    await app.user.keyboard('{End}')
    expect(voci[3]).toHaveFocus()
    await app.user.keyboard('{ArrowDown}')
    expect(voci[0]).toHaveFocus()
    await app.user.keyboard('{ArrowUp}')
    expect(voci[3]).toHaveFocus()
    await app.user.keyboard('{Home}')
    expect(voci[0]).toHaveFocus()
  })

  it('Esc chiude e il focus torna al ＋; la voce di history se ne va', async () => {
    const app = renderApp({ data: diario() })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    const prima = window.history.length
    await app.user.click(plus)
    expect(window.history.length).toBe(prima + 1)
    await app.user.keyboard('{Escape}')
    expect(plus).toHaveFocus()
    expect(plus).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('Tab esce dal menu e lo chiude (non resta un menu aperto dietro al focus)', async () => {
    const app = renderApp({ data: diario() })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    await app.user.click(plus)
    await app.user.tab()
    expect(plus).toHaveFocus()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('«Annulla» chiude come Esc', async () => {
    const app = renderApp({ data: diario() })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    await app.user.click(plus)
    await app.user.click(screen.getByRole('menuitem', { name: 'Annulla' }))
    expect(plus).toHaveFocus()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('il tasto indietro chiude il menu e non cambia pagina', async () => {
    const app = renderApp({ data: diario(), path: '/compagni' })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await indietro()
    expect(window.location.pathname).toBe('/compagni')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('«Nuovo torneo» sostituisce il menu con lo sheet: focus sul primo campo, l\'indietro non riapre il menu', async () => {
    const app = renderApp({ data: diario() })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    const prima = window.history.length
    await app.user.click(plus)
    await app.user.click(screen.getByRole('menuitem', { name: /Nuovo torneo/ }))
    const sheet = screen.getByRole('dialog', { name: 'Nuovo torneo' })
    expect(within(sheet).getByRole('textbox', { name: /Nome torneo/ })).toHaveFocus()
    // Il menu ha ceduto la sua voce allo sheet: una voce sola sopra la pagina.
    expect(window.history.length).toBe(prima + 1)
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(within(sheet).getByRole('textbox', { name: /Nome torneo/ })).toHaveFocus()

    await indietro()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    expect(plus).toHaveFocus()
  })

  it('«Aggiungi partita» apre lo sheet con il torneo di destinazione già scelto', async () => {
    const app = renderApp({ data: diario() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /Aggiungi partita/ }))
    const sheet = screen.getByRole('dialog', { name: 'Nuova partita' })
    expect(within(sheet).getByRole('combobox', { name: 'Torneo' })).toHaveValue(ID.rimini)
  })

  it('«Check-in oggi» è una rotta: porta a /oggi; in check-in la voce dice dove sei', async () => {
    const app = renderApp({ data: diario(), own: OWN })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /Sei a Rimini oggi/ }))
    expect(window.location.pathname).toBe('/oggi')
    // Il focus va all'h1 della rotta nuova: il menu che esce non lo riporta al ＋.
    expect(h1("Chi c'è oggi")).toHaveFocus()
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(h1("Chi c'è oggi")).toHaveFocus()
  })

  it('desktop: «Nuovo» della Sidebar apre lo stesso menu come popover, senza «Annulla»', async () => {
    const app = renderApp({ data: diario(), width: 1280 })
    const nuovo = await screen.findByRole('button', { name: 'Nuovo' })
    expect(nuovo).toHaveAttribute('aria-haspopup', 'menu')
    await app.user.click(nuovo)
    const menu = screen.getByRole('menu', { name: 'Crea' })
    expect(nuovo).toHaveAttribute('aria-expanded', 'true')
    expect(within(menu).queryByRole('menuitem', { name: 'Annulla' })).not.toBeInTheDocument()
    expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus()
    await app.user.keyboard('{Escape}')
    expect(nuovo).toHaveFocus()
  })
})

// ============================================================================
describe('sheet (UX §7.5) nell\'app', () => {
  async function apriNuovoTorneo(app: ReturnType<typeof renderApp>) {
    const plus = await screen.findByRole('button', { name: 'Crea' })
    await app.user.click(plus)
    await app.user.click(screen.getByRole('menuitem', { name: /Nuovo torneo/ }))
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    return { plus, sheet: screen.getByRole('dialog', { name: 'Nuovo torneo' }) }
  }

  it('è un dialogo modale con il nome dal suo h2', async () => {
    const app = renderApp({ data: diario() })
    const { sheet } = await apriNuovoTorneo(app)
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Nuovo torneo' })).toBeInTheDocument()
  })

  it('la trappola del focus: Maiusc+Tab dal primo campo va all\'ultima azione, Tab da lì torna al primo', async () => {
    const app = renderApp({ data: diario() })
    const { sheet } = await apriNuovoTorneo(app)
    const nome = within(sheet).getByRole('textbox', { name: /Nome torneo/ })
    const crea = within(sheet).getByRole('button', { name: 'Crea torneo' })
    expect(nome).toHaveFocus()
    await app.user.tab({ shift: true })
    expect(crea).toHaveFocus()
    await app.user.tab()
    expect(nome).toHaveFocus()
    // Fuori dallo sheet il focus non ci arriva mai.
    for (let i = 0; i < 30; i++) {
      await app.user.tab()
      expect(sheet).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('pulito: Esc chiude e il focus torna a chi aveva aperto il menu', async () => {
    const app = renderApp({ data: diario() })
    const { plus } = await apriNuovoTorneo(app)
    await app.user.keyboard('{Escape}')
    expect(plus).toHaveFocus()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('sporco: Esc chiede «Scartare le modifiche?»; «Continua a modificare» torna al campo con i dati intatti', async () => {
    const app = renderApp({ data: diario() })
    const { sheet } = await apriNuovoTorneo(app)
    const nome = within(sheet).getByRole('textbox', { name: /Nome torneo/ })
    await app.user.type(nome, 'Summer Cup')
    await app.user.keyboard('{Escape}')
    const dialogo = screen.getByRole('alertdialog', { name: 'Scartare le modifiche?' })
    expect(dialogo).toHaveAccessibleDescription('Quello che hai scritto andrà perso.')
    // Focus sull'azione NON distruttiva.
    expect(within(dialogo).getByRole('button', { name: 'Continua a modificare' })).toHaveFocus()
    await app.user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(nome).toHaveFocus()
    expect(nome).toHaveValue('Summer Cup')
  })

  it('sporco: «Scarta» chiude entrambi e il focus torna al ＋', async () => {
    const app = renderApp({ data: diario() })
    const { plus, sheet } = await apriNuovoTorneo(app)
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'Summer Cup')
    await app.user.click(within(sheet).getByRole('button', { name: 'Annulla' }))
    await app.user.click(screen.getByRole('button', { name: 'Scarta' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(plus).toHaveFocus()
    expect(window.location.pathname).toBe('/')
  })

  it('sporco: il tasto indietro non chiude, chiede; l\'URL resta', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    const { sheet } = await apriNuovoTorneo(app)
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'X')
    await indietro()
    expect(screen.getByRole('alertdialog', { name: 'Scartare le modifiche?' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/tornei')
  })

  it('«Crea torneo» annunciato disattivo senza nome; il tocco porta al campo e dice cosa manca', async () => {
    const app = renderApp({ data: diario() })
    const { sheet } = await apriNuovoTorneo(app)
    const crea = within(sheet).getByRole('button', { name: 'Crea torneo' })
    expect(crea).toHaveAttribute('aria-disabled', 'true')
    await app.user.click(crea)
    const nome = within(sheet).getByRole('textbox', { name: /Nome torneo/ })
    expect(nome).toHaveFocus()
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveAccessibleDescription(/Scrivi il nome del torneo\./)
    expect(app.calls.filter((c) => c.name === 'saveTorneo')).toHaveLength(0)
  })

  it('creazione riuscita: «Creo…» occupato, poi il dettaglio al posto dello sheet e il Toast', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    const { sheet } = await apriNuovoTorneo(app)
    const prima = window.history.length
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'Summer Cup')
    app.hold('saveTorneo')
    await app.user.click(within(sheet).getByRole('button', { name: 'Crea torneo' }))
    const occupato = within(sheet).getByRole('button', { name: 'Creo…' })
    expect(occupato).toHaveAttribute('aria-busy', 'true')
    // Il doppio tocco non salva due volte.
    await app.user.click(occupato)
    expect(app.calls.filter((c) => c.name === 'saveTorneo')).toHaveLength(1)
    // Durante il salvataggio Esc non chiude.
    await app.user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()

    await app.release()
    expect(await screen.findByRole('heading', { level: 1, name: 'Summer Cup' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(statusRegion()).getByText('Torneo creato')).toBeInTheDocument()
    // La voce dello sheet è diventata il dettaglio: l'indietro torna a Tornei.
    expect(window.history.length).toBe(prima)
    await indietro()
    expect(window.location.pathname).toBe('/tornei')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creazione fallita: lo sheet resta aperto con i dati e l\'errore è un alert', async () => {
    const app = renderApp({ data: diario(), fail: ['saveTorneo'] })
    const { sheet } = await apriNuovoTorneo(app)
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'Summer Cup')
    await app.user.click(within(sheet).getByRole('button', { name: 'Crea torneo' }))
    const alert = screen.getAllByRole('alert').find((n) => n.textContent?.includes('Non è stato possibile salvare'))
    expect(alert).toHaveTextContent('Non è stato possibile salvare. Riprova tra poco.')
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()
    expect(within(sheet).getByRole('textbox', { name: /Nome torneo/ })).toHaveValue('Summer Cup')
  })

  it('offline: il salvataggio fallito lo dice con il testo dedicato', async () => {
    const app = renderApp({ data: diario(), fail: ['saveTorneo'] })
    const { sheet } = await apriNuovoTorneo(app)
    setOnline(false)
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'Summer Cup')
    await app.user.click(within(sheet).getByRole('button', { name: 'Crea torneo' }))
    expect(await screen.findByText('Sei offline: non ho salvato. Riprova quando torni in linea.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()
  })

  it('«Usa l\'assistente» con il modulo sporco chiede prima di buttare quel che c\'è', async () => {
    const app = renderApp({ data: diario() })
    const { sheet } = await apriNuovoTorneo(app)
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'X')
    await app.user.click(within(sheet).getByRole('button', { name: /Usa l'assistente/ }))
    const d = screen.getByRole('alertdialog', { name: "Passare all'assistente?" })
    await app.user.click(within(d).getByRole('button', { name: 'Resta' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()
    await app.user.click(within(sheet).getByRole('button', { name: /Usa l'assistente/ }))
    await app.user.click(screen.getByRole('button', { name: 'Passa' }))
    await waitFor(() => expect(window.location.pathname).toBe('/crea'))
  })

  it('un refresh con lo sheet aperto non lo riapre e ripulisce la voce', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await apriNuovoTorneo(app)
    expect((window.history.state as { overlay?: string }).overlay).toBeTruthy()
    cleanup()
    renderApp({ data: diario(), refresh: true })
    expect(await screen.findByRole('heading', { level: 1, name: 'Tornei' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((window.history.state as { overlay?: string }).overlay).toBeUndefined()
  })
})

// ============================================================================
describe('tocco (MOTION.md M3)', () => {
  it('uno sheet aperto col dito mette il focus sul titolo, non nel campo (niente tastiera a sorpresa)', async () => {
    const app = renderApp({ data: diario() })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    await app.user.pointer({ keys: '[TouchA]', target: plus })
    const voce = screen.getByRole('menuitem', { name: /Nuovo torneo/ })
    await app.user.pointer({ keys: '[TouchA]', target: voce })
    const sheet = screen.getByRole('dialog', { name: 'Nuovo torneo' })
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Nuovo torneo' })).toHaveFocus()
    expect(within(sheet).getByRole('textbox', { name: /Nome torneo/ })).not.toHaveFocus()
  })

  it('da tastiera lo stesso sheet mette il focus nel primo campo', async () => {
    const app = renderApp({ data: diario(), path: '/compagni' })
    const nuovo = await screen.findByRole('button', { name: 'Nuovo compagno' })
    nuovo.focus()
    await app.user.keyboard('{Enter}')
    const sheet = screen.getByRole('dialog', { name: 'Nuovo compagno' })
    expect(within(sheet).getByRole('textbox')).toHaveFocus()
  })

  it('il ritocco della tab attiva alla radice riporta in cima, morbido', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    const scrollTo = vi.fn()
    const el = (document.scrollingElement ?? document.documentElement) as HTMLElement
    el.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
    const prima = window.history.length
    await app.user.pointer({ keys: '[TouchA]', target: within(nav()).getByRole('link', { name: 'Tornei' }) })
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
    expect(window.history.length).toBe(prima)
  })
})

// ============================================================================
describe('reduced-motion (UX §8.7, MOTION.md §11)', () => {
  it('il ritocco della tab torna in cima di scatto, senza scorrimento animato', async () => {
    const app = renderApp({ data: diario(), path: '/tornei', reduce: true })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    const scrollTo = vi.fn()
    const el = (document.scrollingElement ?? document.documentElement) as HTMLElement
    el.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
    await app.user.click(within(nav()).getByRole('link', { name: 'Tornei' }))
    expect(scrollTo).toHaveBeenCalled()
    for (const [arg] of scrollTo.mock.calls) expect(arg).toEqual({ top: 0, behavior: 'auto' })
  })

  it('ogni flusso arriva comunque allo stato finale: menu → sheet → conferma → chiuso', async () => {
    const app = renderApp({ data: diario(), reduce: true })
    const plus = await screen.findByRole('button', { name: 'Crea' })
    await app.user.click(plus)
    await app.user.click(screen.getByRole('menuitem', { name: /Nuovo torneo/ }))
    const sheet = screen.getByRole('dialog', { name: 'Nuovo torneo' })
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'X')
    await app.user.keyboard('{Escape}')
    await app.user.click(screen.getByRole('button', { name: 'Scarta' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(plus).toHaveFocus()
  })
})

// ============================================================================
describe('conferme distruttive (UX §7.7): alertdialog, Annulla per primo, esito', () => {
  async function apriAltreAzioni(app: ReturnType<typeof renderApp>) {
    const altre = await screen.findByRole('button', { name: 'Altre azioni' })
    expect(altre).toHaveAttribute('aria-haspopup', 'menu')
    await app.user.click(altre)
    return altre
  }

  it('Elimina torneo: testo con le conseguenze, Esc = Annulla, il focus torna a «Altre azioni»', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    const altre = await apriAltreAzioni(app)
    const menu = screen.getByRole('menu', { name: 'Cervia Beach Party' })
    expectNomi(within(menu).getAllByRole('menuitem'), ['Modifica', 'Storia Instagram', 'Elimina torneo'])
    await app.user.click(within(menu).getByRole('menuitem', { name: 'Elimina torneo' }))
    const d = screen.getByRole('alertdialog', { name: 'Eliminare «Cervia Beach Party»?' })
    expect(d).toHaveAccessibleDescription('Spariscono anche le sue 2 partite e 1 foto. Non si può annullare.')
    expect(within(d).getByRole('button', { name: 'Annulla' })).toHaveFocus()
    await app.user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(altre).toHaveFocus()
    expect(app.calls.filter((c) => c.name === 'deleteTorneo')).toHaveLength(0)
  })

  it('Elimina torneo riuscito: replace verso la lista, Toast; l\'indietro non riporta al dettaglio', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await app.user.click(screen.getByRole('link', { name: 'Cervia Beach Party' }))
    await apriAltreAzioni(app)
    await app.user.click(screen.getByRole('menuitem', { name: 'Elimina torneo' }))
    await app.user.click(screen.getByRole('button', { name: 'Elimina torneo' }))
    await waitFor(() => expect(window.location.pathname).toBe('/tornei'))
    expect(await within(statusRegion()).findByText('Torneo eliminato')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Cervia Beach Party' })).not.toBeInTheDocument()
    expect(h1('Tornei')).toHaveFocus()
    // Il dettaglio è stato sostituito: l'indietro non ci riporta su un torneo che non c'è più.
    await indietro()
    expect(screen.queryByRole('heading', { level: 1, name: 'Torneo non trovato' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/tornei')
  })

  it('Elimina torneo fallito: Toast d\'errore e si resta sul dettaglio (C13)', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}`, fail: ['deleteTorneo'] })
    await apriAltreAzioni(app)
    await app.user.click(screen.getByRole('menuitem', { name: 'Elimina torneo' }))
    await app.user.click(screen.getByRole('button', { name: 'Elimina torneo' }))
    expect(await screen.findByText('Non è stato possibile eliminare. Riprova tra poco.')).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/tornei/${ID.cervia}`)
    expect(h1('Cervia Beach Party')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('torneo condiviso: «sola lettura», il menu ha la sola Storia, niente «Aggiungi partita»', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.sara}` })
    expect(await screen.findByText('Condiviso con te · sola lettura')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aggiungi partita' })).not.toBeInTheDocument()
    await apriAltreAzioni(app)
    expectNomi(within(screen.getByRole('menu')).getAllByRole('menuitem'), ['Storia Instagram'])
  })

  it('Elimina partita, dallo sheet della partita', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    await screen.findByRole('heading', { level: 1, name: 'Cervia Beach Party' })
    await app.user.click(screen.getByRole('button', { name: /Conti \/ Gallo/ }))
    const sheet = screen.getByRole('dialog', { name: 'Modifica partita' })
    await app.user.click(within(sheet).getByRole('button', { name: 'Elimina partita' }))
    const d = screen.getByRole('alertdialog', { name: 'Eliminare la partita contro Conti / Gallo?' })
    expect(d).toHaveAccessibleDescription('Non si può annullare.')
    await app.user.click(within(d).getByRole('button', { name: 'Elimina partita' }))
    expect(await within(statusRegion()).findByText('Partita eliminata')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Conti \/ Gallo/ })).not.toBeInTheDocument()
  })

  it('Elimina foto', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    await screen.findByRole('heading', { level: 1, name: 'Cervia Beach Party' })
    await app.user.click(screen.getByRole('button', { name: 'Elimina foto: La finale' }))
    const d = screen.getByRole('alertdialog', { name: 'Eliminare questa foto?' })
    expect(d).toHaveAccessibleDescription('Non si può annullare.')
    await app.user.click(within(d).getByRole('button', { name: 'Elimina foto' }))
    expect(await within(statusRegion()).findByText('Foto eliminata')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina foto: La finale' })).not.toBeInTheDocument()
    // Il pulsante che l'aveva aperto non c'è più: il focus va all'h1 (UX §8.3.3).
    await waitFor(() => expect(h1('Cervia Beach Party')).toHaveFocus())
  })

  it('Elimina compagno: replace verso /compagni e Toast', async () => {
    const app = renderApp({ data: diario(), path: `/compagni/${ID.giulia}` })
    await apriAltreAzioni(app)
    await app.user.click(screen.getByRole('menuitem', { name: 'Elimina compagno' }))
    const d = screen.getByRole('alertdialog', { name: 'Eliminare «Giulia»?' })
    expect(d).toHaveAccessibleDescription(
      'Nei tornei e nelle partite resterà segnato come "nessuno" e non conterà più nelle sue statistiche. Non si può annullare.',
    )
    await app.user.click(within(d).getByRole('button', { name: 'Elimina compagno' }))
    await waitFor(() => expect(window.location.pathname).toBe('/compagni'))
    expect(await within(statusRegion()).findByText('Compagno eliminato')).toBeInTheDocument()
  })

  it('Scollega compagno', async () => {
    const app = renderApp({ data: diario(), path: `/compagni/${ID.marco}` })
    await screen.findByRole('heading', { level: 1, name: 'Marco' })
    await app.user.click(screen.getByRole('button', { name: /Scollega/ }))
    const d = screen.getByRole('alertdialog', { name: 'Scollegare «Marco» dal suo account?' })
    expect(d).toHaveAccessibleDescription(
      'I tornei giocati insieme smettono di essere condivisi con quell\'account. Potrai ricollegarlo quando vuoi.',
    )
    await app.user.click(within(d).getByRole('button', { name: 'Scollega' }))
    expect(await within(statusRegion()).findByText('Scollegato')).toBeInTheDocument()
  })

  it('Togli condivisioni (Profilo)', async () => {
    const app = renderApp({ data: diario(), path: '/profilo' })
    await screen.findByRole('heading', { level: 1, name: 'Profilo' })
    await app.user.click(screen.getByRole('button', { name: /Togli tutte le condivisioni/ }))
    const d = screen.getByRole('alertdialog', { name: 'Togliere tutte le condivisioni ricevute?' })
    expect(d).toHaveAccessibleDescription('I tornei degli altri spariranno dal tuo diario e dalle tue statistiche.')
    await app.user.click(within(d).getByRole('button', { name: 'Togli condivisioni' }))
    expect(await within(statusRegion()).findByText('Condivisione rimossa')).toBeInTheDocument()
  })

  it('Termina check-in', async () => {
    const app = renderApp({ data: diario(), path: '/oggi', own: OWN })
    await screen.findByRole('heading', { level: 1, name: "Chi c'è oggi" })
    await app.user.click(screen.getByRole('button', { name: 'Termina check-in' }))
    const d = screen.getByRole('alertdialog', { name: 'Terminare il check-in a Rimini?' })
    expect(d).toHaveAccessibleDescription('Non comparirai più fra chi è in spiaggia oggi.')
    await app.user.click(within(d).getByRole('button', { name: 'Termina check-in' }))
    expect(await screen.findByRole('button', { name: 'Fai check-in' })).toBeInTheDocument()
  })

  it('Esci dall\'account: conferma, poi logout e ritorno alla Home in replace', async () => {
    const app = renderApp({ data: diario(), path: '/profilo' })
    await screen.findByRole('heading', { level: 1, name: 'Profilo' })
    await app.user.click(screen.getByRole('button', { name: 'Esci' }))
    const d = screen.getByRole('alertdialog', { name: "Esci dall'account?" })
    expect(within(d).getByRole('button', { name: 'Annulla' })).toHaveFocus()
    await app.user.click(within(d).getByRole('button', { name: 'Esci' }))
    await waitFor(() => expect(app.logout.n).toBe(1))
    expect(window.location.pathname).toBe('/')
  })

  it('la trappola del focus vale anche per il dialogo', async () => {
    const app = renderApp({ data: diario(), path: '/profilo' })
    await screen.findByRole('heading', { level: 1, name: 'Profilo' })
    await app.user.click(screen.getByRole('button', { name: 'Esci' }))
    const d = screen.getByRole('alertdialog', { name: "Esci dall'account?" })
    for (let i = 0; i < 5; i++) {
      await app.user.tab()
      expect(d).toContainElement(document.activeElement as HTMLElement)
    }
    await app.user.tab({ shift: true })
    expect(d).toContainElement(document.activeElement as HTMLElement)
  })
})

// ============================================================================
describe('visori (UX §6.5, §8.2)', () => {
  it('lightbox: «Foto i di n», focus sul ✕, trappola, ←/→ cambiano foto, Esc torna alla foto', async () => {
    const d0 = diario()
    d0.photos.push(makePhoto({ tournamentId: ID.cervia, caption: 'Il podio', url: 'https://cdn.example/podio.jpg' }))
    const app = renderApp({ data: d0, path: `/tornei/${ID.cervia}` })
    const foto = await screen.findByRole('button', { name: 'Foto: Il podio' })
    await app.user.click(foto)
    const d = await screen.findByRole('dialog', { name: 'Foto 2 di 2' })
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(within(d).getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    for (let i = 0; i < 6; i++) {
      await app.user.tab()
      expect(d).toContainElement(document.activeElement as HTMLElement)
    }
    await app.user.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog', { name: 'Foto 1 di 2' })).toBeInTheDocument()
    await app.user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('dialog', { name: 'Foto 2 di 2' })).toBeInTheDocument()
    await app.user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(foto).toHaveFocus()
  })

  it('il tasto indietro chiude il lightbox senza lasciare il dettaglio', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    await app.user.click(await screen.findByRole('button', { name: 'Foto: La finale' }))
    await screen.findByRole('dialog', { name: 'Foto 1 di 1' })
    await indietro()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(window.location.pathname).toBe(`/tornei/${ID.cervia}`)
  })

  it('Storia: dal menu «Altre azioni», focus sul ✕, colore a radiogroup con le frecce, Esc torna al menu che l\'ha aperta', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    const altre = await screen.findByRole('button', { name: 'Altre azioni' })
    await app.user.click(altre)
    await app.user.click(screen.getByRole('menuitem', { name: 'Storia Instagram' }))
    const d = await screen.findByRole('dialog', { name: 'Storia di Cervia Beach Party' })
    expect(within(d).getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    const gruppo = within(d).getByRole('radiogroup', { name: 'Colore della storia' })
    const radios = within(gruppo).getAllByRole('radio')
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
    const scelto = radios.findIndex((r) => r.getAttribute('aria-checked') === 'true')
    radios[scelto].focus()
    await app.user.keyboard('{ArrowRight}')
    const dopo = (scelto + 1) % radios.length
    expect(radios[dopo]).toHaveAttribute('aria-checked', 'true')
    expect(radios[dopo]).toHaveFocus()
    // Un solo radio nel giro del Tab: quello scelto.
    expect(radios.filter((r) => r.tabIndex === 0)).toEqual([radios[dopo]])
    await app.user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(altre).toHaveFocus()
  })

  it('axe sul lightbox e sulla Storia', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    await app.user.click(await screen.findByRole('button', { name: 'Foto: La finale' }))
    await screen.findByRole('dialog', { name: 'Foto 1 di 1' })
    await expectNoA11yViolations(document.body)
    await app.user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await app.user.click(screen.getByRole('button', { name: 'Altre azioni' }))
    await app.user.click(screen.getByRole('menuitem', { name: 'Storia Instagram' }))
    await screen.findByRole('dialog', { name: 'Storia di Cervia Beach Party' })
    await expectNoA11yViolations(document.body)
  })
})

// ============================================================================
describe('banner alpha (UX §6.1, Q5)', () => {
  it('chiuso resta chiuso dopo un refresh per quell\'utente; Segnala resta in Profilo', async () => {
    const app = renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    expect(screen.getByRole('link', { name: 'Segnala un problema' })).toHaveAttribute('href', '/profilo/segnala')
    await app.user.click(screen.getByRole('button', { name: /Chiudi/ }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Segnala un problema' })).not.toBeInTheDocument())
    cleanup()
    renderApp({ data: diario(), refresh: true })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    expect(screen.queryByRole('link', { name: 'Segnala un problema' })).not.toBeInTheDocument()
    cleanup()
    // Un altro account sullo stesso dispositivo lo vede ancora.
    renderApp({ data: diario(), refresh: true, session: { id: '00000000-0000-4000-8000-0000000000aa', name: 'Luca' } })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Luca' })
    expect(screen.getByRole('link', { name: 'Segnala un problema' })).toBeInTheDocument()
  })
})

// ============================================================================
describe('avvisi (UX §7.8)', () => {
  it('la regione è sempre montata e vuota: status polite e alert', async () => {
    renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    expect(statusRegion()).toBeEmptyDOMElement()
    expect(screen.getAllByRole('alert').some((n) => n.childElementCount === 0)).toBe(true)
  })

  it('offline: «Sei offline» persistente e senza ×; torna la rete e se ne va', async () => {
    renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    setOnline(false)
    const avviso = within(statusRegion()).getByText('Sei offline')
    expect(avviso).toBeInTheDocument()
    expect(within(statusRegion()).queryByRole('button', { name: 'Chiudi avviso' })).not.toBeInTheDocument()
    setOnline(true)
    await waitFor(() => expect(within(statusRegion()).queryByText('Sei offline')).not.toBeInTheDocument())
  })

  it('un errore resta finché non lo chiudi con un vero pulsante', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}`, fail: ['deleteFoto'] })
    await screen.findByRole('heading', { level: 1, name: 'Cervia Beach Party' })
    await app.user.click(screen.getByRole('button', { name: 'Elimina foto: La finale' }))
    await app.user.click(screen.getByRole('button', { name: 'Elimina foto' }))
    const testo = await screen.findByText('Non è stato possibile eliminare. Riprova tra poco.')
    const alert = testo.closest('[role="alert"]') as HTMLElement
    expect(alert).toBeInTheDocument()
    await app.user.click(within(alert).getByRole('button', { name: 'Chiudi avviso' }))
    await waitFor(() => expect(screen.queryByText('Non è stato possibile eliminare. Riprova tra poco.')).not.toBeInTheDocument())
  })
})

// ============================================================================
describe('breakpoint (UX §9.1)', () => {
  it('sotto i 900 TabBar, da 900 Sidebar: il cambio di finestra scambia la navigazione', async () => {
    renderApp({ data: diario(), width: 899 })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    expect(screen.getByRole('button', { name: 'Crea' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuovo' })).not.toBeInTheDocument()
    setViewport({ width: 900 })
    expect(screen.queryByRole('button', { name: 'Crea' })).not.toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: 'Nuovo' })).toBeInTheDocument()
    // Il piede della Sidebar porta a Profilo con nome ed email.
    expect(within(nav()).getByRole('link', { name: /Marta.*marta@esempio\.it/ })).toHaveAttribute('href', '/profilo')
    setViewport({ width: 390 })
    expect(screen.getByRole('button', { name: 'Crea' })).toBeInTheDocument()
  })

  it('/crea è a tutto schermo: niente TabBar su mobile, la Sidebar resta su desktop', async () => {
    renderApp({ data: diario(), path: '/crea' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Assistente torneo' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principale' })).not.toBeInTheDocument()
    setViewport({ width: 1280 })
    expect(nav()).toBeInTheDocument()
  })

  it('il campo di testo fuori da uno sheet nasconde la TabBar (tastiera su), dentro uno sheet no', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await app.user.click(screen.getByRole('searchbox', { name: 'Cerca nei tornei' }))
    expect(nav()).toHaveAttribute('data-hidden')
    await app.user.click(h1('Tornei'))
    await waitFor(() => expect(nav()).not.toHaveAttribute('data-hidden'))
  })
})

// ============================================================================
describe('axe sui flussi principali', () => {
  it('Home con dati', async () => {
    renderApp({ data: diario() })
    await screen.findByRole('heading', { level: 1, name: 'Ciao, Marta' })
    await expectNoA11yViolations(document.body)
  })

  it('Home al primo avvio', async () => {
    renderApp({ data: makeData() })
    await screen.findByRole('heading', { name: 'Il tuo diario è vuoto' })
    await expectNoA11yViolations(document.body)
  })

  it('Tornei: Lista e Timeline', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await expectNoA11yViolations(document.body)
    await app.user.click(screen.getByRole('button', { name: 'Timeline' }))
    await screen.findByRole('link', { name: 'Cervia Beach Party' })
    await expectNoA11yViolations(document.body)
  })

  it('dettaglio torneo, con il menu «Altre azioni» aperto', async () => {
    const app = renderApp({ data: diario(), path: `/tornei/${ID.cervia}` })
    await screen.findByRole('heading', { level: 1, name: 'Cervia Beach Party' })
    await expectNoA11yViolations(document.body)
    await app.user.click(screen.getByRole('button', { name: 'Altre azioni' }))
    await expectNoA11yViolations(document.body)
  })

  it('menu ＋, sheet Nuovo torneo con Altri dettagli aperto, conferma di scarto', async () => {
    const app = renderApp({ data: diario() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await expectNoA11yViolations(document.body)
    await app.user.click(screen.getByRole('menuitem', { name: /Nuovo torneo/ }))
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    const sheet = screen.getByRole('dialog', { name: 'Nuovo torneo' })
    await app.user.click(within(sheet).getByRole('button', { name: /Altri dettagli/ }))
    await expectNoA11yViolations(document.body)
    await app.user.type(within(sheet).getByRole('textbox', { name: /Nome torneo/ }), 'X')
    await app.user.keyboard('{Escape}')
    screen.getByRole('alertdialog', { name: 'Scartare le modifiche?' })
    await expectNoA11yViolations(document.body)
  })

  it('Compagni, Profilo, errore di primo caricamento, desktop', async () => {
    const app = renderApp({ data: diario(), path: '/compagni', width: 1280 })
    await screen.findByRole('heading', { level: 1, name: 'Compagni' })
    await expectNoA11yViolations(document.body)
    await app.user.click(within(nav()).getByRole('link', { name: 'Profilo' }))
    await screen.findByRole('heading', { level: 1, name: 'Profilo' })
    await expectNoA11yViolations(document.body)
  })

  it('ErrorState del primo caricamento', async () => {
    renderApp({ data: diario(), fallito: true })
    await screen.findByRole('heading', { name: 'Non riesco a caricare il diario' })
    await expectNoA11yViolations(document.body)
  })
})
