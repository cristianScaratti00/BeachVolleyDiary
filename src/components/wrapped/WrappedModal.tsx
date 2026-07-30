import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { toPng } from "html-to-image";
import { track } from "@vercel/analytics";
import type { WrappedData } from "../../lib/derive";
import { wrappedPalette } from "./palette";
import WrappedSlideCard from "./WrappedSlideCard";

// ============================================================================
// Beach Wrapped — visore a schermo intero, sfogliabile stile storia Instagram.
// Riusa la pipeline di StoryModal (card fissa 1080×1920 → toPng/toBlob dopo
// document.fonts.ready, foto CORS inlinate come data-URL) e aggiunge:
//  · barre di avanzamento IG + navigazione tap/swipe/tastiera + auto-avanzamento
//  · UNA sola azione: scarica la card corrente. "Scarica tutte" e Web Share sono
//    stati tolti — moltiplicavano i pulsanti sotto la card senza aggiungere
//    granché (il download singolo copre entrambi i casi), e lo spazio che
//    liberano va all'anteprima, che qui è il contenuto.
// Il nodo catturato NON è quello scalato dell'anteprima: c'è un layer nascosto a
// piena risoluzione (una card per slide) così l'immagine esce sempre pixel-perfect.
// ============================================================================

const SLIDE_MS = 5200; // durata dell'auto-avanzamento per slide
const pad2 = (n: number) => String(n).padStart(2, "0");

interface WrappedModalProps {
  wrapped: WrappedData;
  onClose: () => void;
  onNotice?: (msg: string) => void;
}

