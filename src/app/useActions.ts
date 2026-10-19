// ============================================================================
// Le azioni dell'app (UX §5, §7.7, §13): aprire gli overlay, salvare,
// eliminare. Qui stanno i controlli di permesso (il piano è dormiente: oggi
// passano tutti, e un diniego diventa un Toast, C11), la sola lettura dei
// tornei condivisi, gli eventi di analytics (nomi invariati) e la navigazione
// dopo il SUCCESSO (C13: prima si navigava anche se l'eliminazione falliva).
//
// I salvataggi aspettano il server ma rispondono subito (MOTION.md §7): gli
// sheet mostrano «Salvataggio…» e restano aperti con i dati se qualcosa va
// storto, e il Toast dice cosa fare.
// ============================================================================
import { useEffect, useRef } from 'react'
import { track } from '@vercel/analytics'
import type { UseDiary } from '../hooks/useDiary'
import type { UseCheckIn } from '../hooks/useCheckIn'
import type { AnyForm, CheckInInput, DiaryData, GuidedMatch } from '../lib/models'
import type { Permissions } from '../lib/permissions'
import type { Session } from '../lib/auth'
import { updateDisplayName, updatePassword } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { isOnline } from '../hooks/useConnection'
import { toast } from '../components/ui/Toast'
import type { MenuItem } from './overlays'
import { closeAllOverlays, closeOverlays, goBack, navigate, openOverlay, overlayStack } from './router'
import type { Route } from './routes'
import type { ViaCreazione } from './contracts'
import type { Caricamento } from './useScreenData'

// ------------------------------------------------------------------ testi
const OFFLINE = 'Sei offline: non ho salvato. Riprova quando torni in linea.'
const NON_SALVATO = 'Non è stato possibile salvare. Riprova tra poco.'
const NON_ELIMINATO = 'Non è stato possibile eliminare. Riprova tra poco.'
const CONDIVISO = 'Questo torneo è condiviso da un altro utente: solo chi l\'ha creato può modificarlo.'

const erroreSalvataggio = () => (isOnline() ? NON_SALVATO : OFFLINE)
const erroreEliminazione = () => (isOnline() ? NON_ELIMINATO : OFFLINE)

const plurale = (n: number, uno: string, tanti: string) => (n === 1 ? `1 ${uno}` : `${n} ${tanti}`)

/** «Spariscono anche le sue 4 partite e 2 foto.»: gli zeri non si dicono. */
function conseguenzaTorneo(partite: number, foto: number): string {
  const cosa = [partite > 0 && plurale(partite, 'partita', 'partite'), foto > 0 && plurale(foto, 'foto', 'foto')].filter(Boolean)
  const anche =
    partite + foto === 1
      ? `Sparisce anche la sua ${partite ? 'partita' : 'foto'}. `
      : cosa.length
        ? `Spariscono anche le sue ${cosa.join(' e ')}. `
        : ''
  return `${anche}Non si può annullare.`
}

interface Deps {
  diary: UseDiary
  data: DiaryData
  route: Route
  session: Session | null
  perm: Permissions
  check: UseCheckIn
  caricamento: Caricamento
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  /** La vista di Tornei da ricordare: l'indietro dal dettaglio ci torna. */
  torneiVista: () => Route
}

export type Actions = ReturnType<typeof useActions>

