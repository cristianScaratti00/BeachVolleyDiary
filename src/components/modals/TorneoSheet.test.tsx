// ============================================================================
// Lo sheet unico «Nuovo torneo» / «Torneo rapido» / «Modifica torneo» (UX §5
// F2, design 15). Si monta da solo, con le callback di ModalHost finte.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TorneoSheet from './TorneoSheet'
import { BRACKETS } from '../../lib/db.enums'
import { makeTournament } from '../../test/factories'
import { expectNoA11yViolations } from '../../test/axe'
import type { TorneoSheetProps } from '../../app/contracts'

const OGGI = '2026-07-22'

function renderSheet(over: Partial<TorneoSheetProps> = {}) {
  const props: TorneoSheetProps = {
    mode: 'nuovo',
    partners: [
      { id: 'p1', name: 'Giulia' },
      { id: 'p2', name: 'Marco' },
    ],
    venues: [],
    compagnoDefault: 'p2',
    today: OGGI,
    canAddPartner: true,
    onSave: vi.fn().mockResolvedValue(true),
    onUseAssistant: vi.fn(),
    onMergeVenues: vi.fn().mockResolvedValue(true),
    onClose: vi.fn(),
    top: true,
    byTouch: false,
    opener: null,
    setDirty: vi.fn(),
    setBusy: vi.fn(),
    ...over,
  }
  const view = render(<TorneoSheet {...props} />)
  return { ...view, props }
}

const gruppo = (name: string | RegExp) => screen.getByRole('group', { name })
const chip = (g: string | RegExp, name: string) => within(gruppo(g)).getByRole('button', { name })
const nome = () => screen.getByRole('textbox', { name: 'Nome torneo' })
const salva = () => screen.getByRole('button', { name: 'Salva' })

