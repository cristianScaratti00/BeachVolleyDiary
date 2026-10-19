// ============================================================================
// Beach Wrapped — smoke test del visore (rendering + navigazione + empty state).
//
// Verifica il COMPORTAMENTO della UI, non la matematica di deriveWrapped (che ha
// i suoi test): si costruisce un WrappedData a mano e si controlla che le slide
// si sfoglino, che i controlli rispondano e che l'empty state chiuda.
//
// Nota: le slide sono renderizzate due volte — quella a schermo (dentro il
// role="group") e un layer nascosto a piena risoluzione (aria-hidden) usato solo
// per l'export. Per sapere "su quale slide siamo" si legge quindi il gruppo
// visibile, non un testo qualsiasi (che comparirebbe anche nel layer nascosto).
//
// Dal redesign (schermata 18): la slide è lo schermo, col fondo pieno che
// cambia; «Scarica tutte» e «Condividi» stanno su ogni slide. Mentre un PNG si
// prepara il pulsante dice «Preparo…» (`findBy` aspetta la fine); `onNotice`
// riceve anche il tipo dell'avviso.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WrappedData, WrappedSlide } from '../../lib/derive'
import WrappedModal from './WrappedModal'
import { expectNoA11yViolations } from '../../test/axe'

// `html-to-image` tocca canvas e font: in jsdom non può girare, e comunque qui
// interessa QUALE nodo viene catturato, non il PNG che ne esce.
vi.mock('html-to-image', () => ({ toPng: vi.fn(), toBlob: vi.fn() }))
// Le foto: in jsdom non si scaricano né si decodificano. Qui conta che arrivino
// con le loro misure naturali e che la tela le mostri intere.
vi.mock('./foto', async (orig) => ({ ...(await orig<typeof import('./foto')>()), caricaFoto: vi.fn(() => Promise.resolve(null)) }))

const SLIDES: WrappedSlide[] = [
  { kind: 'intro', eyebrow: 'Beach Wrapped', headline: 'PRIMA', title: 'copertina', caption: '12 partite', stats: [], emoji: '🏖️' },
  { kind: 'wins', eyebrow: 'Vittorie', headline: 'SECONDA', title: 'partite vinte', caption: 'su 12', stats: [{ value: '70%', label: 'Win rate' }, { value: '8–4', label: 'Record' }], emoji: '🏐' },
  { kind: 'outro', eyebrow: 'Fine', headline: 'TERZA', title: 'condividi', caption: 'Beach Volley Diary', stats: [], emoji: '🎉' },
]

function makeWrapped(over: Partial<WrappedData> = {}): WrappedData {
  return {
    range: { from: '2026-01-01', to: '2026-12-31', label: 'Stagione 2026' },
    partnerName: null,
    hasEnoughData: true,
    played: 12,
    slides: SLIDES,
    slug: 'beach-wrapped-stagione-2026',
    ...over,
  }
}

function renderModal(over: Partial<WrappedData> = {}, props: Partial<Parameters<typeof WrappedModal>[0]> = {}) {
  const onClose = vi.fn()
  const view = render(<WrappedModal wrapped={makeWrapped(over)} onClose={onClose} {...props} />)
  return { ...view, onClose }
}

// La slide visibile: unico role="group" della UI, con l'indice nell'aria-label.
const deck = () => screen.getByRole('group')

// Sotto la card non c'è più una pulsantiera: si sfoglia col dito sulla card e
// con le frecce da tastiera. Questi test presidiano proprio quello — che
// togliendo i pulsanti non sia sparito anche il modo di muoversi.
describe('WrappedModal — sfogliare senza pulsantiera', () => {
  it('parte dalla prima slide', () => {
    renderModal()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    expect(within(deck()).getByText('PRIMA')).toBeInTheDocument()
  })

  it('le frecce da tastiera avanzano e tornano indietro', () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(deck()).toHaveAccessibleName(/slide 2 di 3/i)
    expect(within(deck()).getByText('SECONDA')).toBeInTheDocument()

    fireEvent.keyDown(deck(), { key: 'ArrowLeft' })
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    expect(within(deck()).getByText('PRIMA')).toBeInTheDocument()
  })

  it('agli estremi non si esce dal mazzo', () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: 'ArrowLeft' })
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
    for (let i = 0; i < 5; i++) fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(deck()).toHaveAccessibleName(/slide 3 di 3/i)
  })

  it('non resta nessun pulsante di navigazione sotto la card', () => {
    renderModal()
    expect(screen.queryByRole('button', { name: /slide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pausa|riproduci/i })).not.toBeInTheDocument()
  })
})

