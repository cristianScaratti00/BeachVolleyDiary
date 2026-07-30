import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { Screen } from "../lib/models";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import NavIcon from "./NavIcons";
import { MOLLA, SVELTO, ENTRATA } from "./Motion";

// ============================================================================
// Barra di navigazione mobile.
//
// Il "+" non apre più bottoni flottanti sopra la barra: è la BARRA a crescere
// in altezza e a contenere le azioni, ognuna larga quanto lei.
//
// Perché il cambio. Lo speed-dial faceva comparire tre bolle a mezz'aria,
// ancorate a niente: sembravano appartenere alla pagina sotto invece che al
// pulsante premuto, e su schermi corti finivano sopra il contenuto che si stava
// guardando. Crescendo, invece, la barra resta un oggetto solo — quello che si
// è toccato è quello che si apre — e le azioni diventano bersagli larghi quanto
// il pollice, invece di pillole centrate da prendere di mira.
// ============================================================================

// Slot della barra: 4 voci di navigazione + l'azione centrale "Crea".
type Slot = { kind: "nav"; key: Screen } | { kind: "action" };

const SLOTS: Slot[] = [
  { kind: "nav", key: "home" },
  { kind: "nav", key: "tornei" },
  // { kind: "nav", key: "oggi" },
  { kind: "action" },
  { kind: "nav", key: "compagni" },
  { kind: "nav", key: "diario" },
];

// Le icone da sole non hanno nome accessibile: senza queste etichette uno
// screen reader annuncia cinque "pulsante" indistinguibili.
const NAV_LABEL: Partial<Record<Screen, string>> = {
  home: "Home",
  tornei: "Tornei",
  oggi: "Chi c'è oggi",
  compagni: "Compagni",
  diario: "Diario",
};

const NAVY = "#1B2A4A";

// Le CTA non compaiono tutte insieme: salgono in sequenza dal basso.
//
// `staggerDirection: -1` parte dall'ULTIMA voce del DOM — "Nuova partita", la
// più in basso, quella attaccata al + che è stato appena premuto. Le voci
// sembrano allora uscire DAL pulsante e salire; nell'ordine naturale
// sembrerebbero cadere dall'alto senza un motivo.
const ELENCO = {
  chiuso: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
  // `delayChildren`: prima il contenitore si allunga, poi arrivano le voci.
  // Partendo insieme, le CTA si vedevano scorrere dentro un pannello ancora
  // mezzo chiuso.
  aperto: { transition: { staggerChildren: 0.045, staggerDirection: -1, delayChildren: 0.07 } },
};

const VOCE = {
  chiuso: { opacity: 0, y: 14 },
  aperto: { opacity: 1, y: 0 },
};

// Le azioni sono dati, non markup ripetuto: cambiarne una o l'ordine è una riga.
type Tono = "accent" | "dark" | "light";

const TONI: Record<Tono, CSSProperties> = {
  accent: { background: "linear-gradient(135deg,#FF6B35,#FF9558)", color: "#fff" },
  dark: { background: NAVY, color: "#fff" },
  light: { background: "#F2F0EC", color: NAVY },
};

interface BottomNavProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  fabOpen: boolean;
  onToggleFab: () => void;
  onNewTorneo: () => void;
  onQuickTorneo: () => void;
  onNewPartita: () => void;
  onAssistant: () => void;
  canAssistant: boolean;
}

