// ============================================================================
// Il Campionato per Società nell'app vera (AppView, router, ModalHost, sheet
// e schermate), con il diario e il Campionato in memoria (src/test/app.tsx).
//
// Coperto qui: la prima tappa dal ＋ (società e classifica, punti proposti),
// la partita di una tappa, la pagina e i suoi ingressi (Tornei, Statistiche),
// «Partita» nel ＋ che va alla tappa più recente, modifica della società,
// eliminazione, errori, axe. E soprattutto la separazione: le tappe non
// cambiano un solo numero delle Statistiche.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, within, waitFor } from '@testing-library/react'
import { renderApp } from '../test/app'
import { expectNoA11yViolations } from '../test/axe'
import { lossSets, makeData, makeMatch, makePartner, makeTournament, winSets } from '../test/factories'
import type { CampionatoData } from '../lib/campionato'
import type { DiaryData } from '../lib/models'

vi.mock('../lib/dashboard', () => ({ getDashboardStats: () => Promise.resolve(null) }))
vi.mock('../lib/serverviews', () => ({
  getTorneiList: () => Promise.resolve(null),
  getCompagniList: () => Promise.resolve(null),
  getTorneoDetail: () => Promise.resolve(null),
  getCompagnoDetail: () => Promise.resolve(null),
}))
vi.mock('html-to-image', () => ({ toPng: () => Promise.resolve('data:image/png;base64,'), toBlob: () => Promise.resolve(null) }))
vi.mock('../lib/segnalazioni', async (orig) => ({
  ...(await orig<typeof import('../lib/segnalazioni')>()),
  elencoSegnalazioni: () => Promise.resolve([]),
}))

const ID = {
  rimini: '0b6f6a4e-3f6b-4b2a-9a51-000000000101',
  isc: '0b6f6a4e-3f6b-4b2a-9a51-000000000201',
  milano: '0b6f6a4e-3f6b-4b2a-9a51-000000000301',
  bologna: '0b6f6a4e-3f6b-4b2a-9a51-000000000302',
}

/** Un torneo d'estate con due partite (1 vinta, 1 persa): i numeri delle Statistiche. */
function diario(): DiaryData {
  const giulia = makePartner({ id: 'p-giulia', name: 'Giulia' })
  return makeData({
    partners: [giulia],
    tournaments: [makeTournament({ id: ID.rimini, name: 'Rimini Open', date: '2026-07-20', partnerId: giulia.id, placement: '1° 🏆' })],
    matches: [
      makeMatch({ tournamentId: ID.rimini, partnerId: giulia.id, sets: winSets() }),
      makeMatch({ tournamentId: ID.rimini, partnerId: giulia.id, sets: lossSets() }),
    ],
  })
}

/** Due tappe Silver del 2026/27: tre partite, tutte vinte. */
function campionato(): CampionatoData {
  const tappa = { kind: 'Tappa', category: 'Silver', organizer: '', partnerId: 'p-giulia', partnerOtherClub: false, setPoints: 15, teams: null, note: '' } as const
  return {
    iscrizioni: [{ id: ID.isc, season: '2026/27', club: 'Lido Nord Volley', gender: 'F' }],
    tappe: [
      { ...tappa, id: ID.milano, seasonId: ID.isc, date: '2026-11-15', city: 'Milano', placement: 3, pairPoints: 56, countsForClub: true, clubPoints: 80 },
      { ...tappa, id: ID.bologna, seasonId: ID.isc, date: '2026-10-25', city: 'Bologna', placement: 2, pairPoints: 63, countsForClub: true, clubPoints: 90 },
    ],
    partite: [
      { id: 'cm1', stageId: ID.milano, phase: 'Pool', opponents: 'Conti / Gallo', opponentsClub: 'Riviera Sand Club', outcome: 'giocata', note: '', sets: [{ us: 15, them: 12 }, { us: 15, them: 13 }] },
      { id: 'cm2', stageId: ID.milano, phase: 'Pool', opponents: 'Neri / Sala', opponentsClub: 'Lido Nord Volley', outcome: 'giocata', note: '', sets: [{ us: 15, them: 9 }, { us: 15, them: 10 }] },
      { id: 'cm3', stageId: ID.bologna, phase: 'Finale', opponents: 'Rossi / Leone', opponentsClub: 'Duna Rossa BV', outcome: 'giocata', note: '', sets: [{ us: 15, them: 11 }, { us: 15, them: 13 }] },
    ],
  }
}

