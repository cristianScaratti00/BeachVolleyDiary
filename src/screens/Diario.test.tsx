// ============================================================================
// Diario (il redesign): la tab con le voci dalla più recente e la ricerca su
// tutto il diario — riscontri di partita, apertura di una voce, stati vuoti,
// sottotitolo dal vivo. Le regole di *cosa* risponde stanno in
// derive.diary.test.ts: qui si verifica ciò che si vede e ciò che si può fare.
// La forma della singola voce ha i suoi test in Timeline.test.tsx.
//
// Le voci arrivano da un chunk lazy: il primo render aspetta la voce.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Diario from './Diario'
import type { DiarioProps } from '../app/contracts'
import { __resetRouterForTests } from '../app/router'
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

// La ricerca sale all'URL (App la passa come prop): qui la tiene un guscio.
function DiarioConQ({ qIniziale = '', onQuery, ...rest }: Partial<Omit<DiarioProps, 'q'>> & { qIniziale?: string }) {
  const [q, setQ] = useState(qIniziale)
  return (
    <Diario
      entries={dati}
      onNuovoTorneo={() => {}}
      onStoria={() => {}}
      {...rest}
      q={q}
      onQuery={(x) => {
        onQuery?.(x)
        setQ(x)
      }}
    />
  )
}

async function renderDiario(entries = dati, over: Partial<DiarioProps> & { qIniziale?: string } = {}) {
  const onStoria = vi.fn()
  const onNuovoTorneo = vi.fn()
  let view!: ReturnType<typeof render>
  // Il chunk delle voci si risolve dentro `act`: è un import, non un'attesa.
  await act(async () => {
    view = render(<DiarioConQ entries={entries} onStoria={onStoria} onNuovoTorneo={onNuovoTorneo} {...over} />)
    await import('./Timeline')
  })
  if (entries.length) await screen.findByRole('link', { name: entries[0].title })
  return { ...view, onStoria, onNuovoTorneo }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/diario')
  __resetRouterForTests()
})

const searchBox = () => screen.getByRole('searchbox', { name: 'Cerca nel diario' })
// I titoli delle voci in pagina, nell'ordine del DOM. Il titolo è il link della
// card, quindi la lista dei nomi è anche la lista di ciò che si può aprire.
const titles = () =>
  screen.queryAllByRole('link').map((a) => a.textContent).filter((t) => t === 'Riccione Cup' || t === 'Forlì Beach')
const cardOf = (title: string) => screen.getByRole('link', { name: title }).closest('article') as HTMLElement

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(searchBox())
  await user.keyboard(text)
}

// ---------------------------------------------------------------- intestazione
describe('Diario — intestazione', () => {
  it('il titolo è l\'unico h1, il sottotitolo conta i tornei dal più recente', async () => {
    await renderDiario()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Diario'])
    expect(screen.getByRole('status')).toHaveTextContent('2 tornei, dal più recente')
  })

  it('al singolare con un torneo solo', async () => {
    await renderDiario([dati[0]])
    expect(screen.getByRole('status')).toHaveTextContent('1 torneo, dal più recente')
  })
})

// ---------------------------------------------------------------- campo
describe('Diario — campo di ricerca', () => {
  it('ha un nome accessibile e un placeholder che dice cosa si può cercare', async () => {
    await renderDiario()
    expect(searchBox()).toHaveAttribute('placeholder', 'Cerca un torneo, una città, un avversario…')
  })

  it('non compare se il diario è vuoto', async () => {
    await renderDiario([])
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText('Il diario è ancora bianco.')).toBeInTheDocument()
  })

  it('parte senza filtro: si vede tutto il diario', async () => {
    await renderDiario()
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('digitando la lista si riduce', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'forli')
    expect(titles()).toEqual(['Forlì Beach'])
  })

  it('ignora accenti e maiuscole', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'FORLÌ')
    expect(titles()).toEqual(['Forlì Beach'])
  })

  it('due termini si intersecano, non si sommano', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'riccione 2025')
    expect(titles()).toEqual(['Riccione Cup'])
    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}2024')
    expect(screen.getByRole('status')).toHaveTextContent('Nessun risultato')
  })

  it('cancellando la query torna tutto il diario', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'forli')
    await user.clear(searchBox())
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('il testo sale all\'URL dopo una pausa, in un colpo solo', async () => {
    const user = userEvent.setup()
    const onQuery = vi.fn()
    await renderDiario(dati, { onQuery })
    await type(user, 'forli')
    await waitFor(() => expect(onQuery).toHaveBeenCalledWith('forli'))
    expect(onQuery).toHaveBeenCalledTimes(1)
  })

  it('una ricerca che arriva dall\'URL riempie il campo', async () => {
    await renderDiario(dati, { qIniziale: 'riccione' })
    expect(searchBox()).toHaveValue('riccione')
    expect(titles()).toEqual(['Riccione Cup'])
  })

  it('«/» porta nel campo di ricerca', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await user.keyboard('/')
    expect(searchBox()).toHaveFocus()
  })
})

