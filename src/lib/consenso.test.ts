// ============================================================================
// Consenso ai cookie. Qui si verifica la regola che regge tutto: **niente si
// accende prima di un sì esplicito**. Le altre proprietà (revoca, scadenza per
// versione, storage rotto) esistono per non lasciare scappatoie a quella.
//
// Il modulo tiene lo stato in una variabile a livello di modulo, quindi ogni
// test lo ricarica con `resetModules` + import dinamico: senza, il secondo test
// erediterebbe la scelta del primo.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const init = vi.hoisted(() => vi.fn())
const consent = vi.hoisted(() => vi.fn())
vi.mock('@microsoft/clarity', () => ({ default: { init, consent, identify: vi.fn() } }))

type Modulo = typeof import('./consenso')

// Ricarica il modulo da zero, così `corrente` riparte da ciò che c'è in storage.
async function carica(): Promise<Modulo> {
  vi.resetModules()
  return import('./consenso')
}

beforeEach(() => {
  localStorage.clear()
  init.mockClear()
  consent.mockClear()
  // In test `import.meta.env.PROD` è false, quindi `accendi()` esce subito: per
  // poter osservare l'accensione la si simula come in produzione.
  vi.stubEnv('PROD', true)
})
afterEach(() => vi.unstubAllEnvs())

describe('consenso — niente parte prima della scelta', () => {
  it('senza scelta il tracciamento resta spento', async () => {
    const m = await carica()
    expect(m.sceltaCorrente()).toBeNull()
    expect(m.analiticiAttivi()).toBe(false)
    m.avviaTracciamentoSeConsentito()
    expect(init).not.toHaveBeenCalled()
  })

  it('il rifiuto non accende niente', async () => {
    const m = await carica()
    m.decidi('rifiutato')
    expect(m.analiticiAttivi()).toBe(false)
    expect(init).not.toHaveBeenCalled()
  })

  it('solo un sì esplicito accende Clarity', async () => {
    const m = await carica()
    m.decidi('accettato')
    expect(m.analiticiAttivi()).toBe(true)
    expect(init).toHaveBeenCalledTimes(1)
  })
})

describe('consenso — la scelta sopravvive alla visita', () => {
  it('accettato una volta, riacceso al caricamento successivo', async () => {
    const primo = await carica()
    primo.decidi('accettato')

    const dopo = await carica() // nuova visita: rilegge da localStorage
    expect(dopo.sceltaCorrente()).toBe('accettato')
    init.mockClear()
    dopo.avviaTracciamentoSeConsentito()
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('rifiutato una volta, non riparte mai da solo', async () => {
    const primo = await carica()
    primo.decidi('rifiutato')

    const dopo = await carica()
    expect(dopo.sceltaCorrente()).toBe('rifiutato')
    dopo.avviaTracciamentoSeConsentito()
    expect(init).not.toHaveBeenCalled()
  })
})

describe('consenso — si può tornare indietro', () => {
  it('riaprire la scelta riporta allo stato "non deciso"', async () => {
    const m = await carica()
    m.decidi('accettato')
    m.riapriScelta()
    expect(m.sceltaCorrente()).toBeNull()
    expect(m.analiticiAttivi()).toBe(false)
  })

  it('e non resta niente in storage da cui ripartire', async () => {
    const m = await carica()
    m.decidi('accettato')
    m.riapriScelta()
    const dopo = await carica()
    expect(dopo.sceltaCorrente()).toBeNull()
  })
})

describe('consenso — quando la scelta non vale più', () => {
  it('una scelta salvata con una versione precedente viene richiesta di nuovo', async () => {
    // Aggiungendo uno strumento nuovo si alza CONSENSO_VERSIONE: il sì dato per
    // gli strumenti di prima non può valere anche per quello nuovo.
    localStorage.setItem('bvd_consenso_cookie', JSON.stringify({ v: 0, scelta: 'accettato', quando: '2026-01-01T00:00:00.000Z' }))
    const m = await carica()
    expect(m.sceltaCorrente()).toBeNull()
    m.avviaTracciamentoSeConsentito()
    expect(init).not.toHaveBeenCalled()
  })

  it('un record illeggibile vale come "non ha scelto", non come consenso', async () => {
    localStorage.setItem('bvd_consenso_cookie', '{rotto')
    const m = await carica()
    expect(m.sceltaCorrente()).toBeNull()
  })

  it('un valore fuori dai due ammessi non viene creduto', async () => {
    const { CONSENSO_VERSIONE } = await carica()
    localStorage.setItem('bvd_consenso_cookie', JSON.stringify({ v: CONSENSO_VERSIONE, scelta: 'forse', quando: '' }))
    const m = await carica()
    expect(m.sceltaCorrente()).toBeNull()
  })
})

describe('consenso — storage non disponibile', () => {
  it('se localStorage esplode non si tratta come consenso', async () => {
    // Safari in navigazione privata, quota piena: leggere lancia. Lo stato
    // sicuro è "non ha ancora scelto".
    const spia = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('no storage') })
    const m = await carica()
    expect(m.sceltaCorrente()).toBeNull()
    expect(m.analiticiAttivi()).toBe(false)
    spia.mockRestore()
  })

  it('scrivere può fallire senza far cadere l’app: la scelta vale per la sessione', async () => {
    const m = await carica()
    const spia = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => m.decidi('accettato')).not.toThrow()
    expect(m.analiticiAttivi()).toBe(true) // in memoria sì, su disco no
    spia.mockRestore()
  })
})

describe('consenso — in sviluppo non si traccia mai', () => {
  it('anche accettando, fuori produzione Clarity non parte', async () => {
    vi.stubEnv('PROD', false)
    const m = await carica()
    m.decidi('accettato')
    expect(m.analiticiAttivi()).toBe(true) // la scelta è registrata…
    expect(init).not.toHaveBeenCalled()    // …ma non si accende niente
  })
})
