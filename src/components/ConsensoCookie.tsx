import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence, useIsPresent, useReducedMotion } from 'motion/react'
import { decidi, useScelta } from '../lib/consenso'
import { ENTRATA, SVELTO } from './Motion'
import { Button } from './ui/Button'
import { Pallo } from './Pallo'
import { useSheetCentered } from '../hooks/useMedia'
import './ConsensoCookie.css'

// ============================================================================
// Banner del consenso ai cookie — bloccante.
//
// Tre scelte di forma che non sono estetiche:
//
// 1. I due pulsanti sono IDENTICI per dimensione e peso visivo, e "Rifiuta" sta
//    per primo. Rifiutare deve costare quanto accettare — un "no" nascosto in
//    un link grigio sotto è il modo classico di rendere il consenso non valido.
// 2. Non c'è modo di uscire senza scegliere: niente X, niente Esc, il velo non
//    si chiude col click. Chiudere non è né un sì né un no, e lascerebbe
//    l'utente in uno stato in cui il banner torna ad ogni caricamento.
// 3. Essendo bloccante è un dialog modale vero, quindi il fuoco entra qui e ci
//    resta. Senza, chi naviga da tastiera tabulerebbe nell'app sotto il velo:
//    raggiungerebbe pulsanti che il mouse non può toccare.
//
// Finché non si sceglie non parte nessuno strumento: vedi `lib/consenso.ts`.
//
// Aspetto (MOTION.md §4.2): la forma del ConfirmDialog su mobile (sale dal
// basso), centrato da 600px; opaco, sopra a tutto (--z-consent), con il suo
// velo. Alla scelta esce in SVELTO, e da t0 non riceve più tocchi.
//
// Il redesign ci mette Pallo che sbircia dal bordo della carta, con le mani
// appoggiate: è decorativo (`aria-hidden`) e non è un pulsante, quindi la
// trappola del fuoco continua a vedere solo i due pulsanti.
// ============================================================================

export default function ConsensoCookie() {
  const scelta = useScelta()
  const cardRef = useRef<HTMLDivElement>(null)
  const aperto = scelta === null

  // Il fuoco entra nel dialog appena compare. `Rifiuta` è il primo elemento
  // focalizzabile: chi arriva da tastiera trova per primo il "no", non il "sì".
  useEffect(() => {
    if (!aperto) return
    cardRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [aperto])

  // Blocca lo scorrimento della pagina sotto: il velo ferma i click, questo
  // ferma la rotella. Senza, l'app sembrerebbe utilizzabile a metà.
  useEffect(() => {
    if (!aperto) return
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [aperto])

  // Rete di sicurezza del fuoco. Il rimbalzo sul Tab (più sotto) copre il caso
  // normale, ma non quello in cui il fuoco è già USCITO: cliccando sul velo il
  // browser lo sposta sul `body`, e da lì il Tab successivo entra nel primo
  // elemento tabulabile del documento — che è un pulsante dell'app, sotto un
  // velo che il mouse non può toccare. Verificato in Chrome, non dedotto.
  // Qui si intercetta qualunque fuoco atterri fuori e lo si riporta dentro.
  useEffect(() => {
    if (!aperto) return
    const riporta = (e: FocusEvent) => {
      const card = cardRef.current
      if (!card || !(e.target instanceof Node) || card.contains(e.target)) return
      card.querySelector<HTMLButtonElement>('button')?.focus()
    }
    document.addEventListener('focusin', riporta)
    return () => document.removeEventListener('focusin', riporta)
  }, [aperto])

  // Trappola del fuoco: Tab e Shift+Tab girano fra i due pulsanti invece di
  // uscire nell'app. Sono gli unici due elementi focalizzabili qui dentro,
  // quindi basta rimbalzare agli estremi.
  const suTasto = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const fuocabili = cardRef.current?.querySelectorAll<HTMLButtonElement>('button')
    if (!fuocabili?.length) return
    const primo = fuocabili[0]
    const ultimo = fuocabili[fuocabili.length - 1]
    if (e.shiftKey && document.activeElement === primo) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primo.focus()
    }
  }

  return (
    <AnimatePresence>
      {aperto && (
        <Velo key="consenso" onKeyDown={suTasto}>
          <Pannello cardRef={cardRef} />
        </Velo>
      )}
    </AnimatePresence>
  )
}

function Velo({ children, onKeyDown }: { children: ReactNode; onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void }) {
  const presente = useIsPresent()
  return (
    <m.div
      className="consenso-velo"
      data-leaving={presente ? undefined : ''}
      {...(presente ? {} : { inert: '' })}
      // Nessun `onClick` sul velo: toccarlo fuori non chiude, perché non
      // esisterebbe uno stato "chiuso senza aver scelto".
      //
      // `preventDefault` sul mousedown del solo velo impedisce al browser di
      // spostare il fuoco sul body quando ci si clicca sopra: così il fuoco
      // non esce mai, e la rete di sicurezza qui sopra resta inutilizzata.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.preventDefault()
      }}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTRATA }}
      exit={{ opacity: 0, transition: SVELTO }}
    >
      {children}
    </m.div>
  )
}

function Pannello({ cardRef }: { cardRef: RefObject<HTMLDivElement> }) {
  const centrato = useSheetCentered()
  const ridotto = useReducedMotion()
  const y = centrato || ridotto ? 0 : 12
  return (
    <m.div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consenso-titolo"
      aria-describedby="consenso-testo"
      className="consenso-dialog"
      initial={{ opacity: 0, y, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: ENTRATA }}
      exit={{ opacity: 0, y, scale: 0.96, transition: SVELTO }}
    >
      <Pallo umore="sbircia" size={72} className="consenso-pallo" />
      <div className="consenso-carta">
        <h2 id="consenso-titolo" className="consenso-title">Cookie e statistiche</h2>
        <p id="consenso-testo" className="consenso-testo">
          Il necessario per tenerti collegato è sempre attivo. Ci piacerebbe usare anche strumenti di misura che ci
          dicono quali schermate si usano e dove ci si blocca, comprese registrazioni anonime delle sessioni. Puoi dire
          di no e l'app funziona uguale.
        </p>

        {/* Rifiuta per primo, e della stessa misura: è il punto. */}
        <div className="consenso-actions">
          <Button variant="neutral" size="lg" block onClick={() => decidi('rifiutato')}>
            Rifiuta
          </Button>
          <Button variant="filled" size="lg" block onClick={() => decidi('accettato')}>
            Accetta
          </Button>
        </div>

        <p className="consenso-nota">
          Per continuare scegli una delle due. Puoi cambiare idea quando vuoi da{' '}
          <b>Profilo → Statistiche d'uso anonime</b>.
        </p>
      </div>
    </m.div>
  )
}