// ---------------------------------------------------------------- reset
describe('Diario — pulsante di reset', () => {
  it('compare solo con una query in corso', async () => {
    const user = userEvent.setup()
    await renderDiario()
    expect(screen.queryByRole('button', { name: 'Cancella la ricerca' })).not.toBeInTheDocument()
    await type(user, 'f')
    expect(screen.getByRole('button', { name: 'Cancella la ricerca' })).toBeInTheDocument()
  })

  it('svuota il campo, rimette tutto il diario e lascia il focus nel campo', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'forli')
    await user.click(screen.getByRole('button', { name: 'Cancella la ricerca' }))
    expect(searchBox()).toHaveValue('')
    expect(searchBox()).toHaveFocus()
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('Esc con il campo pieno lo svuota', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'forli{Escape}')
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })
})

// ---------------------------------------------------------------- sottotitolo
describe('Diario — sottotitolo con la ricerca', () => {
  const subtitle = () => screen.getByRole('status').textContent

  it('conta i risultati e ripete il termine', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'girone')
    expect(subtitle()).toBe('2 risultati per «girone»')
  })

  it('usa il singolare con un risultato solo', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'forli')
    expect(subtitle()).toBe('1 risultato per «forli»')
  })

  it('senza riscontri lo dice, invece di continuare a contare i tornei', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'pallanuoto')
    expect(subtitle()).toBe('Nessun risultato per «pallanuoto»')
  })
})

// ---------------------------------------------------------------- riscontri
describe('Diario — riscontri di partita', () => {
  it('mostra sotto la voce la partita che contiene l\'avversario cercato', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'gialli')
    const card = cardOf('Riccione Cup')
    expect(within(card).getByText('vs Gialli/Blu')).toBeInTheDocument()
    expect(within(card).getByText('Girone')).toBeInTheDocument()
    // Solo la partita che risponde, non tutte quelle del torneo.
    expect(within(card).queryByText('vs Rossi/Bianchi')).not.toBeInTheDocument()
  })

  it('mostra la nota della partita trovata nella sua riga', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'rimonta')
    expect(within(cardOf('Riccione Cup')).getByText('Rimonta pazzesca al terzo set')).toBeInTheDocument()
  })

  it('mostra i punteggi dei set della partita trovata', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'gialli')
    expect(within(cardOf('Riccione Cup')).getAllByText('21-15')).toHaveLength(2)
  })

  it('quando risponde il torneo non aggiunge righe di partita', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'riccione')
    expect(within(cardOf('Riccione Cup')).queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('senza ricerca il Diario resta quello di sempre', async () => {
    await renderDiario()
    expect(screen.queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('attribuisce i riscontri alla voce giusta', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'girone')
    expect(within(cardOf('Riccione Cup')).getByText('vs Gialli/Blu')).toBeInTheDocument()
    expect(within(cardOf('Forlì Beach')).getByText('vs Neri/Grigi')).toBeInTheDocument()
  })

  it('restringere con il nome del torneo non fa sparire il riscontro', async () => {
    // Il caso che si scrive davvero: prima il torneo, poi chi c'era. La riga
    // deve restare, altrimenti aggiungere una parola *toglie* la spiegazione.
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'riccione rossi')
    expect(titles()).toEqual(['Riccione Cup'])
    const card = cardOf('Riccione Cup')
    expect(within(card).getByText('vs Rossi/Bianchi')).toBeInTheDocument()
    expect(within(card).queryByText('vs Gialli/Blu')).not.toBeInTheDocument()
  })

  it('restringere con la fase non svuota la lista', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'riccione girone')
    expect(titles()).toEqual(['Riccione Cup'])
    expect(within(cardOf('Riccione Cup')).getByText('vs Gialli/Blu')).toBeInTheDocument()
  })

  it('i risultati compaiono fermi: la salita è per l\'apertura, non per ogni tasto', async () => {
    const user = userEvent.setup()
    await renderDiario()
    expect(cardOf('Forlì Beach').closest('li')).toHaveClass('rise')
    await type(user, 'forli')
    expect(cardOf('Forlì Beach').closest('li')).not.toHaveClass('rise')
  })
})

