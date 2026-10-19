// ============================================================================
// Le primitive nate col redesign (versione D): il CONTRATTO — ruoli, nomi,
// cosa è decorativo — non lo stile, che jsdom non calcola. Il vetro liquido
// nei test è sempre il solo materiale CSS: niente canvas, niente filtri.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef, useRef } from 'react'
import type React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoA11yViolations } from '../../test/axe'
import { __resetRouterForTests } from '../../app/router'
import { LiquidGlass } from './LiquidGlass'
import { Medal, medalTier } from './Medal'
import { NavBar } from './NavBar'
import { TabBar } from './TabBar'
import { IconButton } from './Button'
import { tabsFor } from '../../app/AppShell'
import { PALLO_UMORI, Pallo, REAZIONE_MS, usePalloTocco } from '../Pallo'
import type { PalloHandle } from '../Pallo'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  __resetRouterForTests()
})

describe('LiquidGlass', () => {
  it('nei test è il materiale CSS: un div col vetro, senza la rifrazione', () => {
    const { container } = render(<LiquidGlass className="x">ciao</LiquidGlass>)
    const el = container.querySelector('.ui-liquid')!
    expect(el.tagName).toBe('DIV')
    expect(el).toHaveAttribute('data-material', 'glass-regular')
    expect(el).not.toHaveAttribute('data-refraction')
    expect(el).toHaveTextContent('ciao')
  })

  it('come strato dietro a un controllo è decorativo e non prende i tocchi', () => {
    const { container } = render(<LiquidGlass layer />)
    const el = container.querySelector('.ui-liquid') as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el.style.position).toBe('absolute')
    expect(el.style.pointerEvents).toBe('none')
  })
})

describe('Medal', () => {
  it.each([
    ['1° 🏆', 'win', '1°', 'Primo posto'],
    ['2°', 'podium', '2°', 'Secondo posto'],
    ['3° · Silver', 'podium', '3°', 'Terzo posto'],
    ['Semifinale', 'rest', 'Semi', 'Semifinale'],
    ['Gironi', 'rest', 'Gir.', 'Gironi'],
    ['In corso', 'open', '…', 'In corso'],
  ])('%s → %s, «%s» a vista e «%s» per gli screen reader', (placement, tier, corto, lungo) => {
    const { container } = render(<Medal placement={placement} />)
    const m = container.querySelector('.ui-medal')!
    expect(m).toHaveAttribute('data-tier', tier)
    expect(medalTier(placement)).toBe(tier)
    expect(within(m as HTMLElement).getByText(corto)).toHaveAttribute('aria-hidden', 'true')
    expect(within(m as HTMLElement).getByText(lungo)).toHaveClass('sr-only')
  })
})