export default function BottomNav({
  screen,
  onNavigate,
  fabOpen,
  onToggleFab,
  onNewTorneo,
  onQuickTorneo,
  onNewPartita,
  onAssistant,
  canAssistant,
}: BottomNavProps) {
  // Esc chiude, come per ogni pannello che copre il contenuto.
  useEffect(() => {
    if (!fabOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleFab();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fabOpen, onToggleFab]);

  // Chi chiama chiude da sé (`setFabOpen(false)` sta dentro ogni opener di App):
  // qui non si tocca lo stato, o si chiuderebbe due volte.
  const azioni: { key: string; label: string; onClick: () => void; tono: Tono; premium?: boolean }[] = [
    { key: "assistente", label: "✨ Crea con l'assistente", onClick: onAssistant, tono: "accent", premium: !canAssistant },
    { key: "torneo", label: "＋ Nuovo torneo", onClick: onNewTorneo, tono: "dark" },
    { key: "rapido", label: "⚡ Torneo rapido", onClick: onQuickTorneo, tono: "light" },
    { key: "partita", label: "🏐 Nuova partita", onClick: onNewPartita, tono: "light" },
  ];

  return (
    <>
      {/* Velo: chiude toccando fuori e stacca il pannello dal contenuto. Sta
          sotto la barra (z 39 contro 40), così la barra resta illuminata. */}
      <AnimatePresence>
        {fabOpen && (
          <m.div
            key="velo"
            onClick={onToggleFab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SVELTO}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(27,42,74,.3)",
              backdropFilter: "blur(2px)",
              zIndex: 39,
            }}
          />
        )}
      </AnimatePresence>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 18,
          display: "flex",
          justifyContent: "center",
          zIndex: 40,
          pointerEvents: "none",
          padding: "0 16px",
        }}
      >
        {/* ⚠️ Il raggio NON si anima, ed è la correzione di un difetto vero.
            Il CSS limita `border-radius` a metà del lato più corto: a barra
            chiusa (60px di altezza) un raggio di 999 vale 30, ma mentre
            l'altezza cresce quel limite si alza, e un valore ancora grande a
            metà transizione faceva GONFIARE gli angoli prima di stringersi.
            Il risultato era una barra che si arrotondava a bolla e poi
            rientrava.
            Con un raggio COSTANTE di 30 il problema sparisce da solo e i due
            stati vengono gratis: a 60px di altezza 30 è esattamente metà, cioè
            una pillola; a pannello aperto lo stesso 30 è una card arrotondata.
            Niente da interpolare, niente da sbagliare.

            E niente `layout`: anima interpolando una SCALA, e un raggio sotto
            scala diventa un'ellisse — era il difetto di prima. */}
        <m.div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRadius: 30,
            padding: 7,
            boxShadow:
              "0 14px 34px -10px rgba(27,42,74,.28), 0 2px 8px -2px rgba(27,42,74,.12)",
            pointerEvents: "auto",
            // Larghezza FISSA nei due stati: passando da "auto" a 420px la
            // barra saltava di lato mentre cresceva. Ora si allunga e basta —
            // e siccome è ancorata in basso (`bottom: 18`), si allunga verso
            // l'alto, che è il movimento voluto.
            width: "min(420px, 100%)",
          }}
        >
          <AnimatePresence initial={false}>
            {fabOpen && (
              <m.div
                key="azioni"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={ENTRATA}
                // `overflow: hidden` è ciò che fa "srotolare" il pannello:
                // l'altezza cresce e il contenuto viene scoperto, invece di
                // schiacciarsi.
                style={{ overflow: "hidden", width: "100%" }}
              >
                <m.div
                  role="menu"
                  aria-label="Cosa vuoi creare"
                  variants={ELENCO}
                  initial="chiuso"
                  animate="aperto"
                  exit="chiuso"
                  style={{ display: "flex", flexDirection: "column", gap: 8, padding: "5px 5px 12px" }}
                >
                  {azioni.map((a) => (
                    <m.button
                      key={a.key}
                      type="button"
                      role="menuitem"
                      className="chip"
                      onClick={a.onClick}
                      variants={VOCE}
                      transition={SVELTO}
                      style={{
                        ...TONI[a.tono],
                        // A tutta larghezza: è il punto della modifica — il
                        // bersaglio è la barra intera, non una pillola centrata.
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        border: "none",
                        borderRadius: 13,
                        padding: "14px 18px",
                        font: "700 14px 'Nunito Sans'",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>{a.label}</span>
                      {a.premium && (
                        <span
                          style={{
                            flex: "none",
                            font: "800 8px 'Nunito Sans'",
                            letterSpacing: ".4px",
                            textTransform: "uppercase",
                            padding: "3px 6px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,.28)",
                            color: "#fff",
                          }}
                        >
                          Premium
                        </span>
                      )}
                    </m.button>
                  ))}
                </m.div>
              </m.div>
            )}
          </AnimatePresence>

          {/* riga delle icone: resta sempre visibile, anche a pannello aperto.
              `space-around` e non `center`: la barra ora ha larghezza fissa, e
              le icone devono distribuirsi invece di stringersi in mezzo. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 6 }}>
            {SLOTS.map((s, i) => {
              const active = s.kind === "nav" && screen === s.key;
              const isAction = s.kind === "action";
              return (
                <m.button
                  key={i}
                  type="button"
                  className="navbtn"
                  onClick={() => (isAction ? onToggleFab() : onNavigate(s.key))}
                  aria-label={isAction ? (fabOpen ? "Chiudi" : "Crea") : NAV_LABEL[s.key] ?? s.key}
                  aria-expanded={isAction ? fabOpen : undefined}
                  aria-current={active ? "page" : undefined}
                  // Colori animati da Motion e non da una `transition` CSS: le
                  // transizioni CSS non sanno niente di `reducedMotion="user"`,
                  // che è metà del motivo per cui MotionRoot esiste.
                  animate={{
                    backgroundColor: active ? NAVY : "rgba(27,42,74,0)",
                    color: active ? "#ffffff" : "rgba(27,42,74,.5)",
                  }}
                  transition={SVELTO}
                  style={{
                    width: 46,
                    height: 46,
                    flex: "none",
                    borderRadius: "50%",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {isAction ? (
                    <m.span
                      aria-hidden
                      animate={{ rotate: fabOpen ? 45 : 0 }}
                      transition={MOLLA}
                      style={{
                        font: "300 27px 'Space Grotesk'",
                        lineHeight: 1,
                        color: NAVY,
                        display: "block",
                      }}
                    >
                      ＋
                    </m.span>
                  ) : (
                    <NavIcon screen={s.key} size={23} />
                  )}
                </m.button>
              );
            })}
          </div>
        </m.div>
      </div>
    </>
  );
}
