// ============================================================================
// Schermata "Mappa delle conquiste". È presentazionale — riceve un `MappaData`
// già completo e delle callback — quindi si verifica montandola con `vi.fn()` e
// dati di fabbrica, senza mockare Supabase.
//
// Il tema ricorrente dei test qui è che la mappa **non può parlare solo con il
// colore**: ogni cosa che il pin dice deve esistere anche in testo, dentro una
// lista raggiungibile da tastiera.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Mappa from './Mappa'
import { makeMappaData, makeMappaPin, makeMappaTorneoRow } from '../test/factories'
import type { MappaData } from '../lib/derive.mappa'
import { expectNoA11yViolations } from '../test/axe'

function renderMappa(m: Partial<MappaData> = {}) {
  const onOpenTorneo = vi.fn()
  const onNewTorneo = vi.fn()
  const view = render(
    <Mappa m={makeMappaData(m)} onOpenTorneo={onOpenTorneo} onNewTorneo={onNewTorneo} />,
  )
  return { ...view, onOpenTorneo, onNewTorneo }
}

const cervia = makeMappaPin({ city: 'Cervia', tier: 'vinto', best: '1° 🏆', count: 2 })
const rimini = makeMappaPin({ city: 'Rimini', tier: 'podio', best: '2°' })
const jesolo = makeMappaPin({ city: 'Jesolo', tier: 'giocato', best: 'Gironi' })

