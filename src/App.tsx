import { useState, useEffect, useRef } from "react";
import { useDiary } from "./hooks/useDiary";
import { useIsWide } from "./hooks/useMedia";
import { useAuth } from "./hooks/useAuth";
import {
  deriveDashboard,
  deriveDashboardServer,
  deriveTorneiList,
  deriveTorneoDetail,
  deriveCompagni,
  deriveCompagno,
  deriveDiary,
  deriveStory,
  deriveTorneiListServer,
  deriveCompagniServer,
  deriveTorneoDetailServer,
  deriveCompagnoDetailServer,
  tournamentOptions,
  partnerOptions,
  yearOptions,
} from "./lib/derive";
import type {
  Screen,
  ModalKind,
  AnyForm,
  SetField,
  SetsApi,
} from "./lib/models";
import { entitlements } from "./lib/limits";
import { getDashboardStats } from "./lib/dashboard";
import type { ServerDashboard } from "./lib/dashboard";
import {
  getTorneiList,
  getCompagniList,
  getTorneoDetail,
  getCompagnoDetail,
} from "./lib/serverviews";
import type {
  SvTorneiList,
  SvCompagno,
  SvTorneoDetail,
  SvCompagnoDetail,
} from "./lib/serverviews";

import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import Splash from "./components/Splash";
import Home from "./screens/Home";
import Tornei from "./screens/Tornei";
import TorneoDetail from "./screens/TorneoDetail";
import Compagni from "./screens/Compagni";
import CompagnoDetail from "./screens/CompagnoDetail";
import Diario from "./screens/Diario";
import Profilo from "./screens/Profilo";
import TorneoModal from "./components/modals/TorneoModal";
import PartitaModal from "./components/modals/PartitaModal";
import FotoModal from "./components/modals/FotoModal";
import CompagnoModal from "./components/modals/CompagnoModal";
import QuickTorneoModal from "./components/modals/QuickTorneoModal";
import UpgradeSheet from "./components/modals/UpgradeSheet";
import StoryModal from "./components/modals/StoryModal";

