// ============================================================================
// Schermata "Chi c'è oggi": form di check-in, stato "sei qui", stanza reciproca
// e collegamento come compagno. La schermata è presentazionale — riceve `own`,
// `room` e callback e non parla con la rete — quindi si verifica montandola con
// `vi.fn()` e dati di fabbrica, senza mockare Supabase.
//
// Dal refactor: «Termina check-in» (non più «Esci», C19) chiede conferma, e la
// conferma la apre la shell (`onTerminaCheckIn`); il pulsante di check-in senza
// città è `aria-disabled` e porta al campo che manca (MOTION.md M15).
// Dal redesign (versione D): il pulsante dice «Sono in spiaggia», la stanza è
// una card con una persona per riga e «Aggiungi» di vetro, «Termina» di vetro
// nella card «Sei a X oggi».
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChiCeOggi from './ChiCeOggi'
import type { CheckIn } from '../lib/models'
import { makePresentUser } from '../test/factories'
import { expectNoA11yViolations } from '../test/axe'

function makeOwn(over: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'own',
    city: 'Rimini',
    date: '2026-07-24',
    lookingForPartner: true,
    note: '',
    tournamentId: null,
    ...over,
  }
}

type Props = Parameters<typeof ChiCeOggi>[0]

function renderScreen(over: Partial<Props> = {}) {
  const onCheckIn = vi.fn().mockResolvedValue(true)
  const onTerminaCheckIn = vi.fn()
  const onRefresh = vi.fn()
  const onAddPartner = vi.fn().mockResolvedValue({ ok: true })
  const onBack = vi.fn()
  const view = render(
    <ChiCeOggi
      own={null}
      room={[]}
      loading={false}
      cityPrefill=""
      back={{ label: 'Compagni', onClick: onBack }}
      onCheckIn={onCheckIn}
      onTerminaCheckIn={onTerminaCheckIn}
      onRefresh={onRefresh}
      onAddPartner={onAddPartner}
      {...over}
    />,
  )
  return { ...view, onCheckIn, onTerminaCheckIn, onRefresh, onAddPartner, onBack }
}

// La card di una persona della stanza (un `<li>` con dentro il suo nome).
const cardDi = (nome: string) => screen.getByText(nome).closest('li') as HTMLElement

