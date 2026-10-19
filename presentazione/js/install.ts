// ============================================================================
// «Installa sul telefono» (UX FL5, §L7.12, §L12.10; MOTION §L5.4, ML9).
//
// La logica di `setupInstall()` della landing di prima, così com'è: il
// prompt nativo dove c'è (`beforeinstallprompt`), le istruzioni dove non c'è
// (iOS e iPadOS), `appinstalled`, l'app già aperta dall'icona. In più il
// foglio d'istruzioni è un dialogo modale vero, in quattro varianti scelte
// dallo user agent, e il pulsante, a installazione fatta, diventa il suo
// status nello stesso riquadro (niente collassa, CLS 0).
//
// E il service worker, registrato al `load`: senza di lui chi non passa
// dalla landing non ha la pagina offline (UX §4.7). Non mette in cache i bundle.
// ============================================================================
import { appInstallata, foglioCambiato } from './guida'
import { ms } from './tempi'

/** L'evento di Chromium che il DOM di TypeScript non conosce. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Passi = 'ios26' | 'ios' | 'ios-altro' | 'altro'

/** Quanto aspettare oltre l'uscita prima di nascondere (se `transitionend` non arriva). */
const RETE_MS = 80

const ua = navigator.userAgent
// iPadOS si dichiara «MacIntel»: va distinto dal Mac vero col touch.
const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Le istruzioni giuste per il telefono che le legge (UX LC12). */
function passiDelBrowser(): Passi {
  if (!isIOS) return 'altro'
  if (/CriOS|FxiOS|EdgiOS/i.test(ua)) return 'ios-altro'
  const v = /Version\/(\d+)/.exec(ua)
  return v && Number(v[1]) >= 26 ? 'ios26' : 'ios'
}

export function avviaInstalla() {
  const pulsanti = [...document.querySelectorAll<HTMLButtonElement>('[data-installa]')]
  const foglio = document.getElementById('installa')
  const velo = document.querySelector<HTMLElement>('.velo')
  const titolo = document.getElementById('installa-titolo')
  const annuncio = document.getElementById('installa-annuncio')
  if (!pulsanti.length || !foglio || !velo || !titolo) return
  monta(pulsanti, foglio, velo, titolo, annuncio)
}

