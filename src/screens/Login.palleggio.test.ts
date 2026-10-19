// ============================================================================
// Il palleggio della scena dell'accesso: il pallone parte dalle mani di chi
// colpisce e arriva a quelle dell'altro, passando per l'apice; a ogni volo
// tocca all'altro; il fotogramma fermo è il primo del palleggio vivo. E
// nessuna posa produce un tratto rotto (NaN in un `d` non si disegna).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { FERMO, FERMO_U, TEMPO_MS, avanza, fotogramma, posa, primoScambio } from './Login.palleggio'
import type { Scambio } from './Login.palleggio'

const scambio = (over: Partial<Scambio> = {}): Scambio => ({ chi: 0, a: 'palleggio', b: 'bagher', t0: 0, apice: 80, ...over })
// Il contatto nel disegno: il giocatore a sinistra ha i piedi in 84 e guarda
// a destra, quello a destra in 306 e guarda a sinistra; la sabbia è a 336.
const contatto = (lato: 0 | 1, colpo: 'palleggio' | 'bagher') => {
  const [x, y] = posa(colpo, 1, 0).pallone
  return lato === 0 ? [84 + x, 336 + y] : [306 - x, 336 + y]
}

describe('il volo del pallone', () => {
  it('parte dalle mani di chi colpisce, arriva a quelle dell\'altro e a metà volo è all\'apice', () => {
    const s = scambio()
    const inizio = fotogramma(s, 0).pallone
    const meta = fotogramma(s, TEMPO_MS / 2).pallone
    const fine = fotogramma(s, TEMPO_MS).pallone
    expect([inizio.x, inizio.y]).toEqual(contatto(0, 'palleggio'))
    expect(meta.y).toBeCloseTo(80)
    expect(fine.x).toBeCloseTo(contatto(1, 'bagher')[0])
    expect(fine.y).toBeCloseTo(contatto(1, 'bagher')[1])
  })

  it('nel volo inverso va da destra a sinistra e il pallone gira al contrario', () => {
    const s = scambio({ chi: 1, a: 'bagher', b: 'palleggio' })
    const a = fotogramma(s, 100)
    const b = fotogramma(s, 400)
    expect(b.pallone.x).toBeLessThan(a.pallone.x)
    expect(Math.sign(fotogramma(scambio(), 100).pallone.giro)).toBe(1)
    expect(Math.sign(a.pallone.giro)).toBe(-1)
  })

  it('l\'ombra sulla sabbia segue il pallone: più è alto, più è piccola e chiara', () => {
    const s = scambio()
    const basso = fotogramma(s, 0)
    const alto = fotogramma(s, TEMPO_MS / 2)
    expect(alto.ombra.x).toBe(alto.pallone.x)
    expect(alto.ombra.scala).toBeLessThan(basso.ombra.scala)
    expect(alto.ombra.opacita).toBeLessThan(basso.ombra.opacita)
  })
})

describe('lo scambio', () => {
  it('dentro un volo resta lo stesso; finito il volo tocca all\'altro, che risponde col colpo annunciato', () => {
    const s = scambio()
    expect(avanza(s, TEMPO_MS - 1)).toBe(s)
    const dopo = avanza(s, TEMPO_MS + 10, () => 0.9)
    expect(dopo).toMatchObject({ chi: 1, a: 'bagher', b: 'bagher', t0: TEMPO_MS })
    expect(dopo.apice).toBeGreaterThanOrEqual(62)
    expect(dopo.apice).toBeLessThanOrEqual(100)
    expect(avanza(dopo, 2 * TEMPO_MS + 10, () => 0.1)).toMatchObject({ chi: 0, a: 'bagher', b: 'palleggio' })
  })

  it('recupera i voli di qualche fotogramma perso, ma dopo una lunga pausa ricomincia da capo', () => {
    expect(avanza(scambio(), 3 * TEMPO_MS + 1, () => 0.5)).toMatchObject({ chi: 1, t0: 3 * TEMPO_MS })
    expect(avanza(scambio(), 60 * TEMPO_MS)).toEqual(primoScambio(60 * TEMPO_MS))
    expect(avanza(null, 500)).toEqual(primoScambio(500))
  })

  it('il fotogramma fermo è il primo del palleggio vivo: la giocatrice ha appena alzato il pallone', () => {
    const ora = 12_345
    expect(fotogramma(avanza(null, ora), ora)).toEqual(FERMO)
    const [x0] = contatto(0, 'palleggio')
    expect(FERMO_U).toBeGreaterThan(0)
    expect(FERMO.pallone.x).toBeGreaterThan(x0)
    expect(FERMO.pallone.x).toBeLessThan(180) // ancora dal suo lato della rete
  })
})

describe('le pose', () => {
  it('nessun tratto rotto, dal riposo al colpo pieno e con la spinta', () => {
    for (const colpo of ['palleggio', 'bagher'] as const) {
      for (const w of [0, 0.25, 0.5, 0.75, 1]) {
        for (const spinta of [0, 0.5, 1]) {
          const p = posa(colpo, w, spinta)
          const tratti = [p.gambaDietro, p.gambaAvanti, p.busto, p.braccioVicino, p.braccioLontano, p.coda, p.visiera]
          for (const d of tratti) expect(d).toMatch(/^M-?\d/)
          expect(tratti.join(' ')).not.toMatch(/NaN|Infinity/)
          expect([...p.testa, ...p.pallone].every(Number.isFinite)).toBe(true)
        }
      }
    }
  })

  it('il palleggio porta le mani sopra la testa, il bagher le braccia davanti alla vita', () => {
    const palleggio = posa('palleggio', 1, 0)
    const bagher = posa('bagher', 1, 0)
    expect(palleggio.pallone[1]).toBeLessThan(palleggio.testa[1])
    expect(bagher.pallone[1]).toBeGreaterThan(bagher.testa[1])
    expect(bagher.pallone[0]).toBeGreaterThan(palleggio.pallone[0])
  })
})
