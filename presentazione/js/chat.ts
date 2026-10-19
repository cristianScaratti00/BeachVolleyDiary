// ============================================================================
// «Cosa registriamo?» (UX §L6.3, §L7.9, FL4; MOTION §L5.8).
//
// Il ＋ dell'app che si apre nel menu (una volta per sessione, LM4), le
// quattro voci come tablist verticale, e la mini chat «Raccontalo a Pallo»
// sul copione vero dell'assistente (`chat.passi.ts` → `copione.ts`). La pausa
// «Pallo scrive» è ritmo, non un cancello: qualunque tocco o tasto la salta.
// Il registro ha altezza fissa e scorre dentro (ML10).
// ============================================================================
import { DATI } from './generati/dati'
import { INTRO, RIPARTENZA, battitura, bozza, domandaDi, riepilogo, scelte } from './chat.passi'
import type { Draft, NomiChat, PassoChat, Scelta } from './chat.passi'
import { Pallo } from './pallo'
import { arma, movimentoFermo } from './movimento'
import { ms } from './tempi'

/** Il ＋ si apre quando è visibile almeno così (SOGLIA_EFFETTO di #registra). */
const SOGLIA_REGISTRA = 0.6
/** Il registro si porta in fondo solo se chi legge era già a meno di così dal fondo. */
const VICINO_AL_FONDO = 80

export function avviaRegistra() {
  const sezione = document.getElementById('registra')
  if (!sezione) return
  avviaVoci(sezione)
  avviaChat(sezione)
  sezione.setAttribute('data-viva', '')
}

// ------------------------------------------------------- Le voci del ＋
function avviaVoci(sezione: HTMLElement) {
  const lista = sezione.querySelector<HTMLElement>('.voci')
  const piu = sezione.querySelector<HTMLElement>('.registra-piu')
  const voci = [...sezione.querySelectorAll<HTMLElement>('.voce')]
  if (!lista || !voci.length) return
  const pannello = (v: HTMLElement) => sezione.querySelector<HTMLElement>(`.pannello-voce[data-voce="${v.dataset.voce}"]`)

  lista.setAttribute('role', 'tablist')
  lista.setAttribute('aria-orientation', 'vertical')
  for (const v of voci) {
    const k = v.dataset.voce ?? ''
    v.id = `voce-${k}`
    v.setAttribute('role', 'tab')
    const p = pannello(v)
    if (p) {
      p.id = `pannello-${k}`
      p.setAttribute('role', 'tabpanel')
      p.setAttribute('aria-labelledby', v.id)
      v.setAttribute('aria-controls', p.id)
    }
  }
  // Il pannello cambia nello stesso fotogramma, senza dissolvenza; la voce
  // scelta prende il filo di colpo: è uno stato (MOTION §L5.8).
  const scegli = (scelta: HTMLElement, fuoco: boolean) => {
    for (const v of voci) {
      const si = v === scelta
      v.setAttribute('aria-selected', String(si))
      v.tabIndex = si ? 0 : -1
      const p = pannello(v)
      if (p) p.hidden = !si
    }
    if (fuoco) scelta.focus()
  }
  scegli(voci.find((v) => v.dataset.voce === 'chat') ?? voci[0], false)
  for (const v of voci) v.addEventListener('click', () => scegli(v, true))
  lista.addEventListener('keydown', (e) => {
    const i = voci.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    const tasti: Record<string, number> = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: voci.length - 1 }
    const k = tasti[e.key]
    if (k === undefined) return
    e.preventDefault()
    scegli(voci[(k + voci.length) % voci.length], true)
  })

  // LM4: il ＋ si apre una volta, quando entra in vista; armato solo se
  // all'avvio era fuori vista (RL3), aperto subito se ci si arriva col Tab (RL4).
  if (piu) {
    arma(piu, {
      chiave: 'registra',
      soglia: SOGLIA_REGISTRA,
      fuoco: sezione.querySelector('.registra') ?? sezione,
      scatta: () => {
        // A t0: il ＋ fa la pressione e il menu si apre da lui.
        piu.setAttribute('data-premuto', '')
        piu.setAttribute('data-aperto', '')
        window.setTimeout(() => piu.removeAttribute('data-premuto'), ms('--dur-press') + ms('--rise-step'))
      },
    })
  }
}

// ------------------------------------------------------------ La chat
function avviaChat(sezione: HTMLElement) {
  const chat = sezione.querySelector<HTMLElement>('.chat')
  const log = chat?.querySelector<HTMLElement>('.chat-log')
  const righe = chat?.querySelector<HTMLOListElement>('.chat-righe')
  const gruppo = chat?.querySelector<HTMLElement>('.chat-risposte')
  const svg = chat?.querySelector<SVGSVGElement>('.chat-avatar svg.pallo')
  if (!chat || !log || !righe || !gruppo || !svg) return
  montaChat(chat, log, righe, gruppo, svg)
}

