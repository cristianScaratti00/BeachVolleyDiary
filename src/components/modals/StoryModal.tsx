// ============================================================================
// Visore della Storia Instagram (UX §6.5, §11): anteprima scalata della tela
// 1080×1920 e generazione del PNG, nel linguaggio del redesign.
//
// La cornice è un visore scuro con i comandi di vetro scuro che galleggiano:
// il × in cima; sotto l'anteprima le due scelte, il LAYOUT (Tabellone, Foto,
// Polaroid: miniature che si colorano col colore scelto) e il COLORE
// (inchiostro, sabbia, arancio); «Condividi» di vetro e «Scarica» arancio in
// fondo. Le scelte sono due radiogroup (frecce, un solo radio nel giro del
// Tab) e si ricordano per dispositivo. `role="dialog"`, Esc, focus al × a t0 e
// ritorno a chi l'ha aperta.
//
// La TELA è l'unico posto dell'interfaccia con colori letterali e misure in px
// letterali: sono quelli del PNG, che html-to-image fotografa così com'è. Solo
// colori opachi da `wrapped/palette.ts` (inchiostro, sabbia, arancio), Geist
// (`EXPORT_FONT`, incorporabile), niente ombre né `backdrop-filter`. Le foto
// non si ritagliano MAI: ogni layout le mostra intere, con la proporzione vera
// (le misure naturali arrivano con il data URL, `wrapped/foto.ts`).
//
// Il PNG si prepara PRIMA del tocco (come Wrapped): iOS concede
// `navigator.share` solo a ridosso del gesto, e generarlo dopo farebbe scadere
// il permesso. Scarico via Blob URL: il `data:` di prima su iOS non partiva.
// ============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { toBlob } from 'html-to-image'
import * as m from 'motion/react-m'
import { useIsPresent, useReducedMotion } from 'motion/react'
import { track } from '@vercel/analytics'
import type { StoriaViewerProps } from '../../app/contracts'
import type { StoryData } from '../../lib/derive'
import { LIT } from '../../lib/theme'
import { ENTRATA, SVELTO } from '../Motion'
import { BrandMark } from '../Logo'
import { Pallo } from '../Pallo'
import type { PalloUmore } from '../Pallo'
import { Button, IconButton } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { medalTier } from '../ui/Medal'
import { placementText } from '../ui/Badge'
import { useEscape, useFocusTrap, useInitialFocus, useReturnFocus } from '../ui/overlay'
import { EXPORT_FONT, STORY_PALETTES, caricaFontExport } from '../wrapped/palette'
import type { PaletteKey, WrappedPalette } from '../wrapped/palette'
import { aspetto, caricaFoto, disponi } from '../wrapped/foto'
import type { FotoTela } from '../wrapped/foto'
import './StoryModal.css'

const W = 1080
const H = 1920
/** Tetto all'intera generazione: html-to-image può restare appeso sui font. */
const TETTO_MS = 20000
/** Chi sfoglia layout e colori non deve far partire un PNG a ogni tocco. */
const QUIETE_MS = 250

type LayoutKey = 'tabellone' | 'foto' | 'polaroid'

/** I layout, nell'ordine del selettore. */
const LAYOUTS: { key: LayoutKey; label: string }[] = [
  { key: 'tabellone', label: 'Tabellone' },
  { key: 'foto', label: 'Foto' },
  { key: 'polaroid', label: 'Polaroid' },
]

// Layout e colore si ricordano per dispositivo. Il salvataggio può mancare
// (navigazione privata, spazio pieno): allora si riparte dai primi.
const CHIAVE_STILE = 'bvd_storia_stile'

function leggiStile(): { layout: LayoutKey; colore: PaletteKey } {
  const base = { layout: LAYOUTS[0].key, colore: STORY_PALETTES[0].key }
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE_STILE) ?? 'null') as { layout?: unknown; colore?: unknown } | null
    const layout = LAYOUTS.find((l) => l.key === v?.layout)?.key ?? base.layout
    const colore = STORY_PALETTES.find((p) => p.key === v?.colore)?.key ?? base.colore
    return { layout, colore }
  } catch {
    return base
  }
}

/** Il numero di partite dal record «3–1». */
function partiteDa(record: string): string {
  const [a, b] = record.split(/[–-]/).map((x) => Number(x) || 0)
  return String(a + b)
}

