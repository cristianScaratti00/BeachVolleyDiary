import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Due pagine indipendenti: l'app (index.html, React + Supabase) e la
      // landing pubblica su /presentazione/, che è HTML statico e non importa
      // niente da src/. Restano due bundle separati: chi apre la landing non
      // scarica una riga dell'app.
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
        },
      },
    },
  },
})
