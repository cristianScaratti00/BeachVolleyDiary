// ============================================================================
// Fondazione delle animazioni (Motion, motion.dev). Due cose sole: come la
// libreria entra nell'app, e il vocabolario di tempi condiviso.
//
// ── Perché `m` e non `motion` ────────────────────────────────────────────────
// `<motion.div>` tira dentro tutta la libreria a prescindere da cosa si usa.
// `<m.div>` porta solo il componente, e le funzionalità arrivano da qui.
//
// ── Perché le feature sono STATICHE, e non un `import()` ─────────────────────
// Questa è la parte controintuitiva, misurata su questo progetto e non stimata.
// Caricare le feature in lazy sembra la scelta ovvia — è quella che il repo fa
// con Leaflet — ma qui costa di più:
//
//   strategia              chunk principale   chunk async   totale scaricato
//   nessuna animazione            53,4 kB             —           53,4 kB
//   feature in lazy               83,6 kB        38,3 kB          121,8 kB
//   feature statiche (questa)     99,5 kB             —            99,5 kB
//
// Due ragioni. La prima: `AnimatePresence` e gli hook (`animate`,
// `useMotionValue`, `useReducedMotion`) sono importati staticamente in cinque
// file — sono strutturali, non differibili — e ciò che l'`import()` riporta si
// sovrappone in buona parte a quello, duplicando ~22 kB. La seconda, decisiva:
// il chunk "differito" non si differisce affatto, perché i numeri delle
// `StatTile` cominciano a salire sulla PRIMA schermata. Il risultato era un
// primo caricamento più leggero seguito subito da una seconda richiesta più
// grande del risparmio.
//
// Resta un `LazyMotion` (non un import diretto) perché è ciò che rende
// utilizzabili gli `m.*`, e perché il giorno in cui nessuna animazione parte
// sulla schermata iniziale tornare al lazy è cambiare questa riga.
//
// ── Perché `domMax` e non `domAnimation` ─────────────────────────────────────
// `domAnimation` non contiene né il trascinamento né le animazioni di layout,
// che sono esattamente ciò che usiamo (bottom-sheet trascinabile, pillola del
// filtro che scivola). Con `domAnimation` non falliscono: semplicemente non
// succede niente.
//
// ── Perché NON `strict` ──────────────────────────────────────────────────────
// `strict` farebbe esplodere ogni `motion.*` scritto per sbaglio, ed è la
// guardia che vorremmo. Ma i test montano i componenti da soli, senza questo
// provider, e in `strict` `m.*` fuori da `LazyMotion` lancia: significherebbe
// avvolgere diciannove file di test per una guardia. Senza, fuori dal provider
// gli elementi si disegnano e basta — che in jsdom è il comportamento giusto.
// ============================================================================
import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import type { ReactNode } from 'react'

// Statiche di proposito: la tabella qui sopra dice perché. Rimetterle in lazy
// è `() => import('motion/react').then((mod) => mod.domMax)`, ma prima va
// tolta ogni animazione dalla schermata iniziale, o si paga due volte.
const features = domMax

// ---------------------------------------------------------------------------
// Vocabolario dei tempi
// ---------------------------------------------------------------------------
// Tre curve, non una per componente: è ciò che fa sembrare le animazioni parte
// della stessa app invece di una collezione di effetti.

/** Comparse e sparizioni. La stessa curva del vecchio `@keyframes sheet`. */
export const ENTRATA = { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] } as const

/** Cambi di stato immediati (colori, opacità): sotto i 200ms non si "aspetta". */
export const SVELTO = { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] } as const

/**
 * Tutto ciò che si muove nello spazio: la pillola del filtro, il foglio che
 * torna in posizione. Una molla, non una durata — un oggetto che si sposta e
 * si ferma di scatto sembra finto, e reagire alla velocità del dito con una
 * durata fissa è impossibile.
 */
export const MOLLA = { type: 'spring', stiffness: 460, damping: 38, mass: 0.9 } as const

interface MotionRootProps {
  children: ReactNode
}

/**
 * Da avvolgere una volta sola attorno all'app.
 *
 * `reducedMotion="user"` è la ragione principale per cui questo provider
 * esiste: disattiva trasformazioni e movimento per chi ha chiesto meno
 * animazioni nel sistema, lasciando vivi i dissolvenza. Prima l'app rispettava
 * quella preferenza in UN punto solo (`.wrapped-card-anim` in index.css),
 * mentre le altre sette animazioni CSS la ignoravano.
 */
export function MotionRoot({ children }: MotionRootProps) {
  return (
    <LazyMotion features={features}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
