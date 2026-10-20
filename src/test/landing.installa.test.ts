// ============================================================================
// «Installa sul telefono» e il foglio d'istruzioni (UX.md FL5, §L7.12,
// §L12.10, §L14.2): quale pulsante c'è e dove, il prompt nativo di Chromium,
// le quattro varianti dei passi scelte dallo user agent, il dialogo modale
// (fuoco al titolo, Tab chiuso dentro, Esc, fuoco restituito, il resto
// `inert`), `appinstalled` e il service worker.
// ============================================================================
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/dom'
import { montaLanding, promptNativo, UA } from './landing'
import type { Landing, OpzioniLanding } from './landing'

let h: Landing | null = null
const monta = async (o: OpzioniLanding = {}) => (h = await montaLanding(o))
afterEach(() => {
  h?.smonta()
  h = null
})

const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
const eroe = () => document.getElementById('inizio') as HTMLElement
const installaEroe = () => within(eroe()).queryByRole('button', { name: /^Installa/ })
const pulsanti = () => [...document.querySelectorAll<HTMLButtonElement>('[data-installa]')]
const foglio = () => screen.queryByRole('dialog')
const passiVisti = () => [...document.querySelectorAll<HTMLElement>('#installa [data-passi]')].filter((o) => !o.hidden).map((o) => o.dataset.passi)
const guida = () => document.querySelector<HTMLButtonElement>('button.guida') as HTMLButtonElement
/** Il fuoco è su qualcosa che si può davvero avere a fuoco: niente body, niente nascosto o inerte (§L8.2). */
function fuocoValido() {
  const a = document.activeElement as HTMLElement | null
  if (!a || a === document.body) return false
  return !a.closest('[inert], [hidden]')
}

describe('dove c\'è il pulsante (UX FL5, §L6.0)', () => {
  it('Safari su iPhone: nell\'hero, nel finale e nel menu di Pallo, nel posto riservato', async () => {
    await monta()
    expect(pulsanti().map((b) => b.hidden)).toEqual([false, false, false])
    expect(installaEroe()).toHaveTextContent('Installa sul telefono')
    expect(within(document.getElementById('guida-menu') as HTMLElement).getByRole('button', { name: "Installa l'app", hidden: true })).toBeInTheDocument()
    for (const b of pulsanti()) expect(b).toHaveAttribute('data-compare')
  })

  it('Android: solo quando Chromium offre il prompt, e senza la mini-infobar', async () => {
    await monta({ ua: UA.android, platform: 'Linux armv8l' })
    expect(pulsanti().every((b) => b.hidden)).toBe(true)
    const { evento } = promptNativo()
    h!.emetti(evento)
    expect(evento.defaultPrevented).toBe(true)
    expect(pulsanti().every((b) => !b.hidden)).toBe(true)
  })

  it('dal computer niente pulsante; col prompt nativo si chiama «Installa l\'app»', async () => {
    await monta({ mouse: true, ua: UA.mac, platform: 'MacIntel' })
    expect(installaEroe()).toBeNull()
    h!.emetti(promptNativo().evento)
    expect(installaEroe()).toHaveAccessibleName("Installa l'app")
    expect(screen.getByText('È fatta per il telefono: apri bv-diary.vercel.app dal tuo.')).toBeInTheDocument()
  })

  it('già installata (aperta dall\'icona): nessun pulsante, in nessun punto, nemmeno col prompt', async () => {
    await monta({ standalone: true })
    expect(pulsanti().every((b) => b.hidden)).toBe(true)
    h!.emetti(promptNativo().evento)
    expect(pulsanti().every((b) => b.hidden)).toBe(true)
  })

  it('registra il service worker per tutto il sito', async () => {
    await monta()
    expect(h!.registra).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })
})

