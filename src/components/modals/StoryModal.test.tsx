// ============================================================================
// Visore della Storia Instagram: le due scelte (layout e colore) come
// radiogroup a frecce che si ricordano per dispositivo, i tre layout della
// tela con le foto SEMPRE intere, e il PNG che esce dalla tela scelta.
//
// `html-to-image` e il caricamento delle foto sono finti: in jsdom non c'è né
// canvas né decodifica. Qui conta COSA va sulla tela (misure naturali,
// proporzioni, ripieghi senza foto) e QUALE nodo si fotografa.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StoryModal from './StoryModal'
import type { StoryData } from '../../lib/derive'
import { PALETTES } from '../wrapped/palette'
import type { FotoTela } from '../wrapped/foto'
import { expectNoA11yViolations } from '../../test/axe'

vi.mock('html-to-image', () => ({ toPng: vi.fn(), toBlob: vi.fn(() => Promise.resolve(null)) }))
vi.mock('../wrapped/foto', async (orig) => ({
  ...(await orig<typeof import('../wrapped/foto')>()),
  caricaFoto: vi.fn(() => Promise.resolve(null)),
}))

const STORY: StoryData = {
  year: '2026',
  name: 'Cervia Beach Party',
  resultLabel: 'CAMPIONI · GOLD',
  meta: '10 ottobre 2026  ·  Cervia  ·  Amatoriale',
  winPct: 100,
  record: '2–0',
  setStr: '4–1',
  diffStr: '+10',
  diffPositive: true,
  partner: 'Giulia',
  slug: 'cervia-beach-party',
  coverUrl: null,
  photoUrls: [],
  emoji: '🏐',
}

// Tre foto vere di proporzioni diverse: verticale 9:16, orizzontale 4:3, 3:4.
const FOTO: FotoTela[] = [
  { src: 'data:image/jpeg;base64,ALTA', w: 720, h: 1280, sfondo: 'data:image/png;base64,SFOCATA' },
  { src: 'data:image/jpeg;base64,LARGA', w: 1200, h: 900, sfondo: null },
  { src: 'data:image/jpeg;base64,VERT', w: 900, h: 1200, sfondo: null },
]

function renderStoria(over: Partial<StoryData> = {}) {
  const onClose = vi.fn()
  const onNotice = vi.fn()
  const view = render(
    <StoryModal
      story={{ ...STORY, ...over }}
      onClose={onClose}
      onNotice={onNotice}
      top
      byTouch={false}
      opener={null}
      setDirty={vi.fn()}
      setBusy={vi.fn()}
    />,
  )
  return { ...view, onClose, onNotice }
}

/** La Storia con le foto: `caricaFoto` le restituisce già con le misure naturali. */
async function renderConFoto(n = 3) {
  const { caricaFoto } = await import('../wrapped/foto')
  vi.mocked(caricaFoto).mockImplementation((url: string) => Promise.resolve(FOTO[Number(url.split('#')[1])] ?? null))
  const view = renderStoria({ photoUrls: FOTO.slice(0, n).map((_, i) => `https://foto.test/f.jpg#${i}`) })
  await waitFor(() => expect(tela().querySelector('img')).not.toBeNull())
  return view
}

const tela = () => document.querySelector('.storia-canvas') as HTMLElement
const gruppo = (name: string) => screen.getByRole('radiogroup', { name })
const radio = (group: string, name: string) => within(gruppo(group)).getByRole('radio', { name })
const scelto = (group: string) => within(gruppo(group)).getAllByRole('radio').find((r) => r.getAttribute('aria-checked') === 'true')
const proporzione = (img: HTMLImageElement) => parseFloat(img.style.width) / parseFloat(img.style.height)

beforeEach(() => {
  try {
    localStorage.clear()
  } catch {
    /* niente */
  }
})

