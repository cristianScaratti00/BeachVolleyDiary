// ============================================================================
// L'accesso del redesign (UX §6.9): Benvenuto col carosello, Accedi, e
// Registrati in due passi. useAuth e il controllo del nome sono mockati: si
// verificano le viste, il carosello (tablist, frecce, swipe), i passi, lo
// stato occupato e gli esiti annunciati — non Supabase.
//
// Le viste si scambiano con un'uscita animata (AnimatePresence «wait»): la
// vista nuova arriva quando la vecchia è uscita, quindi si aspetta con
// `findBy…`.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '../test/axe'

const login = vi.hoisted(() => vi.fn())
const register = vi.hoisted(() => vi.fn())
const checkNameAvailable = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ login, register }) }))
vi.mock('../lib/auth', () => ({ checkNameAvailable }))

import Login from './Login'

const h1 = (name: string | RegExp) => screen.findByRole('heading', { level: 1, name })

async function apriAccedi(user: ReturnType<typeof userEvent.setup>) {
  render(<Login />)
  await user.click(screen.getByRole('button', { name: 'Ho già un account' }))
  await h1('Bentornato.')
}

async function apriRegistrati(user: ReturnType<typeof userEvent.setup>) {
  render(<Login />)
  await user.click(screen.getByRole('button', { name: 'Crea il tuo diario' }))
  await h1('Come ti chiamano in spiaggia?')
}

beforeEach(() => {
  login.mockReset().mockResolvedValue({ ok: true })
  register.mockReset().mockResolvedValue({ ok: true })
  checkNameAvailable.mockReset().mockResolvedValue({ status: 'available' })
})

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  vi.unstubAllGlobals()
})

