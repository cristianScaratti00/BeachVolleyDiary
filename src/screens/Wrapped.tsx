// ============================================================================
// La rotta `/wrapped` (UX §4.1, §6.5): il recap di stagione a tutto schermo.
// È una rotta e non un overlay: si linka, l'indietro la chiude, e un refresh
// riparte dalla stagione di default. Non disponibile (fuori stagione, pochi
// dati) → lo stato «in arrivo» dentro la stessa cornice, mai una pagina vuota.
// ============================================================================
import type { WrappedProps } from '../app/contracts'
import WrappedModal, { WrappedNonDisponibile } from '../components/wrapped/WrappedModal'

export default function Wrapped({ wrapped, motivo, onClose, onNotice }: WrappedProps) {
  if (!wrapped) return <WrappedNonDisponibile motivo={motivo ?? 'dati'} onClose={onClose} />
  return <WrappedModal wrapped={wrapped} onClose={onClose} onNotice={onNotice} />
}