describe('WrappedModal — auto-avanzamento', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const passaUnaSlide = async () => { await act(async () => { vi.advanceTimersByTime(5300) }) }

  it('scorre da solo, come una storia', async () => {
    renderModal()
    await passaUnaSlide()
    expect(deck()).toHaveAccessibleName(/slide 2 di 3/i)
  })

  it('tenendo premuto si ferma: è la pausa, ora che il pulsante non c’è più', async () => {
    // Senza questo, togliere il tasto pausa lascerebbe un contenuto che si
    // muove da solo e non si può fermare.
    renderModal()
    fireEvent.pointerDown(deck())
    await passaUnaSlide()
    await passaUnaSlide()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
  })

  it('la barra spaziatrice mette in pausa da tastiera', async () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: ' ' })
    await passaUnaSlide()
    await passaUnaSlide()
    expect(deck()).toHaveAccessibleName(/slide 1 di 3/i)
  })
})

describe('WrappedModal — il nuovo look', () => {
  it('il fondo cambia con la slide: arancio → inchiostro → sabbia', () => {
    renderModal()
    const d = screen.getByRole('dialog', { name: 'Beach Wrapped' })
    expect(d).toHaveAttribute('data-tone', 'orange')
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(d).toHaveAttribute('data-tone', 'ink')
    // L'inchiostro è una superficie scura: l'anello di focus diventa bianco.
    expect(d).toHaveAttribute('data-surface', 'dark')
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(d).toHaveAttribute('data-tone', 'sand')
    expect(d).not.toHaveAttribute('data-surface')
  })

  it('il titolo della schermata è «Beach Wrapped · 2026», con l\'anno della stagione', () => {
    renderModal()
    expect(screen.getByRole('heading', { level: 1, name: 'Beach Wrapped · 2026' })).toBeInTheDocument()
  })

  it('le statistiche della slide sono una lista di termini e valori', () => {
    renderModal()
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    const dl = within(deck()).getByText('Win rate').closest('dl') as HTMLElement
    expect(within(dl).getAllByRole('term').map((t) => t.textContent)).toEqual(['Win rate', 'Record'])
    expect(within(dl).getAllByRole('definition').map((d) => d.textContent)).toEqual(['70%', '8–4'])
  })
})

