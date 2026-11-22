// ============================================================================
// Le statistiche per genere nell'app vera (proposta A + B, 22/11/2026):
// il selettore in Statistiche e i numeri che cambiano, il confronto, la Home,
// l'invito e il foglio «Riordina i tornei», la proposta nel modulo del
// torneo, il genere nella lista dei tornei, axe.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { renderApp } from '../test/app'
import { expectNoA11yViolations } from '../test/axe'
import { lossSets, makeData, makeMatch, makePartner, makeTournament, winSets } from '../test/factories'
import type { DiaryData, Gender } from '../lib/models'

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
  rimini: '0b6f6a4e-3f6b-4b2a-9a51-000000000401',
  bagno: '0b6f6a4e-3f6b-4b2a-9a51-000000000402',
  cervia: '0b6f6a4e-3f6b-4b2a-9a51-000000000403',
  king: '0b6f6a4e-3f6b-4b2a-9a51-000000000404',
}

/**
 * Due tornei maschili con Luca (3 partite, 2 vinte) e uno misto con Giulia
 * (2 partite, 1 vinta). Il più recente è Rimini Open, maschile. Con
 * `senza` nessun torneo dice il genere, e c'è anche un King senza compagno.
 */
function diario({ senza = false }: { senza?: boolean } = {}): DiaryData {
  const g = (x: Gender) => (senza ? null : x)
  const luca = makePartner({ id: 'luca', name: 'Luca' })
  const giulia = makePartner({ id: 'giulia', name: 'Giulia' })
  return makeData({
    partners: [luca, giulia],
    tournaments: [
      makeTournament({ id: ID.rimini, name: 'Rimini Open', date: '2026-07-20', partnerId: 'luca', gender: g('Maschile'), category: 'Open', placement: '1° 🏆' }),
      makeTournament({ id: ID.bagno, name: 'Bagno 26 Cup', date: '2026-06-10', partnerId: 'luca', gender: g('Maschile'), category: 'Amatoriale', placement: 'Quarti' }),
      makeTournament({ id: ID.cervia, name: 'Cervia Mixed', date: '2026-07-05', partnerId: 'giulia', gender: g('Misto'), category: 'Amatoriale', placement: '2°' }),
      ...(senza ? [makeTournament({ id: ID.king, name: 'King Cesenatico', date: '2026-07-12', category: 'King', placement: 'Quarti' })] : []),
    ],
    matches: [
      makeMatch({ tournamentId: ID.rimini, partnerId: 'luca', sets: winSets() }),
      makeMatch({ tournamentId: ID.rimini, partnerId: 'luca', sets: winSets() }),
      makeMatch({ tournamentId: ID.bagno, partnerId: 'luca', sets: lossSets() }),
      makeMatch({ tournamentId: ID.cervia, partnerId: 'giulia', sets: winSets() }),
      makeMatch({ tournamentId: ID.cervia, partnerId: 'giulia', sets: lossSets() }),
    ],
  })
}