describe('Pallo', () => {
  const ALLEGRI = ['esulta', 'contento', 'occhiolino', 'cuori', 'festa']

  it('quattordici umori: quelli di sempre con lo stesso nome, più gli otto nuovi', () => {
    expect(PALLO_UMORI).toEqual([
      'saluta', 'esulta', 'contento', 'preoccupato', 'sbircia', 'testa',
      'festa', 'triste', 'pensa', 'dorme', 'sorpreso', 'occhiolino', 'cool', 'cuori',
    ])
  })

  it.each(PALLO_UMORI.map((u) => [u]))('«%s» disegna la palla e una faccia, ed è decorativo', (umore) => {
    const { container } = render(<Pallo umore={umore} />)
    const svg = container.querySelector('svg.pallo')!
    expect(svg).toHaveAttribute('data-umore', umore)
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    // La palla (fondo bianco e contorno) e almeno un tratto di faccia.
    expect(svg.querySelectorAll('.pallo-corpo > circle[r="44"]')).toHaveLength(2)
    expect(svg.querySelector('.pallo-volto')!.childElementCount).toBeGreaterThan(0)
    // Niente testo dentro il disegno: non finisce nel nome di chi lo contiene.
    expect(svg.textContent).toBe('')
  })

  it('ogni istanza ha i suoi ritagli, anche le lenti degli occhiali, e ogni riferimento punta al suo', () => {
    const { container } = render(
      <>
        <Pallo umore="saluta" />
        <Pallo umore="esulta" />
        <Pallo umore="cool" />
        <Pallo umore="cool" soloTesta />
      </>,
    )
    const svgs = container.querySelectorAll('svg.pallo')
    expect(svgs).toHaveLength(4)
    svgs.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'))
    const ids = Array.from(container.querySelectorAll('clipPath')).map((c) => c.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(ids.length)
    svgs.forEach((s) => {
      s.querySelectorAll('[clip-path]').forEach((el) => {
        const id = /url\(#(.+)\)/.exec(el.getAttribute('clip-path')!)![1]
        expect(s.querySelector(`clipPath[id="${id}"]`)).not.toBeNull()
      })
    })
  })

  it('solo la testa: l\'inquadratura 96×96, senza braccia né coriandoli; `testa` è la testa di sempre', () => {
    const { container } = render(
      <>
        <Pallo umore="festa" soloTesta size={38} />
        <Pallo umore="testa" size={38} />
      </>,
    )
    const [festa, testa] = Array.from(container.querySelectorAll('svg.pallo'))
    expect(festa).toHaveAttribute('viewBox', '12 12 96 96')
    expect(festa).toHaveAttribute('height', '38')
    expect(festa).toHaveAttribute('data-umore', 'festa')
    expect(festa.querySelector('.pallo-coriandolo')).toBeNull()
    expect(festa.querySelector('.pallo-ombra')).toBeNull()
    expect(testa).toHaveAttribute('viewBox', '12 12 96 96')
  })

  it('l\'ombra di serie negli umori in piedi, come prima; si può sempre togliere', () => {
    const ombra = (el: React.ReactElement) => render(el).container.querySelector('.pallo-ombra')
    expect(ombra(<Pallo umore="saluta" />)).not.toBeNull()
    expect(ombra(<Pallo umore="dorme" />)).not.toBeNull()
    expect(ombra(<Pallo umore="esulta" />)).toBeNull()
    expect(ombra(<Pallo umore="sbircia" />)).toBeNull()
    expect(ombra(<Pallo umore="festa" ombra={false} />)).toBeNull()
  })

  describe('le reazioni', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('reagisci(): un salto e l\'umore chiesto per il tempo chiesto, poi torna il suo', () => {
      const ref = createRef<PalloHandle>()
      const { container } = render(<Pallo ref={ref} umore="contento" />)
      const svg = container.querySelector('svg.pallo')!
      act(() => ref.current!.reagisci('festa', 2400))
      expect(svg).toHaveAttribute('data-umore', 'festa')
      expect(svg).toHaveAttribute('data-tocco')
      act(() => {
        vi.advanceTimersByTime(2399)
      })
      expect(svg).toHaveAttribute('data-umore', 'festa')
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(svg).toHaveAttribute('data-umore', 'contento')
      expect(svg).not.toHaveAttribute('data-tocco')
    })

    it('un tocco: una faccia allegra a caso per un secondo; il quinto di fila è la sorpresa, a turno', () => {
      const ref = createRef<PalloHandle>()
      const { container } = render(<Pallo ref={ref} umore="saluta" />)
      const svg = container.querySelector('svg.pallo')!
      act(() => ref.current!.tocca())
      expect(ALLEGRI).toContain(svg.getAttribute('data-umore'))
      act(() => {
        vi.advanceTimersByTime(REAZIONE_MS)
      })
      expect(svg).toHaveAttribute('data-umore', 'saluta')
      // Il secondo dopo è troppo tardi per contare: si riparte da uno. Cinque
      // di fila: il palleggio.
      for (let k = 0; k < 4; k++) act(() => ref.current!.tocca())
      expect(svg).not.toHaveAttribute('data-sorpresa')
      act(() => ref.current!.tocca())
      expect(svg).toHaveAttribute('data-sorpresa', 'palleggio')
      expect(svg).toHaveAttribute('data-umore', 'esulta')
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      expect(svg).not.toHaveAttribute('data-sorpresa')
      // La sorpresa dopo: gli occhiali.
      act(() => ref.current!.sorpresa())
      expect(svg).toHaveAttribute('data-sorpresa', 'occhiali')
      expect(svg).toHaveAttribute('data-umore', 'cool')
    })

    it('usePalloTocco: il click reagisce e chiama `onTocco`; il tocco lungo è solo la sorpresa', () => {
      const onTocco = vi.fn()
      function Bottone() {
        const ref = useRef<PalloHandle>(null)
        const gesti = usePalloTocco(ref, onTocco)
        return (
          <button type="button" aria-label="Pallo" {...gesti}>
            <Pallo ref={ref} umore="saluta" />
          </button>
        )
      }
      const { container } = render(<Bottone />)
      const svg = container.querySelector('svg.pallo')!
      const btn = screen.getByRole('button', { name: 'Pallo' })
      fireEvent.click(btn)
      expect(onTocco).toHaveBeenCalledTimes(1)
      expect(svg).toHaveAttribute('data-tocco')
      act(() => {
        vi.advanceTimersByTime(REAZIONE_MS)
      })
      fireEvent.pointerDown(btn, { button: 0 })
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(svg).toHaveAttribute('data-sorpresa')
      fireEvent.pointerUp(btn)
      fireEvent.click(btn)
      expect(onTocco).toHaveBeenCalledTimes(1)
    })
  })

  describe('lo sguardo e la vita', () => {
    let vede: ((voci: { isIntersecting: boolean }[]) => void) | null = null
    let ridotto = false
    beforeEach(() => {
      ridotto = false
      vede = null
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: (voci: { isIntersecting: boolean }[]) => void) {
            vede = cb
          }
          observe() {}
          disconnect() {}
        },
      )
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        cb(0)
        return 1
      })
      vi.stubGlobal('matchMedia', (q: string) => ({
        matches: q.includes('reduce') ? ridotto : false,
        addEventListener() {},
        removeEventListener() {},
      }))
    })
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.useRealTimers()
      vi.restoreAllMocks()
    })
    const muovi = (x: number, y: number) => act(() => void window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y })))

    it('`segui`: in vista, gli occhi vanno verso il puntatore (solo transform, nessun render)', () => {
      const { container } = render(<Pallo umore="saluta" segui vivo={false} />)
      const volto = container.querySelector<SVGGElement>('.pallo-volto')!
      const occhi = container.querySelector<SVGGElement>('.pallo-sguardo')!
      // Fuori vista non ascolta.
      muovi(500, 0)
      expect(occhi.style.transform).toBe('')
      act(() => vede!([{ isIntersecting: true }]))
      muovi(500, 0)
      expect(occhi.style.transform).toMatch(/^translate\(2\.\d+px, 0px\)$/)
      expect(volto.style.transform).toMatch(/^translate\(2\.\d+px/)
      // Esce di vista: torna a guardare davanti e smette di ascoltare.
      act(() => vede!([{ isIntersecting: false }]))
      expect(occhi.style.transform).toBe('')
      muovi(0, 500)
      expect(occhi.style.transform).toBe('')
    })

    it('con reduced-motion lo sguardo resta fermo', () => {
      ridotto = true
      const { container } = render(<Pallo umore="saluta" segui />)
      act(() => vede!([{ isIntersecting: true }]))
      muovi(500, 0)
      expect(container.querySelector<SVGGElement>('.pallo-sguardo')!.style.transform).toBe('')
    })

    it('`vivo`: ammicca e fa un gesto, a intervalli scelti a caso', () => {
      vi.useFakeTimers()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const { container } = render(<Pallo umore="saluta" />)
      const svg = container.querySelector('svg.pallo')!
      act(() => vede!([{ isIntersecting: true }]))
      act(() => {
        vi.advanceTimersByTime(2200)
      })
      expect(svg).toHaveAttribute('data-batti')
      act(() => {
        vi.advanceTimersByTime(180)
      })
      expect(svg).not.toHaveAttribute('data-batti')
      act(() => {
        vi.advanceTimersByTime(3500 - 2380)
      })
      expect(svg).toHaveAttribute('data-gesto', 'guarda-sx')
    })

    it('senza IntersectionObserver (jsdom) resta il disegno: niente ascoltatori, niente timer', () => {
      vi.unstubAllGlobals()
      vi.useFakeTimers()
      const { container } = render(<Pallo umore="saluta" segui />)
      act(() => {
        vi.advanceTimersByTime(20000)
      })
      expect(container.querySelector('svg.pallo')).not.toHaveAttribute('data-batti')
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})

describe('NavBar', () => {
  it('schermata radice: un h1, il sottotitolo, l\'«aside» accanto, nessun pulsante in cima', () => {
    render(<NavBar title="Compagni" subtitle="Con chi giochi meglio" aside={<button type="button">Nuovo</button>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Compagni' })).toBeInTheDocument()
    expect(screen.getByText('Con chi giochi meglio')).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Nuovo'])
  })

  it('dettaglio: l\'indietro di vetro ha il nome della schermata precedente', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<NavBar title="Luca" back={{ label: 'Compagni', onClick }} />)
    await user.click(screen.getByRole('button', { name: 'Compagni' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    // Solo la freccia: il nome resta, nell'aria-label.
    rerender(<NavBar title="Luca" back={{ label: 'Tornei', onClick }} backIcon />)
    expect(screen.getByRole('button', { name: 'Torna a Tornei' })).toBeInTheDocument()
  })

  it('le azioni stanno in una capsula; il × chiude; il titolo compatto è aria-hidden', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <NavBar
        title="Profilo"
        hideLargeTitle
        close={{ label: 'Chiudi', onClick: onClose }}
        actions={<IconButton icon="pencil" label="Modifica" />}
      />,
    )
    // Con hideLargeTitle l'h1 lo mette la schermata.
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(container.querySelector('.ui-navbar-compact')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.ui-navbar-actions')).toContainElement(screen.getByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('il kicker e la figura stanno accanto all\'h1, senza diventare titoli', async () => {
    const { container } = render(
      <NavBar title="Sunset Series" kicker="Amatoriale · 2vs2" subtitle="28 giugno" eyebrow={<Medal placement="1° 🏆" size="lg" />} />,
    )
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getByText('Amatoriale · 2vs2')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})

describe('TabBar', () => {
  it('quattro tab vere (Home · Tornei · Compagni · Diario) e il ＋ «Crea» separato', async () => {
    const onPlus = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <TabBar tabs={tabsFor('lista')} active="diario" atRoot menuOpen={false} lifted={false} onPlus={onPlus} />,
    )
    const nav = screen.getByRole('navigation', { name: 'Principale' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Home', 'Tornei', 'Compagni', 'Diario'])
    expect(within(nav).getByRole('link', { name: 'Diario' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: 'Profilo' })).toBeNull()
    const piu = within(nav).getByRole('button', { name: 'Crea' })
    expect(piu).toHaveAttribute('aria-haspopup', 'menu')
    expect(piu).toHaveAttribute('aria-expanded', 'false')
    await user.click(piu)
    expect(onPlus).toHaveBeenCalledTimes(1)
    await expectNoA11yViolations(container)
  })
})
