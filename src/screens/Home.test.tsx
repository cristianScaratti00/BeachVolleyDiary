// ============================================================================
// Home (il redesign): il titolo-frase e l'avatar che porta al Profilo, i
// filtri del periodo e del compagno, Pallo con i suoi consigli (e le azioni
// di oggi), «Partite vinte» come porta per Statistiche, Wrapped, tornei vinti
// e serie record, gli ultimi tornei. I dati passano dai selettori veri
// (`deriveHome`, `deriveDashboard`) su un diario di fabbrica, così i test
// leggono lo stesso view-model che legge l'app.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './Home'
import type { HomeProps } from '../app/contracts'
import type { Filtri } from '../app/useScreenData'
import { deriveHome } from '../app/selectors'
import { deriveDashboard } from '../lib/derive'
import { __resetRouterForTests } from '../app/router'
import { lossSets, makeData, makeMatch, makePartner, makeTournament } from '../test/factories'
import type { DiaryData, Placement } from '../lib/models'
import { expectNoA11yViolations } from '../test/axe'

const OGGI = '2026-07-22'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  __resetRouterForTests()
  window.sessionStorage.clear()
})

function filtri(data: DiaryData, over: Partial<Filtri> = {}): Filtri {
  return {
    fPartner: 'all',
    fYear: 'Sempre',
    setFPartner: vi.fn(),
    setFYear: vi.fn(),
    partnerOptions: data.partners.map((p) => ({ id: p.id, name: p.name })),
    yearOptions: ['2026', '2025', 'Sempre'],
    canFilter: true,
    ...over,
  }
}

function props(data: DiaryData, over: Partial<HomeProps> = {}): HomeProps {
  const s = deriveDashboard(data, 'all', 'Sempre').s
  const wrapped = over.wrapped ?? { visibile: false, titolo: 'Beach Wrapped' }
  return {
    ...deriveHome(data, { nome: 'Marta', today: OGGI, wrapped: wrapped.visibile }),
    nome: 'Marta',
    avatar: null,
    today: OGGI,
    numeri: s.played > 0 ? s : null,
    filtri: filtri(data),
    wrapped,
    onNuovoTorneo: vi.fn(),
    onAggiungiPartita: vi.fn(),
    onAggiornaPiazzamento: vi.fn(),
    onStoria: vi.fn(),
    ...over,
  }
}

function renderHome(data: DiaryData, over: Partial<HomeProps> = {}) {
  const p = props(data, over)
  return { ...render(<Home {...p} />), p }
}

/** Un diario pieno: la Sunset Series vinta con Luca (2 vinte e 1 persa), la Summer Cup di oggi. */
const pieno = makeData({
  partners: [makePartner({ id: 'p1', name: 'Luca' })],
  tournaments: [
    makeTournament({ id: 't1', name: 'Sunset Series Cervia', date: '2026-06-28', partnerId: 'p1', placement: '1° 🏆', city: 'Cervia' }),
    makeTournament({ id: 't2', name: 'Summer Cup Rimini', date: OGGI, placement: 'In corso', category: 'Amatoriale' }),
  ],
  matches: [
    makeMatch({ tournamentId: 't1', partnerId: 'p1' }),
    makeMatch({ tournamentId: 't1', partnerId: 'p1' }),
    makeMatch({ tournamentId: 't1', partnerId: 'p1', sets: lossSets() }),
  ],
})