describe('TorneoSheet — «Nuovo torneo», il modulo intero (design 15)', () => {
  it('è un dialog con il titolo «Nuovo torneo», la barra Annulla · Salva e il focus sul Nome a t0', () => {
    renderSheet()
    const d = screen.getByRole('dialog', { name: 'Nuovo torneo' })
    expect(within(d).getByRole('button', { name: 'Annulla' })).toHaveAttribute('data-variant', 'glass')
    expect(salva()).toHaveAttribute('data-variant', 'filled')
    expect(nome()).toHaveFocus()
  })

  it('tutto in vista: chip per compagno, categoria, formato, superficie, piazzamento e tabellone; niente «Altri dettagli»', () => {
    renderSheet()
    for (const g of ['Con chi lo hai fatto', 'Categoria', 'Formato', 'Superficie', 'Piazzamento', /^Tabellone/]) {
      expect(gruppo(g)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Data')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Luogo' })).toHaveDisplayValue('Scegli')
    expect(screen.queryByRole('button', { name: /Altri dettagli/ })).toBeNull()
  })

  it('i default: oggi, il compagno del torneo più recente, «In corso»', () => {
    renderSheet()
    expect(screen.getByLabelText('Data')).toHaveValue(OGGI)
    expect(chip('Con chi lo hai fatto', 'Marco')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Con chi lo hai fatto', 'Giulia')).toHaveAttribute('aria-pressed', 'false')
    expect(chip('Piazzamento', 'In corso')).toHaveAttribute('aria-pressed', 'true')
  })

  it('il piazzamento «1° 🏆» si legge «1°» ma il valore resta quello del DB (C15)', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(nome(), 'Open')
    await user.click(chip('Piazzamento', '1°'))
    expect(chip('Piazzamento', '1°')).toHaveAttribute('aria-pressed', 'true')
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ placement: '1° 🏆' }), expect.anything())
  })

  it('la superficie si legge «Sabbia» ma salva il valore del DB; le chip si scelgono una alla volta', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    expect(chip('Superficie', 'Sabbia')).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip('Superficie', 'Indoor'))
    expect(chip('Superficie', 'Sabbia')).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip('Categoria', 'Open'))
    await user.click(chip('Formato', '3vs3'))
    await user.type(nome(), 'Open')
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ surface: 'Indoor', category: 'Open', format: '3vs3' }), 'completo')
  })

  it('«Salva» è annunciato disattivo senza nome; il tocco porta al campo e dice cosa manca', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    expect(salva()).toHaveAttribute('aria-disabled', 'true')
    screen.getByLabelText('Data').focus()
    await user.click(salva())
    expect(props.onSave).not.toHaveBeenCalled()
    expect(nome()).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('Scrivi il nome del torneo.')
  })

  it('il modulo intero è sempre «completo» per l\'analytics', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(nome(), '  Rimini Open ')
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rimini Open', placement: 'In corso', partnerId: 'p2' }), 'completo')
  })

  it('occupato: «Creo…», i campi si bloccano e il doppio tocco non salva due volte', async () => {
    const user = userEvent.setup()
    let fine: (v: boolean) => void = () => {}
    const onSave = vi.fn(() => new Promise<boolean>((r) => { fine = r }))
    const { props } = renderSheet({ onSave })
    await user.type(nome(), 'Open')
    await user.click(salva())
    const busy = screen.getByRole('button', { name: 'Creo…' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(nome()).toBeDisabled()
    expect(chip('Categoria', 'Open')).toBeDisabled()
    expect(props.setBusy).toHaveBeenCalledWith(true)
    await user.click(busy)
    expect(onSave).toHaveBeenCalledTimes(1)
    fine(true)
  })

  it('segnala lo sporco appena un campo cambia, anche una chip', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    expect(props.setDirty).toHaveBeenLastCalledWith(false)
    await user.click(chip('Categoria', 'Pro'))
    expect(props.setDirty).toHaveBeenLastCalledWith(true)
  })

  it('ritoccare il compagno scelto lo toglie: il torneo resta senza compagno', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.click(chip('Con chi lo hai fatto', 'Marco'))
    expect(chip('Con chi lo hai fatto', 'Marco')).toHaveAttribute('aria-pressed', 'false')
    await user.type(nome(), 'Open')
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ partnerId: '' }), expect.anything())
  })

  it('«+ Nuovo compagno» (tratteggiata) mostra il campo del nome e ci porta il focus', async () => {
    const user = userEvent.setup()
    renderSheet()
    const nuovo = chip('Con chi lo hai fatto', 'Nuovo compagno')
    expect(nuovo).toHaveAttribute('data-variant', 'add')
    await user.click(nuovo)
    expect(nuovo).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Con chi lo hai fatto', 'Marco')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('textbox', { name: 'Nome del nuovo compagno' })).toHaveFocus()
  })

  it('senza permesso di aggiungere compagni la chip tratteggiata non c\'è', () => {
    renderSheet({ canAddPartner: false })
    expect(within(gruppo('Con chi lo hai fatto')).queryByRole('button', { name: 'Nuovo compagno' })).toBeNull()
  })

  it('il link all\'assistente passa lo stato del modulo', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(nome(), 'X')
    await user.click(screen.getByRole('button', { name: /Usa l'assistente/ }))
    expect(props.onUseAssistant).toHaveBeenCalledWith(true)
  })

  it('l\'etichetta colore è un radiogroup con i nomi dei colori', () => {
    renderSheet()
    const g = screen.getByRole('radiogroup', { name: 'Etichetta colore' })
    expect(within(g).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Arancio', 'Azzurro', 'Giallo', 'Rosa', 'Blu notte'])
    expect(within(g).getByRole('radio', { name: 'Arancio' })).toHaveAttribute('aria-checked', 'true')
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderSheet()
    await expectNoA11yViolations(container)
  })
})

describe('TorneoSheet — «Torneo rapido»', () => {
  it('in vista solo Nome, Data e Piazzamento; il resto in «Altri dettagli», chiuso, col riassunto (E1)', () => {
    renderSheet({ rapido: true })
    expect(screen.getByRole('dialog', { name: 'Torneo rapido' })).toBeInTheDocument()
    expect(nome()).toHaveFocus()
    expect(screen.getByLabelText('Data')).toHaveValue(OGGI)
    expect(gruppo('Piazzamento')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /Altri dettagli/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent('Marco · Amatoriale · 2vs2 · Sabbia outdoor')
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveAttribute('data-motion-exception', 'altri-dettagli')
    // Chiuso, il resto non si raggiunge: sta dentro un contenitore `inert`.
    expect(gruppo('Categoria').closest('[inert]')).not.toBeNull()
  })

  it('si salva con il solo nome, come «rapido» se Altri dettagli non è mai stato aperto', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet({ rapido: true })
    await user.type(nome(), 'Rimini Open')
    await user.click(chip('Piazzamento', '2°'))
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rimini Open', placement: '2°', partnerId: 'p2' }), 'rapido')
  })

  it('aprendo Altri dettagli il torneo è «completo», anche se li richiudi', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet({ rapido: true })
    await user.type(nome(), 'Open')
    await user.click(screen.getByRole('button', { name: /Altri dettagli/ }))
    expect(gruppo('Con chi lo hai fatto')).toBeInTheDocument()
    expect(gruppo('Categoria')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Altri dettagli/ }))
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.anything(), 'completo')
  })

  it('nessuna violazione axe, con i dettagli aperti', async () => {
    const user = userEvent.setup()
    const { container } = renderSheet({ rapido: true })
    await user.click(screen.getByRole('button', { name: /Altri dettagli/ }))
    await expectNoA11yViolations(container)
  })
})