const h1 = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name })
const statusRegion = () => screen.getAllByRole('status').find((n) => n.closest('[aria-live]') === n || n.getAttribute('aria-live') === 'polite')!

beforeEach(() => {
  // Novembre: si gioca il Campionato invernale (stagione 2026/27).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-21T09:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('la prima tappa dal ＋', () => {
  it('chiede società e classifica, propone i punti dalla tabella e porta al dettaglio', async () => {
    const app = renderApp({ data: diario() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /^Tappa del Campionato/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Nuova tappa' })
    const s = within(sheet)

    // Senza società il Salva dice cosa manca e porta al campo.
    await app.user.click(s.getByRole('button', { name: 'Salva' }))
    expect(await s.findByText('Scrivi la tua società.')).toBeInTheDocument()
    expect(s.getByRole('textbox', { name: 'La tua società' })).toHaveFocus()

    await app.user.type(s.getByRole('textbox', { name: 'La tua società' }), 'Lido Nord Volley')
    await app.user.click(s.getByRole('button', { name: 'Femminile' }))
    await app.user.type(s.getByRole('textbox', { name: 'Città' }), 'Milano')
    await app.user.click(s.getByRole('button', { name: '3°' }))
    // Silver 2026/27, 3° posto: 56 di coppia, 80 alla società.
    expect(s.getByRole('textbox', { name: 'Punti di coppia' })).toHaveValue('56')
    expect(s.getByRole('textbox', { name: 'Punti alla società' })).toHaveValue('80')

    await app.user.click(s.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tappa Silver · Milano' })).toBeInTheDocument()
    expect(window.location.pathname).toMatch(/^\/campionato\/[0-9a-f-]{36}$/)
    expect(await within(statusRegion()).findByText('Tappa registrata')).toBeInTheDocument()
    expect(app.campionato().iscrizioni).toEqual([expect.objectContaining({ season: '2026/27', club: 'Lido Nord Volley', gender: 'F' })])
    expect(app.campionato().tappe).toEqual([expect.objectContaining({ category: 'Silver', placement: 3, pairPoints: 56, clubPoints: 80, partnerId: 'p-giulia' })])
    // Il diario dei tornei non si tocca.
    expect(app.data().tournaments).toHaveLength(1)
    expect(app.calls.map((c) => c.name)).toEqual(['saveTappa'])
  })

  it('con la società già iscritta non la richiede; il salvataggio fallito lascia lo sheet aperto', async () => {
    const app = renderApp({ data: diario(), campionato: campionato(), fail: ['saveTappa'] })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /^Tappa del Campionato/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Nuova tappa' })
    expect(within(sheet).queryByRole('textbox', { name: /La tua società/ })).not.toBeInTheDocument()
    await app.user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Non è stato possibile salvare. Riprova tra poco.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuova tappa' })).toBeInTheDocument()
  })
})

describe('le partite di una tappa', () => {
  it('fase FIPAV, avversarie e la loro società, set a 15: la riga compare nel dettaglio', async () => {
    const app = renderApp({ data: diario(), campionato: campionato(), path: `/campionato/${ID.bologna}` })
    await screen.findByRole('heading', { level: 1, name: 'Tappa Silver · Bologna' })
    await app.user.click(screen.getByRole('button', { name: 'Aggiungi partita' }))
    const sheet = await screen.findByRole('dialog', { name: 'Nuova partita' })
    const s = within(sheet)
    expect(sheet).toHaveTextContent('Tappa Silver · Bologna · con Giulia · set a 15')
    await app.user.click(s.getByRole('button', { name: 'Vincenti' }))
    await app.user.type(s.getByRole('textbox', { name: 'Avversari (coppia)' }), 'Bassi / Fontana')
    // La società dalle già incontrate.
    await app.user.click(s.getByRole('button', { name: 'Riviera Sand Club' }))
    const set1 = s.getByRole('group', { name: 'Set 1' })
    await app.user.type(within(set1).getByRole('textbox', { name: 'Noi' }), '15')
    await app.user.type(within(set1).getByRole('textbox', { name: 'Loro' }), '10')
    const set2 = s.getByRole('group', { name: 'Set 2' })
    await app.user.type(within(set2).getByRole('textbox', { name: 'Noi' }), '15')
    await app.user.type(within(set2).getByRole('textbox', { name: 'Loro' }), '8')
    expect(sheet).toHaveTextContent('Vinta 2–0')
    await app.user.click(s.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Vincenti · vs Bassi / Fontana')).toBeInTheDocument()
    expect(app.campionato().partite.find((p) => p.opponents === 'Bassi / Fontana')).toMatchObject({
      stageId: ID.bologna,
      phase: 'Vincenti',
      opponentsClub: 'Riviera Sand Club',
      sets: [{ us: 15, them: 10 }, { us: 15, them: 8 }],
    })
  })

  it('il derby con la propria società si dice nella riga', async () => {
    renderApp({ data: diario(), campionato: campionato(), path: `/campionato/${ID.milano}` })
    await screen.findByRole('heading', { level: 1, name: 'Tappa Silver · Milano' })
    expect(screen.getByText('Lido Nord Volley · stessa società')).toBeInTheDocument()
  })

  it('«Partita» nel ＋ va alla tappa più recente, d\'inverno', async () => {
    const app = renderApp({ data: diario(), campionato: campionato() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /^Partita\s*Aggiungi un risultato a «Tappa Silver · Milano»$/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Nuova partita' })
    expect(within(sheet).getByRole('button', { name: 'Classificazione' })).toBeInTheDocument()
  })
})

describe('la pagina e i suoi ingressi', () => {
  it('da Tornei: la card porta alla pagina, con i numeri suoi', async () => {
    const app = renderApp({ data: diario(), campionato: campionato(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    await app.user.click(screen.getByRole('link', { name: 'Campionato per Società' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Campionato per Società' })).toBeInTheDocument()
    const numeri = screen.getByRole('region', { name: 'I numeri della stagione' })
    expect(numeri).toHaveTextContent('Punti di coppia119')
    expect(numeri).toHaveTextContent('170portati alla società')
    expect(numeri).toHaveTextContent('3–0partite')
    expect(screen.getByRole('link', { name: 'Tappa Silver · Milano' })).toHaveAttribute('href', `/campionato/${ID.milano}`)
    expect(screen.getByText(/non entrano in Statistiche, Beach Wrapped e nei numeri dei compagni/)).toBeInTheDocument()
  })

  it('Statistiche: le tappe non cambiano un solo numero, e c\'è il rimando', async () => {
    renderApp({ data: diario(), path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    const senza = h1('Statistiche').closest('main')!.textContent
    expect(screen.queryByRole('link', { name: 'Campionato per Società' })).not.toBeInTheDocument()
    cleanup()

    renderApp({ data: diario(), campionato: campionato(), path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    const link = screen.getByRole('link', { name: 'Campionato per Società' })
    expect(link).toHaveAccessibleDescription('Le 2 tappe del 2026/27 hanno i loro numeri e non entrano qui.')
    // Tutto il resto della pagina è identico, parola per parola.
    const con = h1('Statistiche').closest('main')!.textContent!.replace(link.closest('.camp-card')!.textContent!, '')
    expect(con).toBe(senza)
    // Le 2 partite del torneo d'estate: le 3 delle tappe non si contano.
    expect(screen.getAllByText('2 partite · Sempre').length).toBeGreaterThan(0)
  })

  it('«Cambia» corregge la società della stagione', async () => {
    const app = renderApp({ data: diario(), campionato: campionato(), path: '/campionato' })
    await screen.findByRole('heading', { level: 1, name: 'Campionato per Società' })
    await app.user.click(screen.getByRole('button', { name: 'Cambia la società (Lido Nord Volley)' }))
    const sheet = await screen.findByRole('dialog', { name: 'La tua società' })
    const campo = within(sheet).getByRole('textbox', { name: 'Società' })
    await app.user.clear(campo)
    await app.user.type(campo, 'Lido Nord Beach')
    await app.user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    expect(await within(statusRegion()).findByText('Società aggiornata')).toBeInTheDocument()
    expect(await screen.findByText('Lido Nord Beach')).toBeInTheDocument()
  })

  it('il Campionato che non si carica non ferma il diario', async () => {
    renderApp({ data: diario(), path: '/campionato', campionatoFallito: true })
    expect(await screen.findByRole('heading', { name: 'Non riesco a caricare il Campionato' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })

  it('senza tappe: lo stato vuoto invita a registrarne una', async () => {
    const app = renderApp({ data: diario(), path: '/campionato' })
    expect(await screen.findByRole('heading', { name: 'Nessuna tappa ancora.' })).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: 'Registra una tappa' }))
    expect(await screen.findByRole('dialog', { name: 'Nuova tappa' })).toBeInTheDocument()
  })
})

describe('eliminare', () => {
  it('Elimina tappa: conferma con le conseguenze, poi la pagina del Campionato', async () => {
    const app = renderApp({ data: diario(), campionato: campionato(), path: `/campionato/${ID.milano}` })
    await screen.findByRole('heading', { level: 1, name: 'Tappa Silver · Milano' })
    await app.user.click(screen.getByRole('button', { name: 'Modifica tappa' }))
    const sheet = await screen.findByRole('dialog', { name: 'Modifica tappa' })
    await app.user.click(within(sheet).getByRole('button', { name: 'Elimina tappa' }))
    const conferma = await screen.findByRole('alertdialog')
    expect(conferma).toHaveTextContent('Eliminare «Tappa Silver · Milano»?')
    expect(conferma).toHaveTextContent('Spariscono anche le sue 2 partite. Non si può annullare.')
    await app.user.click(within(conferma).getByRole('button', { name: 'Elimina tappa' }))
    await waitFor(() => expect(window.location.pathname).toBe('/campionato'))
    expect(await within(statusRegion()).findByText('Tappa eliminata')).toBeInTheDocument()
    expect(app.campionato().tappe.map((t) => t.id)).toEqual([ID.bologna])
    expect(app.campionato().partite.map((p) => p.id)).toEqual(['cm3'])
  })
})

describe('axe', () => {
  it('pagina del Campionato e dettaglio di una tappa', async () => {
    const app = renderApp({ data: diario(), campionato: campionato(), path: '/campionato' })
    await screen.findByRole('heading', { level: 1, name: 'Campionato per Società' })
    await expectNoA11yViolations(document.body)
    await app.user.click(screen.getByRole('link', { name: 'Tappa Silver · Milano' }))
    await screen.findByRole('heading', { level: 1, name: 'Tappa Silver · Milano' })
    await expectNoA11yViolations(document.body)
  })

  it('i moduli: nuova tappa (prima volta) e partita della tappa', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /^Tappa del Campionato/ }))
    await expectNoA11yViolations(await screen.findByRole('dialog', { name: 'Nuova tappa' }))
    cleanup()

    const app2 = renderApp({ data: diario(), campionato: campionato(), path: `/campionato/${ID.milano}` })
    await screen.findByRole('heading', { level: 1, name: 'Tappa Silver · Milano' })
    await app2.user.click(screen.getByRole('button', { name: 'Aggiungi partita' }))
    await expectNoA11yViolations(await screen.findByRole('dialog', { name: 'Nuova partita' }))
  })
})
