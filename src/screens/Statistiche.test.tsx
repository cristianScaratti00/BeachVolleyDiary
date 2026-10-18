// ============================================================================
// Statistiche (UX §6.2): filtri in vista, un annuncio solo dopo un cambio,
// ogni card con il suo stato vuoto (niente zeri), «Vedi tutti» verso
// Compagni. Le statistiche arrivano da `deriveDashboard` vero.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Statistiche from './Statistiche'
import type { Filtri } from '../app/useScreenData'
import { deriveDashboard } from '../lib/derive'
import { __resetRouterForTests } from '../app/router'
import { makeData, makeMatch, makePartner, makeTournament, lossSets } from '../test/factories'
import type { DiaryData } from '../lib/models'
import { expectNoA11yViolations } from '../test/axe'

beforeEach(() => {
  window.history.replaceState(null, '', '/statistiche')
  __resetRouterForTests()
  window.sessionStorage.clear()
})

const back = { label: 'Home', onClick: vi.fn() }

function Harness({ data }: { data: DiaryData }) {
  const [fPartner, setFPartner] = useState('all')
  const [fYear, setFYear] = useState('Sempre')
  const filtri: Filtri = {
    fPartner,
    fYear,
    setFPartner,
    setFYear,
    partnerOptions: data.partners.map((p) => ({ id: p.id, name: p.name })),
    yearOptions: ['2026', '2025', 'Sempre'],
    canFilter: true,
  }
  const s = deriveDashboard(data, fPartner, fYear).s
  return <Statistiche s={s} filtri={filtri} back={back} wrapped={{ visibile: false, titolo: 'Beach Wrapped' }} />
}

const pieno = makeData({
  partners: [makePartner({ id: 'p1', name: 'Giulia' })],
  tournaments: [
    makeTournament({ id: 't1', date: '2026-06-10', placement: '1° 🏆', partnerId: 'p1' }),
    makeTournament({ id: 't2', date: '2026-07-10', placement: 'Quarti', partnerId: 'p1' }),
  ],
  matches: [
    makeMatch({ tournamentId: 't1', partnerId: 'p1', phase: 'Finale' }),
    makeMatch({ tournamentId: 't2', partnerId: 'p1', phase: 'Quarti', sets: lossSets() }),
    makeMatch({ tournamentId: 't2', partnerId: 'p1', phase: 'Girone' }),
  ],
})

describe('Statistiche', () => {
  it('h1, ‹ Indietro e i due filtri con l\'etichetta vera', () => {
    render(<Harness data={pieno} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Statistiche' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Compagno' })).toHaveValue('all')
    expect(screen.getByRole('combobox', { name: 'Stagione' })).toHaveValue('Sempre')
  })

  it('un solo annuncio, e solo dopo un cambio di filtro', async () => {
    const user = userEvent.setup()
    render(<Harness data={pieno} />)
    const stato = screen.getByRole('status')
    expect(stato).toBeEmptyDOMElement()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Stagione' }), '2026')
    expect(stato).toHaveTextContent('Statistiche aggiornate: Stagione 2026')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Compagno' }), 'p1')
    expect(stato).toHaveTextContent('Statistiche aggiornate: Stagione 2026 con Giulia')
  })

  it('i grafici sono figure con il titolo h2 e un riassunto a parole', () => {
    render(<Harness data={pieno} />)
    for (const t of ['Andamento', 'Vinte e perse', 'Punti', 'Per fase', 'Piazzamenti', 'Per compagno']) {
      expect(screen.getByRole('heading', { level: 2, name: t })).toBeInTheDocument()
    }
    expect(screen.getByRole('figure', { name: 'Vinte e perse' })).toHaveAccessibleDescription(/2 vinte e 1 persa: 67% delle partite/)
    expect(screen.getByRole('figure', { name: 'Andamento' })).toHaveAccessibleDescription('Win rate in discesa: 50% a luglio, -50 sul mese prima.')
  })

  it('l\'anello e la linea sono l\'eccezione di movimento dichiarata (E2)', () => {
    const { container } = render(<Harness data={pieno} />)
    expect(container.querySelectorAll('[data-motion-exception="grafico"]').length).toBeGreaterThanOrEqual(2)
  })

  it('«1° 🏆» nei piazzamenti si legge «Primo posto»', () => {
    render(<Harness data={pieno} />)
    expect(screen.getByText('Primo posto')).toBeInTheDocument()
  })

  it('«Vedi tutti» porta alla tab Compagni', () => {
    render(<Harness data={pieno} />)
    expect(screen.getByRole('link', { name: 'Vedi tutti' })).toHaveAttribute('href', '/compagni')
  })

  it('0 partite nel periodo: le frasi vuote al posto degli zeri', () => {
    render(<Harness data={makeData({ tournaments: [makeTournament({ date: '2026-06-01' })] })} />)
    expect(screen.getAllByText('Nessuna partita in questo periodo.').length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByRole('group', { name: 'Numeri chiave' })).toBeNull()
    expect(screen.getByText(/Servono partite in almeno due mesi diversi/)).toBeInTheDocument()
  })

  it('nessuna violazione axe', async () => {
    const { container } = render(<Harness data={pieno} />)
    await expectNoA11yViolations(container)
  })
})
