// ============================================================================
// Dettaglio torneo (UX §5 F5, §6.4; il redesign, versione D): "non trovato"
// invece della lista, la capsula di vetro in cima (Storia, Modifica), il
// titolo con medaglia, riga piccola e data lunga, il tabellone, la card del
// luogo che apre la mappa, foto e azioni raggiungibili da tastiera, la barra
// in fondo, la sola lettura sui condivisi.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TorneoDetail, { dataLunga } from './TorneoDetail'
import type { TorneoDetailData } from '../lib/derive'
import type { TorneoDetailProps } from '../app/contracts'
import { expectNoA11yViolations } from '../test/axe'
import { __resetRouterForTests } from '../app/router'

// La mappa vera è Leaflet: in jsdom non si disegna. Qui interessa la cornice.
vi.mock('../components/VenueMap', () => ({
  default: ({ label }: { label: string }) => <div role="region" aria-label={`Mappa di ${label}`} />,
}))

const ID = '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b'

function makeDetail(over: Partial<TorneoDetailData> = {}): TorneoDetailData {
  return {
    id: ID,
    name: 'Rimini Open',
    category: 'Pro',
    dot: '#FF6B35',
    badge: '1° 🏆 · Gold',
    badgeBg: '#FFF1EA',
    badgeColor: '#C4501E',
    meta: '12 Lug · Bagno 26 · Sabbia outdoor · con Giulia',
    record: '3-1',
    winPct: 75,
    played: 4,
    setStr: '6-2',
    setPct: 75,
    diffStr: '+14',
    noMatches: false,
    hasPhotos: true,
    shared: false,
    photos: [
      { id: 'f1', color: '#FF6B35', caption: 'Finale', url: 'https://example.com/a.jpg' },
      { id: 'f2', color: '#00B4D8', caption: '', url: null },
      { id: 'f3', color: '#FFD23F', caption: '', url: 'https://example.com/b.jpg' },
    ],
    matches: [
      { id: 'm1', phase: 'Finale', opponents: 'Bianchi / Verdi', partnerName: 'Giulia', esitoColor: '#FF6B35', esitoShort: 'V', setChips: [{ txt: '21-17', bg: '#FFF1EA', color: '#C4501E' }], hasNote: false, note: '' },
    ],
    venueName: 'Bagno 26',
    venueCity: 'Rimini',
    venueLat: 44.06,
    venueLng: 12.58,
    venueMapUrl: 'https://www.openstreetmap.org/?mlat=44.06&mlon=12.58',
    venueHistory: '3° torneo qui · 1 podio',
    ...over,
  }
}

function renderDetail(over: Partial<TorneoDetailProps> = {}) {
  const props: TorneoDetailProps = {
    t: makeDetail(),
    scheda: { date: '2025-07-12', format: '2vs2', surface: 'Sabbia outdoor' },
    back: { label: 'Tornei', onClick: vi.fn() },
    onAddPartita: vi.fn(),
    onOpenMatch: vi.fn(),
    onAddFoto: vi.fn(),
    onOpenFoto: vi.fn(),
    onDeleteFoto: vi.fn(),
    onStoria: vi.fn(),
    onModifica: vi.fn(),
    ...over,
  }
  return { ...render(<TorneoDetail {...props} />), props }
}

beforeEach(() => {
  window.history.replaceState(null, '', `/tornei/${ID}`)
  __resetRouterForTests()
  window.sessionStorage.clear()
})

describe('dataLunga', () => {
  it('scrive il giorno della settimana e il mese per intero, con la maiuscola', () => {
    expect(dataLunga('2025-06-28')).toBe('Sabato 28 giugno 2025')
    expect(dataLunga('2026-01-05')).toBe('Lunedì 5 gennaio 2026')
  })

  it('una data che non si legge dà la stringa vuota', () => {
    expect(dataLunga('')).toBe('')
    expect(dataLunga('2025-13-01')).toBe('')
  })
})