describe('WrappedModal — azioni', () => {
  it('«Scarica tutte» c’è su ogni slide; senza share sheet né appunti niente «Condividi»', async () => {
    await pngPronto()
    renderModal()
    expect(screen.getByRole('button', { name: 'Scarica tutte' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /condividi/i })).not.toBeInTheDocument()
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Scarica tutte' })).toBeInTheDocument()
  })

  it('con lo share sheet, «Scarica tutte» e «Condividi» stanno insieme fin dalla prima slide', async () => {
    await pngPronto()
    installa(navigator, 'canShare', vi.fn(() => true))
    installa(navigator, 'share', vi.fn().mockResolvedValue(undefined))
    renderModal()
    expect(screen.getByRole('button', { name: 'Scarica tutte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Condividi' })).toBeInTheDocument()
  })

  it('mentre l\'immagine da condividere si prepara il pulsante dice «Preparo…» ed è occupato', async () => {
    const toBlob = await pngPronto()
    let fine: (b: Blob) => void = () => {}
    toBlob.mockImplementation(() => new Promise<Blob>((r) => { fine = r }))
    installa(navigator, 'canShare', vi.fn(() => true))
    installa(navigator, 'share', vi.fn().mockResolvedValue(undefined))
    renderModal({ slides: CON_RECAP })
    vaiAllUltima()
    const b = await screen.findByRole('button', { name: 'Preparo…' })
    expect(b).toHaveAttribute('aria-busy', 'true')
    await act(async () => fine(new Blob(['png'], { type: 'image/png' })))
    await act(async () => fine(new Blob(['png'], { type: 'image/png' })))
    expect(await screen.findByRole('button', { name: 'Condividi' })).not.toHaveAttribute('aria-busy')
  })

  it('“Chiudi” chiama onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Export dell'immagine. `toBlob` è mockato (vedi in cima): qui conta COSA si
// cattura, COME si consegna (link blob:, share sheet, appunti) e QUANDO.
// ---------------------------------------------------------------------------

const CON_RECAP: WrappedSlide[] = [
  SLIDES[0],
  { kind: 'recap', eyebrow: 'Riepilogo', headline: 'RECAP', title: '', caption: '', stats: [], emoji: '📊' },
  SLIDES[2],
]

// Le ancore cliccate per lo scarico (jsdom non sa scaricare: si registrano).
let ancore: Array<{ href: string; download: string; inDom: boolean }> = []

async function pngPronto() {
  const toBlob = vi.mocked((await import('html-to-image')).toBlob)
  toBlob.mockReset()
  toBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  return toBlob
}

const vaiAllUltima = () => {
  for (let i = 0; i < 5; i++) fireEvent.keyDown(deck(), { key: 'ArrowRight' })
}

// navigator.share / clipboard non esistono in jsdom: ogni test li installa
// (prima del render, perché il componente li rileva al montaggio) e li toglie.
const installati: string[] = []
function installa(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, { value, configurable: true, writable: true })
  installati.push(key)
}

beforeEach(() => {
  ancore = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    ancore.push({ href: this.href, download: this.download, inDom: document.body.contains(this) })
  })
  installa(URL, 'createObjectURL', vi.fn(() => 'blob:http://localhost/png'))
  installa(URL, 'revokeObjectURL', vi.fn())
})

afterEach(() => {
  for (const key of installati.splice(0)) {
    delete (navigator as unknown as Record<string, unknown>)[key]
    delete (URL as unknown as Record<string, unknown>)[key]
    delete (globalThis as unknown as Record<string, unknown>)[key]
  }
  vi.restoreAllMocks()
})

describe('WrappedModal — scarica tutte', () => {
  it('prepara l’immagine da condividere appena si arriva all’ultima slide, prima del tocco', async () => {
    // È ciò che tiene vivo il permesso di condividere su iOS: al tocco il PNG
    // c'è già. Prima dell'ultima slide invece non si genera niente.
    const toBlob = await pngPronto()
    renderModal({ slides: CON_RECAP })
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    await act(async () => {})
    expect(toBlob).not.toHaveBeenCalled()

    fireEvent.keyDown(deck(), { key: 'ArrowRight' })
    await waitFor(() => expect(toBlob).toHaveBeenCalled())
    // Sull'ultima (il saluto) si prepara il RIEPILOGO.
    expect(within(toBlob.mock.calls[0][0] as HTMLElement).getByText('RECAP')).toBeInTheDocument()
  })

  it('scarica un PNG per slide, con link blob: agganciati alla pagina (non data: URL)', async () => {
    // Il vecchio `data:` di qualche MB su un'ancora staccata: sui telefoni
    // spesso il tocco non produceva nulla.
    await pngPronto()
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Scarica tutte' }))
    expect(await screen.findByRole('button', { name: /Preparo \d\/3…/ })).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(ancore).toHaveLength(3), { timeout: 3000 })
    expect(ancore.map((a) => a.download)).toEqual([
      'beach-wrapped-stagione-2026-01.png',
      'beach-wrapped-stagione-2026-02.png',
      'beach-wrapped-stagione-2026-03.png',
    ])
    expect(ancore.every((a) => a.href === 'blob:http://localhost/png' && a.inDom)).toBe(true)
    expect(await screen.findByRole('button', { name: 'Scarica tutte' })).not.toHaveAttribute('aria-busy')
  })

  it('ogni PNG viene dalla sua tela, nell\'ordine delle slide', async () => {
    const toBlob = await pngPronto()
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Scarica tutte' }))
    await waitFor(() => expect(ancore).toHaveLength(3), { timeout: 3000 })
    // Due passate per tela (la prima a vuoto, per WebKit): 6 catture.
    const nodi = toBlob.mock.calls.map((c) => (c[0] as HTMLElement).textContent ?? '')
    expect(nodi[1]).toContain('PRIMA')
    expect(nodi[3]).toContain('SECONDA')
    expect(nodi[5]).toContain('TERZA')
  })

  it('se la generazione fallisce lo dice, invece di non fare nulla', async () => {
    const toBlob = vi.mocked((await import('html-to-image')).toBlob)
    toBlob.mockReset()
    toBlob.mockRejectedValue(new Error('canvas'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onNotice = vi.fn()
    renderModal({ slides: CON_RECAP }, { onNotice })
    fireEvent.click(screen.getByRole('button', { name: 'Scarica tutte' }))
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/impossibile generare/i), 'error'))
    expect(ancore).toHaveLength(0)
  })
})

