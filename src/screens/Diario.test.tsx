// ============================================================================
// Schermata Diario: ricerca su tutto il diario, riscontri di partita, apertura
// di una voce, empty state. Le regole di *cosa* risponde stanno in
// derive.diary.test.ts: qui si verifica ciò che si vede e ciò che si può fare.
//
// Nessun orologio da congelare: il Diario non ha il concetto di "imminente".
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Diario from './Diario'
import { makeDiaryEntry, makeDiaryMatchHit } from '../test/factories'
import { expectNoA11yViolations } from '../test/axe'
import type { DiaryEntry } from '../lib/derive'

const dati: DiaryEntry[] = [
  makeDiaryEntry({
    id: 't1',
    title: 'Riccione Cup',
    day: '20', month: 'Giu', year: '2025',
    search: { place: 'riccione open 2vs2', partner: 'luca verdi' },
    matches: [
      makeDiaryMatchHit({ id: 'm1', phase: 'Finale', opponents: 'Rossi/Bianchi', note: 'Rimonta pazzesca al terzo set' }),
      makeDiaryMatchHit({ id: 'm2', phase: 'Girone', opponents: 'Gialli/Blu' }),
    ],
  }),
  makeDiaryEntry({
    id: 't2',
    title: 'Forlì Beach',
    day: '05', month: 'Ago', year: '2024',
    search: { place: 'forli amatoriale 3vs3' },
    matches: [makeDiaryMatchHit({ id: 'm3', phase: 'Girone', opponents: 'Neri/Grigi' })],
  }),
]

function renderDiario(entries = dati) {
  const onOpenTorneo = vi.fn()
  const onInstagramStory = vi.fn()
  const onNewTorneo = vi.fn()
  const view = render(
    <Diario
      entries={entries}
      onOpenTorneo={onOpenTorneo}
      onInstagramStory={onInstagramStory}
      onNewTorneo={onNewTorneo}
    />,
  )
  return { ...view, onOpenTorneo, onInstagramStory, onNewTorneo }
}

const searchBox = () => screen.getByRole('searchbox', { name: /Cerca nel diario/ })
// I titoli delle voci in pagina, nell'ordine del DOM. Il titolo è l'azione
// primaria della card, quindi è un `button`: la lista dei nomi è anche la
// lista di ciò che si può aprire.
const titles = () =>
  screen.getAllByRole('button').map((b) => b.textContent).filter((t) => t === 'Riccione Cup' || t === 'Forlì Beach')
const cardOf = (title: string) => screen.getByRole('button', { name: title }).closest('.card') as HTMLElement

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(searchBox())
  await user.keyboard(text)
}

// ---------------------------------------------------------------- campo
describe('Diario — campo di ricerca', () => {
  it('ha un nome accessibile e un placeholder che dice cosa si può cercare', () => {
    renderDiario()
    expect(searchBox()).toBeInTheDocument()
    expect(searchBox()).toHaveAttribute('placeholder', expect.stringContaining('Cerca un torneo'))
  })

  it('non compare se il diario è vuoto', () => {
    renderDiario([])
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText(/Il tuo diario è vuoto/)).toBeInTheDocument()
  })

  it('parte senza filtro: si vede tutto il diario', () => {
    renderDiario()
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('digitando la lista si riduce', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'forli')
    expect(titles()).toEqual(['Forlì Beach'])
  })

  it('ignora accenti e maiuscole', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'FORLÌ')
    expect(titles()).toEqual(['Forlì Beach'])
  })

  it('due termini si intersecano, non si sommano', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'riccione 2025')
    expect(titles()).toEqual(['Riccione Cup'])
    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}2024')
    expect(screen.getByText(/Nessun risultato/)).toBeInTheDocument()
  })

  it('cancellando la query torna tutto il diario', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'forli')
    await user.clear(searchBox())
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })
})

// ---------------------------------------------------------------- reset
describe('Diario — pulsante di reset', () => {
  it('compare solo con una query in corso', async () => {
    const user = userEvent.setup()
    renderDiario()
    expect(screen.queryByRole('button', { name: 'Cancella la ricerca' })).not.toBeInTheDocument()
    await type(user, 'f')
    expect(screen.getByRole('button', { name: 'Cancella la ricerca' })).toBeInTheDocument()
  })

  it('svuota il campo e rimette tutto il diario', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'forli')
    await user.click(screen.getByRole('button', { name: 'Cancella la ricerca' }))
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('dopo il reset il focus resta nel campo: si continua a digitare', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'forli')
    await user.click(screen.getByRole('button', { name: 'Cancella la ricerca' }))
    expect(searchBox()).toHaveFocus()
  })

  it('è raggiungibile da tastiera dal campo di ricerca', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'forli')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancella la ricerca' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(searchBox()).toHaveValue('')
  })
})

// ---------------------------------------------------------------- sottotitolo
describe('Diario — sottotitolo', () => {
  const subtitle = () => screen.getByRole('status').textContent

  it('senza ricerca conta i tornei del diario', () => {
    renderDiario()
    expect(subtitle()).toBe('2 tornei nel diario')
  })

  it('usa il singolare con un torneo solo', () => {
    renderDiario([dati[0]])
    expect(subtitle()).toBe('1 torneo nel diario')
  })

  it('con la ricerca attiva conta i risultati e ripete il termine', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'girone')
    expect(subtitle()).toBe('2 risultati per «girone»')
  })

  it('usa il singolare con un risultato solo', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'forli')
    expect(subtitle()).toBe('1 risultato per «forli»')
  })

  it('senza riscontri lo dice, invece di continuare a contare i tornei', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'pallanuoto')
    expect(subtitle()).toBe('Nessun risultato per «pallanuoto»')
  })
})

