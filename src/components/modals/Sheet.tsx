import type { CSSProperties, ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import * as m from 'motion/react-m'
import { useDragControls } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { CITTA_SUGGERITE } from '../../lib/geo'
import { ENTRATA, MOLLA } from '../Motion'

interface SheetProps {
  maxWidth?: number
  scroll?: boolean
  onClose: () => void
  children: ReactNode
}

// Quanto in basso va portato il foglio perché il rilascio lo chiuda, e quanto
// veloce deve andare il dito perché la distanza non conti più.
//
// I due criteri servono entrambi: 120px da soli obbligherebbero a un gesto
// lungo, e la sola velocità chiuderebbe il foglio su una sfiorata. Insieme
// danno il comportamento che si conosce dai bottom-sheet di sistema — una
// buttata giù decisa basta, un trascinamento lento va portato a termine.
const CHIUDI_OLTRE_PX = 120
const CHIUDI_OLTRE_VELOCITA = 550

// Shared bottom-sheet modal shell used by all forms.
export function Sheet({ maxWidth = 520, scroll = true, onClose, children }: SheetProps) {
  // Il gesto di chiusura parte SOLO dalla maniglia, non da tutto il foglio.
  //
  // Non è una preferenza: con `drag` attivo sull'elemento, Motion gli scrive
  // sopra `touch-action: pan-x` ("Disable scrolling on the draggable
  // direction", render/html/use-props). Su questo foglio quell'elemento è anche
  // il contenitore che scorre — quindi il dito non poteva più scorrere il
  // contenuto: il modale del torneo, che è il più alto, restava tagliato con
  // "Salva" irraggiungibile. Col mouse la rotellina funzionava, ed è per questo
  // che il difetto è arrivato fin qui.
  //
  // `dragListener={false}` toglie quello stile (Motion lo applica solo se il
  // listener è attivo) e il gesto si avvia a mano da `controls.start` sulla
  // maniglia. La chiusura per trascinamento resta identica.
  const trascinamento = useDragControls()

  const inner: CSSProperties = {
    background: '#FAF8F5', width: '100%', maxWidth,
    borderRadius: '22px 22px 0 0', padding: 24,
  }
  if (scroll) {
    // Quando c'è da scorrere il foglio diventa una colonna: maniglia ferma in
    // cima, contenuto che scorre sotto. Prima erano la stessa cosa — un unico
    // elemento trascinabile E scorrevole — ed è da lì che nasceva il difetto.
    // I fogli corti (`scroll={false}`) restano com'erano: non hanno niente da
    // impaginare in colonna, e cambiarli non ripagherebbe il rischio.
    inner.display = 'flex'
    inner.flexDirection = 'column'
    // `dvh` e non `vh`: sui telefoni `vh` è il viewport a barra dell'indirizzo
    // nascosta, cioè più alto di quello che si vede davvero. Stessa unità già
    // usata dalla schermata a tutto schermo in App.
    inner.maxHeight = '92dvh'
    inner.overflow = 'hidden' // scorre la colonna interna, non il foglio
  }

  // I margini negativi riportano l'area scorrevole fino ai bordi del foglio e
  // il padding rimette lo spazio dentro: il contenuto resta allineato com'era,
  // ma la barra di scorrimento corre sul bordo e l'ultima riga ha i suoi 24px
  // di respiro dentro l'area che scorre, non fuori.
  const area: CSSProperties = scroll
    ? {
        flex: 1, minHeight: 0,
        overflowY: 'auto',
        // Arrivati in fondo, il gesto non prosegue sulla pagina dietro.
        overscrollBehavior: 'contain',
        margin: '0 -24px -24px', padding: '0 24px 24px',
      }
    : {}

  const fineTrascinamento = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > CHIUDI_OLTRE_PX || info.velocity.y > CHIUDI_OLTRE_VELOCITA) onClose()
    // Se non basta, non serve fare niente: senza `dragSnapToOrigin` Motion
    // riporta da sé il foglio a `y: 0` con la molla.
  }

  return (
    <m.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(27,42,74,.35)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <m.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        // L'uscita esce di scena per intero invece di dissolversi sul posto:
        // il foglio "torna da dove è venuto", ed è la metà che finora mancava
        // (React lo smontava di colpo, senza modo di animarlo).
        exit={{ y: '100%', opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
        transition={ENTRATA}
        drag="y"
        // Vedi il commento in testa: senza questo, il foglio non scorre.
        dragListener={false}
        dragControls={trascinamento}
        // Solo verso il basso: tirare in su un foglio già appoggiato al fondo
        // non vuol dire niente. L'elasticità lascia comunque un cenno di
        // resistenza, così il gesto non sembra bloccato.
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.9 }}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 460, bounceDamping: 38 }}
        onDragEnd={fineTrascinamento}
        whileDrag={{ cursor: 'grabbing' }}
        style={inner}
      >
        {/* La maniglia è l'unica presa del gesto, e sta FUORI dall'area che
            scorre: è l'unico modo perché resti sempre raggiungibile senza che
            il contenuto le passi sopra. La barretta resta di 4px — è il segno,
            non il bersaglio: la zona sensibile è questo involucro, largo quanto
            il foglio e alto una quarantina di pixel.

            `touchAction: 'none'` va scritto qui a mano: prima lo metteva Motion
            sul foglio intero, e portava con sé il difetto che questo commit
            ripara. */}
        <div
          onPointerDown={(e: ReactPointerEvent) => trascinamento.start(e)}
          aria-hidden="true"
          style={{
            flex: 'none',
            display: 'flex', justifyContent: 'center',
            margin: '-24px -24px 0', padding: '24px 0 18px',
            touchAction: 'none', cursor: 'grab',
          }}
        >
          <m.div
            layout="position"
            transition={MOLLA}
            style={{ width: 40, height: 4, background: 'rgba(27,42,74,.15)', borderRadius: 4 }}
          />
        </div>
        {scroll ? <div style={area}>{children}</div> : children}
      </m.div>
    </m.div>
  )
}

