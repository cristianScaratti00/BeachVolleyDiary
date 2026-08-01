import { useEffect, useRef } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { decidi, useScelta } from '../lib/consenso'

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
// ============================================================================

const bottone = (primario: boolean): CSSProperties => ({
  flex: 1,
  minWidth: 128,
  padding: '13px 18px',
  borderRadius: 12,
  border: primario ? 'none' : '1px solid rgba(27,42,74,.22)',
  background: primario ? '#FF6B35' : 'transparent',
  color: primario ? '#fff' : '#1B2A4A',
  font: "700 14px 'Nunito Sans'",
  cursor: 'pointer',
})

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

  if (!aperto) return null

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
    <div
      // Nessun `onClick` sul velo: toccarlo fuori non chiude, perché non
      // esisterebbe uno stato "chiuso senza aver scelto".
      //
      // `preventDefault` sul mousedown del solo velo impedisce al browser di
      // spostare il fuoco sul body quando ci si clicca sopra: così il fuoco
      // non esce mai, e la rete di sicurezza qui sopra resta inutilizzata.
      onMouseDown={(e) => { if (e.target === e.currentTarget) e.preventDefault() }}
      onKeyDown={suTasto}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80, // sopra la bottom nav (40) e sopra i fogli modali (60-70)
        background: 'rgba(0,0,0,.1)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
        animation: 'overlay .2s ease',
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consenso-titolo"
        aria-describedby="consenso-testo"
        className="card"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: 20,
          borderRadius: 18,
          boxShadow: '0 24px 60px -24px rgba(27,42,74,.5)',
          animation: 'sheet .3s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div id="consenso-titolo" className="num" style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-.2px' }}>
          Cookie e statistiche
        </div>
        <div id="consenso-testo" style={{ font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.62)', lineHeight: 1.55, marginTop: 8 }}>
          Il necessario per tenerti collegato è sempre attivo. Ci piacerebbe
          usare anche strumenti di misura che ci dicono quali schermate si usano
          e dove ci si blocca — comprese registrazioni anonime delle sessioni.
          Puoi dire di no e l'app funziona uguale.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {/* Rifiuta per primo, e della stessa misura: è il punto. */}
          <button type="button" className="chip" onClick={() => decidi('rifiutato')} style={bottone(false)}>
            Rifiuta
          </button>
          <button type="button" className="chip" onClick={() => decidi('accettato')} style={bottone(true)}>
            Accetta
          </button>
        </div>

        <div style={{ font: "600 11.5px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', marginTop: 12, lineHeight: 1.5 }}>
          Per continuare scegli una delle due. Puoi cambiare idea quando vuoi da{' '}
          <b>Profilo → Cookie e statistiche</b>.
        </div>
      </div>
    </div>
  )
}
