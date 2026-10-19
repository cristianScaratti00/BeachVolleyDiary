// ============================================================================
// Le voci del Diario (Timeline.tsx, il redesign): intestazioni di mese, la
// colonna del giorno, la card-link con la medaglia, le miniature, la nota,
// la Storia, la paginazione. Si monta il componente da solo: la ricerca e la
// schermata hanno i loro test in Diario.test.tsx e Tornei.test.tsx.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Timeline from './Timeline'
import { __resetRouterForTests } from '../app/router'
import { makeDiaryEntry, makeDiaryMatchHit } from '../test/factories'
import { expectNoA11yViolations } from '../test/axe'
import type { DiaryEntry } from '../lib/derive'

function renderTimeline(entries: DiaryEntry[], over: { traccia?: string; rise?: boolean } = {}) {
  const onStoria = vi.fn()
  const view = render(
    <Timeline results={entries.map((entry) => ({ entry, hits: [] }))} onStoria={onStoria} {...over} />,
  )
  return { ...view, onStoria }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/diario')
  __resetRouterForTests()
})

const cardOf = (title: string) => screen.getByRole('link', { name: title }).closest('article') as HTMLElement
const vocedi = (title: string) => screen.getByRole('link', { name: title }).closest('li') as HTMLElement

const agosto = makeDiaryEntry({ id: 'a1', title: 'Summer Cup Rimini', day: '14', month: 'Ago', year: '2025', badge: '2°', badgeBg: '#FFF1EA' })
const luglio = makeDiaryEntry({ id: 'l1', title: 'Beach Open Jesolo', day: '19', month: 'Lug', year: '2025' })
const giugno1 = makeDiaryEntry({ id: 'g1', title: 'Sunset Series Cervia', day: '28', month: 'Giu', year: '2025', badge: '1° 🏆', badgeBg: '#FFF1EA', desc: 'Chiuso al 1° 🏆 a Cervia · 4 vittorie su 4 — 100% W' })
const giugno2 = makeDiaryEntry({ id: 'g2', title: 'Cesenatico Open', day: '05', month: 'Giu', year: '2025' })

