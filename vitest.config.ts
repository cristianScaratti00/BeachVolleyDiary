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
    // Vitest svuota ogni import di CSS, anche `?raw`. I due fogli dei token
    // fanno eccezione perché src/styles/tokens.test.ts li legge come testo per
    // ricalcolare il contrasto: senza questa riga il test vedrebbe "".
    // Solo loro: il CSS dei componenti resta fuori da jsdom come prima.
    // Il terzo è il foglio dei token della landing, che
    // src/styles/landing.tokens.test.ts legge allo stesso modo.
    css: { include: [/src\/styles\/(tokens|materials)\.css/, /presentazione\/styles\/tokens\.css/] },
  },
})
