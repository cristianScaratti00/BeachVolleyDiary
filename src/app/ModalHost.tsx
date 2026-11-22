// ============================================================================
// L'host degli overlay (UX §4.3, MOTION.md §3.4): disegna la pila del router
// in un portal su `document.body`, così z-index e `overflow` degli antenati
// non li tagliano.
//
// - Il VELO è suo, non del singolo overlay: quando lo sheet del ＋ («Cosa
//   registriamo?») lascia il posto a un modulo il velo resta dov'è (niente
//   sfarfallio). Il ConfirmDialog porta il
//   suo, sopra: due veli dicono profondità. I visori hanno il fondo loro.
// - Le uscite partono a t0 e insieme (AnimatePresence senza `mode="wait"`).
// - Blocca lo scroll della pagina sotto finché c'è un overlay.
// ============================================================================
import { Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { ENTRATA, SVELTO } from '../components/Motion'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Menu } from '../components/ui/Menu'
import type { MenuViewItem } from '../components/ui/Menu'
import { Skeleton, Bone } from '../components/ui/Feedback'
import { toast } from '../components/ui/Toast'
import { useScrollLock } from '../components/ui/overlay'
import { deriveStory, partnerOptions, todayISO, tournamentOptions } from '../lib/derive'
import type { DiaryData } from '../lib/models'
import type { UseCheckIn } from '../hooks/useCheckIn'
import type { UseDiary } from '../hooks/useDiary'
import type { UseCampionato } from '../hooks/useCampionato'
import { nomeTappa } from '../lib/campionato'
import type { CampionatoData } from '../lib/campionato'
import type { CampionatoActions } from './useCampionatoActions'
import type { Route } from './routes'
import { closeOverlay, closeOverlays, overlayStack, replaceNextOverlay, setOverlayFlags, useOverlays } from './router'
import type { OverlayEntry } from './overlays'
import type { Actions } from './useActions'
import { compagnoDefault, destinazionePartita, partitaDestinazione } from './selectors'
import type { OverlayBase, TorneoOption } from './contracts'
import TorneoSheet from '../components/modals/TorneoSheet'
import PartitaSheet from '../components/modals/PartitaSheet'
import FotoSheet from '../components/modals/FotoSheet'
import CompagnoSheet from '../components/modals/CompagnoSheet'
import CollegaSheet from '../components/modals/CollegaSheet'
import PasswordSheet from '../components/modals/PasswordSheet'
import TappaSheet from '../components/modals/TappaSheet'
import PartitaTappaSheet from '../components/modals/PartitaTappaSheet'
import IscrizioneSheet from '../components/modals/IscrizioneSheet'
import RiordinaSheet from '../components/modals/RiordinaSheet'
import { genereProposto, gruppiRiordino } from '../lib/genere'
import './ModalHost.css'

// La Storia trascina `html-to-image`, il visore delle foto è leggero ma fuori
// dal percorso caldo: entrambi in chunk a parte.
const StoryModal = lazy(() => import('../components/modals/StoryModal'))
const PhotoLightbox = lazy(() => import('../components/PhotoLightbox'))

/** Gli overlay che hanno un fondo loro: niente velo dell'host sotto. */
const SENZA_VELO = new Set(['conferma', 'storia', 'lightbox'])

interface Props {
  data: DiaryData
  route: Route
  diary: UseDiary
  /** Non serve più qui (il check-in è uscito dal ＋): resta per la firma di App. */
  check?: UseCheckIn
  actions: Actions
  canAddPartner: boolean
  /** Il Campionato per Società: dati e azioni suoi, a parte da quelli dei tornei. */
  campionato: UseCampionato
  campAct: CampionatoActions
}

export function ModalHost({ data, route, diary, actions, canAddPartner, campionato, campAct }: Props) {
  const stack = useOverlays()
  useScrollLock(stack.length > 0)

  const conVelo = stack.some(
    (e) => !SENZA_VELO.has(e.overlay.kind) && !(e.overlay.kind === 'azioni' && e.overlay.anchor === 'popover') && e.overlay.kind !== 'menu',
  )
  // I popover (Sidebar «＋ Nuovo», «⋯») non hanno velo: il clic fuori chiude.
  const popover = stack.some((e) => e.overlay.kind === 'menu' || (e.overlay.kind === 'azioni' && e.overlay.anchor === 'popover'))

  return createPortal(
    <>
      <AnimatePresence>
        {conVelo && (
          <m.div
            key="velo"
            className="ui-scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: ENTRATA }}
            exit={{ opacity: 0, transition: SVELTO }}
            onClick={() => closeOverlay()}
          />
        )}
      </AnimatePresence>
      {popover && !conVelo && <div className="ui-catcher" aria-hidden="true" onClick={() => closeOverlay()} />}
      <AnimatePresence>
        {stack.map((e, i) => (
          <Voce
            key={e.key}
            entry={e}
            top={i === stack.length - 1}
            data={data}
            route={route}
            diary={diary}
            actions={actions}
            canAddPartner={canAddPartner}
            campionato={campionato}
            campAct={campAct}
          />
        ))}
      </AnimatePresence>
    </>,
    document.body,
  )
}

