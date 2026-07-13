import type { CSSProperties, ChangeEvent } from "react";
import type { DashboardStats, TorneoCard } from "../lib/derive";
import type { Option } from "../lib/models";
import { Badge } from "../components/ui";
import {
  KeyNumbers,
  TrendCard,
  WinLossCard,
  PointsCard,
  PhaseCard,
  PlacementCard,
  PartnerCard,
  RecentTornei,
} from "../components/dashboard";

interface HomeFilters {
  fPartner: string;
  fYear: string;
  partnerOptions: Option[];
  yearOptions: string[];
  setFPartner: (v: string) => void;
  setFYear: (v: string) => void;
  canFilter: boolean; // filtri disponibili solo con Premium
  onLockedFilter: () => void;
}

interface HomeProps {
  s: DashboardStats;
  recent: TorneoCard[];
  filters: HomeFilters;
  onOpenTorneo: (id: string) => void;
  onQuickTorneo: () => void;
  onAiCreate: () => void;
  canAiCreate: boolean; // assistente AI disponibile solo con Premium
  goTornei: () => void;
  goCompagni: () => void;
}

// La Home è ora una semplice composizione: header + filtri + widget AI + una serie
// di card della dashboard (una per grafico/statistica, in ../components/dashboard).
export default function Home({
  s,
  recent,
  filters,
  onOpenTorneo,
  // onQuickTorneo: bottone "Torneo rapido" attualmente commentato nell'header.
  onAiCreate,
  canAiCreate,
  goTornei,
  goCompagni,
}: HomeProps) {
  const {
    fPartner,
    fYear,
    partnerOptions,
    yearOptions,
    setFPartner,
    setFYear,
    canFilter,
    onLockedFilter,
  } = filters;
  const selectStyle: CSSProperties = {
    border: "1px solid rgba(27,42,74,.16)",
    background: "#fff",
    borderRadius: 10,
    padding: "9px 12px",
    font: "700 13px 'Nunito Sans'",
    color: "#1B2A4A",
    cursor: "pointer",
  };
  return (
    <div style={{ animation: "pop .32s ease both" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", paddingBottom: 24, borderBottom: "1px solid rgba(27,42,74,.1)" }}>
        <div>
          <div className="lbl">{s.periodLabel}</div>
          <div className="num" style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-1px", margin: "8px 0 6px", fontWeight: 500 }}>{s.headline}</div>
          <div style={{ font: "600 15px 'Nunito Sans'", color: "rgba(27,42,74,.58)", maxWidth: 540 }}>{s.subline}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Torneo rapido: bottone attualmente disattivato (vedi onQuickTorneo). */}
          {canFilter ? (
            <>
              <select value={fPartner} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFPartner(e.target.value)} style={selectStyle}>
                <option value="all">Tutti i compagni</option>
                {partnerOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select value={fYear} onChange={(e: ChangeEvent<HTMLSelectElement>) => setFYear(e.target.value)} style={selectStyle}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          ) : (
            <div onClick={onLockedFilter} title="Disponibile con Premium" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", border: "1px solid rgba(27,42,74,.16)", background: "#F2F0EC", borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ font: "700 13px 'Nunito Sans'", color: "rgba(27,42,74,.5)" }}>🔒 Filtra compagno e anno</span>
              <Badge>Premium</Badge>
            </div>
          )}
        </div>
      </div>

      {/* key numbers row */}
      <KeyNumbers s={s} />

      {/* widget assistente AI — funzione Premium */}
      <button onClick={onAiCreate} style={{ width: "100%", textAlign: "left", marginTop: 16, cursor: "pointer", border: `1px solid ${canAiCreate ? "rgba(255,107,53,.35)" : "rgba(27,42,74,.12)"}`, background: canAiCreate ? "linear-gradient(115deg,#FFF1E8 0%,#FFF8F0 58%)" : "#fff", borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#FF6B35,#FF9558)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flex: "none", boxShadow: "0 6px 16px -7px rgba(255,107,53,.75)", opacity: canAiCreate ? 1 : 0.82 }}>✨</div>
        <div style={{ flex: 1, minWidth: 190 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="num" style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-.2px" }}>Crea un torneo con l’assistente AI</span>
            <Badge>Premium</Badge>
          </div>
          <div style={{ font: "600 13px 'Nunito Sans'", color: "rgba(27,42,74,.55)", marginTop: 3 }}>
            {canAiCreate
              ? "Rispondi a qualche domanda in chat e lo compilo io per te — puoi aggiungere anche i risultati."
              : "Una chat guidata che compila il torneo al posto tuo. Disponibile con il piano Premium."}
          </div>
        </div>
        {!canAiCreate && (
          <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", font: "800 12.5px 'Nunito Sans'", color: "#E5484D" }}>
            🔒 Sblocca il piano Premium per usarla
          </span>
        )}
      </button>

      <TrendCard s={s} />

      {/* donut + bars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16, marginTop: 16 }}>
        <WinLossCard s={s} />
        <PointsCard s={s} />
      </div>

      {/* win rate per fase + piazzamenti tornei */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16, marginTop: 16 }}>
        <PhaseCard s={s} />
        <PlacementCard s={s} />
      </div>

      <PartnerCard s={s} goCompagni={goCompagni} />

      <RecentTornei recent={recent} onOpenTorneo={onOpenTorneo} goTornei={goTornei} />
    </div>
  );
}