/** «CAMPIONI · GOLD» → «Campioni · Gold»: il redesign non scrive in maiuscolo. */
function frase(s: string): string {
  return s
    .split(' · ')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' · ')
}

// Il piazzamento dall'etichetta della storia (l'inverso di `resultLabelOf`),
// finché chi apre il visore non passa `placement`.
const DA_ETICHETTA: Record<string, string> = {
  CAMPIONI: '1°',
  FINALISTI: '2°',
  'SUL PODIO': '3°',
  'IN SEMIFINALE': 'Semifinale',
  'QUARTI DI FINALE': 'Quarti',
  'OTTAVI DI FINALE': 'Ottavi',
  'FASE A GIRONI': 'Gironi',
  'IN CORSO': 'In corso',
}
// La forma breve della medaglia (la stessa di `Medal`).
const CORTO: Record<string, string> = { Semifinale: 'Semi', Quarti: 'Quarti', Ottavi: 'Ott.', Gironi: 'Gir.', 'In corso': '…' }

/**
 * Le proprietà di un radio dentro un radiogroup a frecce: ← → ↑ ↓ scelgono e
 * spostano il focus, Home/End vanno agli estremi, e nel giro del Tab c'è solo
 * il radio scelto (APG, «Radio Group»).
 */
function useRadio<K extends string>(chiavi: readonly K[], valore: K, scegli: (k: K) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const muovi = (i: number) => {
    const n = (i + chiavi.length) % chiavi.length
    scegli(chiavi[n])
    refs.current[n]?.focus()
  }
  return (k: K, i: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[i] = el
    },
    type: 'button' as const,
    role: 'radio',
    'aria-checked': k === valore,
    tabIndex: k === valore ? 0 : -1,
    onClick: () => scegli(k),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const dove =
        e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1
        : e.key === 'Home' ? 0
        : e.key === 'End' ? chiavi.length - 1
        : null
      if (dove === null) return
      e.preventDefault()
      muovi(dove)
    },
  })
}

type Stato = 'font' | 'pronto' | 'genera'

