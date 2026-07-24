// ============================================================================
// Schermata "Chi c'è oggi": form di check-in, stato "sei qui", stanza reciproca
// e collegamento come compagno. La schermata è presentazionale — riceve `own`,
// `room` e callback e non parla con la rete — quindi si verifica montandola con
// `vi.fn()` e dati di fabbrica, senza mockare Supabase.
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
  const onCheckOut = vi.fn().mockResolvedValue(true)
  const onRefresh = vi.fn()
  const onAddPartner = vi.fn().mockResolvedValue({ ok: true })
  const view = render(
    <ChiCeOggi
      own={null}
      room={[]}
      loading={false}
      cityPrefill=""
      onCheckIn={onCheckIn}
      onCheckOut={onCheckOut}
      onRefresh={onRefresh}
      onAddPartner={onAddPartner}
      {...over}
    />,
  )
  return { ...view, onCheckIn, onCheckOut, onRefresh, onAddPartner }
}

// ---------------------------------------------------------------- check-in form
describe('ChiCeOggi — form di check-in (non in spiaggia)', () => {
  it('prefilla la città col suggerimento ricevuto', () => {
    renderScreen({ cityPrefill: 'Rimini' })
    expect(screen.getByLabelText('Città')).toHaveValue('Rimini')
  })

  it('senza città il pulsante di check-in è disabilitato', () => {
    renderScreen({ cityPrefill: '' })
    expect(screen.getByRole('button', { name: 'Fai check-in' })).toBeDisabled()
  })

  it('digitando una città il pulsante si abilita', async () => {
    const user = userEvent.setup()
    renderScreen({ cityPrefill: '' })
    await user.type(screen.getByLabelText('Città'), 'Cesenatico')
    expect(screen.getByRole('button', { name: 'Fai check-in' })).toBeEnabled()
  })

  it('il check-in invia città, "cerco compagno" e nota', async () => {
    const user = userEvent.setup()
    const { onCheckIn } = renderScreen({ cityPrefill: 'Rimini' })
    await user.type(screen.getByLabelText(/Nota/), 'Cerco per King, 2vs2')
    await user.click(screen.getByRole('button', { name: 'Fai check-in' }))
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
    await user.click(screen.getByRole('button', { name: 'Fai check-in' }))
    expect(onCheckIn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ lookingForPartner: false }),
    )
  })

  it('la città viene ripulita dagli spazi prima dell\'invio', async () => {
    const user = userEvent.setup()
    const { onCheckIn } = renderScreen({ cityPrefill: '' })
    await user.type(screen.getByLabelText('Città'), '  Riccione  ')
    await user.click(screen.getByRole('button', { name: 'Fai check-in' }))
    expect(onCheckIn).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ city: 'Riccione' }),
    )
  })

  it('senza check-in la stanza non è visibile: invita a fare check-in (reciprocità)', () => {
    renderScreen({ cityPrefill: 'Rimini' })
    expect(screen.getByText(/Fai check-in per vedere chi c'è oggi/)).toBeInTheDocument()
    // Nessuna card utente prima del check-in.
    expect(screen.queryByRole('button', { name: /Aggiungi come compagno/ })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------- stato "sei qui"
describe('ChiCeOggi — check-in attivo', () => {
  it('mostra "Sei a {città} oggi" e lo stato "cerco compagno"', () => {
    renderScreen({ own: makeOwn({ city: 'Rimini', lookingForPartner: true, note: '2vs2 al campo 3' }) })
    expect(screen.getByText(/Sei a Rimini oggi/)).toBeInTheDocument()
    expect(screen.getByText(/Stai cercando un compagno\./)).toBeInTheDocument()
    expect(screen.getByText(/2vs2 al campo 3/)).toBeInTheDocument()
  })

  it('quando non cerchi compagno lo dice', () => {
    renderScreen({ own: makeOwn({ lookingForPartner: false }) })
    expect(screen.getByText(/Non stai cercando un compagno\./)).toBeInTheDocument()
  })

  it('"Esci" chiama onCheckOut', async () => {
    const user = userEvent.setup()
    const { onCheckOut } = renderScreen({ own: makeOwn() })
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(onCheckOut).toHaveBeenCalledTimes(1)
  })

  it('con check-in attivo non mostra più il form', () => {
    renderScreen({ own: makeOwn() })
    expect(screen.queryByRole('button', { name: 'Fai check-in' })).not.toBeInTheDocument()
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
    expect(screen.getAllByRole('button', { name: /Aggiungi come compagno/ })).toHaveLength(2)
    // Il badge "Cerca compagno" va cercato dentro la card (stesso testo del chip
    // di filtro, che è presente perché la stanza è mista).
    const annaCard = screen.getByText('Anna').closest('.card') as HTMLElement
    expect(within(annaCard).getByText('Cerca compagno')).toBeInTheDocument()
    expect(within(annaCard).getByText('Cerco per King')).toBeInTheDocument()
    const brunoCard = screen.getByText('Bruno').closest('.card') as HTMLElement
    expect(within(brunoCard).getByText('In spiaggia')).toBeInTheDocument()
  })

  it('mostra il contatore delle persone presenti', () => {
    renderScreen({ own: makeOwn(), room })
    expect(screen.getByText('2 persone')).toBeInTheDocument()
  })

  it('"Aggiungi come compagno" passa l\'utente giusto e conferma al successo', async () => {
    const user = userEvent.setup()
    const { onAddPartner } = renderScreen({ own: makeOwn(), room })
    // La card di Anna: risalgo dal nome al bottone della stessa card.
    const card = screen.getByText('Anna').closest('.card') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Aggiungi come compagno/ }))
    expect(onAddPartner).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a' }))
    expect(await within(card).findByText('Aggiunto ai compagni')).toBeInTheDocument()
  })

  it('se il collegamento fallisce mostra l\'errore e resta ri-tentabile', async () => {
    const user = userEvent.setup()
    const onAddPartner = vi.fn().mockResolvedValue({ ok: false, error: 'Impossibile collegare il socio.' })
    renderScreen({ own: makeOwn(), room, onAddPartner })
    const card = screen.getByText('Anna').closest('.card') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Aggiungi come compagno/ }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Impossibile collegare il socio.')
    // Il bottone resta (non è passato a "Aggiunto"): si può riprovare.
    expect(within(card).getByRole('button', { name: /Aggiungi come compagno/ })).toBeInTheDocument()
  })

  it('"Aggiorna" chiama onRefresh', async () => {
    const user = userEvent.setup()
    const { onRefresh } = renderScreen({ own: makeOwn(), room })
    await user.click(screen.getByRole('button', { name: /Aggiorna/ }))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('stanza vuota: invita ad aggiornare', () => {
    renderScreen({ own: makeOwn(), room: [] })
    expect(screen.getByText(/Ancora nessun altro qui/)).toBeInTheDocument()
  })

  it('in caricamento mostra lo stato "Aggiornamento…"', () => {
    renderScreen({ own: makeOwn(), room: [], loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Aggiornamento…')
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
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tutti', 'Cerca compagno'])

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
