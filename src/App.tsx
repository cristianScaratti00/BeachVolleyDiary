import { useState } from 'react'
import { useDiary } from './hooks/useDiary'
import { useIsWide } from './hooks/useMedia'
import { useAuth } from './hooks/useAuth'
import {
  deriveDashboard, deriveTorneiList, deriveTorneoDetail,
  deriveCompagni, deriveCompagno, deriveGallery,
  tournamentOptions, partnerOptions, yearOptions,
} from './lib/derive'
import type { Screen, ModalKind, AnyForm, SetField, SetsApi } from './lib/models'

import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Splash from './components/Splash'
import Home from './screens/Home'
import Tornei from './screens/Tornei'
import TorneoDetail from './screens/TorneoDetail'
import Compagni from './screens/Compagni'
import CompagnoDetail from './screens/CompagnoDetail'
import Galleria from './screens/Galleria'
import TorneoModal from './components/modals/TorneoModal'
import PartitaModal from './components/modals/PartitaModal'
import FotoModal from './components/modals/FotoModal'
import CompagnoModal from './components/modals/CompagnoModal'
import QuickTorneoModal from './components/modals/QuickTorneoModal'

const scrollTop = () => { try { window.scrollTo(0, 0) } catch (e) { /* ignore */ } }

export default function App() {
  const wide = useIsWide()
  const { session, logout } = useAuth()
  const { data, loading: dataLoading, saveTorneo, quickCreateTorneo, deleteTorneo, savePartita, deletePartita, saveFoto, saveCompagno } = useDiary()

  const [screen, setScreen] = useState<Screen>('home')
  const [selT, setSelT] = useState<string | null>(null)
  const [selP, setSelP] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [fPartner, setFPartner] = useState('all')
  const [fYear, setFYear] = useState('Sempre')
  const [form, setForm] = useState<AnyForm>({})

  // ---------- navigation ----------
  const go = (s: Screen) => { setScreen(s); setFabOpen(false); scrollTop() }
  const openTorneoDetail = (id: string) => { setSelT(id); setScreen('torneo'); setFabOpen(false); scrollTop() }
  const openCompagnoDetail = (id: string) => { setSelP(id); setScreen('compagno'); setFabOpen(false); scrollTop() }

  // ---------- form helpers ----------
  const setField: SetField = (k, v) => setForm((f) => ({ ...f, [k]: v } as AnyForm))
  const setRows: SetsApi = {
    rows: form.sets || [],
    canAdd: (form.sets || []).length < 3,
    addSet: () => setForm((f) => ({ ...f, sets: [...(f.sets || []), { us: '', them: '' }] })),
    updateSet: (i, key, value) => setForm((f) => ({ ...f, sets: (f.sets || []).map((x, j) => (j === i ? { ...x, [key]: value } : x)) })),
    removeSet: (i) => setForm((f) => ({ ...f, sets: (f.sets || []).filter((_, j) => j !== i) })),
  }
  const closeModal = () => setModal(null)

  // ---------- modal openers ----------
  const openTorneo = (id: string | null) => {
    const t = id ? data.tournaments.find((x) => x.id === id) : null
    const today = new Date().toISOString().slice(0, 10)
    setEditId(id || null)
    setFabOpen(false)
    setForm(t ? { ...t, partnerId: t.partnerId ?? undefined, newPartnerName: '' } : { name: '', date: today, city: '', category: 'Amatoriale', format: '2vs2', surface: 'Sabbia outdoor', placement: 'Gironi', color: '#FF6B35', emoji: '🏖️', partnerId: '', newPartnerName: '' })
    setModal('torneo')
  }
  const openPartita = (tid: string | null) => {
    const T = data.tournaments, P = data.partners
    setEditId(null)
    setFabOpen(false)
    setForm({ tournamentId: tid || (T[0] && T[0].id) || '', partnerId: (P[0] && P[0].id) || 'new', newPartnerName: '', opponents: '', phase: 'Girone', sets: [{ us: '', them: '' }, { us: '', them: '' }], note: '' })
    setModal('partita')
  }
  const openMatch = (id: string) => {
    const m = data.matches.find((x) => x.id === id)
    if (!m) return
    setEditId(id)
    setFabOpen(false)
    setForm({ tournamentId: m.tournamentId, partnerId: m.partnerId, newPartnerName: '', opponents: m.opponents, phase: m.phase, sets: m.sets.map((s) => ({ us: s.us, them: s.them })), note: m.note || '' })
    setModal('partita')
  }
  const openFoto = () => {
    const T = data.tournaments
    setEditId(null)
    setFabOpen(false)
    setForm({ caption: '', tournamentId: (T[0] && T[0].id) || '', color: '#FF6B35' })
    setModal('foto')
  }
  const openCompagno = () => {
    setEditId(null)
    setFabOpen(false)
    setForm({ name: '' })
    setModal('socio')
  }
  const openQuickTorneo = () => {
    const P = data.partners
    const today = new Date().toISOString().slice(0, 10)
    setEditId(null)
    setFabOpen(false)
    setForm({ name: '', partnerId: (P[0] && P[0].id) || 'new', newPartnerName: '', date: today, category: 'Amatoriale', placement: 'In corso' })
    setModal('torneoRapido')
  }

  // ---------- save/delete actions (async: scrivono su Supabase) ----------
  const doSaveTorneo = async () => { if (await saveTorneo(form, editId)) closeModal() }
  const doDeleteTorneo = async () => { await deleteTorneo(editId); setModal(null); setScreen('tornei') }
  const doSavePartita = async () => { if (await savePartita(form, editId)) closeModal() }
  const doDeletePartita = async () => { await deletePartita(editId); closeModal() }
  const doSaveFoto = async () => { if (await saveFoto(form)) closeModal() }
  const doSaveCompagno = async () => { if (await saveCompagno(form)) closeModal() }
  const doSaveQuickTorneo = async () => {
    const id = await quickCreateTorneo(form)
    if (id) { closeModal(); openTorneoDetail(id) }
  }

  // Mostra lo splash mentre si caricano i dati iniziali dal DB.
  if (dataLoading) return <Splash />

  // ---------- derived render data ----------
  const mainPad = wide ? '30px 34px 48px' : '20px 16px 120px'
  const torneoData = screen === 'torneo' && selT ? deriveTorneoDetail(data, selT) : null
  const compagnoData = screen === 'compagno' && selP ? deriveCompagno(data, selP) : null

  const renderScreen = () => {
    switch (screen) {
      case 'tornei':
        return <Tornei list={deriveTorneiList(data, fYear)} onOpenTorneo={openTorneoDetail} onNewTorneo={() => openTorneo(null)} onQuickTorneo={openQuickTorneo} />
      case 'torneo':
        if (!torneoData) return <Tornei list={deriveTorneiList(data, fYear)} onOpenTorneo={openTorneoDetail} onNewTorneo={() => openTorneo(null)} onQuickTorneo={openQuickTorneo} />
        return <TorneoDetail t={torneoData} goBack={() => go('tornei')} onEdit={() => selT && openTorneo(selT)} onAddPartita={() => openPartita(selT)} onOpenMatch={openMatch} />
      case 'compagni':
        return <Compagni compagni={deriveCompagni(data)} onOpenCompagno={openCompagnoDetail} onNewCompagno={openCompagno} />
      case 'compagno':
        if (!compagnoData) return <Compagni compagni={deriveCompagni(data)} onOpenCompagno={openCompagnoDetail} onNewCompagno={openCompagno} />
        return <CompagnoDetail cp={compagnoData} goBack={() => go('compagni')} onOpenMatch={openMatch} />
      case 'galleria':
        return <Galleria gallery={deriveGallery(data)} onNewFoto={openFoto} />
      case 'home':
      default: {
        const dash = deriveDashboard(data, fPartner, fYear)
        return (
          <Home
            s={dash.s}
            recent={dash.recent}
            filters={{ fPartner, fYear, partnerOptions: partnerOptions(data), yearOptions: yearOptions(data), setFPartner, setFYear }}
            onOpenTorneo={openTorneoDetail}
            onQuickTorneo={openQuickTorneo}
            goTornei={() => go('tornei')}
            goCompagni={() => go('compagni')}
          />
        )
      }
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FFF8F0' }}>
      {wide && (
        <Sidebar screen={screen} onNavigate={go} onNewPartita={() => openPartita(null)} onNewTorneo={() => openTorneo(null)} />
      )}

      <main style={{ flex: 1, minWidth: 0, padding: mainPad, maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        {!wide && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF6B35' }} />
              <div style={{ font: "600 15px 'Space Grotesk'", letterSpacing: '-.2px' }}>Beach Diary</div>
            </div>
            <div className="chip" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span style={{ font: "700 12px 'Nunito Sans'", color: 'rgba(27,42,74,.55)' }}>Esci</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 12px 'Space Grotesk'", color: '#fff' }}>{session?.name?.[0]?.toUpperCase() || '?'}</div>
            </div>
          </div>
        )}
        {renderScreen()}
      </main>

      {!wide && (
        <BottomNav
          screen={screen}
          onNavigate={go}
          fabOpen={fabOpen}
          onToggleFab={() => setFabOpen((v) => !v)}
          onNewTorneo={() => openTorneo(null)}
          onNewPartita={() => openPartita(null)}
        />
      )}

      {modal === 'torneo' && (
        <TorneoModal form={form} editId={editId} setField={setField} partnerOptions={partnerOptions(data)} onClose={closeModal} onSave={doSaveTorneo} onDelete={doDeleteTorneo} />
      )}
      {modal === 'partita' && (
        <PartitaModal form={form} editId={editId} setField={setField} tournOptions={tournamentOptions(data)} partnerOptions={partnerOptions(data)} sets={setRows} onClose={closeModal} onSave={doSavePartita} onDelete={doDeletePartita} />
      )}
      {modal === 'foto' && (
        <FotoModal form={form} setField={setField} tournOptions={tournamentOptions(data)} onClose={closeModal} onSave={doSaveFoto} />
      )}
      {modal === 'socio' && (
        <CompagnoModal form={form} setField={setField} onClose={closeModal} onSave={doSaveCompagno} />
      )}
      {modal === 'torneoRapido' && (
        <QuickTorneoModal form={form} setField={setField} partnerOptions={partnerOptions(data)} onClose={closeModal} onSave={doSaveQuickTorneo} />
      )}
    </div>
  )
}