export default function StoryModal({ story, placement, didascalie: scritte, onClose, onNotice, top, opener }: StoriaViewerProps) {
  const [iniziale] = useState(leggiStile)
  const [layout, setLayout] = useState<LayoutKey>(iniziale.layout)
  const [variant, setVariant] = useState<PaletteKey>(iniziale.colore)
  const [stato, setStato] = useState<Stato>('font')
  const [covers, setCovers] = useState<FotoTela[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const spazioRef = useRef<HTMLDivElement>(null)
  const [spazio, setSpazio] = useState<{ w: number; h: number } | null>(null)
  const presente = useIsPresent()
  const ridotto = useReducedMotion()
  const pal = STORY_PALETTES.find((p) => p.key === variant) ?? STORY_PALETTES[0]
  const piazzamento = placement ?? DA_ETICHETTA[story.resultLabel.split(' · ')[0]] ?? ''

  useFocusTrap(ref, presente)
  useEscape(onClose, top && presente)
  useInitialFocus(ref, (root) => root.querySelector<HTMLElement>('[data-close]'))
  useReturnFocus(presente, opener, ref)

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE_STILE, JSON.stringify({ layout, colore: variant }))
    } catch {
      /* niente: la scelta vale per questa volta */
    }
  }, [layout, variant])

  // Download disattivo finché i font della tela non sono pronti, al massimo 3s
  // (UX §6.5): dopo, si genera con quel che c'è.
  useEffect(() => {
    let vivo = true
    void caricaFontExport().then(() => {
      if (vivo) setStato((s) => (s === 'font' ? 'pronto' : s))
    })
    return () => {
      vivo = false
    }
  }, [])

  // Foto (fino a 3) come data URL con le misure naturali. Offline cadono in
  // silenzio e si genera la versione senza foto.
  const photoKey = story.photoUrls.join('|')
  useEffect(() => {
    let vivo = true
    setCovers([])
    const urls = story.photoUrls
    if (!urls.length) return
    void Promise.all(urls.map((u) => caricaFoto(u, '[storia]'))).then((arr) => {
      if (vivo) setCovers(arr.filter((x): x is FotoTela => !!x))
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  // L'anteprima prende tutto lo spazio fra il × e le scelte: lo si misura
  // (prima del disegno, niente salto) e la tela si scala per starci.
  useLayoutEffect(() => {
    const el = spazioRef.current
    if (!el) return
    const misura = () => setSpazio({ w: el.clientWidth, h: el.clientHeight })
    misura()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cosa sa fare questo browser con un'immagine: lo share sheet con i file.
  const [canShareFiles] = useState(() => {
    try {
      const probe = new File([new Blob()], 'probe.png', { type: 'image/png' })
      return !!navigator.canShare?.({ files: [probe] })
    } catch {
      return false
    }
  })

  // ------------------------------------------------------- generazione
  const chiave = `${layout}|${variant}|${covers.length}`
  const shot = useRef<{ key: string; promise: Promise<Blob> } | null>(null)
  const pronto = useRef<{ key: string; blob: Blob } | null>(null)

  const renderBlob = async (): Promise<Blob> => {
    const node = cardRef.current
    if (!node) throw new Error('tela non montata')
    await caricaFontExport()
    const opts = { pixelRatio: 1, cacheBust: true, width: W, height: H, style: { transform: 'none' } }
    // WebKit disegna l'SVG intermedio prima di aver decodificato font e foto
    // inlinati: una passata a vuoto li mette in cache (difetto di html-to-image).
    await toBlob(node, opts).catch(() => null)
    const blob = await toBlob(node, opts)
    if (!blob) throw new Error('immagine vuota')
    return blob
  }

  const prepara = (): Promise<Blob> => {
    if (shot.current?.key === chiave) return shot.current.promise
    const key = chiave
    const promise = Promise.race([
      renderBlob(),
      new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('timeout generazione')), TETTO_MS)),
    ])
    shot.current = { key, promise }
    promise.then(
      (blob) => {
        pronto.current = { key, blob }
      },
      () => {
        if (shot.current?.promise === promise) shot.current = null
      },
    )
    return promise
  }

  // In sottofondo, appena font e foto ci sono e le scelte si fermano: il
  // tocco poi condivide subito.
  useEffect(() => {
    if (stato === 'font') return
    const t = window.setTimeout(() => prepara().catch(() => undefined), QUIETE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave, stato === 'font'])

  const blob = async (): Promise<Blob> => {
    if (pronto.current?.key === chiave) return pronto.current.blob
    setStato('genera')
    try {
      return await prepara()
    } finally {
      setStato('pronto')
    }
  }

  const fallito = (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[storia] immagine', e)
    onNotice('Impossibile generare l\'immagine. Riprova.', 'error')
  }

  const nomeFile = `${story.slug}-story.png`
  const occupato = stato !== 'pronto'

  const scarica = async () => {
    if (occupato) return
    try {
      const b = await blob()
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeFile
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      track('storia_scaricata', { layout, colore: variant })
    } catch (e) {
      fallito(e)
    }
  }

  const condividi = async () => {
    if (occupato) return
    let b: Blob
    try {
      b = await blob()
    } catch (e) {
      fallito(e)
      return
    }
    const file = new File([b], nomeFile, { type: 'image/png' })
    try {
      // Solo il file, niente testo: con una didascalia alcune app (Instagram in
      // testa) ricevono il testo e perdono l'immagine.
      await navigator.share({ files: [file], title: story.name })
    } catch (e) {
      const name = (e as { name?: string })?.name
      if (name === 'AbortError') return
      if (name === 'NotAllowedError') {
        onNotice('Immagine pronta: tocca di nuovo "Condividi".', 'info')
        return
      }
      fallito(e)
    }
  }

  // --------------------------------------------------------- selettori
  const radioLayout = useRadio(LAYOUTS.map((l) => l.key), layout, setLayout)
  const radioColore = useRadio(STORY_PALETTES.map((p) => p.key), variant, setVariant)

  // Anteprima: la tela intera, scalata per stare nello spazio misurato (al
  // massimo a metà). Senza misura (jsdom) una scala fissa.
  const scale = spazio && spazio.h > 0 ? Math.max(0.12, Math.min(spazio.h / H, spazio.w / W, 0.5)) : 0.25
  const boxW = Math.round(W * scale)
  const boxH = Math.round(H * scale)

  return (
    <m.div
      ref={ref}
      className="storia"
      role="dialog"
      aria-modal="true"
      aria-label={`Storia di ${story.name}`}
      data-surface="dark"
      {...(presente ? {} : { inert: '' })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTRATA }}
      exit={{ opacity: 0, transition: SVELTO }}
    >
      <div className="storia-top">
        <IconButton icon="close" label="Chiudi" variant="glass" material="glass-dark" iconSize={20} data-close="" onClick={onClose} />
        <p className="storia-title" aria-hidden="true">Storia Instagram</p>
        <span className="storia-spacer" />
      </div>

      <div className="storia-stage">
        <div ref={spazioRef} className="storia-spazio">
          <m.div
            className="storia-preview"
            style={{ width: boxW, height: boxH }}
            initial={{ opacity: 0, y: ridotto ? 0 : 16, scale: ridotto ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: ENTRATA }}
            aria-hidden="true"
          >
            {/* La tela a piena risoluzione, scalata solo per l'anteprima. */}
            <div
              ref={cardRef}
              className="storia-canvas"
              data-layout={layout}
              style={{ transform: `scale(${scale})`, background: pal.bg, color: pal.fg, fontFamily: EXPORT_FONT }}
            >
              <Tela layout={layout} story={story} piazzamento={piazzamento} pal={pal} covers={covers} scritte={scritte} />
            </div>
          </m.div>
        </div>

        <div className="storia-scelte">
          <div role="radiogroup" aria-label="Layout della storia" className="storia-layouts" data-material="glass-dark">
            {LAYOUTS.map((l, i) => (
              <button key={l.key} {...radioLayout(l.key, i)} className="storia-layout">
                <MiniLayout layout={l.key} pal={pal} />
                <span>{l.label}</span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Colore della storia" className="storia-palette" data-material="glass-dark">
            {STORY_PALETTES.map((p, i) => (
              <button
                key={p.key}
                {...radioColore(p.key, i)}
                aria-label={p.label}
                className="storia-swatch"
                data-tone={p.key}
                style={{ '--c': p.bg } as CSSProperties}
              >
                <Icon name="check" size={20} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="storia-actions">
        {canShareFiles && (
          <Button
            variant="glass"
            material="glass-dark"
            size="lg"
            icon="share"
            className="storia-action"
            busy={stato === 'genera'}
            busyLabel="Generazione…"
            disabled={stato === 'font'}
            onClick={() => void condividi()}
          >
            Condividi
          </Button>
        )}
        <Button
          size="lg"
          icon="download"
          className="storia-action"
          busy={stato === 'genera'}
          busyLabel="Generazione…"
          disabled={stato === 'font'}
          onClick={() => void scarica()}
        >
          {stato === 'font' ? 'Preparo…' : 'Scarica'}
        </Button>
      </div>
    </m.div>
  )
}

/**
 * La miniatura di un layout nel selettore: lo schema della tela (9:16) dipinto
 * con il colore scelto, così si riconosce prima di toccarlo. Decorativa: il
 * nome lo dice l'etichetta accanto.
 */
function MiniLayout({ layout, pal }: { layout: LayoutKey; pal: WrappedPalette }) {
  // Le "foto" della miniatura: un grigio medio che si vede su tutti e tre i fondi.
  const foto = LIT.ink3
  return (
    <svg className="storia-mini" viewBox="0 0 36 64" aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="34.5" height="62.5" rx="5" fill={pal.bg} stroke={pal.line} strokeWidth="1.5" />
      {layout === 'tabellone' && (
        <>
          <circle cx="8.5" cy="10" r="3.5" fill={pal.accent} />
          <rect x="5" y="16" width="21" height="3" rx="1.5" fill={pal.fg} />
          <rect x="5" y="22" width="17" height="9" rx="1.5" fill={pal.accent} />
          <path d="M5 34.5H31M5 42.5H31M18 34.5V42.5" stroke={pal.fg} strokeWidth="1" />
          <rect x="5" y="36.5" width="8" height="3" rx="1" fill={pal.fg} />
          <rect x="20.5" y="36.5" width="6" height="3" rx="1" fill={pal.fg} />
          <rect x="5" y="47" width="8" height="10" rx="1.5" fill={foto} />
          <rect x="14.5" y="47" width="14" height="10" rx="1.5" fill={foto} />
        </>
      )}
      {layout === 'foto' && (
        <>
          <rect x="5" y="8" width="26" height="27" rx="2.5" fill={foto} />
          <circle cx="8.5" cy="41" r="3" fill={pal.accent} />
          <rect x="5" y="46" width="22" height="3" rx="1.5" fill={pal.fg} />
          <rect x="5" y="52.5" width="7" height="4" rx="1" fill={pal.accent} />
          <rect x="14.5" y="52.5" width="7" height="4" rx="1" fill={pal.fg} />
          <rect x="24" y="52.5" width="7" height="4" rx="1" fill={pal.fg} />
        </>
      )}
      {layout === 'polaroid' && (
        <>
          <g transform="rotate(-7 12 19)">
            <rect x="4.5" y="9" width="15" height="19" fill={LIT.surface} stroke={pal.line} strokeWidth="0.75" />
            <rect x="6.5" y="11" width="11" height="11" fill={foto} />
          </g>
          <g transform="rotate(6 24 21)">
            <rect x="16.5" y="11" width="15" height="19" fill={LIT.surface} stroke={pal.line} strokeWidth="0.75" />
            <rect x="18.5" y="13" width="11" height="11" fill={foto} />
          </g>
          <rect x="5" y="38" width="24" height="8" rx="1.5" fill={pal.accent} />
          <rect x="5" y="49" width="18" height="3" rx="1.5" fill={pal.fg} />
          <rect x="5" y="54.5" width="22" height="2.5" rx="1.25" fill={pal.muted} />
        </>
      )}
    </svg>
  )
}

/**
 * La medaglia del piazzamento sulla tela (128px di base): la stessa di `Medal`
 * (1° arancio pieno, 2°/3° carta col filo d'inchiostro, il resto carta calda
 * col filo chiaro), coi letterali. Sull'arancio l'oro arancio prende un filo
 * d'inchiostro, o sparirebbe nel fondo.
 */
function MedagliaTela({ placement, pal, size = 128 }: { placement: string; pal: WrappedPalette; size?: number }) {
  const p = placementText(placement).split(' · ')[0]
  const tier = medalTier(placement)
  const corto = CORTO[p] ?? p
  const k = size / 128
  const stile: Record<typeof tier, CSSProperties> = {
    win: { background: LIT.accent, color: LIT.ink, boxShadow: `inset 0 0 0 ${(pal.key === 'orange' ? 6 : 3) * k}px ${pal.key === 'orange' ? LIT.ink : LIT.accentStrong}` },
    podium: { background: LIT.surface, color: LIT.ink, boxShadow: `inset 0 0 0 ${5 * k}px ${LIT.ink}` },
    rest: { background: LIT.fill, color: LIT.ink2, boxShadow: `inset 0 0 0 ${3 * k}px ${LIT.lineStrong}` },
    open: { background: LIT.fill, color: LIT.ink2, border: `${3 * k}px dashed ${LIT.lineStrong}` },
  }
  return (
    <div
      style={{
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        boxSizing: 'border-box',
        font: `800 ${Math.round((corto.length <= 2 ? 56 : corto.length <= 4 ? 40 : 34) * k)}px/1 ${EXPORT_FONT}`,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        ...stile[tier],
      }}
    >
      {corto}
    </div>
  )
}

interface TelaProps {
  story: StoryData
  piazzamento: string
  pal: WrappedPalette
  covers: FotoTela[]
  /** Le didascalie vere delle foto, se ci sono (stesso ordine di `covers`). */
  scritte?: string[]
}

/** Pallo fa festa per un 1°, il figo per un podio, ed è contento negli altri casi. */
function umoreStoria(piazzamento: string): PalloUmore {
  const tier = medalTier(piazzamento)
  return tier === 'win' ? 'festa' : tier === 'podium' ? 'cool' : 'contento'
}

/** Sull'inchiostro le braccia d'inchiostro di Pallo sparirebbero: un filo di luce le ridisegna. */
function luce(pal: WrappedPalette): CSSProperties | undefined {
  return pal.key === 'ink' ? { filter: `drop-shadow(0 0 3px ${pal.fg}) drop-shadow(0 0 1px ${pal.fg})` } : undefined
}

/**
 * La tela 1080×1920, comune ai tre layout: margini 88, niente testo essenziale
 * nei primi e negli ultimi 250px (zone di Instagram), fondo pieno, la stagione
 * in cima e il marchio in fondo.
 */
function Tela({ layout, ...props }: TelaProps & { layout: LayoutKey }) {
  const { story, pal } = props
  return (
    <>
      <p className="storia-head" style={{ color: pal.fg }}>
        Stagione {story.year}
      </p>
      {layout === 'foto' ? <TelaFoto {...props} /> : layout === 'polaroid' ? <TelaPolaroid {...props} /> : <TelaTabellone {...props} />}
      <div className="storia-foot">
        {/* Sull'inchiostro il marchio è senza il suo quadrato d'inchiostro. */}
        <BrandMark size={72} bare={pal.key === 'ink'} />
        <span className="storia-brand" style={{ color: pal.fg }}>Beach Diary</span>
      </div>
    </>
  )
}

/** La medaglia accanto all'esito («Campioni · Gold»). */
function Esito({ story, piazzamento, pal, size }: TelaProps & { size?: number }) {
  return (
    <div className="storia-esito">
      {piazzamento && <MedagliaTela placement={piazzamento} pal={pal} size={size} />}
      <p className="storia-eyebrow" style={{ color: pal.muted }}>
        {frase(story.resultLabel)}
      </p>
    </div>
  )
}

/** I numeri in fila, separati da filetti: la percentuale, il record, il differenziale. */
function Numeri({ celle, pal }: { celle: { n: string; l: string; accent?: boolean }[]; pal: WrappedPalette }) {
  // Tre colonne su 904px: i record lunghi («112–38») scendono di taglia
  // invece di invadere la cella accanto.
  const lungo = Math.max(...celle.map((c) => c.n.length))
  const taglia = lungo >= 6 ? 64 : lungo === 5 ? 76 : 88
  return (
    <div className="storia-numeri" style={{ borderColor: pal.line, gridTemplateColumns: `repeat(${celle.length}, minmax(0, 1fr))` }}>
      {celle.map((c, i) => (
        <div key={i} className="storia-numero" style={{ borderColor: pal.line }}>
          <span className="storia-numero-n" style={{ color: c.accent ? pal.accent : pal.fg, fontSize: taglia }}>
            {c.n}
          </span>
          <span className="storia-numero-l" style={{ color: pal.muted }}>{c.l}</span>
        </div>
      ))}
    </div>
  )
}

const percentuale = (story: StoryData) => ({ n: `${story.winPct}%`, l: 'Vittorie', accent: true })
const differenziale = (story: StoryData) => ({ n: story.diffStr, l: 'Differenziale', accent: story.diffPositive })

/**
 * TABELLONE: i numeri in evidenza (la percentuale enorme, le celle) e in fondo
 * le foto, intere, in una riga alla stessa altezza. Con le foto le quattro
 * celle diventano una fila di tre (le partite si leggono già nel record),
 * così la riga di foto ha spazio.
 */
function TelaTabellone(props: TelaProps) {
  const { story, piazzamento, pal, covers } = props
  const linea = { borderColor: pal.line } as CSSProperties
  const etichetta = { color: pal.muted } as CSSProperties
  const conCompagno = story.partner && story.partner !== '—'
  const somma = covers.reduce((s, f) => s + aspetto(f), 0)
  return (
    <>
      <Pallo umore={umoreStoria(piazzamento)} size={232} mani={pal.mani} ombra={false} className="storia-pallo" style={luce(pal)} />

      <div className="storia-content">
        <Esito {...props} />
        <h2 className="storia-name">{story.name}</h2>
        <p className="storia-meta" style={etichetta}>{story.meta}</p>

        <div className="storia-hero">
          <span className="storia-hero-n" style={{ color: pal.accent }}>{story.winPct}%</span>
          <span className="storia-hero-l" style={etichetta}>
            vittorie{conCompagno ? ` · in coppia con ${story.partner}` : ''}
          </span>
        </div>

        {covers.length > 0 ? (
          <>
            <div className="storia-tab-numeri">
              <Numeri pal={pal} celle={[{ n: story.record, l: 'Record' }, { n: story.setStr, l: 'Set' }, differenziale(story)]} />
            </div>
            {/* La riga di foto: tutte alla stessa altezza, ognuna larga quanto
                vuole la sua proporzione; l'altezza è la più grande che fa
                stare la riga sia in larghezza sia nello spazio rimasto. */}
            <div className="storia-strip">
              <div
                className="storia-strip-row"
                style={{ '--somma': somma, '--spazi': `${(covers.length - 1) * 16}px` } as CSSProperties}
              >
                {covers.map((f, i) => (
                  <img key={i} src={f.src} alt="" width={f.w} height={f.h} className="storia-photo" />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="storia-cells" style={linea}>
            <Cella n={story.record} l="Record" pal={pal} linea={linea} />
            <Cella n={partiteDa(story.record)} l="Partite" pal={pal} linea={linea} />
            <Cella n={story.setStr} l="Set" pal={pal} linea={linea} />
            <Cella n={story.diffStr} l="Differenziale" pal={pal} linea={linea} accent={story.diffPositive} />
          </div>
        )}
      </div>
    </>
  )
}

/**
 * FOTO: la prima foto protagonista, in alto, larga quanto la colonna e alta
 * quanto la sua proporzione chiede. Se è troppo verticale per lo spazio,
 * l'altezza si ferma e la foto sta intera al centro, sulle bande della sua
 * stessa immagine sfocata. Pallo sbircia da dietro il bordo. Sotto: esito,
 * nome, dove e quando, tre numeri. Senza foto, Pallo grande al suo posto.
 */
function TelaFoto(props: TelaProps) {
  const { story, piazzamento, pal, covers } = props
  const foto = covers[0] ?? null
  return (
    <div className="storia-foto">
      <div className="storia-foto-area" data-vuota={foto ? undefined : ''} style={foto ? ({ '--a': aspetto(foto) } as CSSProperties) : undefined}>
        {foto ? (
          <>
            <Pallo umore="sbircia" size={200} mani={pal.mani} ombra={false} className="storia-foto-pallo" style={luce(pal)} />
            <div
              className="storia-foto-pannello"
              style={{
                backgroundColor: pal.line,
                backgroundImage: foto.sfondo ? `url("${foto.sfondo}")` : undefined,
              } as CSSProperties}
            >
              <img src={foto.src} alt="" width={foto.w} height={foto.h} className="storia-photo" />
            </div>
          </>
        ) : (
          <Pallo umore={umoreStoria(piazzamento)} size={440} mani={pal.mani} ombra={false} className="storia-foto-solo" style={luce(pal)} />
        )}
      </div>

      <div className="storia-foto-testo">
        <Esito {...props} size={112} />
        <h2 className="storia-name" data-taglia="m">{story.name}</h2>
        <p className="storia-meta" style={{ color: pal.muted }}>{story.meta}</p>
        <div className="storia-foto-numeri">
          <Numeri pal={pal} celle={[percentuale(story), { n: story.record, l: 'Record' }, differenziale(story)]} />
        </div>
      </div>
    </div>
  )
}

// Le polaroid: un po' storte (e sfalsate, se stanno in fila), mai tanto da
// toccarsi: 3° su una cornice alta 450px spostano l'angolo di 12px, fra due
// cornici ce ne sono 24. La fila può uscire di 28px nei margini: sono
// cornici, non testo.
const STORTE = [-3, 2.5, -1.5]
const SFALSA = [0, 32, 8]
const CORNICE_UNA = { p: 32, pb: 120, font: 40 }
const CORNICE_PIU = { p: 24, pb: 96, font: 32 }
const FILO_POLAROID = 2

/**
 * Le didascalie scritte sotto le polaroid: le foto non hanno un testo loro
 * nella storia, quindi il dove, il quando (senza l'anno: c'è già in cima) e
 * con chi. Per ognuna più versioni, dalla più ricca alla più corta.
 */
function didascalie(story: StoryData, n: number): string[][] {
  const [data = '', dove = '', categoria = ''] = story.meta.split('·').map((s) => s.trim())
  const quando = data.replace(new RegExp(`\\s+${story.year}$`), '')
  const con = story.partner && story.partner !== '—' ? `con ${story.partner}` : categoria
  const ok = (...v: string[]) => {
    const r = v.filter(Boolean)
    return r.length ? r : [story.name]
  }
  if (n <= 1) return [ok([quando, dove].filter(Boolean).join(' · '), dove, quando)]
  return [ok(dove, quando), ok(quando, dove), ok(con, dove)]
}

/**
 * La didascalia che sta nella cornice: la prima versione che entra alla
 * taglia piena, poi scendendo fino a 26px; se niente entra, l'ellissi.
 * (Stima: Geist 600 è largo in media 0.54em.)
 */
function scritta(versioni: string[], larga: number, taglia: number): { testo: string; taglia: number } {
  for (const t of [taglia, Math.round(taglia * 0.85), 26]) {
    const v = versioni.find((x) => x.length * t * 0.54 <= larga)
    if (v) return { testo: v, taglia: t }
  }
  return { testo: versioni[versioni.length - 1], taglia: 26 }
}

/**
 * POLAROID: da una a tre foto come polaroid un po' storte, ognuna con la sua
 * proporzione e la didascalia scritta sotto; il risultato in grande. Senza
 * foto, una polaroid con dentro Pallo che esulta.
 */
function TelaPolaroid(props: TelaProps) {
  const { story, piazzamento, pal, covers } = props
  const n = covers.length
  const c = n <= 1 ? CORNICE_UNA : CORNICE_PIU
  const righe = disponi(covers, {
    w: 960,
    h: 680,
    gapX: 24,
    gapY: 40,
    padX: c.p + FILO_POLAROID,
    padTop: c.p + FILO_POLAROID,
    padBottom: c.pb + FILO_POLAROID,
  })
  // La didascalia della foto, se l'ha scritta chi l'ha caricata, viene prima
  // delle versioni ricavate dal torneo (che restano come ripiego più corto).
  const testi = didascalie(story, n).map((v, i) => {
    const propria = props.scritte?.[i]?.trim()
    return propria ? [propria, ...v] : v
  })
  const [esito, girone] = frase(story.resultLabel).split(' · ')
  const grande = esito.length <= 9 ? 168 : esito.length <= 13 ? 128 : 100
  const cornice = (storta: number, giu = 0): CSSProperties => ({
    padding: `${c.p}px ${c.p}px 0`,
    background: LIT.surface,
    borderColor: pal.line,
    transform: `translateY(${giu}px) rotate(${storta}deg)`,
  })
  return (
    <>
      {n > 0 && <Pallo umore={umoreStoria(piazzamento)} size={168} mani={pal.mani} ombra={false} className="storia-pol-pallo" style={luce(pal)} />}
      <div className="storia-polaroid">
        <div className="storia-pol-area">
          {n > 0 ? (
            righe.map((riga, r) => (
              <div key={r} className="storia-pol-riga">
                {riga.map(({ i, w, h }, k) => {
                  const d = scritta(testi[i], w, c.font)
                  return (
                    <figure key={i} className="storia-pol" style={cornice(STORTE[i] ?? 0, righe.length === 1 ? SFALSA[k] : 0)}>
                      <img src={covers[i].src} alt="" className="storia-photo" style={{ width: w, height: h }} />
                      <figcaption className="storia-pol-cap" style={{ width: w, height: c.pb, fontSize: d.taglia, color: LIT.ink }}>
                        {d.testo}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            ))
          ) : (
            <figure className="storia-pol" style={cornice(-2.5)}>
              <div className="storia-pol-vuota" style={{ background: LIT.accentWash }}>
                <Pallo umore={umoreStoria(piazzamento)} size={360} ombra={false} />
              </div>
              <figcaption className="storia-pol-cap" style={{ width: 520, height: c.pb, fontSize: scritta(testi[0], 520, c.font).taglia, color: LIT.ink }}>
                {scritta(testi[0], 520, c.font).testo}
              </figcaption>
            </figure>
          )}
        </div>

        <div className="storia-pol-testo">
          <p className="storia-pol-esito" style={{ color: pal.accent, fontSize: grande }}>{esito}</p>
          <div className="storia-pol-nome">
            {piazzamento && <MedagliaTela placement={piazzamento} pal={pal} size={112} />}
            <div className="storia-pol-nome-t">
              {girone && <p className="storia-pol-girone" style={{ color: pal.muted }}>{girone}</p>}
              <h2 className="storia-name" data-taglia="s">{story.name}</h2>
            </div>
          </div>
          <p className="storia-meta" data-righe="1" style={{ color: pal.muted }}>{story.meta}</p>
          <div className="storia-pol-numeri">
            <Numeri pal={pal} celle={[percentuale(story), { n: story.record, l: 'Record' }, differenziale(story)]} />
          </div>
        </div>
      </div>
    </>
  )
}

function Cella({ n, l, pal, linea, accent }: { n: string; l: string; pal: WrappedPalette; linea: CSSProperties; accent?: boolean }) {
  return (
    <div className="storia-cell" style={linea}>
      <span className="storia-cell-n" style={{ color: accent ? pal.accent : pal.fg }}>{n}</span>
      <span className="storia-cell-l" style={{ color: pal.muted }}>{l}</span>
    </div>
  )
}