describe('WrappedModal — condividi', () => {
  it('condivide la slide che si guarda, solo il file, senza testo allegato', async () => {
    await pngPronto()
    const share = vi.fn().mockResolvedValue(undefined)
    installa(navigator, 'canShare', vi.fn(() => true))
    installa(navigator, 'share', share)
    renderModal({ slides: CON_RECAP })
    fireEvent.keyDown(deck(), { key: 'ArrowRight' })

    fireEvent.click(screen.getByRole('button', { name: 'Condividi' }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const data = share.mock.calls[0][0] as ShareData
    const file = data.files?.[0] as File
    expect(file.name).toBe('beach-wrapped-stagione-2026-02.png')
    expect(file.type).toBe('image/png')
    // Con un `text` alcune app (Instagram) prendono la didascalia e perdono l'immagine.
    expect(data.text).toBeUndefined()
  })

  it('sull’ultima slide (il saluto) condivide il RIEPILOGO, non «Grazie»', async () => {
    const toBlob = await pngPronto()
    const share = vi.fn().mockResolvedValue(undefined)
    installa(navigator, 'canShare', vi.fn(() => true))
    installa(navigator, 'share', share)
    renderModal({ slides: CON_RECAP })
    vaiAllUltima()
    fireEvent.click(await screen.findByRole('button', { name: 'Condividi' }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(((share.mock.calls[0][0] as ShareData).files?.[0] as File).name).toBe('beach-wrapped-stagione-2026-02.png')
    expect(within(toBlob.mock.calls[0][0] as HTMLElement).getByText('RECAP')).toBeInTheDocument()
  })

  it('chiudere lo share sheet senza scegliere non è un errore', async () => {
    await pngPronto()
    installa(navigator, 'canShare', vi.fn(() => true))
    installa(navigator, 'share', vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })))
    const onNotice = vi.fn()
    renderModal({ slides: CON_RECAP }, { onNotice })
    vaiAllUltima()
    fireEvent.click(await screen.findByRole('button', { name: 'Condividi' }))
    await act(async () => {})
    await act(async () => {})
    expect(onNotice).not.toHaveBeenCalled()
  })

  it('se il browser nega il permesso, invita a ritoccare (l’immagine ora è pronta)', async () => {
    await pngPronto()
    installa(navigator, 'canShare', vi.fn(() => true))
    installa(navigator, 'share', vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })))
    const onNotice = vi.fn()
    renderModal({ slides: CON_RECAP }, { onNotice })
    fireEvent.click(screen.getByRole('button', { name: 'Condividi' }))
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/tocca di nuovo/i), 'info'))
  })

  it('senza share sheet ma con gli appunti copia l’immagine', async () => {
    await pngPronto()
    const write = vi.fn().mockResolvedValue(undefined)
    installa(globalThis, 'ClipboardItem', class { constructor(public items: Record<string, Blob>) {} })
    installa(navigator, 'clipboard', { write })
    const onNotice = vi.fn()
    renderModal({ slides: CON_RECAP }, { onNotice })
    vaiAllUltima()
    fireEvent.click(await screen.findByRole('button', { name: 'Condividi' }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const [item] = write.mock.calls[0][0] as Array<{ items: Record<string, Blob> }>
    expect(item.items['image/png']).toBeInstanceOf(Blob)
    expect(onNotice).toHaveBeenCalledWith(expect.stringMatching(/copiata/i), 'success')
  })
})

