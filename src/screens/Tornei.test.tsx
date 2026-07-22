// ============================================================================
// Schermata Tornei: sezioni, filtro a chip, apertura di una card, empty state.
//
// "Oggi" è congelato al 22/07/2026 perché lo screen chiama `todayISO()` da sé
// (non riceve `today` come prop): senza congelarlo, il test "questo torneo è
// imminente" comincerebbe a fallire da solo il giorno della data scelta.
// Si falsifica solo `Date`, non `setTimeout`, così user-event resta normale.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tornei from './Tornei'
import { makeTorneo, makeList, TODAY } from '../test/factories'
import { expectNoA11yViolations } from '../test/axe'

const noop = () => {}

function renderTornei(tornei = [makeTorneo()], over: Partial<Parameters<typeof Tornei>[0]> = {}) {
  const onOpenTorneo = vi.fn()
  const onNewTorneo = vi.fn()
  const view = render(
    <Tornei
      list={makeList(tornei)}
      onOpenTorneo={onOpenTorneo}
      onNewTorneo={onNewTorneo}
      onQuickTorneo={noop}
      onAssistant={noop}
      canAssistant
      {...over}
    />,
  )
  return { ...view, onOpenTorneo, onNewTorneo }
}

// Titoli di sezione nell'ordine in cui compaiono nel DOM.
const sectionTitles = () =>
  screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')

// La griglia che segue un'intestazione di sezione.
function gridUnder(title: string | RegExp) {
  const heading = screen.getByRole('heading', { level: 2, name: title })
  const grid = heading.closest('div')?.nextElementSibling
  if (!(grid instanceof HTMLElement)) throw new Error(`Nessuna griglia dopo la sezione ${title}`)
  return grid
}

