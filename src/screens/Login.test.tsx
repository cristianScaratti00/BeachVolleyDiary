// ============================================================================
// Accesso e registrazione (UX §6.9). useAuth e il controllo del nome sono
// mockati: si verifica il modulo — etichette, segmented, stato occupato, gli
// esiti annunciati — non Supabase.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '../test/axe'

const login = vi.hoisted(() => vi.fn())
const register = vi.hoisted(() => vi.fn())
const checkNameAvailable = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ login, register }) }))
vi.mock('../lib/auth', () => ({ checkNameAvailable }))

import Login from './Login'

const accesso = () => screen.getByRole('group', { name: 'Accedi o registrati' })
// Il segmented: «Registrati» c'è anche nel piè, come link d'azione.
const seg = (name: string) => within(accesso()).getByRole('button', { name })

beforeEach(() => {
  login.mockReset().mockResolvedValue({ ok: true })
  register.mockReset().mockResolvedValue({ ok: true })
  checkNameAvailable.mockReset().mockResolvedValue({ status: 'available' })
})

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('Login — modulo', () => {
  it('ogni campo ha un\'etichetta vera', () => {
    render(<Login />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })

  it('Accedi / Registrati è un segmented con aria-pressed', async () => {
    const user = userEvent.setup()
    render(<Login />)
    expect(seg('Accedi')).toHaveAttribute('aria-pressed', 'true')
    await user.click(seg('Registrati'))
    expect(seg('Registrati')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Crea il tuo diario' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
  })

  it('il link nel piè è un button vero', async () => {
    const user = userEvent.setup()
    render(<Login />)
    const footer = screen.getAllByRole('button', { name: 'Registrati' }).find((b) => !accesso().contains(b))!
    expect(footer.tagName).toBe('BUTTON')
    await user.click(footer)
    expect(screen.getByRole('heading', { level: 1, name: 'Crea il tuo diario' })).toBeInTheDocument()
  })
})

describe('Login — invio', () => {
  it('durante l\'invio: «Attendere…», occupato e campi in sola lettura', async () => {
    const user = userEvent.setup()
    let fine: (v: { ok: boolean }) => void = () => {}
    login.mockImplementation(() => new Promise((r) => { fine = r }))
    render(<Login />)
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
    login.mockResolvedValue({ ok: false, error: 'Email o password non corretti.' })
    render(<Login />)
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti.')
  })

  it('conferma email: avviso di stato, si torna su Accedi e l\'email resta', async () => {
    const user = userEvent.setup()
    register.mockResolvedValue({ ok: true, notice: 'Ti abbiamo mandato un\'email di conferma.' })
    render(<Login />)
    await user.click(seg('Registrati'))
    await user.type(screen.getByLabelText('Nome'), 'Marta')
    await user.type(screen.getByLabelText('Email'), 'marta@example.com')
    await user.type(screen.getByLabelText('Password'), 'segreta')
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(await screen.findByRole('status')).toHaveTextContent('email di conferma')
    expect(seg('Accedi')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('marta@example.com')
  })

  it('senza rete lo dice e non prova nemmeno', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<Login />)
    expect(screen.getByRole('status')).toHaveTextContent('Sei offline')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(login).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('non posso verificare le credenziali')
  })
})

describe('Login — nome in registrazione', () => {
  it('il controllo dal vivo è annunciato in modo cortese', async () => {
    const user = userEvent.setup()
    render(<Login />)
    await user.click(seg('Registrati'))
    await user.type(screen.getByLabelText('Nome'), 'Marta')
    const stato = document.getElementById('login-name-status')!
    expect(stato).toHaveAttribute('aria-live', 'polite')
    expect(await screen.findByText('Nome disponibile')).toBeInTheDocument()
    expect(checkNameAvailable).toHaveBeenCalledWith('Marta')
  })

  it('un nome preso lo dice', async () => {
    const user = userEvent.setup()
    checkNameAvailable.mockResolvedValue({ status: 'taken' })
    render(<Login />)
    await user.click(seg('Registrati'))
    await user.type(screen.getByLabelText('Nome'), 'Marta')
    expect(await screen.findByText('Nome già in uso')).toBeInTheDocument()
  })
})

describe('Login — accessibilità', () => {
  it('nessuna violazione axe, in Accedi e in Registrati', async () => {
    const user = userEvent.setup()
    const { container } = render(<Login />)
    await expectNoA11yViolations(container)
    await user.click(seg('Registrati'))
    await expectNoA11yViolations(container)
  })
})
