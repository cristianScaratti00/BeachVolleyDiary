// ============================================================================
// Compagni (UX §5 F7, §6.6, §7.6): card come `<article>` col nome come link
// vero, lo stato vuoto con un CTA che è un `<button>`, il ＋ della NavBar.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Compagni from './Compagni'
import type { CompagnoCard } from '../lib/derive'
import { expectNoA11yViolations } from '../test/axe'
import { __resetRouterForTests } from '../app/router'

const ID = '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b'

function card(over: Partial<CompagnoCard> = {}): CompagnoCard {
  return { id: ID, name: 'Giulia', initial: 'G', played: 12, won: 8, lost: 4, winPct: 67, ...over }
}

function renderScreen(compagni: CompagnoCard[], traccia?: string) {
  const onNuovoCompagno = vi.fn()
  const view = render(<Compagni compagni={compagni} traccia={traccia} onNuovoCompagno={onNuovoCompagno} />)
  return { ...view, onNuovoCompagno }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/compagni')
  __resetRouterForTests()
})

describe('Compagni — lista', () => {
  it('ogni compagno è un article con il nome come link al dettaglio', () => {
    renderScreen([card()])
    const link = screen.getByRole('link', { name: 'Giulia' })
    expect(link).toHaveAttribute('href', `/compagni/${ID}`)
    const art = link.closest('article')!
    expect(art).not.toBeNull()
    expect(within(art).getByText('12 partite insieme')).toBeInTheDocument()
    expect(within(art).getByText('67%')).toBeInTheDocument()
    expect(art.querySelector('[role="button"]')).toBeNull()
  })

  it('la riga meta descrive il link', () => {
    renderScreen([card()])
    expect(screen.getByRole('link', { name: 'Giulia' })).toHaveAccessibleDescription('12 partite insieme')
  })

  it('con zero partite lo dice', () => {
    renderScreen([card({ played: 0, won: 0, lost: 0, winPct: 0 })])
    expect(screen.getByText('0 partite insieme')).toBeInTheDocument()
  })

  it('il ＋ della NavBar apre «Nuovo compagno»', async () => {
    const user = userEvent.setup()
    const { onNuovoCompagno } = renderScreen([card()])
    await user.click(screen.getByRole('button', { name: 'Nuovo compagno' }))
    expect(onNuovoCompagno).toHaveBeenCalledTimes(1)
  })

  it('la card appena creata porta la traccia', () => {
    const { container } = renderScreen([card()], ID)
    expect(container.querySelector('article .traccia')).not.toBeNull()
  })

  it('il titolo è l\'unico h1, le card sono h3 sotto un h2 (l\'indice non salta un livello)', () => {
    renderScreen([card(), card({ id: '1b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b', name: 'Marco' })])
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Compagni'])
    const h2 = screen.getByRole('heading', { level: 2, name: 'I tuoi compagni' })
    const h3 = screen.getAllByRole('heading', { level: 3 })
    expect(h3).toHaveLength(2)
    expect(h2.compareDocumentPosition(h3[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderScreen([card()])
    await expectNoA11yViolations(container)
  })
})

describe('Compagni — stato vuoto', () => {
  it('«Nessun compagno ancora.» con un CTA vero, attivabile da tastiera', async () => {
    const user = userEvent.setup()
    const { onNuovoCompagno } = renderScreen([])
    expect(screen.getByRole('heading', { name: 'Nessun compagno ancora.' })).toBeInTheDocument()
    const cta = screen.getByRole('button', { name: 'Aggiungi un compagno' })
    cta.focus()
    await user.keyboard('{Enter}')
    expect(onNuovoCompagno).toHaveBeenCalledTimes(1)
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderScreen([])
    await expectNoA11yViolations(container)
  })
})