export default function WrappedModal({
  wrapped,
  onClose,
  onNotice,
}: WrappedModalProps) {
  const slides = wrapped.slides;
  const n = slides.length;
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  // Dito premuto sulla card. Tolto il tasto pausa, questo è il modo di fermare
  // l'auto-avanzamento — lo stesso gesto delle storie, e l'unica ragione per cui
  // toglierlo non è una regressione: un contenuto che scorre da solo deve poter
  // essere fermato da chi lo guarda.
  const [held, setHeld] = useState(false);
  const [vh, setVh] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 900,
  );
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const captureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const downX = useRef<number | null>(null);

  // Se l'intervallo cambia (nuovi slide), riparte dall'inizio.
  const rangeKey =
    wrapped.range.from + "|" + wrapped.range.to + "|" + wrapped.partnerName;
  useEffect(() => {
    setIdx(0);
  }, [rangeKey]);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Escape chiude (come il click sul backdrop).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Foto delle slide (intro/podio): scaricate e inlinate come data-URL, così
  // html-to-image le incorpora nel PNG senza canvas "tainted" (come StoryModal).
  const photoUrls = Array.from(
    new Set(slides.map((s) => s.photoUrl).filter((u): u is string => !!u)),
  );
  const photoKey = photoUrls.join("|");
  useEffect(() => {
    let alive = true;
    if (!photoUrls.length) {
      setPhotos({});
      return;
    }
    const toDataUrl = (u: string) =>
      fetch(u, { mode: "cors" })
        .then((r) =>
          r.ok ? r.blob() : Promise.reject(new Error("http " + r.status)),
        )
        .then(
          (blob) =>
            new Promise<[string, string]>((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve([u, fr.result as string]);
              fr.onerror = reject;
              fr.readAsDataURL(blob);
            }),
        )
        .catch((e) => {
          console.warn("[wrapped] foto", e);
          return null;
        });
    Promise.all(photoUrls.map(toDataUrl)).then((pairs) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      pairs.forEach((p) => {
        if (p) map[p[0]] = p[1];
      });
      setPhotos(map);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey]);

  const photoFor = (url?: string | null): string | null =>
    url ? (photos[url] ?? null) : null;

  // Auto-avanzamento: timer come unica fonte di verità (la barra CSS è solo
  // decorativa). Si ferma su ultima slide, in pausa, durante l'export o con
  // "riduci animazioni" attivo.
  useEffect(() => {
    if (!autoplay || held || busy || reduceMotion || idx >= n - 1) return;
    const t = setTimeout(() => setIdx((i) => Math.min(n - 1, i + 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [autoplay, held, busy, reduceMotion, idx, n]);

  const go = (i: number) => setIdx(Math.max(0, Math.min(n - 1, i)));
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // Un solo handler pointer copre mouse/touch/pen: swipe se lo spostamento è
  // ampio, altrimenti tap (terzo sinistro = indietro, resto = avanti).
  const onPointerDown = (e: ReactPointerEvent) => {
    downX.current = e.clientX;
    setHeld(true);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const sx = downX.current;
    downX.current = null;
    setHeld(false);
    if (sx == null) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 60) {
      if (dx < 0) next();
      else prev();
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.32) prev();
    else next();
  };
  // Il dito che esce dalla card senza rilasciare lascerebbe il mazzo fermo per
  // sempre: qualunque uscita dal gesto rimette in moto.
  const onPointerCancel = () => {
    downX.current = null;
    setHeld(false);
  };

  // Sotto la card è rimasto solo lo scarico, e solo sull'ultima slide: il
  // margine da sottrarre all'altezza è quindi molto minore di prima (era 340,
  // con una riga azioni piena, il tasto Chiudi e il selettore di periodo), e la
  // card può crescere di conseguenza.
  const scale = Math.max(0.22, Math.min(0.56, (vh - 230) / 1920));
  const boxW = Math.round(1080 * scale);
  const boxH = Math.round(1920 * scale);

  // `document.fonts.ready` non ha timeout: se un font non arriva mai — rete che
  // non risponde, un'estensione che blocca Google Fonts — la promessa resta
  // pendente per sempre e il pulsante si ferma su "Genero…" senza errore e
  // senza via d'uscita. È una protezione, non la cura di un difetto osservato:
  // il caso che l'ha suggerita (`document.fonts.status` fermo su "loading") si
  // è poi rivelato un artefatto del browser automatizzato in cui stavo
  // provando. Resta perché il costo è nullo e lo scarico è l'unica azione.
  const fontsPronti = () =>
    Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 3000)),
    ]);

  const capturePng = async (i: number): Promise<string | null> => {
    const node = captureRefs.current[i];
    if (!node) return null;
    await fontsPronti();
    // pixelRatio 2 → PNG 2160×3840: nitido su schermi retina e dopo l'upload IG.
    return toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      width: 1080,
      height: 1920,
    });
  };

  const fileName = (i: number) => `${wrapped.slug}-${pad2(i + 1)}.png`;

  // Quale card finisce nel PNG. NON quella che si sta guardando: sull'ultima
  // slide si legge "Grazie", e scaricare quella sarebbe portarsi a casa un
  // saluto. L'immagine che vale è il riepilogo, che è la card costruita per
  // essere salvata e condivisa. Se per qualche motivo non c'è (recap assente
  // sotto soglia), si ripiega sulla slide corrente.
  const recapIdx = slides.findIndex((s) => s.kind === "recap");
  const exportIdx = recapIdx >= 0 ? recapIdx : idx;

  const downloadCurrent = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Tetto all'intera generazione. Il timeout sui font qui sopra copre solo
      // la NOSTRA attesa: html-to-image aspetta i font per conto suo, e se non
      // arrivano mai resta appeso. Senza questo, il pulsante — che ora è
      // l'unica azione del recap — resterebbe su "Genero…" per sempre, senza
      // errore e senza modo di riprovare. Meglio dire che non è riuscito.
      const url = await Promise.race([
        capturePng(exportIdx),
        new Promise<null>((r) => setTimeout(() => r(null), 20000)),
      ]);
      if (!url) throw new Error("generazione non riuscita");
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(exportIdx);
      a.click();
      track("wrapped_scaricato");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[wrapped] toPng", e);
      onNotice?.("Impossibile generare l’immagine. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  // ---- empty state: pochi dati, il recap non ha senso ----
  if (!wrapped.hasEnoughData) {
    return (
      <div onClick={onClose} style={overlayStyle}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="card"
          style={{
            maxWidth: 420,
            width: "100%",
            padding: 32,
            textAlign: "center",
            background: "#16233F",
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: 22,
          }}
        >
          <div style={{ fontSize: 64, lineHeight: 1 }}>🏖️</div>
          <div
            className="num"
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "#fff",
              marginTop: 16,
            }}
          >
            Beach Wrapped in arrivo
          </div>
          <div
            style={{
              font: "600 14px 'Nunito Sans'",
              color: "rgba(255,255,255,.7)",
              marginTop: 10,
              lineHeight: 1.45,
            }}
          >
            Servono almeno qualche partita in questo periodo per generare il tuo
            recap di stagione. Aggiungi tornei e partite e torna a trovarci!
          </div>
          <div
            className="chip"
            onClick={onClose}
            style={{
              display: "inline-block",
              marginTop: 22,
              font: "700 14px 'Nunito Sans'",
              padding: "11px 22px",
              borderRadius: 11,
              background: "#FF6B35",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Ho capito
          </div>
        </div>
      </div>
    );
  }

  const chip = (bg: string, color = "#fff"): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    font: "700 13.5px 'Nunito Sans'",
    padding: "10px 18px",
    borderRadius: 11,
    background: bg,
    color,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.7 : 1,
  });

  return (
    <div onClick={onClose} style={overlayStyle}>
      {/* Chiusura in un angolo e non fra i comandi: è navigazione, non
          un'azione sul recap, e lì non ruba una riga all'anteprima. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Chiudi"
        style={{
          position: "absolute",
          top: "calc(12px + env(safe-area-inset-top))",
          right: 12,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          zIndex: 2,
          background: "rgba(255,255,255,.16)",
          color: "#fff",
          font: "700 17px 'Nunito Sans'",
          lineHeight: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✕
      </button>

      {/* barre di avanzamento (fuori dalla card per contrasto costante) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: boxW, display: "flex", gap: 6 }}
      >
        {slides.map((_, i) => {
          const animating = i === idx && autoplay && !busy && !reduceMotion;
          const filled = i < idx || (i === idx && !animating);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                background: "rgba(255,255,255,.28)",
                overflow: "hidden",
              }}
            >
              <div
                key={i === idx ? "active-" + idx : "seg-" + i}
                style={{
                  height: "100%",
                  background: "#fff",
                  transformOrigin: "left center",
                  transform: filled ? "scaleX(1)" : "scaleX(0)",
                  // In pausa la barra si ferma dov'è invece di sparire: se
                  // togliessimo l'animazione salterebbe a piena, dicendo il
                  // falso su quanto manca.
                  ...(animating
                    ? {
                        animation: `wrappedbar ${SLIDE_MS}ms linear both`,
                        animationPlayState: held ? "paused" : "running",
                      }
                    : {}),
                }}
              />
            </div>
          );
        })}
      </div>

      {/* anteprima scalata sfogliabile */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          } else if (e.key === " ") {
            e.preventDefault();
            setAutoplay((a) => !a);
          }
        }}
        tabIndex={0}
        role="group"
        aria-label={`Beach Wrapped, slide ${idx + 1} di ${n}`}
        style={{
          width: boxW,
          height: boxH,
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)",
          cursor: "pointer",
          touchAction: "pan-y",
          outline: "none",
          userSelect: "none",
        }}
      >
        {/* Due layer separati: quello ESTERNO fa l'animazione d'entrata
            (fade+slide), quello INTERNO tiene lo scale d'anteprima. Sono divisi
            perché `wrappedin` termina con `transform: none` e, se fosse sullo
            stesso nodo dello scale, con fill-mode `both` sovrascriverebbe lo
            `scale(${scale})` facendo esplodere la card a piena risoluzione. */}
        <div
          key={idx}
          className="wrapped-card-anim"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: boxW,
            height: boxH,
            animation: reduceMotion
              ? undefined
              : "wrappedin .4s cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          <div
            style={{
              width: 1080,
              height: 1920,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <WrappedSlideCard
              slide={slides[idx]}
              pal={wrappedPalette(idx)}
              index={idx}
              total={n}
              photoSrc={photoFor(slides[idx].photoUrl)}
            />
          </div>
        </div>
      </div>

      {/* Sotto la card non c'è più una pulsantiera: il mazzo si sfoglia con il
          dito (tap ai lati, swipe) e le barre in cima dicono a che punto siamo,
          esattamente come una storia. Avanti/indietro/pausa erano copie di
          gesti che si fanno già sulla card, e stavano lì solo a fare rumore.
          Le frecce e la barra spaziatrice continuano a funzionare da tastiera. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          width: "100%",
          maxWidth: 520,
        }}
      >
        {/* Lo scarico compare SOLO sull'ultima: il recap si condivide alla fine,
            e prima di allora quel pulsante invitava a portarsi via una slide
            qualsiasi invece di guardarle. Lo spazio resta riservato anche
            quando è nascosto, o la card ballerebbe all'ultimo passaggio. */}
        <div style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
          {idx === n - 1 && (
            <button
              type="button"
              className="chip"
              onClick={downloadCurrent}
              style={{ ...chip("#FF6B35"), border: "none" }}
            >
              {busy
                ? "Genero…"
                : recapIdx >= 0
                  ? "↓ Scarica il riepilogo"
                  : "↓ Scarica"}
            </button>
          )}
        </div>

        {/* intervallo stagione configurabile */}
      </div>

      {/* layer nascosto a piena risoluzione: una card per slide, sorgente degli
          export (mai scalata, quindi immagine pixel-perfect a 1080×1920) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width: 1080,
          height: 1920,
          pointerEvents: "none",
        }}
      >
        {slides.map((sl, i) => (
          <div
            key={i}
            ref={(el) => {
              captureRefs.current[i] = el;
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1080,
              height: 1920,
            }}
          >
            <WrappedSlideCard
              slide={sl}
              pal={wrappedPalette(i)}
              index={i}
              total={n}
              photoSrc={photoFor(sl.photoUrl)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(11,18,33,.82)",
  backdropFilter: "blur(6px)",
  zIndex: 70,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: 20,
  animation: "overlay .2s ease",
};
