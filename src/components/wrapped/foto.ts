// ============================================================================
// Le foto delle tele da condividere (Storia 1080×1920 e Beach Wrapped), uguali
// per tutte e due.
//
// Si scaricano e si inlinano come data URL: html-to-image le incorpora nel PNG
// senza canvas "tainted". Insieme al data URL si tengono le misure NATURALI:
// sulle tele una foto non si ritaglia MAI (niente `object-fit: cover`), è la
// sua proporzione vera a decidere quanto è grande e come si dispone.
// Offline o senza CORS una foto cade in silenzio e la tela fa senza.
// ============================================================================

export interface FotoTela {
  /** La foto come data URL: si incorpora nel PNG così com'è. */
  src: string
  /** Larghezza e altezza naturali, in px. */
  w: number
  h: number
  /**
   * La stessa foto ridotta a pochi pixel e sfocata (data URL PNG): il fondo
   * delle bande quando una foto verticale sta in un riquadro più largo di lei.
   * null dove il canvas non c'è.
   */
  sfondo: string | null
}

/** Oltre questo tempo una foto che non si decodifica è come assente. */
const ATTESA_MS = 8000
/** Il lato lungo del fondo sfocato: sgranato apposta, lo scala il browser. */
const LATO_SFONDO = 24

/** La proporzione (larghezza / altezza). */
export function aspetto(f: { w: number; h: number }): number {
  return f.w / f.h
}

/**
 * La misura che fa stare la foto INTERA in un riquadro `maxW × maxH`, con la
 * sua proporzione: si allarga finché tocca uno dei due lati.
 */
export function adatta(f: { w: number; h: number }, maxW: number, maxH: number): { w: number; h: number } {
  const s = Math.min(maxW / f.w, maxH / f.h)
  return { w: Math.round(f.w * s), h: Math.round(f.h * s) }
}

function leggiDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result as string)
    fr.onerror = () => rej(fr.error ?? new Error('lettura foto'))
    fr.readAsDataURL(blob)
  })
}

/**
 * Il fondo sfocato: la foto rimpicciolita a 24px (prima a 128, perché il passo
 * unico da una foto del telefono campiona male) e ripassata con una media 3×3.
 * Ingrandita dal browser come sfondo diventa una sfocatura morbida, ed è
 * un'immagine normale: html-to-image la porta nel PNG senza `filter`.
 */
function sfoca(im: HTMLImageElement, w: number, h: number): string | null {
  try {
    const passo = (lato: number) => {
      const c = document.createElement('canvas')
      c.width = w >= h ? lato : Math.max(2, Math.round((lato * w) / h))
      c.height = w >= h ? Math.max(2, Math.round((lato * h) / w)) : lato
      return c
    }
    const medio = passo(128)
    const cm = medio.getContext('2d')
    const piccolo = passo(LATO_SFONDO)
    const cp = piccolo.getContext('2d')
    if (!cm || !cp) return null
    cm.imageSmoothingQuality = 'high'
    cm.drawImage(im, 0, 0, medio.width, medio.height)
    cp.imageSmoothingQuality = 'high'
    cp.drawImage(medio, 0, 0, piccolo.width, piccolo.height)
    const { width: pw, height: ph } = piccolo
    const dati = cp.getImageData(0, 0, pw, ph)
    const px = dati.data
    const copia = new Uint8ClampedArray(px)
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        let r = 0, g = 0, b = 0, n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy
            if (xx < 0 || yy < 0 || xx >= pw || yy >= ph) continue
            const i = (yy * pw + xx) * 4
            r += copia[i]; g += copia[i + 1]; b += copia[i + 2]; n++
          }
        }
        const i = (y * pw + x) * 4
        px[i] = r / n; px[i + 1] = g / n; px[i + 2] = b / n; px[i + 3] = 255
      }
    }
    cp.putImageData(dati, 0, 0)
    return piccolo.toDataURL('image/png')
  } catch {
    return null
  }
}

