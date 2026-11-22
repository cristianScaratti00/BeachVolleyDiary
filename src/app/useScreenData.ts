// ============================================================================
// I dati delle schermate (UX §4.9, §4.10). Gli effetti RPC per schermata sono
// quelli che stavano in App, SPOSTATI senza cambiarli: cambia solo la chiave,
// che è il nome della rotta invece di `screen`. Il doppio percorso resta:
// RPC aggregata del server, e il calcolo client (`derive*`) come ripiego
// mentre arriva o se fallisce, e sempre quando ci sono tornei condivisi (le
// RPC sono limitate al proprio user_id).
//
// In più, il primo caricamento fallito si riconosce SENZA toccare useDiary:
// quando `loading` passa a false con un errore, lo stato è 'fallito' finché un
// `reload()` non porta dati nuovi.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  deriveCompagni,
  deriveCompagniServer,
  deriveCompagno,
  deriveCompagnoDetailServer,
  deriveDashboard,
  deriveDashboardServer,
  deriveDiary,
  deriveTorneiList,
  deriveTorneiListServer,
  deriveTorneoDetail,
  deriveTorneoDetailServer,
  partnerOptions,
  yearOptions,
} from '../lib/derive'
import type { CompagnoCard, CompagnoDetailData, DashboardData, DiaryEntry, TorneiListData, TorneoDetailData } from '../lib/derive'
import { deriveMappa } from '../lib/derive.mappa'
import type { MappaData } from '../lib/derive.mappa'
import { getDashboardStats } from '../lib/dashboard'
import type { ServerDashboard } from '../lib/dashboard'
import { getCompagniList, getCompagnoDetail, getTorneiList, getTorneoDetail } from '../lib/serverviews'
import type { SvCompagno, SvCompagnoDetail, SvTorneiList, SvTorneoDetail } from '../lib/serverviews'
import type { DiaryData, Option } from '../lib/models'
import { TUTTI, filtroGenere, generiGiocati, perCategoria, perGenere } from '../lib/genere'
import type { FiltroGenere, Gender, RigaCategoria } from '../lib/genere'
import type { Route } from './routes'
import { routeKey } from './routes'

export type Caricamento = 'attesa' | 'pronto' | 'fallito'

export interface Filtri {
  fPartner: string
  fYear: string
  setFPartner: (v: string) => void
  setFYear: (v: string) => void
  partnerOptions: Option[]
  yearOptions: string[]
  /** I filtri sono del piano (dormiente: oggi sempre true). */
  canFilter: boolean
  /**
   * Il genere (maschile, femminile, misto): il filtro in vigore. È «Tutti»
   * finché giochi un genere solo (o non ne hai segnato nessuno): allora il
   * selettore non c'è.
   */
  fGender: FiltroGenere
  setFGender: (v: FiltroGenere) => void
  /** I generi che giochi (almeno due perché il selettore compaia). */
  genderOptions: Gender[]
}

/** I numeri essenziali di un genere, per il confronto (Statistiche, Home). */
export interface NumeriGenere {
  genere: Gender
  winPct: number
  won: number
  lost: number
  played: number
  setPct: number
  tPlayed: number
  bestPlacement: string
}

export interface ScreenData {
  caricamento: Caricamento
  filtri: Filtri
  dashboard: DashboardData
  torneiList: TorneiListData
  entries: DiaryEntry[]
  mappa: MappaData
  compagniList: CompagnoCard[]
  /** Il dettaglio aperto. `null` = non esiste o non è visibile (non trovato). */
  torneo: TorneoDetailData | null
  compagno: CompagnoDetailData | null
  /** Gli altri generi, con gli stessi filtri di stagione e compagno (vuoto con un genere solo). */
  altriGeneri: NumeriGenere[]
  /** Le categorie (Amatoriale, Open…) nel genere e nei filtri scelti. */
  categorie: RigaCategoria[]
  /** Il diario ristretto al genere scelto (Wrapped lo legge da qui). */
  dataGenere: DiaryData
}

/** La scelta del genere resta da una visita all'altra (come la ricorda il telefono). */
const CHIAVE_GENERE = 'bvd_genere'
function genereSalvato(): string | null {
  try {
    return window.localStorage.getItem(CHIAVE_GENERE)
  } catch {
    return null
  }
}

