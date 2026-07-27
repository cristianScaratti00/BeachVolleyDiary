// ============================================================================
// Ricerca del luogo dentro il pannello "＋ Nuovo luogo".
//
// Qui non si riverifica il parsing della risposta (ce l'ha `geosearch.test.ts`):
// si verifica il comportamento che si vede, e che è tutto nei tempi — attesa
// prima di interrogare il servizio, richiesta vecchia buttata via, guasto che
// non blocca il form. Sono le tre cose che una ricerca a ogni tasto sbaglia.
//
// `fetch` è mockato a livello di modulo `geosearch`: così i timer restano
// l'unica cosa da governare e i test non dipendono dalla forma di Photon.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import VenuePicker from './VenuePicker'
import { GeoSearchError } from '../../lib/geosearch'
import type { LuogoTrovato } from '../../lib/geosearch'
import type { AnyForm } from '../../lib/models'

const cerca = vi.hoisted(() => vi.fn())
vi.mock('../../lib/geosearch', async (orig) => ({
  ...(await orig<typeof import('../../lib/geosearch')>()),
  cercaLuoghi: cerca,
}))

const bagno: LuogoTrovato = {
  id: 'N42', nome: 'Bagno 26', citta: 'Riccione', tipo: 'Stabilimento balneare',
  contesto: 'Riccione · Emilia-Romagna · Italia', lat: 44.00194, lng: 12.65611,
}
const spiaggia: LuogoTrovato = {
  id: 'N77', nome: 'Spiaggia di Levante', citta: 'Cesenatico', tipo: 'Spiaggia',
  contesto: 'Cesenatico · Italia', lat: 44.2, lng: 12.4,
}

// Il pannello del luogo nuovo è aperto (`venueId: 'new'`): è l'unico stato in
// cui la ricerca esiste.
function renderPicker(form: AnyForm = {}) {
  const setField = vi.fn()
  render(<VenuePicker form={{ venueId: 'new', ...form }} setField={setField} venues={[]} />)
  return { setField, campo: screen.getByLabelText('Cerca il luogo') }
}

// `fireEvent` e non `userEvent`: con i fake timer i due si aspettano a vicenda
// e il test scade. Qui i timer sono il soggetto della prova, quindi comandarli
// a mano è anche più onesto.
//
// Una battuta per lettera, come chi scrive davvero: è l'unico modo di
// verificare che il debounce rimandi la richiesta invece di accumularne otto.
function digita(campo: HTMLElement, testo: string) {
  for (let i = 1; i <= testo.length; i++) {
    fireEvent.change(campo, { target: { value: testo.slice(0, i) } })
  }
}

// L'attesa del debounce, più il giro di promise della risposta.
async function passaIlDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(400)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  cerca.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('VenuePicker — la ricerca aspetta prima di partire', () => {
  it('non interroga il servizio a ogni lettera', async () => {
    cerca.mockResolvedValue([bagno])
    const { campo } = renderPicker()
    digita(campo, 'riccione')
    // Otto lettere digitate, nessuna richiesta finché non ci si ferma.
    expect(cerca).not.toHaveBeenCalled()
    await passaIlDebounce()
    expect(cerca).toHaveBeenCalledTimes(1)
    expect(cerca.mock.calls[0][0]).toBe('riccione')
  })

  it('sotto le tre lettere non parte affatto', async () => {
    const { campo } = renderPicker()
    digita(campo, 'ri')
    await passaIlDebounce()
    expect(cerca).not.toHaveBeenCalled()
  })

  it('annulla la ricerca precedente quando si continua a scrivere', async () => {
    // Senza annullamento, una risposta lenta arrivata in ritardo sovrascrive i
    // risultati di quella nuova: si sceglie da un elenco che non c'entra più.
    cerca.mockResolvedValue([bagno])
    const { campo } = renderPicker()
    digita(campo, 'riccio')
    await passaIlDebounce()
    const primoSegnale = cerca.mock.calls[0][1] as AbortSignal
    expect(primoSegnale.aborted).toBe(false)
    fireEvent.change(campo, { target: { value: 'riccione' } })
    expect(primoSegnale.aborted).toBe(true)
  })
})

