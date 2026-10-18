// ============================================================================
// Tornei · Timeline (l'ex Diario) e la ricerca su tutto il diario: riscontri
// di partita, apertura di una voce, stati vuoti. Le regole di *cosa* risponde
// stanno in derive.diary.test.ts: qui si verifica ciò che si vede e ciò che si
// può fare.
//
// Era Diario.test.tsx: il Diario è diventato la vista Timeline di Tornei (UX
// §14.1), quindi si monta Tornei sulla Timeline. Il campo si chiama ora «Cerca
// nei tornei», il titolo della voce è un LINK al torneo e [Storia Instagram]
// resta un pulsante. La Timeline arriva da un chunk lazy: il primo render
// aspetta la voce.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tornei from './Tornei'
import { __resetRouterForTests } from '../app/router'
import { makeDiaryEntry, makeDiaryMatchHit, makeList, makeMappaData, makeTorneo } from '../test/factories'
import { expectNoA11yViolations } from '../test/axe'
import type { DiaryEntry } from '../lib/derive'

vi.mock('../components/ConquisteMap', () => ({
  default: ({ srSummary }: { srSummary: string }) => <div role="region" aria-label={srSummary} />,
}))

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

const noop = () => {}

// Tornei sulla Timeline, con la ricerca che sale a una prop come fa l'URL.
async function renderTimeline(entries = dati) {
  const onStoria = vi.fn()
  let view!: ReturnType<typeof render>
  // Il chunk della Timeline si risolve dentro `act`: è un import, non un'attesa.
  await act(async () => {
    view = render(
    <Tornei
      vista="timeline"
      q=""
      onVista={noop}
      onQuery={noop}
      list={makeList(entries.map((e) => makeTorneo({ id: e.id, name: e.title })))}
      entries={entries}
      mappa={makeMappaData()}
      stagione={{ fYear: 'Sempre', setFYear: noop, yearOptions: ['Sempre'] }}
      onNuovoTorneo={noop}
      onStoria={onStoria}
    />,
    )
    await import('./Timeline')
  })
  if (entries.length) await screen.findByRole('link', { name: entries[0].title })
  return { ...view, onStoria }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/tornei/timeline')
  __resetRouterForTests()
})

const searchBox = () => screen.getByRole('searchbox', { name: /Cerca nei tornei/ })
// I titoli delle voci in pagina, nell'ordine del DOM. Il titolo è il link della
// card, quindi la lista dei nomi è anche la lista di ciò che si può aprire.
const titles = () =>
  screen.queryAllByRole('link').map((a) => a.textContent).filter((t) => t === 'Riccione Cup' || t === 'Forlì Beach')
const cardOf = (title: string) => screen.getByRole('link', { name: title }).closest('article') as HTMLElement

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(searchBox())
  await user.keyboard(text)
}

// ---------------------------------------------------------------- campo
describe('Timeline — campo di ricerca', () => {
  it('ha un nome accessibile e un placeholder che dice cosa si può cercare', async () => {
    await renderTimeline()
    expect(searchBox()).toBeInTheDocument()
    expect(searchBox()).toHaveAttribute('placeholder', expect.stringContaining('Cerca un torneo'))
  })

  it('non compare se il diario è vuoto', async () => {
    await renderTimeline([])
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText(/Nessun torneo ancora/)).toBeInTheDocument()
  })

  it('parte senza filtro: si vede tutto il diario', async () => {
    await renderTimeline()
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('digitando la lista si riduce', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    expect(titles()).toEqual(['Forlì Beach'])
  })

  it('ignora accenti e maiuscole', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'FORLÌ')
    expect(titles()).toEqual(['Forlì Beach'])
  })

  it('due termini si intersecano, non si sommano', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'riccione 2025')
    expect(titles()).toEqual(['Riccione Cup'])
    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}2024')
    expect(screen.getByText(/Nessun risultato/)).toBeInTheDocument()
  })

  it('cancellando la query torna tutto il diario', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    await user.clear(searchBox())
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })
})

// ---------------------------------------------------------------- reset
describe('Timeline — pulsante di reset', () => {
  it('compare solo con una query in corso', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    expect(screen.queryByRole('button', { name: 'Cancella la ricerca' })).not.toBeInTheDocument()
    await type(user, 'f')
    expect(screen.getByRole('button', { name: 'Cancella la ricerca' })).toBeInTheDocument()
  })

  it('svuota il campo e rimette tutto il diario', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    await user.click(screen.getByRole('button', { name: 'Cancella la ricerca' }))
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('dopo il reset il focus resta nel campo: si continua a digitare', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    await user.click(screen.getByRole('button', { name: 'Cancella la ricerca' }))
    expect(searchBox()).toHaveFocus()
  })

  it('è raggiungibile da tastiera dal campo di ricerca', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancella la ricerca' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(searchBox()).toHaveValue('')
  })

  it('Esc con il campo pieno lo svuota', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli{Escape}')
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })
})