export function useActions({ diary, data, route, session, perm, check, caricamento, logout, refreshSession, torneiVista }: Deps) {
  // I dati più recenti, per chi li legge dopo un `await` (la closure è vecchia).
  const dataRef = useRef(data)
  dataRef.current = data
  const attese = useRef<((d: DiaryData) => void)[]>([])
  useEffect(() => {
    const a = attese.current
    attese.current = []
    a.forEach((r) => r(data))
  }, [data])
  /** Il prossimo `data` dopo una mutazione (il `reload()` interno lo aggiorna). */
  const datiNuovi = (prima: DiaryData) =>
    dataRef.current !== prima
      ? Promise.resolve(dataRef.current)
      : new Promise<DiaryData>((resolve) => {
          attese.current.push(resolve)
          window.setTimeout(() => resolve(dataRef.current), 4000)
        })

  // ---------------------------------------------------------------- errori
  // Gli errori di useDiary: quelli delle mutazioni li dice l'azione che fallisce;
  // qui restano gli errori di `reload()`. Mentre si è offline si tacciono (C20:
  // con gli URL sarebbe un toast a ogni tocco); con il primo caricamento
  // fallito li dice l'ErrorState, non un toast.
  const mutazioni = useRef(0)
  const { error, clearError } = diary
  useEffect(() => {
    if (!error) return
    if (caricamento !== 'pronto') return
    clearError()
    if (mutazioni.current > 0) return
    if (!isOnline()) return
    toast.error('Non riesco ad aggiornare il diario. Riprova tra poco.')
  }, [error, clearError, caricamento])

  const muta = async <T,>(fn: () => Promise<T>): Promise<T> => {
    mutazioni.current++
    try {
      return await fn()
    } finally {
      // L'errore di useDiary arriva nello stesso giro: si scala dopo.
      window.setTimeout(() => {
        mutazioni.current--
      }, 0)
    }
  }

  const nega = (v: { allowed: boolean; message?: string }) => {
    if (v.allowed) return false
    toast.info(v.message ?? 'Funzione non disponibile con il tuo piano.')
    return true
  }
  const condiviso = (id: string | null | undefined) => !!id && !!data.tournaments.find((t) => t.id === id)?.shared
  const negaCondiviso = (id: string | null | undefined) => {
    if (!condiviso(id)) return false
    toast.info(CONDIVISO)
    return true
  }

  // ============================================================ apertura
  const opts = (replaceTop?: boolean) => ({ replaceTop: !!replaceTop && overlayStack().length > 0 })

  const nuovoTorneo = (replaceTop?: boolean) => {
    if (nega(perm.check('createTournament'))) return
    openOverlay({ kind: 'torneo', mode: 'nuovo' }, opts(replaceTop))
  }
  /** «Torneo rapido» dal ＋: lo stesso sheet con in vista solo nome, data e piazzamento. */
  const torneoRapido = (replaceTop?: boolean) => {
    if (nega(perm.check('createTournament'))) return
    openOverlay({ kind: 'torneo', mode: 'nuovo', rapido: true }, opts(replaceTop))
  }
  const modificaTorneo = (id: string, replaceTop?: boolean) => {
    if (negaCondiviso(id)) return
    openOverlay({ kind: 'torneo', mode: 'modifica', id }, opts(replaceTop))
  }
  const nuovaPartita = (tournamentId: string | null, replaceTop?: boolean) => {
    if (negaCondiviso(tournamentId)) return
    openOverlay({ kind: 'partita', mode: 'nuova', tournamentId }, opts(replaceTop))
  }
  const modificaPartita = (matchId: string) => {
    const m = data.matches.find((x) => x.id === matchId)
    if (!m || negaCondiviso(m.tournamentId)) return
    openOverlay({ kind: 'partita', mode: 'modifica', matchId })
  }
  const aggiungiFoto = (tournamentId: string) => {
    if (negaCondiviso(tournamentId)) return
    if (nega(perm.check('uploadPhoto'))) return
    openOverlay({ kind: 'foto', tournamentId })
  }
  const apriFoto = (tournamentId: string, index: number) => openOverlay({ kind: 'lightbox', tournamentId, index })
  // La Storia è permessa anche sui tornei condivisi (Q4): non modifica niente.
  const apriStoria = (tournamentId: string) => {
    if (nega(perm.check('shareStory'))) return
    track('storia_aperta')
    openOverlay({ kind: 'storia', tournamentId })
  }
  const nuovoCompagno = () => {
    if (nega(perm.check('createPartner'))) return
    openOverlay({ kind: 'compagno' })
  }
  const collegaCompagno = (partnerId: string) => openOverlay({ kind: 'collega', partnerId })
  const cambiaPassword = () => openOverlay({ kind: 'password' })
  const apriAzioni = (anchor?: HTMLElement | null) =>
    openOverlay({ kind: 'azioni', anchor: anchor ? 'popover' : 'tabbar' }, { anchor: anchor ?? null })
  const apriMenu = (title: string, items: MenuItem[], anchor: HTMLElement) =>
    openOverlay({ kind: 'menu', spec: { title, items } }, { anchor })

  /** «Partita live» dal ＋: una rotta a schermo intero; la voce del menu diventa la destinazione. */
  const partitaLive = () => navigate({ name: 'live' })
  /** «Raccontalo a Pallo» dal ＋: l'assistente, anche lui una rotta. */
  const apriAssistente = () => navigate({ name: 'crea' })

  /** L'assistente: dallo sheet sporco si chiede prima (UX §5 F2). */
  const usaAssistente = (dirty: boolean) => {
    const vai = () => navigate({ name: 'crea' })
    if (!dirty) {
      vai()
      return
    }
    openOverlay({
      kind: 'conferma',
      spec: {
        title: "Passare all'assistente?",
        text: 'Quello che hai scritto qui non viene portato.',
        confirmLabel: 'Passa',
        cancelLabel: 'Resta',
        tone: 'default',
        onConfirm: () => closeAllOverlays(vai),
      },
    })
  }

  /** ✕ Esci dall'assistente (UX §5 F11): con risposte date e nessun torneo creato, si chiede. */
  const esciDallAssistente = (dirty: boolean) => {
    const esci = () => goBack({ name: 'tornei', vista: 'lista' })
    if (!dirty) {
      esci()
      return
    }
    openOverlay({
      kind: 'conferma',
      spec: {
        title: "Uscire dall'assistente?",
        text: 'Il torneo non è ancora stato creato: le risposte andranno perse.',
        confirmLabel: 'Esci',
        cancelLabel: 'Resta',
        onConfirm: () => closeAllOverlays(() => navigate(torneiVista(), { replace: true })),
      },
    })
  }

  // ============================================================ salvataggi
  const salvaTorneo = async (form: AnyForm, editId: string | null, via: ViaCreazione): Promise<boolean> => {
    const prima = dataRef.current
    const ids = new Set(prima.tournaments.map((t) => t.id))
    const ok = await muta(() => diary.saveTorneo(form, editId))
    if (!ok) {
      toast.error(erroreSalvataggio())
      return false
    }
    if (editId) {
      track('torneo_modificato')
      closeAllOverlays()
      toast.success('Torneo aggiornato')
      return true
    }
    track('torneo_creato', { via })
    // saveTorneo non restituisce l'id (Q2, useDiary non si tocca): il torneo
    // nuovo è quello che prima non c'era.
    const dopo = await datiNuovi(prima)
    const nuovo =
      dopo.tournaments.find((t) => !ids.has(t.id) && !t.shared && t.name === form.name) ??
      dopo.tournaments.find((t) => !ids.has(t.id) && !t.shared)
    if (nuovo) navigate({ name: 'torneo', id: nuovo.id }, { traccia: nuovo.id })
    else closeAllOverlays()
    toast.success('Torneo creato')
    return true
  }

  const salvaPartita = async (form: AnyForm, editId: string | null): Promise<boolean> => {
    const prima = dataRef.current
    const ids = new Set(prima.matches.map((m) => m.id))
    const ok = await muta(() => diary.savePartita(form, editId))
    if (!ok) {
      toast.error(erroreSalvataggio())
      return false
    }
    track(editId ? 'partita_modificata' : 'partita_aggiunta')
    if (editId) {
      closeAllOverlays()
      toast.success('Partita aggiornata')
      return true
    }
    const tid = form.tournamentId ?? ''
    const dopo = await datiNuovi(prima)
    const nuova = dopo.matches.find((m) => !ids.has(m.id) && m.tournamentId === tid)
    const sulDettaglio = route.name === 'torneo' && route.id === tid
    if (sulDettaglio) {
      closeAllOverlays(() => {
        if (nuova) navigate({ name: 'torneo', id: tid }, { replace: true, keepScroll: true, keepFocus: true, traccia: nuova.id })
      })
      toast.success('Partita aggiunta')
    } else {
      // Dalla partita live si va al torneo in replace: l'indietro non deve
      // riportare a un segnapunti ormai vuoto.
      navigate({ name: 'torneo', id: tid }, { traccia: nuova?.id, replace: route.name === 'live' })
      const nome = dopo.tournaments.find((t) => t.id === tid)?.name
      toast.success(nome ? `Partita aggiunta a «${nome}»` : 'Partita aggiunta')
    }
    return true
  }

  const salvaFoto = async (form: AnyForm, file: File | null): Promise<boolean> => {
    const prima = dataRef.current
    const ids = new Set(prima.photos.map((p) => p.id))
    const ok = await muta(() => diary.saveFoto(form, file))
    if (!ok) {
      toast.error(erroreSalvataggio())
      return false
    }
    track('foto_aggiunta')
    const dopo = await datiNuovi(prima)
    const nuova = dopo.photos.find((p) => !ids.has(p.id))
    closeAllOverlays(() => {
      if (nuova && route.name === 'torneo') navigate(route, { replace: true, keepScroll: true, keepFocus: true, traccia: nuova.id })
    })
    toast.success('Foto aggiunta')
    return true
  }

  const salvaCompagno = async (name: string): Promise<boolean> => {
    const id = await muta(() => diary.saveCompagno({ name }))
    if (!id) {
      toast.error(erroreSalvataggio())
      return false
    }
    track('socio_creato')
    closeAllOverlays(() => {
      if (route.name === 'compagni') navigate(route, { replace: true, keepScroll: true, keepFocus: true, traccia: id })
    })
    toast.success(`«${name.trim()}» aggiunto ai compagni`)
    return true
  }

  const collega = async (partnerId: string, userId: string) => {
    const r = await muta(() => diary.linkPartner(partnerId, userId))
    if (r.ok) {
      track('socio_collegato')
      // La riga «Collegato a un utente» porta la traccia (MOTION.md §5 F7).
      closeAllOverlays(() => {
        if (route.name === 'compagno') navigate(route, { replace: true, keepScroll: true, keepFocus: true, traccia: 'collegato' })
      })
      toast.success('Collegato')
    }
    // L'errore è in linea nello sheet (UX §6.6): niente toast doppio.
    return r.ok ? r : { ok: false, error: r.error ?? 'Collegamento non riuscito.' }
  }

  const creaGuidato = async (form: AnyForm, matches: GuidedMatch[]) => {
    const prima = dataRef.current
    const id = await muta(() => diary.createGuidedTorneo(form, matches))
    if (!id) return null
    track('assistente_ai_usato')
    track('torneo_creato', { via: 'assistente' })
    const dopo = await datiNuovi(prima)
    const salvate = dopo.matches.filter((m) => m.tournamentId === id).length
    return { id, partiteNonSalvate: Math.max(0, matches.length - salvate) }
  }

  // ============================================================ conferme
  const conferma = (spec: Parameters<typeof openOverlay>[0] & { kind: 'conferma' }) => openOverlay(spec)

  const eliminaTorneo = (id: string) => {
    const t = data.tournaments.find((x) => x.id === id)
    if (!t || negaCondiviso(id)) return
    const n = data.matches.filter((m) => m.tournamentId === id).length
    const f = data.photos.filter((p) => p.tournamentId === id).length
    conferma({
      kind: 'conferma',
      spec: {
        title: `Eliminare «${t.name}»?`,
        text: conseguenzaTorneo(n, f),
        confirmLabel: 'Elimina torneo',
        busyLabel: 'Eliminazione…',
        onConfirm: async () => {
          const ok = await muta(() => diary.deleteTorneo(id))
          if (!ok) {
            toast.error(erroreEliminazione())
            return
          }
          track('torneo_eliminato')
          // `replace`: l'indietro non deve riportare a un dettaglio che non c'è più.
          closeAllOverlays(() => navigate(torneiVista(), { replace: true }))
          toast.success('Torneo eliminato')
        },
      },
    })
  }

  const eliminaPartita = (matchId: string) => {
    const m = data.matches.find((x) => x.id === matchId)
    if (!m) return
    openOverlay({
      kind: 'conferma',
      spec: {
        title: `Eliminare la partita contro ${m.opponents || 'Avversari'}?`,
        text: 'Non si può annullare.',
        confirmLabel: 'Elimina partita',
        busyLabel: 'Eliminazione…',
        onConfirm: async () => {
          const ok = await muta(() => diary.deletePartita(matchId))
          if (!ok) {
            toast.error(erroreEliminazione())
            return
          }
          track('partita_eliminata')
          // Dialogo e sheet escono insieme (MOTION.md §3.7).
          closeOverlays(2, { force: true })
          toast.success('Partita eliminata')
        },
      },
    })
  }

  const eliminaFoto = (photoId: string) => {
    openOverlay({
      kind: 'conferma',
      spec: {
        title: 'Eliminare questa foto?',
        text: 'Non si può annullare.',
        confirmLabel: 'Elimina foto',
        busyLabel: 'Eliminazione…',
        onConfirm: async () => {
          const ok = await muta(() => diary.deleteFoto(photoId))
          if (!ok) {
            toast.error(erroreEliminazione())
            return
          }
          track('foto_eliminata')
          closeAllOverlays()
          toast.success('Foto eliminata')
        },
      },
    })
  }

  const eliminaCompagno = (id: string) => {
    const p = data.partners.find((x) => x.id === id)
    if (!p) return
    openOverlay({
      kind: 'conferma',
      spec: {
        title: `Eliminare «${p.name}»?`,
        text: 'Nei tornei e nelle partite resterà segnato come "nessuno" e non conterà più nelle sue statistiche. Non si può annullare.',
        confirmLabel: 'Elimina compagno',
        busyLabel: 'Eliminazione…',
        onConfirm: async () => {
          const ok = await muta(() => diary.deleteCompagno(id))
          if (!ok) {
            toast.error(erroreEliminazione())
            return
          }
          track('socio_eliminato')
          closeAllOverlays(() => navigate({ name: 'compagni' }, { replace: true }))
          toast.success('Compagno eliminato')
        },
      },
    })
  }

  const scollegaCompagno = (id: string) => {
    const p = data.partners.find((x) => x.id === id)
    if (!p) return
    openOverlay({
      kind: 'conferma',
      spec: {
        title: `Scollegare «${p.name}» dal suo account?`,
        text: 'I tornei giocati insieme smettono di essere condivisi con quell\'account. Potrai ricollegarlo quando vuoi.',
        confirmLabel: 'Scollega',
        busyLabel: 'Scollego…',
        onConfirm: async () => {
          const ok = await muta(() => diary.unlinkPartner(id))
          if (!ok) {
            toast.error(erroreSalvataggio())
            return
          }
          track('socio_scollegato')
          closeAllOverlays()
          toast.success('Scollegato')
        },
      },
    })
  }

  const togliCondivisioni = () => {
    openOverlay({
      kind: 'conferma',
      spec: {
        title: 'Togliere tutte le condivisioni ricevute?',
        text: 'I tornei degli altri spariranno dal tuo diario e dalle tue statistiche.',
        confirmLabel: 'Togli condivisioni',
        busyLabel: 'Rimozione…',
        onConfirm: async () => {
          const n = await muta(() => diary.unlinkMe())
          if (n <= 0) {
            toast.error('Non è stato possibile rimuoverle. Riprova.')
            return
          }
          closeAllOverlays()
          toast.success(n === 1 ? 'Condivisione rimossa' : `${n} condivisioni rimosse`)
        },
      },
    })
  }

  const terminaCheckIn = () => {
    const citta = check.own?.city ?? ''
    openOverlay({
      kind: 'conferma',
      spec: {
        title: `Terminare il check-in a ${citta}?`,
        text: 'Non comparirai più fra chi è in spiaggia oggi.',
        confirmLabel: 'Termina check-in',
        busyLabel: 'Termino…',
        onConfirm: async () => {
          const ok = await check.checkOut()
          if (!ok) {
            toast.error(erroreSalvataggio())
            return
          }
          closeAllOverlays()
        },
      },
    })
  }

  const fareCheckIn = async (input: CheckInInput) => {
    const ok = await check.checkIn(input)
    if (!ok) toast.error(erroreSalvataggio())
    return ok
  }

  const esci = () => {
    openOverlay({
      kind: 'conferma',
      spec: {
        title: "Esci dall'account?",
        confirmLabel: 'Esci',
        busyLabel: 'Esco…',
        onConfirm: () =>
          closeAllOverlays(() => {
            navigate({ name: 'home' }, { replace: true })
            void logout()
          }),
      },
    })
  }

  // ============================================================ profilo
  const salvaNome = async (name: string) => {
    const res = await updateDisplayName(name, session?.name ?? '')
    if (res.ok) await refreshSession()
    return res
  }

  const aggiornaPassword = async (pw: string, pw2: string) => {
    const res = await updatePassword(pw, pw2)
    if (res.ok) {
      closeAllOverlays()
      toast.success('Password aggiornata')
    }
    return res
  }

  // Cambia foto profilo: upload sul bucket pubblico `avatars`, poi RPC
  // set_avatar e refresh della sessione; i vecchi avatar si puliscono
  // (best-effort). Spostato da Profilo.tsx senza cambiarlo.
  const caricaAvatar = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) throw new Error('Sessione non valida.')
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
      const newPath = `${uid}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(newPath, file, { contentType: file.type || 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(newPath)
      const { error: rpcErr } = await supabase.rpc('set_avatar', { p_url: pub.publicUrl })
      if (rpcErr) throw rpcErr
      try {
        const { data: existing } = await supabase.storage.from('avatars').list(uid)
        const stale = (existing ?? []).map((f) => `${uid}/${f.name}`).filter((p) => p !== newPath)
        if (stale.length) await supabase.storage.from('avatars').remove(stale)
      } catch {
        /* pulizia best-effort */
      }
      await refreshSession()
      return { ok: true }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[profilo] avatar', err)
      return { ok: false, error: isOnline() ? 'Impossibile aggiornare la foto. Riprova tra poco.' : 'Sei offline: la foto non è stata caricata.' }
    }
  }


  return {
    nuovoTorneo,
    torneoRapido,
    modificaTorneo,
    nuovaPartita,
    modificaPartita,
    aggiungiFoto,
    apriFoto,
    apriStoria,
    nuovoCompagno,
    collegaCompagno,
    cambiaPassword,
    apriAzioni,
    apriMenu,
    partitaLive,
    apriAssistente,
    usaAssistente,
    esciDallAssistente,
    salvaTorneo,
    salvaPartita,
    salvaFoto,
    salvaCompagno,
    collega,
    creaGuidato,
    eliminaTorneo,
    eliminaPartita,
    eliminaFoto,
    eliminaCompagno,
    scollegaCompagno,
    togliCondivisioni,
    terminaCheckIn,
    fareCheckIn,
    esci,
    salvaNome,
    aggiornaPassword,
    caricaAvatar,
    condiviso,
  }
}