/** `log` è il contenitore che scorre (role="log"), `righe` l'elenco delle bolle. */
function montaChat(chat: HTMLElement, log: HTMLElement, righe: HTMLOListElement, gruppo: HTMLElement, svg: SVGSVGElement) {
  const avatar = new Pallo(svg, { testa: true, vivo: false })
  const nomi: NomiChat = { tornei: DATI.chat.tornei, compagni: DATI.chat.compagni, oggi: new Date().toISOString().slice(0, 10) }

  let passo: PassoChat = 'name'
  let d: Draft = bozza(nomi)
  let inPausa: (() => void) | null = null
  let pausa = 0

  const vicinoAlFondo = () => log.scrollHeight - log.scrollTop - log.clientHeight < VICINO_AL_FONDO
  function inFondo(eraVicino: boolean) {
    if (eraVicino) log.scrollTo({ top: log.scrollHeight, behavior: movimentoFermo() ? 'auto' : 'smooth' })
  }
  function messaggio(testo: string, chi: 'pallo' | 'tu', nuovo = true): HTMLLIElement {
    const vicino = vicinoAlFondo()
    const li = document.createElement('li')
    li.className = 'msg'
    li.dataset.chi = chi
    if (nuovo) li.setAttribute('data-nuovo', '')
    li.textContent = testo
    righe.append(li)
    inFondo(vicino)
    return li
  }
  function card(coppie: [string, string][]) {
    const vicino = vicinoAlFondo()
    const li = document.createElement('li')
    li.className = 'msg chat-riepilogo'
    li.dataset.chi = 'pallo'
    li.setAttribute('data-nuovo', '')
    const dl = document.createElement('dl')
    for (const [k, v] of coppie) {
      const riga = document.createElement('div')
      const dt = document.createElement('dt')
      dt.textContent = k
      const dd = document.createElement('dd')
      dd.textContent = v
      riga.append(dt, dd)
      dl.append(riga)
    }
    li.append(dl)
    righe.append(li)
    inFondo(vicino)
  }
  function risposte(lista: { testo: string; fai: () => void }[]) {
    gruppo.replaceChildren(
      ...lista.map(({ testo, fai }) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'chat-risposta'
        b.textContent = testo
        b.addEventListener('click', fai)
        return b
      }),
    )
    gruppo.removeAttribute('aria-busy')
  }
  const rispostePer = (p: PassoChat) =>
    p === 'fine' ? [{ testo: 'Ricomincia', fai: ricomincia }] : scelte(p, nomi).map((s) => ({ testo: s.testo, fai: () => rispondi(s) }))

  function rispondi(s: Scelta) {
    if (inPausa) inPausa()
    // L'eco del tocco, subito; le risposte vecchie escono dal DOM a t0; il
    // fuoco va al gruppo delle risposte, che aspetta (UX §L6.3).
    messaggio(s.testo, 'tu')
    gruppo.replaceChildren()
    gruppo.setAttribute('aria-busy', 'true')
    gruppo.focus({ preventScroll: true })
    d = s.applica(d)
    passo = s.prossimo
    const testo = domandaDi(passo, d, nomi)
    const dopo = () => {
      inPausa = null
      window.clearTimeout(pausa)
      scrive?.remove()
      const fine = passo === 'fine'
      avatar.setUmore(fine ? 'contento' : 'testa')
      const li = messaggio(testo, 'pallo')
      if (passo === 'recap') card(riepilogo(d, nomi))
      risposte(rispostePer(passo))
      // A fine conversazione il fuoco va al messaggio finale.
      if (fine) {
        li.tabIndex = -1
        li.focus({ preventScroll: true })
      }
    }
    const attesa = movimentoFermo() ? 0 : battitura(testo.length)
    let scrive: HTMLLIElement | null = null
    if (!attesa) return dopo()
    avatar.setUmore('pensa')
    scrive = document.createElement('li')
    scrive.className = 'msg msg-scrive'
    scrive.setAttribute('aria-hidden', 'true')
    scrive.append(document.createElement('span'), document.createElement('span'), document.createElement('span'))
    const vicino = vicinoAlFondo()
    righe.append(scrive)
    inFondo(vicino)
    inPausa = dopo
    pausa = window.setTimeout(dopo, attesa)
  }

  function ricomincia() {
    if (inPausa) inPausa()
    // La conversazione riparte, non arriva: di colpo, senza pausa.
    righe.replaceChildren()
    passo = 'name'
    d = bozza(nomi)
    avatar.setUmore('testa')
    for (const t of RIPARTENZA) messaggio(t, 'pallo', false)
    risposte(rispostePer(passo))
    gruppo.querySelector('button')?.focus({ preventScroll: true })
  }

  // Qualunque tocco o tasto nella chat salta la pausa: ritmo, non un cancello.
  for (const ev of ['pointerdown', 'keydown'] as const) chat.addEventListener(ev, () => inPausa?.())

  // L'apertura c'è già, senza pausa (INTRO): la trascrizione scritta per chi
  // non ha JavaScript lascia il posto alla chat viva.
  righe.replaceChildren()
  for (const t of INTRO) messaggio(t, 'pallo', false)
  risposte(rispostePer(passo))
}
