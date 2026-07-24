// ============================================================================
// Mappa in-app del luogo di un torneo (Leaflet + tile OpenStreetMap).
//
// Presentazionale: riceve già le coordinate, non geocodifica nulla. È l'unico
// punto dell'app che carica Leaflet, ed è importato in `lazy()` dal dettaglio
// torneo: la libreria e il suo CSS finiscono in un chunk a parte, scaricato solo
// da chi apre un torneo che ha davvero una posizione.
//
// NB (privacy): le tile arrivano da tile.openstreetmap.org, quindi mostrare la
// mappa comporta una richiesta a un servizio esterno con il riquadro
// geografico. È il compromesso implicito nell'avere una mappa vera in-app; la
// ricerca del luogo, invece, resta senza rete (GPS del dispositivo o coordinate
// incollate a mano) — vedi VenuePicker.
// ============================================================================
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Segnaposto disegnato a mano: nessuna immagine da caricare (le icone di default
// di Leaflet arrivano da URL che i bundler rompono) e stessa tinta dei pallini
// piazzamento del resto dell'app.
const PIN_HTML = `
<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M14 35s12-13.2 12-21A12 12 0 1 0 2 14c0 7.8 12 21 12 21Z" fill="#FF6B35" stroke="#fff" stroke-width="2.5"/>
  <circle cx="14" cy="14" r="4.4" fill="#fff"/>
</svg>`

interface VenueMapProps {
  lat: number
  lng: number
  label: string // nome del luogo, per l'etichetta accessibile e il tooltip
  height?: number
}

export default function VenueMap({ lat, lng, label, height = 200 }: VenueMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    // Stessa cortesia del resto dell'app (@media prefers-reduced-motion in
    // index.css): niente pan/zoom animati per chi ha chiesto meno movimento.
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let map: L.Map | null = null
    try {
      map = L.map(el, {
        center: [lat, lng],
        zoom: 15,
        // La rotella scorre la pagina: su una scheda lunga una mappa che cattura
        // lo scroll è una trappola. Restano trascinamento, doppio click e +/−.
        scrollWheelZoom: false,
        attributionControl: true,
        keyboard: true, // frecce per spostarsi quando la mappa ha il focus
        zoomAnimation: !calm,
        fadeAnimation: !calm,
        markerZoomAnimation: !calm,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)
      L.marker([lat, lng], {
        title: label,
        alt: label,
        keyboard: false,
        icon: L.divIcon({ className: '', html: PIN_HTML, iconSize: [28, 36], iconAnchor: [14, 35] }),
      }).addTo(map)
      // Il contenitore nasce dentro un layout che può assestarsi dopo il primo
      // frame (card, immagini): senza questo la mappa resta a metà tile.
      requestAnimationFrame(() => map?.invalidateSize())
    } catch {
      // Ambienti senza layout reale (o tile irraggiungibili): la scheda resta
      // leggibile e il link "Apri la mappa" accanto continua a funzionare.
      return
    }
    return () => { map?.remove() }
  }, [lat, lng, label])

  return (
    <div
      ref={boxRef}
      // `region` e non `application`: la mappa resta esplorabile con i comandi
      // normali dello screen reader, e chi non la può usare ha comunque il link
      // "Apri la mappa" accanto al titolo della sezione.
      role="region"
      aria-label={`Mappa di ${label}`}
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