describe('il prompt nativo (UX FL5)', () => {
  const android = { ua: UA.android, platform: 'Linux armv8l' }

  it('accettato: il prompt parte dal pulsante, i pulsanti vanno via; poi appinstalled li fa diventare il loro status', async () => {
    await monta(android)
    const { evento, prompt } = promptNativo('accepted')
    h!.emetti(evento)
    await h!.user.click(installaEroe() as HTMLElement)
    await h!.passa(0)
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(foglio()).toBeNull()
    expect(pulsanti().every((b) => b.hidden)).toBe(true)
    h!.emetti(new Event('appinstalled'))
    expect(within(eroe()).getByText('Fatto: Beach Diary è tra le tue app.')).toBeVisible()
    expect(document.getElementById('installa-annuncio')).toHaveTextContent('Fatto: Beach Diary è tra le tue app.')
    expect(document.getElementById('installa-annuncio')).toHaveAttribute('role', 'status')
  })

  it('rifiutato: i pulsanti vanno via fino alla prossima visita, senza insistere', async () => {
    await monta(android)
    h!.emetti(promptNativo('dismissed').evento)
    await h!.user.click(installaEroe() as HTMLElement)
    await h!.passa(0)
    expect(pulsanti().every((b) => b.hidden)).toBe(true)
    expect(foglio()).toBeNull()
  })

  it('il prompt non parte (gesto perso): si spiega la strada a mano, variante «altro»', async () => {
    await monta(android)
    h!.emetti(promptNativo('errore').evento)
    await h!.user.click(installaEroe() as HTMLElement)
    await h!.passa(0)
    expect(screen.getByRole('dialog', { name: 'Installa Beach Diary' })).toBeVisible()
    expect(passiVisti()).toEqual(['altro'])
    expect(screen.queryByText("Se l'hai già aggiunta, la trovi tra le tue app.")).not.toBeVisible()
  })

  it('l\'app installata con la guida in scena: Pallo fa festa e lo dice', async () => {
    await monta(android)
    await h!.scorri('diario')
    await h!.passa(4500)
    h!.emetti(new Event('appinstalled'))
    await h!.passa(300)
    expect(guida().querySelector('svg')).toHaveAttribute('data-umore', 'festa')
    expect(guida()).toHaveAccessibleDescription('Fatto: mi trovi tra le tue app.')
  })
})

