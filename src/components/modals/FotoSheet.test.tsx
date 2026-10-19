// ============================================================================
// «Aggiungi foto» (UX §5 F5): dialogo con la barra dei moduli («Annulla ·
// Aggiungi foto · Aggiungi»), dropzone come <button>, errori in linea, stato
// occupato «Carico…» con lo sheet che non si chiude.
// ============================================================================
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FotoSheet from './FotoSheet'
import type { FotoSheetProps } from '../../app/contracts'
import { expectNoA11yViolations } from '../../test/axe'

beforeAll(() => {
  // jsdom non implementa gli object URL.
  URL.createObjectURL ??= () => 'blob:anteprima'
  URL.revokeObjectURL ??= () => {}
})

function renderSheet(over: Partial<FotoSheetProps> = {}) {
  const props: FotoSheetProps = {
    tournamentId: 't1',
    tournamentName: 'Rimini Open',
    onSave: vi.fn().mockResolvedValue(true),
    onClose: vi.fn(),
    top: true,
    byTouch: false,
    opener: null,
    setDirty: vi.fn(),
    setBusy: vi.fn(),
    ...over,
  }
  return { ...render(<FotoSheet {...props} />), props }
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!

describe('FotoSheet', () => {
  it('è un dialogo con il titolo «Aggiungi foto» e il nome del torneo', async () => {
    const { container } = renderSheet()
    expect(screen.getByRole('dialog', { name: 'Aggiungi foto' })).toBeInTheDocument()
    expect(screen.getByText('Rimini Open')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('la dropzone è un <button> che apre il selettore di file', async () => {
    const user = userEvent.setup()
    renderSheet()
    const click = vi.spyOn(fileInput(), 'click')
    await user.click(screen.getByRole('button', { name: /Scegli una foto/ }))
    expect(click).toHaveBeenCalled()
  })

  it('senza file «Aggiungi» resta disattivo e dice cosa manca', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    const salva = screen.getByRole('button', { name: 'Aggiungi' })
    expect(salva).toHaveAttribute('aria-disabled', 'true')
    await user.click(salva)
    expect(props.onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Scegli una foto dal dispositivo.')
  })

  it('una foto oltre 5 MB dà un errore in linea', async () => {
    const user = userEvent.setup()
    renderSheet()
    const big = new File([new Uint8Array(1)], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    await user.upload(fileInput(), big)
    expect(screen.getByRole('alert')).toHaveTextContent(/supera i 5 MB/)
  })

  it('un file che non è un\'immagine dà un errore in linea', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderSheet()
    await user.upload(fileInput(), new File(['x'], 'nota.txt', { type: 'text/plain' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/non è un'immagine/)
  })

  it('mentre carica: «Carico…», aria-busy e lo sheet segnalato occupato', async () => {
    const user = userEvent.setup()
    let fine: (v: boolean) => void = () => {}
    const onSave = vi.fn(() => new Promise<boolean>((r) => { fine = r }))
    const { props } = renderSheet({ onSave })
    await user.upload(fileInput(), new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))
    expect(props.setDirty).toHaveBeenLastCalledWith(true)
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(screen.getAllByRole('button', { name: 'Carico…' })[0]).toBeInTheDocument()
    expect(props.setBusy).toHaveBeenCalledWith(true)
    expect(onSave).toHaveBeenCalledWith({ caption: '', tournamentId: 't1', color: '#FF6B35' }, expect.any(File))
    await act(async () => fine(true))
    expect(props.setBusy).toHaveBeenLastCalledWith(false)
  })
})
