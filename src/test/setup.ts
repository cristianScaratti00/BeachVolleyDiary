import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Smonta l'albero tra un test e l'altro: senza, il secondo `getByRole` trova
// due volte lo stesso nodo e il fallimento non dice perché.
afterEach(cleanup)

// jsdom non fa layout, quindi non implementa `scrollIntoView`: chiamarlo alza
// un TypeError. Chi lo usa lo fa per tenere in vista la voce raggiunta da
// tastiera — un effetto che qui non si può né vedere né verificare, ma la cui
// assenza farebbe fallire il test per il motivo sbagliato.
Element.prototype.scrollIntoView ??= () => {}
