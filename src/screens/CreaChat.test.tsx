// ============================================================================
// L'assistente guidato (UX §5 F11, §6.10): le correzioni obbligatorie.
// Prima l'intera procedura non si usava da tastiera: chip e pulsanti erano
// `div`, il focus cadeva sul body a ogni passo, i campi non avevano un nome.
//
// La preferenza di movimento si controlla con un `matchMedia` finto: Motion la
// legge al montaggio (`useReducedMotion`). Con reduced-motion la pausa
// "sta scrivendo" è 0 e i test scorrono senza aspettare; il caso normale ha il
// suo blocco, con la pausa interrotta da un input sul dock.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreaChat from './CreaChat'
import { passoDi, trovaRisposta } from './crea/copione'
import { expectNoA11yViolations } from '../test/axe'

let riduci = true
const ascoltatori = new Set<() => void>()
function impostaRiduzione(v: boolean) {
  riduci = v
  ascoltatori.forEach((f) => f())
}
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (q: string) => ({
    get matches() {
      return q.includes('prefers-reduced-motion') ? riduci : false
    },
    media: q,
    onchange: null,
    addEventListener: (_: string, f: () => void) => ascoltatori.add(f),
    removeEventListener: (_: string, f: () => void) => ascoltatori.delete(f),
    addListener: (f: () => void) => ascoltatori.add(f),
    removeListener: (f: () => void) => ascoltatori.delete(f),
    dispatchEvent: () => false,
  }),
})

type Props = Parameters<typeof CreaChat>[0]

function renderChat(over: Partial<Props> = {}) {
  const onCreate = vi.fn().mockResolvedValue({ id: 't1', partiteNonSalvate: 0 })
  const onDone = vi.fn()
  const onExit = vi.fn()
  const registerExitGuard = vi.fn()
  const view = render(
    <CreaChat
      partners={[{ id: 'p1', name: 'Giulia' }]}
      venues={[]}
      onCreate={onCreate}
      onDone={onDone}
      onExit={onExit}
      registerExitGuard={registerExitGuard}
      {...over}
    />,
  )
  return { ...view, onCreate, onDone, onExit, registerExitGuard }
}

const log = () => screen.getByRole('log')

beforeEach(() => impostaRiduzione(true))