// ---------------------------------------------------------------- mesi
describe('Timeline — mesi', () => {
  it('raggruppa le voci consecutive sotto il loro mese, scritto per intero', () => {
    renderTimeline([agosto, luglio, giugno1, giugno2])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Agosto 2025',
      'Luglio 2025',
      'Giugno 2025',
    ])
  })

  it('i mesi sono h2, i titoli delle voci h3: l\'ordine dei titoli tiene senza h2 nascosti', () => {
    renderTimeline([agosto, luglio])
    const h2 = screen.getByRole('heading', { level: 2, name: 'Agosto 2025' })
    const h3 = screen.getByRole('heading', { level: 3, name: 'Summer Cup Rimini' })
    expect(h2.compareDocumentPosition(h3) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('lo stesso mese di anni diversi non si fonde', () => {
    renderTimeline([giugno1, makeDiaryEntry({ title: 'Vecchio', day: '10', month: 'Giu', year: '2024' })])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Giugno 2025', 'Giugno 2024'])
  })
})

// ---------------------------------------------------------------- voce
describe('Timeline — la voce', () => {
  it('la colonna del giorno: il numero e il giorno della settimana', () => {
    renderTimeline([agosto])
    const giorno = vocedi('Summer Cup Rimini').querySelector('.timeline-day') as HTMLElement
    // 14 agosto 2025 è un giovedì.
    expect(within(giorno).getByText('14')).toBeInTheDocument()
    expect(within(giorno).getByText('gio')).toBeInTheDocument()
    // A voce la data intera, non «gio».
    expect(within(giorno).getByText('giovedì 14 agosto')).toHaveClass('sr-only')
  })

  it('il giorno con lo zero davanti si scrive senza', () => {
    renderTimeline([giugno2])
    expect(within(vocedi('Cesenatico Open')).getByText('5')).toBeInTheDocument()
  })

  it('il titolo è il link della card, esteso a tutta la card', () => {
    renderTimeline([agosto])
    const links = within(cardOf('Summer Cup Rimini')).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveClass('ui-card-link')
    expect(links[0]).toHaveAttribute('href', '/tornei/a1')
  })

  it('il recap descrive il link al focus, senza l\'emoji del trofeo (C15)', () => {
    renderTimeline([giugno1])
    expect(screen.getByRole('link', { name: 'Sunset Series Cervia' })).toHaveAccessibleDescription('Chiuso al 1° a Cervia · 4 vittorie su 4 — 100% W')
  })

  it('la medaglia a destra dice il piazzamento, a parole per lo screen reader', () => {
    renderTimeline([giugno1, agosto])
    expect(within(cardOf('Sunset Series Cervia')).getByText('Primo posto')).toBeInTheDocument()
    expect(within(cardOf('Summer Cup Rimini')).getByText('Secondo posto')).toBeInTheDocument()
    expect(cardOf('Summer Cup Rimini').querySelector('.ui-medal')).toHaveAttribute('data-size', 'sm')
  })

  it('il tabellone chiude la riga del recap', () => {
    renderTimeline([makeDiaryEntry({ title: 'Gold Cup', badge: '1° 🏆 · Gold', desc: 'Chiuso al 1° 🏆 a Rimini · 2 vittorie su 2 — 100% W' })])
    expect(screen.getByRole('link', { name: 'Gold Cup' })).toHaveAccessibleDescription('Chiuso al 1° a Rimini · 2 vittorie su 2 — 100% W · tabellone Gold')
  })

  it('porta la traccia solo sulla voce appena toccata', () => {
    renderTimeline([agosto, luglio], { traccia: 'l1' })
    expect(cardOf('Beach Open Jesolo').querySelector('.traccia')).not.toBeNull()
    expect(cardOf('Summer Cup Rimini').querySelector('.traccia')).toBeNull()
  })
})

// ---------------------------------------------------------------- foto
describe('Timeline — foto', () => {
  const conFoto = makeDiaryEntry({
    title: 'Foto Cup',
    photos: [
      { color: '#00B4D8', caption: 'Il muro', url: 'https://x.test/1.jpg' },
      { color: '#00B4D8', caption: 'La finale', url: 'https://x.test/2.jpg' },
      { color: '#FFD60A', caption: '', url: null },
    ],
    morePhotos: 2,
  })

  it('le miniature, e quante foto ci sono in tutto', () => {
    renderTimeline([conFoto])
    const card = cardOf('Foto Cup')
    expect(within(card).getByRole('img', { name: 'Il muro' })).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'La finale' })).toBeInTheDocument()
    expect(within(card).getByText('+2')).toBeInTheDocument()
    expect(within(card).getByText('5 foto')).toBeInTheDocument()
  })

  it('una foto senza immagine è un riquadro con il suo nome', () => {
    renderTimeline([conFoto])
    expect(screen.getByRole('img', { name: 'Foto non disponibile' })).toBeInTheDocument()
  })

  it('senza foto niente miniature né conteggio', () => {
    renderTimeline([luglio])
    expect(within(cardOf('Beach Open Jesolo')).queryByText(/foto/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- nota
describe('Timeline — la nota', () => {
  it('l\'ultima nota scritta su una partita sta in corsivo, fra virgolette', () => {
    renderTimeline([
      makeDiaryEntry({
        title: 'Note Cup',
        matches: [
          makeDiaryMatchHit({ note: 'Partenza lenta' }),
          makeDiaryMatchHit({ note: '' }),
          makeDiaryMatchHit({ note: 'Titolo vinto' }),
        ],
      }),
    ])
    expect(within(cardOf('Note Cup')).getByText('“Titolo vinto”')).toHaveClass('timeline-note')
  })

  it('senza note niente corsivo', () => {
    renderTimeline([luglio])
    expect(cardOf('Beach Open Jesolo').querySelector('.timeline-note')).toBeNull()
  })
})

// ---------------------------------------------------------------- storia
describe('Timeline — la Storia', () => {
  it('un pulsante di vetro con l\'icona, fratello del link: apre la Storia e non il torneo', async () => {
    const user = userEvent.setup()
    const { onStoria } = renderTimeline([agosto])
    const storia = within(cardOf('Summer Cup Rimini')).getByRole('button', { name: 'Storia Instagram di Summer Cup Rimini' })
    expect(storia).toHaveAttribute('data-variant', 'glass')
    expect(storia).toHaveTextContent('Storia')
    expect(storia.closest('a')).toBeNull()
    await user.click(storia)
    expect(onStoria).toHaveBeenCalledExactlyOnceWith('a1')
    expect(window.location.pathname).toBe('/diario')
  })
})

// ---------------------------------------------------------------- movimento
describe('Timeline — salita', () => {
  const tante = Array.from({ length: 20 }, (_, i) =>
    makeDiaryEntry({ id: `v${i}`, title: `Voce ${i}`, day: String(28 - i).padStart(2, '0'), month: 'Giu', year: '2025' }),
  )

  it('salgono sfalsate solo le prime: oltre la dodicesima posizione niente sfalsamento', () => {
    renderTimeline(tante)
    expect(vocedi('Voce 0')).toHaveClass('rise')
    expect(vocedi('Voce 0').style.getPropertyValue('--rise-i')).toBe('3')
    expect(vocedi('Voce 19')).not.toHaveClass('rise')
  })

  it('con `rise={false}` (i risultati di una ricerca) niente salita', () => {
    renderTimeline(tante.slice(0, 2), { rise: false })
    expect(vocedi('Voce 0')).not.toHaveClass('rise')
  })
})

// ---------------------------------------------------------------- paginazione
describe('Timeline — paginazione', () => {
  const molte = Array.from({ length: 65 }, (_, i) => makeDiaryEntry({ id: `p${i}`, title: `Torneo ${i}`, month: 'Giu', year: '2025' }))

  it('oltre 60 voci propone «Mostra altri», che porta il focus alla prima nuova', async () => {
    const user = userEvent.setup()
    renderTimeline(molte)
    expect(screen.queryByRole('link', { name: 'Torneo 60' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mostra altri 5' }))
    expect(screen.getByRole('link', { name: 'Torneo 60' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: /Mostra altri/ })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- a11y
describe('Timeline — accessibilità', () => {
  it('nessuna violazione axe', async () => {
    const { container } = renderTimeline([agosto, luglio, giugno1])
    await expectNoA11yViolations(container)
  })
})
