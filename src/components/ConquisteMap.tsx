// ============================================================================
// "La mappa delle conquiste" su Leaflet: un pin per ogni città in cui hai
// giocato, colorato dal miglior piazzamento ottenuto lì.
//
// Presentazionale: riceve i pin già calcolati da `deriveMappa` (coordinate
// comprese) e li appoggia sulla mappa. Nessuna geometria qui dentro — la stessa
// divisione della sorella minore `VenueMap`.
//
// Vestita come il redesign (la card-figura con la sagoma chiara dell'Italia):
// - le tile OSM passano da un filtro CSS che le porta in scala di grigi,
//   chiare e a basso contrasto: la mappa fa da fondo, i pin parlano;
// - i pin hanno i colori della legenda (arancio = vinta, bianco = podio,
//   grigio = giocata) e il nome della città accanto, sistemato in modo che
//   le etichette non si coprano fra loro né coprano i pin;
// - all'apertura i pin «cadono» uno dopo l'altro, dal peggiore al migliore
//   (l'arancio arriva per ultimo). Una volta sola: ai cambi di zoom e di
//   filtro ricompaiono fermi.
// - l'inquadratura iniziale abbraccia i pin (chi gioca sulla riviera vede la
//   riviera, non un cerchio col «5» in mezzo all'Italia); senza pin, l'Italia.
//
// È l'unico punto della schermata che tocca Leaflet, ed è importato in `lazy()`
// da `Mappa.tsx`: la libreria, il plugin cluster e i due CSS finiscono in un
// chunk a parte, scaricato solo da chi apre davvero la vista mappa.
//
// NB (privacy): le tile arrivano da tile.openstreetmap.org, quindi aprire la
// mappa comporta una richiesta a un servizio esterno con il riquadro
// geografico. Stesso compromesso già accettato in `VenueMap` (e nella ricerca
// del luogo di VenuePicker, che interroga photon.komoot.io).
//
// ⚠️ Accessibilità: i pin NON sono raggiungibili da tastiera, ed è voluto. La
// superficie accessibile è l'elenco città sotto la mappa, che porta gli stessi
// fatti in testo — vedi il commento in `Mappa.tsx`. Qui il contenitore è un
// `region` con un riassunto testuale, così chi usa uno screen reader sa cosa
// sta saltando e dove trovarne il contenuto.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type { MappaPin, MappaTier } from '../lib/derive.mappa'
import { ITALY_BOUNDS } from '../lib/geo'
import { MapZoom } from './MapZoom'
import { placementText } from './ui/Badge'
import { LIT } from '../lib/theme'
import './ConquisteMap.css'

interface ConquisteMapProps {
  pins: MappaPin[]
  selected: string | null
  onSelect: (key: string) => void
  srSummary: string
}

// Senza pin l'inquadratura è l'Italia intera, gli stessi confini che decidono
// chi è un pin e chi finisce in "Fuori dall'Italia".
const ITALIA: L.LatLngBoundsExpression = [
  [ITALY_BOUNDS.latMin, ITALY_BOUNDS.lngMin],
  [ITALY_BOUNDS.latMax, ITALY_BOUNDS.lngMax],
]
// Con i pin, l'inquadratura li abbraccia con un margine per le etichette, ma
// non scende sotto la scala di una provincia: un pin solo non apre la mappa
// sulle strade del lungomare.
const MARGINE: L.PointExpression = [40, 40]
const ZOOM_MAX_INIZIALE = 9

// ⚠️ I DUE bordi sono un REQUISITO, non una rifinitura. Sotto il pin passano le
// tile, e nessun colore singolo supera 3:1 (WCAG 1.4.11) contro tutte: il
// bianco fa 1,60 sull'acqua OSM ma 9,84 sul bosco fitto, l'inchiostro
// esattamente l'inverso. Insieme coprono entrambi i casi — è la soluzione
// cartografica standard. Il velo chiaro sulle tile (ConquisteMap.css) sposta
// i fondi verso il bianco ma non cambia la regola: se il filtro non c'è
// (stampa, sistema che lo spegne) le tile tornano quelle vere. Per questo
// anche il pin «giocato» ha il filo d'INCHIOSTRO (il redesign lo disegna
// --ink-2, che sul grigio medio non arriva a 3:1). I rapporti sono fissati a
// numero in `src/test/contrast.test.ts`.
const ALONE = LIT.surface
const ALONE_W = 3
const CONTORNO = LIT.ink

