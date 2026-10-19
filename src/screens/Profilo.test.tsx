// ============================================================================
// Profilo (UX §5 F9, §6.8), il redesign: presentazionale, le azioni arrivano
// come callback. Si verifica che ogni riga sia il controllo giusto (link che
// naviga, pulsante che agisce, riga che mostra e basta, interruttore), il
// nome che si apre nella riga, la foto, e le varianti: account Google/Apple,
// admin, nessuna condivisione.
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
    consenso: 'rifiutato',
    segnalazioniNuove: null,
    onSalvaNome: vi.fn().mockResolvedValue({ ok: true, notice: 'Nome aggiornato.' }),
    onCaricaAvatar: vi.fn().mockResolvedValue({ ok: true }),
    onPassword: vi.fn(),
    onTogliCondivisioni: vi.fn(),
    onConsenso: vi.fn(),
    onEsci: vi.fn(),
    onClose: vi.fn(),
    ...over,
  }
  const view = render(<Profilo {...props} />)
  return { ...view, props }
}

const rigaNome = () => screen.getByRole('button', { name: /^Nome visualizzato/ })

beforeEach(() => {
  window.history.replaceState(null, '', '/profilo')
  __resetRouterForTests()
})

describe('Profilo — struttura', () => {
  it('il nome è l\'unico h1; i gruppi sono h2', () => {
    renderProfilo()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Marta'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Account',
      'Condivisione e privacy',
      'Versione alpha',
    ])
  })

  it('non è una tab: il × in alto lo chiude', async () => {
    const user = userEvent.setup()
    const { props } = renderProfilo()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(props.onClose).toHaveBeenCalledOnce()
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

  it('l\'email è una riga che mostra e basta', () => {
    renderProfilo()
    expect(screen.getByText('marta@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Email/ })).not.toBeInTheDocument()
  })
})

describe('Profilo — righe d\'azione', () => {
  it('«Cambia password» apre lo sheet', async () => {
    const user = userEvent.setup()
    const { props } = renderProfilo()
    await user.click(screen.getByRole('button', { name: 'Cambia password' }))
    expect(props.onPassword).toHaveBeenCalledOnce()
  })

  it('account Google/Apple: al posto della voce c\'è una riga informativa', () => {
    renderProfilo({ session: { ...SESSION, hasPassword: false } })
    expect(screen.queryByRole('button', { name: 'Cambia password' })).not.toBeInTheDocument()
    expect(screen.getByText(/Google o Apple/)).toBeInTheDocument()
  })

  it('«Statistiche d\'uso anonime» è lo switch del consenso, nei due versi', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderProfilo()
    const sw = screen.getByRole('switch', { name: "Statistiche d'uso anonime" })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(sw)
    expect(props.onConsenso).toHaveBeenLastCalledWith('accettato')
    rerender(<Profilo {...props} consenso="accettato" />)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(sw)
    expect(props.onConsenso).toHaveBeenLastCalledWith('rifiutato')
  })

  it('«Togli tutte le condivisioni» c\'è solo quando ce n\'è almeno una', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderProfilo()
    expect(screen.getByText('Condivisioni ricevute').closest('.ui-row')).toHaveTextContent('0')
    expect(screen.queryByRole('button', { name: 'Togli tutte le condivisioni' })).not.toBeInTheDocument()
    rerender(<Profilo {...props} condivisioni={2} />)
    expect(screen.getByText('Condivisioni ricevute').closest('.ui-row')).toHaveTextContent('2')
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
  it('la riga mostra il nome e si apre (disclosure): il fuoco va nel campo', async () => {
    const user = userEvent.setup()
    renderProfilo()
    const riga = rigaNome()
    expect(riga).toHaveAccessibleName(/Nome visualizzato\s*Marta/)
    expect(riga).toHaveAttribute('aria-expanded', 'false')
    await user.click(riga)
    expect(riga).toHaveAttribute('aria-expanded', 'true')
    const campo = screen.getByRole('textbox', { name: 'Nome visualizzato' })
    expect(document.getElementById(riga.getAttribute('aria-controls')!)).toContainElement(campo)
    expect(campo).toHaveFocus()
    expect(campo).toHaveValue('Marta')
  })

  it('«Annulla» richiude senza salvare e torna alla riga', async () => {
    const user = userEvent.setup()
    const { props } = renderProfilo()
    await user.click(rigaNome())
    await user.type(screen.getByRole('textbox', { name: 'Nome visualizzato' }), 'tina')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(props.onSalvaNome).not.toHaveBeenCalled()
    expect(rigaNome()).toHaveAttribute('aria-expanded', 'false')
    expect(rigaNome()).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Nome visualizzato', hidden: true })).toHaveValue('Marta')
  })

  it('salvando: occupato e in sola lettura, poi si richiude e l\'esito è annunciato', async () => {
    const user = userEvent.setup()
    let fine: (v: { ok: boolean; notice?: string }) => void = () => {}
    const onSalvaNome = vi.fn(() => new Promise<{ ok: boolean; notice?: string }>((r) => { fine = r }))
    renderProfilo({ onSalvaNome })
    await user.click(rigaNome())
    const campo = screen.getByRole('textbox', { name: 'Nome visualizzato' })
    await user.clear(campo)
    await user.type(campo, 'Martina')
    await user.click(screen.getByRole('button', { name: 'Salva nome' }))
    expect(onSalvaNome).toHaveBeenCalledWith('Martina')
    expect(screen.getByRole('button', { name: 'Salvataggio…' })).toHaveAttribute('aria-busy', 'true')
    expect(campo).toHaveAttribute('readonly')
    await act(async () => fine({ ok: true, notice: 'Nome aggiornato.' }))
    expect(screen.getByRole('status')).toHaveTextContent('Nome aggiornato.')
    expect(rigaNome()).toHaveAttribute('aria-expanded', 'false')
    expect(rigaNome()).toHaveFocus()
  })

  it('Invio nel campo salva come il pulsante', async () => {
    const user = userEvent.setup()
    const { props } = renderProfilo()
    await user.click(rigaNome())
    await user.type(screen.getByRole('textbox', { name: 'Nome visualizzato' }), 'tina{Enter}')
    expect(props.onSalvaNome).toHaveBeenCalledWith('Martatina')
  })

  it('un nome rifiutato torna a quello in sessione e lo dice, a riga aperta', async () => {
    const user = userEvent.setup()
    const onSalvaNome = vi.fn().mockResolvedValue({ ok: false, error: 'Questo nome è già in uso, scegline un altro.' })
    renderProfilo({ onSalvaNome })
    await user.click(rigaNome())
    const campo = screen.getByRole('textbox', { name: 'Nome visualizzato' })
    await user.clear(campo)
    await user.type(campo, 'Giulia')
    await user.click(screen.getByRole('button', { name: 'Salva nome' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('già in uso')
    expect(campo).toHaveValue('Marta')
    expect(rigaNome()).toHaveAttribute('aria-expanded', 'true')
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
  it('nessuna violazione axe (utente, admin, nome aperto)', async () => {
    const user = userEvent.setup()
    const { container, rerender, props } = renderProfilo({ condivisioni: 1 })
    await expectNoA11yViolations(container)
    rerender(<Profilo {...props} session={{ ...SESSION, role: 'admin' }} segnalazioniNuove={0} />)
    expect(within(container).getByRole('link', { name: 'Segnalazioni ricevute' })).toBeInTheDocument()
    await expectNoA11yViolations(container)
    await user.click(rigaNome())
    await expectNoA11yViolations(container)
  })
})
