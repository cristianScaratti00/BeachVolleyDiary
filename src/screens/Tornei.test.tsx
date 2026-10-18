// ============================================================================
// Schermata Tornei: viste Lista · Timeline · Mappa, sezioni, filtro a chip,
// card di entità (link veri), empty state, sottotitolo dal vivo.
//
// "Oggi" è congelato al 22/07/2026 perché lo screen chiama `todayISO()` da sé
// (non riceve `today` come prop): senza congelarlo, il test "questo torneo è
// imminente" comincerebbe a fallire da solo il giorno della data scelta.
// Si falsifica solo `Date`, non `setTimeout`, così user-event resta normale.
//
// Le card aprono il torneo con un `<a href>` vero (UX §7.6): si verifica
// l'indirizzo e la navigazione del router, non più una callback.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tornei from './Tornei'
import type { TorneiProps } from '../app/contracts'
import type { TorneiVista } from '../app/routes'
import { __resetRouterForTests } from '../app/router'
import { makeTorneo, makeList, makeMappaData, makeMappaPin, makeDiaryEntry, TODAY } from '../test/factories'
import { expectNoA11yViolations } from '../test/axe'

// La mappa vera è Leaflet dentro un `lazy()`: in jsdom non si disegna e il suo
// caricamento renderebbe questi test dipendenti dai tempi di un `import()`. Qui
// interessa solo *che* la vista mappa compaia al posto della lista, quindi lo
// stub ne riproduce la forma accessibile. Il contenuto ha i suoi test in
// `Mappa.test.tsx`.
vi.mock('../components/ConquisteMap', () => ({
  default: ({ srSummary }: { srSummary: string }) => <div role="region" aria-label={srSummary} />,
}))

