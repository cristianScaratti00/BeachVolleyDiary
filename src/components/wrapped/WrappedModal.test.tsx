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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WrappedData, WrappedSlide } from '../../lib/derive'
import WrappedModal from './WrappedModal'
import { expectNoA11yViolations } from '../../test/axe'

// `html-to-image` tocca canvas e font: in jsdom non può girare, e comunque qui
// interessa QUALE nodo viene catturato, non il PNG che ne esce.
vi.mock('html-to-image', () => ({ toPng: vi.fn(), toBlob: vi.fn() }))

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
  const view = render(<WrappedModal wrapped={makeWrapped(over)} onClose={onClose} {...props} />)
  return { ...view, onClose }
}

// La slide visibile: unico role="group" della UI, con l'indice nell'aria-label.
const deck = () => screen.getByRole('group')

// Sotto la card non c'è più una pulsantiera: si sfoglia col dito sulla card e
// con le frecce da tastiera. Questi test presidiano proprio quello — che
// togliendo i pulsanti non sia sparito anche il modo di muoversi.
describe('WrappedModal — sfogliare senza pulsantiera', () => {
  it('parte dalla prima slide', () => {
    renderModal()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    expect(within(deck()).getByText('PRIMA')).toBeInTheDocument()
  })

  it('le frecce da tastiera avanzano e tornano indietro', () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(deck()).toHaveAccessibleName(/slide 2 di 3/i)
    expect(within(deck()).getByText('SECONDA')).toBeInTheDocument()

    fireEvent.keyDown(deck(), { key: 'ArrowLeft' })
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    expect(within(deck()).getByText('PRIMA')).toBeInTheDocument()
  })

  it('agli estremi non si esce dal mazzo', () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: 'ArrowLeft' })
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    for (let i = 0; i < 5; i++) fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(deck()).toHaveAccessibleName(/slide 3 di 3/i)
  })

  it('non resta nessun pulsante di navigazione sotto la card', () => {
    renderModal()
    expect(screen.queryByRole('button', { name: /slide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pausa|riproduci/i })).not.toBeInTheDocument()
  })
})

describe('WrappedModal — auto-avanzamento', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const passaUnaSlide = async () => { await act(async () => { vi.advanceTimersByTime(5300) }) }

  it('scorre da solo, come una storia', async () => {
    renderModal()
    await passaUnaSlide()
    expect(deck()).toHaveAccessibleName(/slide 2 di 3/i)
  })

  it('tenendo premuto si ferma: è la pausa, ora che il pulsante non c’è più', async () => {
    // Senza questo, togliere il tasto pausa lascerebbe un contenuto che si
    // muove da solo e non si può fermare.
    renderModal()
    fireEvent.pointerDown(deck())
    await passaUnaSlide()
    await passaUnaSlide()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
  })

  it('la barra spaziatrice mette in pausa da tastiera', async () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: ' ' })
    await passaUnaSlide()
    await passaUnaSlide()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
  })
})

describe('WrappedModal — azioni', () => {
  it('lo scarico compare solo sull’ultima slide', () => {
    // È il recap che si porta via, non una slide qualsiasi: prima della fine
    // quel pulsante invitava ad andarsene invece di guardare.
    renderModal()
    expect(screen.queryByRole('button', { name: /scarica/i })).not.toBeInTheDocument()
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(screen.queryByRole('button', { name: /scarica/i })).not.toBeInTheDocument()
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: /scarica/i })).toBeInTheDocument()
  })

  it('scarica il RIEPILOGO, non la slide che si sta guardando', async () => {
    // Sull'ultima slide si legge "Grazie": scaricare quella sarebbe portarsi a
    // casa un saluto invece dei propri numeri. Il PNG è sempre la card recap.
    const toPng = vi.mocked((await import('html-to-image')).toPng)
    toPng.mockResolvedValue('data:image/png;base64,x')
    // Il download fa `a.click()` su un href data:; jsdom non sa navigare e lo
    // urla su stderr ad ogni run. Qui il click sull'ancora non interessa.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const conRecap: WrappedSlide[] = [
      SLIDES[0],
      { kind: 'recap', eyebrow: 'Riepilogo', headline: 'RECAP', title: '', caption: '', stats: [], emoji: '📊' },
      SLIDES[2],
    ]
    renderModal({ slides: conRecap })
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(deck()).toHaveAccessibleName(/slide 3 di 3/i)

    fireEvent.click(screen.getByRole('button', { name: /scarica/i }))
    await act(async () => {})

    // Il nodo catturato è quello del recap (indice 1), non della slide corrente.
    const nodo = toPng.mock.calls[0][0] as HTMLElement
    expect(within(nodo).getByText('RECAP')).toBeInTheDocument()
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