describe('CreaChat — da tastiera', () => {
  it('si apre con le domande già pronte e il focus nel campo, che ha un nome', () => {
    renderChat()
    expect(within(log()).getByText(/Sono Pallo\. Ti faccio qualche domanda/)).toBeInTheDocument()
    const campo = screen.getByRole('textbox', { name: 'Come si chiama il torneo?' })
    expect(campo).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Invia' })).toHaveAttribute('type', 'submit')
  })

  it('la trascrizione è un log annunciato con garbo', () => {
    renderChat()
    expect(log()).toHaveAttribute('aria-live', 'polite')
  })

  it('dopo ogni domanda il focus va al primo controllo del dock, e le scelte sono button', async () => {
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    expect(within(log()).getByText('Rimini Open')).toBeInTheDocument()
    expect(await within(log()).findByText('Perfetto, «Rimini Open». Con chi hai giocato?')).toBeInTheDocument()
    const scelte = screen.getByRole('group', { name: 'Perfetto, «Rimini Open». Con chi hai giocato?' })
    const pulsanti = within(scelte).getAllByRole('button')
    expect(pulsanti.map((b) => b.textContent)).toEqual(['Giulia', 'Nuovo compagno', 'Da solo'])
    await waitFor(() => expect(pulsanti[0]).toHaveFocus())
    // Invio sul pulsante col focus: la risposta va a segno.
    await user.keyboard('{Enter}')
    expect(within(log()).getAllByText('Giulia').length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: 'Oggi' })).toBeInTheDocument()
  })

  it('il nome vuoto non si invia', async () => {
    const user = userEvent.setup()
    renderChat()
    expect(screen.getByRole('button', { name: 'Invia' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    expect(screen.getByRole('textbox', { name: 'Come si chiama il torneo?' })).toBeInTheDocument()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderChat()
    await expectNoA11yViolations(container)
  })
})

describe('CreaChat — la testata e la capsula (design 14)', () => {
  it('la testata dice chi parla e a che passo si è', async () => {
    const user = userEvent.setup()
    renderChat()
    expect(screen.getByRole('heading', { level: 1, name: 'Pallo' })).toBeInTheDocument()
    expect(screen.getByText('Nuovo torneo · passo 1 di 8')).toBeInTheDocument()
    await user.keyboard('Rimini Open{Enter}')
    expect(await screen.findByText('Nuovo torneo · passo 2 di 8')).toBeInTheDocument()
  })

  it('il campo c\'è anche sulle domande a scelte: scrivere una scelta vale come toccarla', async () => {
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    const campo = await screen.findByRole('textbox', { name: 'Perfetto, «Rimini Open». Con chi hai giocato?' })
    await user.type(campo, 'giulia{Enter}')
    expect(await screen.findByRole('button', { name: 'Oggi' })).toBeInTheDocument()
    expect(within(log()).getByText('Giulia')).toBeInTheDocument()
  })

  it('un nome che non è fra i compagni è un compagno nuovo', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderChat()
    await user.keyboard('Rimini Open{Enter}')
    await user.type(await screen.findByRole('textbox', { name: /Con chi hai giocato/ }), 'Luca{Enter}')
    expect(await screen.findByRole('button', { name: 'Oggi' })).toBeInTheDocument()
    expect(within(log()).getByText('Luca')).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('una risposta che non corrisponde a nessuna scelta: Pallo lo dice e le scelte restano', async () => {
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Da solo' }))
    await user.type(await screen.findByRole('textbox', { name: 'Quando si è svolto?' }), 'boh{Enter}')
    expect(await within(log()).findByText('Non ho capito «boh». Scegli una delle risposte qui sotto.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Oggi' })).toBeInTheDocument()
  })

  it('dove non si scrive (i set) il campo è spento e «Invia» è annunciato disattivo', async () => {
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Giulia' }))
    await user.click(await screen.findByRole('button', { name: 'Oggi' }))
    await user.click(await screen.findByRole('button', { name: 'Salta' }))
    await user.click(await screen.findByRole('button', { name: 'Amatoriale' }))
    await user.click(await screen.findByRole('button', { name: '2vs2' }))
    await user.click(await screen.findByRole('button', { name: 'Sabbia outdoor' }))
    await user.click(await screen.findByRole('button', { name: 'È ancora in corso' }))
    await user.click(await screen.findByRole('button', { name: 'Sì, aggiungiamole' }))
    await user.type(await screen.findByRole('textbox', { name: /Contro chi era la prima/ }), '{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Finale' }))
    expect(await screen.findByRole('group', { name: 'Set 1' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Come è finita/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Invia' })).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('copione — passi e risposte scritte', () => {
  it('le domande della stessa cosa stanno nello stesso passo', () => {
    expect(passoDi('name')).toBe(1)
    expect(passoDi('partnerName')).toBe(passoDi('partner'))
    expect(passoDi('surface')).toBe(passoDi('category'))
    expect(passoDi('matchScore')).toBe(passoDi('askResults'))
    expect(passoDi('recap')).toBe(8)
  })

  it('riconosce una scelta scritta senza maiuscole, accenti o segni, e un inizio che non è ambiguo', () => {
    expect(trovaRisposta('si', ['Sì, aggiungiamole', 'No, va bene così'])).toBe(0)
    expect(trovaRisposta('SABBIA', ['Sabbia outdoor', 'Indoor', 'Erba'])).toBe(0)
    expect(trovaRisposta('2', ['1°', '2°', '3°'])).toBe(1)
    expect(trovaRisposta('s', ['Semifinale', 'Silver'])).toBe(-1)
    expect(trovaRisposta('  ', ['Oggi'])).toBe(-1)
  })
})

describe('CreaChat — la pausa "sta scrivendo"', () => {
  it('con reduced-motion non c\'è pausa né indicatore', async () => {
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    expect(screen.queryByText('Pallo sta scrivendo')).not.toBeInTheDocument()
    expect(within(log()).getByText('Perfetto, «Rimini Open». Con chi hai giocato?')).toBeInTheDocument()
  })

  it('senza reduced-motion c\'è UN indicatore, e qualunque input sul dock lo interrompe', async () => {
    impostaRiduzione(false)
    const user = userEvent.setup()
    const { container } = renderChat()
    // La testa di Pallo nella testata: pensa mentre «scrive».
    const testa = container.querySelector('.crea-head svg.pallo')!
    expect(testa).toHaveAttribute('data-umore', 'testa')
    await user.keyboard('Rimini Open{Enter}')
    expect(screen.getAllByText('Pallo sta scrivendo')).toHaveLength(1)
    expect(testa).toHaveAttribute('data-umore', 'pensa')
    expect(testa).toHaveAttribute('viewBox', '12 12 96 96')
    expect(within(log()).queryByText('Perfetto, «Rimini Open». Con chi hai giocato?')).not.toBeInTheDocument()
    // Il dock dello step nuovo c'è già (montato, attenuato): toccarlo fa
    // comparire subito la domanda.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Giulia' }))
    expect(within(log()).getByText('Perfetto, «Rimini Open». Con chi hai giocato?')).toBeInTheDocument()
    expect(screen.queryByText('Pallo sta scrivendo')).not.toBeInTheDocument()
    expect(testa).toHaveAttribute('data-umore', 'testa')
  })
})

describe('CreaChat — uscire', () => {
  it('✕ senza risposte: niente da perdere', async () => {
    const user = userEvent.setup()
    const { onExit } = renderChat()
    await user.click(screen.getByRole('button', { name: "Chiudi l'assistente" }))
    expect(onExit).toHaveBeenCalledWith(false)
  })

  it('✕ dopo una risposta: la shell deve chiedere', async () => {
    const user = userEvent.setup()
    const { onExit } = renderChat()
    await user.keyboard('Rimini Open{Enter}')
    await user.click(screen.getByRole('button', { name: "Chiudi l'assistente" }))
    expect(onExit).toHaveBeenCalledWith(true)
  })

  it('il tasto indietro usa la stessa guardia', async () => {
    const user = userEvent.setup()
    const { registerExitGuard } = renderChat()
    expect(registerExitGuard).toHaveBeenCalledTimes(1)
    const isDirty = registerExitGuard.mock.calls[0][0] as () => boolean
    expect(isDirty()).toBe(false)
    await user.keyboard('Rimini Open{Enter}')
    expect(isDirty()).toBe(true)
  })
})

// Il percorso completo fino al riepilogo, con una partita.
async function finoAlRiepilogo(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('Rimini Open{Enter}')
  await user.click(await screen.findByRole('button', { name: 'Da solo' }))
  await user.click(await screen.findByRole('button', { name: 'Oggi' }))
  await user.click(await screen.findByRole('button', { name: 'Salta' }))
  await user.click(await screen.findByRole('button', { name: 'Amatoriale' }))
  await user.click(await screen.findByRole('button', { name: '2vs2' }))
  await user.click(await screen.findByRole('button', { name: 'Sabbia outdoor' }))
  await user.click(await screen.findByRole('button', { name: 'È finito' }))
  await user.click(await screen.findByRole('button', { name: '2°' }))
  await user.click(await screen.findByRole('button', { name: 'Nessun tabellone' }))
  await user.click(await screen.findByRole('button', { name: 'Sì, aggiungiamole' }))
  await user.click(await screen.findByRole('button', { name: 'Giulia' }))
  await user.type(await screen.findByRole('textbox', { name: /Contro chi era la prima/ }), 'Bianchi / Verdi')
  await user.click(screen.getByRole('button', { name: 'Invia' }))
  await user.click(await screen.findByRole('button', { name: 'Girone' }))
  // Il punteggio: due set con le etichette vere, e la rimozione è un button.
  const set2 = await screen.findByRole('group', { name: 'Set 2' })
  expect(within(set2).getByRole('button', { name: 'Togli set 2' })).toBeInTheDocument()
  const set1 = screen.getByRole('group', { name: 'Set 1' })
  await user.type(within(set1).getByRole('textbox', { name: 'Noi' }), '21')
  await user.type(within(set1).getByRole('textbox', { name: 'Loro' }), '17')
  await user.click(within(set2).getByRole('button', { name: 'Togli set 2' }))
  await user.click(screen.getByRole('button', { name: 'Salva partita' }))
  await user.click(await screen.findByRole('button', { name: 'Ho finito' }))
  return screen.findByRole('button', { name: 'Crea torneo' })
}

describe('CreaChat — creazione', () => {
  it('consegna a onCreate lo stesso modulo di prima, poi «Fatto!» e Apri il torneo', async () => {
    const user = userEvent.setup()
    const { onCreate, onDone } = renderChat()
    await user.click(await finoAlRiepilogo(user))
    expect(onCreate).toHaveBeenCalledTimes(1)
    const [form, matches] = onCreate.mock.calls[0]
    expect(form).toMatchObject({ name: 'Rimini Open', partnerId: 'p1', placement: '2°', format: '2vs2', surface: 'Sabbia outdoor', bracket: '', venueId: '' })
    expect(matches).toEqual([{ opponents: 'Bianchi / Verdi', phase: 'Girone', sets: [{ us: 21, them: 17 }] }])
    expect(await within(log()).findByText('Fatto! Ho creato «Rimini Open».')).toBeInTheDocument()
    expect(within(log()).getByText('Ho registrato anche 1 partita.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apri il torneo' }))
    expect(onDone).toHaveBeenCalledWith('t1')
  })

  it('il successo parziale si dice: le partite non salvate', async () => {
    const user = userEvent.setup()
    renderChat({ onCreate: vi.fn().mockResolvedValue({ id: 't1', partiteNonSalvate: 2 }) })
    await user.click(await finoAlRiepilogo(user))
    expect(
      await within(log()).findByText('Ho creato il torneo, ma 2 partite non sono state salvate. Aggiungile dal torneo.'),
    ).toBeInTheDocument()
    expect(within(log()).queryByText(/Ho registrato anche/)).not.toBeInTheDocument()
  })

  it('un errore ha un solo canale: il messaggio in chat, con le scelte di nuovo attive', async () => {
    const user = userEvent.setup()
    renderChat({ onCreate: vi.fn().mockResolvedValue(null) })
    await user.click(await finoAlRiepilogo(user))
    expect(await within(log()).findByText('Ops, qualcosa è andato storto nel salvataggio. Puoi riprovare.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Crea torneo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ricomincia' })).toBeInTheDocument()
  })
})