// ---------------------------------------------------------------- riscontri
describe('Diario — riscontri di partita', () => {
  it('mostra sotto la voce la partita che contiene l\'avversario cercato', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'gialli')
    const card = cardOf('Riccione Cup')
    expect(within(card).getByText('vs Gialli/Blu')).toBeInTheDocument()
    expect(within(card).getByText('Girone')).toBeInTheDocument()
    // Solo la partita che risponde, non tutte quelle del torneo.
    expect(within(card).queryByText('vs Rossi/Bianchi')).not.toBeInTheDocument()
  })

  it('mostra la nota, che sul Diario non compare da nessun\'altra parte', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'rimonta')
    expect(within(cardOf('Riccione Cup')).getByText('Rimonta pazzesca al terzo set')).toBeInTheDocument()
  })

  it('mostra i punteggi dei set della partita trovata', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'gialli')
    expect(within(cardOf('Riccione Cup')).getAllByText('21-15')).toHaveLength(2)
  })

  it('quando risponde il torneo non aggiunge righe di partita', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'riccione')
    expect(within(cardOf('Riccione Cup')).queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('senza ricerca il diario resta quello di sempre', () => {
    renderDiario()
    expect(screen.queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('attribuisce i riscontri alla voce giusta', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'girone')
    expect(within(cardOf('Riccione Cup')).getByText('vs Gialli/Blu')).toBeInTheDocument()
    expect(within(cardOf('Forlì Beach')).getByText('vs Neri/Grigi')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- nessun risultato
describe('Diario — nessun risultato', () => {
  it('mostra un empty state dedicato, non una pagina vuota', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'pallanuoto')
    expect(screen.getByText(/Nessun torneo del diario contiene «pallanuoto»/)).toBeInTheDocument()
    expect(titles()).toEqual([])
  })

  it('non ripete la stessa frase del sottotitolo', () => {
    // Il conteggio lo dà il sottotitolo (che è anche la live region), la card
    // porta l'azione: due nodi con la stessa riga sarebbero rumore.
    renderDiario()
    expect(screen.queryAllByText(/Nessun/)).toHaveLength(0)
  })

  it('il link dell\'empty state cancella la ricerca', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'pallanuoto')
    await user.click(screen.getByText(/Cancella la ricerca/))
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('non è l\'empty state del diario vuoto', async () => {
    const user = userEvent.setup()
    renderDiario()
    await type(user, 'pallanuoto')
    expect(screen.queryByText(/Il tuo diario è vuoto/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- apertura
describe('Diario — apertura di una voce', () => {
  it('il click sul titolo apre il torneo giusto', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    await user.click(screen.getByRole('button', { name: 'Forlì Beach' }))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t2')
  })

  it('apre il torneo giusto anche dopo una ricerca', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    await type(user, 'forli')
    await user.click(screen.getByRole('button', { name: 'Forlì Beach' }))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t2')
  })

  it('il click sulla card apre il torneo', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    await user.click(within(cardOf('Riccione Cup')).getByText(/vittorie|vittoria/))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t1')
  })

  it('la riga di una partita trovata apre il torneo, non altro', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    await type(user, 'gialli')
    await user.click(screen.getByText('vs Gialli/Blu'))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t1')
  })

  it('la storia Instagram non apre anche il torneo', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo, onInstagramStory } = renderDiario()
    await user.click(within(cardOf('Riccione Cup')).getByRole('button', { name: /Storia Instagram/ }))
    expect(onInstagramStory).toHaveBeenCalledExactlyOnceWith('t1')
    expect(onOpenTorneo).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------- tastiera / a11y
describe('Diario — tastiera e accessibilità', () => {
  it('il titolo di una voce si apre con Invio', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    screen.getByRole('button', { name: 'Riccione Cup' }).focus()
    await user.keyboard('{Enter}')
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t1')
  })

  it('il titolo di una voce si apre con Spazio', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    screen.getByRole('button', { name: 'Forlì Beach' }).focus()
    await user.keyboard(' ')
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t2')
  })

  it('si cerca e si apre un risultato senza mai usare il mouse', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderDiario()
    searchBox().focus()
    await user.keyboard('forli')
    // reset → titolo della voce → storia Instagram
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Forlì Beach' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('t2')
  })

  it('il campo di ricerca sta in un landmark di ricerca', () => {
    renderDiario()
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toBeInTheDocument()
  })

  it('il titolo di pagina è l\'unico h1', () => {
    renderDiario()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Diario'])
  })

  it('nessuna violazione axe con il diario pieno', async () => {
    const { container } = renderDiario()
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con la ricerca attiva e i riscontri di partita', async () => {
    const user = userEvent.setup()
    const { container } = renderDiario()
    await type(user, 'girone')
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe quando non c\'è nessun risultato', async () => {
    const user = userEvent.setup()
    const { container } = renderDiario()
    await type(user, 'pallanuoto')
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con il diario vuoto', async () => {
    const { container } = renderDiario([])
    await expectNoA11yViolations(container)
  })
})