describe('Home — intestazione', () => {
  it('la data, il titolo-frase come unico h1 e l\'avatar che porta al Profilo', () => {
    renderHome(makeData())
    expect(screen.getByText('Mercoledì 22 luglio')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Ciao, Marta.' })).toBeInTheDocument()
    const profilo = screen.getByRole('link', { name: 'Profilo' })
    expect(profilo).toHaveAttribute('href', '/profilo')
    expect(profilo).toHaveTextContent('M')
  })

  it('con la foto profilo l\'avatar è la foto', () => {
    renderHome(makeData(), { avatar: 'https://cdn.example/marta.jpg' })
    expect(screen.getByRole('link', { name: 'Profilo' }).querySelector('img')).toHaveAttribute('src', 'https://cdn.example/marta.jpg')
  })

  it('la frase viene dai dati', () => {
    renderHome(pieno, { frase: 'Stai vincendo più di prima.' })
    expect(screen.getByRole('heading', { level: 1, name: 'Stai vincendo più di prima.' })).toBeInTheDocument()
  })

  it('niente banner alpha e niente «Chi c\'è oggi»: stanno nel Profilo e in Compagni', () => {
    renderHome(pieno)
    expect(screen.queryByRole('region', { name: 'Avviso versione alpha' })).toBeNull()
    expect(screen.queryByText(/Chi c'è oggi|check-in/i)).toBeNull()
  })
})

describe('Home — diario vuoto', () => {
  it('Pallo invita a creare il primo torneo, con l\'assistente per chi vuole farsi guidare', async () => {
    const user = userEvent.setup()
    const { p } = renderHome(makeData())
    expect(screen.getByText('Registra il primo torneo: bastano il nome e la data, il resto lo aggiungi dopo.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crea il primo torneo' }))
    expect(p.onNuovoTorneo).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: "Usa l'assistente" })).toHaveAttribute('href', '/crea')
    // Un consiglio solo: Pallo non è un pulsante che non cambia niente.
    expect(screen.queryByRole('button', { name: 'Pallo: un altro consiglio' })).toBeNull()
    // Niente numeri, niente filtri: non c'è niente da filtrare.
    expect(screen.queryByRole('heading', { name: 'Partite vinte' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Periodo' })).toBeNull()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderHome(makeData())
    await expectNoA11yViolations(container)
  })
})

describe('Home — Pallo', () => {
  it('ogni tocco passa al consiglio successivo, nella live region', async () => {
    const user = userEvent.setup()
    renderHome(pieno, { wrapped: { visibile: true, titolo: 'Beach Wrapped' } })
    const nuvola = screen.getByText('Pallo').parentElement!
    const live = nuvola.querySelector('[aria-live="polite"]')!
    expect(live).toHaveTextContent('Oggi si gioca: «Summer Cup Rimini».')
    const pallo = screen.getByRole('button', { name: 'Pallo: un altro consiglio' })
    await user.click(pallo)
    expect(live).toHaveTextContent("Beach Wrapped è pronto. Ci diamo un'occhiata?")
    await user.click(pallo)
    expect(live).toHaveTextContent('Hai vinto «Sunset Series Cervia»: lo racconti in una storia?')
  })

  it('oggi giochi: «Aggiungi partita» per il torneo di oggi', async () => {
    const user = userEvent.setup()
    const { p } = renderHome(pieno)
    await user.click(screen.getByRole('button', { name: 'Aggiungi partita' }))
    expect(p.onAggiungiPartita).toHaveBeenCalledWith('t2')
  })

  it('«Com\'è andata a «X»?» porta ad aggiornare il piazzamento', async () => {
    const user = userEvent.setup()
    const data = makeData({ tournaments: [makeTournament({ id: 't2', name: 'Lido Cup', date: '2026-07-20', placement: 'In corso' })] })
    const { p } = renderHome(data)
    expect(screen.getByText("Com'è andata a «Lido Cup»?")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiorna il piazzamento' }))
    expect(p.onAggiornaPiazzamento).toHaveBeenCalledWith('t2')
  })

  it('la Storia dell\'ultimo torneo e il link a Beach Wrapped', async () => {
    const user = userEvent.setup()
    const data = makeData({
      tournaments: [makeTournament({ id: 't9', name: 'Riccione Beach', date: '2026-07-01', placement: '1° 🏆' })],
      matches: [makeMatch({ tournamentId: 't9' })],
    })
    const { p } = renderHome(data, { wrapped: { visibile: true, titolo: 'Beach Wrapped' } })
    const nuvola = screen.getByText('Pallo').parentElement!
    expect(within(nuvola).getByRole('link', { name: 'Apri Beach Wrapped' })).toHaveAttribute('href', '/wrapped')
    await user.click(screen.getByRole('button', { name: 'Pallo: un altro consiglio' }))
    await user.click(within(nuvola).getByRole('button', { name: 'Storia Instagram' }))
    expect(p.onStoria).toHaveBeenCalledWith('t9')
  })

  /** L'ultimo torneo del diario: prima le vinte, poi le perse (in quest'ordine, per la serie). */
  const ultimo = (placement: Placement, vinte: number, perse = 0) =>
    makeData({
      tournaments: [makeTournament({ id: 't9', name: 'Riccione Beach', date: '2026-07-01', placement })],
      matches: [
        ...Array.from({ length: vinte }, () => makeMatch({ tournamentId: 't9' })),
        ...Array.from({ length: perse }, () => makeMatch({ tournamentId: 't9', sets: lossSets() })),
      ],
    })

  it.each([
    ['oggi si gioca: saluta', pieno, 'saluta'],
    ['un 1° posto recente: festa', ultimo('1° 🏆', 1), 'festa'],
    ['fuori dal podio, eliminati da una sconfitta: triste', ultimo('Gironi', 1, 1), 'triste'],
    ['la serie in corso è il record: occhiali da sole', ultimo('2°', 3), 'cool'],
    ['il record da battere: occhi a cuore', ultimo('3°', 3, 1), 'cuori'],
  ] as const)('la faccia segue il consiglio — %s', (_, data, umore) => {
    const { container } = renderHome(data)
    expect(container.querySelector('svg.pallo')).toHaveAttribute('data-umore', umore)
  })

  describe('il tocco', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    // `fireEvent`: con l'orologio finto userEvent aspetterebbe un tempo che
    // non passa. Qui conta il click, non come ci si arriva.
    it('Pallo salta con una faccia allegra, poi prende quella del consiglio nuovo', () => {
      const { container } = renderHome(pieno, { wrapped: { visibile: true, titolo: 'Beach Wrapped' } })
      const svg = container.querySelector('svg.pallo')!
      expect(svg).toHaveAttribute('data-umore', 'saluta')
      fireEvent.click(screen.getByRole('button', { name: 'Pallo: un altro consiglio' }))
      expect(svg).toHaveAttribute('data-tocco')
      expect(['esulta', 'contento', 'occhiolino', 'cuori', 'festa']).toContain(svg.getAttribute('data-umore'))
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      // «Beach Wrapped è pronto. Ci diamo un'occhiata?»: l'occhiolino.
      expect(svg).not.toHaveAttribute('data-tocco')
      expect(svg).toHaveAttribute('data-umore', 'occhiolino')
    })

    it('cinque tocchi di fila sono la sorpresa (e ognuno passa al consiglio dopo)', () => {
      const { container } = renderHome(pieno, { wrapped: { visibile: true, titolo: 'Beach Wrapped' } })
      const pallo = screen.getByRole('button', { name: 'Pallo: un altro consiglio' })
      for (let k = 0; k < 5; k++) fireEvent.click(pallo)
      expect(container.querySelector('svg.pallo')).toHaveAttribute('data-sorpresa', 'palleggio')
      // 5 tocchi su 3 consigli: il terzo, la Storia.
      expect(screen.getByText('Hai vinto «Sunset Series Cervia»: lo racconti in una storia?')).toBeInTheDocument()
    })

    it('il tocco lungo è solo la sorpresa: il consiglio non cambia', () => {
      const { container } = renderHome(pieno, { wrapped: { visibile: true, titolo: 'Beach Wrapped' } })
      const pallo = screen.getByRole('button', { name: 'Pallo: un altro consiglio' })
      fireEvent.pointerDown(pallo, { button: 0 })
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(container.querySelector('svg.pallo')).toHaveAttribute('data-sorpresa')
      fireEvent.pointerUp(pallo)
      fireEvent.click(pallo)
      expect(screen.getByText(/^Oggi si gioca: «Summer Cup Rimini»\./)).toBeInTheDocument()
    })
  })

  it('tornei senza partite: niente numeri, Pallo dice di aggiungere la prima', async () => {
    const user = userEvent.setup()
    const solo = makeData({ tournaments: [makeTournament({ id: 't5', date: '2026-07-01', placement: '3°' })] })
    const { p } = renderHome(solo)
    expect(screen.getByText('Aggiungi la prima partita: i tuoi numeri partono da lì.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Partite vinte' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Periodo' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Aggiungi partita' }))
    expect(p.onAggiungiPartita).toHaveBeenCalledWith('t5')
  })
})

describe('Home — i numeri', () => {
  it('«Partite vinte»: il win rate, lo scarto, vinte, perse e giocate; la card porta a Statistiche', () => {
    renderHome(pieno)
    const card = screen.getByRole('region', { name: 'Partite vinte' })
    expect(within(card).getByText('67')).toHaveClass('sr-only')
    expect(within(card).getByText('%')).toBeInTheDocument()
    expect(within(card).getByText('punti di scarto')).toBeInTheDocument()
    expect(card).toHaveTextContent('2 vinte')
    expect(card).toHaveTextContent('1 persa · 3 giocate')
    expect(within(card).getByRole('link', { name: 'Tutte le statistiche' })).toHaveAttribute('href', '/statistiche')
  })

  it('un periodo senza partite: la card resta, con la frase al posto degli zeri', () => {
    renderHome(pieno, { numeri: null })
    const card = screen.getByRole('region', { name: 'Partite vinte' })
    expect(card).toHaveTextContent('Nessuna partita in questo periodo.')
    expect(screen.queryByText('Serie record')).toBeNull()
  })

  it('tornei vinti (porta a Tornei) e serie record', () => {
    renderHome(pieno)
    const tornei = screen.getByRole('link', { name: 'Tornei vinti' })
    expect(tornei).toHaveAttribute('href', '/tornei')
    expect(tornei).toHaveAccessibleDescription('1 su 2 1 podio')
    expect(screen.getByText('Serie record')).toBeInTheDocument()
    expect(screen.getByText('vittorie di fila')).toBeInTheDocument()
  })

  it('Beach Wrapped compare solo quando è pronto', () => {
    const { rerender, p } = renderHome(pieno)
    expect(screen.queryByText('La tua stagione in storie')).toBeNull()
    rerender(<Home {...p} wrapped={{ visibile: true, titolo: 'Beach Wrapped 2026' }} />)
    expect(screen.getByText('La tua stagione in storie')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apri Beach Wrapped 2026' })).toHaveAttribute('href', '/wrapped')
  })
})

describe('Home — ultimi tornei', () => {
  it('le righe con la medaglia portano al dettaglio; «Tutti» alla lista', () => {
    renderHome(pieno)
    const sez = screen.getByRole('region', { name: 'Ultimi tornei' })
    const righe = within(sez).getAllByRole('listitem')
    expect(righe).toHaveLength(2)
    const sunset = within(righe[1]).getByRole('link')
    expect(sunset).toHaveAttribute('href', '/tornei/t1')
    expect(sunset).toHaveAccessibleName(/Primo posto.*Sunset Series Cervia.*28 giu · con Luca.*2 vinte e 1 persa/)
    expect(sunset.textContent).not.toContain('🏆')
    expect(within(sez).getByRole('link', { name: 'Tutti i tornei' })).toHaveAttribute('href', '/tornei')
  })
})

describe('Home — filtri', () => {
  function Harness({ data }: { data: DiaryData }) {
    const [fYear, setFYear] = useState('Sempre')
    const [fPartner, setFPartner] = useState('all')
    const s = deriveDashboard(data, fPartner, fYear).s
    return (
      <Home
        {...props(data)}
        numeri={s.played > 0 ? s : null}
        filtri={filtri(data, { fYear, setFYear, fPartner, setFPartner, yearOptions: ['2026', '2025', '2024', 'Sempre'] })}
      />
    )
  }

  it('il periodo: «Sempre» e le ultime due stagioni', async () => {
    const user = userEvent.setup()
    render(<Harness data={pieno} />)
    const periodo = screen.getByRole('group', { name: 'Periodo' })
    expect(within(periodo).getAllByRole('button').map((b) => b.textContent)).toEqual(['SempreSempre', '20262026', '20252025'])
    expect(within(periodo).getByRole('button', { name: 'Sempre' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(periodo).getByRole('button', { name: '2025' }))
    expect(within(periodo).getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')
    // Nel 2025 non c'è niente: la card lo dice, e lo dice una volta la live region.
    expect(screen.getByRole('region', { name: 'Partite vinte' })).toHaveTextContent('Nessuna partita in questo periodo.')
    expect(screen.getByRole('status')).toHaveTextContent('Numeri aggiornati: Stagione 2025')
  })

  it('«Compagni ⌄» è un select vero: filtra per compagno', async () => {
    const user = userEvent.setup()
    render(<Harness data={pieno} />)
    const compagni = screen.getByRole('combobox', { name: 'Compagni' })
    expect(compagni).toHaveValue('all')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    await user.selectOptions(compagni, 'p1')
    expect(compagni).toHaveValue('p1')
    expect(screen.getByRole('status')).toHaveTextContent('Numeri aggiornati: Sempre con Luca')
  })

  it('nessuna violazione axe con dati completi', async () => {
    const { container } = render(<Harness data={pieno} />)
    await expectNoA11yViolations(container)
  })
})