function monta(pulsanti: HTMLButtonElement[], foglio: HTMLElement, velo: HTMLElement, titolo: HTMLElement, annuncio: HTMLElement | null) {

  // Già installata: aperta dall'icona in Home invece che dal browser.
  const installata =
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

  // Dal computer il pulsante c'è solo col prompt nativo, e si chiama «Installa l'app» (UX Q-L7).
  if (window.matchMedia?.('(pointer: fine)').matches && !isIOS) {
    for (const b of pulsanti) {
      const testo = [...b.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
      if (testo) testo.textContent = "Installa l'app"
    }
  }

  let differito: BeforeInstallPromptEvent | null = null
  const mostra = (si: boolean) => {
    for (const b of pulsanti) {
      if (b.hidden === !si) continue
      b.hidden = !si
      // Compare nel posto riservato, in ENTRATA: niente si sposta (MOTION §L5.6).
      if (si) b.setAttribute('data-compare', '')
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Niente mini-infobar di Chrome: il prompt lo lanciamo noi dal pulsante.
    e.preventDefault()
    differito = e as BeforeInstallPromptEvent
    if (!installata) mostra(true)
  })
  window.addEventListener('appinstalled', () => {
    differito = null
    if (!foglio.hidden) chiudi()
    // Ogni pulsante diventa la sua conseguenza, nello stesso posto (ML9).
    for (const b of pulsanti) {
      b.hidden = true
      const fatto = b.parentElement?.querySelector<HTMLElement>('.installa-fatto')
      if (fatto) {
        fatto.hidden = false
        fatto.setAttribute('data-compare', '')
      }
    }
    if (annuncio) annuncio.textContent = 'Fatto: Beach Diary è tra le tue app.'
    appInstallata()
  })
  if (!installata && isIOS) mostra(true)

  // ------------------------------------------------------------ Il foglio
  let opener: HTMLElement | null = null
  let fine = 0
  const fuori = () =>
    [
      document.querySelector('.skip-link'),
      document.querySelector('.barra'),
      document.querySelector('.avanza'),
      document.querySelector('.guida'),
      document.getElementById('guida-menu'),
      document.querySelector('main'),
      document.querySelector('footer'),
    ].filter((x): x is HTMLElement => x instanceof HTMLElement)
  let inertiPrima = new Map<HTMLElement, boolean>()

  function apri(passi: Passi, da: HTMLElement | null) {
    opener = da
    window.clearTimeout(fine)
    for (const ol of foglio.querySelectorAll<HTMLElement>('[data-passi]')) ol.hidden = ol.dataset.passi !== passi
    for (const n of foglio.querySelectorAll<HTMLElement>('[data-solo-ios]')) n.hidden = passi === 'altro'
    titolo.textContent = passi === 'altro' ? 'Installa Beach Diary' : 'Aggiungi alla schermata Home'
    velo.hidden = false
    foglio.hidden = false
    foglio.dataset.material = 'glass-thick'
    void foglio.offsetWidth // la transizione parte dallo stato chiuso
    velo.setAttribute('data-aperto', '')
    foglio.setAttribute('data-aperto', '')
    // Il resto della pagina sotto il velo: inerte, e fermo.
    inertiPrima = new Map(fuori().map((n) => [n, n.inert]))
    for (const n of fuori()) n.inert = true
    document.documentElement.setAttribute('data-bloccato', '')
    foglioCambiato(true)
    titolo.focus({ preventScroll: true }) // al titolo, a t0
  }

  function chiudi() {
    if (!foglio.hasAttribute('data-aperto')) return
    foglio.removeAttribute('data-aperto')
    velo.removeAttribute('data-aperto')
    // Chi esce smette di sfocare (MOTION §3.4).
    foglio.dataset.material = 'frost'
    document.documentElement.removeAttribute('data-bloccato')
    for (const [n, era] of inertiPrima) n.inert = era
    foglioCambiato(false)
    // Il fuoco torna a chi l'ha aperto; se era una voce del menu di Pallo,
    // ormai chiuso, a Pallo.
    const menu = document.getElementById('guida-menu')
    const guida = document.querySelector<HTMLElement>('.guida')
    const torna = opener && opener.isConnected && !opener.hidden && !menu?.contains(opener) ? opener : guida
    torna?.focus({ preventScroll: true })
    window.clearTimeout(fine)
    fine = window.setTimeout(() => {
      if (foglio.hasAttribute('data-aperto')) return
      foglio.hidden = true
      velo.hidden = true
      foglio.dataset.material = 'glass-thick'
    }, ms('--dur-svelto') + RETE_MS)
  }

  foglio.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-chiude]')) chiudi()
  })
  velo.addEventListener('click', chiudi)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && foglio.hasAttribute('data-aperto')) {
      e.preventDefault()
      chiudi()
    }
  })
  // Tab e Maiusc+Tab restano dentro il foglio.
  foglio.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return
    const f = [...foglio.querySelectorAll<HTMLElement>('button:not([hidden]), a[href]')]
    if (!f.length) return
    const primo = f[0]
    const ultimo = f[f.length - 1]
    const qui = document.activeElement
    if (e.shiftKey && (qui === primo || qui === titolo)) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && qui === ultimo) {
      e.preventDefault()
      primo.focus()
    }
  })

  for (const b of pulsanti) {
    b.addEventListener('click', async () => {
      if (!differito) {
        apri(passiDelBrowser(), b)
        return
      }
      try {
        await differito.prompt()
        await differito.userChoice
        // Il prompt si consuma comunque, accettato o no: i pulsanti vanno via
        // fino alla prossima visita, se Chrome rilancia l'evento. Meglio che
        // insistere.
        differito = null
        mostra(false)
      } catch {
        // Il prompt nativo non è partito (gesto perso, evento già consumato):
        // si spiega la strada a mano. Un pulsante muto sarebbe peggio.
        apri(isIOS ? passiDelBrowser() : 'altro', b)
      }
    })
  }

  // Il service worker: la pagina offline per tutto il sito (public/sw.js).
  if ('serviceWorker' in navigator) {
    const registra = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    if (document.readyState === 'complete') registra()
    else window.addEventListener('load', registra)
  }
}
