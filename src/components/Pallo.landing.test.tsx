// ============================================================================
// Pallo e la scena del Benvenuto per la landing `/presentazione`, che non ha
// React. Il test rende i VERI componenti con `renderToStaticMarkup` e scrive
// il markup in due moduli TypeScript generati, che la landing importa:
//
//   presentazione/js/generati/pallo.ts   i 14 umori di Pallo.tsx (+ le teste)
//   presentazione/js/generati/scena.ts   i tre piani di Login.scena.tsx
//
// Sono file-snapshot: se Pallo o la scena cambiano nell'app, questo test
// fallisce finché non si rigenerano, e così il sito non resta indietro.
//
//   npx vitest run src/components/Pallo.landing.test.tsx -u
//
// I due moduli generati non importano niente (nemmeno un tipo): li legge
// anche vite.config.ts, che non deve tirarsi dietro i file di src.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LIT } from '../lib/theme'
import { PALETTES } from './wrapped/palette'
import { Pallo } from './Pallo'
import { PALLO_UMORI } from './Pallo.vita'
import type { PalloUmore } from './Pallo.vita'
import { Scena } from '../screens/Login.scena'
import { PALLO as PALLO_GENERATO, PALLO_ID, PALLO_MANI } from '../../presentazione/js/generati/pallo'
import type { UmorePallo } from '../../presentazione/js/generati/pallo'
import { SCENA as SCENA_GENERATA, SCENA_ID } from '../../presentazione/js/generati/scena'

const TESTA = ['pensa', 'contento'] as const

/** Il controllo dei tipi: l'unione scritta nel modulo generato è quella di Pallo.vita.ts. */
type Uguali<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const stessiUmori: Uguali<UmorePallo, PalloUmore> = true

const INTESTAZIONE = (cosa: string) => `// ============================================================================
// GENERATO da src/components/Pallo.landing.test.tsx: non modificare a mano.
// ${cosa}
// Rigenerare con:
//   npx vitest run src/components/Pallo.landing.test.tsx -u
// Nessun import, di proposito: lo legge anche vite.config.ts.
// ============================================================================
`

/** Gli attributi di React (camelCase) non devono arrivare nel markup. */
const SOLO_REACT = /\s(className|strokeWidth|strokeLinecap|strokeLinejoin|stopColor|stopOpacity|clipPath|fillOpacity|strokeOpacity|focusable=\{|dangerouslySetInnerHTML)=/

interface Disegno {
  viewBox: string
  w: number
  h: number
  testa: boolean
  anim: string
  corpo: string
}

/** Un `<svg class="pallo">` reso dal vero Pallo.tsx, smontato nei pezzi che servono alla landing. */
function disegno(markup: string): Disegno {
  const svg = /^<svg([^>]*)>([\s\S]*)<\/svg>$/.exec(markup)
  if (!svg) throw new Error('Pallo non è un <svg>: ' + markup.slice(0, 80))
  const [, attr, interno] = svg
  const viewBox = /viewBox="([^"]+)"/.exec(attr)?.[1] ?? ''
  const [, , w, h] = viewBox.split(' ').map(Number)
  const id = /id="pallo-c-([^"]+)"/.exec(interno)?.[1]
  if (!id) throw new Error('manca il clipPath di Pallo')
  const corpo = interno.split(`pallo-c-${id}`).join(`pallo-c-${PALLO_ID}`).split(`pallo-l-${id}`).join(`pallo-l-${PALLO_ID}`)
  const anim = /class="pallo-corpo ([^"]+)"/.exec(interno)?.[1] ?? ''
  return { viewBox, w, h, testa: /\sdata-testa=""/.test(attr), anim, corpo }
}

const riga = (k: string, d: Disegno) => `  ${k}: ${JSON.stringify(d)},`

