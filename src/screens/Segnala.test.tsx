// ============================================================================
// Schermata "Segnala un problema". È presentazionale (riceve `onInvia` e non
// parla con la rete), quindi si verifica montandola con `vi.fn()`.
//
// Le proprietà che contano: non si può spedire una segnalazione vuota, quello
// che si spedisce è quello che si è scritto (ripulito), un errore di rete non
// fa sparire il testo appena battuto, e dopo l'invio il form non resta lì a
// invitare al doppio invio.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Segnala from './Segnala'
import { expectNoA11yViolations } from '../test/axe'

type Props = Parameters<typeof Segnala>[0]

function renderScreen(over: Partial<Props> = {}) {
  const onBack = vi.fn()
  const onInvia = vi.fn().mockResolvedValue({ ok: true })
  const view = render(<Segnala onBack={onBack} onInvia={onInvia} {...over} />)
  return { ...view, onBack, onInvia }
}

const DESCRIZIONE = 'Ho salvato un torneo e non compare nella lista dei tornei.'

// Compila il form con dati validi (il minimo che rende spedibile la segnalazione).
async function compila(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Il problema in una riga'), 'Torneo salvato invisibile')
  await user.type(screen.getByLabelText('Cosa è successo'), DESCRIZIONE)
}

describe('Segnala — cosa può partire', () => {
  it('a form vuoto il pulsante di invio è disabilitato', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: 'Invia segnalazione' })).toBeDisabled()
  })

  it('col solo titolo non basta: serve anche la descrizione', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(screen.getByLabelText('Il problema in una riga'), 'Qualcosa non va')
    expect(screen.getByRole('button', { name: 'Invia segnalazione' })).toBeDisabled()
  })

  it('con titolo e descrizione il pulsante si abilita', async () => {
    const user = userEvent.setup()
    renderScreen()
    await compila(user)
    expect(screen.getByRole('button', { name: 'Invia segnalazione' })).toBeEnabled()
  })
})

describe('Segnala — invio', () => {
  it('spedisce titolo, descrizione e area scelta', async () => {
    const user = userEvent.setup()
    const { onInvia } = renderScreen()
    await compila(user)
    await user.selectOptions(screen.getByLabelText('Dove succede'), 'tornei')
    await user.click(screen.getByRole('button', { name: 'Invia segnalazione' }))

    expect(onInvia).toHaveBeenCalledExactlyOnceWith({
      titolo: 'Torneo salvato invisibile',
      descrizione: DESCRIZIONE,
      area: 'tornei',
    })
  })

  it('senza scegliere l’area la segnalazione parte comunque, come "altro"', async () => {
    const user = userEvent.setup()
    const { onInvia } = renderScreen()
    await compila(user)
    await user.click(screen.getByRole('button', { name: 'Invia segnalazione' }))
    expect(onInvia.mock.calls[0][0].area).toBe('altro')
  })

  it('dopo l’invio il form sparisce e resta il ringraziamento', async () => {
    const user = userEvent.setup()
    renderScreen()
    await compila(user)
    await user.click(screen.getByRole('button', { name: 'Invia segnalazione' }))

    expect(screen.queryByRole('button', { name: 'Invia segnalazione' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Segnala un altro problema' })).toBeInTheDocument()
  })

  it('“Segnala un altro problema” riparte da un form vuoto', async () => {
    const user = userEvent.setup()
    renderScreen()
    await compila(user)
    await user.click(screen.getByRole('button', { name: 'Invia segnalazione' }))
    await user.click(screen.getByRole('button', { name: 'Segnala un altro problema' }))

    expect(screen.getByLabelText('Il problema in una riga')).toHaveValue('')
    expect(screen.getByLabelText('Cosa è successo')).toHaveValue('')
  })
})

describe('Segnala — quando va storto', () => {
  it('mostra l’errore ricevuto senza buttare via quello che è stato scritto', async () => {
    const user = userEvent.setup()
    const onInvia = vi.fn().mockResolvedValue({ ok: false, error: 'Sessione non valida.' })
    renderScreen({ onInvia })
    await compila(user)
    await user.click(screen.getByRole('button', { name: 'Invia segnalazione' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Sessione non valida.')
    // Il punto: una segnalazione scritta di getto non si riscrive volentieri.
    expect(screen.getByLabelText('Cosa è successo')).toHaveValue(DESCRIZIONE)
    expect(screen.getByRole('button', { name: 'Invia segnalazione' })).toBeEnabled()
  })
})

describe('Segnala — navigazione e accessibilità', () => {
  it('il link indietro riporta alla home', async () => {
    const user = userEvent.setup()
    const { onBack } = renderScreen()
    await user.click(screen.getByText('← Torna alla home'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('il form non ha violazioni di accessibilità', async () => {
    const { container } = renderScreen()
    await expectNoA11yViolations(container)
  })
})