export default function App() {
  const wide = useIsWide();
  const { session, logout } = useAuth();
  const {
    data,
    loading: dataLoading,
    error: diaryError,
    clearError,
    saveTorneo,
    quickCreateTorneo,
    deleteTorneo,
    savePartita,
    deletePartita,
    saveFoto,
    saveCompagno,
  } = useDiary();

  const [screen, setScreen] = useState<Screen>("home");
  const [selT, setSelT] = useState<string | null>(null);
  const [selP, setSelP] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [storyT, setStoryT] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [fPartner, setFPartner] = useState("all");
  const [fYear, setFYear] = useState("Sempre");
  const [form, setForm] = useState<AnyForm>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<{
    title?: string;
    message: string;
  } | null>(null);
  const [serverDash, setServerDash] = useState<ServerDashboard | null>(null);
  const [srvTornei, setSrvTornei] = useState<SvTorneiList | null>(null);
  const [srvCompagni, setSrvCompagni] = useState<SvCompagno[] | null>(null);
  const [srvTorneo, setSrvTorneo] = useState<SvTorneoDetail | null>(null);
  const [srvCompagno, setSrvCompagno] = useState<SvCompagnoDetail | null>(null);

  // ---------- plan entitlements ----------
  const ent = entitlements(session?.plan, session?.role);
  const tLimit = ent.tournaments;
  const pLimit = ent.partners;
  const canAddTorneo = data.tournaments.length < tLimit;
  const canAddPartner = data.partners.length < pLimit;
  const canFilter = ent.dashboardFilters;
  const banner = notice;
  const dismissBanner = () => setNotice(null);
  const onUpgrade = () => {
    setUpgrade(null);
    setNotice(
      "Acquisto Premium in arrivo — l’integrazione dei pagamenti sarà disponibile a breve.",
    );
  };
  // Apre la storia Instagram di un torneo — genera un'immagine 1080×1920 scaricabile
  // (funzione Premium).
  const openStory = (id: string) => {
    if (!ent.diary) {
      setUpgrade({
        title: "Funzione Premium",
        message:
          "La condivisione della storia è disponibile con il piano Premium.",
      });
      return;
    }
    setStoryT(id);
    setFabOpen(false);
    setModal("story");
  };

  // Instrada gli errori del DB: i limiti di piano aprono la bottom-sheet di
  // upgrade, gli altri errori restano nel toast in alto.
  useEffect(() => {
    if (!diaryError) return;
    if (diaryError.toLowerCase().includes("piano base"))
      setUpgrade({ message: diaryError });
    else setNotice(diaryError);
    clearError();
  }, [diaryError, clearError]);

  // Dashboard aggregata dal server (gating per piano autoritativo).
  // Fallback al calcolo client mentre carica / in caso di errore.
  useEffect(() => {
    if (screen !== "home") return;
    let alive = true;
    setServerDash(null);
    getDashboardStats(fPartner, fYear).then((s) => {
      if (alive) setServerDash(s);
    });
    return () => {
      alive = false;
    };
  }, [screen, fPartner, fYear, data]);

  // Aggregazioni server per gli altri screen (fallback client mentre caricano).
  useEffect(() => {
    if (screen !== "tornei" && screen !== "torneo") return;
    let alive = true;
    getTorneiList().then((r) => {
      if (alive) setSrvTornei(r);
    });
    return () => {
      alive = false;
    };
  }, [screen, data]);
  useEffect(() => {
    if (screen !== "compagni" && screen !== "compagno") return;
    let alive = true;
    getCompagniList().then((r) => {
      if (alive) setSrvCompagni(r);
    });
    return () => {
      alive = false;
    };
  }, [screen, data]);
  useEffect(() => {
    if (screen !== "torneo" || !selT) {
      setSrvTorneo(null);
      return;
    }
    let alive = true;
    setSrvTorneo(null);
    getTorneoDetail(selT).then((r) => {
      if (alive) setSrvTorneo(r);
    });
    return () => {
      alive = false;
    };
  }, [screen, selT, data]);
  useEffect(() => {
    if (screen !== "compagno" || !selP) {
      setSrvCompagno(null);
      return;
    }
    let alive = true;
    setSrvCompagno(null);
    getCompagnoDetail(selP).then((r) => {
      if (alive) setSrvCompagno(r);
    });
    return () => {
      alive = false;
    };
  }, [screen, selP, data]);

  // Su desktop scrolla il <main>; su mobile la pagina. Reset ad ogni navigazione.
  const mainRef = useRef<HTMLElement>(null);
  const scrollTop = () => {
    try {
      mainRef.current?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
  };

  // ---------- navigation ----------
  const go = (s: Screen) => {
    setScreen(s);
    setFabOpen(false);
    scrollTop();
  };
  const openTorneoDetail = (id: string) => {
    setSelT(id);
    setScreen("torneo");
    setFabOpen(false);
    scrollTop();
  };
  const openCompagnoDetail = (id: string) => {
    setSelP(id);
    setScreen("compagno");
    setFabOpen(false);
    scrollTop();
  };

  // ---------- form helpers ----------
  const setField: SetField = (k, v) =>
    setForm((f) => ({ ...f, [k]: v }) as AnyForm);
  const setRows: SetsApi = {
    rows: form.sets || [],
    canAdd: (form.sets || []).length < 3,
    addSet: () =>
      setForm((f) => ({
        ...f,
        sets: [...(f.sets || []), { us: "", them: "" }],
      })),
    updateSet: (i, key, value) =>
      setForm((f) => ({
        ...f,
        sets: (f.sets || []).map((x, j) =>
          j === i ? { ...x, [key]: value } : x,
        ),
      })),
    removeSet: (i) =>
      setForm((f) => ({
        ...f,
        sets: (f.sets || []).filter((_, j) => j !== i),
      })),
  };
  const closeModal = () => setModal(null);

  // ---------- modal openers ----------
  const openTorneo = (id: string | null) => {
    if (!id && !canAddTorneo) {
      setUpgrade({
        message: `Piano base: hai raggiunto il limite di ${tLimit} tornei.`,
      });
      return;
    }
    const t = id ? data.tournaments.find((x) => x.id === id) : null;
    const today = new Date().toISOString().slice(0, 10);
    setEditId(id || null);
    setFabOpen(false);
    setForm(
      t
        ? { ...t, partnerId: t.partnerId ?? undefined, newPartnerName: "" }
        : {
            name: "",
            date: today,
            city: "",
            category: "Amatoriale",
            format: "2vs2",
            surface: "Sabbia outdoor",
            placement: "Gironi",
            color: "#FF6B35",
            emoji: "🏖️",
            partnerId: "",
            newPartnerName: "",
          },
    );
    setModal("torneo");
  };
  const openPartita = (tid: string | null) => {
    const T = data.tournaments,
      P = data.partners;
    setEditId(null);
    setFabOpen(false);
    setForm({
      tournamentId: tid || (T[0] && T[0].id) || "",
      partnerId: (P[0] && P[0].id) || "new",
      newPartnerName: "",
      opponents: "",
      phase: "Girone",
      sets: [
        { us: "", them: "" },
        { us: "", them: "" },
      ],
      note: "",
    });
    setModal("partita");
  };
  const openMatch = (id: string) => {
    const m = data.matches.find((x) => x.id === id);
    if (!m) return;
    setEditId(id);
    setFabOpen(false);
    setForm({
      tournamentId: m.tournamentId,
      partnerId: m.partnerId,
      newPartnerName: "",
      opponents: m.opponents,
      phase: m.phase,
      sets: m.sets.map((s) => ({ us: s.us, them: s.them })),
      note: m.note || "",
    });
    setModal("partita");
  };
  // Aggiunge una foto legata a uno specifico torneo (funzione Premium).
  const openFotoForTorneo = (tid: string) => {
    if (!ent.tournamentPhotos) {
      setUpgrade({
        title: "Funzione Premium",
        message: "Le foto nei tornei sono disponibili con il piano Premium.",
      });
      return;
    }
    setEditId(null);
    setFabOpen(false);
    setForm({ caption: "", tournamentId: tid, color: "#FF6B35" });
    setModal("foto");
  };
  const openCompagno = () => {
    if (!canAddPartner) {
      setUpgrade({
        message: `Piano base: hai raggiunto il limite di ${pLimit} compagni.`,
      });
      return;
    }
    setEditId(null);
    setFabOpen(false);
    setForm({ name: "" });
    setModal("socio");
  };
  const openQuickTorneo = () => {
    if (!canAddTorneo) {
      setUpgrade({
        message: `Piano base: hai raggiunto il limite di ${tLimit} tornei.`,
      });
      return;
    }
    const P = data.partners;
    const today = new Date().toISOString().slice(0, 10);
    setEditId(null);
    setFabOpen(false);
    setForm({
      name: "",
      partnerId: (P[0] && P[0].id) || "new",
      newPartnerName: "",
      date: today,
      category: "Amatoriale",
      placement: "In corso",
    });
    setModal("torneoRapido");
  };

  // ---------- save/delete actions (async: scrivono su Supabase) ----------
  const doSaveTorneo = async () => {
    if (await saveTorneo(form, editId)) closeModal();
  };
  const doDeleteTorneo = async () => {
    await deleteTorneo(editId);
    setModal(null);
    setScreen("tornei");
  };
  const doSavePartita = async () => {
    if (await savePartita(form, editId)) closeModal();
  };
  const doDeletePartita = async () => {
    await deletePartita(editId);
    closeModal();
  };
  const doSaveFoto = async (file: File | null) => {
    if (await saveFoto(form, file)) closeModal();
  };
  const doSaveCompagno = async () => {
    if (await saveCompagno(form)) closeModal();
  };
  const doSaveQuickTorneo = async () => {
    const id = await quickCreateTorneo(form);
    if (id) {
      closeModal();
      openTorneoDetail(id);
    }
  };

  // Mostra lo splash mentre si caricano i dati iniziali dal DB.
  if (dataLoading) return <Splash />;

  // ---------- derived render data ----------
  const mainPad = wide ? "30px 34px 48px" : "20px 16px 120px";
  const torneiList = srvTornei
    ? deriveTorneiListServer(srvTornei)
    : deriveTorneiList(data, fYear);
  const compagniList = srvCompagni
    ? deriveCompagniServer(srvCompagni)
    : deriveCompagni(data);
  const torneoData =
    screen === "torneo"
      ? srvTorneo
        ? deriveTorneoDetailServer(srvTorneo, data)
        : selT
          ? deriveTorneoDetail(data, selT)
          : null
      : null;
  const compagnoData =
    screen === "compagno"
      ? srvCompagno
        ? deriveCompagnoDetailServer(srvCompagno)
        : selP
          ? deriveCompagno(data, selP)
          : null
      : null;
  const storyData =
    modal === "story" && storyT ? deriveStory(data, storyT) : null;

  const renderScreen = () => {
    switch (screen) {
      case "tornei":
        return (
          <Tornei
            list={torneiList}
            onOpenTorneo={openTorneoDetail}
            onNewTorneo={() => openTorneo(null)}
            onQuickTorneo={openQuickTorneo}
          />
        );
      case "torneo":
        if (!torneoData)
          return (
            <Tornei
              list={torneiList}
              onOpenTorneo={openTorneoDetail}
              onNewTorneo={() => openTorneo(null)}
              onQuickTorneo={openQuickTorneo}
            />
          );
        return (
          <TorneoDetail
            t={torneoData}
            goBack={() => go("tornei")}
            onEdit={() => selT && openTorneo(selT)}
            onAddPartita={() => openPartita(selT)}
            onOpenMatch={openMatch}
            onAddFoto={() => selT && openFotoForTorneo(selT)}
            canAddFoto={ent.tournamentPhotos}
            onShareStory={() => selT && openStory(selT)}
            canShareStory={ent.diary}
          />
        );
      case "compagni":
        return (
          <Compagni
            compagni={compagniList}
            onOpenCompagno={openCompagnoDetail}
            onNewCompagno={openCompagno}
          />
        );
      case "compagno":
        if (!compagnoData)
          return (
            <Compagni
              compagni={compagniList}
              onOpenCompagno={openCompagnoDetail}
              onNewCompagno={openCompagno}
            />
          );
        return (
          <CompagnoDetail
            cp={compagnoData}
            goBack={() => go("compagni")}
            onOpenMatch={openMatch}
          />
        );
      case "diario":
        return (
          <Diario
            entries={deriveDiary(data)}
            locked={!ent.diary}
            onOpenTorneo={openTorneoDetail}
            onInstagramStory={openStory}
            onUpgrade={onUpgrade}
            onNewTorneo={() => openTorneo(null)}
          />
        );
      case "profilo":
        return (
          <Profilo session={session!} onUpgrade={onUpgrade} onLogout={logout} />
        );
      case "home":
      default: {
        const dash = serverDash
          ? deriveDashboardServer(
              serverDash,
              data,
              canFilter ? fPartner : "all",
              canFilter ? fYear : "Sempre",
            )
          : deriveDashboard(
              data,
              canFilter ? fPartner : "all",
              canFilter ? fYear : "Sempre",
            );
        return (
          <Home
            s={dash.s}
            recent={dash.recent}
            filters={{
              fPartner,
              fYear,
              partnerOptions: partnerOptions(data),
              yearOptions: yearOptions(data),
              setFPartner,
              setFYear,
              canFilter,
              onLockedFilter: () =>
                setUpgrade({
                  title: "Funzione Premium",
                  message:
                    "I filtri per compagno e anno sono disponibili con il piano Premium.",
                }),
            }}
            onOpenTorneo={openTorneoDetail}
            onQuickTorneo={openQuickTorneo}
            goTornei={() => go("tornei")}
            goCompagni={() => go("compagni")}
          />
        );
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: wide ? "100vh" : undefined,
        minHeight: wide ? undefined : "100vh",
        overflow: wide ? "hidden" : undefined,
        background: "#FFF8F0",
      }}
    >
      {banner && (
        <div
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 80,
            maxWidth: "min(92vw, 470px)",
            background: "#1B2A4A",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 12,
            boxShadow: "0 12px 30px -8px rgba(27,42,74,.55)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            font: "700 13px 'Nunito Sans'",
          }}
        >
          <span style={{ flex: 1, lineHeight: 1.35 }}>{banner}</span>
          <span
            onClick={dismissBanner}
            style={{
              cursor: "pointer",
              opacity: 0.7,
              fontSize: 18,
              lineHeight: 1,
              flex: "none",
            }}
          >
            ×
          </span>
        </div>
      )}
      {wide && (
        <Sidebar
          screen={screen}
          onNavigate={go}
          onNewPartita={() => openPartita(null)}
          onNewTorneo={() => openTorneo(null)}
        />
      )}

      <main
        ref={mainRef}
        style={{
          flex: 1,
          minWidth: 0,
          padding: mainPad,
          maxWidth: 1120,
          margin: "0 auto",
          width: "100%",
          height: wide ? "100vh" : undefined,
          overflowY: wide ? "auto" : undefined,
        }}
      >
        {!wide && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#FF6B35",
                }}
              />
              <div
                style={{
                  font: "600 15px 'Space Grotesk'",
                  letterSpacing: "-.2px",
                }}
              >
                Beach Diary
              </div>
            </div>
            <div
              className="chip"
              onClick={() => go("profilo")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  font: "700 12px 'Nunito Sans'",
                  color: "rgba(27,42,74,.55)",
                }}
              >
                Profilo
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#1B2A4A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: "600 12px 'Space Grotesk'",
                  color: "#fff",
                }}
              >
                {session?.name?.[0]?.toUpperCase() || "?"}
              </div>
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

      {modal === "torneo" && (
        <TorneoModal
          form={form}
          editId={editId}
          setField={setField}
          partnerOptions={partnerOptions(data)}
          onClose={closeModal}
          onSave={doSaveTorneo}
          onDelete={doDeleteTorneo}
        />
      )}
      {modal === "partita" && (
        <PartitaModal
          form={form}
          editId={editId}
          setField={setField}
          tournOptions={tournamentOptions(data)}
          partnerOptions={partnerOptions(data)}
          sets={setRows}
          onClose={closeModal}
          onSave={doSavePartita}
          onDelete={doDeletePartita}
        />
      )}
      {modal === "foto" && (
        <FotoModal
          form={form}
          setField={setField}
          tournOptions={tournamentOptions(data)}
          onClose={closeModal}
          onSave={doSaveFoto}
          lockTournamentName={
            data.tournaments.find((t) => t.id === form.tournamentId)?.name
          }
        />
      )}
      {modal === "socio" && (
        <CompagnoModal
          form={form}
          setField={setField}
          onClose={closeModal}
          onSave={doSaveCompagno}
        />
      )}
      {modal === "torneoRapido" && (
        <QuickTorneoModal
          form={form}
          setField={setField}
          partnerOptions={partnerOptions(data)}
          onClose={closeModal}
          onSave={doSaveQuickTorneo}
        />
      )}
      {modal === "story" && storyData && (
        <StoryModal
          story={storyData}
          onClose={closeModal}
          onNotice={setNotice}
        />
      )}
      {upgrade && (
        <UpgradeSheet
          title={upgrade.title}
          message={upgrade.message}
          onUpgrade={onUpgrade}
          onSeePlans={() => {
            setUpgrade(null);
            go("profilo");
          }}
          onClose={() => setUpgrade(null)}
        />
      )}
    </div>
  );
}