// I riempimenti della legenda (Mappa.css li ridisegna coi token omonimi).
const RIEMPIMENTO: Record<MappaTier, string> = { vinto: LIT.accent, podio: LIT.surface, giocato: LIT.lineStrong }
const FILO_W: Record<MappaTier, number> = { vinto: 1.6, podio: 1.8, giocato: 1.4 }

// Il raggio della lib (11–15,5 px, cresce coi tornei giocati lì) è pensato per
// i pin d'una volta; il redesign li vuole più minuti. La proporzione resta.
const SCALA = 0.72
// Il bersaglio: anche il pin più piccolo si tocca su 44 px (UX §8.6).
const BERSAGLIO = 44
// I pin cadono uno dopo l'altro fino a qui; dopo, tutti insieme.
const CADUTA_MAX = 12

// ⚠️ `iconSize` va SEMPRE dichiarato. Leaflet ricava l'ancora da lì
// (`iconAnchor` assente ⇒ metà della dimensione, quindi centrata): senza, non
// applica nessun margine e l'ANGOLO in alto a sinistra dell'icona finisce
// sulla coordinata. Il pin sembra a posto in mezzo alla penisola e cade in mare
// vicino alla costa — uno scarto di una decina di km che si nota subito.

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/** Il raggio disegnato del pin, alone compreso: serve anche a sistemare le etichette. */
const raggio = (p: MappaPin) => +(p.radius * SCALA).toFixed(1)

// Marcatore disegnato a mano in SVG: le icone di default di Leaflet arrivano da
// URL che i bundler rompono, e comunque servono la forma e il colore del tier.
// Il riquadro è il bersaglio da 44; il disegno ci sta al centro, l'etichetta
// fuori (CSS), a distanza dal raggio (`--r`).
function pinIcona(p: MappaPin, selected: boolean, ordine: number): { html: string; lato: number } {
  const r = raggio(p)
  const filo = FILO_W[p.tier]
  const anello = selected ? r + 5 : r
  const disegno = Math.ceil((anello + ALONE_W + filo) * 2)
  const c = disegno / 2
  const fill = RIEMPIMENTO[p.tier]
  const html = `
<span class="conquiste-pin" data-tier="${p.tier}" style="--r: ${r + ALONE_W}px; --i: ${Math.min(ordine, CADUTA_MAX)}">
  <svg class="conquiste-dot" width="${disegno}" height="${disegno}" viewBox="0 0 ${disegno} ${disegno}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${selected ? `<circle cx="${c}" cy="${c}" r="${r + 5}" fill="none" stroke="${CONTORNO}" stroke-width="1.4" opacity="0.55"/>` : ''}
    <circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${ALONE}" stroke-width="${ALONE_W + filo * 2}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${CONTORNO}" stroke-width="${filo}"
            ${p.shared ? 'stroke-dasharray="3 2"' : ''}/>
  </svg>
  <span class="conquiste-label" aria-hidden="true">${escape(p.city)}</span>
</span>`
  return { html, lato: Math.max(BERSAGLIO, disegno) }
}

