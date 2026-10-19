// ============================================================================
// Mappa in-app del luogo di un torneo (Leaflet + tile OpenStreetMap).
//
// Presentazionale: riceve già le coordinate, non geocodifica nulla. È l'unico
// punto dell'app che carica Leaflet, ed è importato in `lazy()` dal dettaglio
// torneo: la libreria e il suo CSS finiscono in un chunk a parte, scaricato solo
// quando si apre la mappa dalla card del luogo («Mappa») di un torneo che ha
// davvero una posizione.
//
// NB (privacy): le tile arrivano da tile.openstreetmap.org, quindi mostrare la
// mappa comporta una richiesta a un servizio esterno con il riquadro
// geografico. È il compromesso implicito nell'avere una mappa vera in-app.
// (Anche la ricerca del luogo in VenuePicker usa la rete: photon.komoot.io.)
//
// Senza rete, o con OSM giù, la cornice resta e dice «Mappa non disponibile.»:
// il link «Apri la mappa ↗» sotto la mappa resta (UX §6.4).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LIT } from '../lib/theme'
import { MapZoom } from './MapZoom'
import './VenueMap.css'

// Segnaposto disegnato a mano: nessuna immagine da caricare (le icone di default
// di Leaflet arrivano da URL che i bundler rompono). È una stringa HTML di
// Leaflet, dove una custom property non arriva: i colori sono i `LIT` dei token,
// con l'alone bianco come i pin della mappa delle conquiste (ART_DIRECTION §4.5).
const PIN_HTML = `
<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14 35s12-13.2 12-21A12 12 0 1 0 2 14c0 7.8 12 21 12 21Z" fill="${LIT.accent}" stroke="${LIT.surface}" stroke-width="2.5"/>
  <circle cx="14" cy="14" r="4.4" fill="${LIT.surface}"/>
</svg>`

interface VenueMapProps {
  lat: number
  lng: number
  label: string // nome del luogo, per l'etichetta accessibile e il tooltip
}

export default function VenueMap({ lat, lng, label }: VenueMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [guasta, setGuasta] = useState(false)
  // I limiti per i pulsanti +/−; `null` finché la mappa non c'è.
  const [zoom, setZoom] = useState<{ canIn: boolean; canOut: boolean } | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    // Stessa cortesia del resto dell'app (`--motion-scale` a 0 nei token):
    // niente pan/zoom animati per chi ha chiesto meno movimento.
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let map: L.Map | null = null
    let caricate = 0
    // Annullato allo smontaggio, come in ConquisteMap: su una mappa già
    // rimossa `invalidateSize` lancerebbe.
    let raf = 0
    setGuasta(false)
    try {
      map = L.map(el, {
        center: [lat, lng],
        zoom: 15,
        // La rotella scorre la pagina: su una scheda lunga una mappa che cattura
        // lo scroll è una trappola. Restano trascinamento, doppio click e +/−.
        scrollWheelZoom: false,
        // Il +/− di Leaflet (26px, in inglese) lascia il posto a MapZoom.
        zoomControl: false,
        attributionControl: true,
        keyboard: true, // frecce per spostarsi quando la mappa ha il focus
        zoomAnimation: !calm,
        fadeAnimation: !calm,
        markerZoomAnimation: !calm,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      })
        // Nessuna tile arrivata e la prima che fallisce: rete assente o OSM
        // giù. Basta una tile caricata per considerarla viva.
        .on('tileload', () => {
          caricate++
          setGuasta(false)
        })
        .on('tileerror', () => {
          if (caricate === 0) setGuasta(true)
        })
        .addTo(map)
      L.marker([lat, lng], {
        title: label,
        alt: label,
        keyboard: false,
        icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [28, 36], iconAnchor: [14, 35] }),
      }).addTo(map)
      mapRef.current = map
      const m = map
      const limiti = () => setZoom({ canIn: m.getZoom() < m.getMaxZoom(), canOut: m.getZoom() > m.getMinZoom() })
      m.on('zoomend', limiti)
      limiti()
      // Il contenitore nasce dentro un layout che può assestarsi dopo il primo
      // frame (card, immagini): senza questo la mappa resta a metà tile.
      raf = requestAnimationFrame(() => map?.invalidateSize())
    } catch {
      // Ambienti senza layout reale: la scheda resta leggibile e il link
      // "Apri la mappa" sotto continua a funzionare.
      setGuasta(true)
      return
    }
    return () => {
      cancelAnimationFrame(raf)
      map?.remove()
      mapRef.current = null
      setZoom(null)
    }
  }, [lat, lng, label])

  return (
    <div className="venuemap">
      <div
        ref={boxRef}
        // `region` e non `application`: la mappa resta esplorabile con i comandi
        // normali dello screen reader, e chi non la può usare ha comunque il link
        // "Apri la mappa" subito sotto.
        role="region"
        aria-label={`Mappa di ${label}`}
        className="venuemap-box"
      />
      {zoom && !guasta && (
        <MapZoom
          onIn={() => mapRef.current?.zoomIn()}
          onOut={() => mapRef.current?.zoomOut()}
          canIn={zoom.canIn}
          canOut={zoom.canOut}
        />
      )}
      {guasta && (
        <p className="venuemap-error" role="status">
          Mappa non disponibile.
        </p>
      )}
    </div>
  )
}