/** Decodifica il data URL per le misure naturali (e il fondo sfocato). */
function misura(src: string): Promise<FotoTela | null> {
  return new Promise((res) => {
    const im = new Image()
    const tempo = window.setTimeout(() => res(null), ATTESA_MS)
    im.onload = () => {
      window.clearTimeout(tempo)
      const w = im.naturalWidth
      const h = im.naturalHeight
      res(w > 0 && h > 0 ? { src, w, h, sfondo: sfoca(im, w, h) } : null)
    }
    im.onerror = () => {
      window.clearTimeout(tempo)
      res(null)
    }
    im.src = src
  })
}

/** Una foto disposta: il suo indice e la misura a cui si mostra, intera. */
export interface Posto {
  i: number
  w: number
  h: number
}

export interface Riquadro {
  w: number
  h: number
  /** Lo spazio fra due cornici della stessa riga e fra due righe. */
  gapX: number
  gapY: number
  /** Quanto la cornice aggiunge attorno alla foto (lati, sopra, sotto). */
  padX: number
  padTop: number
  padBottom: number
}

// Tutti i modi di spezzare n foto in righe consecutive (1–3 foto: al più 4).
function righeDi(n: number): number[][][] {
  if (n === 0) return [[]]
  const out: number[][][] = []
  const ricorri = (da: number, acc: number[][]) => {
    if (da === n) {
      out.push(acc)
      return
    }
    for (let a = da + 1; a <= n; a++) ricorri(a, [...acc, Array.from({ length: a - da }, (_, k) => da + k)])
  }
  ricorri(0, [])
  // Prima le righe uniche (tutte affiancate): a parità di area, vince.
  return out.sort((x, y) => x.length - y.length)
}

/**
 * Dispone le foto in righe "giustificate" dentro un riquadro: in ogni riga le
 * foto hanno la stessa altezza e la loro proporzione vera, e la riga riempie
 * la larghezza; se le righe non stanno in altezza si rimpiccioliscono tutte
 * insieme. Fra i modi di andare a capo vince quello che mostra più foto (area
 * totale): tre verticali stanno affiancate, tre panoramiche vanno su due
 * righe con la prima (la copertina) grande.
 */
export function disponi(foto: { w: number; h: number }[], box: Riquadro): Posto[][] {
  if (!foto.length) return []
  const a = foto.map(aspetto)
  let meglio: { area: number; righe: Posto[][] } | null = null
  for (const righe of righeDi(foto.length)) {
    const alt = righe.map((r) => {
      const somma = r.reduce((s, i) => s + a[i], 0)
      return (box.w - r.length * 2 * box.padX - (r.length - 1) * box.gapX) / somma
    })
    const fisso = righe.length * (box.padTop + box.padBottom) + (righe.length - 1) * box.gapY
    const tot = alt.reduce((s, h) => s + h, 0)
    const k = tot + fisso > box.h ? Math.max(0, box.h - fisso) / tot : 1
    const disposte = righe.map((r, ri) => r.map((i) => ({ i, w: Math.round(a[i] * alt[ri] * k), h: Math.round(alt[ri] * k) })))
    const area = disposte.flat().reduce((s, p) => s + p.w * p.h, 0)
    if (!meglio || area > meglio.area * 1.0001) meglio = { area, righe: disposte }
  }
  return meglio?.righe ?? []
}

/**
 * Una foto pronta per la tela: data URL, misure naturali, fondo sfocato. null
 * se non si scarica o non si decodifica (`etichetta` firma l'avviso in console).
 */
export function caricaFoto(url: string, etichetta = '[foto]'): Promise<FotoTela | null> {
  return fetch(url, { mode: 'cors' })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http ' + r.status))))
    .then(leggiDataUrl)
    .then(misura)
    .catch((e: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(etichetta, 'foto', e)
      return null
    })
}
