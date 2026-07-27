// ============================================================================
// "La mappa delle conquiste" su Leaflet: un pin per ogni città in cui hai
// giocato, colorato dal miglior piazzamento ottenuto lì.
//
// Presentazionale: riceve i pin già calcolati da `deriveMappa` (coordinate
// comprese) e li appoggia sulla mappa. Nessuna geometria qui dentro — la stessa
// divisione del vecchio disegno SVG, e della sorella minore `VenueMap`.
//
// È l'unico punto della schermata che tocca Leaflet, ed è importato in `lazy()`
// da `Mappa.tsx`: la libreria, il plugin cluster e i due CSS finiscono in un
// chunk a parte, scaricato solo da chi apre davvero la vista mappa.
//
// NB (privacy): le tile arrivano da tile.openstreetmap.org, quindi aprire la
// mappa comporta una richiesta a un servizio esterno con il riquadro
// geografico. Stesso compromesso già accettato in `VenueMap`; la ricerca del
// luogo, invece, resta senza rete (gazetteer committato + GPS del dispositivo).
//
// ⚠️ Accessibilità: i pin NON sono raggiungibili da tastiera, ed è voluto. La
// superficie accessibile è l'elenco città sotto la mappa, che porta gli stessi
// fatti in testo — vedi il commento in `Mappa.tsx`. Qui il contenitore è un
// `region` con un riassunto testuale, così chi usa uno screen reader sa cosa
// sta saltando e dove trovarne il contenuto.
// ============================================================================
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import type { MappaPin } from '../lib/derive.mappa'
import { ITALY_BOUNDS } from '../lib/geo'
import { INK } from './ui'

interface ConquisteMapProps {
  pins: MappaPin[]
  selected: string | null
  onSelect: (key: string) => void
  srSummary: string
  height?: number
}

// Inquadratura di partenza: l'Italia intera, gli stessi confini che decidono
// chi è un pin e chi finisce in "Fuori dall'Italia". Le due cose devono
// coincidere, o si vedrebbe un pin appena fuori dal bordo iniziale.
const ITALIA: L.LatLngBoundsExpression = [
  [ITALY_BOUNDS.latMin, ITALY_BOUNDS.lngMin],
  [ITALY_BOUNDS.latMax, ITALY_BOUNDS.lngMax],
]

// ⚠️ I DUE bordi sono un REQUISITO, non una rifinitura. Sotto il pin passano le
// tile, che possono essere di qualunque colore, e nessun colore singolo supera
// 3:1 (WCAG 1.4.11) contro tutte: il bianco fa 1,60 sull'acqua OSM ma 9,84 sul
// bosco fitto, il navy esattamente l'inverso (8,87 e 1,45). Insieme coprono
// entrambi i casi — è la soluzione cartografica standard. Togliere uno dei due
// come "rumore visivo" fa sparire i pin su metà della penisola, in silenzio.
// I rapporti sono fissati a numero in `src/test/contrast.test.ts`.
const ALONE = '#fff'
const ALONE_W = 3
const CONTORNO = INK
const CONTORNO_W = 1.6

// ⚠️ `iconSize` va SEMPRE dichiarato, ed è il motivo per cui queste funzioni
// restituiscono anche il lato invece del solo markup. Leaflet ricava l'ancora
// da lì (`iconAnchor` assente ⇒ metà della dimensione, quindi centrata): senza,
// non applica nessun margine e l'ANGOLO in alto a sinistra dell'icona finisce
// sulla coordinata. Il pin sembra a posto in mezzo alla penisola e cade in mare
// vicino alla costa — uno scarto di una decina di km che si nota subito.

// Marcatore disegnato a mano in SVG: le icone di default di Leaflet arrivano da
// URL che i bundler rompono, e comunque servono la forma e il colore del tier.
function pinIcona(p: MappaPin, selected: boolean): { html: string; lato: number } {
  const r = p.radius
  // Il riquadro tiene dentro il cerchio, l'alone e l'anello di selezione: se sta
  // stretto l'SVG ritaglia il pin invece di traboccare.
  const anello = selected ? r + 5 : r
  const lato = Math.ceil((anello + ALONE_W + CONTORNO_W) * 2)
  const c = lato / 2
  const html = `
<svg width="${lato}" height="${lato}" viewBox="0 0 ${lato} ${lato}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${selected ? `<circle cx="${c}" cy="${c}" r="${r + 5}" fill="none" stroke="${CONTORNO}" stroke-width="1.4" opacity="0.55"/>` : ''}
  <circle cx="${c}" cy="${c}" r="${r}" fill="${p.hollow ? '#fff' : p.fill}"
          stroke="${ALONE}" stroke-width="${ALONE_W + CONTORNO_W * 2}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="${p.hollow ? '#fff' : p.fill}"
          stroke="${CONTORNO}" stroke-width="${CONTORNO_W}"
          ${p.shared ? 'stroke-dasharray="3 2"' : ''}/>
  ${p.inner > 0 ? `<circle cx="${c}" cy="${c}" r="${p.inner}" fill="#fff"/>` : ''}
</svg>`
  return { html, lato }
}