describe('TorneoDetail — non trovato (C9)', () => {
  it('mostra lo stato "non trovato" e un link ai tornei, non la lista', async () => {
    const { container } = renderDetail({ t: null })
    expect(screen.getByRole('heading', { level: 1, name: 'Torneo non trovato' })).toBeInTheDocument()
    expect(screen.getByText(/Potrebbe essere stato eliminato/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai ai tornei' })).toHaveAttribute('href', '/tornei')
    await expectNoA11yViolations(container)
  })
})

describe('TorneoDetail — intestazione', () => {
  it('h1 col nome, la medaglia del piazzamento, la riga piccola e la data lunga', () => {
    renderDetail()
    expect(screen.getByRole('heading', { level: 1, name: 'Rimini Open' })).toBeInTheDocument()
    expect(screen.getByText('Primo posto')).toBeInTheDocument()
    expect(screen.getByText('Pro · 2vs2 · Sabbia outdoor')).toBeInTheDocument()
    expect(screen.getByText('Sabato 12 luglio 2025 · con Giulia')).toBeInTheDocument()
  })

  it('senza la scheda restano la categoria e la riga `meta` della derivata', () => {
    renderDetail({ scheda: null })
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('12 Lug · Bagno 26 · Sabbia outdoor · con Giulia')).toBeInTheDocument()
  })

  it('il tabellone del piazzamento è una pastiglia sotto il titolo', () => {
    renderDetail()
    expect(screen.getByText('Tabellone Gold')).toBeInTheDocument()
  })

  it('la capsula di vetro: Storia e Modifica sono pulsanti con nome; il menu «⋯» non c\'è più', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    expect(screen.queryByRole('button', { name: 'Altre azioni' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Condividi come storia Instagram' }))
    expect(props.onStoria).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Modifica torneo' }))
    expect(props.onModifica).toHaveBeenCalledTimes(1)
  })

  it('‹ è il cerchio di vetro col nome della schermata precedente', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    await user.click(screen.getByRole('button', { name: 'Torna a Tornei' }))
    expect(props.back.onClick).toHaveBeenCalledTimes(1)
  })
})

describe('TorneoDetail — torneo proprio', () => {
  it('[Aggiungi partita] è un button vero nella barra in fondo, il principale della schermata', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    const b = screen.getByRole('button', { name: 'Aggiungi partita' })
    expect(b).toHaveAttribute('data-variant', 'filled')
    b.focus()
    await user.keyboard('{Enter}')
    expect(props.onAddPartita).toHaveBeenCalledTimes(1)
  })

  it('«Storia» nella barra in fondo apre la Storia', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    await user.click(screen.getByRole('button', { name: 'Storia Instagram' }))
    expect(props.onStoria).toHaveBeenCalledTimes(1)
  })

  it('le sei statistiche nell\'ordine del redesign, e le partite come righe <button>', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    const stats = screen.getByRole('group', { name: 'Statistiche del torneo' })
    // Vittorie e set vinti sono entrambi al 75%: il valore sta nel testo per
    // gli screen reader, le strisce del tabellone sono aria-hidden.
    expect(within(stats).getAllByText('75%', { selector: '.sr-only' })).toHaveLength(2)
    expect(within(stats).getByText('+14', { selector: '.sr-only' })).toBeInTheDocument()
    expect(within(stats).getByText('3–1')).toBeInTheDocument()
    const etichette = [...stats.querySelectorAll('.ui-stat-label')].map((e) => e.textContent)
    expect(etichette).toEqual(['record', 'vittorie', 'differenziale', 'partite', 'set', 'set vinti'])
    await user.click(screen.getByRole('button', { name: /Finale · vs Bianchi \/ Verdi/ }))
    expect(props.onOpenMatch).toHaveBeenCalledWith('m1')
  })

  it('le foto si aprono con un button; l\'indice conta solo quelle apribili', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    await user.click(screen.getByRole('button', { name: 'Foto 3' }))
    expect(props.onOpenFoto).toHaveBeenCalledWith(1)
    expect(screen.getByRole('img', { name: 'Foto non disponibile' })).toBeInTheDocument()
  })

  it('ogni foto ha il suo [Elimina foto]', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    await user.click(screen.getByRole('button', { name: 'Elimina foto: Finale' }))
    expect(props.onDeleteFoto).toHaveBeenCalledWith('f1')
    expect(screen.getAllByRole('button', { name: /^Elimina foto/ })).toHaveLength(3)
  })

  it('la tessera di vetro «Aggiungi» apre l\'aggiunta delle foto', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    const add = screen.getByRole('button', { name: 'Aggiungi foto' })
    expect(add).toHaveAttribute('data-variant', 'glass')
    await user.click(add)
    expect(props.onAddFoto).toHaveBeenCalledTimes(1)
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderDetail()
    await expectNoA11yViolations(container)
  })
})

