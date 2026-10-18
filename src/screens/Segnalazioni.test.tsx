// ============================================================================
// Bacheca admin delle segnalazioni (`/profilo/segnalazioni`). La rete arriva
// come props (`carica`, `aggiorna`): si passano due `vi.fn()` e si verifica il
// comportamento della bacheca, non supabase-js. Prima viveva dentro Profilo e
// mockava il modulo `lib/segnalazioni` (SegnalazioniAdmin.test.tsx).
//
// Le proprietà che contano: la bacheca si carica da sola, il filtro per stato
// mostra ciò che dice di mostrare, e un cambio di stato che il DB rifiuta non
// lascia a schermo uno stato che non esiste.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Segnalazioni from './Segnalazioni'
import type { Segnalazione } from '../lib/segnalazioni'
import { toast } from '../components/ui/Toast'
import { expectNoA11yViolations } from '../test/axe'

const elencoSegnalazioni = vi.fn()
const aggiornaStato = vi.fn()
const back = { label: 'Profilo', onClick: vi.fn() }

function SegnalazioniAdmin() {
  return <Segnalazioni back={back} carica={elencoSegnalazioni} aggiorna={aggiornaStato} />
}

function makeSegnalazione(over: Partial<Segnalazione> = {}): Segnalazione {
  return {
    id: 's1',
    quando: '2026-08-01T10:30:00.000Z',
    titolo: 'Torneo salvato invisibile',
    descrizione: 'Salvo il torneo e non compare nella lista.',
    area: 'tornei',
    stato: 'nuovo',
    browser: 'Mozilla/5.0 (iPhone)',
    autore: 'Marta',
    email: 'marta@example.com',
    ...over,
  }
}

beforeEach(() => {
  elencoSegnalazioni.mockReset()
  aggiornaStato.mockReset().mockResolvedValue(true)
  toast.__reset()
})

describe('Segnalazioni — caricamento', () => {
  it('carica la bacheca da sola al montaggio', async () => {
    elencoSegnalazioni.mockResolvedValue([makeSegnalazione()])
    render(<SegnalazioniAdmin />)
    expect(await screen.findByText('Torneo salvato invisibile')).toBeInTheDocument()
    expect(elencoSegnalazioni).toHaveBeenCalledOnce()
  })

  it('senza segnalazioni lo dice, invece di mostrare una lista vuota', async () => {
    elencoSegnalazioni.mockResolvedValue([])
    render(<SegnalazioniAdmin />)
    expect(await screen.findByText(/Nessuna segnalazione, per ora/i)).toBeInTheDocument()
  })

  it('un errore di rete si può ritentare senza ricaricare la pagina', async () => {
    const user = userEvent.setup()
    elencoSegnalazioni.mockResolvedValueOnce(null).mockResolvedValueOnce([makeSegnalazione()])
    render(<SegnalazioniAdmin />)

    await user.click(await screen.findByRole('button', { name: 'Riprova' }))
    expect(await screen.findByText('Torneo salvato invisibile')).toBeInTheDocument()
  })

  it('mostra chi ha segnalato e da dove, non solo il testo', async () => {
    elencoSegnalazioni.mockResolvedValue([makeSegnalazione()])
    render(<SegnalazioniAdmin />)
    const card = (await screen.findByText('Torneo salvato invisibile')).closest('article')!
    expect(within(card).getByText(/Tornei e partite/)).toBeInTheDocument()
    expect(within(card).getByText(/marta@example\.com/)).toBeInTheDocument()
  })
})

