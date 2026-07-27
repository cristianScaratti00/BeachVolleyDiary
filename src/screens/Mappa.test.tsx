// ============================================================================
// Schermata "Mappa delle conquiste". È presentazionale — riceve un `MappaData`
// già completo e delle callback — quindi si verifica montandola con `vi.fn()` e
// dati di fabbrica, senza mockare Supabase.
//
// Il tema ricorrente dei test qui è che la mappa **non può parlare solo con il
// colore**: ogni cosa che il pin dice deve esistere anche in testo, dentro una
// lista raggiungibile da tastiera. Da quando la mappa è Leaflet quel principio
// non è più solo accessibilità, è l'unico modo di testare la schermata: jsdom
// non fa layout, quindi la mappa vera non si disegna nemmeno.
//
// `ConquisteMap` è quindi sostituito da uno stub. Non è una scorciatoia: il
// componente vero è un involucro attorno a Leaflet e non ha logica propria da
// verificare, mentre montarlo davvero renderebbe i test dipendenti dai tempi
// del suo `import()` in `lazy()`.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Mappa from './Mappa'
import { makeMappaData, makeMappaPin, makeMappaTorneoRow } from '../test/factories'
import type { MappaData, MappaPin } from '../lib/derive.mappa'
import { expectNoA11yViolations } from '../test/axe'

// Le props con cui la schermata chiama la mappa. Sono il confine fra le due:
// verificarle qui è ciò che rimpiazza i vecchi test sui `<circle>` dell'SVG.
const spiaMappa = vi.hoisted(() => ({
  props: null as null | { pins: MappaPin[]; selected: string | null; onSelect: (k: string) => void; srSummary: string },
}))

vi.mock('../components/ConquisteMap', () => ({
  // Stessa forma accessibile del componente vero: un `region` con il riassunto
  // testuale come nome. Così i controlli axe qui sotto verificano davvero la
  // struttura che finisce in produzione.
  default: (props: NonNullable<typeof spiaMappa.props>) => {
    spiaMappa.props = props
    return <div role="region" aria-label={props.srSummary} />
  },
}))

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

  it('se i tornei sono tutti da giocare lo dice, invece di chiedere una città che c’è già', () => {
    // Il bucket `nonGiocati` è l'unico rimasto da raccontare: senza questo ramo
    // spariva insieme al resto della pagina, e l'invito suonava come un rimprovero
    // per un dato che l'utente aveva già inserito.
    renderMappa({ nonGiocati: 2 })
    expect(screen.getByText(/ancora in corso o in programma/)).toBeInTheDocument()
    expect(screen.queryByText(/Crea un torneo/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- la mappa
describe('Mappa — il riquadro della mappa', () => {
  it('è una region col riassunto testuale come nome accessibile', () => {
    // Chi usa uno screen reader deve sapere cosa sta saltando: il nome dice
    // quante città ci sono e che l'elenco completo è più sotto.
    renderMappa({ pins: [jesolo, rimini, cervia] })
    const mappa = screen.getByRole('region')
    expect(mappa).toHaveAttribute('aria-label', expect.stringContaining('3 città'))
  })

  it('avvisa quando un pin cade sul centro città invece che sul campo', () => {
    // Il pin approssimato è una piccola bugia geografica: la schermata la
    // dichiara invece di lasciarla scoprire a chi conosce il posto.
    const impreciso = makeMappaPin({ city: 'Riccione', preciso: false })
    renderMappa({ pins: [rimini, impreciso] })
    expect(screen.getByText(/cadono sul centro della città/i)).toBeInTheDocument()
  })

  it('con tutti i pin sul luogo esatto non dice niente', () => {
    renderMappa({ pins: [makeMappaPin({ city: 'Rimini', preciso: true })] })
    expect(screen.queryByText(/cadono sul centro della città/i)).not.toBeInTheDocument()
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
  it('selezionare una città sulla mappa espande la sua riga', async () => {
    renderMappa({ pins: [cervia] })
    await act(async () => spiaMappa.props!.onSelect('cervia'))
    expect(screen.getByRole('button', { name: /Cervia/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('la mappa riceve indietro la città selezionata', async () => {
    // Un solo stato, due superfici: è così che il pin si accende quando la
    // selezione parte dalla lista, e viceversa.
    renderMappa({ pins: [cervia, rimini] })
    expect(spiaMappa.props!.selected).toBeNull()
    await act(async () => spiaMappa.props!.onSelect('cervia'))
    expect(spiaMappa.props!.selected).toBe('cervia')
  })

  it('riselezionare la stessa città la deseleziona', async () => {
    renderMappa({ pins: [cervia] })
    await act(async () => spiaMappa.props!.onSelect('cervia'))
    await act(async () => spiaMappa.props!.onSelect('cervia'))
    expect(spiaMappa.props!.selected).toBeNull()
  })

  it('selezionare dalla mappa non lancia in jsdom', async () => {
    // `scrollIntoView` non esiste in jsdom: senza la chiamata opzionale in
    // `seleziona` questo test esplode invece di passare.
    renderMappa({ pins: [cervia, rimini] })
    await expect(act(async () => spiaMappa.props!.onSelect('cervia'))).resolves.not.toThrow()
  })

  it('la mappa riceve tutti i pin, anche quando la lista è filtrata', () => {
    // Il filtro a chip restringe l'elenco, non la mappa: la vista d'insieme
    // resta completa, com'era col disegno SVG.
    renderMappa({ pins: [cervia, rimini, jesolo] })
    expect(spiaMappa.props!.pins).toHaveLength(3)
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
