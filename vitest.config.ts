import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config separata da vite.config.ts: la build di produzione non deve caricare
// nulla che riguardi i test (né il plugin in modalità test, né jsdom).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // I test qui sono deterministici per costruzione: nessuna rete, nessun
    // timer reale, "oggi" sempre iniettato. Se uno diventa lento è un sintomo.
    testTimeout: 5000,
    restoreMocks: true,
  },
})
