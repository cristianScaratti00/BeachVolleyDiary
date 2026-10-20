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

  // WCAG 2.2.2: ciò che si muove da solo si può fermare. Il tempo lo dà la
  // barretta del puntino acceso (un'animazione CSS): qui se ne simula la fine.
  it('i messaggi scorrono da soli: a fine barretta arriva il prossimo, e il pulsante li ferma e li fa ripartire', async () => {
    const user = userEvent.setup()
    render(<Login />)
    const fine = () => fireEvent.animationEnd(document.querySelector('.accesso-punto[aria-selected="true"] .accesso-punto-pieno') as Element)
    expect(screen.getByRole('tablist')).toHaveAttribute('data-auto', 'corre')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-live', 'off')
    act(() => fine())
    expect(screen.getByRole('tab', { name: 'Statistiche' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { level: 2, name: 'Scopri come stai giocando.' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ferma i messaggi' }))
    expect(screen.getByRole('tablist')).not.toHaveAttribute('data-auto')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-live', 'polite')
    await user.click(screen.getByRole('button', { name: 'Fai scorrere i messaggi' }))
    expect(screen.getByRole('tablist')).toHaveAttribute('data-auto', 'corre')
    // L'ultimo torna al primo.
    act(() => fine())
    act(() => fine())
    expect(screen.getByRole('tab', { name: 'Il diario' })).toHaveAttribute('aria-selected', 'true')
  })

  it('scegliere un messaggio ferma lo scorrimento per sempre', async () => {
    const user = userEvent.setup()
    render(<Login />)
    await user.click(screen.getByRole('tab', { name: 'Compagni' }))
    expect(screen.getByRole('tablist')).not.toHaveAttribute('data-auto')
    expect(screen.getByRole('button', { name: 'Fai scorrere i messaggi' })).toBeInTheDocument()
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

  it('la password si può mostrare: l\'occhio è un interruttore nel campo e il fuoco resta lì', async () => {
    const user = userEvent.setup()
    await apriAccedi(user)
    const campo = screen.getByLabelText('Password')
    await user.type(campo, 'segreta')
    const occhio = screen.getByRole('button', { name: 'Mostra password' })
    expect(occhio).toHaveAttribute('aria-pressed', 'false')
    expect(occhio).toHaveAttribute('aria-controls', campo.id)
    await user.click(occhio)
    expect(occhio).toHaveAttribute('aria-pressed', 'true')
    expect(campo).toHaveAttribute('type', 'text')
    expect(campo).toHaveAttribute('autocomplete', 'current-password')
    expect(campo).toHaveFocus()
    expect(campo).toHaveValue('segreta')
    await user.click(occhio)
    expect(campo).toHaveAttribute('type', 'password')
    expect(campo).toHaveFocus()
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

  it('passo 2: anche la nuova password si può mostrare', async () => {
    const user = userEvent.setup()
    await apriRegistrati(user)
    await user.type(screen.getByLabelText('Nickname'), 'Marta')
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await h1('Ciao Marta, ultimo passo.')
    const campo = screen.getByLabelText('Password')
    await user.type(campo, 'segreta')
    await user.click(screen.getByRole('button', { name: 'Mostra password' }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(campo).toHaveAttribute('autocomplete', 'new-password')
    expect(campo).toHaveFocus()
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

// ------------------------------------------------------- La pagina ferma
// jsdom non fa layout né ha un visualViewport: si verificano i patti (l'
// attributo che blocca la pagina, le misure date alla cornice, il tocco
// annullato), non lo scroll vero, che si guarda in Chrome.

/** Un visualViewport finto: si accorcia e si sposta come con la tastiera di iOS. */
function finestraVisibile(altezza: number) {
  const s = { height: altezza, offsetTop: 0, scale: 1 }
  const vv = new EventTarget()
  Object.defineProperties(vv, {
    height: { get: () => s.height },
    offsetTop: { get: () => s.offsetTop },
    scale: { get: () => s.scale },
  })
  vi.stubGlobal('visualViewport', vv)
  return {
    cambia(o: Partial<typeof s>) {
      Object.assign(s, o)
      vv.dispatchEvent(new Event('resize'))
    },
  }
}

/** Le misure arrivano al frame dopo l'evento. */
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Un `touchmove` con `n` dita; dice se è stato annullato. */
function trascina(el: Element, dita: number): boolean {
  const e = new Event('touchmove', { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'touches', { value: Array.from({ length: dita }) })
  el.dispatchEvent(e)
  return e.defaultPrevented
}

describe('Accesso — la pagina ferma', () => {
  it('finché c\'è l\'accesso la pagina non scorre (<html data-accesso>); all\'uscita torna a scorrere', () => {
    const { unmount } = render(<Login />)
    expect(document.documentElement).toHaveAttribute('data-accesso')
    unmount()
    expect(document.documentElement).not.toHaveAttribute('data-accesso')
  })

  it('la cornice segue la parte visibile: con la tastiera si stringe sopra di lei, con lo zoom si ferma', async () => {
    const vv = finestraVisibile(844)
    render(<Login />)
    const cornice = screen.getByRole('main').parentElement!
    expect(cornice.style.getPropertyValue('--vv-h')).toBe('844px')
    expect(cornice.style.getPropertyValue('--vv-top')).toBe('0px')
    expect(cornice).not.toHaveAttribute('data-tastiera')

    await act(async () => {
      vv.cambia({ height: 470, offsetTop: 300 })
      await frame()
    })
    expect(cornice.style.getPropertyValue('--vv-h')).toBe('470px')
    expect(cornice.style.getPropertyValue('--vv-top')).toBe('300px')
    expect(cornice).toHaveAttribute('data-tastiera')

    // Lo zoom a pizzico: la cornice non insegue la lente.
    await act(async () => {
      vv.cambia({ scale: 2, height: 422, offsetTop: 100 })
      await frame()
    })
    expect(cornice.style.getPropertyValue('--vv-h')).toBe('')
    expect(cornice).not.toHaveAttribute('data-tastiera')
  })

  it('un dito che trascina non sposta niente; con due dita lo zoom resta libero; all\'uscita si sblocca', () => {
    const { unmount } = render(<Login />)
    const titolo = screen.getByRole('heading', { level: 1 })
    expect(trascina(titolo, 1)).toBe(true)
    expect(trascina(titolo, 2)).toBe(false)
    unmount()
    expect(trascina(document.body, 1)).toBe(false)
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

// Il deep link della landing (UX, Parte L §L2): «Crea il tuo diario» porta a
// `/?accesso=registrati`, «Ho già un account» a `/?accesso=accedi`. Il
// parametro si legge una volta e si toglie dall'indirizzo.
describe('il deep link ?accesso=', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('?accesso=registrati apre Registrati, e il parametro sparisce lasciando il resto', async () => {
    window.history.replaceState(null, '', '/?accesso=registrati&x=1#fondo')
    render(<Login />)
    expect(await h1('Come ti chiamano in spiaggia?')).toBeInTheDocument()
    expect(window.location.search).toBe('?x=1')
    expect(window.location.hash).toBe('#fondo')
  })

  it('?accesso=accedi apre Accedi, e il parametro sparisce', async () => {
    window.history.replaceState(null, '', '/?accesso=accedi')
    render(<Login />)
    expect(await h1('Bentornato.')).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('un valore sconosciuto apre il Benvenuto, e il parametro sparisce lo stesso', () => {
    window.history.replaceState(null, '', '/?accesso=boh')
    render(<Login />)
    expect(screen.getByRole('button', { name: 'Crea il tuo diario' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Beach Diary'])
    expect(window.location.search).toBe('')
  })
})
