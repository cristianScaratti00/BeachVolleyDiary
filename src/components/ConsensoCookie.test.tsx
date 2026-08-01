// ============================================================================
// Banner del consenso: qui si verifica che BLOCCHI davvero.
//
// "Obbliga a scegliere" non è una questione di aspetto: se il velo lascia
// passare i click, o se col Tab si raggiunge l'app sotto, l'utente si ritrova a
// usare l'app senza aver deciso — cioè esattamente lo stato che il banner
// esiste per impedire. Sono quelle proprietà a essere presidiate qui, non i
// colori.
//
// Lo store del consenso vive a livello di modulo: `riapriScelta()` in beforeEach
// lo riporta a "non ha ancora scelto", altrimenti il secondo test eredita la
// decisione del primo.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ConsensoCookie from './ConsensoCookie'
import { riapriScelta, sceltaCorrente } from '../lib/consenso'
import { expectNoA11yViolations } from '../test/axe'

vi.mock('@microsoft/clarity', () => ({ default: { init: vi.fn(), consent: vi.fn(), identify: vi.fn() } }))

const dialog = () => screen.getByRole('dialog')
// Il velo è il genitore del dialog: è lui che copre lo schermo.
const velo = () => dialog().parentElement as HTMLElement

beforeEach(() => {
  localStorage.clear()
  riapriScelta()
})

describe('ConsensoCookie — blocca finché non si sceglie', () => {
  it('il velo copre tutto lo schermo e non lascia passare i click', () => {
    render(<ConsensoCookie />)
    const v = velo()
    expect(v).toHaveStyle({ position: 'fixed' })
    // `inset` letto dallo stile inline e non da `toHaveStyle`: jsdom non
    // normalizza lo shorthand e lo lascia senza unità ("0", non "0px").
    expect(v.style.inset).toBe('0')
    // `pointer-events: none` qui rimetterebbe l'app sotto a portata di click:
    // è la riga che trasforma un velo in una decorazione.
    expect(v.style.pointerEvents).not.toBe('none')
  })

  it('lo sfondo è nero trasparente, non opaco: l’app resta leggibile dietro', () => {
    render(<ConsensoCookie />)
    expect(velo()).toHaveStyle({ background: 'rgba(0, 0, 0, 0.1)' })
  })

  it('blocca lo scorrimento della pagina, e lo restituisce dopo la scelta', () => {
    const { rerender } = render(<ConsensoCookie />)
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Rifiuta' }))
    rerender(<ConsensoCookie />)
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('non offre nessuna via d’uscita che non sia una scelta', () => {
    render(<ConsensoCookie />)
    // Solo due pulsanti: nessuna X, nessun "dopo", nessun "chiudi".
    const bottoni = within(dialog()).getAllByRole('button')
    expect(bottoni.map((b) => b.textContent)).toEqual(['Rifiuta', 'Accetta'])
  })

  it('Esc non lo chiude: non esiste uno stato "chiuso senza aver scelto"', () => {
    render(<ConsensoCookie />)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(sceltaCorrente()).toBeNull()
  })
})

describe('ConsensoCookie — da tastiera non si esce dal dialog', () => {
  it('il fuoco entra sul rifiuto, non sull’accettazione', () => {
    render(<ConsensoCookie />)
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toHaveFocus()
  })

  it('Tab sull’ultimo torna al primo invece di finire nell’app', () => {
    render(<ConsensoCookie />)
    const accetta = screen.getByRole('button', { name: 'Accetta' })
    accetta.focus()
    fireEvent.keyDown(velo(), { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toHaveFocus()
  })

  it('se il fuoco riesce a uscire, viene riportato dentro', () => {
    // Cliccando sul velo il browser sposta il fuoco sul body; da lì il Tab
    // successivo entrerebbe nel primo tabulabile del DOCUMENTO, che è un
    // elemento dell'app sotto il velo. Questa è la rete che lo impedisce.
    render(
      <>
        <button>bottone dell'app</button>
        <ConsensoCookie />
      </>,
    )
    const fuori = screen.getByRole('button', { name: "bottone dell'app" })
    fireEvent.focusIn(fuori, { target: fuori })
    fuori.focus()
    fireEvent.focusIn(fuori)
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toHaveFocus()
  })

  it('Shift+Tab sul primo va all’ultimo, non all’indietro nell’app', () => {
    render(<ConsensoCookie />)
    screen.getByRole('button', { name: 'Rifiuta' }).focus()
    fireEvent.keyDown(velo(), { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Accetta' })).toHaveFocus()
  })
})

describe('ConsensoCookie — la scelta', () => {
  it('rifiutando sparisce e resta registrato il no', () => {
    const { rerender } = render(<ConsensoCookie />)
    fireEvent.click(screen.getByRole('button', { name: 'Rifiuta' }))
    rerender(<ConsensoCookie />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sceltaCorrente()).toBe('rifiutato')
  })

  it('accettando sparisce e resta registrato il sì', () => {
    const { rerender } = render(<ConsensoCookie />)
    fireEvent.click(screen.getByRole('button', { name: 'Accetta' }))
    rerender(<ConsensoCookie />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sceltaCorrente()).toBe('accettato')
  })
})

describe('ConsensoCookie — accessibilità', () => {
  it('è un dialog modale annunciato con titolo e descrizione', () => {
    render(<ConsensoCookie />)
    const d = dialog()
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(d).toHaveAccessibleName('Cookie e statistiche')
    expect(d).toHaveAccessibleDescription(/strumenti di misura/i)
  })

  it('non ha violazioni a11y bloccanti', async () => {
    const { container } = render(<ConsensoCookie />)
    await expectNoA11yViolations(container)
  })
})
