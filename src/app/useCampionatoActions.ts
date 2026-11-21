// ============================================================================
// Le azioni del Campionato per Società: aprire i moduli delle tappe, salvare,
// eliminare. Stanno a parte da useActions come i dati stanno a parte da
// useDiary: niente di qui tocca tornei, partite dei tornei o statistiche.
// Lo schema è lo stesso: si salva aspettando il server, gli errori sono un
// Toast e lo sheet resta aperto coi dati; si naviga solo dopo il successo.
// ============================================================================
import { useRef } from 'react'
import { track } from '@vercel/analytics'
import type { UseCampionato } from '../hooks/useCampionato'
import type { UseDiary } from '../hooks/useDiary'
import { isOnline } from '../hooks/useConnection'
import { toast } from '../components/ui/Toast'
import { nomeTappa } from '../lib/campionato'
import type { IscrizioneForm, PartitaTappaForm, TappaForm } from '../lib/campionato'
import { closeAllOverlays, closeOverlays, navigate, openOverlay, overlayStack } from './router'
import type { Route } from './routes'

const OFFLINE = 'Sei offline: non ho salvato. Riprova quando torni in linea.'
const erroreSalvataggio = () => (isOnline() ? 'Non è stato possibile salvare. Riprova tra poco.' : OFFLINE)
const erroreEliminazione = () => (isOnline() ? 'Non è stato possibile eliminare. Riprova tra poco.' : OFFLINE)

interface Deps {
  campionato: UseCampionato
  /** Solo per creare un compagno nuovo dallo sheet della tappa. */
  diary: Pick<UseDiary, 'saveCompagno'>
  route: Route
}

export type CampionatoActions = ReturnType<typeof useCampionatoActions>

export function useCampionatoActions({ campionato, diary, route }: Deps) {
  // I dati più recenti per chi li legge dopo un `await`.
  const dati = useRef(campionato.data)
  dati.current = campionato.data
  const opts = (replaceTop?: boolean) => ({ replaceTop: !!replaceTop && overlayStack().length > 0 })

  // ------------------------------------------------------------ apertura
  const nuovaTappa = (replaceTop?: boolean) => openOverlay({ kind: 'tappa', mode: 'nuova' }, opts(replaceTop))
  const modificaTappa = (id: string) => openOverlay({ kind: 'tappa', mode: 'modifica', id })
  const nuovaPartitaTappa = (stageId: string, replaceTop?: boolean) => openOverlay({ kind: 'partitaTappa', mode: 'nuova', stageId }, opts(replaceTop))
  const modificaPartitaTappa = (matchId: string) => openOverlay({ kind: 'partitaTappa', mode: 'modifica', matchId })
  const modificaIscrizione = (id: string) => openOverlay({ kind: 'iscrizione', id })

  // ---------------------------------------------------------- salvataggi
  const salvaTappa = async (form: TappaForm, editId: string | null): Promise<boolean> => {
    let f = form
    // «Nuovo compagno»: si crea prima, nell'elenco dei compagni di sempre.
    if (form.partnerId === 'new') {
      const name = form.newPartnerName.trim()
      if (name) {
        const pid = await diary.saveCompagno({ name })
        if (!pid) {
          toast.error(erroreSalvataggio())
          return false
        }
        f = { ...form, partnerId: pid }
      } else {
        f = { ...form, partnerId: '' }
      }
    }
    const id = await campionato.saveTappa(f, editId)
    if (!id) {
      toast.error(erroreSalvataggio())
      return false
    }
    if (editId) {
      track('tappa_modificata')
      closeAllOverlays()
      toast.success('Tappa aggiornata')
      return true
    }
    track('tappa_creata')
    navigate({ name: 'tappa', id }, { traccia: id })
    toast.success('Tappa registrata')
    return true
  }

  const salvaPartitaTappa = async (form: PartitaTappaForm, editId: string | null): Promise<boolean> => {
    const id = await campionato.savePartita(form, editId)
    if (!id) {
      toast.error(erroreSalvataggio())
      return false
    }
    track(editId ? 'tappa_partita_modificata' : 'tappa_partita_aggiunta')
    const sulDettaglio = route.name === 'tappa' && route.id === form.stageId
    if (sulDettaglio) {
      closeAllOverlays(() => navigate({ name: 'tappa', id: form.stageId }, { replace: true, keepScroll: true, keepFocus: true, traccia: id }))
    } else {
      navigate({ name: 'tappa', id: form.stageId }, { traccia: id })
    }
    toast.success(editId ? 'Partita aggiornata' : 'Partita aggiunta')
    return true
  }

  const salvaIscrizione = async (form: IscrizioneForm, id: string): Promise<boolean> => {
    const ok = await campionato.saveIscrizione(form, id)
    if (!ok) {
      toast.error(erroreSalvataggio())
      return false
    }
    closeAllOverlays()
    toast.success('Società aggiornata')
    return true
  }

  // ---------------------------------------------------------- eliminazioni
  const eliminaTappa = (id: string) => {
    const t = dati.current.tappe.find((x) => x.id === id)
    if (!t) return
    const n = dati.current.partite.filter((p) => p.stageId === id).length
    openOverlay({
      kind: 'conferma',
      spec: {
        title: `Eliminare «${nomeTappa(t)}»?`,
        text: `${n === 1 ? 'Sparisce anche la sua partita. ' : n > 1 ? `Spariscono anche le sue ${n} partite. ` : ''}Non si può annullare.`,
        confirmLabel: 'Elimina tappa',
        busyLabel: 'Eliminazione…',
        onConfirm: async () => {
          const ok = await campionato.deleteTappa(id)
          if (!ok) {
            toast.error(erroreEliminazione())
            return
          }
          track('tappa_eliminata')
          // `replace`: l'indietro non deve riportare a una tappa che non c'è più.
          closeAllOverlays(() => navigate({ name: 'campionato' }, { replace: true }))
          toast.success('Tappa eliminata')
        },
      },
    })
  }

  const eliminaPartitaTappa = (matchId: string) => {
    const p = dati.current.partite.find((x) => x.id === matchId)
    if (!p) return
    openOverlay({
      kind: 'conferma',
      spec: {
        title: `Eliminare la partita contro ${p.opponents || 'le avversarie'}?`,
        text: 'Non si può annullare.',
        confirmLabel: 'Elimina partita',
        busyLabel: 'Eliminazione…',
        onConfirm: async () => {
          const ok = await campionato.deletePartita(matchId)
          if (!ok) {
            toast.error(erroreEliminazione())
            return
          }
          track('tappa_partita_eliminata')
          // Dialogo e sheet escono insieme (MOTION.md §3.7).
          closeOverlays(2, { force: true })
          toast.success('Partita eliminata')
        },
      },
    })
  }

  return {
    nuovaTappa,
    modificaTappa,
    nuovaPartitaTappa,
    modificaPartitaTappa,
    modificaIscrizione,
    salvaTappa,
    salvaPartitaTappa,
    salvaIscrizione,
    eliminaTappa,
    eliminaPartitaTappa,
  }
}