// Il cerchio del cluster riusa il vocabolario dei pin: fondo bianco, contorno
// navy, alone. Dentro il numero di città raggruppate — non di tornei, o
// direbbe una cosa diversa da quella che si apre cliccando.
function clusterIcona(n: number): { html: string; lato: number } {
  const r = n > 9 ? 17 : 15
  const lato = Math.ceil((r + ALONE_W + CONTORNO_W) * 2)
  const c = lato / 2
  const html = `
<svg width="${lato}" height="${lato}" viewBox="0 0 ${lato} ${lato}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="${c}" cy="${c}" r="${r}" fill="#fff" stroke="${ALONE}" stroke-width="${ALONE_W + CONTORNO_W * 2}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="#fff" stroke="${CONTORNO}" stroke-width="${CONTORNO_W}"/>
  <text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central"
        font-family="'Nunito Sans', sans-serif" font-weight="800" font-size="13" fill="${CONTORNO}">${n}</text>
</svg>`
  return { html, lato }
}

export default function ConquisteMap({ pins, selected, onSelect, srSummary, height = 380 }: ConquisteMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const gruppoRef = useRef<L.MarkerClusterGroup | null>(null)
  // `onSelect` cambia a ogni render del genitore: tenerlo in un ref evita di
  // ricostruire la mappa (e perdere zoom e posizione) a ogni click.
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  // ---- La mappa nasce una volta sola. -------------------------------------
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    // Stessa cortesia del resto dell'app (@media prefers-reduced-motion in
    // index.css): niente pan/zoom animati per chi ha chiesto meno movimento.
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    try {
      const map = L.map(el, {
        // La rotella scorre la pagina: dentro una scheda lunga una mappa che
        // cattura lo scroll è una trappola. Restano trascinamento, doppio
        // click e i bottoni +/−.
        scrollWheelZoom: false,
        attributionControl: true,
        keyboard: true,
        zoomAnimation: !calm,
        fadeAnimation: !calm,
        markerZoomAnimation: !calm,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
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
          const { html, lato } = clusterIcona(c.getChildCount())
          return L.divIcon({ className: '', html, iconSize: [lato, lato] })
        },
      })
      map.addLayer(gruppo)

      mapRef.current = map
      gruppoRef.current = gruppo
      // ⚠️ L'ORDINE conta, ed è la differenza fra vedere l'Italia e vedere la
      // riviera romagnola. Il contenitore nasce dentro un layout che si assesta
      // dopo il primo frame (card, toggle di vista): `fitBounds` chiamato prima
      // calcola lo zoom su un riquadro sbagliato e ci resta. Quindi prima
      // `invalidateSize`, che rilegge le misure vere, e solo dopo l'inquadratura.
      requestAnimationFrame(() => {
        map.invalidateSize()
        map.fitBounds(ITALIA)
      })
    } catch {
      // Ambienti senza layout reale (jsdom) o tile irraggiungibili: la
      // schermata resta leggibile, l'elenco città sotto porta tutti i fatti.
      return
    }
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      gruppoRef.current = null
    }
  }, [])

  // ---- I marcatori seguono i pin (filtro per risultato, cambio stagione). --
  useEffect(() => {
    const gruppo = gruppoRef.current
    if (!gruppo) return
    gruppo.clearLayers()
    const marcatori = pins.map((p) => {
      const sel = selected === p.key
      const { html, lato } = pinIcona(p, sel)
      const m = L.marker([p.lat, p.lng], {
        title: p.srLabel,
        alt: p.srLabel,
        keyboard: false,
        // I pin migliori stanno sopra ai vicini: stessa regola dell'ordine di
        // disegno di prima, tradotta in z-index.
        zIndexOffset: (9 - p.rank) * 10 + (sel ? 500 : 0),
        icon: L.divIcon({ className: '', html, iconSize: [lato, lato] }),
      })
      m.on('click', () => selectRef.current(p.key))
      return m
    })
    gruppo.addLayers(marcatori)
  }, [pins, selected])

  return (
    <div
      ref={boxRef}
      // `region` e non `application`: la mappa resta esplorabile con i comandi
      // normali dello screen reader, e il riassunto dice subito che l'elenco
      // completo è più sotto.
      role="region"
      aria-label={srSummary}
      style={{
        height,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(27,42,74,.1)',
        background: '#F2F0EC',
      }}
    />
  )
}
