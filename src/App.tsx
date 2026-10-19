// ============================================================================
// L'app autenticata: compone router, dati, azioni e schermate. Lo stato e gli
// effetti che stavano qui (1023 righe) vivono ora in:
//   src/app/router.ts        rotte, history, pila degli overlay
//   src/app/useScreenData.ts effetti RPC per rotta + derivate, primo carico
//   src/app/useActions.ts    salvataggi, eliminazioni, permessi, analytics
//   src/app/ModalHost.tsx    sheet, menu, dialoghi e visori
//   src/app/AppShell.tsx     Sidebar/TabBar, main, focus e titolo per rotta
// ============================================================================
import { Suspense, useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import { useDiary } from './hooks/useDiary'
import type { UseDiary } from './hooks/useDiary'
import { useAuth } from './hooks/useAuth'
import { useCheckIn } from './hooks/useCheckIn'
import type { UseCheckIn } from './hooks/useCheckIn'
import { useOnline } from './hooks/useConnection'
import { permissionsFor } from './lib/permissions'
import { partnerOptions, venueOptions, todayISO, wrappedRangeForYear, deriveWrapped, WRAPPED_MIN_MATCHES } from './lib/derive'
import { inviaSegnalazione, elencoSegnalazioni, aggiornaStato } from './lib/segnalazioni'
import { decidi, useScelta } from './lib/consenso'
import { backLabel, goBack, guardRoute, navigate, useNav } from './app/router'
import { routeFullscreen, routeParent, routeTitle } from './app/routes'
import type { Route, TorneiVista } from './app/routes'
import { useScreenData } from './app/useScreenData'
import { useActions } from './app/useActions'
import { AppShell } from './app/AppShell'
import { ModalHost } from './app/ModalHost'
import { deriveAdesso, deriveHome, metaDiario, wrappedAOttobre } from './app/selectors'
import Splash from './components/Splash'
import { ErrorState, Skeleton, Bone } from './components/ui/Feedback'
import { Page } from './components/ui/Page'
import { ButtonLink } from './components/ui/Button'
import { toast } from './components/ui/Toast'
import { LazyBoundary, lazyRetry } from './app/LazyBoundary'
import Home from './screens/Home'
import Statistiche from './screens/Statistiche'
import Tornei from './screens/Tornei'
import Diario from './screens/Diario'
import TorneoDetail from './screens/TorneoDetail'
import Compagni from './screens/Compagni'
import CompagnoDetail from './screens/CompagnoDetail'
import ChiCeOggi from './screens/ChiCeOggi'
import Profilo from './screens/Profilo'
import Segnala from './screens/Segnala'
import Segnalazioni from './screens/Segnalazioni'
import NonTrovato from './screens/NonTrovato'

// Lazy: l'assistente (1600 righe di copione) e Wrapped (trascina html-to-image).
// Con «Riprova» se il chunk non arriva (deploy nuovo, rete): UX §6.0.
const CreaChat = lazyRetry(() => import('./screens/CreaChat'))
const PartitaLive = lazyRetry(() => import('./screens/PartitaLive'))
const Wrapped = lazyRetry(() => import('./screens/Wrapped'))

/** Quanto resta la traccia sull'entità appena toccata: SVELTO + RACCONTO, più un margine. */
const TRACCIA_MS = 1200

export default function App() {
  const auth = useAuth()
  const diary = useDiary()
  const check = useCheckIn({
    tournaments: diary.data.tournaments,
    venues: diary.data.venues,
    saveCompagno: diary.saveCompagno,
    linkPartner: diary.linkPartner,
  })
  return <AppView diary={diary} auth={auth} check={check} />
}

export interface AppDeps {
  diary: UseDiary
  auth: Pick<ReturnType<typeof useAuth>, 'session' | 'logout' | 'refresh'>
  check: UseCheckIn
}

/**
 * La composizione vera, con i dati e la rete iniettati: App la usa con gli hook
 * di Supabase, l'anteprima (docs/preview) e i test con dati di fabbrica.
 */
export function AppView({ diary, auth, check }: AppDeps) {
  const { session, logout, refresh } = auth
  const { data, loading, error, reload } = diary
  const nav = useNav()
  const route = nav.route
  const online = useOnline()
  const consenso = useScelta()

  // Piani sospesi (limits.PLANS_ENABLED = false): oggi ogni check passa. La
  // struttura resta per quando torneranno; un diniego è un Toast (C11).
  const perm = permissionsFor(session?.plan, session?.role, {
    tournaments: data.tournaments.filter((t) => !t.shared).length,
    partners: data.partners.filter((p) => !p.shared).length,
  })

  // La vista di Tornei ricordata: la tab Tornei e l'indietro dal dettaglio ci tornano.
  const [vista, setVista] = useState<TorneiVista>(route.name === 'tornei' ? route.vista : 'lista')
  useEffect(() => {
    if (route.name === 'tornei') setVista(route.vista)
  }, [route])
  const vistaRef = useRef(vista)
  vistaRef.current = vista

  const screen = useScreenData({
    data,
    loading,
    error,
    reload,
    route,
    canFilter: perm.canUseFilters,
    onOggi: check.refresh,
  })

  const actions = useActions({
    diary,
    data,
    route,
    session,
    perm,
    check,
    caricamento: screen.caricamento,
    logout,
    refreshSession: refresh,
    torneiVista: () => ({ name: 'tornei', vista: vistaRef.current }),
  })

  // La traccia arriva con la navigazione (state.traccia) e si spegne da sola.
  const [traccia, setTraccia] = useState<string | undefined>(undefined)
  useEffect(() => {
    const t = nav.state.traccia
    if (!t) return
    setTraccia(t)
    const id = window.setTimeout(() => setTraccia(undefined), TRACCIA_MS)
    return () => window.clearTimeout(id)
  }, [nav.seq, nav.state.traccia])

  // Analytics che scattano all'ingresso nella rotta (UX §13).
  const prevRoute = useRef<Route | null>(null)
  useEffect(() => {
    const prima = prevRoute.current
    prevRoute.current = route
    if (route.name === 'tornei' && route.vista === 'mappa' && !(prima?.name === 'tornei' && prima.vista === 'mappa')) track('mappa_aperta')
    if (route.name === 'wrapped' && prima?.name !== 'wrapped') track('wrapped_aperto')
  }, [route])

  // /profilo/segnalazioni senza ruolo admin → Profilo (solo UI: il cancello è la RPC).
  const admin = session?.role === 'admin'
  useEffect(() => {
    if (route.name === 'segnalazioni' && session && !admin) navigate({ name: 'profilo' }, { replace: true })
  }, [route, session, admin])

  // Le segnalazioni nuove, per la riga del Profilo (solo admin).
  const [nuove, setNuove] = useState<number | null>(null)
  useEffect(() => {
    if (!admin || route.name !== 'profilo') return
    let vivo = true
    elencoSegnalazioni()
      .then((l) => {
        if (vivo && l) setNuove(l.filter((s) => s.stato === 'nuovo').length)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [admin, route.name])

  // Lo splash è uno solo dall'autenticazione ai dati (UX F0).
  if (loading) return <Splash />

  const parent = routeParent(route, vista)
  const back = {
    label: backLabel(parent ? routeTitle(parent).split(' · ')[0] : 'Home'),
    onClick: () => goBack(parent),
  }

  const dataScreen = !['segnala', 'segnalazioni', 'profilo', 'nonTrovato', 'crea'].includes(route.name)
  const fallito = screen.caricamento === 'fallito' && dataScreen

  const anno = perm.canUseFilters ? screen.filtri.fYear : 'Sempre'
  const s = screen.dashboard.s
  const wrappedPronto = wrappedAOttobre() && s.played >= WRAPPED_MIN_MATCHES
  const wrappedTitolo = anno !== 'Sempre' ? `Beach Wrapped ${anno}` : 'Beach Wrapped'

  const render = () => {
    if (fallito) {
      return (
        <Page>
          <ErrorState
            title="Non riesco a caricare il diario"
            text={online ? 'Qualcosa non ha risposto. I tuoi dati sono al sicuro.' : 'Sei offline. Il diario si carica quando torni in linea.'}
            onRetry={reload}
            autoRetryOnline
          />
        </Page>
      )
    }
    switch (route.name) {
      case 'home': {
        // Il banner alpha e «Chi c'è oggi» non stanno più in Home (il
        // redesign): «Segnala un problema» è nel Profilo, «Chi c'è oggi» in
        // Compagni.
        const oggi = todayISO()
        return (
          <Home
            {...deriveHome(data, { nome: session?.name ?? '', today: oggi, wrapped: wrappedPronto })}
            nome={session?.name ?? ''}
            avatar={session?.avatarUrl ?? null}
            today={oggi}
            numeri={s.played > 0 ? s : null}
            filtri={screen.filtri}
            wrapped={{ visibile: wrappedPronto, titolo: wrappedTitolo }}
            onNuovoTorneo={() => actions.nuovoTorneo()}
            onAggiungiPartita={(id) => actions.nuovaPartita(id)}
            onAggiornaPiazzamento={(id) => actions.modificaTorneo(id)}
            onStoria={actions.apriStoria}
          />
        )
      }
      case 'statistiche':
        return <Statistiche s={s} filtri={screen.filtri} back={back} wrapped={{ visibile: wrappedPronto, titolo: wrappedTitolo }} />
      case 'wrapped': {
        const motivo = !wrappedAOttobre() ? 'stagione' : s.played < WRAPPED_MIN_MATCHES ? 'dati' : null
        const wrapped = motivo ? null : deriveWrapped(data, wrappedRangeForYear(data, anno), perm.canUseFilters ? screen.filtri.fPartner : 'all')
        return (
          <LazyBoundary onReset={Wrapped.reset}>
            <Suspense fallback={<Skeleton label="Preparo il recap…"><Bone className="app-skel-viewer" /></Skeleton>}>
              <Wrapped
                wrapped={wrapped}
                motivo={motivo}
                onClose={() => goBack({ name: 'home' })}
                onNotice={(msg, type = 'error') => toast.show(type, msg)}
              />
            </Suspense>
          </LazyBoundary>
        )
      }
      case 'oggi':
        return (
          <ChiCeOggi
            own={check.own}
            room={check.room}
            loading={check.loading}
            cityPrefill={check.cityPrefill}
            back={back}
            onCheckIn={actions.fareCheckIn}
            onTerminaCheckIn={actions.terminaCheckIn}
            onRefresh={check.refresh}
            onAddPartner={check.addAsPartner}
          />
        )
      case 'tornei':
        return (
          <Tornei
            vista={route.vista}
            q={route.q ?? ''}
            onVista={(v) => navigate({ name: 'tornei', vista: v, q: route.q }, { replace: true, keepFocus: true, keepScroll: true })}
            onQuery={(q) => navigate({ name: 'tornei', vista: route.vista, q: q || undefined }, { replace: true, keepFocus: true, keepScroll: true })}
            list={screen.torneiList}
            entries={screen.entries}
            mappa={screen.mappa}
            stagione={{ fYear: screen.filtri.fYear, setFYear: screen.filtri.setFYear, yearOptions: screen.filtri.yearOptions }}
            onNuovoTorneo={() => actions.nuovoTorneo()}
            onStoria={actions.apriStoria}
            traccia={traccia}
          />
        )
      case 'diario':
        return (
          <Diario
            q={route.q ?? ''}
            onQuery={(q) => navigate({ name: 'diario', q: q || undefined }, { replace: true, keepFocus: true, keepScroll: true })}
            entries={screen.entries}
            meta={(id) => metaDiario(data, id)}
            onNuovoTorneo={() => actions.nuovoTorneo()}
            onStoria={actions.apriStoria}
            traccia={traccia}
          />
        )
      case 'live': {
        const miei = data.tournaments.filter((x) => !x.shared).slice().sort((a, b) => b.date.localeCompare(a.date))
        const diOggi = deriveAdesso(data).oggi
        return (
          <LazyBoundary onReset={PartitaLive.reset}>
            <Suspense fallback={<Skeleton label="Preparo il segnapunti…"><Bone className="app-skel-bubble" /></Skeleton>}>
              <PartitaLive
                tornei={miei.map((x) => ({ id: x.id, name: x.name, partner: data.partners.find((p) => p.id === x.partnerId)?.name ?? '' }))}
                torneoDefault={diOggi?.id ?? miei[0]?.id ?? null}
                // Senza un torneo oggi si apre su «Tra amici».
                torneoOggi={!!diOggi}
                utente={session?.id ?? null}
                onSave={(form) => actions.salvaPartita(form, null)}
                onDone={(id) => navigate({ name: 'torneo', id }, { replace: true })}
                // La conferma («Uscire dalla partita?») è della schermata:
                // qui arriva solo l'uscita già decisa.
                onExit={() => goBack({ name: 'home' })}
                onNuovoTorneo={() => actions.nuovoTorneo()}
                registerExitGuard={(isDirty, onBlocked) => guardRoute(isDirty, onBlocked)}
              />
            </Suspense>
          </LazyBoundary>
        )
      }
      case 'torneo': {
        // Il redesign non ha più il menu «⋯»: Storia e Modifica stanno nella
        // capsula in cima, «Elimina torneo» nello sheet di modifica.
        const raw = data.tournaments.find((x) => x.id === route.id)
        return (
          <TorneoDetail
            key={route.id}
            t={screen.torneo}
            scheda={raw ? { date: raw.date, format: raw.format, surface: raw.surface } : null}
            back={back}
            traccia={traccia}
            onAddPartita={() => actions.nuovaPartita(route.id)}
            onOpenMatch={actions.modificaPartita}
            onAddFoto={() => actions.aggiungiFoto(route.id)}
            onOpenFoto={(i) => actions.apriFoto(route.id, i)}
            onDeleteFoto={actions.eliminaFoto}
            onStoria={() => actions.apriStoria(route.id)}
            onModifica={() => actions.modificaTorneo(route.id)}
          />
        )
      }
      case 'compagni':
        return (
          <Compagni
            compagni={screen.compagniList}
            collegati={new Set(data.partners.filter((p) => p.linkedUserId != null).map((p) => p.id))}
            traccia={traccia}
            onNuovoCompagno={actions.nuovoCompagno}
          />
        )
      case 'compagno': {
        const p = data.partners.find((x) => x.id === route.id)
        return (
          <CompagnoDetail
            key={route.id}
            cp={p && !p.shared ? screen.compagno : null}
            linked={p?.linkedUserId != null}
            back={back}
            traccia={traccia}
            onOpenMatch={actions.modificaPartita}
            onCollega={() => actions.collegaCompagno(route.id)}
            onScollega={() => actions.scollegaCompagno(route.id)}
            onElimina={() => actions.eliminaCompagno(route.id)}
          />
        )
      }
      case 'profilo':
        return (
          <Profilo
            session={session!}
            // Un compagno `shared` è una riga creata da un ALTRO utente e resa
            // visibile perché ci ha collegati: è una condivisione ricevuta.
            condivisioni={data.partners.filter((p) => p.shared).length}
            consenso={consenso}
            segnalazioniNuove={admin ? nuove ?? 0 : null}
            onSalvaNome={actions.salvaNome}
            onCaricaAvatar={actions.caricaAvatar}
            onPassword={actions.cambiaPassword}
            onTogliCondivisioni={actions.togliCondivisioni}
            onConsenso={decidi}
            onEsci={actions.esci}
            onClose={() => goBack({ name: 'home' })}
          />
        )
      case 'segnala':
        return <Segnala back={back} onBack={() => goBack({ name: 'profilo' })} onInvia={inviaSegnalazione} />
      case 'segnalazioni':
        return admin ? <Segnalazioni back={back} carica={elencoSegnalazioni} aggiorna={aggiornaStato} /> : null
      case 'crea':
        return (
          <LazyBoundary onReset={CreaChat.reset}>
            <Suspense fallback={<Skeleton label="Preparo l'assistente…"><Bone className="app-skel-bubble" /></Skeleton>}>
              <CreaChat
                partners={partnerOptions(data)}
                venues={venueOptions(data)}
                onCreate={actions.creaGuidato}
                onDone={(id) => navigate({ name: 'torneo', id }, { replace: true })}
                onExit={actions.esciDallAssistente}
                registerExitGuard={(isDirty) => guardRoute(isDirty, () => actions.esciDallAssistente(true))}
              />
            </Suspense>
          </LazyBoundary>
        )
      case 'nonTrovato':
        return (
          <NonTrovato
            titolo="Pagina non trovata"
            testo="L'indirizzo non porta da nessuna parte nel diario."
            azione={<ButtonLink to={{ name: 'home' }}>Vai alla Home</ButtonLink>}
          />
        )
    }
  }

  const entityTitle =
    route.name === 'torneo' ? screen.torneo?.name ?? 'Torneo non trovato' : route.name === 'compagno' ? screen.compagno?.name ?? 'Compagno non trovato' : undefined

  return (
    <>
      <AppShell
        vista={vista}
        user={{ name: session?.name ?? '', email: session?.email ?? '', avatar: session?.avatarUrl ?? null, admin }}
        entityTitle={entityTitle}
        onPlus={(anchor) => actions.apriAzioni(anchor)}
        fullscreen={routeFullscreen(route)}
      >
        {render()}
      </AppShell>
      <ModalHost data={data} route={route} diary={diary} check={check} actions={actions} canAddPartner={perm.canCreatePartner} />
    </>
  )
}