// Il riquadro mappa, cercato per nome: `srSummary` comincia sempre così.
const RIQUADRO_MAPPA = { name: /Mappa d'Italia/ } as const

const noop = () => {}
const STAGIONE: TorneiProps['stagione'] = { fYear: 'Sempre', setFYear: noop, yearOptions: ['2026', 'Sempre'] }

// La vista e la ricerca stanno nell'URL (App le passa come prop). Nei test le
// tiene questo guscio minimo, così il selettore si clicca come farebbe un utente.
type HarnessProps = Partial<Omit<TorneiProps, 'vista' | 'q'>> & { vistaIniziale?: TorneiVista; qIniziale?: string }

function TorneiConVista({ vistaIniziale = 'lista', qIniziale = '', onVista, onQuery, ...rest }: HarnessProps) {
  const [vista, setVista] = useState<TorneiVista>(vistaIniziale)
  const [q, setQ] = useState(qIniziale)
  return (
    <Tornei
      list={makeList([])}
      entries={[]}
      mappa={makeMappaData()}
      stagione={STAGIONE}
      onNuovoTorneo={noop}
      onStoria={noop}
      {...rest}
      vista={vista}
      q={q}
      onVista={(v) => {
        onVista?.(v)
        setVista(v)
      }}
      onQuery={(x) => {
        onQuery?.(x)
        setQ(x)
      }}
    />
  )
}

function renderTornei(tornei = [makeTorneo()], over: HarnessProps = {}) {
  const onNuovoTorneo = vi.fn()
  const view = render(<TorneiConVista list={makeList(tornei)} onNuovoTorneo={onNuovoTorneo} {...over} />)
  return { ...view, onNuovoTorneo }
}

// Il testo visibile di un'opzione del segmented o delle chip: l'etichetta è
// disegnata due volte (inchiostro scuro e bianco, MOTION.md M8), il nome
// accessibile una sola.
const etichetta = (b: HTMLElement) => b.firstElementChild?.textContent ?? ''

beforeEach(() => {
  window.history.replaceState(null, '', '/tornei')
  __resetRouterForTests()
})

// ---------------------------------------------------------------- vista
describe('Tornei — selettore di vista Lista · Timeline · Mappa', () => {
  const conMappa = { mappa: makeMappaData({ pins: [makeMappaPin({ city: 'Cervia', tier: 'vinto' })] }) }

  it('parte dalla lista', () => {
    renderTornei([makeTorneo()], conMappa)
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('region', RIQUADRO_MAPPA)).not.toBeInTheDocument()
  })

  it('il selettore sono `button` veri con lo stato annunciato', () => {
    renderTornei([makeTorneo()], conMappa)
    const gruppo = screen.getByRole('group', { name: 'Come vedere i tornei' })
    expect(within(gruppo).getAllByRole('button').map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
  })

  it('la voce Mappa mostra quante città ci sono', () => {
    renderTornei([makeTorneo()], conMappa)
    expect(screen.getByRole('button', { name: 'Mappa · 1' })).toBeInTheDocument()
  })

  it('senza città la voce Mappa resta senza contatore', () => {
    renderTornei([makeTorneo()], { mappa: makeMappaData() })
    expect(screen.getByRole('button', { name: 'Mappa' })).toBeInTheDocument()
  })

  it('passando a Mappa compare il riquadro e sparisce la lista', async () => {
    const user = userEvent.setup()
    renderTornei([makeTorneo({ name: 'Rimini Open' })], conMappa)
    await user.click(screen.getByRole('button', { name: /^Mappa/ }))
    expect(screen.getByRole('region', RIQUADRO_MAPPA)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Rimini Open' })).not.toBeInTheDocument()
  })

  it('si torna alla lista', async () => {
    const user = userEvent.setup()
    renderTornei([makeTorneo({ name: 'Rimini Open' })], conMappa)
    await user.click(screen.getByRole('button', { name: /^Mappa/ }))
    await user.click(screen.getByRole('button', { name: 'Lista' }))
    expect(screen.getByRole('link', { name: 'Rimini Open' })).toBeInTheDocument()
  })

  it('il focus resta sul segmento dopo il cambio di vista (M4)', async () => {
    const user = userEvent.setup()
    renderTornei([makeTorneo()], conMappa)
    await user.click(screen.getByRole('button', { name: 'Timeline' }))
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveFocus()
  })

  it('dalla mappa si apre un torneo con un link vero', async () => {
    const user = userEvent.setup()
    const pin = makeMappaPin({ city: 'Cervia', tier: 'vinto' })
    renderTornei([makeTorneo()], { mappa: makeMappaData({ pins: [pin] }) })
    await user.click(screen.getByRole('button', { name: /^Mappa/ }))
    await user.click(screen.getByRole('button', { name: /Cervia/ }))
    const link = screen.getByRole('link', { name: pin.tornei[0].name })
    expect(link).toHaveAttribute('href', `/tornei/${pin.tornei[0].id}`)
    await user.click(link)
    expect(window.location.pathname).toBe(`/tornei/${pin.tornei[0].id}`)
  })

  it('senza tornei il selettore non compare: non c\'è niente da guardare', () => {
    renderTornei([], conMappa)
    expect(screen.queryByRole('group', { name: 'Come vedere i tornei' })).not.toBeInTheDocument()
  })

  // ---- vista controllata dall'URL -----------------------------------------
  // Aprire un torneo dalla mappa porta sul dettaglio, che smonta questa
  // schermata: tornando indietro si deve ritrovare la mappa. Questi due test
  // tengono fermo il contratto che lo permette.
  it('montata su "mappa" apre già sulla mappa (è così che si torna dal dettaglio)', () => {
    renderTornei([makeTorneo({ name: 'Rimini Open' })], { ...conMappa, vistaIniziale: 'mappa' })
    expect(screen.getByRole('region', RIQUADRO_MAPPA)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Mappa/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('link', { name: 'Rimini Open' })).not.toBeInTheDocument()
  })

  it('la vista non cambia da sé: il click la chiede e basta', async () => {
    const user = userEvent.setup()
    const onVista = vi.fn()
    render(
      <Tornei
        list={makeList([makeTorneo({ name: 'Rimini Open' })])}
        {...conMappa}
        entries={[]}
        stagione={STAGIONE}
        vista="lista"
        q=""
        onVista={onVista}
        onQuery={noop}
        onNuovoTorneo={noop}
        onStoria={noop}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^Mappa/ }))
    expect(onVista).toHaveBeenCalledExactlyOnceWith('mappa')
    // Nessuno stato interno: finché App non aggiorna la prop, resta la lista.
    expect(screen.getByRole('link', { name: 'Rimini Open' })).toBeInTheDocument()
  })

  it('in Timeline il diario arriva dal suo chunk e il sottotitolo conta le voci', async () => {
    const user = userEvent.setup()
    renderTornei([makeTorneo({ id: 'e1', name: 'Rimini Open' })], {
      entries: [makeDiaryEntry({ id: 'e1', title: 'Rimini Open' })],
    })
    // Il chunk della Timeline si risolve dentro `act`: è un import, non un'attesa.
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Timeline' }))
      await import('./Timeline')
    })
    expect(await screen.findByRole('link', { name: 'Rimini Open' })).toHaveAttribute('href', '/tornei/e1')
    expect(screen.getByRole('status')).toHaveTextContent('1 torneo nel diario')
  })
})

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

