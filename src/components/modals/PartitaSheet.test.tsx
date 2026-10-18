// ============================================================================
// «Nuova partita» / «Modifica partita» (UX §5 F3): due righe di set di
// default, al massimo tre, ogni campo con la sua etichetta, una riga a metà
// segnalata e non scartata in silenzio.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PartitaSheet from './PartitaSheet'
import { makeMatch } from '../../test/factories'
import { expectNoA11yViolations } from '../../test/axe'
import type { PartitaSheetProps } from '../../app/contracts'

function renderSheet(over: Partial<PartitaSheetProps> = {}) {
  const props: PartitaSheetProps = {
    mode: 'nuova',
    tournamentId: 't2',
    tournaments: [
      { id: 't1', name: 'Riccione Cup' },
      { id: 't2', name: 'Rimini Open' },
    ],
    onSave: vi.fn().mockResolvedValue(true),
    onClose: vi.fn(),
    top: true,
    byTouch: false,
    opener: null,
    setDirty: vi.fn(),
    setBusy: vi.fn(),
    ...over,
  }
  const view = render(<PartitaSheet {...props} />)
  return { ...view, props }
}

const sets = () => screen.getAllByRole('group', { name: /^Set \d/ })

describe('PartitaSheet — nuova', () => {
  it('dialog «Nuova partita», torneo preselezionato, due set vuoti con le etichette', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Nuova partita' })).toBeInTheDocument()
    expect(screen.getByLabelText('Torneo')).toHaveValue('t2')
    expect(sets()).toHaveLength(2)
    for (const g of sets()) {
      expect(within(g).getByRole('textbox', { name: 'Noi' })).toHaveAttribute('inputmode', 'numeric')
      expect(within(g).getByRole('textbox', { name: 'Loro' })).toBeInTheDocument()
    }
  })

  it('si arriva a tre set e non oltre; il focus va al «Noi» del set nuovo', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: 'Aggiungi set' }))
    expect(sets()).toHaveLength(3)
    expect(within(sets()[2]).getByRole('textbox', { name: 'Noi' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Aggiungi set' })).toBeNull()
  })

  it('«Togli set N» toglie la riga', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: 'Togli set 2' }))
    expect(sets()).toHaveLength(1)
    // Con una riga sola non si toglie.
    expect(screen.queryByRole('button', { name: /Togli set/ })).toBeNull()
  })

  it('una riga a metà si segnala e non si salva', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(within(sets()[0]).getByRole('textbox', { name: 'Noi' }), '21')
    await user.type(within(sets()[0]).getByRole('textbox', { name: 'Loro' }), '17')
    await user.type(within(sets()[1]).getByRole('textbox', { name: 'Noi' }), '15')
    await user.click(screen.getByRole('button', { name: 'Salva partita' }))
    expect(props.onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Completa il set 2 o toglilo')
    expect(within(sets()[1]).getByRole('textbox', { name: 'Noi' })).toHaveFocus()
  })

  it('salva torneo, fase, avversari, set e nota', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(screen.getByRole('textbox', { name: 'Avversari' }), 'Bianchi / Verdi')
    await user.type(within(sets()[0]).getByRole('textbox', { name: 'Noi' }), '21')
    await user.type(within(sets()[0]).getByRole('textbox', { name: 'Loro' }), '17')
    await user.click(screen.getByRole('button', { name: 'Salva partita' }))
    expect(props.onSave).toHaveBeenCalledWith({
      tournamentId: 't2',
      phase: 'Girone',
      opponents: 'Bianchi / Verdi',
      note: '',
      sets: [{ us: '21', them: '17' }, { us: '', them: '' }],
    })
  })

  it('i punteggi accettano solo cifre', async () => {
    const user = userEvent.setup()
    renderSheet()
    const noi = within(sets()[0]).getByRole('textbox', { name: 'Noi' })
    await user.type(noi, '2a1')
    expect(noi).toHaveValue('21')
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderSheet()
    await expectNoA11yViolations(container)
  })
})

describe('PartitaSheet — modifica', () => {
  const match = makeMatch({ id: 'm1', tournamentId: 't1', opponents: 'Rossi / Neri', sets: [{ us: 21, them: 19 }] })

  it('«Modifica partita» con i set della partita e «Elimina partita» che chiede conferma', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderSheet({ mode: 'modifica', match, onDelete })
    expect(screen.getByRole('dialog', { name: 'Modifica partita' })).toBeInTheDocument()
    expect(screen.getByLabelText('Torneo')).toHaveValue('t1')
    expect(sets()).toHaveLength(1)
    expect(within(sets()[0]).getByRole('textbox', { name: 'Noi' })).toHaveValue('21')
    await user.click(screen.getByRole('button', { name: 'Elimina partita' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('non è sporca finché non si cambia qualcosa', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet({ mode: 'modifica', match })
    expect(props.setDirty).toHaveBeenLastCalledWith(false)
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'ok')
    expect(props.setDirty).toHaveBeenLastCalledWith(true)
  })
})