function moduloPallo(): { testo: string; pallo: Record<string, Disegno>; teste: Record<string, Disegno> } {
  const pallo: Record<string, Disegno> = {}
  for (const u of PALLO_UMORI) pallo[u] = disegno(renderToStaticMarkup(<Pallo umore={u} mani={PALLO_MANI} />))
  const teste: Record<string, Disegno> = {}
  for (const u of TESTA) teste[u] = disegno(renderToStaticMarkup(<Pallo umore={u} soloTesta mani={PALLO_MANI} />))
  const testo = `${INTESTAZIONE('Pallo (src/components/Pallo.tsx), un disegno per umore, con l\'ombra di serie.')}
/** Gli umori di Pallo: gli stessi di \`PalloUmore\` (src/components/Pallo.vita.ts), il test lo controlla. */
export type UmorePallo = ${PALLO_UMORI.map((u) => `'${u}'`).join(' | ')}

/** Il segnaposto dell'id dei clipPath (nell'app viene da useId): ogni istanza ne mette uno suo. */
export const PALLO_ID = '__PALLO_ID__'
/** Il segnaposto del colore delle mani. */
export const PALLO_MANI = '__PALLO_MANI__'
/** Le mani di serie: l'arancio del marchio. */
export const MANI_ARANCIO = ${JSON.stringify(LIT.accent)}
/** Le mani sulla slide arancio di Wrapped (palette.ts, \`PALETTES.orange.mani\`). */
export const MANI_BIANCHE = ${JSON.stringify(PALETTES.orange.mani)}

export interface DisegnoPallo {
  /** Il viewBox: il corpo intero (120×130) o la sola testa (96×96). */
  viewBox: string
  w: number
  h: number
  /** Solo la testa (\`data-testa\` sull'<svg>). */
  testa: boolean
  /** La classe dell'animazione continua del corpo (Pallo.css), o ''. */
  anim: string
  /** Il markup dentro l'<svg class="pallo">, con i due segnaposto. */
  corpo: string
}

export const PALLO: Record<UmorePallo, DisegnoPallo> = {
${PALLO_UMORI.map((u) => riga(u, pallo[u])).join('\n')}
}

/** La sola testa (\`soloTesta\`): l'avatar della chat, che pensa e poi è contento. */
export const PALLO_TESTA: Record<${TESTA.map((u) => `'${u}'`).join(' | ')}, DisegnoPallo> = {
${TESTA.map((u) => riga(u, teste[u])).join('\n')}
}
`
  return { testo, pallo, teste }
}

