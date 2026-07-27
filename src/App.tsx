import { useState, useEffect, useMemo, useRef, Suspense, lazy } from "react";
import { AnimatePresence } from "motion/react";
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
  deriveWrapped,
  wrappedRangeForYear,
  makeWrappedRange,
  deriveTorneiListServer,
  deriveCompagniServer,
  deriveTorneoDetailServer,
  deriveCompagnoDetailServer,
  tournamentOptions,
  partnerOptions,
  venueOptions,
  yearOptions,
} from "./lib/derive";
// Mappa delle conquiste: selettore in un modulo suo (si porta dietro il
// gazetteer e il tracciato dell'Italia, ~17 KB grezzi). Vive dentro la
// schermata Tornei come seconda vista, quindi viaggia con lei.
import { deriveMappa } from "./lib/derive.mappa";
import type {
  Screen,
  ModalKind,
  AnyForm,
  SetField,
  SetsApi,
} from "./lib/models";
import type { WrappedRange } from "./lib/derive";
import { permissionsFor } from "./lib/permissions";
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
import ConnectionSnackbar from "./components/ConnectionSnackbar";
import Splash from "./components/Splash";
import { BrandLockup } from "./components/Logo";
import { Avatar } from "./components/ui";
import { track } from "@vercel/analytics";
import Home from "./screens/Home";
import Tornei from "./screens/Tornei";
import type { TorneiVista } from "./screens/Tornei";
import TorneoDetail from "./screens/TorneoDetail";
import Compagni from "./screens/Compagni";
import CompagnoDetail from "./screens/CompagnoDetail";
import Profilo from "./screens/Profilo";
import ChiCeOggi from "./screens/ChiCeOggi";
import { useCheckIn } from "./hooks/useCheckIn";
// Lazy: schermate/modali pesanti caricate solo quando servono (code-splitting).
// CreaChat = wizard AI; StoryModal trascina `html-to-image`.
const Diario = lazy(() => import("./screens/Diario"));
const CreaChat = lazy(() => import("./screens/CreaChat"));
import TorneoModal from "./components/modals/TorneoModal";
import PartitaModal from "./components/modals/PartitaModal";
import FotoModal from "./components/modals/FotoModal";
import CompagnoModal from "./components/modals/CompagnoModal";
import QuickTorneoModal from "./components/modals/QuickTorneoModal";
const StoryModal = lazy(() => import("./components/modals/StoryModal"));
// Beach Wrapped: recap di stagione sfogliabile. Come StoryModal trascina
// `html-to-image`, quindi lazy + Suspense (caricato solo quando lo si apre).
const WrappedModal = lazy(() => import("./components/wrapped/WrappedModal"));