const cardNames = (root: HTMLElement) =>
  within(root).getAllByRole('button').map((b) => b.getAttribute('aria-label'))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`))
})
afterEach(() => vi.useRealTimers())

// ---------------------------------------------------------------- empty state
describe('Tornei — nessun torneo', () => {
  it('mostra l\'empty state e nessuna sezione né filtro', () => {
    renderTornei([])
    expect(screen.getByText(/Nessun torneo ancora/)).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
    expect(screen.queryByRole('group', { name: /Filtra i tornei/ })).not.toBeInTheDocument()
  })

  it('il link dell\'empty state crea il primo torneo', async () => {
    const user = userEvent.setup()
    const { onNewTorneo } = renderTornei([])
    await user.click(screen.getByText(/Crea il primo torneo/))
    expect(onNewTorneo).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------- sezioni
describe('Tornei — sezioni', () => {
  const dati = [
    makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
    makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
    makeTorneo({ id: 'p2', name: 'Cesenatico', format: '2vs2', date: '2026-06-01' }),
    makeTorneo({ id: 'p3', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
  ]

  it('mette "Prossimi tornei" in cima, poi i formati in ordine', () => {
    renderTornei(dati)
    expect(sectionTitles()).toEqual([
      'Prossimi tornei1 torneo',
      '2vs22 tornei',
      '3vs31 torneo',
    ])
  })

  it('il contatore usa il singolare con un solo torneo', () => {
    renderTornei(dati)
    expect(screen.getByRole('heading', { level: 2, name: /^3vs3/ })).toHaveTextContent('3vs31 torneo')
  })

  it('un torneo futuro compare tra gli imminenti e non nel gruppo del suo formato', () => {
    renderTornei(dati)
    expect(cardNames(gridUnder(/^Prossimi tornei/))).toEqual(['Apri il torneo Riccione Cup'])
    expect(sectionTitles().some((t) => t.startsWith('4vs4'))).toBe(false)
  })

  it('un torneo con la data di oggi è imminente, non passato', () => {
    renderTornei([makeTorneo({ name: 'Oggi Cup', date: TODAY, format: '2vs2' })])
    expect(cardNames(gridUnder(/^Prossimi tornei/))).toEqual(['Apri il torneo Oggi Cup'])
  })

  it('senza tornei futuri non renderizza l\'intestazione "Prossimi tornei"', () => {
    renderTornei(dati.filter((t) => t.date < TODAY))
    expect(screen.queryByRole('heading', { level: 2, name: /Prossimi tornei/ })).not.toBeInTheDocument()
    expect(sectionTitles()).toEqual(['2vs22 tornei', '3vs31 torneo'])
  })

  it('con soli tornei futuri mostra solo "Prossimi tornei"', () => {
    renderTornei([
      makeTorneo({ name: 'A', format: '2vs2', date: '2026-08-01' }),
      makeTorneo({ name: 'B', format: '3vs3', date: '2026-09-01' }),
    ])
    expect(sectionTitles()).toEqual(['Prossimi tornei2 tornei'])
  })

  it('mostra l\'intestazione anche con un formato solo', () => {
    // Un layout che cambia forma al crescere dei dati è più straniante della
    // singola intestazione in più.
    renderTornei([makeTorneo({ name: 'Solo', format: '2vs2', date: '2026-01-01' })])
    expect(sectionTitles()).toEqual(['2vs21 torneo'])
  })

  it('ordina i formati come FORMATS anche se i dati arrivano al contrario', () => {
    renderTornei([
      makeTorneo({ name: 'Q', format: '4vs4', date: '2026-01-03' }),
      makeTorneo({ name: 'T', format: '3vs3', date: '2026-01-02' }),
      makeTorneo({ name: 'D', format: '2vs2', date: '2026-01-01' }),
    ])
    expect(sectionTitles()).toEqual(['2vs21 torneo', '3vs31 torneo', '4vs41 torneo'])
  })

  it('preserva l\'ordine "agenda" dentro al gruppo (prima i più recenti)', () => {
    renderTornei(dati)
    expect(cardNames(gridUnder(/^2vs2/))).toEqual([
      'Apri il torneo Rimini Open',
      'Apri il torneo Cesenatico',
    ])
  })
})

// ---------------------------------------------------------------- filtro
describe('Tornei — filtro a chip', () => {
  const dati = [
    makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
    makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
    makeTorneo({ id: 'p2', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
  ]
  const chips = () =>
    within(screen.getByRole('group', { name: /Filtra i tornei/ }))
      .getAllByRole('button')
      .map((b) => b.textContent)

  it('offre "Tutti" più un chip per ogni formato presente', () => {
    renderTornei(dati)
    expect(chips()).toEqual(['Tutti', '2vs2', '3vs3', '4vs4'])
  })

  it('parte con "Tutti" selezionato', () => {
    renderTornei(dati)
    expect(screen.getByRole('button', { name: 'Tutti', pressed: true })).toBeInTheDocument()
  })

  it('non mostra il filtro con un solo formato: non separerebbe nulla', () => {
    renderTornei([
      makeTorneo({ format: '2vs2', date: '2026-01-01' }),
      makeTorneo({ format: '2vs2', date: '2025-01-01' }),
    ])
    expect(screen.queryByRole('group', { name: /Filtra i tornei/ })).not.toBeInTheDocument()
  })

  it('selezionando un formato mostra solo quello', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '3vs3' }))
    expect(sectionTitles()).toEqual(['3vs31 torneo'])
    expect(screen.queryByLabelText('Apri il torneo Rimini Open')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Apri il torneo Ravenna Beach')).toBeInTheDocument()
  })

  it('il filtro si applica anche alla sezione "Prossimi tornei"', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '2vs2' }))
    // Il futuro è 4vs4: filtrando su 2vs2 la sezione imminenti sparisce.
    expect(sectionTitles()).toEqual(['2vs21 torneo'])

    await user.click(screen.getByRole('button', { name: '4vs4' }))
    expect(sectionTitles()).toEqual(['Prossimi tornei1 torneo'])
  })

  it('aggiorna aria-pressed su tutte le chip, non solo su quella cliccata', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '3vs3' }))
    expect(screen.getByRole('button', { name: '3vs3' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '2vs2' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('le chip restano tutte disponibili dopo aver filtrato', async () => {
    // Se si calcolassero sui tornei visibili, dopo il primo click resterebbe
    // solo il filtro attivo e non si potrebbe più tornare indietro.
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '3vs3' }))
    expect(chips()).toEqual(['Tutti', '2vs2', '3vs3', '4vs4'])
  })

  it('"Tutti" rimette tutto in pagina', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '3vs3' }))
    await user.click(screen.getByRole('button', { name: 'Tutti' }))
    expect(sectionTitles()).toEqual(['Prossimi tornei1 torneo', '2vs21 torneo', '3vs31 torneo'])
  })

  it('ricliccare la chip attiva non svuota la pagina', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '2vs2' }))
    await user.click(screen.getByRole('button', { name: '2vs2' }))
    expect(sectionTitles()).toEqual(['2vs21 torneo'])
  })

  it('un filtro che sparisce dai dati ricade su "Tutti"', async () => {
    // Es. l'ultimo torneo 4vs4 viene cancellato altrove mentre il filtro è 4vs4.
    const user = userEvent.setup()
    const { rerender, onOpenTorneo } = renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '4vs4' }))
    expect(sectionTitles()).toEqual(['Prossimi tornei1 torneo'])

    rerender(
      <Tornei
        list={makeList(dati.filter((t) => t.format !== '4vs4'))}
        onOpenTorneo={onOpenTorneo}
        onNewTorneo={noop}
        onQuickTorneo={noop}
        onAssistant={noop}
        canAssistant
      />,
    )
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(sectionTitles()).toEqual(['2vs21 torneo', '3vs31 torneo'])
  })
})

// ---------------------------------------------------------------- card
describe('Tornei — card', () => {
  const t = makeTorneo({
    id: 'abc',
    name: 'Rimini Open',
    category: 'Pro',
    format: '2vs2',
    date: '2026-06-01',
    meta: '1 giu 2026 · Rimini · 2vs2 · con Luca',
    record: '4-1',
    winPct: 80,
    matchCount: 5,
    badge: '1° 🏆',
  })

  it('mostra categoria, nome, meta, piazzamento e statistiche', () => {
    renderTornei([t])
    const card = screen.getByLabelText('Apri il torneo Rimini Open')
    expect(within(card).getByText('Pro')).toBeInTheDocument()
    expect(within(card).getByText('Rimini Open')).toBeInTheDocument()
    expect(within(card).getByText('1 giu 2026 · Rimini · 2vs2 · con Luca')).toBeInTheDocument()
    expect(within(card).getByText('1° 🏆')).toBeInTheDocument()
    expect(within(card).getByText('4-1')).toBeInTheDocument()
    expect(within(card).getByText('80%')).toBeInTheDocument()
  })

  it('tiene il formato nella riga meta anche se sta già nell\'intestazione', () => {
    // `meta` è condivisa con "Ultimi tornei" della dashboard, dove non c'è
    // raggruppamento: toglierlo lo farebbe sparire dal resto dell'app.
    renderTornei([t])
    expect(screen.getByText(/· 2vs2 ·/)).toBeInTheDocument()
  })

  it('mostra il badge "Condiviso" solo sui tornei condivisi', () => {
    renderTornei([t, makeTorneo({ name: 'Condiviso Cup', shared: true, date: '2026-06-02' })])
    expect(within(screen.getByLabelText('Apri il torneo Condiviso Cup')).getByText('Condiviso')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Apri il torneo Rimini Open')).queryByText('Condiviso')).not.toBeInTheDocument()
  })

  it('il click apre il torneo giusto', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderTornei([t, makeTorneo({ id: 'xyz', name: 'Altro', date: '2026-05-01' })])
    await user.click(screen.getByLabelText('Apri il torneo Altro'))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('xyz')
  })

  it('apre il torneo giusto anche dopo aver filtrato', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderTornei([
      t,
      makeTorneo({ id: 'tre', name: 'Tre Cup', format: '3vs3', date: '2026-05-01' }),
    ])
    await user.click(screen.getByRole('button', { name: '3vs3' }))
    await user.click(screen.getByLabelText('Apri il torneo Tre Cup'))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('tre')
  })
})

// ---------------------------------------------------------------- tastiera / a11y
describe('Tornei — tastiera e accessibilità', () => {
  const dati = [
    makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
    makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
    makeTorneo({ id: 'p2', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
  ]

  it('Invio su una card la apre', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderTornei(dati)
    screen.getByLabelText('Apri il torneo Rimini Open').focus()
    await user.keyboard('{Enter}')
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('p1')
  })

  it('Spazio su una card la apre', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderTornei(dati)
    screen.getByLabelText('Apri il torneo Rimini Open').focus()
    await user.keyboard(' ')
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('p1')
  })

  it('gli altri tasti non aprono nulla', async () => {
    const user = userEvent.setup()
    const { onOpenTorneo } = renderTornei(dati)
    screen.getByLabelText('Apri il torneo Rimini Open').focus()
    await user.keyboard('{Escape}a{Tab}')
    expect(onOpenTorneo).not.toHaveBeenCalled()
  })

  it('le card sono raggiungibili con Tab', async () => {
    const user = userEvent.setup()
    renderTornei([makeTorneo({ name: 'Solo', date: '2026-01-01' })])
    const card = screen.getByLabelText('Apri il torneo Solo')
    expect(card).toHaveAttribute('tabindex', '0')
    card.focus()
    expect(card).toHaveFocus()
    await user.tab()
    expect(card).not.toHaveFocus()
  })

  it('si filtra da tastiera senza usare il mouse', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    screen.getByRole('button', { name: '3vs3' }).focus()
    await user.keyboard('{Enter}')
    expect(sectionTitles()).toEqual(['3vs31 torneo'])
  })

  it('l\'ordine di tabulazione è filtro → card, nell\'ordine visivo', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    const stops: (string | null)[] = []
    for (let i = 0; i < 7; i += 1) {
      await user.tab()
      const el = document.activeElement as HTMLElement | null
      stops.push(el?.getAttribute('aria-label') ?? el?.textContent ?? null)
    }
    // Le azioni dell'header ("✨ Assistente", "⚡ Rapido", "＋ Nuovo torneo")
    // non compaiono: sono `div`, non sono raggiungibili da tastiera — difetto #4
    // di docs/QA-tornei-formati.md, preesistente in ui.tsx.
    expect(stops).toEqual([
      'Tutti', '2vs2', '3vs3', '4vs4',
      'Apri il torneo Riccione Cup',
      'Apri il torneo Rimini Open',
      'Apri il torneo Ravenna Beach',
    ])
  })

  it('il titolo di pagina è l\'unico h1 e le sezioni sono h2', () => {
    renderTornei(dati)
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Tornei'])
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(3)
  })

  it('il contatore fa parte del nome accessibile della sezione', () => {
    renderTornei(dati)
    expect(screen.getByRole('heading', { level: 2, name: '2vs2 1 torneo' })).toBeInTheDocument()
  })

  it('nessuna violazione axe con dati completi', async () => {
    const { container } = renderTornei(dati)
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe nell\'empty state', async () => {
    const { container } = renderTornei([])
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con un filtro attivo', async () => {
    const user = userEvent.setup()
    const { container } = renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '4vs4' }))
    await expectNoA11yViolations(container)
  })
})

// ---------------------------------------------------------------- difetti noti
// Test scritti sul comportamento ATTESO, non su quello attuale: oggi falliscono,
// quindi restano skip. Sono la riproduzione eseguibile dei difetti #1 e #2 di
// docs/QA-tornei-formati.md — chi li corregge toglie lo `.skip` e ha già la
// verifica pronta. Non sono da cancellare per far tornare verde la suite.
describe('Tornei — difetti noti (vedi docs/QA-tornei-formati.md)', () => {
  const dati = [
    makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
    makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
    makeTorneo({ id: 'p2', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
  ]

  // Difetto #1 — il sottotitolo continua a dire "3 tornei" mentre in pagina ne
  // resta uno solo: l'intestazione contraddice ciò che si vede sotto.
  it.skip('il sottotitolo si accorda con il filtro attivo', async () => {
    const user = userEvent.setup()
    renderTornei(dati)
    await user.click(screen.getByRole('button', { name: '3vs3' }))
    expect(screen.getByText(/^1 torneo ·/)).toBeInTheDocument()
  })

  // Difetto #2 — il filtro scartato resta nello stato: se quel formato torna
  // nei dati, la pagina si rifiltra da sola senza che nessuno abbia cliccato.
  it.skip('un filtro scartato non si riattiva da solo quando il formato ritorna', async () => {
    const user = userEvent.setup()
    const { rerender, onOpenTorneo } = renderTornei(dati)
    const render4vs4 = (tornei: typeof dati) =>
      rerender(
        <Tornei
          list={makeList(tornei)}
          onOpenTorneo={onOpenTorneo}
          onNewTorneo={noop}
          onQuickTorneo={noop}
          onAssistant={noop}
          canAssistant
        />,
      )

    await user.click(screen.getByRole('button', { name: '4vs4' }))
    render4vs4(dati.filter((t) => t.format !== '4vs4')) // il 4vs4 sparisce → si ricade su Tutti
    render4vs4(dati) // il 4vs4 torna: deve restare "Tutti", non rifiltrare

    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(sectionTitles()).toEqual(['Prossimi tornei1 torneo', '2vs21 torneo', '3vs31 torneo'])
  })

  // Difetto #4 — le azioni dell'header sono `div` (ui.tsx `Button`): da tastiera
  // la pagina si attraversa tutta senza mai poter creare un torneo. Preesistente,
  // ma ora stona: sulla stessa pagina chip e card sono raggiungibili.
  it.skip('le azioni dell\'header sono raggiungibili e attivabili da tastiera', async () => {
    const user = userEvent.setup()
    const { onNewTorneo } = renderTornei(dati)
    const nuovo = screen.getByRole('button', { name: /Nuovo torneo/ })
    nuovo.focus()
    expect(nuovo).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onNewTorneo).toHaveBeenCalledTimes(1)
  })

  // Difetto #5 — `role="button"` rende presentazionali i discendenti: con uno
  // screen reader la card annuncia solo "Apri il torneo X" e perde categoria,
  // piazzamento, data, città, record.
  it.skip('la card espone anche il proprio contenuto, non solo l\'etichetta', () => {
    renderTornei([makeTorneo({ name: 'Rimini Open', category: 'Pro', badge: '1° 🏆', date: '2026-01-01' })])
    const card = screen.getByLabelText('Apri il torneo Rimini Open')
    expect(within(card).getByText('Pro')).toBeVisible()
    expect(card.getAttribute('role')).not.toBe('button')
  })
})

// ---------------------------------------------------------------- responsive
describe('Tornei — responsive', () => {
  it('le colonne della griglia non impongono una larghezza minima fissa', () => {
    // jsdom non fa layout: non si può misurare uno scroll orizzontale. Si
    // presidia il `min(100%,300px)`, che è ciò che impedisce alla colonna di
    // superare il viewport sotto i 300px + gutter.
    renderTornei([makeTorneo({ date: '2026-01-01' })])
    const grid = gridUnder(/^2vs2/)
    expect(grid.style.gridTemplateColumns).toBe('repeat(auto-fill,minmax(min(100%,300px),1fr))')
  })

  it('le chip vanno a capo invece di sfondare la riga', () => {
    renderTornei([
      makeTorneo({ format: '2vs2', date: '2026-01-01' }),
      makeTorneo({ format: '3vs3', date: '2026-01-02' }),
    ])
    expect(screen.getByRole('group', { name: /Filtra i tornei/ })).toHaveStyle({ flexWrap: 'wrap' })
  })
})