// I tornei in una griglia: i nomi dei link delle card, nell'ordine del DOM.
const cardNames = (root: HTMLElement) => within(root).getAllByRole('link').map((a) => a.textContent)

describe('Tornei — con l\'orologio fermo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`))
  })
  afterEach(() => vi.useRealTimers())

  // -------------------------------------------------------------- empty state
  describe('Tornei — nessun torneo', () => {
    it('mostra l\'empty state e nessuna sezione, ricerca o filtro', () => {
      renderTornei([])
      expect(screen.getByRole('heading', { level: 2, name: 'Nessun torneo ancora.' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 2, name: /torne[oi]$/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('group', { name: /Filtra i tornei/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    })

    it('il pulsante dell\'empty state crea il primo torneo', async () => {
      const user = userEvent.setup()
      const { onNuovoTorneo } = renderTornei([])
      await user.click(screen.getByRole('button', { name: 'Crea il primo torneo' }))
      expect(onNuovoTorneo).toHaveBeenCalledTimes(1)
    })

    it('il link secondario porta all\'assistente', () => {
      renderTornei([])
      expect(screen.getByRole('link', { name: /Usa l'assistente/ })).toHaveAttribute('href', '/crea')
    })
  })

  // -------------------------------------------------------------- sezioni
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
        'Prossimi tornei 1 torneo',
        '2vs2 2 tornei',
        '3vs3 1 torneo',
      ])
    })

    it('il contatore usa il singolare con un solo torneo', () => {
      renderTornei(dati)
      expect(screen.getByRole('heading', { level: 2, name: /^3vs3/ })).toHaveTextContent('3vs3 1 torneo')
    })

    it('un torneo futuro compare tra gli imminenti e non nel gruppo del suo formato', () => {
      renderTornei(dati)
      expect(cardNames(gridUnder(/^Prossimi tornei/))).toEqual(['Riccione Cup'])
      expect(sectionTitles().some((t) => t.startsWith('4vs4'))).toBe(false)
    })

    it('un torneo con la data di oggi è imminente, non passato', () => {
      renderTornei([makeTorneo({ name: 'Oggi Cup', date: TODAY, format: '2vs2' })])
      expect(cardNames(gridUnder(/^Prossimi tornei/))).toEqual(['Oggi Cup'])
    })

    it('senza tornei futuri non renderizza l\'intestazione "Prossimi tornei"', () => {
      renderTornei(dati.filter((t) => t.date < TODAY))
      expect(screen.queryByRole('heading', { level: 2, name: /Prossimi tornei/ })).not.toBeInTheDocument()
      expect(sectionTitles()).toEqual(['2vs2 2 tornei', '3vs3 1 torneo'])
    })

    it('con soli tornei futuri mostra solo "Prossimi tornei"', () => {
      renderTornei([
        makeTorneo({ name: 'A', format: '2vs2', date: '2026-08-01' }),
        makeTorneo({ name: 'B', format: '3vs3', date: '2026-09-01' }),
      ])
      expect(sectionTitles()).toEqual(['Prossimi tornei 2 tornei'])
    })

    it('mostra l\'intestazione anche con un formato solo', () => {
      // Un layout che cambia forma al crescere dei dati è più straniante della
      // singola intestazione in più.
      renderTornei([makeTorneo({ name: 'Solo', format: '2vs2', date: '2026-01-01' })])
      expect(sectionTitles()).toEqual(['2vs2 1 torneo'])
    })

    it('ordina i formati come FORMATS anche se i dati arrivano al contrario', () => {
      renderTornei([
        makeTorneo({ name: 'Q', format: '4vs4', date: '2026-01-03' }),
        makeTorneo({ name: 'T', format: '3vs3', date: '2026-01-02' }),
        makeTorneo({ name: 'D', format: '2vs2', date: '2026-01-01' }),
      ])
      expect(sectionTitles()).toEqual(['2vs2 1 torneo', '3vs3 1 torneo', '4vs4 1 torneo'])
    })

    it('preserva l\'ordine "agenda" dentro al gruppo (prima i più recenti)', () => {
      renderTornei(dati)
      expect(cardNames(gridUnder(/^2vs2/))).toEqual(['Rimini Open', 'Cesenatico'])
    })
  })

  // -------------------------------------------------------------- filtro
  describe('Tornei — filtro a chip', () => {
    const dati = [
      makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
      makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
      makeTorneo({ id: 'p2', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
    ]
    const chips = () =>
      within(screen.getByRole('group', { name: /Filtra i tornei/ }))
        .getAllByRole('button')
        .map(etichetta)

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
      expect(sectionTitles()).toEqual(['3vs3 1 torneo'])
      expect(screen.queryByRole('link', { name: 'Rimini Open' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ravenna Beach' })).toBeInTheDocument()
    })

    it('il filtro si applica anche alla sezione "Prossimi tornei"', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      await user.click(screen.getByRole('button', { name: '2vs2' }))
      // Il futuro è 4vs4: filtrando su 2vs2 la sezione imminenti sparisce.
      expect(sectionTitles()).toEqual(['2vs2 1 torneo'])

      await user.click(screen.getByRole('button', { name: '4vs4' }))
      expect(sectionTitles()).toEqual(['Prossimi tornei 1 torneo'])
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
      expect(sectionTitles()).toEqual(['Prossimi tornei 1 torneo', '2vs2 1 torneo', '3vs3 1 torneo'])
    })

    it('ricliccare la chip attiva non svuota la pagina', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      await user.click(screen.getByRole('button', { name: '2vs2' }))
      await user.click(screen.getByRole('button', { name: '2vs2' }))
      expect(sectionTitles()).toEqual(['2vs2 1 torneo'])
    })

    it('un filtro che sparisce dai dati ricade su "Tutti"', async () => {
      // Es. l'ultimo torneo 4vs4 viene cancellato altrove mentre il filtro è 4vs4.
      const user = userEvent.setup()
      const { rerender } = renderTornei(dati)
      await user.click(screen.getByRole('button', { name: '4vs4' }))
      expect(sectionTitles()).toEqual(['Prossimi tornei 1 torneo'])

      // Stesso componente, prop diverse: il filtro per formato è locale e deve
      // sopravvivere al rerender, o il test non proverebbe niente.
      rerender(<TorneiConVista list={makeList(dati.filter((t) => t.format !== '4vs4'))} />)
      expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
      expect(sectionTitles()).toEqual(['2vs2 1 torneo', '3vs3 1 torneo'])
    })
  })

  // -------------------------------------------------------------- card
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
      badgeBg: '#FFF1EA',
    })
    const card = (name: string) => screen.getByRole('link', { name }).closest('article') as HTMLElement

    it('mostra categoria, nome, meta, piazzamento e statistiche', () => {
      renderTornei([t])
      const c = card('Rimini Open')
      expect(within(c).getByText('Pro')).toBeInTheDocument()
      expect(within(c).getByRole('link', { name: 'Rimini Open' })).toBeInTheDocument()
      expect(within(c).getByText('1 giu 2026 · Rimini · 2vs2 · con Luca')).toBeInTheDocument()
      // Il trofeo del valore '1° 🏆' diventa un'icona; il nome è «Primo posto» (C15).
      expect(within(c).getByText('1°')).toBeInTheDocument()
      expect(within(c).getByText('Primo posto')).toBeInTheDocument()
      expect(within(c).getByText('4-1')).toBeInTheDocument()
      expect(within(c).getByText('80%')).toBeInTheDocument()
    })

    it('al focus il link si fa descrivere dalla riga meta', () => {
      renderTornei([t])
      expect(screen.getByRole('link', { name: 'Rimini Open' })).toHaveAccessibleDescription('1 giu 2026 · Rimini · 2vs2 · con Luca')
    })

    it('tiene il formato nella riga meta anche se sta già nell\'intestazione', () => {
      // `meta` è condivisa con altre schermate, dove non c'è raggruppamento:
      // toglierlo lo farebbe sparire dal resto dell'app.
      renderTornei([t])
      expect(screen.getByText(/· 2vs2 ·/)).toBeInTheDocument()
    })

    it('mostra il badge "Condiviso" solo sui tornei condivisi', () => {
      renderTornei([t, makeTorneo({ name: 'Condiviso Cup', shared: true, date: '2026-06-02' })])
      expect(within(card('Condiviso Cup')).getByText('Condiviso')).toBeInTheDocument()
      expect(within(card('Rimini Open')).queryByText('Condiviso')).not.toBeInTheDocument()
    })

    it('il link apre il torneo giusto', async () => {
      const user = userEvent.setup()
      renderTornei([t, makeTorneo({ id: 'xyz', name: 'Altro', date: '2026-05-01' })])
      const link = screen.getByRole('link', { name: 'Altro' })
      expect(link).toHaveAttribute('href', '/tornei/xyz')
      await user.click(link)
      expect(window.location.pathname).toBe('/tornei/xyz')
    })

    it('apre il torneo giusto anche dopo aver filtrato', async () => {
      const user = userEvent.setup()
      renderTornei([t, makeTorneo({ id: 'tre', name: 'Tre Cup', format: '3vs3', date: '2026-05-01' })])
      await user.click(screen.getByRole('button', { name: '3vs3' }))
      await user.click(screen.getByRole('link', { name: 'Tre Cup' }))
      expect(window.location.pathname).toBe('/tornei/tre')
    })

    it('porta la traccia solo sulla card appena toccata', () => {
      renderTornei([t, makeTorneo({ id: 'xyz', name: 'Altro', date: '2026-05-01' })], { traccia: 'xyz' })
      expect(card('Altro').querySelector('.traccia')).not.toBeNull()
      expect(card('Rimini Open').querySelector('.traccia')).toBeNull()
    })
  })

  // -------------------------------------------------------------- tastiera / a11y
  describe('Tornei — tastiera e accessibilità', () => {
    const dati = [
      makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
      makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
      makeTorneo({ id: 'p2', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
    ]

    it('Invio sul link di una card apre il torneo', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      screen.getByRole('link', { name: 'Rimini Open' }).focus()
      await user.keyboard('{Enter}')
      expect(window.location.pathname).toBe('/tornei/p1')
    })

    it('Spazio sul link non apre (comportamento dei link veri), Invio sì', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      screen.getByRole('link', { name: 'Rimini Open' }).focus()
      await user.keyboard(' ')
      expect(window.location.pathname).toBe('/tornei')
    })

    it('gli altri tasti non aprono nulla', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      screen.getByRole('link', { name: 'Rimini Open' }).focus()
      await user.keyboard('{Escape}a{Tab}')
      expect(window.location.pathname).toBe('/tornei')
    })

    it('ogni card è una sola fermata di Tab', async () => {
      const user = userEvent.setup()
      renderTornei([makeTorneo({ name: 'Solo', date: '2026-01-01' })])
      const link = screen.getByRole('link', { name: 'Solo' })
      expect(within(link.closest('article')!).getAllByRole('link')).toHaveLength(1)
      link.focus()
      expect(link).toHaveFocus()
      await user.tab()
      expect(link).not.toHaveFocus()
    })

    it('si filtra da tastiera senza usare il mouse', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      screen.getByRole('button', { name: '3vs3' }).focus()
      await user.keyboard('{Enter}')
      expect(sectionTitles()).toEqual(['3vs3 1 torneo'])
    })

    it('l\'ordine di tabulazione è ricerca → vista → filtro → card, nell\'ordine visivo', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      const btn = (name: string) => screen.getByRole('button', { name })
      const link = (name: string) => screen.getByRole('link', { name })
      const attesi = [
        screen.getByRole('searchbox', { name: 'Cerca nei tornei' }),
        btn('Lista'), btn('Timeline'), btn('Mappa'),
        btn('Tutti'), btn('2vs2'), btn('3vs3'), btn('4vs4'),
        link('Riccione Cup'), link('Rimini Open'), link('Ravenna Beach'),
      ]
      for (const el of attesi) {
        await user.tab()
        expect(document.activeElement).toBe(el)
      }
    })

    it('«/» porta nel campo di ricerca', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      await user.keyboard('/')
      expect(screen.getByRole('searchbox', { name: 'Cerca nei tornei' })).toHaveFocus()
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

  // -------------------------------------------------------------- difetti (chiusi)
  // Erano la riproduzione eseguibile dei difetti #1, #2, #4 e #5 di
  // docs/QA-tornei-formati.md, scritti `.skip` sul comportamento atteso. Il
  // refactor li chiude: ora girano, e restano come regressione.
  describe('Tornei — difetti chiusi (docs/QA-tornei-formati.md)', () => {
    const dati = [
      makeTorneo({ id: 'f1', name: 'Riccione Cup', format: '4vs4', date: '2026-08-10' }),
      makeTorneo({ id: 'p1', name: 'Rimini Open', format: '2vs2', date: '2026-07-01' }),
      makeTorneo({ id: 'p2', name: 'Ravenna Beach', format: '3vs3', date: '2026-05-01' }),
    ]

    // Difetto #1 — il sottotitolo diceva "3 tornei" mentre in pagina ne restava
    // uno solo: l'intestazione contraddiceva ciò che si vede sotto.
    it('il sottotitolo si accorda con il filtro attivo', async () => {
      const user = userEvent.setup()
      renderTornei(dati)
      expect(screen.getByRole('status')).toHaveTextContent(/^3 tornei ·/)
      await user.click(screen.getByRole('button', { name: '3vs3' }))
      expect(screen.getByText(/^1 torneo ·/)).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('1 torneo · 0 podi')
    })

    it('il sottotitolo conta i podi delle card visibili', () => {
      renderTornei([...dati, makeTorneo({ name: 'Podio', badge: '2°', badgeBg: '#FFF1EA', date: '2026-04-01' })])
      expect(screen.getByRole('status')).toHaveTextContent('4 tornei · 1 podio')
    })

    // Difetto #2 — il filtro scartato restava nello stato: se quel formato
    // tornava nei dati, la pagina si rifiltrava da sola senza che nessuno
    // avesse cliccato.
    it('un filtro scartato non si riattiva da solo quando il formato ritorna', async () => {
      const user = userEvent.setup()
      const { rerender } = renderTornei(dati)
      const render4vs4 = (tornei: typeof dati) => rerender(<TorneiConVista list={makeList(tornei)} />)

      await user.click(screen.getByRole('button', { name: '4vs4' }))
      render4vs4(dati.filter((t) => t.format !== '4vs4')) // il 4vs4 sparisce → si ricade su Tutti
      render4vs4(dati) // il 4vs4 torna: deve restare "Tutti", non rifiltrare

      expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
      expect(sectionTitles()).toEqual(['Prossimi tornei 1 torneo', '2vs2 1 torneo', '3vs3 1 torneo'])
    })

    // Difetto #4 — le azioni erano `div` (ui.tsx `Button`): da tastiera non si
    // poteva creare un torneo. L'intestazione di Tornei non ha più «Nuovo
    // torneo» (la creazione sta nel ＋ e nella Sidebar, UX §14.1): il CTA da
    // provare è quello dell'empty state, che è un `<button>` vero.
    it('il CTA dell\'empty state è raggiungibile e attivabile da tastiera', async () => {
      const user = userEvent.setup()
      const { onNuovoTorneo } = renderTornei([])
      const crea = screen.getByRole('button', { name: 'Crea il primo torneo' })
      crea.focus()
      expect(crea).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(onNuovoTorneo).toHaveBeenCalledTimes(1)
    })

    it('con dei tornei l\'intestazione non ha più un «Nuovo torneo»', () => {
      renderTornei(dati)
      expect(screen.queryByRole('button', { name: /Nuovo torneo/ })).not.toBeInTheDocument()
    })

    // Difetto #5 — `role="button"` rendeva presentazionali i discendenti: con
    // uno screen reader la card annunciava solo "Apri il torneo X" e perdeva
    // categoria, piazzamento, data, città, record.
    it('la card espone anche il proprio contenuto, non solo l\'etichetta', () => {
      renderTornei([makeTorneo({ name: 'Rimini Open', category: 'Pro', badge: '1° 🏆', badgeBg: '#FFF1EA', date: '2026-01-01' })])
      const link = screen.getByRole('link', { name: 'Rimini Open' })
      const card = link.closest('article')!
      expect(within(card).getByText('Pro')).toBeVisible()
      expect(within(card).getByText('Primo posto')).toBeInTheDocument()
      expect(card.querySelector('[role="button"]')).toBeNull()
      expect(card.getAttribute('role')).not.toBe('button')
    })
  })

  // -------------------------------------------------------------- responsive
  // jsdom non fa layout: non si può misurare uno scroll orizzontale. Si
  // verifica il contratto che le primitive dichiarano (UX §14.1): la classe o
  // l'attributo, non lo stile calcolato.
  describe('Tornei — responsive', () => {
    it('la griglia dichiara colonne che non impongono una larghezza minima fissa', () => {
      // `data-layout="grid-auto"` = `auto-fill, minmax(min(100%, var(--card-min)), 1fr)`:
      // è ciò che impedisce alla colonna di superare il viewport.
      renderTornei([makeTorneo({ date: '2026-01-01' })])
      expect(gridUnder(/^2vs2/)).toHaveAttribute('data-layout', 'grid-auto')
    })

    it('le chip del filtro restano su una riga che scorre, non vanno a capo', () => {
      renderTornei([
        makeTorneo({ format: '2vs2', date: '2026-01-01' }),
        makeTorneo({ format: '3vs3', date: '2026-01-02' }),
      ])
      expect(screen.getByRole('group', { name: /Filtra i tornei/ })).toHaveAttribute('data-overflow', 'scroll')
    })

    it('il selettore di vista divide la riga in parti uguali', () => {
      // Lista, Timeline e Mappa sono VISTE, non filtri: si dividono la riga
      // dentro una guida piena, e la forma le distingue dalle chip sotto.
      renderTornei([makeTorneo()], { mappa: makeMappaData({ pins: [makeMappaPin({ city: 'Cervia', tier: 'vinto' })] }) })
      expect(screen.getByRole('group', { name: 'Come vedere i tornei' })).toHaveAttribute('data-fill', 'equal')
    })
  })
})

