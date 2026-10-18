// ============================================================================
// Dettaglio torneo (UX §5 F5, §6.4): "non trovato" invece della lista, sola
// lettura sui condivisi, nessuna statistica a zero partite, foto e azioni
// raggiungibili da tastiera, il menu «⋯».
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TorneoDetail from './TorneoDetail'
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
    badge: '1° 🏆',
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
    back: { label: 'Tornei', onClick: vi.fn() },
    onAddPartita: vi.fn(),
    onOpenMatch: vi.fn(),
    onAddFoto: vi.fn(),
    onOpenFoto: vi.fn(),
    onDeleteFoto: vi.fn(),
    onStoria: vi.fn(),
    onMenu: vi.fn(),
    ...over,
  }
  return { ...render(<TorneoDetail {...props} />), props }
}

beforeEach(() => {
  window.history.replaceState(null, '', `/tornei/${ID}`)
  __resetRouterForTests()
  window.sessionStorage.clear()
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

describe('TorneoDetail — torneo proprio', () => {
  it('h1 col nome, piazzamento con il trofeo, storia del luogo', () => {
    renderDetail()
    expect(screen.getByRole('heading', { level: 1, name: 'Rimini Open' })).toBeInTheDocument()
    expect(screen.getByText('Primo posto')).toBeInTheDocument()
    expect(screen.getByText('3° torneo qui · 1 podio')).toBeInTheDocument()
  })

  it('[Aggiungi partita] è un button vero, il principale della schermata', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    const b = screen.getAllByRole('button', { name: 'Aggiungi partita' })[0]
    expect(b).toHaveAttribute('data-variant', 'filled')
    b.focus()
    await user.keyboard('{Enter}')
    expect(props.onAddPartita).toHaveBeenCalledTimes(1)
  })

  it('il menu «⋯» passa il pulsante come àncora', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    const menu = screen.getByRole('button', { name: 'Altre azioni' })
    expect(menu).toHaveAttribute('aria-haspopup', 'menu')
    await user.click(menu)
    expect(props.onMenu).toHaveBeenCalledWith(menu)
  })

  it('le sei statistiche, e le partite come righe <button>', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail()
    const stats = screen.getByRole('group', { name: 'Statistiche del torneo' })
    // Vittorie e set vinti sono entrambi al 75%: il valore sta nel testo per
    // gli screen reader, le strisce del tabellone sono aria-hidden.
    expect(within(stats).getAllByText('75%', { selector: '.sr-only' })).toHaveLength(2)
    expect(within(stats).getByText('+14', { selector: '.sr-only' })).toBeInTheDocument()
    expect(within(stats).getByText('Differenziale')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Finale · vs Bianchi \/ Verdi/ }))
    expect(props.onOpenMatch).toHaveBeenCalledWith('m1')
  })

  it('la sezione Luogo ha la mappa e il link esterno', () => {
    renderDetail()
    expect(screen.getByRole('heading', { level: 2, name: 'Bagno 26' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Apri la mappa/ })).toHaveAttribute('target', '_blank')
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

  it('nessuna violazione axe', async () => {
    const { container } = renderDetail()
    await expectNoA11yViolations(container)
  })
})

describe('TorneoDetail — stati', () => {
  it('a zero partite le statistiche lasciano il posto allo stato vuoto', () => {
    renderDetail({ t: makeDetail({ noMatches: true, matches: [], played: 0 }) })
    expect(screen.queryByRole('group', { name: 'Statistiche del torneo' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nessuna partita ancora.' })).toBeInTheDocument()
  })

  it('senza foto: «Nessuna foto per questo torneo.» con [Aggiungi foto]', async () => {
    const user = userEvent.setup()
    const { props } = renderDetail({ t: makeDetail({ hasPhotos: false, photos: [] }) })
    expect(screen.getByRole('heading', { name: 'Nessuna foto per questo torneo.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiungi foto' }))
    expect(props.onAddFoto).toHaveBeenCalledTimes(1)
  })

  it('senza coordinate non c\'è la sezione Luogo', () => {
    renderDetail({ t: makeDetail({ venueLat: null, venueLng: null, venueMapUrl: null }) })
    expect(screen.queryByRole('link', { name: /Apri la mappa/ })).not.toBeInTheDocument()
  })
})

describe('TorneoDetail — torneo condiviso (sola lettura)', () => {
  const shared = () => makeDetail({ shared: true })

  it('etichetta «Condiviso con te · sola lettura», nessun pulsante di modifica', () => {
    renderDetail({ t: shared() })
    expect(screen.getByText('Condiviso con te · sola lettura')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aggiungi partita' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Elimina foto/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aggiungi foto/ })).not.toBeInTheDocument()
  })

  it('le righe partita non sono interattive', () => {
    renderDetail({ t: shared() })
    expect(screen.queryByRole('button', { name: /Finale · vs/ })).not.toBeInTheDocument()
    expect(screen.getByText('Vinta')).toBeInTheDocument()
  })

  it('il menu «⋯» c\'è ancora (Storia permessa, Q4)', () => {
    renderDetail({ t: shared() })
    expect(screen.getByRole('button', { name: 'Altre azioni' })).toBeInTheDocument()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderDetail({ t: shared() })
    await expectNoA11yViolations(container)
  })
})