// ---------------------------------------------------------------- stato vuoto
describe('Mappa — stato vuoto', () => {
  it('senza città non disegna la mappa ma invita a crearne una', () => {
    renderMappa()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/Crea un torneo/)).toBeInTheDocument()
  })

  it('l’invito chiama onNewTorneo', async () => {
    const user = userEvent.setup()
    const { onNewTorneo } = renderMappa()
    await user.click(screen.getByText(/Crea un torneo/))
    expect(onNewTorneo).toHaveBeenCalledOnce()
  })

  it('con solo città sconosciute la mappa non è vuota', () => {
    renderMappa({
      sconosciute: [{ key: 'fooburgo', city: 'Fooburgo', count: 1, tornei: [makeMappaTorneoRow()] }],
    })
    expect(screen.getByText('Non ancora sulla mappa')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- l'SVG
describe('Mappa — il disegno', () => {
  it('l’SVG ha un nome accessibile che nomina il numero di città', () => {
    renderMappa({ pins: [jesolo, rimini, cervia] })
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label', expect.stringContaining('3 città'))
  })

  it('il gruppo dei pin è nascosto agli screen reader e non focalizzabile', () => {
    // I pin dentro un gruppo `aria-hidden` NON devono essere focalizzabili, o
    // scatta `aria-hidden-focus`. La tastiera passa dalla lista.
    const { container } = renderMappa({ pins: [cervia] })
    const gruppo = container.querySelector('g[aria-hidden="true"]')
    expect(gruppo).toBeTruthy()
    expect(gruppo!.querySelectorAll('[tabindex]')).toHaveLength(0)
  })

  it('l’SVG non è raggiungibile col tab', () => {
    const { container } = renderMappa({ pins: [cervia] })
    expect(container.querySelector('svg[role="img"]')).toHaveAttribute('focusable', 'false')
  })

  it('ogni pin ha il contorno navy che porta il contrasto', () => {
    // Requisito WCAG 1.4.11, non una rifinitura: i riempimenti arancio stanno
    // sotto 3:1 sul fondo terra, il contorno no.
    const { container } = renderMappa({ pins: [cervia, rimini, jesolo] })
    const pieni = [...container.querySelectorAll('circle')].filter(
      (c) => c.getAttribute('stroke') === '#1B2A4A',
    )
    expect(pieni.length).toBeGreaterThanOrEqual(3)
  })

  it('il pin "vinto" ha il punto interno, il pin "giocato" è vuoto', () => {
    const { container } = renderMappa({ pins: [cervia, jesolo] })
    const bianchi = [...container.querySelectorAll('circle')].filter(
      (c) => c.getAttribute('fill') === '#fff',
    )
    // Il timbro di Cervia + il riempimento vuoto di Jesolo.
    expect(bianchi.length).toBeGreaterThanOrEqual(2)
  })

  it('disegna il filo di richiamo solo per i pin spostati', () => {
    const spostato = makeMappaPin({ city: 'Riccione', displaced: true, x: 200, y: 140, ax: 175, ay: 122 })
    const { container } = renderMappa({ pins: [rimini, spostato] })
    expect(container.querySelectorAll('line')).toHaveLength(1)
    expect(screen.getByText(/il pin è scostato/i)).toBeInTheDocument()
  })

  it('senza pin spostati non spiega lo spostamento', () => {
    renderMappa({ pins: [rimini] })
    expect(screen.queryByText(/il pin è scostato/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- legenda
describe('Mappa — legenda', () => {
  it('ha sempre le tre voci, in testo, anche a zero', () => {
    renderMappa({ pins: [jesolo] })
    expect(screen.getByText('Vinto qui')).toBeInTheDocument()
    expect(screen.getByText('Podio')).toBeInTheDocument()
    expect(screen.getByText('Giocato')).toBeInTheDocument()
  })

  it('i glifi della legenda sono decorativi', () => {
    const { container } = renderMappa({ pins: [cervia] })
    const glifi = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(glifi.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------- lista
describe('Mappa — la lista è la fonte di verità', () => {
  it('ogni città è un button vero', () => {
    renderMappa({ pins: [jesolo, rimini, cervia] })
    expect(screen.getByRole('button', { name: /Cervia/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rimini/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jesolo/ })).toBeInTheDocument()
  })

  it('il risultato è scritto, non solo colorato', () => {
    renderMappa({ pins: [jesolo, cervia] })
    const riga = screen.getByRole('button', { name: /Cervia/ })
    expect(within(riga).getByText('1° 🏆')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Jesolo/ })).getByText('Gironi')).toBeInTheDocument()
  })

  it('elenca dal risultato migliore al peggiore', () => {
    // L'SVG riceve l'ordine opposto (l'oro sopra a tutti): la lista lo ribalta.
    renderMappa({ pins: [jesolo, rimini, cervia] })
    const nomi = screen.getAllByRole('button', { expanded: false }).map((b) => b.textContent)
    expect(nomi[0]).toContain('Cervia')
    expect(nomi[2]).toContain('Jesolo')
  })

  it('le righe partono chiuse e si aprono al click', async () => {
    const user = userEvent.setup()
    renderMappa({ pins: [cervia] })
    const riga = screen.getByRole('button', { name: /Cervia/ })
    expect(riga).toHaveAttribute('aria-expanded', 'false')
    await user.click(riga)
    expect(riga).toHaveAttribute('aria-expanded', 'true')
  })

  it('ricliccando si richiude', async () => {
    const user = userEvent.setup()
    renderMappa({ pins: [cervia] })
    const riga = screen.getByRole('button', { name: /Cervia/ })
    await user.click(riga)
    await user.click(riga)
    expect(riga).toHaveAttribute('aria-expanded', 'false')
  })

  it('aperta, elenca i tornei giocati lì', async () => {
    const user = userEvent.setup()
    const pin = makeMappaPin({
      city: 'Cervia',
      tier: 'vinto',
      count: 2,
      tornei: [
        makeMappaTorneoRow({ id: 'x1', name: 'Cervia Open' }),
        makeMappaTorneoRow({ id: 'x2', name: 'Beach Cup' }),
      ],
    })
    renderMappa({ pins: [pin] })
    await user.click(screen.getByRole('button', { name: /Cervia/ }))
    expect(screen.getByRole('button', { name: 'Apri il torneo Cervia Open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri il torneo Beach Cup' })).toBeInTheDocument()
  })

  it('cliccare un torneo chiama onOpenTorneo con il suo id', async () => {
    const user = userEvent.setup()
    const pin = makeMappaPin({
      city: 'Cervia',
      tornei: [makeMappaTorneoRow({ id: 'torneo-42', name: 'Cervia Open' })],
    })
    const { onOpenTorneo } = renderMappa({ pins: [pin] })
    await user.click(screen.getByRole('button', { name: /Cervia/ }))
    await user.click(screen.getByRole('button', { name: 'Apri il torneo Cervia Open' }))
    expect(onOpenTorneo).toHaveBeenCalledExactlyOnceWith('torneo-42')
  })

  it('una città fatta solo di tornei condivisi lo dice a parole', () => {
    renderMappa({ pins: [makeMappaPin({ city: 'Cervia', shared: true })] })
    expect(within(screen.getByRole('button', { name: /Cervia/ })).getByText('Condiviso')).toBeInTheDocument()
  })

  it('la riga porta i numeri della città', () => {
    renderMappa({ pins: [makeMappaPin({ city: 'Cervia', count: 3, best: '1° 🏆' })] })
    // Scoperto DENTRO la riga: lo stesso riepilogo sta anche nel <title> del
    // pin, che è il tooltip del mouse.
    const riga = screen.getByRole('button', { name: /Cervia/ })
    expect(within(riga).getByText(/3 tornei · miglior risultato/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- pin ↔ lista
describe('Mappa — pin e riga sono la stessa selezione', () => {
  it('cliccare il pin espande la riga della sua città', async () => {
    const user = userEvent.setup()
    const { container } = renderMappa({ pins: [cervia] })
    const hit = container.querySelector('g[aria-hidden="true"] circle[fill="transparent"]')
    expect(hit).toBeTruthy()
    await user.click(hit as Element)
    expect(screen.getByRole('button', { name: /Cervia/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('cliccare il pin non lancia in jsdom', async () => {
    // `scrollIntoView` non esiste in jsdom: senza la chiamata opzionale questo
    // test esplode invece di passare.
    const user = userEvent.setup()
    const { container } = renderMappa({ pins: [cervia, rimini] })
    const hits = container.querySelectorAll('g[aria-hidden="true"] circle[fill="transparent"]')
    await expect(user.click(hits[0] as Element)).resolves.toBeUndefined()
  })

  it('il pin selezionato prende un anello', async () => {
    const user = userEvent.setup()
    const { container } = renderMappa({ pins: [cervia] })
    const prima = container.querySelectorAll('circle[fill="none"]').length
    await user.click(container.querySelector('circle[fill="transparent"]') as Element)
    expect(container.querySelectorAll('circle[fill="none"]').length).toBe(prima + 1)
  })
})

// ---------------------------------------------------------------- filtro
describe('Mappa — filtro per risultato', () => {
  it('non compare se non separerebbe nulla', () => {
    renderMappa({ pins: [jesolo] })
    expect(screen.queryByRole('group', { name: /Filtra le città/ })).not.toBeInTheDocument()
  })

  it('compare con risultati misti e filtra', async () => {
    const user = userEvent.setup()
    renderMappa({ pins: [jesolo, rimini, cervia] })
    const gruppo = screen.getByRole('group', { name: /Filtra le città/ })
    await user.click(within(gruppo).getByRole('button', { name: /Vinto qui/ }))
    expect(screen.getByRole('button', { name: /Cervia/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Jesolo/ })).not.toBeInTheDocument()
  })

  it('si torna a "Tutte"', async () => {
    const user = userEvent.setup()
    renderMappa({ pins: [jesolo, rimini, cervia] })
    const gruppo = screen.getByRole('group', { name: /Filtra le città/ })
    await user.click(within(gruppo).getByRole('button', { name: /Vinto qui/ }))
    await user.click(within(gruppo).getByRole('button', { name: 'Tutte' }))
    expect(screen.getByRole('button', { name: /Jesolo/ })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- fuori mappa
describe('Mappa — quello che non diventa un pin', () => {
  it('mostra le città fuori dall’Italia senza toccare il riquadro', () => {
    renderMappa({
      pins: [rimini],
      fuoriItalia: [{ key: 'ibiza', city: 'Ibiza', count: 1, tornei: [makeMappaTorneoRow({ name: 'Ibiza Beach' })] }],
    })
    expect(screen.getByText("Fuori dall'Italia")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri il torneo Ibiza Beach' })).toBeInTheDocument()
  })

  it('mostra le città che il gazetteer non conosce', () => {
    renderMappa({
      pins: [rimini],
      sconosciute: [{ key: 'fooburgo', city: 'Fooburgo', count: 2, tornei: [makeMappaTorneoRow()] }],
    })
    expect(screen.getByText('Non ancora sulla mappa')).toBeInTheDocument()
    expect(screen.getByText('Fooburgo')).toBeInTheDocument()
  })

  it('conta i tornei senza città con garbo', () => {
    renderMappa({ pins: [rimini], senzaCitta: 3 })
    expect(screen.getByText(/3 tornei non hanno/)).toBeInTheDocument()
  })

  it('dice che i tornei in corso non sono sulla mappa', () => {
    renderMappa({ pins: [rimini], nonGiocati: 1 })
    expect(screen.getByText(/1 torneo è/)).toBeInTheDocument()
  })

  it('senza avanzi non mostra le note', () => {
    renderMappa({ pins: [rimini] })
    expect(screen.queryByText(/non hanno/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ancora in corso/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- a11y
describe('Mappa — accessibilità', () => {
  it('nessuna violazione axe: stato vuoto', async () => {
    const { container } = renderMappa()
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe: pin collassati', async () => {
    const { container } = renderMappa({
      pins: [jesolo, rimini, cervia],
      fuoriItalia: [{ key: 'ibiza', city: 'Ibiza', count: 1, tornei: [makeMappaTorneoRow()] }],
      sconosciute: [{ key: 'foo', city: 'Fooburgo', count: 1, tornei: [makeMappaTorneoRow()] }],
      senzaCitta: 2,
    })
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe: una città espansa', async () => {
    const user = userEvent.setup()
    const { container } = renderMappa({ pins: [jesolo, rimini, cervia] })
    await user.click(screen.getByRole('button', { name: /Cervia/ }))
    await expectNoA11yViolations(container)
  })
})