// Il cerchio del cluster riusa il vocabolario dei pin: alone, contorno
// d'inchiostro, e il riempimento della città MIGLIORE che raccoglie (arancio
// se dentro c'è una vittoria: la conquista non sparisce in un cerchio
// bianco). Dentro il numero di città raggruppate — non di tornei, o direbbe
// una cosa diversa da quella che si apre cliccando. Il cluster è un
// `role="button"` che si raggiunge col Tab (markercluster): l'SVG è muto, il
// nome glielo dà lo `<span class="sr-only">`.
const R_CLUSTER = (n: number) => (n > 9 ? 15 : 13)
function clusterIcona(n: number, tier: MappaTier): { html: string; lato: number } {
  const r = R_CLUSTER(n)
  const disegno = Math.ceil((r + ALONE_W + 1.6) * 2)
  const c = disegno / 2
  const fill = RIEMPIMENTO[tier]
  const html = `
<svg class="conquiste-cluster" width="${disegno}" height="${disegno}" viewBox="0 0 ${disegno} ${disegno}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${ALONE}" stroke-width="${ALONE_W + 3.2}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${CONTORNO}" stroke-width="1.6"/>
  <text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central"
        style="font: var(--type-footnote); font-weight: 700; font-variant-numeric: tabular-nums" fill="${CONTORNO}">${n}</text>
</svg><span class="sr-only">${n} città vicine: ingrandisci</span>`
  return { html, lato: Math.max(BERSAGLIO, disegno) }
}

type Rett = { l: number; t: number; r: number; b: number }
const siToccano = (a: Rett, b: Rett) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
// Sopra per prima: il nome che le tile scrivono da sé sta centrato sul punto,
// e un'etichetta a destra o a sinistra gli finirebbe addosso.
const POSIZIONI = ['top', 'right', 'left', 'bottom'] as const
// Lo spazio fra il bordo del pin e l'etichetta (lo stesso di ConquisteMap.css).
const STACCO = 4

/**
 * Le etichette delle città: ognuna prova sopra, destra, sinistra, sotto e
 * prende il primo posto libero (dentro la mappa, lontano dai pin e dalle
 * etichette già messe); se non ne trova, tace — il nome resta nell'elenco.
 * Prima le città migliori: «Cervia» vince su «Milano Marittima».
 * Tutto aritmetico (punti del contenitore e misure delle etichette): la
 * caduta dei pin e le animazioni dei cluster non falsano i conti.
 */
function disponiEtichette(map: L.Map, gruppo: L.MarkerClusterGroup, marcatori: Map<L.Marker, MappaPin>) {
  const size = map.getSize()
  const occupati: Rett[] = []
  const visibili: { m: L.Marker; p: MappaPin; x: number; y: number }[] = []
  const cluster = new Set<L.Marker>()
  marcatori.forEach((p, m) => {
    const parent = gruppo.getVisibleParent(m) as L.Marker | null
    if (!parent) return
    const { x, y } = map.latLngToContainerPoint(parent.getLatLng())
    if (parent === m) {
      const r = raggio(p) + ALONE_W
      occupati.push({ l: x - r, t: y - r, r: x + r, b: y + r })
      visibili.push({ m, p, x, y })
    } else if (!cluster.has(parent)) {
      cluster.add(parent)
      const n = (parent as unknown as L.MarkerCluster).getChildCount()
      const r = R_CLUSTER(n) + ALONE_W
      occupati.push({ l: x - r, t: y - r, r: x + r, b: y + r })
    }
  })
  visibili.sort((a, b) => a.p.rank - b.p.rank || b.p.count - a.p.count)
  for (const { m, p, x, y } of visibili) {
    const el = m.getElement()?.querySelector<HTMLElement>('.conquiste-label')
    if (!el) continue
    const w = el.offsetWidth
    const h = el.offsetHeight
    const d = raggio(p) + ALONE_W + STACCO
    const posti: Record<(typeof POSIZIONI)[number], Rett> = {
      right: { l: x + d, t: y - h / 2, r: x + d + w, b: y + h / 2 },
      top: { l: x - w / 2, t: y - d - h, r: x + w / 2, b: y - d },
      left: { l: x - d - w, t: y - h / 2, r: x - d, b: y + h / 2 },
      bottom: { l: x - w / 2, t: y + d, r: x + w / 2, b: y + d + h },
    }
    const posto = POSIZIONI.find((k) => {
      const q = posti[k]
      return q.l >= 0 && q.t >= 0 && q.r <= size.x && q.b <= size.y && !occupati.some((o) => siToccano(o, q))
    })
    if (posto) {
      occupati.push(posti[posto])
      el.dataset.pos = posto
      el.removeAttribute('data-hidden')
    } else {
      el.setAttribute('data-hidden', '')
    }
  }
}

