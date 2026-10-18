// ============================================================================
// Profilo (UX §5 F9, §6.8): presentazionale, le azioni arrivano come callback.
// Si verifica che ogni riga sia il controllo giusto (link che naviga, pulsante
// che agisce, riga che mostra e basta), gli stati del nome e della foto, e le
// varianti: account Google/Apple, admin, nessuna condivisione.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Profilo from './Profilo'
import type { ProfiloProps } from '../app/contracts'
import type { Session } from '../lib/auth'
import { __resetRouterForTests } from '../app/router'
import { expectNoA11yViolations } from '../test/axe'

const SESSION: Session = {
  id: 'u1',
  email: 'marta@example.com',
  name: 'Marta',
  role: 'user',
  plan: 'base',
  avatarUrl: null,
  hasPassword: true,
}

function renderProfilo(over: Partial<ProfiloProps> = {}) {
  const props: ProfiloProps = {
    session: SESSION,
    condivisioni: 0,
    consenso: null,
    segnalazioniNuove: null,
    onSalvaNome: vi.fn().mockResolvedValue({ ok: true, notice: 'Nome aggiornato.' }),
    onCaricaAvatar: vi.fn().mockResolvedValue({ ok: true }),
    onPassword: vi.fn(),
    onTogliCondivisioni: vi.fn(),
    onCookie: vi.fn(),
    onEsci: vi.fn(),
    ...over,
  }
  const view = render(<Profilo {...props} />)
  return { ...view, props }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/profilo')
  __resetRouterForTests()
})

