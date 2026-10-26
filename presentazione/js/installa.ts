// ============================================================================
// «Aggiungi Beach Diary alla Home»: il solo JavaScript della landing.
//
// La sezione #installa si legge anche senza di lui: i passi per iPhone,
// Android e computer sono testo. Il modulo aggiunge solo ciò che il testo
// non può fare:
//   - dove il browser lo permette (`beforeinstallprompt`: Chrome, Edge,
//     Samsung Internet su Android e computer) il pulsante installa davvero,
//     col prompt nativo;
//   - su iPhone e iPad nessuna API installa: il pulsante apre il dialogo
//     coi passi giusti per quel browser;
//   - aperta dall'icona (`display-mode: standalone`) o appena installata
//     (`appinstalled`), al posto del pulsante c'è la conseguenza, nello
//     stesso posto riservato (CLS 0);
//   - altrove il pulsante resta nascosto: bastano i passi scritti.
// E il service worker (public/sw.js), come fa l'app in src/main.tsx: chi
// installa da qui ha la pagina senza rete anche senza aver aperto l'app.
//
// Portato da `presentazione/js/install.ts` della landing di prima (518c298),
// semplificato: il dialogo è un <dialog> nativo, che da solo tiene il fuoco
// dentro, rende inerte il resto e si chiude con Esc.
// ============================================================================

/** L'evento di Chromium che il DOM di TypeScript non conosce. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Le varianti dei passi nel dialogo (`data-passi`). */
export type Passi = 'ios26' | 'ios' | 'ios-altro' | 'altro'

// iPadOS si dichiara «MacIntel»: va distinto dal Mac vero dal touch.
function suIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** I passi giusti per il browser che legge. */
export function passiDelBrowser(): Passi {
  const ua = navigator.userAgent
  if (!suIOS()) return 'altro'
  if (/CriOS|FxiOS|EdgiOS/i.test(ua)) return 'ios-altro'
  const v = /Version\/(\d+)/.exec(ua)
  return v && Number(v[1]) >= 26 ? 'ios26' : 'ios'
}

function giaInstallata(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function avviaInstalla(): void {
  const pulsante = document.querySelector<HTMLButtonElement>('button[data-installa]')
  const fatto = document.querySelector<HTMLElement>('.installa-fatto')
  const annuncio = document.getElementById('installa-annuncio')
  const dialogo = document.querySelector<HTMLDialogElement>('dialog.installa-dialogo')
  if (!pulsante || !fatto || !annuncio || !dialogo) return
  monta(pulsante, fatto, annuncio, dialogo)
}

function monta(pulsante: HTMLButtonElement, fatto: HTMLElement, annuncio: HTMLElement, dialogo: HTMLDialogElement) {
  const titolo = dialogo.querySelector<HTMLElement>('h2')
  let differito: BeforeInstallPromptEvent | null = null

  const mostra = (si: boolean) => {
    pulsante.hidden = !si
  }
  // Il pulsante diventa la sua conseguenza, nello stesso posto.
  const installata = (testo: string) => {
    differito = null
    pulsante.hidden = true
    fatto.hidden = false
    if (dialogo.open) dialogo.close()
    annuncio.textContent = testo
  }

  if (giaInstallata()) {
    fatto.hidden = false
    return
  }

  // Dal computer si installa una finestra, non un'icona sulla Home.
  if (!suIOS() && window.matchMedia?.('(pointer: fine)').matches) pulsante.textContent = "Installa l'app"

  window.addEventListener('beforeinstallprompt', (e) => {
    // Niente mini-infobar di Chrome: il prompt parte dal pulsante.
    e.preventDefault()
    differito = e as BeforeInstallPromptEvent
    mostra(true)
  })
  window.addEventListener('appinstalled', () => installata('Fatto: Beach Diary è tra le tue app.'))
  if (suIOS()) mostra(true)

  // ------------------------------------------------------------ Il dialogo
  function apri(passi: Passi) {
    for (const ol of dialogo.querySelectorAll<HTMLElement>('[data-passi]')) ol.hidden = ol.dataset.passi !== passi
    dialogo.showModal()
    // Il fuoco al titolo, a t0: si legge da capo.
    titolo?.focus({ preventScroll: true })
  }

  dialogo.addEventListener('click', (e) => {
    // Un clic sul velo arriva al <dialog> stesso: il contenuto lo copre tutto.
    if (e.target === dialogo || (e.target as Element).closest('[data-chiude]')) dialogo.close()
  })

  pulsante.addEventListener('click', async () => {
    if (!differito) {
      apri(passiDelBrowser())
      return
    }
    const evento = differito
    try {
      await evento.prompt()
      await evento.userChoice
      // Il prompt si consuma comunque: il pulsante va via finché Chrome non
      // rilancia l'evento. Se era un sì, arriva `appinstalled` e al suo posto
      // compare la conseguenza.
      differito = null
      mostra(false)
    } catch {
      // Il prompt nativo non è partito (evento già consumato): si spiega la
      // strada a mano. Un pulsante muto sarebbe peggio.
      differito = null
      apri('altro')
    }
  })
}

// Il service worker: la pagina senza rete per tutto il sito. Solo in
// produzione: in sviluppo si metterebbe in mezzo alle navigazioni di Vite.
function registraServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const registra = () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
  if (document.readyState === 'complete') registra()
  else window.addEventListener('load', registra)
}

avviaInstalla()
registraServiceWorker()