describe('StoryModal — le scelte', () => {
  it('layout e colore sono due radiogroup da tre, con un solo radio nel giro del Tab', () => {
    renderStoria()
    for (const [name, voci] of [
      ['Layout della storia', ['Tabellone', 'Foto', 'Polaroid']],
      ['Colore della storia', ['Inchiostro', 'Sabbia', 'Arancio']],
    ] as const) {
      const radios = within(gruppo(name)).getAllByRole('radio')
      expect(radios.map((r) => r.textContent?.trim() || r.getAttribute('aria-label'))).toEqual([...voci])
      expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
      expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1)
    }
    // Di partenza: il Tabellone, sull'inchiostro.
    expect(scelto('Layout della storia')).toHaveAccessibleName('Tabellone')
    expect(scelto('Colore della storia')).toHaveAccessibleName('Inchiostro')
  })

  it('le frecce cambiano layout e portano il focus; Home ed End vanno agli estremi, e il giro si chiude', async () => {
    const user = userEvent.setup()
    renderStoria()
    radio('Layout della storia', 'Tabellone').focus()
    await user.keyboard('{ArrowRight}')
    expect(radio('Layout della storia', 'Foto')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Layout della storia', 'Foto')).toHaveFocus()
    expect(tela()).toHaveAttribute('data-layout', 'foto')
    await user.keyboard('{End}')
    expect(radio('Layout della storia', 'Polaroid')).toHaveFocus()
    expect(tela()).toHaveAttribute('data-layout', 'polaroid')
    await user.keyboard('{ArrowRight}')
    expect(radio('Layout della storia', 'Tabellone')).toHaveFocus()
    await user.keyboard('{Home}{ArrowLeft}')
    expect(radio('Layout della storia', 'Polaroid')).toHaveAttribute('aria-checked', 'true')
    expect(within(gruppo('Layout della storia')).getAllByRole('radio').filter((r) => r.tabIndex === 0)).toEqual([radio('Layout della storia', 'Polaroid')])
  })

  it('le miniature dei layout si colorano col colore scelto', async () => {
    const user = userEvent.setup()
    renderStoria()
    await user.click(radio('Colore della storia', 'Arancio'))
    for (const mini of gruppo('Layout della storia').querySelectorAll('.storia-mini')) {
      expect(mini.querySelector('rect')).toHaveAttribute('fill', PALETTES.orange.bg)
    }
    expect(tela().style.background).not.toBe('')
  })

  it('layout e colore si ricordano per dispositivo', async () => {
    const user = userEvent.setup()
    const { unmount } = renderStoria()
    await user.click(radio('Layout della storia', 'Polaroid'))
    await user.click(radio('Colore della storia', 'Sabbia'))
    unmount()
    renderStoria()
    expect(scelto('Layout della storia')).toHaveAccessibleName('Polaroid')
    expect(scelto('Colore della storia')).toHaveAccessibleName('Sabbia')
    expect(tela()).toHaveAttribute('data-layout', 'polaroid')
  })

  it('senza il salvataggio (navigazione privata) si riparte dai primi, senza errori', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    renderStoria()
    expect(scelto('Layout della storia')).toHaveAccessibleName('Tabellone')
    expect(scelto('Colore della storia')).toHaveAccessibleName('Inchiostro')
  })

  it('un valore salvato che non esiste più non rompe niente', () => {
    localStorage.setItem('bvd_storia_stile', JSON.stringify({ layout: 'mosaico', colore: 'navy' }))
    renderStoria()
    expect(scelto('Layout della storia')).toHaveAccessibleName('Tabellone')
    expect(scelto('Colore della storia')).toHaveAccessibleName('Inchiostro')
  })
})

describe('StoryModal — i layout, con le foto sempre intere', () => {
  it('Tabellone senza foto: le quattro celle dei numeri', () => {
    renderStoria()
    expect(tela().querySelectorAll('.storia-cell')).toHaveLength(4)
    expect(tela().querySelector('img')).toBeNull()
  })

  it('Tabellone con le foto: una riga di foto con le misure naturali (larghezza = altezza × proporzione), tre numeri in fila', async () => {
    await renderConFoto()
    const riga = tela().querySelector('.storia-strip-row') as HTMLElement
    const imgs = [...riga.querySelectorAll('img')]
    expect(imgs.map((i) => [i.getAttribute('width'), i.getAttribute('height')])).toEqual(FOTO.map((f) => [String(f.w), String(f.h)]))
    // La somma delle proporzioni decide l'altezza comune della riga.
    const somma = FOTO.reduce((s, f) => s + f.w / f.h, 0)
    expect(Number(riga.style.getPropertyValue('--somma'))).toBeCloseTo(somma, 5)
    expect(tela().querySelectorAll('.storia-numero')).toHaveLength(3)
  })

  it('Foto: la prima foto protagonista, intera sul suo fondo sfocato; Pallo sbircia da dietro', async () => {
    const user = userEvent.setup()
    await renderConFoto()
    await user.click(radio('Layout della storia', 'Foto'))
    const area = tela().querySelector('.storia-foto-area') as HTMLElement
    expect(Number(area.style.getPropertyValue('--a'))).toBeCloseTo(720 / 1280, 5)
    const pannello = area.querySelector('.storia-foto-pannello') as HTMLElement
    expect(pannello.style.backgroundImage).toContain('SFOCATA')
    const imgs = pannello.querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('src', FOTO[0].src)
    expect(imgs[0].style.objectFit).not.toBe('cover')
    expect(area.querySelector('.pallo')).toHaveAttribute('data-umore', 'sbircia')
    // Sotto: l'esito, il nome e tre numeri.
    expect(within(tela()).getByRole('heading', { name: 'Cervia Beach Party', hidden: true })).toBeInTheDocument()
    expect(tela().querySelectorAll('.storia-numero')).toHaveLength(3)
  })

  it('Foto senza foto: Pallo grande al posto della foto', async () => {
    const user = userEvent.setup()
    renderStoria()
    await user.click(radio('Layout della storia', 'Foto'))
    // «Campioni»: un 1°, e Pallo fa festa.
    expect(tela().querySelector('.storia-foto-solo')).toHaveAttribute('data-umore', 'festa')
    expect(tela().querySelector('img')).toBeNull()
  })

  it('Polaroid: ogni foto nella sua proporzione vera, con la didascalia scritta sotto', async () => {
    const user = userEvent.setup()
    await renderConFoto()
    await user.click(radio('Layout della storia', 'Polaroid'))
    const polaroid = [...tela().querySelectorAll('figure.storia-pol')]
    expect(polaroid).toHaveLength(3)
    polaroid.forEach((p, i) => {
      const img = p.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('src', FOTO[i].src)
      expect(Math.abs(proporzione(img) - FOTO[i].w / FOTO[i].h)).toBeLessThan(0.01)
      expect(img.style.objectFit).not.toBe('cover')
    })
    expect(polaroid.map((p) => p.querySelector('figcaption')?.textContent)).toEqual(['Cervia', '10 ottobre', 'con Giulia'])
    // Il risultato in grande.
    expect(within(tela()).getByText('Campioni')).toHaveClass('storia-pol-esito')
  })

  it('Polaroid senza foto: una polaroid con dentro Pallo', async () => {
    const user = userEvent.setup()
    renderStoria()
    await user.click(radio('Layout della storia', 'Polaroid'))
    const p = tela().querySelector('figure.storia-pol') as HTMLElement
    expect(p.querySelector('.pallo')).toHaveAttribute('data-umore', 'festa')
    expect(p.querySelector('figcaption')).toHaveTextContent('10 ottobre · Cervia')
  })
})