describe('Profilo — struttura', () => {
  it('un h1 e i gruppi come h2', () => {
    renderProfilo()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Profilo'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Account', 'Condivisioni', 'Privacy', 'Supporto'])
  })

  it('«Segnala un problema» è un link a /profilo/segnala', () => {
    renderProfilo()
    expect(screen.getByRole('link', { name: 'Segnala un problema' })).toHaveAttribute('href', '/profilo/segnala')
  })

  it('senza ruolo admin non c\'è la riga delle segnalazioni ricevute', () => {
    renderProfilo()
    expect(screen.queryByRole('link', { name: /Segnalazioni ricevute/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('da admin: badge e riga «Segnalazioni ricevute» con le nuove nel nome', () => {
    renderProfilo({ session: { ...SESSION, role: 'admin' }, segnalazioniNuove: 2 })
    expect(screen.getByText('Admin')).toBeInTheDocument()
    const riga = screen.getByRole('link', { name: /Segnalazioni ricevute\s*2 nuove/ })
    expect(riga).toHaveAttribute('href', '/profilo/segnalazioni')
  })

  it('il piè dice la versione', () => {
    renderProfilo()
    expect(screen.getByText('Beach Diary · versione alpha')).toBeInTheDocument()
  })
})

describe('Profilo — righe d\'azione', () => {
  it('Password apre lo sheet', async () => {
    const user = userEvent.setup()
    const { props } = renderProfilo()
    await user.click(screen.getByRole('button', { name: 'Password' }))
    expect(props.onPassword).toHaveBeenCalledOnce()
  })

  it('account Google/Apple: al posto della voce c\'è una riga informativa', () => {
    renderProfilo({ session: { ...SESSION, hasPassword: false } })
    expect(screen.queryByRole('button', { name: 'Password' })).not.toBeInTheDocument()
    expect(screen.getByText(/Google o Apple/)).toBeInTheDocument()
  })

  it('il consenso mostra la scelta corrente e riapre il dialogo', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderProfilo()
    const riga = screen.getByRole('button', { name: /Cookie e statistiche\s*Da scegliere/ })
    await user.click(riga)
    expect(props.onCookie).toHaveBeenCalledOnce()
    rerender(<Profilo {...props} consenso="accettato" />)
    expect(screen.getByRole('button', { name: /Cookie e statistiche\s*Accettati/ })).toBeInTheDocument()
  })

  it('«Togli tutte le condivisioni» c\'è solo quando ce n\'è almeno una', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderProfilo()
    expect(screen.queryByRole('button', { name: 'Togli tutte le condivisioni' })).not.toBeInTheDocument()
    expect(screen.getByText(/Nessuno ti ha collegato/)).toBeInTheDocument()
    rerender(<Profilo {...props} condivisioni={2} />)
    expect(screen.getByText(/2 giocatori ti hanno collegato/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Togli tutte le condivisioni' }))
    expect(props.onTogliCondivisioni).toHaveBeenCalledOnce()
  })

  it('«Esci» chiede il logout (la conferma la apre la shell)', async () => {
    const user = userEvent.setup()
    const { props } = renderProfilo()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(props.onEsci).toHaveBeenCalledOnce()
  })
})

describe('Profilo — nome', () => {
  it('«Salva nome» compare solo dopo una modifica', async () => {
    const user = userEvent.setup()
    renderProfilo()
    expect(screen.queryByRole('button', { name: 'Salva nome' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Nome' }), 'tina')
    expect(screen.getByRole('button', { name: 'Salva nome' })).toBeInTheDocument()
  })

  it('salvando: occupato, poi l\'esito in linea', async () => {
    const user = userEvent.setup()
    let fine: (v: { ok: boolean; notice?: string }) => void = () => {}
    const onSalvaNome = vi.fn(() => new Promise<{ ok: boolean; notice?: string }>((r) => { fine = r }))
    renderProfilo({ onSalvaNome })
    const campo = screen.getByRole('textbox', { name: 'Nome' })
    await user.clear(campo)
    await user.type(campo, 'Martina')
    await user.click(screen.getByRole('button', { name: 'Salva nome' }))
    expect(onSalvaNome).toHaveBeenCalledWith('Martina')
    expect(screen.getByRole('button', { name: 'Salvataggio…' })).toHaveAttribute('aria-busy', 'true')
    expect(campo).toHaveAttribute('readonly')
    await act(async () => fine({ ok: true, notice: 'Nome aggiornato.' }))
    expect(screen.getByRole('status')).toHaveTextContent('Nome aggiornato.')
  })

  it('un nome rifiutato torna a quello in sessione e lo dice', async () => {
    const user = userEvent.setup()
    const onSalvaNome = vi.fn().mockResolvedValue({ ok: false, error: 'Questo nome è già in uso, scegline un altro.' })
    renderProfilo({ onSalvaNome })
    const campo = screen.getByRole('textbox', { name: 'Nome' })
    await user.clear(campo)
    await user.type(campo, 'Giulia')
    await user.click(screen.getByRole('button', { name: 'Salva nome' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('già in uso')
    expect(campo).toHaveValue('Marta')
  })
})

describe('Profilo — foto', () => {
  it('l\'avatar è un pulsante con il nome dell\'azione; durante il caricamento è occupato', async () => {
    const user = userEvent.setup()
    let fine: (v: { ok: boolean; error?: string }) => void = () => {}
    const onCaricaAvatar = vi.fn(() => new Promise<{ ok: boolean; error?: string }>((r) => { fine = r }))
    renderProfilo({ onCaricaAvatar })
    const avatar = screen.getByRole('button', { name: 'Cambia foto profilo' })
    const file = new File(['x'], 'io.png', { type: 'image/png' })
    await user.upload(screen.getByTestId('profilo-file'), file)
    expect(onCaricaAvatar).toHaveBeenCalledWith(file)
    expect(avatar).toHaveAttribute('aria-busy', 'true')
    await act(async () => fine({ ok: false, error: 'Impossibile aggiornare la foto. Riprova tra poco.' }))
    expect(avatar).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('alert')).toHaveTextContent('Impossibile aggiornare la foto')
  })
})

describe('Profilo — accessibilità', () => {
  it('nessuna violazione axe (utente e admin)', async () => {
    const { container, rerender, props } = renderProfilo({ condivisioni: 1 })
    await expectNoA11yViolations(container)
    rerender(<Profilo {...props} session={{ ...SESSION, role: 'admin' }} segnalazioniNuove={0} />)
    expect(within(container).getByRole('link', { name: 'Segnalazioni ricevute' })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