export function Title({ children }: { children: ReactNode }) {
  return <div className="num" style={{ fontSize: 21, fontWeight: 500, marginBottom: 18 }}>{children}</div>
}

export function Label({ children, mb = 6 }: { children: ReactNode; mb?: number }) {
  return <div className="lbl" style={{ marginBottom: mb }}>{children}</div>
}

export const inputStyle: CSSProperties = { width: '100%', border: '1px solid rgba(27,42,74,.16)', borderRadius: 11, padding: '12px 14px', font: "700 14px 'Nunito Sans'", background: '#fff' }
export const selectStyle: CSSProperties = { ...inputStyle, cursor: 'pointer' }

// Campo città con suggerimenti. Condiviso da TorneoModal e QuickTorneoModal,
// che non sono mai aperti insieme: l'id del `<datalist>` può essere fisso.
//
// `<datalist>` e non un `<select>`: la città resta testo libero (lo schema non
// ha CHECK e la gente gioca anche dove il gazetteer non arriva), ma chi scrive
// "Rimini" invece di "rimini " ottiene un pin sulla mappa invece di una riga in
// "Non ancora sulla mappa". È il punto in cui i refusi si prevengono, non si curano.
const CITTA_LIST_ID = 'citta-suggerite'

export function CityInput({ value, onChange }: {
  value: string
  onChange: (city: string) => void
}) {
  return (
    <>
      <input
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder="es. Rimini"
        list={CITTA_LIST_ID}
        autoComplete="off"
        style={inputStyle}
      />
      <datalist id={CITTA_LIST_ID}>
        {CITTA_SUGGERITE.map((c) => <option key={c} value={c} />)}
      </datalist>
    </>
  )
}

interface ActionsProps {
  onDelete?: (() => void) | null
  deleteLabel?: string
  onCancel: () => void
  onSave: () => void
  saveLabel?: string
}

// footer action buttons
export function Actions({ onDelete, deleteLabel = 'Elimina', onCancel, onSave, saveLabel = 'Salva' }: ActionsProps) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' }}>
      {onDelete && <div className="chip" onClick={onDelete} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 16px', borderRadius: 11, border: '1px solid rgba(255,71,126,.4)', color: '#FF477E', cursor: 'pointer' }}>{deleteLabel}</div>}
      <div style={{ flex: 1 }} />
      <div className="chip" onClick={onCancel} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 20px', borderRadius: 11, border: '1px solid rgba(27,42,74,.16)', color: '#1B2A4A', cursor: 'pointer' }}>Annulla</div>
      <div className="chip" onClick={onSave} style={{ font: "700 14px 'Nunito Sans'", padding: '12px 24px', borderRadius: 11, background: '#FF6B35', color: '#fff', cursor: 'pointer' }}>{saveLabel}</div>
    </div>
  )
}