describe('WrappedModal — foto intere, mai ritagliate', () => {
  const CON_FOTO: WrappedSlide[] = [{ ...SLIDES[0], photoUrl: 'https://foto.test/verticale.jpg' }, SLIDES[1], SLIDES[2]]

  async function conFoto(w: number, h: number) {
    const { caricaFoto } = await import('./foto')
    vi.mocked(caricaFoto).mockResolvedValue({ src: 'data:image/jpeg;base64,AAAA', w, h, sfondo: null })
    renderModal({ slides: CON_FOTO })
    const tela = document.querySelectorAll<HTMLElement>('.wrapped-capture-card')[0]
    await waitFor(() => expect(tela.querySelector('img')).not.toBeNull())
    return tela.querySelector('img') as HTMLImageElement
  }

  it('sulla tela la foto verticale è intera: la sua proporzione, dentro 904×640, e Pallo accanto', async () => {
    const img = await conFoto(600, 900)
    const w = parseFloat(img.style.width)
    const h = parseFloat(img.style.height)
    expect(w / h).toBeCloseTo(600 / 900, 2)
    expect(h).toBeLessThanOrEqual(640)
    expect(img.style.objectFit).not.toBe('cover')
    // La copertina verticale lascia posto: Pallo le sta accanto.
    expect(img.parentElement?.querySelector('.pallo')).not.toBeNull()
  })

  it('una foto orizzontale prende la larghezza della colonna, senza Pallo accanto', async () => {
    const img = await conFoto(1600, 900)
    expect(parseFloat(img.style.width) / parseFloat(img.style.height)).toBeCloseTo(16 / 9, 2)
    expect(parseFloat(img.style.width)).toBeLessThanOrEqual(904)
    expect(img.parentElement?.querySelector('.pallo')).toBeNull()
  })

  it('a schermo la foto porta le misure naturali (il browser la tiene intera)', async () => {
    await conFoto(600, 900)
    const img = deck().querySelector('img.wrapped-photo') as HTMLImageElement
    expect(img).toHaveAttribute('width', '600')
    expect(img).toHaveAttribute('height', '900')
  })
})

describe('WrappedModal — dati insufficienti', () => {
  it('mostra l’empty state e nessuna slide sfogliabile', () => {
    renderModal({ hasEnoughData: false })
    expect(screen.getByText(/Beach Wrapped in arrivo/)).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('“Ho capito” chiude l’empty state', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal({ hasEnoughData: false })
    await user.click(screen.getByText('Ho capito'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('WrappedModal — cornice del visore', () => {
  it('è un dialogo modale con il nome «Beach Wrapped» e il focus parte dal ✕', () => {
    renderModal()
    const d = screen.getByRole('dialog', { name: 'Beach Wrapped' })
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus()
  })

  it('Esc chiude', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('la card si raggiunge con Tab (anello di focus visibile, non spento)', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.tab()
    expect(deck()).toHaveFocus()
    expect(deck().style.outline).toBe('')
  })
})

describe('WrappedModal — accessibilità', () => {
  it('il mazzo non ha violazioni a11y bloccanti', async () => {
    const { container } = renderModal()
    await expectNoA11yViolations(container)
  })
})