export default function App() {
  const wide = useIsWide();
  const { session, logout } = useAuth();
  const {
    data,
    loading: dataLoading,
    error: diaryError,
    clearError,
    reload,
    saveTorneo,
    quickCreateTorneo,
    createGuidedTorneo,
    deleteTorneo,
    savePartita,
    deletePartita,
    saveFoto,
    deleteFoto,
    saveCompagno,
    deleteCompagno,
    searchUsers,
    linkPartner,
    unlinkPartner,
    mergeVenues,
  } = useDiary();

  // "Chi c'è oggi?": stato del check-in di giornata + stanza live. Tiene i dati
  // transitori fuori da useDiary; il link-up riusa saveCompagno + linkPartner.
  const check = useCheckIn({
    tournaments: data.tournaments,
    venues: data.venues,
    saveCompagno,
    linkPartner,
  });

  const [screen, setScreen] = useState<Screen>("home");
  const [selT, setSelT] = useState<string | null>(null);
  const [selP, setSelP] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [storyT, setStoryT] = useState<string | null>(null);
  // Intervallo del Beach Wrapped: impostato all'apertura (dal filtro stagione) e
  // modificabile dall'utente dentro il modale (range configurabile).
  const [wrappedRange, setWrappedRange] = useState<WrappedRange | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [fPartner, setFPartner] = useState("all");
  const [fYear, setFYear] = useState("Sempre");
  // Lista o mappa dentro la schermata Tornei. Sta qui e non lì perché aprire un
  // torneo dalla mappa cambia `screen` e smonta Tornei: con lo stato locale il
  // ritorno indietro riportava sempre alla lista, buttando via la vista da cui
  // si era partiti.
  const [torneiVista, setTorneiVista] = useState<TorneiVista>("lista");
  const [form, setForm] = useState<AnyForm>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [serverDash, setServerDash] = useState<ServerDashboard | null>(null);
  const [srvTornei, setSrvTornei] = useState<SvTorneiList | null>(null);
  const [srvCompagni, setSrvCompagni] = useState<SvCompagno[] | null>(null);
  const [srvTorneo, setSrvTorneo] = useState<SvTorneoDetail | null>(null);
  const [srvCompagno, setSrvCompagno] = useState<SvCompagnoDetail | null>(null);

  // ---------- permessi in base al piano + conteggi correnti ----------
  // Piani sospesi (limits.PLANS_ENABLED = false): oggi ogni check passa. La
  // struttura resta in piedi per quando torneranno i piani a pagamento.
  // Conteggi per i limiti: solo i propri (i tornei/soci CONDIVISI non contano).
  const perm = permissionsFor(session?.plan, session?.role, {
    tournaments: data.tournaments.filter((t) => !t.shared).length,
    partners: data.partners.filter((p) => !p.shared).length,
  });
  const canFilter = perm.canUseFilters;

  // La mappa lavora sui dati client grezzi: le servono `city` (che i view-model
  // appiattiscono dentro `meta`) e i tornei condivisi, che le RPC escludono.
  // Segue lo stesso filtro stagione della lista, senza aggiungere stato.
  //
  // Sta quassù, e non in fondo con le altre derivate, perché è un hook: sotto il
  // return anticipato dello splash sarebbe una chiamata condizionale. Ed è
  // memoizzata perché è l'unica derivata cara — geocodifica, declustering e le
  // partite città per città — mentre App si ri-renderizza a ogni tasto battuto
  // nei modali, che tengono il form qui. Le dipendenze sono i dati e il filtro:
  // nient'altro può cambiarne il risultato. ("Oggi" viene ricalcolato ad ogni
  // `reload()`, cioè ad ogni cambio schermata e ritorno sulla tab.)
  const mappaData = useMemo(
    () => deriveMappa(data, canFilter ? fYear : "Sempre"),
    [data, canFilter, fYear],
  );
  // Azione non consentita dal piano → messaggio in cima (nessun paywall attivo).
  const denyByPlan = (v: { title?: string; message?: string }) =>
    setNotice(v.message ?? "Funzione non disponibile con il tuo piano.");
  // Un torneo condiviso da un altro utente è di sola lettura: modificabile solo
  // dal creatore (il DB blocca comunque ogni scrittura via RLS).
  const isSharedTorneo = (id: string | null | undefined) =>
    !!id && !!data.tournaments.find((t) => t.id === id)?.shared;
  const denySharedEdit = () =>
    setNotice(
      "Questo torneo è condiviso da un altro utente: solo chi l'ha creato può modificarlo.",
    );
  const banner = notice;
  const dismissBanner = () => setNotice(null);
  // Apre la storia Instagram di un torneo — genera un'immagine 1080×1920 scaricabile.
  const openStory = (id: string) => {
    const v = perm.check("shareStory");
    if (!v.allowed) {
      denyByPlan(v);
      return;
    }
    track("storia_aperta");
    setStoryT(id);
    setFabOpen(false);
    setModal("story");
  };
  // Apre il Beach Wrapped: recap di stagione multi-slide. L'intervallo iniziale
  // segue il filtro stagione della Home (o "Sempre" quando i filtri sono bloccati).
  const openWrapped = () => {
    const v = perm.check("shareStory");
    if (!v.allowed) {
      denyByPlan(v);
      return;
    }
    track("wrapped_aperto");
    setWrappedRange(wrappedRangeForYear(data, canFilter ? fYear : "Sempre"));
    setFabOpen(false);
    setModal("wrapped");
  };

  // Gli errori del DB finiscono nel toast in alto.
  useEffect(() => {
    if (!diaryError) return;
    setNotice(diaryError);
    clearError();
  }, [diaryError, clearError]);

  // I dati client (useDiary) si aggiornano solo dopo una mutazione: qui li
  // ricarichiamo ad ogni cambio schermata e al ritorno sulla tab, così le liste
  // non restano "in cache" quando i dati cambiano (es. tornei condivisi da altri).
  useEffect(() => {
    reload();
  }, [screen, reload]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

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

  // "Chi c'è oggi": ricarica la stanza ogni volta che si apre la schermata
  // (fetch-on-open, Q4). No-op se non sei in check-in; il resto è manuale
  // (pulsante "Aggiorna") o automatico dopo un check-in.
  useEffect(() => {
    if (screen === "oggi") check.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

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
  // Cambio di vista dentro Tornei. L'evento si registra solo sul passaggio alla
  // mappa (come `wrapped_aperto`): serve a sapere se la mappa viene usata, non
  // quante volte si rimbalza fra le due viste.
  const setVistaTornei = (v: TorneiVista) => {
    if (v === "mappa" && torneiVista !== "mappa") track("mappa_aperta");
    setTorneiVista(v);
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
    if (isSharedTorneo(id)) {
      denySharedEdit();
      return;
    }
    if (!id) {
      const v = perm.check("createTournament");
      if (!v.allowed) {
        denyByPlan(v);
        return;
      }
    }
    const t = id ? data.tournaments.find((x) => x.id === id) : null;
    const today = new Date().toISOString().slice(0, 10);
    setEditId(id || null);
    setFabOpen(false);
    setForm(
      t
        ? {
            ...t,
            partnerId: t.partnerId ?? undefined,
            newPartnerName: "",
            venueId: t.venueId ?? "",
            newVenueName: "",
            newVenueCity: "",
            newVenueCoords: "",
          }
        : {
            name: "",
            date: today,
            city: "",
            venueId: "",
            newVenueName: "",
            newVenueCity: "",
            newVenueCoords: "",
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
    if (isSharedTorneo(tid)) {
      denySharedEdit();
      return;
    }
    const own = data.tournaments.filter((t) => !t.shared);
    setEditId(null);
    setFabOpen(false);
    setForm({
      tournamentId: tid || own[0]?.id || "",
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
    if (isSharedTorneo(m.tournamentId)) {
      denySharedEdit();
      return;
    }
    setEditId(id);
    setFabOpen(false);
    setForm({
      tournamentId: m.tournamentId,
      opponents: m.opponents,
      phase: m.phase,
      sets: m.sets.map((s) => ({ us: s.us, them: s.them })),
      note: m.note || "",
    });
    setModal("partita");
  };
  // Aggiunge una foto legata a uno specifico torneo (funzione Premium).
  const openFotoForTorneo = (tid: string) => {
    if (isSharedTorneo(tid)) {
      denySharedEdit();
      return;
    }
    const v = perm.check("uploadPhoto");
    if (!v.allowed) {
      denyByPlan(v);
      return;
    }
    setEditId(null);
    setFabOpen(false);
    setForm({ caption: "", tournamentId: tid, color: "#FF6B35" });
    setModal("foto");
  };
  const openCompagno = () => {
    const v = perm.check("createPartner");
    if (!v.allowed) {
      denyByPlan(v);
      return;
    }
    setEditId(null);
    setFabOpen(false);
    setForm({ name: "" });
    setModal("socio");
  };
  const openQuickTorneo = () => {
    const t = perm.check("createTournament");
    if (!t.allowed) {
      denyByPlan(t);
      return;
    }
    const P = data.partners;
    const today = new Date().toISOString().slice(0, 10);
    setEditId(null);
    setFabOpen(false);
    setForm({
      name: "",
      city: "",
      partnerId: (P[0] && P[0].id) || "new",
      newPartnerName: "",
      venueId: "",
      newVenueName: "",
      newVenueCity: "",
      newVenueCoords: "",
      date: today,
      category: "Amatoriale",
      placement: "In corso",
    });
    setModal("torneoRapido");
  };
  // Apre l'assistente guidato in stile chat (creazione conversazionale del torneo).
  // Funzione Premium: i piani base vedono la bottom-sheet di upgrade.
  const openCrea = () => {
    const ai = perm.check("useAiAssistant");
    if (!ai.allowed) {
      denyByPlan(ai);
      return;
    }
    const t = perm.check("createTournament");
    if (!t.allowed) {
      denyByPlan(t);
      return;
    }
    setFabOpen(false);
    setModal(null);
    setScreen("crea");
    scrollTop();
  };

  // ---------- save/delete actions (async: scrivono su Supabase) ----------
  const doSaveTorneo = async () => {
    if (await saveTorneo(form, editId)) {
      if (editId) track("torneo_modificato");
      else track("torneo_creato", { via: "completo" });
      closeModal();
    }
  };
  const doDeleteTorneo = async () => {
    if (await deleteTorneo(editId)) track("torneo_eliminato");
    setModal(null);
    setScreen("tornei");
  };
  const doSavePartita = async () => {
    if (await savePartita(form, editId)) {
      if (editId) track("partita_modificata");
      else track("partita_aggiunta");
      closeModal();
    }
  };
  const doDeletePartita = async () => {
    if (await deletePartita(editId)) track("partita_eliminata");
    closeModal();
  };
  const doSaveFoto = async (file: File | null) => {
    if (await saveFoto(form, file)) {
      track("foto_aggiunta");
      closeModal();
    }
  };
  const doDeleteFoto = async (photoId: string) => {
    if (await deleteFoto(photoId)) track("foto_eliminata");
  };
  const doLinkPartner = async (userId: string) => {
    const r = await linkPartner(selP as string, userId);
    if (r.ok) track("socio_collegato");
    return r;
  };
  const doUnlinkPartner = async () => {
    if (selP && (await unlinkPartner(selP))) track("socio_scollegato");
  };
  const doDeleteCompagno = async () => {
    if (selP && (await deleteCompagno(selP))) {
      track("socio_eliminato");
      go("compagni");
    }
  };
  const doSaveCompagno = async () => {
    if (await saveCompagno(form)) {
      track("socio_creato");
      closeModal();
    }
  };
  const doSaveQuickTorneo = async () => {
    const id = await quickCreateTorneo(form);
    if (id) {
      track("torneo_creato", { via: "rapido" });
      closeModal();
      openTorneoDetail(id);
    }
  };

  // Mostra lo splash mentre si caricano i dati iniziali dal DB.
  if (dataLoading) return <Splash />;

  // ---------- derived render data ----------
  const mainPad = wide ? "30px 34px 48px" : "20px 16px 120px";
  // L'assistente chat occupa tutto lo schermo con scroll interno: niente
  // padding/top-bar/bottom-nav e pagina bloccata (scorre solo la chat).
  const isCrea = screen === "crea";
  // Con tornei condivisi presenti, usiamo il calcolo client (che li include);
  // le RPC server restano scoped al proprio user_id.
  const hasShared = data.tournaments.some((t) => t.shared);
  const torneiList =
    srvTornei && !hasShared
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
  const wrappedData =
    modal === "wrapped" && wrappedRange
      ? deriveWrapped(data, wrappedRange, canFilter ? fPartner : "all")
      : null;

  // La schermata Tornei è anche il fallback di `torneo` finché il dettaglio non
  // è pronto: un elemento solo, così le due strade non possono divergere nei
  // prop (la vista lista/mappa in particolare deve essere la stessa).
  const torneiScreen = (
    <Tornei
      list={torneiList}
      mappa={mappaData}
      vista={torneiVista}
      onVista={setVistaTornei}
      onOpenTorneo={openTorneoDetail}
      onNewTorneo={() => openTorneo(null)}
      onQuickTorneo={openQuickTorneo}
      onAssistant={openCrea}
      canAssistant={perm.canUseAi}
    />
  );

  const renderScreen = () => {
    switch (screen) {
      case "tornei":
        return torneiScreen;
      case "torneo":
        if (!torneoData) return torneiScreen;
        return (
          <TorneoDetail
            t={torneoData}
            goBack={() => go("tornei")}
            onEdit={() => selT && openTorneo(selT)}
            onAddPartita={() => openPartita(selT)}
            onOpenMatch={openMatch}
            onAddFoto={() => selT && openFotoForTorneo(selT)}
            onDeleteFoto={doDeleteFoto}
            canAddFoto={perm.canUploadPhoto}
            onShareStory={() => selT && openStory(selT)}
            canShareStory={perm.canShareStory}
            readOnly={torneoData.shared}
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
            linked={
              data.partners.find((p) => p.id === selP)?.linkedUserId != null
            }
            onSearchUsers={searchUsers}
            onLink={doLinkPartner}
            onUnlink={doUnlinkPartner}
            onDelete={doDeleteCompagno}
          />
        );
      case "diario":
        return (
          <Diario
            entries={deriveDiary(data)}
            onOpenTorneo={openTorneoDetail}
            onInstagramStory={openStory}
            onNewTorneo={() => openTorneo(null)}
          />
        );
      case "oggi":
        return (
          <ChiCeOggi
            own={check.own}
            room={check.room}
            loading={check.loading}
            cityPrefill={check.cityPrefill}
            onCheckIn={check.checkIn}
            onCheckOut={check.checkOut}
            onRefresh={check.refresh}
            onAddPartner={check.addAsPartner}
          />
        );
      case "profilo":
        return <Profilo session={session!} onLogout={logout} />;
      case "crea":
        return (
          <CreaChat
            wide={wide}
            partners={partnerOptions(data)}
            venues={venueOptions(data)}
            onCreate={async (f, matches) => {
              const id = await createGuidedTorneo(f, matches);
              if (id) {
                track("assistente_ai_usato");
                track("torneo_creato", { via: "assistente" });
              }
              return id;
            }}
            onDone={openTorneoDetail}
            onExit={() => go("tornei")}
          />
        );
      case "home":
      default: {
        const dash =
          serverDash && !hasShared
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
                denyByPlan({
                  message:
                    "I filtri per compagno e anno non sono disponibili con il tuo piano.",
                }),
            }}
            onOpenTorneo={openTorneoDetail}
            onQuickTorneo={openQuickTorneo}
            onAiCreate={openCrea}
            canAiCreate={perm.canUseAi}
            onOpenWrapped={openWrapped}
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
        height: isCrea ? "100dvh" : wide ? "100vh" : undefined,
        minHeight: isCrea ? undefined : wide ? undefined : "100vh",
        overflow: isCrea || wide ? "hidden" : undefined,
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
          onAssistant={openCrea}
          canAssistant={perm.canUseAi}
        />
      )}

      <main
        ref={mainRef}
        style={{
          flex: 1,
          minWidth: 0,
          padding: isCrea ? 0 : mainPad,
          maxWidth: isCrea ? "none" : 1120,
          margin: isCrea ? 0 : "0 auto",
          width: "100%",
          height: wide ? "100vh" : isCrea ? "100dvh" : undefined,
          overflowY: isCrea ? "hidden" : wide ? "auto" : undefined,
          display: isCrea ? "flex" : undefined,
          flexDirection: isCrea ? "column" : undefined,
        }}
      >
        {!wide && !isCrea && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <BrandLockup size={30} textSize={15} gap={9} />
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
              <Avatar
                initial={session?.name?.[0]?.toUpperCase() || "?"}
                size={28}
                font={12}
                uri={session?.avatarUrl}
              />
            </div>
          </div>
        )}
        <Suspense fallback={<div style={{ padding: 24 }} />}>
          {renderScreen()}
        </Suspense>
      </main>

      {!wide && !isCrea && (
        <BottomNav
          screen={screen}
          onNavigate={go}
          fabOpen={fabOpen}
          onToggleFab={() => setFabOpen((v) => !v)}
          onNewTorneo={() => openTorneo(null)}
          onNewPartita={() => openPartita(null)}
          onAssistant={openCrea}
          canAssistant={perm.canUseAi}
        />
      )}

      {/* I bottom-sheet vivono dentro `AnimatePresence` per un motivo solo:
          senza, React li smonta all'istante e l'uscita non esiste. Entravano
          animati e sparivano di colpo. Story e Wrapped restano fuori: sono
          visori a schermo intero, non usano `Sheet` e non hanno un'uscita da
          animare. */}
      <AnimatePresence>
        {modal === "torneo" && (
        <TorneoModal
          key="torneo"
          form={form}
          editId={editId}
          setField={setField}
          partnerOptions={partnerOptions(data)}
          canAddPartner={perm.canCreatePartner}
          venues={data.venues}
          onMergeVenues={mergeVenues}
          onClose={closeModal}
          onSave={doSaveTorneo}
          onDelete={doDeleteTorneo}
        />
      )}
      {modal === "partita" && (
        <PartitaModal
          key="partita"
          form={form}
          editId={editId}
          setField={setField}
          tournOptions={tournamentOptions(data)}
          sets={setRows}
          onClose={closeModal}
          onSave={doSavePartita}
          onDelete={doDeletePartita}
        />
      )}
      {modal === "foto" && (
        <FotoModal
          key="foto"
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
          key="socio"
          form={form}
          setField={setField}
          onClose={closeModal}
          onSave={doSaveCompagno}
        />
      )}
      {modal === "torneoRapido" && (
        <QuickTorneoModal
          key="torneoRapido"
          form={form}
          setField={setField}
          partnerOptions={partnerOptions(data)}
          canAddPartner={perm.canCreatePartner}
          venues={data.venues}
          onClose={closeModal}
          onSave={doSaveQuickTorneo}
        />
        )}
      </AnimatePresence>

      {modal === "story" && storyData && (
        <Suspense fallback={null}>
          <StoryModal
            story={storyData}
            onClose={closeModal}
            onNotice={setNotice}
          />
        </Suspense>
      )}
      {modal === "wrapped" && wrappedData && (
        <Suspense fallback={null}>
          <WrappedModal
            wrapped={wrappedData}
            onClose={closeModal}
            onNotice={setNotice}
            onRangeChange={(from, to) => setWrappedRange(makeWrappedRange(from, to))}
          />
        </Suspense>
      )}
      {/* Avviso momentaneo quando la connessione internet non è ottimale. */}
      <ConnectionSnackbar />
    </div>
  );
}
