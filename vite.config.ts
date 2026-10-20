import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { componiLanding } from './presentazione/build/componi'

// La landing `/presentazione` è un modello: il marchio e le icone ci entrano
// qui, dalle stesse fonti dell'app (BrandMark e Icon.paths.ts). La pagina è
// solo HTML e CSS: il primo fotogramma è già la pagina intera.
function landing(): Plugin {
  return {
    name: 'landing',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => (ctx.path.startsWith('/presentazione/') ? componiLanding(html) : html),
    },
  }
}

// Geist (il sottoinsieme latino) parte insieme al CSS, non dopo di lui: sulla
// rete lenta (Slow 4G) il titolo dell'hero restava ~1.3s nel carattere di
// riserva. Solo in build, dove il nome ha l'hash; il
// `crossorigin` serve anche dallo stesso sito, o il font si scarica due volte.
function landingFont(): Plugin {
  return {
    name: 'landing-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html, ctx) => {
        if (!ctx.path.startsWith('/presentazione/') || !ctx.bundle) return html
        const font = Object.keys(ctx.bundle).find((f) => /geist-latin-wght-normal-[\w-]+\.woff2$/.test(f))
        if (!font) return html
        return { html, tags: [{ tag: 'link', attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: true }, injectTo: 'head-prepend' }] }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), landing(), landingFont()],
  build: {
    rollupOptions: {
      // Due pagine indipendenti: l'app (index.html, React + Supabase) e la
      // landing pubblica su /presentazione/. La landing non ha JavaScript: da
      // src/ prende solo i fogli dei token, della base e delle icone. Restano
      // due bundle separati: chi apre la landing non scarica l'app.
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