// ---------------------------------------------------------------- sottotitolo
describe('Timeline — sottotitolo', () => {
  const subtitle = () => screen.getByRole('status').textContent

  it('senza ricerca conta i tornei del diario', async () => {
    await renderTimeline()
    expect(subtitle()).toBe('2 tornei nel diario')
  })

  it('usa il singolare con un torneo solo', async () => {
    await renderTimeline([dati[0]])
    expect(subtitle()).toBe('1 torneo nel diario')
  })

  it('con la ricerca attiva conta i risultati e ripete il termine', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'girone')
    expect(subtitle()).toBe('2 risultati per «girone»')
  })

  it('usa il singolare con un risultato solo', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    expect(subtitle()).toBe('1 risultato per «forli»')
  })

  it('senza riscontri lo dice, invece di continuare a contare i tornei', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'pallanuoto')
    expect(subtitle()).toBe('Nessun risultato per «pallanuoto»')
  })
})

// ---------------------------------------------------------------- riscontri
describe('Timeline — riscontri di partita', () => {
  it('mostra sotto la voce la partita che contiene l\'avversario cercato', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'gialli')
    const card = cardOf('Riccione Cup')
    expect(within(card).getByText('vs Gialli/Blu')).toBeInTheDocument()
    expect(within(card).getByText('Girone')).toBeInTheDocument()
    // Solo la partita che risponde, non tutte quelle del torneo.
    expect(within(card).queryByText('vs Rossi/Bianchi')).not.toBeInTheDocument()
  })

  it('mostra la nota, che nella Timeline non compare da nessun\'altra parte', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'rimonta')
    expect(within(cardOf('Riccione Cup')).getByText('Rimonta pazzesca al terzo set')).toBeInTheDocument()
  })

  it('mostra i punteggi dei set della partita trovata', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'gialli')
    expect(within(cardOf('Riccione Cup')).getAllByText('21-15')).toHaveLength(2)
  })

  it('quando risponde il torneo non aggiunge righe di partita', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'riccione')
    expect(within(cardOf('Riccione Cup')).queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('senza ricerca la Timeline resta quella di sempre', async () => {
    await renderTimeline()
    expect(screen.queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('attribuisce i riscontri alla voce giusta', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'girone')
    expect(within(cardOf('Riccione Cup')).getByText('vs Gialli/Blu')).toBeInTheDocument()
    expect(within(cardOf('Forlì Beach')).getByText('vs Neri/Grigi')).toBeInTheDocument()
  })

  it('restringere con il nome del torneo non fa sparire il riscontro', async () => {
    // Il caso che si scrive davvero: prima il torneo, poi chi c'era. La riga
    // deve restare, altrimenti aggiungere una parola *toglie* la spiegazione.
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'riccione rossi')
    expect(titles()).toEqual(['Riccione Cup'])
    const card = cardOf('Riccione Cup')
    expect(within(card).getByText('vs Rossi/Bianchi')).toBeInTheDocument()
    expect(within(card).queryByText('vs Gialli/Blu')).not.toBeInTheDocument()
  })

  it('restringere con la fase non svuota la lista', async () => {
    // `phase` sta solo sulla partita: se le si chiedessero tutti i token,
    // 'riccione girone' non troverebbe niente pur esistendo quel girone.
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'riccione girone')
    expect(titles()).toEqual(['Riccione Cup'])
    expect(within(cardOf('Riccione Cup')).getByText('vs Gialli/Blu')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- nessun risultato
describe('Timeline — nessun risultato', () => {
  it('mostra uno stato vuoto dedicato, non una pagina vuota', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'pallanuoto')
    expect(screen.getByText(/Nessun torneo contiene «pallanuoto»/)).toBeInTheDocument()
    expect(titles()).toEqual([])
  })

  it('non ripete la stessa frase del sottotitolo', async () => {
    // Il conteggio lo dà il sottotitolo (che è anche la live region), lo stato
    // vuoto porta l'azione: due nodi con la stessa riga sarebbero rumore.
    await renderTimeline()
    expect(screen.queryAllByText(/Nessun/)).toHaveLength(0)
  })

  it('il pulsante dello stato vuoto cancella la ricerca', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'pallanuoto')
    await user.click(screen.getByText(/Cancella la ricerca/))
    expect(searchBox()).toHaveValue('')
    expect(titles()).toEqual(['Riccione Cup', 'Forlì Beach'])
  })

  it('non è lo stato vuoto del diario vuoto', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'pallanuoto')
    expect(screen.queryByText(/Nessun torneo ancora/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- apertura
describe('Timeline — apertura di una voce', () => {
  it('il titolo è un link al torneo giusto', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    const link = screen.getByRole('link', { name: 'Forlì Beach' })
    expect(link).toHaveAttribute('href', '/tornei/t2')
    await user.click(link)
    expect(window.location.pathname).toBe('/tornei/t2')
  })

  it('apre il torneo giusto anche dopo una ricerca', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'forli')
    await user.click(screen.getByRole('link', { name: 'Forlì Beach' }))
    expect(window.location.pathname).toBe('/tornei/t2')
  })

  it('tutta la card porta al torneo con un solo link, esteso alla card', async () => {
    // jsdom non fa layout: il "tocco ovunque" è il link che si allarga con uno
    // pseudo-elemento (UX §7.6). Si verifica che il link sia uno e sia quello.
    await renderTimeline()
    const links = within(cardOf('Riccione Cup')).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveClass('ui-card-link')
    expect(links[0]).toHaveAttribute('href', '/tornei/t1')
  })

  it('la riga di una partita trovata non è un controllo a sé: il torneo si apre dal titolo', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    await type(user, 'gialli')
    expect(screen.getByText('vs Gialli/Blu').closest('button, a')).toBeNull()
    expect(within(cardOf('Riccione Cup')).getByRole('link')).toHaveAttribute('href', '/tornei/t1')
  })

  it('la storia Instagram non apre anche il torneo', async () => {
    const user = userEvent.setup()
    const { onStoria } = await renderTimeline()
    await user.click(within(cardOf('Riccione Cup')).getByRole('button', { name: /Storia Instagram/ }))
    expect(onStoria).toHaveBeenCalledExactlyOnceWith('t1')
    expect(window.location.pathname).toBe('/tornei/timeline')
  })
})