describe('TorneoSheet — modifica', () => {
  const torneo = makeTournament({ id: 't1', name: 'Rimini Open', bracket: 'Silver', partnerId: 'p1' })

  it('titolo «Modifica torneo», «Salva», tutto in vista, la nota sul compagno, niente assistente', () => {
    renderSheet({ mode: 'modifica', torneo, onDelete: vi.fn() })
    expect(screen.getByRole('dialog', { name: 'Modifica torneo' })).toBeInTheDocument()
    expect(salva()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Altri dettagli/ })).toBeNull()
    expect(gruppo('Con chi lo hai fatto')).toHaveAccessibleDescription('Cambiandolo, il compagno viene aggiornato su tutte le partite del torneo.')
    expect(chip('Con chi lo hai fatto', 'Giulia')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /Usa l'assistente/ })).toBeNull()
  })

  it('in rapido la modifica resta il modulo intero', () => {
    renderSheet({ mode: 'modifica', torneo, rapido: true })
    expect(screen.getByRole('dialog', { name: 'Modifica torneo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Altri dettagli/ })).toBeNull()
  })

  it('«Elimina torneo» è un pulsante di vetro rosso che chiede conferma (onDelete apre il ConfirmDialog)', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderSheet({ mode: 'modifica', torneo, onDelete })
    const elimina = screen.getByRole('button', { name: 'Elimina torneo' })
    expect(elimina).toHaveAttribute('data-tone', 'danger')
    await user.click(elimina)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('in modifica non c\'è "sporco" finché non si cambia qualcosa', () => {
    const { props } = renderSheet({ mode: 'modifica', torneo })
    expect(props.setDirty).toHaveBeenLastCalledWith(false)
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderSheet({ mode: 'modifica', torneo, onDelete: vi.fn() })
    await expectNoA11yViolations(container)
  })
})

// I casi del vecchio TorneoModal.test.tsx sul Tabellone, sul contratto nuovo:
// da select a chip facoltative.
describe('TorneoSheet — tabellone', () => {
  const tabellone = () => gruppo(/^Tabellone/)

  it('propone ogni tabellone di BRACKETS, facoltativo e nessuno scelto di default', () => {
    renderSheet()
    expect(tabellone()).toHaveAccessibleName('Tabellone (facoltativo)')
    const chips = within(tabellone()).getAllByRole('button')
    expect(chips.map((c) => c.textContent)).toEqual([...BRACKETS])
    expect(chips.every((c) => c.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('in modifica mostra il tabellone salvato', () => {
    renderSheet({ mode: 'modifica', torneo: makeTournament({ bracket: 'Silver' }) })
    expect(within(tabellone()).getByRole('button', { name: 'Silver' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('scegliere un tabellone lo scrive nel form', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.click(within(tabellone()).getByRole('button', { name: 'Gold' }))
    await user.type(nome(), 'Open')
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ bracket: 'Gold' }), expect.anything())
  })

  it('ritoccarlo lo toglie', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet({ mode: 'modifica', torneo: makeTournament({ bracket: 'Bronze' }) })
    await user.click(within(tabellone()).getByRole('button', { name: 'Bronze' }))
    expect(within(tabellone()).getByRole('button', { name: 'Bronze' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(salva())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ bracket: '' }), expect.anything())
  })
})
