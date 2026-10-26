// ============================================================================
// «Aggiungi Beach Diary alla Home»: presentazione/js/installa.ts sul
// documento finito della landing, in jsdom.
//
// Ogni test monta il body vero (componiLanding), sceglie browser e modo di
// apertura (user agent, `display-mode`, puntatore) e importa il modulo da
// capo (`vi.resetModules()`): si avvia all'import, come nella pagina.
// jsdom non ha `showModal`: lo stub apre e chiude il <dialog> con l'attributo.
// ============================================================================
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import fonte from '../../presentazione/index.html?raw'
import { componiLanding } from '../../presentazione/build/componi'

const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  safari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  safari18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  chromeIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0',
}

const body = new DOMParser().parseFromString(componiLanding(fonte), 'text/html').body.innerHTML
const originali = {
  ua: Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent'),
  platform: Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform'),
  touch: Object.getOwnPropertyDescriptor(Navigator.prototype, 'maxTouchPoints'),
  matchMedia: window.matchMedia,
  showModal: HTMLDialogElement.prototype.showModal,
  close: HTMLDialogElement.prototype.close,
}

type Opzioni = { ua?: string; platform?: string; touch?: number; standalone?: boolean; fine?: boolean }

/** Monta la landing nel browser descritto e avvia il modulo. */
async function monta({ ua = UA.chromeAndroid, platform = 'Linux armv8l', touch = 5, standalone = false, fine = false }: Opzioni = {}) {
  Object.defineProperty(Navigator.prototype, 'userAgent', { configurable: true, get: () => ua })
  Object.defineProperty(Navigator.prototype, 'platform', { configurable: true, get: () => platform })
  Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => touch })
  window.matchMedia = ((q: string) => ({
    matches: (q.includes('display-mode: standalone') && standalone) || (q.includes('pointer: fine') && fine),
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  document.body.innerHTML = body
  vi.resetModules()
  await import('../../presentazione/js/installa')
  return {
    pulsante: document.querySelector('button[data-installa]') as HTMLButtonElement,
    fatto: document.querySelector('.installa-fatto') as HTMLElement,
    annuncio: document.getElementById('installa-annuncio') as HTMLElement,
    dialogo: document.querySelector('dialog.installa-dialogo') as HTMLDialogElement,
  }
}

/** Un `beforeinstallprompt` finto, con l'esito scelto. */
function promptFinto(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
  const prompt = vi.fn(() => Promise.resolve())
  e.prompt = prompt
  e.userChoice = Promise.resolve({ outcome })
  return { e, prompt }
}

const variante = (d: HTMLDialogElement) => [...d.querySelectorAll<HTMLElement>('[data-passi]')].filter((o) => !o.hidden).map((o) => o.dataset.passi)

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  for (const [k, d] of [['userAgent', originali.ua], ['platform', originali.platform], ['maxTouchPoints', originali.touch]] as const) {
    if (d) Object.defineProperty(Navigator.prototype, k, d)
  }
  window.matchMedia = originali.matchMedia
  HTMLDialogElement.prototype.showModal = originali.showModal
  HTMLDialogElement.prototype.close = originali.close
  document.body.innerHTML = ''
})