export default function ConquisteMap({ pins, selected, onSelect, srSummary }: ConquisteMapProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const gruppoRef = useRef<L.MarkerClusterGroup | null>(null)
  const marcatoriRef = useRef(new Map<L.Marker, MappaPin>())
  // Vero dopo la prima inquadratura: prima la mappa non ha una vista.
  const prontaRef = useRef(false)
  // `onSelect` cambia a ogni render del genitore: tenerlo in un ref evita di
  // ricostruire la mappa (e perdere zoom e posizione) a ogni click.
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  // I pin dell'apertura decidono l'inquadratura; quelli dopo (filtro,
  // selezione) non la toccano.
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  // I limiti dello zoom per i pulsanti +/−; `null` finché la mappa non c'è
  // (o non può esserci: jsdom, Leaflet che lancia), e allora i pulsanti no.
  const [zoom, setZoom] = useState<{ canIn: boolean; canOut: boolean } | null>(null)

  // ---- La mappa nasce una volta sola. -------------------------------------
  useEffect(() => {
    const el = boxRef.current
    const root = rootRef.current
    if (!el || !root) return
    // Niente pan/zoom animati per chi ha chiesto meno movimento (MOTION.md E4).
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    // Il fotogramma dell'inquadratura va annullato allo smontaggio: senza, in
    // StrictMode (e con un'uscita rapida dalla vista) `fitBounds` girava su una
    // mappa già rimossa e lanciava.
    let raf = 0
    // La caduta dei pin vale per l'apertura: dopo, chi rientra (un cluster che
    // si apre, un filtro che cambia) compare fermo.
    root.setAttribute('data-drop', '')
    const fineCaduta = window.setTimeout(() => root.removeAttribute('data-drop'), 2200)
    try {
      const map = L.map(el, {
        // La rotella scorre la pagina: dentro una scheda lunga una mappa che
        // cattura lo scroll è una trappola. Restano trascinamento, doppio
        // click e i bottoni +/−.
        scrollWheelZoom: false,
        // Il +/− di Leaflet (26px, in inglese) lascia il posto a MapZoom.
        zoomControl: false,
        attributionControl: true,
        keyboard: true,
        zoomAnimation: !calm,
        fadeAnimation: !calm,
        markerZoomAnimation: !calm,
      })
      // L'attribuzione di OpenStreetMap è dovuta; il «Leaflet» con la
      // bandiera davanti no, e nell'angolo di una card piccola pesa.
      map.attributionControl.setPrefix(false)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
        // Il filtro chiaro del redesign sta in ConquisteMap.css.
        className: 'conquiste-tiles',
      }).addTo(map)

      const gruppo = L.markerClusterGroup({
        // Raggio stretto: due città vicine si separano presto: da Rimini a
        // Riccione ci sono 9 km, e a zoom medio devono essere due pin distinti.
        maxClusterRadius: 38,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // Oltre questo zoom niente gruppi: se due campi restano sovrapposti al
        // massimo ingrandimento, meglio due pin che si sfiorano che un cerchio
        // col numero da cui non si esce più.
        disableClusteringAtZoom: 13,
        spiderfyOnMaxZoom: false,
        animate: !calm,
        iconCreateFunction: (c) => {
          // Il tier migliore fra le città dentro (rank più basso = meglio).
          const dentro = c.getAllChildMarkers().map((m) => marcatoriRef.current.get(m)).filter((p): p is MappaPin => !!p)
          const migliore = dentro.reduce<MappaPin | null>((a, p) => (!a || p.rank < a.rank ? p : a), null)
          const { html, lato } = clusterIcona(c.getChildCount(), migliore?.tier ?? 'podio')
          return L.divIcon({ className: 'conquiste-marker', html, iconSize: [lato, lato] })
        },
      })
      map.addLayer(gruppo)

      mapRef.current = map
      gruppoRef.current = gruppo
      const limiti = () => setZoom({ canIn: map.getZoom() < map.getMaxZoom(), canOut: map.getZoom() > map.getMinZoom() })
      const etichette = () => disponiEtichette(map, gruppo, marcatoriRef.current)
      // Prima di `fitBounds` la mappa non ha ancora uno zoom: i limiti si
      // leggono dopo l'inquadratura, poi a ogni `zoomend`. Le etichette si
      // risistemano a ogni spostamento e quando un cluster finisce di aprirsi.
      map.on('zoomend', limiti)
      map.on('zoomend moveend', etichette)
      gruppo.on('animationend', etichette)
      // ⚠️ L'ORDINE conta. Il contenitore nasce dentro un layout che si
      // assesta dopo il primo frame (card, toggle di vista): `fitBounds`
      // chiamato prima calcola lo zoom su un riquadro sbagliato e ci resta.
      // Quindi prima `invalidateSize`, che rilegge le misure vere, e solo dopo
      // l'inquadratura.
      raf = requestAnimationFrame(() => {
        map.invalidateSize()
        const punti = pinsRef.current.map((p) => L.latLng(p.lat, p.lng))
        if (punti.length) map.fitBounds(L.latLngBounds(punti), { padding: MARGINE, maxZoom: ZOOM_MAX_INIZIALE, animate: false })
        else map.fitBounds(ITALIA, { animate: false })
        prontaRef.current = true
        limiti()
        etichette()
      })
    } catch {
      // Ambienti senza layout reale (jsdom) o tile irraggiungibili: la
      // schermata resta leggibile, l'elenco città sotto porta tutti i fatti.
      window.clearTimeout(fineCaduta)
      return
    }
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fineCaduta)
      mapRef.current?.remove()
      mapRef.current = null
      gruppoRef.current = null
      prontaRef.current = false
      marcatoriRef.current.clear()
      setZoom(null)
    }
  }, [])

  // ---- I marcatori seguono i pin (filtro per risultato, cambio stagione). --
  useEffect(() => {
    const gruppo = gruppoRef.current
    const map = mapRef.current
    if (!gruppo || !map) return
    gruppo.clearLayers()
    marcatoriRef.current.clear()
    const marcatori = pins.map((p, i) => {
      const sel = selected === p.key
      const { html, lato } = pinIcona(p, sel, i)
      const m = L.marker([p.lat, p.lng], {
        // Senza l'emoji del valore grezzo (C15): lo screen reader la leggerebbe.
        title: placementText(p.srLabel),
        alt: placementText(p.srLabel),
        keyboard: false,
        // I pin migliori stanno sopra ai vicini: stessa regola dell'ordine di
        // disegno della lib, tradotta in z-index.
        zIndexOffset: (9 - p.rank) * 10 + (sel ? 500 : 0),
        icon: L.divIcon({ className: 'conquiste-marker', html, iconSize: [lato, lato] }),
      })
      m.on('click', () => selectRef.current(p.key))
      marcatoriRef.current.set(m, p)
      return m
    })
    gruppo.addLayers(marcatori)
    // Prima dell'inquadratura la mappa non ha una vista: ci pensa il suo rAF.
    if (prontaRef.current) disponiEtichette(map, gruppo, marcatoriRef.current)
  }, [pins, selected])

  return (
    <div
      ref={rootRef}
      // `region` e non `application`: la mappa resta esplorabile con i comandi
      // normali dello screen reader, e il riassunto dice subito che l'elenco
      // completo è più sotto.
      role="region"
      aria-label={srSummary}
      className="conquiste-map"
    >
      {/* Il fondo in linea: quello del CSS di Leaflet (#ddd, fuori dai
          livelli) vincerebbe su qualunque regola del nostro foglio. */}
      <div ref={boxRef} className="conquiste-map-box" style={{ background: 'var(--surface-pressed)' }} />
      {zoom && (
        <MapZoom
          onIn={() => mapRef.current?.zoomIn()}
          onOut={() => mapRef.current?.zoomOut()}
          canIn={zoom.canIn}
          canOut={zoom.canOut}
        />
      )}
    </div>
  )
}
