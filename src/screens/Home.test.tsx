// ============================================================================
// Home (UX §6.1): cosa serve adesso, nell'ordine giusto, e ogni card solo se
// ha qualcosa da dire. I dati passano dai selettori veri (`deriveAdesso`,
// `deriveDashboard`) su un diario di fabbrica, così i test leggono lo stesso
// view-model che legge l'app.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home'
import type { HomeProps } from '../app/contracts'
import { deriveAdesso } from '../app/selectors'
import { deriveDashboard } from '../lib/derive'
import { __resetRouterForTests } from '../app/router'
import { makeData, makeMatch, makeTournament } from '../test/factories'
import type { DiaryData } from '../lib/models'
import { expectNoA11yViolations } from '../test/axe'

const OGGI = '2026-07-22'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  __resetRouterForTests()
  window.sessionStorage.clear()
})

function props(data: DiaryData, over: Partial<HomeProps> = {}): HomeProps {
  const s = deriveDashboard(data, 'all', 'Sempre').s
  return {
    nome: 'Marta',
    today: OGGI,
    adesso: deriveAdesso(data, OGGI),
    numeri: s.played > 0 ? s : null,
    hasTornei: data.tournaments.length > 0,
    stagione: 'Sempre',
    wrapped: { visibile: false, titolo: 'Beach Wrapped' },
    banner: { visibile: true, onChiudi: vi.fn() },
    checkIn: { own: null },
    onNuovoTorneo: vi.fn(),
    onAggiungiPartita: vi.fn(),
    onAggiornaPiazzamento: vi.fn(),
    onStoria: vi.fn(),
    ...over,
  }
}

function renderHome(data: DiaryData, over: Partial<HomeProps> = {}) {
  const p = props(data, over)
  return { ...render(<Home {...p} />), p }
}

describe('Home — titolo e marchio', () => {
  it('il large title è «Ciao, {nome}» con la data di oggi', () => {
    renderHome(makeData())
    expect(screen.getByRole('heading', { level: 1, name: 'Ciao, Marta' })).toBeInTheDocument()
    expect(screen.getByText('mercoledì 22 luglio')).toBeInTheDocument()
  })

  it('senza nome dice solo «Ciao»', () => {
    renderHome(makeData(), { nome: '' })
    expect(screen.getByRole('heading', { level: 1, name: 'Ciao' })).toBeInTheDocument()
  })
})