describe('dove il browser installa (beforeinstallprompt)', () => {
  it('senza l\'evento il pulsante resta nascosto: bastano i passi scritti', async () => {
    const { pulsante, fatto } = await monta()
    expect(pulsante.hidden).toBe(true)
    expect(fatto.hidden).toBe(true)
  })

  it('l\'evento accende il pulsante (e niente mini-infobar); il clic lancia il prompt nativo', async () => {
    const { pulsante, dialogo } = await monta()
    const { e, prompt } = promptFinto()
    window.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(pulsante.hidden).toBe(false)
    expect(pulsante.textContent).toBe('Aggiungi alla Home')

    await userEvent.setup().click(pulsante)
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(dialogo.open).toBe(false)
    // Il prompt si consuma: il pulsante va via.
    await vi.waitFor(() => expect(pulsante.hidden).toBe(true))
  })

  it('dal computer si chiama «Installa l\'app»', async () => {
    const { pulsante } = await monta({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', platform: 'MacIntel', touch: 0, fine: true })
    window.dispatchEvent(promptFinto().e)
    expect(pulsante.hidden).toBe(false)
    expect(pulsante.textContent).toBe("Installa l'app")
  })

  it('se il prompt non parte, il clic spiega la strada a mano', async () => {
    const { pulsante, dialogo } = await monta()
    const { e, prompt } = promptFinto()
    prompt.mockImplementation(() => Promise.reject(new Error('già usato')))
    window.dispatchEvent(e)
    await userEvent.setup().click(pulsante)
    await vi.waitFor(() => expect(dialogo.open).toBe(true))
    expect(variante(dialogo)).toEqual(['altro'])
  })

  it('appinstalled: al posto del pulsante la riga «già tra le tue app», e la regione di stato lo dice', async () => {
    const { pulsante, fatto, annuncio } = await monta()
    window.dispatchEvent(promptFinto().e)
    window.dispatchEvent(new Event('appinstalled'))
    expect(pulsante.hidden).toBe(true)
    expect(fatto.hidden).toBe(false)
    expect(annuncio.textContent).toBe('Fatto: Beach Diary è tra le tue app.')
  })
})

describe('iPhone e iPad: nessuna API, il dialogo coi passi', () => {
  it.each([
    ['Safari su iOS 26', { ua: UA.safari26, platform: 'iPhone' }, 'ios26'],
    ['Safari su iOS 18', { ua: UA.safari18, platform: 'iPhone' }, 'ios'],
    ['Chrome su iPhone', { ua: UA.chromeIOS, platform: 'iPhone' }, 'ios-altro'],
    // iPadOS si dichiara Mac: lo tradisce il touch.
    ['iPad (si dichiara Mac)', { ua: UA.safari26.replace('iPhone; CPU iPhone OS 26_0 like Mac OS X', 'Macintosh; Intel Mac OS X 10_15_7'), platform: 'MacIntel', touch: 5 }, 'ios26'],
  ] as const)('%s: il pulsante c\'è subito e apre i passi giusti, col fuoco al titolo', async (_, opz, passi) => {
    const { pulsante, dialogo } = await monta(opz)
    expect(pulsante.hidden).toBe(false)
    await userEvent.setup().click(pulsante)
    expect(dialogo.open).toBe(true)
    expect(variante(dialogo)).toEqual([passi])
    expect(document.activeElement).toBe(dialogo.querySelector('h2'))
  })

  it('«Ho capito», ✕ e il velo chiudono il dialogo', async () => {
    const { pulsante, dialogo } = await monta({ ua: UA.safari26, platform: 'iPhone' })
    const user = userEvent.setup()
    for (const chiudi of [() => dialogo.querySelector<HTMLElement>('.installa-ok')!, () => dialogo.querySelector<HTMLElement>('[aria-label="Chiudi"]')!, () => dialogo]) {
      await user.click(pulsante)
      expect(dialogo.open).toBe(true)
      await user.click(chiudi())
      expect(dialogo.open).toBe(false)
    }
  })

  it('un clic dentro il dialogo (sui passi) non lo chiude', async () => {
    const { pulsante, dialogo } = await monta({ ua: UA.safari26, platform: 'iPhone' })
    const user = userEvent.setup()
    await user.click(pulsante)
    await user.click(dialogo.querySelector('[data-passi="ios26"] li')!)
    expect(dialogo.open).toBe(true)
  })

  it('il Mac vero (niente touch) non è un iPad: nessun pulsante senza l\'evento', async () => {
    const { pulsante } = await monta({ ua: UA.firefoxMac, platform: 'MacIntel', touch: 0, fine: true })
    expect(pulsante.hidden).toBe(true)
  })
})

describe('già installata', () => {
  it('aperta dall\'icona (standalone): niente pulsante, anche se arriva l\'evento; c\'è la riga «già tra le tue app»', async () => {
    const { pulsante, fatto, annuncio } = await monta({ ua: UA.safari26, platform: 'iPhone', standalone: true })
    window.dispatchEvent(promptFinto().e)
    expect(pulsante.hidden).toBe(true)
    expect(fatto.hidden).toBe(false)
    // È lo stato della pagina, non una notizia: la regione di stato tace.
    expect(annuncio.textContent).toBe('')
  })
})
