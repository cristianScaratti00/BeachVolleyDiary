// ============================================================================
// Statistiche (il redesign; UX §6.2): i due filtri di vetro (select veri) in
// vista, un annuncio solo dopo un cambio, le card che salgono in fila, ogni
// card con il suo stato vuoto (niente zeri), la medaglia nei piazzamenti,
// «Vedi tutti» verso Compagni, Beach Wrapped quando è pronto. Le statistiche
// arrivano da `deriveDashboard` vero.
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

/** Quello che si legge sui pulsanti di vetro (il select sotto è trasparente). */
const scritte = (el: HTMLElement) => Array.from(el.querySelectorAll('.dash-select-text')).map((x) => x.textContent)

function Harness({ data, wrapped = false }: { data: DiaryData; wrapped?: boolean }) {
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
  return <Statistiche s={s} filtri={filtri} back={back} wrapped={{ visibile: wrapped, titolo: 'Beach Wrapped' }} />
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
  it('h1, la pillola «‹ Home», il sottotitolo e i due filtri di vetro (select veri)', async () => {
    const user = userEvent.setup()
    render(<Harness data={pieno} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Statistiche' })).toBeInTheDocument()
    expect(screen.getByText('3 partite · Sempre')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Home' }))
    expect(back.onClick).toHaveBeenCalled()
    const filtri = screen.getByRole('group', { name: 'Filtri delle statistiche' })
    const stagione = screen.getByRole('combobox', { name: 'Stagione' })
    expect(stagione).toHaveValue('Sempre')
    // «Sempre» per prima, poi TUTTE le stagioni (la Home ne mostra solo due).
    expect(Array.from((stagione as HTMLSelectElement).options).map((o) => o.value)).toEqual(['Sempre', '2026', '2025'])
    expect(screen.getByRole('combobox', { name: 'Compagni' })).toHaveValue('all')
    // Sul pulsante si legge la scelta, o il nome del filtro a riposo.
    expect(scritte(filtri)).toEqual(['Sempre', 'Compagni'])
  })

  it('un solo annuncio, e solo dopo un cambio di filtro', async () => {
    const user = userEvent.setup()
    render(<Harness data={pieno} />)
    const stato = screen.getByRole('status')
    expect(stato).toBeEmptyDOMElement()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Stagione' }), '2026')
    expect(stato).toHaveTextContent('Statistiche aggiornate: Stagione 2026')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Compagni' }), 'p1')
    expect(stato).toHaveTextContent('Statistiche aggiornate: Stagione 2026 con Giulia')
    expect(scritte(screen.getByRole('group', { name: 'Filtri delle statistiche' }))).toEqual(['2026', 'Giulia'])
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

  it('i piazzamenti con la medaglia: «1° 🏆» si legge «Primo posto», senza trofeo', () => {
    const { container } = render(<Harness data={pieno} />)
    const piazzamenti = screen.getByRole('figure', { name: 'Piazzamenti' })
    expect(screen.getByText('Primo posto')).toBeInTheDocument()
    expect(piazzamenti.querySelectorAll('.ui-medal')).toHaveLength(2)
    expect(piazzamenti.textContent).not.toContain('🏆')
    expect(container.querySelector('.ui-medal[data-tier="win"]')).not.toBeNull()
  })

  it('le card salgono una dopo l\'altra', () => {
    const { container } = render(<Harness data={pieno} />)
    const passi = Array.from(container.querySelectorAll<HTMLElement>('.rise')).map((el) => Number(el.style.getPropertyValue('--rise-i')))
    expect(passi.length).toBeGreaterThanOrEqual(8)
    expect(passi).toEqual([...passi].sort((a, b) => a - b))
  })

  it('Beach Wrapped, quando è pronto, è la riga con «Apri»', () => {
    render(<Harness data={pieno} wrapped />)
    expect(screen.getByRole('link', { name: 'Apri Beach Wrapped' })).toHaveAttribute('href', '/wrapped')
  })

  it('«Vedi tutti» porta alla tab Compagni', () => {
    render(<Harness data={pieno} />)
    expect(screen.getByRole('link', { name: 'Vedi tutti' })).toHaveAttribute('href', '/compagni')
  })

  it('0 partite nel periodo: le frasi vuote al posto degli zeri', () => {
    render(<Harness data={makeData({ tournaments: [makeTournament({ date: '2026-06-01' })] })} />)
    expect(screen.getByText('Nessuna partita · Sempre')).toBeInTheDocument()
    expect(screen.getAllByText('Nessuna partita in questo periodo.').length).toBeGreaterThanOrEqual(4)
    expect(screen.queryByRole('group', { name: 'Numeri chiave' })).toBeNull()
    expect(screen.getByText(/Servono partite in almeno due mesi diversi/)).toBeInTheDocument()
  })

  it('nessuna violazione axe', async () => {
    const { container } = render(<Harness data={pieno} />)
    await expectNoA11yViolations(container)
  })
})