// ---------------------------------------------------------------- tastiera / a11y
describe('Timeline — tastiera e accessibilità', () => {
  it('il titolo di una voce si apre con Invio', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    screen.getByRole('link', { name: 'Riccione Cup' }).focus()
    await user.keyboard('{Enter}')
    expect(window.location.pathname).toBe('/tornei/t1')
  })

  it('il titolo di una voce porta la sua descrizione al focus', async () => {
    await renderTimeline()
    expect(screen.getByRole('link', { name: 'Forlì Beach' })).toHaveAccessibleDescription(dati[1].desc)
  })

  it('si cerca e si apre un risultato senza mai usare il mouse', async () => {
    const user = userEvent.setup()
    await renderTimeline()
    searchBox().focus()
    await user.keyboard('forli')
    // reset → titolo della voce → storia Instagram
    await user.tab()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Forlì Beach' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(window.location.pathname).toBe('/tornei/t2')
  })

  it('il campo di ricerca sta in un landmark di ricerca', async () => {
    await renderTimeline()
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toBeInTheDocument()
  })

  it('il titolo di pagina è l\'unico h1', async () => {
    await renderTimeline()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Tornei'])
  })

  it('fra il h1 e i h3 delle card c\'è un h2 (axe heading-order)', async () => {
    await renderTimeline()
    const h2 = screen.getByRole('heading', { level: 2, name: 'Timeline' })
    const h3 = screen.getAllByRole('heading', { level: 3 })
    expect(h3.length).toBeGreaterThan(0)
    expect(h2.compareDocumentPosition(h3[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('una foto senza immagine è un riquadro con il suo nome', async () => {
    await renderTimeline([makeDiaryEntry({ id: 'f1', title: 'Foto Cup', photos: [{ color: '#00B4D8', caption: '', url: null }] })])
    expect(screen.getByRole('img', { name: 'Foto non disponibile' })).toBeInTheDocument()
  })

  it('nessuna violazione axe con il diario pieno', async () => {
    const { container } = await renderTimeline()
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con la ricerca attiva e i riscontri di partita', async () => {
    const user = userEvent.setup()
    const { container } = await renderTimeline()
    await type(user, 'girone')
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe quando non c\'è nessun risultato', async () => {
    const user = userEvent.setup()
    const { container } = await renderTimeline()
    await type(user, 'pallanuoto')
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con il diario vuoto', async () => {
    const { container } = await renderTimeline([])
    await expectNoA11yViolations(container)
  })
})
