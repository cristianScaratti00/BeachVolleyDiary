// ============================================================================
// Il disegno di Pallo sulla landing, come stringa: lo snapshot del vero
// `Pallo.tsx` (`generati/pallo.ts`) con l'id dei ritagli e il colore delle
// mani al posto dei segnaposto. Lo usano la build (`build/componi.ts`, il
// Pallo dell'hero, del finale e delle slide già nell'HTML) e la pagina viva
// (`pallo.ts`, quando cambia umore). Puro, senza DOM.
// ============================================================================
import { MANI_ARANCIO, MANI_BIANCHE, PALLO, PALLO_ID, PALLO_MANI, PALLO_TESTA } from './generati/pallo'
import type { DisegnoPallo, UmorePallo } from './generati/pallo'

export type { UmorePallo }

export interface OpzioniDisegno {
  /** Solo la testa (l'avatar della chat): c'è per `pensa` e `contento`. */
  testa?: boolean
  /** Le mani bianche della slide arancio di Wrapped (`palette.ts`). */
  maniBianche?: boolean
}

/** Il disegno di un umore: la sola testa se chiesta e se esiste, altrimenti il corpo intero. */
export function disegnoDi(umore: UmorePallo, o: OpzioniDisegno = {}): DisegnoPallo {
  if (o.testa && (umore === 'pensa' || umore === 'contento')) return PALLO_TESTA[umore]
  return PALLO[umore]
}

/** L'interno dell'<svg> con l'id `id` (unico nella pagina) e le mani giuste. */
export function corpoDi(umore: UmorePallo, id: string, o: OpzioniDisegno = {}): string {
  return disegnoDi(umore, o).corpo.split(PALLO_ID).join(id).split(PALLO_MANI).join(o.maniBianche ? MANI_BIANCHE : MANI_ARANCIO)
}

/** L'<svg> intero, decorativo, come lo scrive `Pallo.tsx` (classe `pallo`, `data-umore`). */
export function svgPallo(umore: UmorePallo, id: string, o: OpzioniDisegno & { classe?: string } = {}): string {
  const d = disegnoDi(umore, o)
  const classe = o.classe ? `pallo ${o.classe}` : 'pallo'
  const testa = d.testa ? ' data-testa=""' : ''
  return `<svg class="${classe}" data-umore="${umore}"${testa} width="${d.w}" height="${d.h}" viewBox="${d.viewBox}" aria-hidden="true" focusable="false">${corpoDi(umore, id, o)}</svg>`
}