describe('VenuePicker — i risultati', () => {
  it('elenca i luoghi trovati con la loro riga di contesto', async () => {
    cerca.mockResolvedValue([bagno, spiaggia])
    const { campo } = renderPicker()
    digita(campo, 'bagno')
    await passaIlDebounce()
    expect(screen.getByRole('button', { name: /Bagno 26/ })).toBeInTheDocument()
    expect(screen.getByText('Riccione · Emilia-Romagna · Italia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Spiaggia di Levante/ })).toBeInTheDocument()
  })

  it('sceglierne uno riempie nome, città e coordinate insieme', async () => {
    cerca.mockResolvedValue([bagno])
    const { campo, setField } = renderPicker()
    digita(campo, 'bagno')
    await passaIlDebounce()
    fireEvent.click(screen.getByRole('button', { name: /Bagno 26/ }))

    expect(setField).toHaveBeenCalledWith('newVenueName', 'Bagno 26')
    expect(setField).toHaveBeenCalledWith('newVenueCity', 'Riccione')
    // Nell'ordine e nel formato che il campo coordinate sa rileggere.
    expect(setField).toHaveBeenCalledWith('newVenueCoords', '44.00194, 12.65611')
  })

  it('scelto un luogo, l’elenco sparisce', async () => {
    cerca.mockResolvedValue([bagno])
    const { campo } = renderPicker()
    digita(campo, 'bagno')
    await passaIlDebounce()
    fireEvent.click(screen.getByRole('button', { name: /Bagno 26/ }))
    expect(screen.queryByRole('button', { name: /Bagno 26/ })).not.toBeInTheDocument()
  })

  it('dice quando non ha trovato niente, invece di restare muto', async () => {
    cerca.mockResolvedValue([])
    const { campo } = renderPicker()
    digita(campo, 'qwertyuiop')
    await passaIlDebounce()
    expect(screen.getByRole('status')).toHaveTextContent(/Nessun luogo trovato/i)
  })

  it('conta i risultati in una regione live', async () => {
    cerca.mockResolvedValue([bagno, spiaggia])
    const { campo } = renderPicker()
    digita(campo, 'bagno')
    await passaIlDebounce()
    expect(screen.getByRole('status')).toHaveTextContent('2 luoghi trovati')
  })
})

describe('VenuePicker — quando la ricerca non funziona', () => {
  it('un guasto non blocca il form: restano GPS e campi a mano', async () => {
    cerca.mockRejectedValue(new GeoSearchError('rete'))
    const { campo } = renderPicker()
    digita(campo, 'riccione')
    await passaIlDebounce()

    expect(screen.getByRole('status')).toHaveTextContent(/Ricerca non disponibile/i)
    // La ragione per cui l'errore non è bloccante: le altre due strade ci sono.
    expect(screen.getByLabelText('Nome del luogo')).toBeInTheDocument()
    expect(screen.getByLabelText(/Coordinate/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usa la mia posizione/ })).toBeInTheDocument()
  })

  it('una ricerca annullata non viene segnalata come guasto', async () => {
    // È stata sostituita da quella dopo: dire "non disponibile" sarebbe falso.
    // Il rifiuto arriva a segnale già abortito, come fa un fetch interrotto.
    cerca.mockImplementation((_q: string, signal?: AbortSignal) =>
      new Promise((_ok, ko) => {
        signal?.addEventListener('abort', () => ko(new DOMException('annullata', 'AbortError')))
      }),
    )
    const { campo } = renderPicker()
    digita(campo, 'riccione')
    await passaIlDebounce()
    // Riscrivere annulla la prima richiesta, che rifiuta: nessun messaggio.
    fireEvent.change(campo, { target: { value: 'cesenatico' } })
    await act(async () => {})
    expect(screen.getByRole('status')).not.toHaveTextContent(/Ricerca non disponibile/i)
  })
})
