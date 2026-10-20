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
import type { Route } from './routes'
import { closeOverlay, closeOverlays, overlayStack, replaceNextOverlay, setOverlayFlags, useOverlays } from './router'
import type { OverlayEntry } from './overlays'
import type { Actions } from './useActions'
import { compagnoDefault, partitaDestinazione } from './selectors'
import type { OverlayBase, TorneoOption } from './contracts'
import TorneoSheet from '../components/modals/TorneoSheet'
import PartitaSheet from '../components/modals/PartitaSheet'
import FotoSheet from '../components/modals/FotoSheet'
import CompagnoSheet from '../components/modals/CompagnoSheet'
import CollegaSheet from '../components/modals/CollegaSheet'
import PasswordSheet from '../components/modals/PasswordSheet'
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
}

export function ModalHost({ data, route, diary, actions, canAddPartner }: Props) {
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
          />
        ))}
      </AnimatePresence>
    </>,
    document.body,
  )
}

function Voce({ entry, top, data, route, diary, actions, canAddPartner }: Omit<Props, 'check'> & { entry: OverlayEntry; top: boolean }) {
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
      const dest = partitaDestinazione(data, route)
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
          sub: `Aggiungi un risultato a «${dest.name}»`,
          icon: 'volley',
          onSelect: () => actions.nuovaPartita(dest.id, true),
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