// ---------------------------------------------------------------- ricerca
describe('Tornei — ricerca su tutte le viste', () => {
  const entries = [
    makeDiaryEntry({ id: 'e1', title: 'Riccione Cup', search: { place: 'riccione' } }),
    makeDiaryEntry({ id: 'e2', title: 'Forlì Beach', search: { place: 'forli' } }),
  ]
  const tornei = [makeTorneo({ id: 'e1', name: 'Riccione Cup' }), makeTorneo({ id: 'e2', name: 'Forlì Beach' })]

  it('scrivendo, segmented e chip spariscono e compaiono i risultati', async () => {
    const user = userEvent.setup()
    renderTornei(tornei, { entries })
    await user.type(screen.getByRole('searchbox', { name: 'Cerca nei tornei' }), 'forli')
    expect(screen.queryByRole('group', { name: 'Come vedere i tornei' })).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Forlì Beach' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Riccione Cup' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 risultato per «forli»')
  })

  it('i risultati sono gli stessi dalla Mappa', async () => {
    const user = userEvent.setup()
    renderTornei(tornei, { entries, vistaIniziale: 'mappa' })
    await user.type(screen.getByRole('searchbox', { name: 'Cerca nei tornei' }), 'riccione')
    expect(await screen.findByRole('link', { name: 'Riccione Cup' })).toBeInTheDocument()
    expect(screen.queryByRole('region', RIQUADRO_MAPPA)).not.toBeInTheDocument()
  })

  it('svuotando il campo si torna alla vista di prima', async () => {
    const user = userEvent.setup()
    renderTornei(tornei, { entries })
    const box = screen.getByRole('searchbox', { name: 'Cerca nei tornei' })
    await user.type(box, 'forli')
    await user.clear(box)
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('il testo sale all\'URL dopo una pausa, in un colpo solo', async () => {
    const user = userEvent.setup()
    const onQuery = vi.fn()
    renderTornei(tornei, { entries, onQuery })
    await user.type(screen.getByRole('searchbox', { name: 'Cerca nei tornei' }), 'forli')
    await waitFor(() => expect(onQuery).toHaveBeenCalledWith('forli'))
    expect(onQuery).toHaveBeenCalledTimes(1)
  })

  it('una ricerca che arriva dall\'URL riempie il campo', async () => {
    renderTornei(tornei, { entries, qIniziale: 'riccione' })
    expect(screen.getByRole('searchbox', { name: 'Cerca nei tornei' })).toHaveValue('riccione')
    expect(await screen.findByRole('link', { name: 'Riccione Cup' })).toBeInTheDocument()
  })

  it('senza risultati lo dice e offre di cancellare la ricerca', async () => {
    const user = userEvent.setup()
    renderTornei(tornei, { entries })
    const box = screen.getByRole('searchbox', { name: 'Cerca nei tornei' })
    await user.type(box, 'pallanuoto')
    expect(screen.getByRole('heading', { level: 2, name: 'Nessun torneo contiene «pallanuoto».' })).toBeInTheDocument()
    await user.click(screen.getByText('Cancella la ricerca'))
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
  })
})