function Voce({ entry, top, data, route, diary, actions, canAddPartner, campionato, campAct }: Omit<Props, 'check'> & { entry: OverlayEntry; top: boolean }) {
  const o = entry.overlay
  const base: OverlayBase = {
    onClose: () => closeOverlay(),
    top,
    byTouch: entry.byTouch,
    opener: entry.opener,
    setDirty: (dirty) => setOverlayFlags(entry.key, { dirty }),
    setBusy: (busy) => setOverlayFlags(entry.key, { busy }),
  }

  switch (o.kind) {
    case 'azioni': {
      // Lo sheet «Cosa registriamo?» (design 13): le stesse voci nel popover
      // di «Nuovo» della Sidebar. Il check-in non sta più qui: è in Compagni.
      // «Partita» va al torneo o alla tappa più recente (destinazionePartita).
      const dest = destinazionePartita(data, campionato.data, route)
      const items: MenuViewItem[] = [
        {
          key: 'live',
          label: 'Partita live',
          sub: 'Segna i punti, in torneo o tra amici',
          icon: 'clock',
          tone: 'accent',
          // È una rotta: la voce del menu diventa la destinazione.
          onSelect: actions.partitaLive,
        },
        {
          key: 'torneo',
          label: 'Torneo',
          sub: 'Luogo, formato, compagno, piazzamento',
          icon: 'trophy',
          onSelect: () => actions.nuovoTorneo(true),
        },
      ]
      // Senza un torneo di destinazione la partita non ha dove andare (F3.5).
      if (dest) {
        items.push({
          key: 'partita',
          label: 'Partita',
          sub: `Aggiungi un risultato a «${dest.tipo === 'torneo' ? dest.t.name : nomeTappa(dest.t)}»`,
          icon: 'volley',
          onSelect: () => (dest.tipo === 'torneo' ? actions.nuovaPartita(dest.t.id, true) : campAct.nuovaPartitaTappa(dest.t.id, true)),
        })
      }
      items.push(
        {
          key: 'rapido',
          label: 'Torneo rapido',
          sub: 'Nome e piazzamento, i dettagli dopo',
          icon: 'bolt',
          onSelect: () => actions.torneoRapido(true),
        },
        {
          key: 'pallo',
          label: 'Raccontalo a Solby',
          sub: 'Ti faccio io le domande, una alla volta',
          icon: 'chat-dots',
          onSelect: actions.apriAssistente,
        },
        // Il Campionato per Società in fondo: le voci di sempre restano dove sono.
        {
          key: 'tappa',
          label: 'Tappa del Campionato',
          sub: 'Categoria, piazzamento, punti FIPAV',
          icon: 'shield',
          onSelect: () => campAct.nuovaTappa(true),
        },
      )
      return (
        <Menu
          title="Cosa registriamo?"
          sub="Scegli tu, al resto penso io."
          items={items}
          placement={o.anchor === 'popover' ? 'popover' : 'sheet'}
          anchor={entry.anchor}
          opener={entry.opener}
          top={top}
          onClose={() => closeOverlay()}
        />
      )
    }

    case 'menu':
      return (
        <Menu
          title={o.spec.title}
          placement="popover"
          anchor={entry.anchor}
          opener={entry.opener}
          top={top}
          cancel={false}
          onClose={() => closeOverlay()}
          items={o.spec.items.map((it) => ({
            ...it,
            onSelect: () => {
              // La voce che apre un dialogo o uno sheet sostituisce il menu.
              replaceNextOverlay()
              it.onSelect()
              replaceNextOverlay(false)
            },
          }))}
        />
      )

    case 'torneo': {
      const torneo = o.mode === 'modifica' ? data.tournaments.find((t) => t.id === o.id) : undefined
      if (o.mode === 'modifica' && !torneo) return null
      return (
        <TorneoSheet
          {...base}
          mode={o.mode}
          rapido={o.mode === 'nuovo' && !!o.rapido}
          torneo={torneo}
          partners={partnerOptions(data)}
          venues={data.venues}
          compagnoDefault={compagnoDefault(data)}
          today={todayISO()}
          canAddPartner={canAddPartner}
          onSave={(form, via) => actions.salvaTorneo(form, o.mode === 'modifica' ? o.id : null, via)}
          onDelete={o.mode === 'modifica' ? () => actions.eliminaTorneo(o.id) : undefined}
          onUseAssistant={actions.usaAssistente}
          onMergeVenues={diary.mergeVenues}
          proponiGenere={(partnerId, category) => genereProposto(data, { partnerId, category })}
        />
      )
    }

    case 'partita': {
      const match = o.mode === 'modifica' ? data.matches.find((x) => x.id === o.matchId) : undefined
      if (o.mode === 'modifica' && !match) return null
      const tid = o.mode === 'modifica' ? match!.tournamentId : o.tournamentId ?? partitaDestinazione(data, route)?.id ?? null
      return (
        <PartitaSheet
          {...base}
          mode={o.mode}
          match={match}
          tournamentId={tid}
          tournaments={torneiConCompagno(data)}
          onSave={(form) => actions.salvaPartita(form, o.mode === 'modifica' ? o.matchId : null)}
          onDelete={o.mode === 'modifica' ? () => actions.eliminaPartita(o.matchId) : undefined}
        />
      )
    }

    case 'foto': {
      const t = data.tournaments.find((x) => x.id === o.tournamentId)
      return (
        <FotoSheet
          {...base}
          tournamentId={o.tournamentId}
          tournamentName={t?.name ?? ''}
          onSave={actions.salvaFoto}
        />
      )
    }

    case 'compagno':
      return <CompagnoSheet {...base} onSave={actions.salvaCompagno} />

    case 'collega': {
      const p = data.partners.find((x) => x.id === o.partnerId)
      return (
        <CollegaSheet
          {...base}
          partnerName={p?.name ?? ''}
          onSearch={diary.searchUsers}
          onLink={(userId) => actions.collega(o.partnerId, userId)}
        />
      )
    }

    case 'password':
      return <PasswordSheet {...base} onSave={actions.aggiornaPassword} />

    case 'storia': {
      const story = deriveStory(data, o.tournamentId)
      if (!story) return null
      return (
        <Suspense fallback={<ViewerSkeleton />}>
          <StoryModal
            {...base}
            story={story}
            placement={data.tournaments.find((x) => x.id === o.tournamentId)?.placement}
            // Le stesse foto (e nello stesso ordine) di `deriveStory`.
            didascalie={data.photos.filter((p) => p.tournamentId === o.tournamentId && p.url).slice(0, 3).map((p) => p.caption)}
            onNotice={(msg, type = 'error') => toast.show(type, msg)}
          />
        </Suspense>
      )
    }

    case 'lightbox': {
      const photos = data.photos
        .filter((p) => p.tournamentId === o.tournamentId && p.url)
        .map((p) => ({ url: p.url as string, caption: p.caption }))
      const t = data.tournaments.find((x) => x.id === o.tournamentId)
      const nameBase = (t?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'foto'
      if (!photos.length) return null
      return (
        <Suspense fallback={null}>
          <PhotoLightbox {...base} photos={photos} startIndex={Math.min(o.index, photos.length - 1)} nameBase={nameBase} />
        </Suspense>
      )
    }

    case 'tappa': {
      const tappa = o.mode === 'modifica' ? campionato.data.tappe.find((t) => t.id === o.id) : undefined
      if (o.mode === 'modifica' && !tappa) return null
      const ultima = [...campionato.data.tappe].sort((a, b) => b.date.localeCompare(a.date)).find((t) => t.partnerId)
      return (
        <TappaSheet
          {...base}
          mode={o.mode}
          tappa={tappa}
          iscrizioni={campionato.data.iscrizioni}
          // Solo i compagni propri: la tappa non si aggancia a una riga condivisa.
          partners={data.partners.filter((p) => !p.shared).map((p) => ({ id: p.id, name: p.name }))}
          // Il compagno dell'ultima tappa; senza tappe, quello dei tornei.
          compagnoDefault={ultima?.partnerId ?? compagnoDefault(data)}
          today={todayISO()}
          canAddPartner={canAddPartner}
          onSave={(form) => campAct.salvaTappa(form, o.mode === 'modifica' ? o.id : null)}
          onDelete={o.mode === 'modifica' ? () => campAct.eliminaTappa(o.id) : undefined}
        />
      )
    }

    case 'partitaTappa': {
      const match = o.mode === 'modifica' ? campionato.data.partite.find((p) => p.id === o.matchId) : undefined
      const stageId = o.mode === 'modifica' ? match?.stageId : o.stageId
      const tappa = campionato.data.tappe.find((t) => t.id === stageId)
      if (!tappa || (o.mode === 'modifica' && !match)) return null
      const club = campionato.data.iscrizioni.find((i) => i.id === tappa.seasonId)?.club ?? ''
      const con = tappa.partnerId ? data.partners.find((p) => p.id === tappa.partnerId)?.name : undefined
      return (
        <PartitaTappaSheet
          {...base}
          mode={o.mode}
          match={match}
          stageId={tappa.id}
          contesto={[nomeTappa(tappa), con && `con ${con}`, `set a ${tappa.setPoints}`].filter(Boolean).join(' · ')}
          setPoints={tappa.setPoints}
          societa={societaIncontrate(campionato.data, club)}
          ownClub={club}
          onSave={(form) => campAct.salvaPartitaTappa(form, o.mode === 'modifica' ? o.matchId : null)}
          onDelete={o.mode === 'modifica' ? () => campAct.eliminaPartitaTappa(o.matchId) : undefined}
        />
      )
    }

    case 'riordina':
      return <RiordinaSheet {...base} gruppi={gruppiRiordino(data)} onSave={actions.salvaGeneri} />

    case 'iscrizione': {
      const isc = campionato.data.iscrizioni.find((i) => i.id === o.id)
      if (!isc) return null
      return <IscrizioneSheet {...base} iscrizione={isc} onSave={(form) => campAct.salvaIscrizione(form, o.id)} />
    }

    case 'conferma': {
      const spec = o.spec
      return (
        <ConfirmDialog
          title={spec.title}
          text={spec.text}
          confirmLabel={spec.confirmLabel}
          busyLabel={spec.busyLabel}
          cancelLabel={spec.cancelLabel}
          tone={spec.tone}
          opener={entry.opener}
          top={top}
          onCancel={() => {
            spec.onCancel?.()
            closeOverlays(1, { force: true })
          }}
          onConfirm={async () => {
            await spec.onConfirm()
            // Se l'azione non ha già chiuso (errore, o azione che resta qui),
            // il dialogo si chiude e si resta dove si era.
            const ancora = overlayEntryAncoraAperta(entry.key)
            if (ancora) closeOverlays(1, { force: true })
          }}
        />
      )
    }
  }
}

/** I propri tornei per «Nuova partita», ognuno con il compagno che la partita eredita. */
function torneiConCompagno(data: DiaryData): TorneoOption[] {
  return tournamentOptions(data).map((o) => {
    const pid = data.tournaments.find((t) => t.id === o.id)?.partnerId
    return { ...o, partner: (pid && data.partners.find((p) => p.id === pid)?.name) || '' }
  })
}

/** La propria società, poi quelle incontrate più spesso: i suggerimenti della partita di una tappa. */
function societaIncontrate(camp: CampionatoData, propria: string): string[] {
  const conteggio = new Map<string, { nome: string; n: number }>()
  for (const p of camp.partite) {
    const nome = p.opponentsClub.trim()
    if (!nome) continue
    const k = nome.toLowerCase()
    const c = conteggio.get(k)
    conteggio.set(k, { nome: c?.nome ?? nome, n: (c?.n ?? 0) + 1 })
  }
  const altre = [...conteggio.values()]
    .filter((c) => c.nome.toLowerCase() !== propria.trim().toLowerCase())
    .sort((a, b) => b.n - a.n)
    .map((c) => c.nome)
  return propria.trim() ? [propria.trim(), ...altre] : altre
}

function overlayEntryAncoraAperta(key: string) {
  return overlayStack().some((e) => e.key === key)
}

/** Lo skeleton della Storia mentre arriva il chunk: la card in scala 9:16. */
function ViewerSkeleton() {
  return (
    <div className="ui-viewer-loading" data-surface="dark">
      <Skeleton label="Preparo la storia…">
        <Bone className="ui-viewer-loading-card" />
      </Skeleton>
    </div>
  )
}
