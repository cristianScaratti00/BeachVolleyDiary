// ============================================================================
// Lo sheet unico «Nuovo torneo» / «Modifica torneo» (UX §5 F2, §14.1: prende il
// posto di TorneoModal.test.tsx, i cui casi sul Tabellone restano qui sotto).
// Si monta da solo, con le callback di ModalHost finte.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

const tabellone = () => screen.getByLabelText('Tabellone') as HTMLSelectElement

describe('TorneoSheet — creazione', () => {
  it('è un dialog con il titolo «Nuovo torneo» e il focus sul Nome a t0', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Nuovo torneo' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome torneo' })).toHaveFocus()
  })

  it('i default: oggi, il compagno del torneo più recente, «In corso»', () => {
    renderSheet()
    expect(screen.getByLabelText('Data')).toHaveValue(OGGI)
    expect(screen.getByLabelText('Con chi')).toHaveValue('p2')
    expect(screen.getByLabelText("Com'è andata")).toHaveValue('In corso')
  })

  it('il piazzamento «1° 🏆» si legge «1°» ma il valore resta quello del DB (C15)', () => {
    renderSheet()
    const opt = within(screen.getByLabelText("Com'è andata")).getByRole('option', { name: '1°' }) as HTMLOptionElement
    expect(opt.value).toBe('1° 🏆')
  })

  it('«Crea torneo» è annunciato disattivo senza nome; il tocco porta al campo e dice cosa manca', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    const crea = screen.getByRole('button', { name: 'Crea torneo' })
    expect(crea).toHaveAttribute('aria-disabled', 'true')
    screen.getByLabelText('Data').focus()
    await user.click(crea)
    expect(props.onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Nome torneo' })).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('Scrivi il nome del torneo.')
  })

  it('si salva con il solo nome, come «rapido» se Altri dettagli non è mai stato aperto', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(screen.getByRole('textbox', { name: 'Nome torneo' }), '  Rimini Open ')
    await user.click(screen.getByRole('button', { name: 'Crea torneo' }))
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rimini Open', placement: 'In corso', partnerId: 'p2' }), 'rapido')
  })

  it('aprendo Altri dettagli il torneo è «completo»', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(screen.getByRole('textbox', { name: 'Nome torneo' }), 'Open')
    await user.click(screen.getByRole('button', { name: /Altri dettagli/ }))
    await user.click(screen.getByRole('button', { name: /Altri dettagli/ }))
    await user.click(screen.getByRole('button', { name: 'Crea torneo' }))
    expect(props.onSave).toHaveBeenCalledWith(expect.anything(), 'completo')
  })

  it('Altri dettagli è chiuso in creazione, con il riassunto, ed è l\'eccezione di movimento E1', () => {
    renderSheet()
    const toggle = screen.getByRole('button', { name: /Altri dettagli/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent('Amatoriale · 2vs2 · Sabbia outdoor')
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveAttribute('data-motion-exception', 'altri-dettagli')
  })

  it('occupato: «Creo…», i campi si bloccano e il doppio tocco non salva due volte', async () => {
    const user = userEvent.setup()
    let fine: (v: boolean) => void = () => {}
    const onSave = vi.fn(() => new Promise<boolean>((r) => { fine = r }))
    const { props } = renderSheet({ onSave })
    await user.type(screen.getByRole('textbox', { name: 'Nome torneo' }), 'Open')
    await user.click(screen.getByRole('button', { name: 'Crea torneo' }))
    const busy = screen.getByRole('button', { name: 'Creo…' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('textbox', { name: 'Nome torneo' })).toBeDisabled()
    expect(props.setBusy).toHaveBeenCalledWith(true)
    await user.click(busy)
    expect(onSave).toHaveBeenCalledTimes(1)
    fine(true)
  })

  it('segnala lo sporco appena un campo cambia', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    expect(props.setDirty).toHaveBeenLastCalledWith(false)
    await user.type(screen.getByRole('textbox', { name: 'Nome torneo' }), 'X')
    expect(props.setDirty).toHaveBeenLastCalledWith(true)
  })

  it('«Nuovo compagno…» mostra il campo del nome', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.selectOptions(screen.getByLabelText('Con chi'), 'new')
    expect(screen.getByRole('textbox', { name: 'Nome del nuovo compagno' })).toBeInTheDocument()
  })

  it('il link all\'assistente passa lo stato del modulo', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(screen.getByRole('textbox', { name: 'Nome torneo' }), 'X')
    await user.click(screen.getByRole('button', { name: /Usa l'assistente/ }))
    expect(props.onUseAssistant).toHaveBeenCalledWith(true)
  })

  it('l\'etichetta colore è un radiogroup con i nomi dei colori', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: /Altri dettagli/ }))
    const g = screen.getByRole('radiogroup', { name: 'Etichetta colore' })
    expect(within(g).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Arancio', 'Azzurro', 'Giallo', 'Rosa', 'Blu notte'])
    expect(within(g).getByRole('radio', { name: 'Arancio' })).toHaveAttribute('aria-checked', 'true')
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderSheet()
    await expectNoA11yViolations(container)
  })
})

describe('TorneoSheet — modifica', () => {
  const torneo = makeTournament({ id: 't1', name: 'Rimini Open', bracket: 'Silver', partnerId: 'p1' })

  it('titolo «Modifica torneo», «Salva», Altri dettagli già aperto, la nota sul compagno', () => {
    renderSheet({ mode: 'modifica', torneo, onDelete: vi.fn() })
    expect(screen.getByRole('dialog', { name: 'Modifica torneo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Altri dettagli/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Con chi')).toHaveAccessibleDescription('Cambiandolo, il compagno viene aggiornato su tutte le partite del torneo.')
    expect(screen.queryByRole('button', { name: /Usa l'assistente/ })).toBeNull()
  })

  it('«Elimina torneo» è una riga che chiede conferma (onDelete apre il ConfirmDialog)', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderSheet({ mode: 'modifica', torneo, onDelete })
    await user.click(screen.getByRole('button', { name: 'Elimina torneo' }))
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

// I casi del vecchio TorneoModal.test.tsx sul Tabellone, sul contratto nuovo.
describe('TorneoSheet — tabellone', () => {
  it('propone Nessuno più ogni tabellone di BRACKETS, con Nessuno di default', () => {
    renderSheet()
    expect([...tabellone().options].map((o) => o.text)).toEqual(['Nessuno', ...BRACKETS])
    expect(tabellone().value).toBe('')
  })

  it('in modifica mostra il tabellone salvato', () => {
    renderSheet({ mode: 'modifica', torneo: makeTournament({ bracket: 'Silver' }) })
    expect(tabellone().value).toBe('Silver')
  })

  it('scegliere un tabellone lo scrive nel form', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    fireEvent.change(tabellone(), { target: { value: 'Gold' } })
    await user.type(screen.getByRole('textbox', { name: 'Nome torneo' }), 'Open')
    await user.click(screen.getByRole('button', { name: 'Crea torneo' }))
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ bracket: 'Gold' }), expect.anything())
  })

  it('tornare a Nessuno lo svuota', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet({ mode: 'modifica', torneo: makeTournament({ bracket: 'Bronze' }) })
    fireEvent.change(tabellone(), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ bracket: '' }), expect.anything())
  })
})