// ---------------------------------------------------------------- nessun risultato
describe('Diario — nessun risultato', () => {
  it('mostra uno stato vuoto dedicato, non una pagina vuota', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'pallanuoto')
    expect(screen.getByRole('heading', { level: 2, name: 'Nessun torneo contiene «pallanuoto».' })).toBeInTheDocument()
    expect(titles()).toEqual([])
  })

  it('il pulsante dello stato vuoto (di vetro) cancella la ricerca', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'pallanuoto')
    const cancella = screen.getByText('Cancella la ricerca').closest('button')!
    expect(cancella).toHaveAttribute('data-variant', 'glass')
    await user.click(cancella)
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('non è lo stato vuoto del diario vuoto', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'pallanuoto')
    expect(screen.queryByText('Il diario è ancora bianco.')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- diario vuoto
describe('Diario — vuoto', () => {
  it('invita a registrare il primo torneo', async () => {
    const { onNuovoTorneo } = await renderDiario([])
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Registra il primo torneo' }))
    expect(onNuovoTorneo).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------- apertura
describe('Diario — apertura di una voce', () => {
  it('il titolo è un link al torneo giusto', async () => {
    const user = userEvent.setup()
    await renderDiario()
    const link = screen.getByRole('link', { name: 'Forlì Beach' })
    expect(link).toHaveAttribute('href', '/tornei/t2')
    await user.click(link)
    expect(window.location.pathname).toBe('/tornei/t2')
  })

  it('apre il torneo giusto anche dopo una ricerca', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'forli')
    await user.click(screen.getByRole('link', { name: 'Forlì Beach' }))
    expect(window.location.pathname).toBe('/tornei/t2')
  })

  it('la riga di una partita trovata non è un controllo a sé: il torneo si apre dal titolo', async () => {
    const user = userEvent.setup()
    await renderDiario()
    await type(user, 'gialli')
    expect(screen.getByText('vs Gialli/Blu').closest('button, a')).toBeNull()
    expect(within(cardOf('Riccione Cup')).getByRole('link')).toHaveAttribute('href', '/tornei/t1')
  })

  it('la Storia non apre anche il torneo', async () => {
    const user = userEvent.setup()
    const { onStoria } = await renderDiario()
    await user.click(within(cardOf('Riccione Cup')).getByRole('button', { name: /Storia Instagram/ }))
    expect(onStoria).toHaveBeenCalledExactlyOnceWith('t1')
    expect(window.location.pathname).toBe('/diario')
  })
})

// ---------------------------------------------------------------- tastiera / a11y
describe('Diario — tastiera e accessibilità', () => {
  it('il titolo di una voce si apre con Invio', async () => {
    const user = userEvent.setup()
    await renderDiario()
    screen.getByRole('link', { name: 'Riccione Cup' }).focus()
    await user.keyboard('{Enter}')
    expect(window.location.pathname).toBe('/tornei/t1')
  })

  it('si cerca e si apre un risultato senza mai usare il mouse', async () => {
    const user = userEvent.setup()
    await renderDiario()
    searchBox().focus()
    await user.keyboard('forli')
    // reset → titolo della voce → Storia
    await user.tab()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Forlì Beach' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(window.location.pathname).toBe('/tornei/t2')
  })

  it('il campo di ricerca sta in un landmark di ricerca', async () => {
    await renderDiario()
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toBeInTheDocument()
  })

  it('nessuna violazione axe con il diario pieno', async () => {
    const { container } = await renderDiario()
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con la ricerca attiva e i riscontri di partita', async () => {
    const user = userEvent.setup()
    const { container } = await renderDiario()
    await type(user, 'girone')
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe quando non c\'è nessun risultato', async () => {
    const user = userEvent.setup()
    const { container } = await renderDiario()
    await type(user, 'pallanuoto')
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con il diario vuoto', async () => {
    const { container } = await renderDiario([])
    await expectNoA11yViolations(container)
  })
})
