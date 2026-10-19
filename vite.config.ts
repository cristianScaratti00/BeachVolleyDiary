import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { componiLanding } from './presentazione/build/componi'

// La landing `/presentazione` è un modello: scena, Pallo, marchio, mappa,
// icone e numeri ci entrano qui, dalle stesse fonti dell'app (gli snapshot in
// presentazione/js/generati e Icon.paths.ts). Così il primo fotogramma è già
// la pagina intera, anche senza JavaScript (ART_DIRECTION §L13 A12).
function landing(): Plugin {
  return {
    name: 'landing',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => (ctx.path.startsWith('/presentazione/') ? componiLanding(html) : html),
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), landing()],
  build: {
    rollupOptions: {
      // Due pagine indipendenti: l'app (index.html, React + Supabase) e la
      // landing pubblica su /presentazione/. La landing non importa React né
      // Supabase: da src/ prende solo moduli senza framework (Pallo.vita,
      // Odometro, le regole della Partita live, il copione della chat, il
      // palleggio della scena) e i fogli dei token, del vetro e delle
      // primitive. Restano due bundle separati: chi apre la landing non
      // scarica l'app.
      input: {
        main: 'index.html',
        presentazione: 'presentazione/index.html',
      },
      output: {
        // Separa i vendor pesanti in chunk propri: caricano in parallelo e
        // restano in cache tra i deploy (cambiano di rado). Il resto dell'app
        // (più le parti lazy: CreaChat, StoryModal, Diario) resta nel bundle
        // principale o nei chunk async generati da import() dinamico.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          if (id.includes('@supabase')) return 'supabase'
          // Leaflet: un vendor da 43 KB gz che si carica solo con le mappe
          // (resta lazy). Senza questa riga Rollup lo univa a MapZoom in un
          // chunk chiamato «MapZoom-*.js», e una modifica a un componente
          // dell'app ne invalidava la cache. Solo il nucleo: il cluster serve
          // alla mappa delle conquiste e resta nel suo chunk, così la mappa del
          // luogo non lo scarica.
          if (/[\\/]node_modules[\\/]leaflet[\\/]/.test(id)) return 'leaflet'
          // Il vetro liquido (liquid-glass-react): arriva in lazy al primo vetro
          // montato (LiquidGlass.tsx). Un nome stabile per la cache.
          if (id.includes('liquid-glass-react')) return 'liquid-glass'
        },
      },
    },
  },
})