describe('il foglio d\'istruzioni (UX §L7.12)', () => {
  const apriDallEroe = async () => {
    const b = installaEroe() as HTMLElement
    await h!.user.click(b)
    return b
  }

  it('si apre come dialogo modale: titolo e testo per nome, il fuoco al titolo, il resto inerte e fermo', async () => {
    await monta()
    await apriDallEroe()
    const d = screen.getByRole('dialog', { name: 'Aggiungi alla schermata Home' })
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(d).toHaveAccessibleDescription("Beach Diary si apre a tutto schermo, come un'app.")
    expect(screen.getByRole('heading', { name: 'Aggiungi alla schermata Home' })).toHaveFocus()
    for (const sel of ['main', 'nav.barra', 'button.guida', '#guida-menu', 'footer', '.skip-link']) expect((document.querySelector(sel) as HTMLElement).inert, sel).toBe(true)
    expect(document.documentElement).toHaveAttribute('data-bloccato')
    expect(passiVisti()).toEqual(['ios26'])
    expect(within(d).getByText("Se l'hai già aggiunta, la trovi tra le tue app.")).toBeVisible()
  })

  it('Tab e Maiusc+Tab restano dentro il foglio', async () => {
    await monta()
    await apriDallEroe()
    const chiudi = screen.getByRole('button', { name: 'Chiudi' })
    const ok = screen.getByRole('button', { name: 'Ho capito' })
    await h!.user.tab({ shift: true })
    expect(ok).toHaveFocus()
    await h!.user.tab()
    expect(chiudi).toHaveFocus()
    await h!.user.tab({ shift: true })
    expect(ok).toHaveFocus()
    await h!.user.tab({ shift: true })
    expect(foglio()?.contains(document.activeElement)).toBe(true)
  })

  it.each([
    ['Esc', async () => h!.user.keyboard('{Escape}')],
    ['×', async () => h!.user.click(screen.getByRole('button', { name: 'Chiudi' }))],
    ['«Ho capito»', async () => h!.user.click(screen.getByRole('button', { name: 'Ho capito' }))],
    ['un tocco sul velo', async () => h!.user.click(document.querySelector('.velo') as HTMLElement)],
  ])('%s chiude: il fuoco torna a chi l\'ha aperto e la pagina torna viva', async (_, gesto) => {
    await monta()
    const apre = await apriDallEroe()
    await gesto()
    expect(apre).toHaveFocus()
    expect(fuocoValido()).toBe(true)
    expect(document.querySelector('main')?.inert).toBe(false)
    expect(document.documentElement).not.toHaveAttribute('data-bloccato')
    await h!.passa(200)
    expect(foglio()).toBeNull()
  })

  it('aperto dal menu di Pallo: il menu si chiude, e alla chiusura il fuoco va a Pallo (non a una voce nascosta)', async () => {
    await monta()
    await h!.scorri('diario')
    await h!.passa(4500)
    await h!.user.click(guida())
    const menu = document.getElementById('guida-menu') as HTMLElement
    await h!.user.click(within(menu).getByRole('button', { name: "Installa l'app" }))
    expect(guida()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'Aggiungi alla schermata Home' })).toHaveFocus()
    await h!.passa(100)
    await h!.user.keyboard('{Escape}')
    expect(guida()).toHaveFocus()
    expect(fuocoValido()).toBe(true)
    await h!.passa(100)
    expect(guida().dataset.stato).toBe('dentro')
  })

  it('la guida esce mentre il foglio è aperto, senza nuvoletta', async () => {
    await monta()
    await h!.scorri('diario')
    await h!.passa(4500)
    await h!.user.click(within(document.getElementById('comincia') as HTMLElement).getByRole('button', { name: 'Installa sul telefono' }))
    await h!.passa(100)
    expect(guida().dataset.stato).toBeUndefined()
    expect(document.getElementById('guida-bolla')).not.toHaveAttribute('data-visibile')
  })

  it('appinstalled a foglio aperto lo chiude', async () => {
    await monta()
    await apriDallEroe()
    h!.emetti(new Event('appinstalled'))
    expect(document.querySelector('#installa')).not.toHaveAttribute('data-aperto')
    expect(document.querySelector('main')?.inert).toBe(false)
  })

  it('axe col foglio aperto', async () => {
    await monta()
    await apriDallEroe()
    await h!.axe()
  })
})

describe('le istruzioni giuste per il telefono che le legge (UX §L12.10, Q-L9)', () => {
  it.each([
    ['Safari iOS 26', { ua: UA.safari26 }, 'ios26', 'Aggiungi alla schermata Home'],
    ['Safari fino a iOS 18', { ua: UA.safari18 }, 'ios', 'Aggiungi alla schermata Home'],
    ['Chrome su iOS', { ua: UA.chromeIos }, 'ios-altro', 'Aggiungi alla schermata Home'],
    ['iPadOS (si dichiara MacIntel, col touch)', { ua: IPAD, platform: 'MacIntel', maxTouchPoints: 5 }, 'ios26', 'Aggiungi alla schermata Home'],
  ] as [string, OpzioniLanding, string, string][])('%s → «%s»', async (_, o, passi, titolo) => {
    await monta(o)
    await h!.user.click(installaEroe() as HTMLElement)
    expect(screen.getByRole('dialog', { name: titolo })).toBeVisible()
    expect(passiVisti()).toEqual([passi])
  })

  it('un Mac vero col trackpad non è un iPad: niente pulsante senza il prompt', async () => {
    await monta({ ua: UA.mac, platform: 'MacIntel', maxTouchPoints: 0, mouse: true })
    expect(pulsanti().every((b) => b.hidden)).toBe(true)
  })
})