function moduloScena(): { testo: string; piani: Record<'cielo' | 'sole' | 'terra', string>; viewBox: string } {
  const html = renderToStaticMarkup(<Scena inquadratura="benvenuto" />)
  const radice = document.createElement('div')
  radice.innerHTML = html
  const svg = radice.querySelector('svg')
  if (!svg) throw new Error('la scena non ha un <svg>')
  const viewBox = svg.getAttribute('viewBox') ?? ''
  const preserveAspectRatio = svg.getAttribute('preserveAspectRatio') ?? ''
  const uid = /id="scena-cielo-([^"]+)"/.exec(html)?.[1]
  if (!uid) throw new Error('manca il gradiente del cielo')
  const norm = (s: string) => s.replace(new RegExp(`(scena-[a-z]+)-${uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `$1-${SCENA_ID}`)
  const piano = (nome: string) => {
    const g = svg.querySelector(`:scope > g[data-piano="${nome}"]`)
    if (!g) throw new Error('manca il piano ' + nome)
    return norm(g.innerHTML)
  }
  const piani = { cielo: piano('cielo'), sole: piano('sole'), terra: piano('terra') }
  const testo = `${INTESTAZIONE('La scena del Benvenuto (src/screens/Login.scena.tsx) in tre piani: cielo, sole, terra.')}
/** Il segnaposto della parte variabile degli id (gradienti, rete, ritaglio del pallone). */
export const SCENA_ID = '__SCENA_ID__'

/**
 * Tre piani con lo stesso viewBox, da impilare in tre <svg>: la landing li fa
 * scorrere a velocità diverse (MOTION.md §L12). Ogni piano porta le sue
 * definizioni; giocatori, pallone e ombra tengono i loro \`data-*\` per
 * \`avviaPalleggio\` (src/screens/Login.palleggio.dom.ts).
 */
export const SCENA = {
  viewBox: ${JSON.stringify(viewBox)},
  preserveAspectRatio: ${JSON.stringify(preserveAspectRatio)},
  cielo: ${JSON.stringify(piani.cielo)},
  sole: ${JSON.stringify(piani.sole)},
  terra: ${JSON.stringify(piani.terra)},
} as const
`
  return { testo, piani, viewBox }
}

describe('Pallo per la landing (file-snapshot)', () => {
  const { testo, pallo, teste } = moduloPallo()

  it('ci sono tutti e 14 gli umori, più le teste della chat', () => {
    expect(stessiUmori).toBe(true)
    expect(Object.keys(pallo)).toEqual([...PALLO_UMORI])
    expect(Object.keys(teste)).toEqual([...TESTA])
    // Il modulo committato ha gli stessi umori (se no: rigenerare con -u).
    expect(Object.keys(PALLO_GENERATO)).toEqual([...PALLO_UMORI])
  })

  it('ogni disegno ha il segnaposto dell\'id, e nessun attributo di React', () => {
    for (const [u, d] of Object.entries({ ...pallo, ...teste })) {
      expect(d.corpo, u).toContain(`pallo-c-${PALLO_ID}`)
      expect(d.corpo, u).not.toMatch(/pallo-[cl]-(?!__PALLO_ID__)/)
      expect(d.corpo, u).not.toMatch(SOLO_REACT)
      expect(d.corpo, u).not.toContain('<svg')
    }
  })

  it('le teste sono teste, il corpo è il corpo', () => {
    expect(pallo.saluta).toMatchObject({ viewBox: '0 0 120 130', w: 120, h: 130, testa: false, anim: 'pallo-rimbalzo' })
    expect(pallo.testa).toMatchObject({ viewBox: '12 12 96 96', testa: true })
    expect(teste.pensa).toMatchObject({ viewBox: '12 12 96 96', testa: true, anim: 'pallo-pensa' })
    // Le mani: il segnaposto dove l'umore ha le braccia.
    expect(pallo.festa.corpo).toContain(PALLO_MANI)
    expect(pallo.cool.corpo).toContain('pallo-l-__PALLO_ID__')
  })

  it('il modulo generato è aggiornato', async () => {
    await expect(testo).toMatchFileSnapshot('../../presentazione/js/generati/pallo.ts')
  })
})

describe('la scena per la landing (file-snapshot)', () => {
  const { testo, piani, viewBox } = moduloScena()

  it('tre piani, nell\'ordine di pittura della scena', () => {
    expect(viewBox).toBe('-480 0 1350 844')
    expect(piani.cielo).toContain('accesso-nuvola')
    expect(piani.cielo).toContain('accesso-gabbiani')
    expect(piani.sole).toContain('accesso-alone')
    expect(piani.terra).toContain('data-pallone')
    expect(piani.terra.match(/data-giocatore=/g)).toHaveLength(2)
    expect(piani.terra).toContain('data-ombra')
    for (const p of Object.values(piani)) {
      expect(p).not.toMatch(SOLO_REACT)
      expect(p).not.toMatch(/scena-[a-z]+-(?!__SCENA_ID__)/)
    }
    // I gradienti stanno nel piano che li usa.
    expect(piani.cielo).toContain(`id="scena-cielo-${SCENA_ID}"`)
    expect(piani.sole).toContain(`id="scena-sole-${SCENA_ID}"`)
    expect(piani.terra).toContain(`id="scena-palla-${SCENA_ID}"`)
    expect(SCENA_GENERATA.viewBox).toBe(viewBox)
  })

  it('il modulo generato è aggiornato', async () => {
    await expect(testo).toMatchFileSnapshot('../../presentazione/js/generati/scena.ts')
  })
})