interface Deps {
  data: DiaryData
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  route: Route
  canFilter: boolean
  /** "Chi c'è oggi": la stanza si ricarica all'apertura della rotta. */
  onOggi: () => void
}

export function useScreenData({ data, loading, error, reload, route, canFilter, onOggi }: Deps): ScreenData {
  const [fPartner, setFPartner] = useState('all')
  const [fYear, setFYear] = useState('Sempre')
  const [genereScelto, setGenereScelto] = useState<string | null>(genereSalvato)
  const setFGender = (v: FiltroGenere) => {
    setGenereScelto(v)
    try {
      window.localStorage.setItem(CHIAVE_GENERE, v)
    } catch {
      /* niente: resta per questa visita */
    }
  }
  const [serverDash, setServerDash] = useState<ServerDashboard | null>(null)
  const [srvTornei, setSrvTornei] = useState<SvTorneiList | null>(null)
  const [srvCompagni, setSrvCompagni] = useState<SvCompagno[] | null>(null)
  const [srvTorneo, setSrvTorneo] = useState<SvTorneoDetail | null>(null)
  const [srvCompagno, setSrvCompagno] = useState<SvCompagnoDetail | null>(null)

  // ---------------------------------------------------------- primo carico
  const [caricamento, setCaricamento] = useState<Caricamento>(loading ? 'attesa' : error ? 'fallito' : 'pronto')
  // Montato già fallito (l'anteprima `?fallito`, un remount dopo l'errore):
  // il riferimento parte da qui, o il primo «Riprova» riuscito non si vedrebbe.
  const dataAlFallimento = useRef<DiaryData | null>(!loading && error ? data : null)
  useEffect(() => {
    if (loading || caricamento !== 'attesa') return
    if (error) {
      dataAlFallimento.current = data
      setCaricamento('fallito')
    } else setCaricamento('pronto')
  }, [loading, error, caricamento, data])
  useEffect(() => {
    // Un reload riuscito porta un oggetto `data` nuovo: il diario c'è.
    if (caricamento === 'fallito' && dataAlFallimento.current && data !== dataAlFallimento.current) setCaricamento('pronto')
  }, [caricamento, data])

  const key = routeKey(route)
  const name = route.name
  const torneoId = route.name === 'torneo' ? route.id : null
  const compagnoId = route.name === 'compagno' ? route.id : null

  // I dati client si aggiornano solo dopo una mutazione: si ricaricano a ogni
  // cambio di ROTTA e al ritorno sulla scheda. Non sull'apertura degli overlay
  // né sui cambi di `?q=` (la chiave della rotta non li vede).
  useEffect(() => {
    void reload()
  }, [key, reload])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  // Il genere in vigore: un filtro non più valido ricade sul più recente.
  const generi = canFilter ? generiGiocati(data) : []
  const genere: FiltroGenere = canFilter ? filtroGenere(data, genereScelto) : TUTTI

  // Dashboard aggregata dal server (Home e Statistiche). La RPC non conosce il
  // genere: con un genere scelto vale il calcolo client (stessi numeri per
  // costruzione, sui dati ristretti a quel genere).
  useEffect(() => {
    if (name !== 'home' && name !== 'statistiche') return
    if (genere !== TUTTI) {
      setServerDash(null)
      return
    }
    let alive = true
    setServerDash(null)
    getDashboardStats(fPartner, fYear).then((s) => {
      if (alive) setServerDash(s)
    })
    return () => {
      alive = false
    }
  }, [name, fPartner, fYear, data, genere])

  useEffect(() => {
    if (name !== 'tornei' && name !== 'torneo') return
    let alive = true
    getTorneiList().then((r) => {
      if (alive) setSrvTornei(r)
    })
    return () => {
      alive = false
    }
  }, [name, data])

  useEffect(() => {
    if (name !== 'compagni' && name !== 'compagno') return
    let alive = true
    getCompagniList().then((r) => {
      if (alive) setSrvCompagni(r)
    })
    return () => {
      alive = false
    }
  }, [name, data])

  useEffect(() => {
    if (!torneoId) {
      setSrvTorneo(null)
      return
    }
    let alive = true
    setSrvTorneo(null)
    getTorneoDetail(torneoId).then((r) => {
      if (alive) setSrvTorneo(r)
    })
    return () => {
      alive = false
    }
  }, [torneoId, data])

  useEffect(() => {
    if (!compagnoId) {
      setSrvCompagno(null)
      return
    }
    let alive = true
    setSrvCompagno(null)
    getCompagnoDetail(compagnoId).then((r) => {
      if (alive) setSrvCompagno(r)
    })
    return () => {
      alive = false
    }
  }, [compagnoId, data])

  // "Chi c'è oggi": la stanza si ricarica a ogni apertura della rotta.
  const onOggiRef = useRef(onOggi)
  onOggiRef.current = onOggi
  useEffect(() => {
    if (name === 'oggi') onOggiRef.current()
  }, [name])

  // ---------------------------------------------------------- derivate
  const anno = canFilter ? fYear : 'Sempre'
  const compagnoF = canFilter ? fPartner : 'all'
  const hasShared = data.tournaments.some((t) => t.shared)
  // I dati del genere scelto: Home, Statistiche, Mappa e Wrapped li leggono
  // da qui. Liste, Diario e dettagli restano su tutto il diario.
  const dataG = useMemo(() => perGenere(data, genere), [data, genere])

  // La mappa è l'unica derivata cara (geocodifica, declustering): memoizzata
  // sui dati e sulla stagione, che sono le sole cose che la cambiano.
  const mappa = useMemo(() => deriveMappa(dataG, anno), [dataG, anno])
  const entries = useMemo(() => deriveDiary(data), [data])
  const dashboard = useMemo(
    () =>
      serverDash && !hasShared && genere === TUTTI
        ? deriveDashboardServer(serverDash, data, compagnoF, anno)
        : deriveDashboard(dataG, compagnoF, anno),
    [serverDash, hasShared, genere, data, dataG, compagnoF, anno],
  )
  // Il confronto: gli altri generi con gli stessi filtri (solo sulle schermate dei numeri).
  const numeri = name === 'home' || name === 'statistiche'
  const altriGeneri = useMemo<NumeriGenere[]>(
    () =>
      !numeri || generi.length < 2
        ? []
        : generi
            .filter((g) => g !== genere)
            .map((g) => {
              const s = deriveDashboard(perGenere(data, g), compagnoF, anno).s
              return { genere: g, winPct: s.winPct, won: s.won, lost: s.lost, played: s.played, setPct: s.setPct, tPlayed: s.tPlayed, bestPlacement: s.bestPlacement }
            }),
    [numeri, generi.join(), genere, data, compagnoF, anno], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const categorie = useMemo(() => (name === 'statistiche' ? perCategoria(dataG, compagnoF, anno) : []), [name, dataG, compagnoF, anno])
  // La Lista di Tornei è l'archivio: non è filtrata per stagione (C10).
  const torneiList = srvTornei && !hasShared ? deriveTorneiListServer(srvTornei, data) : deriveTorneiList(data, 'Sempre')
  const compagniList = srvCompagni ? deriveCompagniServer(srvCompagni) : deriveCompagni(data)
  // Il dettaglio: con la RPC in volo vale il calcolo client, che è immediato.
  // Se il torneo non c'è (eliminato, condivisione revocata) è `null`: lo stato
  // "non trovato", mai la lista al suo posto (C9).
  const torneo = torneoId
    ? srvTorneo
      ? deriveTorneoDetailServer(srvTorneo, data)
      : deriveTorneoDetail(data, torneoId)
    : null
  const compagno = compagnoId
    ? srvCompagno
      ? deriveCompagnoDetailServer(srvCompagno)
      : deriveCompagno(data, compagnoId)
    : null

  return {
    caricamento,
    filtri: {
      fPartner,
      fYear,
      setFPartner,
      setFYear,
      partnerOptions: partnerOptions(data),
      yearOptions: yearOptions(data),
      canFilter,
      fGender: genere,
      setFGender,
      genderOptions: generi.length >= 2 ? generi : [],
    },
    dashboard,
    torneiList,
    entries,
    mappa,
    compagniList,
    torneo,
    compagno,
    altriGeneri,
    categorie,
    dataGenere: dataG,
  }
}
