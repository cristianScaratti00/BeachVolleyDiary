import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
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
