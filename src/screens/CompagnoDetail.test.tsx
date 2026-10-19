// ============================================================================
// Dettaglio compagno (UX §5 F7, §6.6; il redesign, versione D): non trovato
// (C9), collegato o no, il tabellone 2×2, le partite insieme come
// righe-pulsante, «Elimina compagno» di vetro rosso in fondo (il menu «⋯» non
// c'è più), nessun window.confirm.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompagnoDetail from './CompagnoDetail'
import type { CompagnoDetailData } from '../lib/derive'
import { expectNoA11yViolations } from '../test/axe'
import { __resetRouterForTests } from '../app/router'

function dati(over: Partial<CompagnoDetailData> = {}): CompagnoDetailData {
  return {
    name: 'Giulia',
    initial: 'G',
    played: 2,
    won: 1,
    winPct: 50,
    setPct: 60,
    diffStr: '+6',
    streak: 1,
    matches: [
      { id: 'm1', tournamentName: 'Rimini Open', phase: 'Girone', opponents: 'Bianchi / Verdi', esitoColor: '#FF6B35', esitoShort: 'V', setChips: [{ txt: '21-17', bg: '#FFF1EA', color: '#C4501E' }] },
      { id: 'm2', tournamentName: 'Rimini Open', phase: 'Ottavi', opponents: 'Rossi / Neri', esitoColor: 'rgba(27,42,74,.4)', esitoShort: 'P', setChips: [{ txt: '18-21', bg: '#F2F0EC', color: 'rgba(27,42,74,.45)' }] },
    ],
    ...over,
  }
}

type Props = Parameters<typeof CompagnoDetail>[0]

function renderScreen(over: Partial<Props> = {}) {
  const fns = {
    onOpenMatch: vi.fn(),
    onCollega: vi.fn(),
    onScollega: vi.fn(),
    onElimina: vi.fn(),
    onBack: vi.fn(),
  }
  const view = render(
    <CompagnoDetail
      cp={dati()}
      linked={false}
      back={{ label: 'Compagni', onClick: fns.onBack }}
      onOpenMatch={fns.onOpenMatch}
      onCollega={fns.onCollega}
      onScollega={fns.onScollega}
      onElimina={fns.onElimina}
      {...over}
    />,
  )
  return { ...view, ...fns }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/compagni')
  __resetRouterForTests()
})

describe('CompagnoDetail', () => {
  it('non trovato: titolo dedicato e link ai compagni, mai la lista', () => {
    renderScreen({ cp: null })
    expect(screen.getByRole('heading', { level: 1, name: 'Compagno non trovato' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai ai compagni' })).toHaveAttribute('href', '/compagni')
  })

  it('intestazione: «‹ Compagni», il nome come h1 e il conteggio delle partite', async () => {
    const user = userEvent.setup()
    const { onBack } = renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'Giulia' })).toBeInTheDocument()
    expect(screen.getByText('2 partite insieme · 1 vinta')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Compagni' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('non collegato: la card lo dice e «Collega» è un pulsante', async () => {
    const user = userEvent.setup()
    const { onCollega } = renderScreen()
    const card = screen.getByRole('region', { name: 'Non collegato' })
    await user.click(within(card).getByRole('button', { name: 'Collega' }))
    expect(onCollega).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Scollega' })).not.toBeInTheDocument()
  })

  it('collegato: lo stato e «Scollega», che chiede conferma alla shell', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm')
    const { onScollega } = renderScreen({ linked: true })
    const card = screen.getByRole('region', { name: 'Collegato a un utente' })
    expect(within(card).getByText(/condivisi con il suo account/)).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Scollega' }))
    expect(onScollega).toHaveBeenCalledTimes(1)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('il collegamento appena fatto porta la traccia', () => {
    const { container } = renderScreen({ linked: true, traccia: 'collegato' })
    expect(container.querySelector('section .traccia')).not.toBeNull()
  })

  it('il tabellone 2×2: vittorie, set vinti, differenziale, serie record', () => {
    renderScreen()
    const stats = screen.getByRole('group', { name: 'Statistiche insieme' })
    expect([...stats.querySelectorAll('.ui-stat-label')].map((e) => e.textContent)).toEqual(['vittorie', 'set vinti', 'differenziale', 'serie record'])
    expect(within(stats).getByText('50%', { selector: '.sr-only' })).toBeInTheDocument()
  })

  it('le partite insieme sono righe-pulsante col nome del torneo, che aprono la modifica', async () => {
    const user = userEvent.setup()
    const { onOpenMatch } = renderScreen()
    expect(screen.getByRole('heading', { level: 2, name: 'Partite insieme' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Rimini Open.*Girone · vs Bianchi \/ Verdi/ }))
    expect(onOpenMatch).toHaveBeenCalledExactlyOnceWith('m1')
  })

  it('«Elimina compagno» è un pulsante di vetro rosso: la conferma la apre la shell', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm')
    const { onElimina } = renderScreen()
    expect(screen.queryByRole('button', { name: 'Altre azioni' })).not.toBeInTheDocument()
    const b = screen.getByRole('button', { name: 'Elimina compagno' })
    expect(b).toHaveAttribute('data-variant', 'glass')
    expect(b).toHaveAttribute('data-tone', 'danger')
    await user.click(b)
    expect(onElimina).toHaveBeenCalledTimes(1)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('senza partite insieme le statistiche non ci sono e lo dice; eliminare resta possibile', () => {
    renderScreen({ cp: dati({ played: 0, won: 0, matches: [] }) })
    expect(screen.getByText('Ancora nessuna partita insieme.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Statistiche insieme' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elimina compagno' })).toBeInTheDocument()
  })

  it('dice «compagno», mai «socio» (C18)', () => {
    const { container } = renderScreen({ linked: true })
    expect(container.textContent).not.toMatch(/socio/i)
  })

  it('nessuna violazione axe (non collegato, collegato, non trovato)', async () => {
    const a = renderScreen()
    await expectNoA11yViolations(a.container)
    a.unmount()
    const b = renderScreen({ linked: true })
    await expectNoA11yViolations(b.container)
    b.unmount()
    const c = renderScreen({ cp: null })
    await expectNoA11yViolations(c.container)
  })
})
