import type { Screen } from "../lib/models";
import NavIcon from "./NavIcons";

// Slot della barra: 4 voci di navigazione + l'azione centrale "Crea".
type Slot = { kind: "nav"; key: Screen } | { kind: "action" };

const SLOTS: Slot[] = [
  { kind: "nav", key: "home" },
  { kind: "nav", key: "tornei" },
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

      {fabOpen && (
        <div
          onClick={onToggleFab}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 42,
            animation: "overlay .2s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 90,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div
              className="chip"
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
            </div>
            <div
              className="chip"
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
            </div>
            <div
              className="chip"
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
