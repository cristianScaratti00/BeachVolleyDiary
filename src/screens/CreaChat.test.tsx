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
    expect(within(log()).getByText(/ti faccio qualche domanda al volo/)).toBeInTheDocument()
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

describe('CreaChat — la pausa "sta scrivendo"', () => {
  it('con reduced-motion non c\'è pausa né indicatore', async () => {
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    expect(screen.queryByText('L’assistente sta scrivendo')).not.toBeInTheDocument()
    expect(within(log()).getByText('Perfetto, «Rimini Open». Con chi hai giocato?')).toBeInTheDocument()
  })

  it('senza reduced-motion c\'è UN indicatore, e qualunque input sul dock lo interrompe', async () => {
    impostaRiduzione(false)
    const user = userEvent.setup()
    renderChat()
    await user.keyboard('Rimini Open{Enter}')
    expect(screen.getAllByText('L’assistente sta scrivendo')).toHaveLength(1)
    expect(within(log()).queryByText('Perfetto, «Rimini Open». Con chi hai giocato?')).not.toBeInTheDocument()
    // Il dock dello step nuovo c'è già (montato, attenuato): toccarlo fa
    // comparire subito la domanda.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Giulia' }))
    expect(within(log()).getByText('Perfetto, «Rimini Open». Con chi hai giocato?')).toBeInTheDocument()
    expect(screen.queryByText('L’assistente sta scrivendo')).not.toBeInTheDocument()
  })
})

describe('CreaChat — uscire', () => {
  it('✕ Esci senza risposte: niente da perdere', async () => {
    const user = userEvent.setup()
    const { onExit } = renderChat()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(onExit).toHaveBeenCalledWith(false)
  })

  it('✕ Esci dopo una risposta: la shell deve chiedere', async () => {
    const user = userEvent.setup()
    const { onExit } = renderChat()
    await user.keyboard('Rimini Open{Enter}')
    await user.click(screen.getByRole('button', { name: 'Esci' }))
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
