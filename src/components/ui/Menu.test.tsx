// ============================================================================
// Il Menu nelle sue due forme: lo sheet del ＋ («Cosa registriamo?», design
// 13) e il popover di «Nuovo». Il contratto ARIA è lo stesso (UX §7.4): menu
// col nome del titolo, voci menuitem, frecce, Home/Fine, Esc e Tab chiudono.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Menu } from './Menu'
import type { MenuViewItem } from './Menu'
import { expectNoA11yViolations } from '../../test/axe'

const voci = (onSelect = vi.fn()): MenuViewItem[] => [
  { key: 'live', label: 'Partita live', sub: 'Segna i punti mentre giochi', icon: 'clock', tone: 'accent', onSelect },
  { key: 'torneo', label: 'Torneo', sub: 'Luogo, formato, compagno, piazzamento', icon: 'trophy', onSelect: vi.fn() },
  { key: 'pallo', label: 'Raccontalo a Pallo', icon: 'chat-dots', onSelect: vi.fn() },
]

describe('Menu — lo sheet del ＋', () => {
  it('il titolo grande è un h2 che dà il nome al menu; sotto la riga di invito', () => {
    render(<Menu title="Cosa registriamo?" sub="Scegli tu, al resto penso io." items={voci()} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Cosa registriamo?' })).toBeInTheDocument()
    expect(screen.getByRole('menu', { name: 'Cosa registriamo?' })).toBeInTheDocument()
    expect(screen.getByText('Scegli tu, al resto penso io.')).toBeInTheDocument()
  })

  it('le voci sono card con titolo e sottotitolo, la live in evidenza, «Annulla» per ultima', () => {
    render(<Menu title="Cosa registriamo?" items={voci()} onClose={vi.fn()} />)
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual([
      'Partita liveSegna i punti mentre giochi',
      'TorneoLuogo, formato, compagno, piazzamento',
      'Raccontalo a Pallo',
      'Annulla',
    ])
    expect(items[0]).toHaveAttribute('data-tone', 'accent')
    expect(items[0]).toHaveFocus()
  })

  it('frecce, Home/Fine; Invio sceglie; Tab ed Esc chiudono; «Annulla» chiude', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSelect = vi.fn()
    render(<Menu title="Cosa registriamo?" items={voci(onSelect)} onClose={onClose} />)
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem')
    await user.keyboard('{ArrowDown}')
    expect(items[1]).toHaveFocus()
    await user.keyboard('{End}')
    expect(items[3]).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(items[0]).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    await user.keyboard('{Tab}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
    await user.click(items[3])
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('Pallo che sbircia e la maniglia sono decorativi', () => {
    const { container } = render(<Menu title="Cosa registriamo?" items={voci()} onClose={vi.fn()} />)
    expect(container.querySelector('svg.pallo')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.ui-menu-handle')).toHaveAttribute('aria-hidden', 'true')
  })

  it('nessuna violazione axe', async () => {
    const { container } = render(<Menu title="Cosa registriamo?" sub="Scegli tu, al resto penso io." items={voci()} onClose={vi.fn()} />)
    await expectNoA11yViolations(container)
  })
})

describe('Menu — popover', () => {
  it('le stesse voci senza «Annulla» né Pallo', () => {
    const { container } = render(<Menu title="Cosa registriamo?" placement="popover" items={voci()} onClose={vi.fn()} />)
    const items = within(screen.getByRole('menu', { name: 'Cosa registriamo?' })).getAllByRole('menuitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveFocus()
    expect(container.querySelector('svg.pallo')).toBeNull()
  })
})