const statusRegion = () => screen.getAllByRole('status').find((n) => n.closest('[aria-live]') === n || n.getAttribute('aria-live') === 'polite')!

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-07-22T09:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Statistiche separate per genere', () => {
  it('si aprono sul genere più recente; Misto e Tutti cambiano i numeri; il confronto dice l\'altro', async () => {
    const app = renderApp({ data: diario(), path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    const generi = screen.getByRole('group', { name: 'Genere' })
    // Il segmented scrive l'etichetta due volte (la seconda è solo pittura): si legge la prima.
    expect(within(generi).getAllByRole('button').map((b) => b.querySelector('.ui-ink')?.textContent)).toEqual(['Maschile', 'Misto', 'Tutti'])
    expect(within(generi).getByRole('button', { name: 'Maschile' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('3 partite · Sempre · maschile')).toBeInTheDocument()

    // Il confronto con il misto, con gli stessi filtri.
    const confronto = screen.getByRole('figure', { name: 'Nel misto' })
    expect(confronto).toHaveTextContent('Partite vinte67%50%')
    expect(confronto).toHaveTextContent('Record2–11–1')

    await app.user.click(within(generi).getByRole('button', { name: 'Misto' }))
    expect(screen.getByText('2 partite · Sempre · misto')).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Nel maschile' })).toBeInTheDocument()

    await app.user.click(within(generi).getByRole('button', { name: 'Tutti' }))
    expect(screen.getByText('5 partite · Sempre')).toBeInTheDocument()
    expect(screen.queryByRole('figure', { name: /^Nel / })).not.toBeInTheDocument()
  })

  it('«Apri il misto» dal confronto sposta il selettore', async () => {
    const app = renderApp({ data: diario(), path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    await app.user.click(screen.getByRole('button', { name: 'Apri il misto' }))
    expect(within(screen.getByRole('group', { name: 'Genere' })).getByRole('button', { name: 'Misto' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('per categoria: dentro il genere scelto', async () => {
    renderApp({ data: diario(), path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    const cat = screen.getByRole('figure', { name: 'Per categoria' })
    expect(cat).toHaveTextContent('Dove vinci di più, nel maschile.')
    expect(cat).toHaveTextContent('Open')
    expect(cat).toHaveTextContent('2 partite · 1 torneo · 1 podio')
    expect(cat).toHaveTextContent('Amatoriale')
  })

  it('con un genere solo il selettore non c\'è e i numeri sono quelli di sempre', async () => {
    const d = diario()
    d.tournaments = d.tournaments.map((t) => ({ ...t, gender: 'Maschile' as const }))
    renderApp({ data: d, path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    expect(screen.queryByRole('group', { name: 'Genere' })).not.toBeInTheDocument()
    expect(screen.getByText('5 partite · Sempre')).toBeInTheDocument()
  })
})

describe('Home', () => {
  it('il numero grande dice il genere, e un tocco passa all\'altro', async () => {
    const app = renderApp({ data: diario() })
    expect(await screen.findByRole('heading', { name: 'Partite vinte · maschile' })).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: 'Passa al misto: 50% di partite vinte, 2 partite' }))
    expect(screen.getByRole('heading', { name: 'Partite vinte · misto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passa al maschile: 67% di partite vinte, 3 partite' })).toBeInTheDocument()
  })
})

describe('Riordina i tornei', () => {
  it('l\'invito la prima volta; «Più tardi» lo toglie e resta la riga «Sistema»', async () => {
    const app = renderApp({ data: diario({ senza: true }), path: '/statistiche' })
    expect(await screen.findByRole('heading', { name: 'Separa maschile e misto' })).toBeInTheDocument()
    expect(screen.getByText(/4 tornei non dicono com'erano/)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('heading', { name: 'Separa maschile e misto' })).not.toBeInTheDocument()
    expect(screen.getByText('4 tornei senza genere')).toBeInTheDocument()
    expect(window.localStorage.getItem('bvd_riordino_rimandato')).toBe('1')
  })

  it('un compagno alla volta, la proposta del King già scelta; «Fatto» salva e separa le statistiche', async () => {
    const app = renderApp({ data: diario({ senza: true }), path: '/statistiche' })
    await app.user.click(await screen.findByRole('button', { name: 'Riordina i tornei' }))
    const sheet = await screen.findByRole('dialog', { name: 'Riordina i tornei' })
    const s = within(sheet)
    expect(sheet).toHaveTextContent('4 tornei senza genere')

    const luca = s.getByRole('group', { name: 'Genere dei tornei: con luca' })
    const giulia = s.getByRole('group', { name: 'Genere dei tornei: con giulia' })
    const solo = s.getByRole('group', { name: 'Genere dei tornei: senza compagno' })
    // Il genere non si indovina dal nome: con Luca e Giulia niente di scelto.
    expect(within(luca).queryByRole('button', { pressed: true })).not.toBeInTheDocument()
    expect(within(giulia).queryByRole('button', { pressed: true })).not.toBeInTheDocument()
    expect(within(solo).getByRole('button', { name: 'Maschile' })).toHaveAttribute('aria-pressed', 'true')
    expect(sheet).toHaveTextContent('Proposto: è un King. Lo salvo con «Fatto».')

    await app.user.click(within(luca).getByRole('button', { name: 'Maschile' }))
    await app.user.click(within(giulia).getByRole('button', { name: 'Misto' }))
    // Uno dei tornei con Luca era diverso: si apre il gruppo e si cambia quello.
    await app.user.click(s.getByRole('button', { name: 'Uno era diverso? Mostra i 2 tornei' }))
    await app.user.click(within(s.getByRole('group', { name: 'Genere di Bagno 26 Cup' })).getByRole('button', { name: 'Misto' }))

    await app.user.click(s.getByRole('button', { name: 'Fatto' }))
    expect(await within(statusRegion()).findByText('Genere salvato per 4 tornei')).toBeInTheDocument()
    const genere = Object.fromEntries(app.data().tournaments.map((t) => [t.name, t.gender]))
    expect(genere).toEqual({ 'Rimini Open': 'Maschile', 'Bagno 26 Cup': 'Misto', 'Cervia Mixed': 'Misto', 'King Cesenatico': 'Maschile' })
    // Le statistiche adesso si separano.
    expect(await screen.findByRole('group', { name: 'Genere' })).toBeInTheDocument()
    expect(screen.queryByText('Separa maschile e misto')).not.toBeInTheDocument()
  })

  it('il salvataggio fallito lascia il foglio aperto e lo dice', async () => {
    const app = renderApp({ data: diario({ senza: true }), path: '/statistiche', fail: ['setGeneri'] })
    await app.user.click(await screen.findByRole('button', { name: 'Riordina i tornei' }))
    const sheet = await screen.findByRole('dialog', { name: 'Riordina i tornei' })
    await app.user.click(within(sheet).getByRole('button', { name: 'Fatto' }))
    expect(await screen.findByText('Non è stato possibile salvare. Riprova tra poco.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Riordina i tornei' })).toBeInTheDocument()
  })
})

describe('il modulo del torneo', () => {
  it('propone il genere dal compagno (mai dal nome) e lo salva', async () => {
    const app = renderApp({ data: diario() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /^Torneo\s*Luogo/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Nuovo torneo' })
    const s = within(sheet)
    const genere = s.getByRole('group', { name: 'Genere' })
    // Il compagno di default è Luca (il torneo più recente): maschile.
    expect(within(genere).getByRole('button', { name: 'Maschile' })).toHaveAttribute('aria-pressed', 'true')
    expect(sheet).toHaveTextContent('Come i tuoi tornei con Luca. Puoi cambiarlo.')

    await app.user.click(within(s.getByRole('group', { name: 'Con chi lo hai fatto' })).getByRole('button', { name: 'Giulia' }))
    expect(within(genere).getByRole('button', { name: 'Misto' })).toHaveAttribute('aria-pressed', 'true')
    expect(sheet).toHaveTextContent('Come i tuoi tornei con Giulia. Puoi cambiarlo.')

    await app.user.type(s.getByRole('textbox', { name: 'Nome torneo' }), 'Cervia Mixed Cup')
    await app.user.click(s.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Cervia Mixed Cup' })).toBeInTheDocument()
    expect(app.data().tournaments.find((t) => t.name === 'Cervia Mixed Cup')?.gender).toBe('Misto')
    // Il genere si legge nella riga piccola del dettaglio.
    expect(screen.getByText(/Amatoriale · misto · 2vs2/)).toBeInTheDocument()
  })

  it('toccato a mano, il genere resta anche cambiando compagno', async () => {
    const app = renderApp({ data: diario() })
    await app.user.click(await screen.findByRole('button', { name: 'Crea' }))
    await app.user.click(screen.getByRole('menuitem', { name: /^Torneo\s*Luogo/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Nuovo torneo' })
    const genere = within(sheet).getByRole('group', { name: 'Genere' })
    await app.user.click(within(genere).getByRole('button', { name: 'Femminile' }))
    await app.user.click(within(within(sheet).getByRole('group', { name: 'Con chi lo hai fatto' })).getByRole('button', { name: 'Giulia' }))
    expect(within(genere).getByRole('button', { name: 'Femminile' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('la lista dei tornei', () => {
  it('il genere nella riga e le chip per genere', async () => {
    const app = renderApp({ data: diario(), path: '/tornei' })
    await screen.findByRole('heading', { level: 1, name: 'Tornei' })
    expect(screen.getByText(/Open · maschile/)).toBeInTheDocument()
    const chips = screen.getByRole('group', { name: 'Filtra i tornei per genere' })
    await app.user.click(within(chips).getByRole('button', { name: 'Misto · 1' }))
    expect(screen.getByRole('link', { name: 'Cervia Mixed' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rimini Open' })).not.toBeInTheDocument()
  })
})

describe('axe', () => {
  it('Statistiche con selettore, confronto e categorie; il foglio del riordino', async () => {
    renderApp({ data: diario(), path: '/statistiche' })
    await screen.findByRole('heading', { level: 1, name: 'Statistiche' })
    await expectNoA11yViolations(document.body)
    cleanup()

    const app = renderApp({ data: diario({ senza: true }), path: '/statistiche' })
    await app.user.click(await screen.findByRole('button', { name: 'Riordina i tornei' }))
    const sheet = await screen.findByRole('dialog', { name: 'Riordina i tornei' })
    await app.user.click(within(sheet).getByRole('button', { name: 'Uno era diverso? Mostra i 2 tornei' }))
    await expectNoA11yViolations(sheet)
  })
})
