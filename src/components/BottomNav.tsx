import type { Screen } from "../lib/models";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import NavIcon from "./NavIcons";
import { MOLLA } from "./Motion";

// Speed-dial: le voci escono in sequenza invece che tutte insieme.
//
// `staggerDirection: -1` fa partire dall'ULTIMA voce del DOM, cioè "Nuova
// partita", che è quella disegnata più in basso e quindi più vicina al bottone
// premuto. Le tre voci sembrano allora uscire DAL pulsante; nell'ordine
// naturale sembrerebbero cadere dall'alto senza motivo.
const SPEED_DIAL = {
  chiuso: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
  aperto: { transition: { staggerChildren: 0.045, staggerDirection: -1 } },
};

const VOCE = {
  chiuso: { opacity: 0, y: 14, scale: 0.92 },
  aperto: { opacity: 1, y: 0, scale: 1 },
};

// Slot della barra: 5 voci di navigazione + l'azione centrale "Crea".
type Slot = { kind: "nav"; key: Screen } | { kind: "action" };

const SLOTS: Slot[] = [
  { kind: "nav", key: "home" },
  { kind: "nav", key: "tornei" },
  // { kind: "nav", key: "oggi" },
  { kind: "action" },
  { kind: "nav", key: "compagni" },
  { kind: "nav", key: "diario" },
];

const NAVY = "#1B2A4A";

interface BottomNavProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  fabOpen: boolean;
  onToggleFab: () => void;
  onNewTorneo: () => void;
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
  onNewPartita,
  onAssistant,
  canAssistant,
}: BottomNavProps) {
  return (
    <>
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
        }}
      >
        {/* pill bianca flottante */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#fff",
            borderRadius: 999,
            padding: 7,
            boxShadow:
              "0 14px 34px -10px rgba(27,42,74,.28), 0 2px 8px -2px rgba(27,42,74,.12)",
            pointerEvents: "auto",
          }}
        >
          {SLOTS.map((s, i) => {
            const active = s.kind === "nav" && screen === s.key;
            const onClick = () =>
              s.kind === "action" ? onToggleFab() : onNavigate(s.key);
            return (
              <div
                key={i}
                className="nav"
                onClick={onClick}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: active ? NAVY : "transparent",
                  color: active ? "#fff" : "rgba(27,42,74,.5)",
                  transition: "background .2s ease, color .2s ease",
                }}
              >
                {s.kind === "action" ? (
                  <span
                    style={{
                      font: "300 27px 'Space Grotesk'",
                      lineHeight: 1,
                      color: NAVY,
                      transform: fabOpen ? "rotate(45deg)" : "none",
                      transition: "transform .2s ease",
                    }}
                  >
                    ＋
                  </span>
                ) : (
                  <NavIcon screen={s.key} size={23} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {fabOpen && (
          <m.div
            key="speed-dial"
            onClick={onToggleFab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 42,
            }}
          >
            <m.div
              variants={SPEED_DIAL}
              initial="chiuso"
              animate="aperto"
              exit="chiuso"
              style={{
                position: "absolute",
                left: "50%",
                bottom: 90,
                // `translateX` resta qui e NON fra le proprietà animate: Motion
                // scrive `transform` da sé sulle voci, non su questo contenitore.
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "center",
              }}
            >
              <m.div
                className="chip"
                variants={VOCE}
                transition={MOLLA}
                onClick={onAssistant}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "linear-gradient(135deg,#FF6B35,#FF9558)",
                  color: "#fff",
                  font: "700 13.5px 'Nunito Sans'",
                  padding: "12px 20px",
                  borderRadius: 12,
                  boxShadow: "0 8px 22px -8px rgba(255,107,53,.7)",
                  cursor: "pointer",
                }}
              >
                ✨ Crea con l’assistente
                {!canAssistant && (
                  <span
                    style={{
                      font: "800 8px 'Nunito Sans'",
                      letterSpacing: ".4px",
                      textTransform: "uppercase",
                      padding: "2px 5px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,.28)",
                      color: "#fff",
                    }}
                  >
                    Premium
                  </span>
                )}
              </m.div>
              <m.div
                className="chip"
                variants={VOCE}
                transition={MOLLA}
                onClick={onNewTorneo}
                style={{
                  background: "#fff",
                  color: "#1B2A4A",
                  font: "700 13.5px 'Nunito Sans'",
                  padding: "12px 20px",
                  borderRadius: 12,
                  boxShadow: "0 8px 22px -8px rgba(27,42,74,.4)",
                  cursor: "pointer",
                }}
              >
                Nuovo torneo
              </m.div>
              <m.div
                className="chip"
                variants={VOCE}
                transition={MOLLA}
                onClick={onNewPartita}
                style={{
                  background: "#1B2A4A",
                  color: "#fff",
                  font: "700 13.5px 'Nunito Sans'",
                  padding: "12px 20px",
                  borderRadius: 12,
                  boxShadow: "0 8px 22px -8px rgba(27,42,74,.4)",
                  cursor: "pointer",
                }}
              >
                Nuova partita
              </m.div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