describe('TorneoDetail — il luogo', () => {
  it('la card dice dove e quante volte: città e storia del luogo', () => {
    renderDetail()
    expect(screen.getByText('Bagno 26')).toBeInTheDocument()
    expect(screen.getByText('Rimini · 3° torneo qui · 1 podio')).toBeInTheDocument()
  })

  it('la prima volta lo dice a parole', () => {
    renderDetail({ t: makeDetail({ venueName: 'Cervia', venueCity: 'Cervia', venueHistory: '1° torneo qui' }) })
    expect(screen.getByText('La prima volta che giochi qui')).toBeInTheDocument()
  })

  it('«Mappa» apre la mappa e il link esterno; di nuovo, la chiude', async () => {
    const user = userEvent.setup()
    renderDetail()
    const card = screen.getByRole('button', { name: /Bagno 26.*Mappa/ })
    expect(card).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Mappa di Bagno 26' })).not.toBeInTheDocument()
    await user.click(card)
    expect(card).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByRole('region', { name: 'Mappa di Bagno 26' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Apri la mappa/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(card).toHaveAttribute('aria-controls', link.closest('[id]')?.id)
    await user.click(card)
    expect(card).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Mappa di Bagno 26' })).not.toBeInTheDocument())
  })

  it('senza coordinate la card non si apre: nessuna «Mappa»', () => {
    renderDetail({ t: makeDetail({ venueLat: null, venueLng: null, venueMapUrl: null }) })
    expect(screen.getByText('Bagno 26')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mappa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Apri la mappa/ })).not.toBeInTheDocument()
  })

  it('un torneo senza luogo non ha la card', () => {
    renderDetail({ t: makeDetail({ venueName: '', venueCity: '', venueLat: null, venueLng: null, venueMapUrl: null, venueHistory: null }) })
    expect(screen.queryByText(/torneo qui/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mappa/ })).not.toBeInTheDocument()
  })
})

describe('TorneoDetail — stati', () => {
  it('a zero partite le statistiche lasciano il posto allo stato vuoto, sotto «Partite»', () => {
    renderDetail({ t: makeDetail({ noMatches: true, matches: [], played: 0 }) })
    expect(screen.queryByRole('group', { name: 'Statistiche del torneo' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Partite' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Nessuna partita ancora.' })).toBeInTheDocument()
    // Il CTA resta uno solo: quello della barra in fondo.
    expect(screen.getAllByRole('button', { name: 'Aggiungi partita' })).toHaveLength(1)
  })

  it('senza foto, sul proprio, resta la tessera «Aggiungi»', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail({ t: makeDetail({ hasPhotos: false, photos: [] }) })
    await user.click(screen.getByRole('button', { name: 'Aggiungi foto' }))
    expect(props.onAddFoto).toHaveBeenCalledTimes(1)
  })
})

describe('TorneoDetail — torneo condiviso (sola lettura)', () => {
  const shared = (over: Partial<TorneoDetailData> = {}) => makeDetail({ shared: true, ...over })

  it('etichetta «Condiviso con te · sola lettura», nessun pulsante di modifica', () => {
    renderDetail({ t: shared() })
    expect(screen.getByText('Condiviso con te · sola lettura')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aggiungi partita' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica torneo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Elimina foto/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aggiungi foto/ })).not.toBeInTheDocument()
  })

  it('la Storia c\'è ancora, in cima e in fondo (Q4)', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail({ t: shared() })
    await user.click(screen.getByRole('button', { name: 'Condividi come storia Instagram' }))
    await user.click(screen.getByRole('button', { name: 'Storia Instagram' }))
    expect(props.onStoria).toHaveBeenCalledTimes(2)
  })

  it('le righe partita non sono interattive', () => {
    renderDetail({ t: shared() })
    expect(screen.queryByRole('button', { name: /Finale · vs/ })).not.toBeInTheDocument()
    expect(screen.getByText('Vinta')).toBeInTheDocument()
  })

  it('senza foto lo dice (e non offre di aggiungerne)', () => {
    renderDetail({ t: shared({ hasPhotos: false, photos: [] }) })
    expect(screen.getByText('Nessuna foto per questo torneo.')).toBeInTheDocument()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderDetail({ t: shared() })
    await expectNoA11yViolations(container)
  })
})
