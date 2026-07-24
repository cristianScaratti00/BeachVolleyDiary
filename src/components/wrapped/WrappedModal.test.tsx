// ============================================================================
// Beach Wrapped — smoke test del visore (rendering + navigazione + empty state).
//
// Verifica il COMPORTAMENTO della UI, non la matematica di deriveWrapped (che ha
// i suoi test): si costruisce un WrappedData a mano e si controlla che le slide
// si sfoglino, che i controlli rispondano e che l'empty state chiuda.
//
// Nota: le card sono renderizzate due volte — l'anteprima visibile (dentro il
// role="group") e un layer nascosto a piena risoluzione (aria-hidden) usato solo
// per l'export. Per sapere "su quale slide siamo" si legge quindi il gruppo
// visibile, non un testo qualsiasi (che comparirebbe anche nel layer nascosto).
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WrappedData, WrappedSlide } from '../../lib/derive'
import WrappedModal from './WrappedModal'
import { expectNoA11yViolations } from '../../test/axe'

const SLIDES: WrappedSlide[] = [
  { kind: 'intro', eyebrow: 'Beach Wrapped', headline: 'PRIMA', title: 'copertina', caption: '12 partite', stats: [], emoji: '🏖️' },
  { kind: 'wins', eyebrow: 'Vittorie', headline: 'SECONDA', title: 'partite vinte', caption: 'su 12', stats: [{ value: '70%', label: 'Win rate' }, { value: '8–4', label: 'Record' }], emoji: '🏐' },
  { kind: 'outro', eyebrow: 'Fine', headline: 'TERZA', title: 'condividi', caption: 'Beach Volley Diary', stats: [], emoji: '🎉' },
]

function makeWrapped(over: Partial<WrappedData> = {}): WrappedData {
  return {
    range: { from: '2026-01-01', to: '2026-12-31', label: 'Stagione 2026' },
    partnerName: null,
    hasEnoughData: true,
    played: 12,
    slides: SLIDES,
    slug: 'beach-wrapped-stagione-2026',
    ...over,
  }
}

function renderModal(over: Partial<WrappedData> = {}, props: Partial<Parameters<typeof WrappedModal>[0]> = {}) {
  const onClose = vi.fn()
  const onRangeChange = vi.fn()
  const view = render(<WrappedModal wrapped={makeWrapped(over)} onClose={onClose} onRangeChange={onRangeChange} {...props} />)
  return { ...view, onClose, onRangeChange }
}

// La slide visibile: unico role="group" della UI, con l'indice nell'aria-label.
const deck = () => screen.getByRole('group')

describe('WrappedModal — navigazione', () => {
  it('parte dalla prima slide e mostra il contatore', () => {
    renderModal()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    expect(within(deck()).getByText('PRIMA')).toBeInTheDocument()
  })

  it('“Slide successiva” avanza; “precedente” torna indietro', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Slide successiva' }))
    expect(deck()).toHaveAccessibleName(/slide 2 di 3/i)
    expect(within(deck()).getByText('SECONDA')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Slide precedente' }))
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    expect(within(deck()).getByText('PRIMA')).toBeInTheDocument()
  })

  it('“precedente” è disabilitato sulla prima, “successiva” sull’ultima', async () => {
    const user = userEvent.setup()
    renderModal()
    expect(screen.getByRole('button', { name: 'Slide precedente' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Slide successiva' }))
    await user.click(screen.getByRole('button', { name: 'Slide successiva' }))
    expect(deck()).toHaveAccessibleName(/slide 3 di 3/i)
    expect(screen.getByRole('button', { name: 'Slide successiva' })).toBeDisabled()
  })

  it('il tasto play/pausa alterna l’auto-avanzamento', async () => {
    const user = userEvent.setup()
    renderModal()
    const toggle = screen.getByRole('button', { name: 'Metti in pausa' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Riproduci' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('WrappedModal — azioni', () => {
  it('cambiando l’intervallo chiama onRangeChange mantenendo l’altro estremo', () => {
    const { onRangeChange } = renderModal()
    fireEvent.change(screen.getByLabelText('Data inizio'), { target: { value: '2026-03-01' } })
    expect(onRangeChange).toHaveBeenCalledWith('2026-03-01', '2026-12-31')
  })

  it('“Chiudi” chiama onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('WrappedModal — dati insufficienti', () => {
  it('mostra l’empty state e nessuna slide sfogliabile', () => {
    renderModal({ hasEnoughData: false })
    expect(screen.getByText(/Beach Wrapped in arrivo/)).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('“Ho capito” chiude l’empty state', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal({ hasEnoughData: false })
    await user.click(screen.getByText('Ho capito'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('WrappedModal — accessibilità', () => {
  it('il mazzo non ha violazioni a11y bloccanti', async () => {
    const { container } = renderModal()
    await expectNoA11yViolations(container)
  })
})