// ---------------------------------------------------------------------------
// Il PNG: `toBlob` è finto; si registra quale tela (e con quale layout) viene
// fotografata, e come si consegna il file.
// ---------------------------------------------------------------------------
describe('StoryModal — il PNG', () => {
  let ancore: Array<{ href: string; download: string }> = []
  const crea = URL.createObjectURL
  const revoca = URL.revokeObjectURL

  beforeEach(() => {
    ancore = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      ancore.push({ href: this.href, download: this.download })
    })
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/storia')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    URL.createObjectURL = crea
    URL.revokeObjectURL = revoca
  })

  async function pngFinto() {
    const toBlob = vi.mocked((await import('html-to-image')).toBlob)
    const fotografati: string[] = []
    toBlob.mockImplementation((node: HTMLElement) => {
      fotografati.push(node.dataset.layout ?? '')
      return Promise.resolve(new Blob(['png'], { type: 'image/png' }))
    })
    return { toBlob, fotografati }
  }

  it('il PNG si prepara in sottofondo dalla tela del layout scelto, e si rifà quando il layout cambia', async () => {
    const user = userEvent.setup()
    const { fotografati } = await pngFinto()
    renderStoria()
    await waitFor(() => expect(fotografati).toContain('tabellone'))
    await user.click(radio('Layout della storia', 'Polaroid'))
    await waitFor(() => expect(fotografati).toContain('polaroid'))
  })

  it('«Scarica» consegna il PNG della tela scelta col nome del torneo', async () => {
    const user = userEvent.setup()
    const { fotografati } = await pngFinto()
    renderStoria()
    await user.click(radio('Layout della storia', 'Foto'))
    await user.click(await screen.findByRole('button', { name: 'Scarica' }))
    await waitFor(() => expect(ancore).toHaveLength(1))
    expect(ancore[0]).toEqual({ href: 'blob:http://localhost/storia', download: 'cervia-beach-party-story.png' })
    expect(fotografati[fotografati.length - 1]).toBe('foto')
  })
})

describe('StoryModal — cornice e accessibilità', () => {
  it('è un dialogo modale col nome del torneo, il focus parte dal × ed Esc chiude', async () => {
    const user = userEvent.setup()
    const { onClose } = renderStoria()
    expect(screen.getByRole('dialog', { name: 'Storia di Cervia Beach Party' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('la tela è decorativa per gli screen reader: le scelte e le azioni no', () => {
    renderStoria()
    expect(tela().closest('[aria-hidden="true"]')).not.toBeNull()
    expect(gruppo('Layout della storia').closest('[aria-hidden="true"]')).toBeNull()
  })

  it('nessuna violazione axe, anche con le foto e la Polaroid', async () => {
    const user = userEvent.setup()
    const { container } = await renderConFoto()
    await expectNoA11yViolations(container)
    await user.click(radio('Layout della storia', 'Polaroid'))
    await expectNoA11yViolations(container)
  })
})