describe('Segnalazioni — filtro per stato', () => {
  const righe = [
    makeSegnalazione({ id: 's1', titolo: 'Prima', stato: 'nuovo' }),
    makeSegnalazione({ id: 's2', titolo: 'Seconda', stato: 'risolto' }),
  ]

  it('parte da "Tutte" e le mostra entrambe', async () => {
    elencoSegnalazioni.mockResolvedValue(righe)
    render(<SegnalazioniAdmin />)
    expect(await screen.findByText('Prima')).toBeInTheDocument()
    expect(screen.getByText('Seconda')).toBeInTheDocument()
  })

  it('filtrando per "Risolta" resta solo quella', async () => {
    const user = userEvent.setup()
    elencoSegnalazioni.mockResolvedValue(righe)
    render(<SegnalazioniAdmin />)
    await user.click(await screen.findByRole('button', { name: 'Risolta (1)' }))

    expect(screen.getByText('Seconda')).toBeInTheDocument()
    expect(screen.queryByText('Prima')).not.toBeInTheDocument()
  })
})

describe('Segnalazioni — avanzamento di stato', () => {
  it('cambiando stato lo scrive sul DB', async () => {
    const user = userEvent.setup()
    elencoSegnalazioni.mockResolvedValue([makeSegnalazione()])
    render(<SegnalazioniAdmin />)
    await user.selectOptions(await screen.findByLabelText('Stato'), 'in_corso')

    expect(aggiornaStato).toHaveBeenCalledExactlyOnceWith('s1', 'in_corso')
    expect(await screen.findByLabelText('Stato')).toHaveValue('in_corso')
  })

  it('se la scrittura fallisce rilegge, invece di lasciare uno stato inventato', async () => {
    const user = userEvent.setup()
    elencoSegnalazioni.mockResolvedValue([makeSegnalazione({ stato: 'nuovo' })])
    aggiornaStato.mockResolvedValue(false)
    render(<SegnalazioniAdmin />)
    await user.selectOptions(await screen.findByLabelText('Stato'), 'chiuso')

    await waitFor(() => expect(elencoSegnalazioni).toHaveBeenCalledTimes(2))
    expect(await screen.findByLabelText('Stato')).toHaveValue('nuovo')
  })

  it('la smentita torna indietro subito, prima ancora che la rilettura risponda', async () => {
    const user = userEvent.setup()
    let rilettura: (v: Segnalazione[]) => void = () => {}
    elencoSegnalazioni
      .mockResolvedValueOnce([makeSegnalazione({ stato: 'nuovo' })])
      .mockImplementationOnce(() => new Promise((r) => { rilettura = r }))
    aggiornaStato.mockResolvedValue(false)
    render(<SegnalazioniAdmin />)
    await user.selectOptions(await screen.findByLabelText('Stato'), 'risolto')
    await waitFor(() => expect(screen.getByLabelText('Stato')).toHaveValue('nuovo'))
    rilettura([makeSegnalazione({ stato: 'nuovo' })])
  })
})

describe('Segnalazioni — schermata', () => {
  it('ha il suo titolo e ‹ Indietro verso il Profilo', async () => {
    const user = userEvent.setup()
    elencoSegnalazioni.mockResolvedValue([])
    render(<SegnalazioniAdmin />)
    expect(screen.getByRole('heading', { level: 1, name: 'Segnalazioni' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Profilo' }))
    expect(back.onClick).toHaveBeenCalled()
  })

  it('mentre carica è occupata e lo dice', () => {
    elencoSegnalazioni.mockReturnValue(new Promise(() => {}))
    const { container } = render(<SegnalazioniAdmin />)
    expect(container.querySelector('[aria-busy="true"]')).toHaveTextContent('Carico le segnalazioni…')
  })

  it('un filtro senza righe lo dice', async () => {
    const user = userEvent.setup()
    elencoSegnalazioni.mockResolvedValue([makeSegnalazione({ stato: 'nuovo' })])
    render(<SegnalazioniAdmin />)
    await user.click(await screen.findByRole('button', { name: 'Chiusa (0)' }))
    expect(screen.getByText('Nessuna segnalazione in questo stato.')).toBeInTheDocument()
  })

  it('nessuna violazione axe con delle righe', async () => {
    elencoSegnalazioni.mockResolvedValue([makeSegnalazione()])
    const { container } = render(<SegnalazioniAdmin />)
    await screen.findByText('Torneo salvato invisibile')
    await expectNoA11yViolations(container)
  })
})
