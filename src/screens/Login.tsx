import { useState, useEffect } from "react";
import type { CSSProperties, ChangeEvent, FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { checkNameAvailable } from "../lib/auth";
import { useIsWide } from "../hooks/useMedia";
import { BrandLockup } from "../components/Logo";

type Mode = "login" | "register";

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(27,42,74,.16)",
  borderRadius: 11,
  padding: "12px 14px",
  font: "700 14px 'Nunito Sans'",
  background: "#fff",
};

const seg = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: "10px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  font: "700 13px 'Nunito Sans'",
  background: active ? "#fff" : "transparent",
  color: active ? "#1B2A4A" : "rgba(27,42,74,.5)",
  boxShadow: active ? "0 1px 3px rgba(27,42,74,.12)" : "none",
});

const FEATURES = [
  { icon: "◧", text: "Statistiche di ogni stagione" },
  { icon: "▤", text: "Tornei, partite e set" },
  { icon: "◎", text: "Con chi giochi meglio" },
];

export default function Login() {
  const wide = useIsWide();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameStatus, setNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [nameMsg, setNameMsg] = useState("");

  const isRegister = mode === "register";

  // Check live del nickname sotto l'input del nome (solo in registrazione),
  // con debounce per non chiamare la Edge Function ad ogni tasto.
  useEffect(() => {
    if (!isRegister) {
      setNameStatus("idle");
      return;
    }
    const n = name.trim();
    if (n.length < 2) {
      setNameStatus("idle");
      return;
    }
    setNameStatus("checking");
    let alive = true;
    const t = setTimeout(async () => {
      const res = await checkNameAvailable(n);
      if (!alive) return;
      if (res.status === "available") {
        setNameStatus("available");
        setNameMsg("Nome disponibile");
      } else if (res.status === "taken") {
        setNameStatus("taken");
        setNameMsg(res.error || "Nome già in uso");
      } else {
        setNameStatus("idle");
        setNameMsg("");
      }
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [name, isRegister]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setNotice("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    const r = isRegister
      ? await register(name, email, password)
      : await login(email, password);
    if (!r.ok) {
      setError(r.error || "Si è verificato un errore.");
    } else if (r.notice) {
      // Registrazione con conferma email: resta sul login e mostra l'avviso verde.
      setNotice(r.notice);
      setMode("login");
      setPassword("");
    }
    setBusy(false);
    // On login success the AuthProvider updates the session and <Root/> swaps to the app.
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#FAF8F5" }}>
      {/* left brand panel (desktop) */}
      {wide && (
        <div
          style={{
            width: "44%",
            maxWidth: 520,
            background: "#1B2A4A",
            color: "#fff",
            padding: "48px 44px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(45deg,rgba(255,255,255,.04) 0 10px,transparent 10px 20px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <BrandLockup light bare size={34} textSize={18} gap={11} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <div
              className="num"
              style={{
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1.12,
                letterSpacing: "-.8px",
              }}
            >
              Il tuo diario di
              <br />
              beach volley.
            </div>
            <div
              style={{
                font: "600 15px 'Nunito Sans'",
                color: "rgba(255,255,255,.62)",
                marginTop: 14,
                maxWidth: 360,
              }}
            >
              Segna tornei e partite, tieni i punteggi set per set e scopri i
              tuoi numeri stagione dopo stagione.
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 30,
              }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    font: "700 14px 'Nunito Sans'",
                    color: "rgba(255,255,255,.9)",
                  }}
                >
                  <span style={{ fontSize: 16, color: "#FF6B35" }}>
                    {f.icon}
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {!wide && (
            <div
              style={{
                marginBottom: 22,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <BrandLockup size={34} textSize={17} gap={11} />
            </div>
          )}

          <div className="card" style={{ padding: "28px 26px" }}>
            <div
              className="num"
              style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.4px" }}
            >
              {isRegister ? "Crea il tuo diario" : "Bentornato"}
            </div>
            <div
              style={{
                font: "600 13.5px 'Nunito Sans'",
                color: "rgba(27,42,74,.55)",
                marginTop: 4,
              }}
            >
              {isRegister
                ? "Registrati per iniziare a tracciare le partite."
                : "Accedi per continuare il tuo diario."}
            </div>

            {/* segmented toggle */}
            <div
              style={{
                display: "flex",
                background: "#F2F0EC",
                borderRadius: 10,
                padding: 4,
                gap: 4,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={seg(!isRegister)}
              >
                Accedi
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={seg(isRegister)}
              >
                Registrati
              </button>
            </div>

            <form
              onSubmit={submit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginTop: 18,
              }}
            >
              {isRegister && (
                <div>
                  <div className="lbl" style={{ marginBottom: 6 }}>
                    Nome
                  </div>
                  <input
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setName(e.target.value)
                    }
                    placeholder="es. Marco"
                    autoComplete="name"
                    style={inputStyle}
                  />
                  {name.trim().length >= 2 && nameStatus !== "idle" && (
                    <div
                      style={{
                        marginTop: 6,
                        font: "700 12px 'Nunito Sans'",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color:
                          nameStatus === "taken"
                            ? "#FF477E"
                            : nameStatus === "available"
                              ? "#17B26A"
                              : "rgba(27,42,74,.5)",
                      }}
                    >
                      {nameStatus === "checking" ? (
                        "Verifico disponibilità…"
                      ) : (
                        <>
                          <span>
                            {nameStatus === "available" ? "✓" : "✕"}
                          </span>
                          {nameMsg}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>
                  Email
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  placeholder="tu@email.com"
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>
                  Password
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  placeholder={isRegister ? "Almeno 6 caratteri" : "••••••••"}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  style={inputStyle}
                />
              </div>

              {notice && (
                <div
                  style={{
                    font: "700 12.5px 'Nunito Sans'",
                    color: "#17B26A",
                    background: "rgba(23,178,106,.08)",
                    border: "1px solid rgba(23,178,106,.28)",
                    borderRadius: 10,
                    padding: "9px 12px",
                  }}
                >
                  {notice}
                </div>
              )}

              {error && (
                <div
                  style={{
                    font: "700 12.5px 'Nunito Sans'",
                    color: "#FF477E",
                    background: "rgba(255,71,126,.08)",
                    border: "1px solid rgba(255,71,126,.25)",
                    borderRadius: 10,
                    padding: "9px 12px",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="chip"
                style={{
                  width: "100%",
                  padding: 13,
                  borderRadius: 11,
                  border: "none",
                  cursor: busy ? "default" : "pointer",
                  background: "#FF6B35",
                  color: "#fff",
                  font: "700 14.5px 'Nunito Sans'",
                  marginTop: 2,
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? "Attendere…" : isRegister ? "Crea account" : "Entra"}
              </button>
            </form>

            <div
              style={{
                font: "600 13px 'Nunito Sans'",
                color: "rgba(27,42,74,.55)",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              {isRegister ? "Hai già un account? " : "Non hai un account? "}
              <span
                className="chip"
                onClick={() => switchMode(isRegister ? "login" : "register")}
                style={{ color: "#FF6B35", fontWeight: 700, cursor: "pointer" }}
              >
                {isRegister ? "Accedi" : "Registrati"}
              </span>
            </div>
          </div>

          <div
            style={{
              font: "600 11.5px 'Nunito Sans'",
              color: "rgba(27,42,74,.4)",
              textAlign: "center",
              marginTop: 14,
            }}
          >
            I tuoi dati sono salvati in sicurezza sul cloud.
          </div>
        </div>
      </div>
    </div>
  );
}