// ---------------------------------------------------------------- check-in form
describe('ChiCeOggi — form di check-in (non in spiaggia)', () => {
  it('prefilla la città col suggerimento ricevuto', () => {
    renderScreen({ cityPrefill: 'Rimini' })
    expect(screen.getByLabelText('Città')).toHaveValue('Rimini')
  })

  it('il modulo: «Fai check-in» come titolo, il giorno fermo su «Oggi», «Sono in spiaggia» arancio', () => {
    renderScreen({ cityPrefill: 'Rimini' })
    expect(screen.getByRole('heading', { level: 2, name: 'Fai check-in' })).toBeInTheDocument()
    expect(screen.getByText('Oggi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sono in spiaggia' })).toHaveAttribute('data-variant', 'filled')
  })

  it('senza città il pulsante di check-in è disattivato (aria-disabled) e non invia', async () => {
    const user = userEvent.setup()
    const { onCheckIn } = renderScreen({ cityPrefill: '' })
    const b = screen.getByRole('button', { name: 'Sono in spiaggia' })
    expect(b).toHaveAttribute('aria-disabled', 'true')
    await user.click(b)
    expect(onCheckIn).not.toHaveBeenCalled()
  })

  it('il tocco sul pulsante disattivato porta al campo città e dice cosa manca', async () => {
    const user = userEvent.setup()
    renderScreen({ cityPrefill: '' })
    await user.click(screen.getByRole('button', { name: 'Sono in spiaggia' }))
    expect(screen.getByLabelText('Città')).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('Scrivi la città in cui sei.')
  })

  it('digitando una città il pulsante si abilita', async () => {
    const user = userEvent.setup()
    renderScreen({ cityPrefill: '' })
    await user.type(screen.getByLabelText('Città'), 'Cesenatico')
    expect(screen.getByRole('button', { name: 'Sono in spiaggia' })).not.toHaveAttribute('aria-disabled')
  })

  it('la città propone i suggerimenti del gazetteer (C21)', () => {
    renderScreen({ cityPrefill: '' })
    const input = screen.getByLabelText('Città')
    const lista = document.getElementById(input.getAttribute('list') ?? '')
    expect(lista?.tagName).toBe('DATALIST')
    expect(lista?.querySelectorAll('option').length).toBeGreaterThan(0)
  })

  it('la nota è facoltativa e, quando si scrive, ha il contatore dei caratteri (max 80)', async () => {
    const user = userEvent.setup()
    renderScreen({ cityPrefill: 'Rimini' })
    const nota = screen.getByLabelText('Nota (facoltativa)')
    expect(nota).toHaveAttribute('maxlength', '80')
    expect(screen.queryByText('0/80')).not.toBeInTheDocument()
    await user.type(nota, 'ciao')
    expect(screen.getByText('4/80')).toBeInTheDocument()
    expect(nota).toHaveAccessibleDescription('4/80')
  })

  it('il check-in invia città, "cerco compagno" e nota', async () => {
    const user = userEvent.setup()
    const { onCheckIn } = renderScreen({ cityPrefill: 'Rimini' })
    await user.type(screen.getByLabelText(/Nota/), 'Cerco per King, 2vs2')
    await user.click(screen.getByRole('button', { name: 'Sono in spiaggia' }))
    expect(onCheckIn).toHaveBeenCalledExactlyOnceWith({
      city: 'Rimini',
      lookingForPartner: true,
      note: 'Cerco per King, 2vs2',
    })
  })

  it('lo switch "Cerco compagno" parte attivo e si può disattivare', async () => {
    const user = userEvent.setup()
    const { onCheckIn } = renderScreen({ cityPrefill: 'Rimini' })
    const sw = screen.getByRole('switch', { name: 'Cerco compagno' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await user.click(screen.getByRole('button', { name: 'Sono in spiaggia' }))
    expect(onCheckIn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ lookingForPartner: false }),
    )
  })

  it('la città viene ripulita dagli spazi prima dell\'invio', async () => {
    const user = userEvent.setup()
    const { onCheckIn } = renderScreen({ cityPrefill: '' })
    await user.type(screen.getByLabelText('Città'), '  Riccione  ')
    await user.click(screen.getByRole('button', { name: 'Sono in spiaggia' }))
    expect(onCheckIn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ city: 'Riccione' }),
    )
  })

  it('senza check-in la stanza non è visibile: invita a fare check-in (reciprocità)', () => {
    renderScreen({ cityPrefill: 'Rimini' })
    expect(screen.getByText(/Fai check-in per vedere chi c'è oggi/)).toBeInTheDocument()
    // Nessuna persona prima del check-in, e nemmeno la sezione.
    expect(screen.queryByRole('button', { name: /^Aggiungi .* ai compagni$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /In spiaggia oggi/ })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- stato "sei qui"
describe('ChiCeOggi — check-in attivo', () => {
  it('mostra "Sei a {città} oggi" e che sei visibile come "cerca compagno"', () => {
    renderScreen({ own: makeOwn({ city: 'Rimini', lookingForPartner: true, note: '2vs2 al campo 3' }) })
    expect(screen.getByRole('heading', { level: 2, name: 'Sei a Rimini oggi' })).toBeInTheDocument()
    expect(screen.getByText(/Visibile come “cerca compagno”/)).toBeInTheDocument()
    expect(screen.getByText(/2vs2 al campo 3/)).toBeInTheDocument()
  })

  it('quando non cerchi compagno lo dice', () => {
    renderScreen({ own: makeOwn({ lookingForPartner: false }) })
    expect(screen.getByText('Visibile, senza cercare compagno')).toBeInTheDocument()
  })

  it('«Termina» (nome: "Termina check-in") chiede la conferma alla shell (non "Esci": C19)', async () => {
    const user = userEvent.setup()
    const { onTerminaCheckIn } = renderScreen({ own: makeOwn() })
    expect(screen.queryByRole('button', { name: 'Esci' })).not.toBeInTheDocument()
    const b = screen.getByRole('button', { name: 'Termina check-in' })
    expect(b).toHaveTextContent('Termina')
    expect(b).toHaveAttribute('data-variant', 'glass')
    await user.click(b)
    expect(onTerminaCheckIn).toHaveBeenCalledTimes(1)
  })

  it('con check-in attivo non mostra più il form', () => {
    renderScreen({ own: makeOwn() })
    expect(screen.queryByRole('button', { name: 'Sono in spiaggia' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fai check-in' })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- stanza
describe('ChiCeOggi — la stanza', () => {
  const room = [
    makePresentUser({ id: 'a', name: 'Anna', lookingForPartner: true, note: 'Cerco per King' }),
    makePresentUser({ id: 'b', name: 'Bruno', lookingForPartner: false }),
  ]

  it('elenca i presenti con nome, badge e nota, nell\'ordine ricevuto', () => {
    renderScreen({ own: makeOwn(), room })
    expect(screen.getAllByRole('button', { name: /^Aggiungi .* ai compagni$/ })).toHaveLength(2)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Anna', 'Bruno'])
    // Il badge "Cerca compagno" va cercato dentro la riga (stesso testo del chip
    // di filtro, che è presente perché la stanza è mista).
    const annaCard = cardDi('Anna')
    expect(within(annaCard).getByText('Cerca compagno')).toBeInTheDocument()
    expect(within(annaCard).getByText('“Cerco per King”')).toBeInTheDocument()
    const brunoCard = cardDi('Bruno')
    expect(within(brunoCard).getByText('In spiaggia oggi')).toBeInTheDocument()
    expect(within(brunoCard).queryByText('Cerca compagno')).not.toBeInTheDocument()
  })

  it('mostra il contatore delle persone presenti', () => {
    renderScreen({ own: makeOwn(), room })
    expect(screen.getByText('2 persone')).toBeInTheDocument()
  })

  it('«Aggiungi» (nome: "Aggiungi {nome} ai compagni") passa l\'utente giusto e conferma al successo', async () => {
    const user = userEvent.setup()
    const { onAddPartner } = renderScreen({ own: makeOwn(), room })
    // La riga di Anna: risalgo dal nome al bottone della stessa riga.
    const card = cardDi('Anna')
    const b = within(card).getByRole('button', { name: 'Aggiungi Anna ai compagni' })
    expect(b).toHaveTextContent('Aggiungi')
    await user.click(b)
    expect(onAddPartner).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a' }))
    // L'esito prende il posto del pulsante, annunciato come stato.
    expect(await within(card).findByRole('status')).toHaveTextContent('Aggiunto ai compagni')
  })

  it('se il collegamento fallisce mostra l\'errore e resta ri-tentabile', async () => {
    const user = userEvent.setup()
    const onAddPartner = vi.fn().mockResolvedValue({ ok: false, error: 'Impossibile collegare il socio.' })
    renderScreen({ own: makeOwn(), room, onAddPartner })
    const card = cardDi('Anna')
    await user.click(within(card).getByRole('button', { name: 'Aggiungi Anna ai compagni' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Impossibile collegare il socio.')
    // Il bottone resta (non è passato a "Aggiunto"): si può riprovare.
    expect(within(card).getByRole('button', { name: 'Aggiungi Anna ai compagni' })).toBeInTheDocument()
  })

  it('"Aggiorna", di vetro accanto al titolo della stanza, chiama onRefresh', async () => {
    const user = userEvent.setup()
    const { onRefresh } = renderScreen({ own: makeOwn(), room })
    const b = screen.getByRole('button', { name: 'Aggiorna' })
    expect(b).toHaveAttribute('data-variant', 'glass')
    await user.click(b)
    expect(onRefresh).toHaveBeenCalled()
  })

  it('stanza vuota: lo dice, e «Aggiorna» resta un pulsante vero', async () => {
    const user = userEvent.setup()
    const { onRefresh } = renderScreen({ own: makeOwn(), room: [] })
    expect(screen.getByText(/Ancora nessun altro qui/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiorna' }))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('in caricamento mostra lo stato "Aggiornamento…" e lo skeleton occupato', () => {
    const { container } = renderScreen({ own: makeOwn(), room: [], loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Aggiornamento…')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('l\'ora dell\'ultimo aggiornamento, quando la shell la conosce', () => {
    renderScreen({ own: makeOwn(), room, aggiornatoAlle: '15:42' })
    expect(screen.getByText('Aggiornato alle 15:42')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- filtro
describe('ChiCeOggi — filtro della stanza', () => {
  it('con stati misti offre "Tutti / Cerca compagno" e filtra', async () => {
    const user = userEvent.setup()
    renderScreen({
      own: makeOwn(),
      room: [
        makePresentUser({ id: 'a', name: 'Anna', lookingForPartner: true }),
        makePresentUser({ id: 'b', name: 'Bruno', lookingForPartner: false }),
      ],
    })
    const group = screen.getByRole('group', { name: /Filtra chi c'è oggi/ })
    // Il nome accessibile, non il testo: l'inchiostro della chip è su due
    // livelli e il secondo (`aria-hidden`) ripete l'etichetta.
    const chips = within(group).getAllByRole('button')
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveAccessibleName('Tutti')
    expect(chips[1]).toHaveAccessibleName('Cerca compagno')

    await user.click(within(group).getByRole('button', { name: 'Cerca compagno' }))
    // Resta solo chi cerca: Anna sì, Bruno no.
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.queryByText('Bruno')).not.toBeInTheDocument()
  })

  it('se cercano tutti (o nessuno) il filtro non compare: non separerebbe nulla', () => {
    renderScreen({
      own: makeOwn(),
      room: [
        makePresentUser({ id: 'a', lookingForPartner: true }),
        makePresentUser({ id: 'b', lookingForPartner: true }),
      ],
    })
    expect(screen.queryByRole('group', { name: /Filtra chi c'è oggi/ })).not.toBeInTheDocument()
  })

  it('"Tutti" rimette in stanza anche chi non cerca compagno', async () => {
    const user = userEvent.setup()
    renderScreen({
      own: makeOwn(),
      room: [
        makePresentUser({ id: 'a', name: 'Anna', lookingForPartner: true }),
        makePresentUser({ id: 'b', name: 'Bruno', lookingForPartner: false }),
      ],
    })
    await user.click(screen.getByRole('button', { name: 'Cerca compagno' }))
    expect(screen.queryByText('Bruno')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tutti' }))
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- a11y
describe('ChiCeOggi — accessibilità', () => {
  it('«‹ Compagni» torna a Compagni (il genitore di «Chi c\'è oggi»)', async () => {
    const user = userEvent.setup()
    const { onBack } = renderScreen()
    await user.click(screen.getByRole('button', { name: 'Compagni' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('il titolo di pagina è l\'unico h1', () => {
    renderScreen({ own: makeOwn(), room: [makePresentUser()] })
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(["Chi c'è oggi"])
  })

  it('nessuna violazione axe nel form di check-in', async () => {
    const { container } = renderScreen({ cityPrefill: 'Rimini' })
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe con check-in attivo e stanza piena', async () => {
    const { container } = renderScreen({
      own: makeOwn({ note: 'Cerco 2vs2' }),
      room: [
        makePresentUser({ id: 'a', name: 'Anna', lookingForPartner: true, note: 'Cerco per King' }),
        makePresentUser({ id: 'b', name: 'Bruno', lookingForPartner: false }),
      ],
    })
    await expectNoA11yViolations(container)
  })

  it('nessuna violazione axe nella stanza vuota', async () => {
    const { container } = renderScreen({ own: makeOwn(), room: [] })
    await expectNoA11yViolations(container)
  })
})
