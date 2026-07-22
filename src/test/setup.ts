import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Smonta l'albero tra un test e l'altro: senza, il secondo `getByRole` trova
// due volte lo stesso nodo e il fallimento non dice perché.
afterEach(cleanup)