describe('Home — primo avvio', () => {
  it('lo «0» da tabellone, un solo CTA, il link all\'assistente e la card check-in', async () => {
    const user = userEvent.setup()
    const { p } = renderHome(makeData())
    expect(screen.getByRole('heading', { level: 2, name: 'Il tuo diario è vuoto' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crea il primo torneo' }))
    expect(p.onNuovoTorneo).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: "Usa l'assistente" })).toHaveAttribute('href', '/crea')
    expect(screen.getByRole('link', { name: 'Fai check-in' })).toHaveAttribute('href', '/oggi')
    // Niente numeri e niente Statistiche finché non c'è una partita (UX F1).
    expect(screen.queryByRole('heading', { name: /Numeri chiave/ })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Tutte le statistiche' })).toBeNull()
  })

  it('con OGGI_ATTIVO spento la card check-in non c\'è', () => {
    renderHome(makeData(), { checkIn: null })
    expect(screen.queryByText(/Sei in spiaggia oggi/)).toBeNull()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderHome(makeData())
    await expectNoA11yViolations(container)
  })
})

describe('Home — Adesso', () => {
  it('«Oggi giochi» con il link al torneo e «Aggiungi partita» per quel torneo', async () => {
    const user = userEvent.setup()
    const data = makeData({ tournaments: [makeTournament({ id: 't1', name: 'Rimini Open', date: OGGI, placement: 'In corso' })] })
    const { p } = renderHome(data)
    const card = screen.getByText('Oggi giochi').closest('article')!
    expect(within(card).getByRole('link', { name: 'Rimini Open' })).toHaveAttribute('href', '/tornei/t1')
    await user.click(within(card).getByRole('button', { name: 'Aggiungi partita' }))
    expect(p.onAggiungiPartita).toHaveBeenCalledWith('t1')
  })

  it('senza un torneo oggi mostra il prossimo, con la data relativa', () => {
    const data = makeData({ tournaments: [makeTournament({ name: 'Cervia Cup', date: '2026-07-25' })] })
    renderHome(data)
    const card = screen.getByText('Prossimo torneo').closest('article')!
    expect(within(card).getByText('tra 3 giorni')).toBeInTheDocument()
    expect(within(card).getByText('sabato 25 luglio')).toHaveClass('sr-only')
  })

  it('l\'ultimo risultato porta il piazzamento e la Storia', async () => {
    const user = userEvent.setup()
    const data = makeData({ tournaments: [makeTournament({ id: 't9', name: 'Riccione Beach', date: '2026-07-01', placement: '1° 🏆' })] })
    const { p } = renderHome(data)
    const card = screen.getByText('Ultimo risultato').closest('article')!
    expect(within(card).getByText('Primo posto')).toBeInTheDocument()
    expect(card.textContent).not.toContain('🏆')
    await user.click(within(card).getByRole('button', { name: 'Storia Instagram' }))
    expect(p.onStoria).toHaveBeenCalledWith('t9')
  })

  it('se il passato più recente è ancora «In corso» chiede com\'è andata', async () => {
    const user = userEvent.setup()
    const data = makeData({ tournaments: [makeTournament({ id: 't2', name: 'Lido Cup', date: '2026-07-20', placement: 'In corso' })] })
    const { p } = renderHome(data)
    expect(screen.getByRole('heading', { level: 3, name: /^Com'è andata a «\s?Lido Cup\s?»\?$/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiorna il piazzamento' }))
    expect(p.onAggiornaPiazzamento).toHaveBeenCalledWith('t2')
  })

  it('con il check-in fatto la card dice dove sei e porta a /oggi', () => {
    const data = makeData({ tournaments: [makeTournament({ date: '2026-07-01' })] })
    renderHome(data, { checkIn: { own: { id: 'c1', city: 'Rimini', date: OGGI, lookingForPartner: false, note: '', tournamentId: null } } })
    expect(screen.getByRole('link', { name: 'Sei a Rimini oggi' })).toHaveAttribute('href', '/oggi')
  })
})

describe('Home — numeri chiave', () => {
  const data = makeData({
    tournaments: [makeTournament({ id: 't1', date: '2026-07-01', placement: '2°' })],
    matches: [makeMatch({ tournamentId: 't1' }), makeMatch({ tournamentId: 't1' })],
  })

  it('quattro numeri con l\'etichetta della stagione, e portano a Statistiche', () => {
    renderHome(data, { stagione: 'Stagione 2026' })
    expect(screen.getByRole('heading', { level: 2, name: /Numeri chiave.*Stagione 2026/ })).toBeInTheDocument()
    const numeri = screen.getByRole('group', { name: 'Numeri chiave' })
    expect(within(numeri).getByText('100%')).toHaveClass('sr-only')
    expect(screen.getAllByRole('link', { name: 'Tutte le statistiche' })[0]).toHaveAttribute('href', '/statistiche')
  })

  it('tornei senza partite: la nota con «Aggiungi partita» al posto degli zeri', async () => {
    const user = userEvent.setup()
    const solo = makeData({ tournaments: [makeTournament({ id: 't5', date: '2026-07-01', placement: '3°' })] })
    const { p } = renderHome(solo)
    expect(screen.getByText('Aggiungi la prima partita per vedere i tuoi numeri.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Numeri chiave' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Aggiungi partita' }))
    expect(p.onAggiungiPartita).toHaveBeenCalledWith('t5')
  })

  it('Beach Wrapped compare solo quando è disponibile', () => {
    const { rerender, p } = renderHome(data)
    expect(screen.queryByRole('link', { name: 'Beach Wrapped 2026' })).toBeNull()
    rerender(<Home {...p} wrapped={{ visibile: true, titolo: 'Beach Wrapped 2026' }} />)
    expect(screen.getByRole('link', { name: 'Beach Wrapped 2026' })).toHaveAttribute('href', '/wrapped')
  })

  it('nessuna violazione axe con dati completi', async () => {
    const { container } = renderHome(data, { wrapped: { visibile: true, titolo: 'Beach Wrapped' } })
    await expectNoA11yViolations(container)
  })
})

describe('Home — banner alpha', () => {
  it('si chiude con il suo pulsante', async () => {
    const user = userEvent.setup()
    const onChiudi = vi.fn()
    renderHome(makeData(), { banner: { visibile: true, onChiudi } })
    await user.click(screen.getByRole('button', { name: 'Chiudi avviso alpha' }))
    expect(onChiudi).toHaveBeenCalledOnce()
  })

  it('chiuso non c\'è', () => {
    renderHome(makeData(), { banner: { visibile: false, onChiudi: vi.fn() } })
    expect(screen.queryByRole('region', { name: 'Avviso versione alpha' })).toBeNull()
  })
})