describe('Benvenuto', () => {
  it('apre col marchio come h1, il carosello e le due strade', () => {
    render(<Login />)
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Beach Diary'])
    expect(screen.getByRole('heading', { level: 2, name: 'Ogni partita, nel tuo diario.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crea il tuo diario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ho già un account' })).toBeInTheDocument()
    // Termini e Informativa non sono pagine del repo: niente link finti.
    expect(screen.getByText(/Continuando accetti i Termini/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('il carosello è una tablist: una tab scelta, le altre fuori dal giro del Tab', () => {
    render(<Login />)
    const tabs = screen.getAllByRole('tab')
    expect(screen.getByRole('tablist', { name: 'Cosa puoi fare' })).toBeInTheDocument()
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Il diario', 'Statistiche', 'Compagni'])
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1])
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Il diario')
  })

  it('un puntino cambia messaggio', async () => {
    const user = userEvent.setup()
    render(<Login />)
    await user.click(screen.getByRole('tab', { name: 'Statistiche' }))
    expect(screen.getByRole('tab', { name: 'Statistiche' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { level: 2, name: 'Scopri come stai giocando.' })).toBeInTheDocument()
  })

  it('le frecce scorrono le tab (e il focus le segue), girando in tondo', async () => {
    const user = userEvent.setup()
    render(<Login />)
    screen.getByRole('tab', { name: 'Il diario' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Compagni' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Compagni' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Il diario' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(await screen.findByRole('heading', { level: 2, name: 'Trova con chi giochi meglio.' })).toBeInTheDocument()
  })

  it('uno swipe orizzontale va avanti e indietro; uno verticale no', async () => {
    // jsdom non ha PointerEvent: senza, `clientX` non arriverebbe al gestore.
    if (typeof window.PointerEvent === 'undefined') {
      vi.stubGlobal('PointerEvent', class extends MouseEvent {})
    }
    render(<Login />)
    const pannello = screen.getByRole('tabpanel')
    fireEvent.pointerDown(pannello, { clientX: 300, clientY: 100 })
    fireEvent.pointerUp(pannello, { clientX: 200, clientY: 110 })
    expect(screen.getByRole('tab', { name: 'Statistiche' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.pointerDown(pannello, { clientX: 200, clientY: 100 })
    fireEvent.pointerUp(pannello, { clientX: 210, clientY: 300 })
    expect(screen.getByRole('tab', { name: 'Statistiche' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.pointerDown(pannello, { clientX: 100, clientY: 100 })
    fireEvent.pointerUp(pannello, { clientX: 220, clientY: 100 })
    expect(screen.getByRole('tab', { name: 'Il diario' })).toHaveAttribute('aria-selected', 'true')
  })

  it('«Ho già un account» porta ad Accedi e il focus va al titolo', async () => {
    const user = userEvent.setup()
    render(<Login />)
    await user.click(screen.getByRole('button', { name: 'Ho già un account' }))
    expect(await h1('Bentornato.')).toHaveFocus()
  })
})

describe('Accedi', () => {
  it('ogni campo ha un\'etichetta vera; niente «Password dimenticata?» senza un flusso di recupero', async () => {
    const user = userEvent.setup()
    await apriAccedi(user)
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.queryByText(/dimenticata/i)).not.toBeInTheDocument()
  })

  it('durante l\'invio: «Attendere…», occupato e campi in sola lettura', async () => {
    const user = userEvent.setup()
    let fine: (v: { ok: boolean }) => void = () => {}
    login.mockImplementation(() => new Promise((r) => { fine = r }))
    await apriAccedi(user)
    await user.type(screen.getByLabelText('Email'), 'marta@example.com')
    await user.type(screen.getByLabelText('Password'), 'segreta')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(login).toHaveBeenCalledWith('marta@example.com', 'segreta')
    expect(screen.getByRole('button', { name: 'Attendere…' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Password')).toHaveAttribute('readonly')
    await act(async () => fine({ ok: true }))
  })

  it('un errore compare sotto il modulo come alert', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue({ ok: false, error: 'Credenziali non valide.' })
    await apriAccedi(user)
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenziali non valide.')
  })

  it('senza rete lo dice e non prova nemmeno', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    await apriAccedi(user)
    expect(screen.getByRole('status')).toHaveTextContent('Sei offline')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(login).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('non posso verificare le credenziali')
  })

  it('«‹» torna al Benvenuto; «Registrati» è un button vero che apre la registrazione', async () => {
    const user = userEvent.setup()
    await apriAccedi(user)
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(await h1('Beach Diary')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Ho già un account' }))
    await h1('Bentornato.')
    const registrati = screen.getByRole('button', { name: 'Registrati' })
    expect(registrati.tagName).toBe('BUTTON')
    await user.click(registrati)
    expect(await h1('Come ti chiamano in spiaggia?')).toBeInTheDocument()
  })
})

describe('Registrati', () => {
  it('passo 1: la barra dei passi è una progressbar e il nickname ha la sua etichetta', async () => {
    const user = userEvent.setup()
    await apriRegistrati(user)
    const barra = screen.getByRole('progressbar', { name: 'Registrazione' })
    expect(barra).toHaveAttribute('aria-valuenow', '1')
    expect(barra).toHaveAttribute('aria-valuetext', 'Passo 1 di 2')
    expect(screen.getByLabelText('Nickname')).toHaveAttribute('autocomplete', 'nickname')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('il controllo del nome dal vivo è annunciato in modo cortese', async () => {
    const user = userEvent.setup()
    await apriRegistrati(user)
    const campo = screen.getByLabelText('Nickname')
    await user.type(campo, 'Marta')
    const stato = document.getElementById(campo.getAttribute('aria-describedby')!)!
    expect(stato).toHaveAttribute('aria-live', 'polite')
    expect(await screen.findByText('Nome disponibile')).toBeInTheDocument()
    expect(checkNameAvailable).toHaveBeenCalledWith('Marta')
  })

  it('un nome preso lo dice, e «Continua» non va avanti', async () => {
    const user = userEvent.setup()
    checkNameAvailable.mockResolvedValue({ status: 'taken' })
    await apriRegistrati(user)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    expect(await screen.findByText('Nome già in uso')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByLabelText('Nickname')).toHaveFocus()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  })

  it('senza nome «Continua» lo dice sul campo', async () => {
    const user = userEvent.setup()
    await apriRegistrati(user)
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Inserisci il tuo nome.')
    expect(screen.getByLabelText('Nickname')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Nickname')).toHaveFocus()
  })

  it('passo 2 saluta per nome; «‹» torna al passo 1 col nome ancora lì', async () => {
    const user = userEvent.setup()
    await apriRegistrati(user)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    expect(await h1('Ciao Marta, ultimo passo.')).toHaveFocus()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    await user.click(screen.getByRole('button', { name: 'Torna al passo precedente' }))
    await h1('Come ti chiamano in spiaggia?')
    expect(screen.getByLabelText('Nickname')).toHaveValue('Marta')
  })

  it('«Crea account» registra con nome, email e password', async () => {
    const user = userEvent.setup()
    await apriRegistrati(user)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await h1('Ciao Marta, ultimo passo.')
    await user.type(screen.getByLabelText('Email'), 'marta@example.com')
    await user.type(screen.getByLabelText('Password'), 'segreta')
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(register).toHaveBeenCalledWith('Marta', 'marta@example.com', 'segreta')
  })

  it('conferma email: avviso di stato, si passa ad Accedi e l\'email resta', async () => {
    const user = userEvent.setup()
    register.mockResolvedValue({ ok: true, notice: 'Ti abbiamo mandato un\'email di conferma.' })
    await apriRegistrati(user)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await h1('Ciao Marta, ultimo passo.')
    await user.type(screen.getByLabelText('Email'), 'marta@example.com')
    await user.type(screen.getByLabelText('Password'), 'segreta')
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    await h1('Bentornato.')
    expect(screen.getByRole('status')).toHaveTextContent('email di conferma')
    expect(screen.getByLabelText('Email')).toHaveValue('marta@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('un errore della registrazione resta sul passo 2 come alert', async () => {
    const user = userEvent.setup()
    register.mockResolvedValue({ ok: false, error: 'Email già registrata. Prova ad accedere.' })
    await apriRegistrati(user)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await h1('Ciao Marta, ultimo passo.')
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email già registrata')
  })
})

describe('Accesso — accessibilità', () => {
  it('nessuna violazione axe nel Benvenuto, in Accedi e nei due passi', async () => {
    const user = userEvent.setup()
    const { container } = render(<Login />)
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Ho già un account' }))
    await h1('Bentornato.')
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Registrati' }))
    await h1('Come ti chiamano in spiaggia?')
    await expectNoA11yViolations(container)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await h1('Ciao Marta, ultimo passo.')
    await expectNoA11yViolations(container)
  })
})
