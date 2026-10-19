# POLISH.md — la rifinitura dopo il refactor «Bagnasciuga»

Giro di rifinitura (ruolo 5) sull'interfaccia già costruita: breakpoint veri, dati veri e dati estremi, tastiera senza mouse, axe nel browser, contrasto anche in hover, reduced-motion, prestazioni misurate sulla build di produzione. Tutto quello che si cita qui si rifà con gli script in [`docs/qa/`](docs/qa/) (in fondo il come).

La landing `/presentazione` ha avuto il suo giro, con un suo script: è la [Parte L](#parte-l--la-landing-presentazione), in fondo.

## Cosa è stato sistemato

| # | Difetto trovato (com'era misurato) | Correzione | Dopo |
|---|---|---|---|
| 1 | **Focus coperto dalla TabBar** (WCAG 2.4.11): col Tab «Fai check-in» (Home), «Ravenna King» (Tornei), «Cookie e statistiche» (Profilo) finivano sotto la capsula | `scroll-padding` sotto la NavBar compatta e sopra la TabBar (`AppShell.css`), anche per `<main>` da 900 | 0 fermate coperte su 8 rotte |
| 2 | **Anello di focus mozzato** dagli `overflow` di chip, «Altri dettagli» e righe set: 2px di spazio per un anello che esce di 4 | token `--focus-reach` (= larghezza + offset), usato nei tre contenitori | anello intero |
| 3 | **Anello delle righe tagliato dagli angoli** del gruppo (Password, Esci, Segnala…) | prima e ultima riga prendono il raggio del gruppo (`List.css`) | segue la curva |
| 4 | **Mappa a fuoco senza anello**: Leaflet porta l'offset a 1px, la cornice lo taglia; idem il link «Leaflet» nell'angolo | anello su un `::after` della cornice, rientrato; offset del link negativo. Il CSS di Leaflet non si tocca | visibile su entrambe le mappe |
| 5 | **Contrasto in hover/premuto sotto AA**: lo strato `currentColor` scurisce il fondo verso l'etichetta. tinted 4.24 / **4.01**, plain sul fondo 4.41 / **4.17**, destructive-plain 4.36 / **4.09** | token `--accent-text-state` `#9D3E17` e `--danger-state` `#B01B48` (+ i loro valori scuri) per l'etichetta in hover e premuto; test che ricalcola ogni coppia con lo strato composto | tinted 5.07 / 4.78 misurato nel browser; ≥ 4.66 su ogni fondo |
| 6 | **Disattivi muti**: «Salva partita» senza torneo e «Unisci i due luoghi» non dicevano niente al tocco; `IconButton` non aveva uno stato disattivato (MapZoom e CreaChat lo rifacevano a mano, CreaChat con strato e scala ancora attivi) | il tocco porta al campo che manca e dice perché; stato disattivato nella primitiva | test in `PartitaSheet.test.tsx` |
| 7 | **Bersagli sotto 44**: segmenti e chip 36px, interruttore 51×31 | `::after` che porta i primi a 44 dentro il loro binario; la scritta dell'interruttore è un `<label>` vero e accende anche lei | 0 bersagli < 44 fuori dalle eccezioni sotto |
| 8 | **Testo che esce o si spezza male** (prova `?estremo`): «DIFFERENZIALE» 103px in celle da 86 (390, 768) copriva il bordo; con tre set il nome dell'avversario andava una parola per riga; nome senza spazi fuori dai meter; segnaposto della ricerca tagliato a metà parola; chevron del valore in Profilo mozzato di 4px | etichette sillabate (`hyphens`, `lang="it"`) e 2 colonne sotto 360; i set vanno a capo quando al nome resterebbero meno di 7.5rem (non più una soglia fissa a 360px); `overflow-wrap`; `text-overflow: ellipsis` sui campi | 0 SPILL/CLIP a 320–1280 (resta segnalato solo il chevron di «Cookie e statistiche», che esce di 4px apposta per allinearsi agli altri) |
| 9 | **TabBar a 320**: «Compagni» misura 56.25px in una colonna da 56 → «Compa…» | `--tabbar-side` 8px sotto i 360 | colonna da 59.2 |
| 10 | **Stringhe vuote**: un torneo senza nome dava una card senza link da toccare e un h1 vuoto | `nomeVisibile()` → «Senza nome» in `CardLink`, NavBar, Home e Mappa | test in `ui.test.tsx` |
| 11 | **axe nel browser**: `heading-order` su Timeline e Compagni (h1 → h3); cluster della mappa senza nome (`aria-command-name`, serious) | h2 per i lettori di schermo; testo nascosto nel cluster | 40/42 scene a 0 violazioni (vedi compromessi) |
| 12 | **Scrollbar che sposta la colonna** (piattaforme a scrollbar classica): da pagina corta a lunga e quando uno sheet blocca lo scroll | `scrollbar-gutter: stable` su chi scorre, solo con puntatore preciso | — (vedi compromessi) |
| 13 | **Cache di Leaflet**: il vendor da 43 KB gz finiva in `MapZoom-*.js` insieme a codice dell'app | `manualChunks` → `leaflet` (solo il nucleo; il cluster resta con la mappa delle conquiste) | `leaflet-BhoP-kOk.js`, stesso hash di `main`: chi aggiorna non lo riscarica |

L'anteprima ha un parametro nuovo, `?estremo`: nomi lunghissimi e senza spazi, stringhe vuote, emoji, 44 tornei, 150 partite, set ai vantaggi.

## Cosa è stato misurato

Chrome 155 headless via CDP sull'anteprima `docs/preview`. Le prestazioni sono misurate sulla build di produzione dell'anteprima, con i dati `?estremo`, CPU 4× (≈ un Android di fascia media). Prima e dopo: tre giri alternati ciascuno, si riportano le mediane.

| Cosa | Prima | Dopo |
|---|---|---|
| Primo caricamento: FCP · TBT · CLS | 212 ms · 45 ms · 0 | 180 ms · 33 ms · 0 |
| CLS lungo tutto il giro (menu, sheet, rotte, mappa, dettaglio) | 0 | 0 |
| Scambio di font (pila senza Apple, Inter in ritardo di 1.5s) | CLS 0.0001 | invariato: le interlinee fisse lo assorbono, nessun font di ripiego serve |
| Interazione (Event Timing, come INP): menu ＋ · sheet · tab · dettaglio | 32 · 80 · 80 · 56 ms | 32 · 64 · 56 · 64 ms |
| Fotogrammi lenti (> 25 ms) nello scorrimento sotto la TabBar di vetro | 0 su 109 | 0 su 109 |
| Fotogrammi lenti nell'apertura dello sheet | 1 (50 ms, il montaggio) | 1 (33 ms) |
| Proprietà animate nei percorsi caldi | solo `transform`/`opacity` (+ l'eccezione E1) | invariato |
| Reduced motion | ogni flusso arriva allo stato finale, nessuna traslazione, i numeri compaiono già arrivati, pillole a scatto | invariato |
| Reduced transparency | vetro opaco, nessun `backdrop-filter` | invariato |
| Superfici sfocate a schermo nelle 14 rotte a riposo (budget 3) | max 2 (TabBar + MapZoom) | invariato |
| Scroll orizzontale, 14 rotte × 320/390/768/1280, dati normali ed estremi | 0 | 0 |
| Immagini senza misure | 0: tutte in riquadri con `aspect-ratio` o misure fisse | — |
| Focus al ritorno: menu, sheet (Esc e indietro), sheet sporco, dialogo, lightbox, Wrapped | torna sempre a chi ha aperto | invariato |

Bundle (gzip) contro `main` prima del refactor:

| | `main` | HEAD prima del giro | dopo |
|---|---|---|---|
| JS iniziale (`main-*.js`) | 106.6 KB | 123.8 KB | 124.0 KB |
| CSS iniziale (`main-*.css`) | 0.85 KB | 15.5 KB | 15.9 KB |
| Leaflet (lazy) | 43.4 KB `leaflet-*` | 43.7 KB `MapZoom-*` | 43.4 KB `leaflet-*` |

## Compromessi noti, lasciati di proposito

- **axe `region` (best practice, non WCAG) sul menu ＋**: il menu sta in un portal fuori dai landmark. È un popup modale di breve vita; dargli un landmark aggiungerebbe solo rumore.
- **Etichetta disattivata a 1.9:1** (`--ink-disabled`): esente da WCAG e mai l'unico segnale (`aria-disabled`, e il tocco ora spiega).
- **Sheet: un fotogramma da 33–50 ms al montaggio** con CPU 4× (commit di React + layout di ~170 nodi). Il resto dell'entrata è solo `transform`. Toglierlo vorrebbe dire tenere gli sheet montati in anticipo.
- **CSS tutto nel bundle iniziale** (98 KB grezzi / 15.9 KB gz): le schermate eager portano il loro foglio. Dividerlo per rotta va fatto insieme al lazy delle schermate.
- **+17 KB gz di JS iniziale rispetto a `main`**: router, overlay e primitive. Misurato, non toccato.
- **Bersagli sotto 44 rimasti**: il campo di ricerca (40, proporzione iOS); il link «Segnala un problema» dentro il testo del banner (in linea, esente da 2.5.8); il cluster della mappa (40×40).
- **La sillabazione dipende dai dizionari del browser**: dove mancano, `overflow-wrap: break-word` spezza la parola invece di farla uscire.
- **Non verificato su dispositivi veri**: Safari iOS (`-webkit-backdrop-filter`, `hyphens`), Android con Inter, scrollbar classiche di Windows. Chrome headless su macOS ha scrollbar sovrapposte: di `scrollbar-gutter` si è verificato solo il valore calcolato.

## Come rifare le misure

```sh
# anteprima in sviluppo
VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=x npx vite
node docs/qa/axe.mjs                       # axe nel browser, rotte + overlay (FLAT=1 per il contrasto)
node docs/qa/tab.mjs                       # solo tastiera: anello, CLIP, coperto
node docs/qa/targets.mjs                   # bersagli effettivi
QS=estremo W=320,390,768,1280 node docs/qa/sweep.mjs estremo > sweep.json   # overflow, SPILL/CLIP
node docs/qa/reduced.mjs                   # reduced-motion (TRANSP=1: anche reduced-transparency)
node docs/qa/hover.mjs                     # contrasto vero in hover e premuto

# prestazioni: build di produzione dell'anteprima (config temporanea con
# input: docs/preview/index.html e lo stesso manualChunks di vite.config.ts),
# servita su 4173, poi:
PBASE=http://127.0.0.1:4173/docs/preview/index.html QS=estremo node docs/qa/perf.mjs
PBASE=http://127.0.0.1:4173/docs/preview/index.html node docs/qa/fontcls.mjs
```

`BASE` cambia l'URL dell'anteprima, `CHROME` l'eseguibile e `QA_OUT` la cartella degli screenshot. Gli script non fanno parte della build né dei test.

---

## Parte L — la landing `/presentazione`

Il giro di rifinitura sulla landing rifatta su «Controluce» (UX, ART_DIRECTION e MOTION, Parte L). Misurata sulla **build di produzione** servita da `vite preview`, in Chrome headless: a 320, 360, 390, 768, 1024, 1280 e 1440, con i dati veri della pagina e con numeri enormi. Sotto i 900px la pagina si apre come Safari su iPhone, il telefono per cui è fatta. Lo script è uno solo: [`docs/qa/landing.mjs`](docs/qa/landing.mjs). Gli altri script di `docs/qa` navigano le rotte di `docs/preview` e qui misurerebbero sempre la cima della pagina.

### Cosa è stato sistemato

| # | Difetto (come lo si è visto) | Correzione | Dopo |
|---|---|---|---|
| L1 | **Anello di focus invisibile sulla barra** alle prime fermate del Tab. Sopra il tramonto l'anello delle tab e del ＋ era d'inchiostro su vetro scuro: contrasto misurato 1.12 e 1.23. Il vetro scuro della capsula è uno strato *fratello* delle tab, quindi il bianco di `materials.css` non arrivava | `barra.css`: l'anello segue il fondo come l'inchiostro (`.capsula[data-inchiostro="scuro"]`). Sulla tab corrente cade sulla lente bianca e lì è sempre d'inchiostro | 14.8–19.1 |
| L2 | **Pallo guida e ＋ galleggiano su ogni fondo**: sull'inchiostro di `#numeri` l'anello di Pallo misurava 1.0 | token `--anello-alone`: un alone bianco nel distacco più l'anello d'inchiostro dell'app (tecnica a due colori, WCAG C40) | 17.0 su `#numeri`, 15.7 sulla carta |
| L3 | **Un fotogramma da 72ms** (CPU 4×) uscendo dall'hero, a ogni giro. Il trace porta al layout della nuvoletta «Quando vuoi, il ＋ arancio…»: il «＋» a tutta larghezza (U+FF0B) non c'è in Geist, e la prima volta il browser cerca un carattere di ripiego nel sistema (85–109ms da solo, contro 1.6ms per una frase latina). In più il glifo usciva da un font CJK, più largo e più nero | `guida.ts`: «+» ASCII nel testo visibile. Nei documenti «＋» resta come notazione | 0 task lunghi in uscita dall'hero (3 giri su 3) |
| L4 | **Il «%» del 63% scattava di lato** quando i numeri salgono: partono da uno zero di una cifra e l'Odometro aggiunge la colonna a sinistra. CLS 0.0035 sul `poster-pct` | `numeri.ts` scrive `data-fin`; `numeri.css` tiene il valore finale invisibile nella stessa cella della griglia, così la larghezza è quella finale da subito. `Odometro.ts` non è cambiato | CLS 0 a 390 e 1280, anche col font in ritardo |
| L5 | **«1/ 7»**: lo spazio prima della barra cadeva a inizio riga del secondo pezzo flex. E coi numeri enormi («144 / 1440») il totale usciva dalla cella e dallo schermo: in emulazione mobile il viewport si allargava a 401 (320) e 436 (390), cioè la pagina si rimpiccioliva | `.cella-num`: `column-gap` col token `--num-spazio` (lo spazio di Geist col tracking, 0.18em, misurato) e `flex-wrap`: «/ 1440» va a capo intero | «1 / 7» come nella Home; nessun viewport allargato coi numeri enormi |
| L6 | **Le slide di Wrapped tagliate a 16px dal bordo**: il blocco bloccato era largo quanto il contenuto, con `overflow: hidden`, e Pallo e i numeri si spezzavano su una riga verticale netta. Dopo la pista c'erano 221px di inchiostro vuoto (390), 224 a 1280 | pista e blocco a tutta larghezza (la fila parte dal gutter con `padding-inline`, `100cqw` della corsa resta la colonna); `--palco` (il vuoto del blocco centrato) si sottrae ai margini prima e dopo | taglio al bordo dello schermo; 103px dopo la pista (390), 144 a 1280 |
| L7 | **La demo Partita live sotto i 600px**: coi pannelli da 168 la testa di Pallo copriva il fondo della cifra di «loro», e la battuta toccava la scritta «Noi» (misurato: −3px di distacco a 390) | token `--live-panel-h` a 200 a ogni larghezza (come già da 600) | 15px fra battuta e «Noi», cifra libera |
| L8 | **Il velo dell'hero finiva a 592px** fra 600 e 899: era largo quanto il blocco del testo (`--hero-text-max`), e lasciava uno spigolo netto sulla sabbia | `eroe.css`: il velo è largo quanto l'hero (l'eccesso lo taglia `overflow: clip`) | nessuno spigolo a 768 |
| L9 | **Il telefono sticky di `#diario` si fermava sotto l'avanzamento**: il pallone gli rotolava sulla cornice. `--scroll-pad-top` (safe-area + 12) stava sotto la riga dell'avanzamento, anche per il fuoco | token: `--scroll-pad-top` = `--progress-top` + `--progress-box` + 8, da cui seguono sia lo `scroll-padding` sia il telefono sticky | safe-area + 30 (112 da 900) |
| L10 | **Il wordmark della barra da 900px** non ha vetro: oltre l'hero il testo delle sezioni gli passava attraverso, e sull'arancio delle slide il bianco faceva 2.9 | `nav.ts` segna `data-marchio="tessera"` quando l'hero lascia la barra; `barra.css` fa svanire il nome in SVELTO (torna col fuoco). La tessera è piena e resta | niente testo su testo |
| L11 | **Il titolo dell'hero nel carattere di riserva per ~1.3s** su Slow 4G: Geist partiva solo dopo il CSS | `vite.config.ts` (`landingFont`, solo in build): `<link rel="preload">` del sottoinsieme latino, con `crossorigin` | il font è pronto prima del primo disegno (4 giri su 4) |
| L12 | **Pannello disattivo muto per gli screen reader**: a set finito il tocco rifà la battuta, ma la nuvoletta non è una live region | `live.ts`: lo status della demo dice «Set finito, 21 a 19: prima chiudi il set.» | — |
| L13 | **CLS 0.0009 a 1280 nella demo**: la scatola di Pallo e della battuta (`.demo-mezzo-in`) era centrata dalla sua posizione statica, e l'autoplay (che non è un gesto dell'utente) ne cambiava la larghezza a ogni battuta | `live.css`: la scatola va da bordo a bordo e centra i figli | CLS 0 |

### Cosa è stato misurato

Tutto sulla build di produzione. «Prima» è il commit `0457f1d` (la landing com'era arrivata a questo giro). Dove non c'è scritto altro, i numeri valgono a 390 (Safari su iPhone) e a 1280.

| Cosa | Prima | Dopo |
|---|---|---|
| axe nel browser (WCAG 2.0/2.1/2.2 AA e best practice). Scene: le 9 sezioni, il menu della guida, il foglio d'installazione, una tab di `#registra`, la chat dopo una risposta, la demo dopo 4 punti, il fermo premuto | 0 violazioni | 0 |
| Anello di focus che si vede: contrasto fra il pixel acceso e quello spento, mediana dei 4 lati, sull'intero giro da tastiera. In più Pallo e la tab corrente sopra `#numeri` e `#mappa` | 5 fermate sotto 3:1, proprio le prime: tab e ＋ sul tramonto (1.12 e 1.23), tab corrente sulla lente col buio (1.04), Pallo sull'inchiostro (1.0) | tutte da 14.8 in su (21 fermate a 390, 22 a 1280) |
| Fermate coperte da barra o guida, oppure con l'anello tagliato | 0 | 0 |
| Ritorno del fuoco | menu della guida: Invio porta alla prima voce, Esc torna a Pallo. Foglio: Invio porta al titolo, Tab resta dentro, Esc torna al pulsante | invariato |
| Contrasto in hover e premuto (strato composto): ＋, voci di `#registra`, risposte della chat, `tinted`, comandi sul tramonto, piede | — | il più basso 4.66 (`tinted` a riposo; 5.82 in hover). ＋ 5.97 → 5.23; tutti gli altri ≥ 13.9 |
| CLS al caricamento, con Geist in ritardo di 1.5s | 0 | 0 |
| CLS scorrendo tutta la pagina giù e su | 0.0035 (il «%», 390) | 0 |
| CLS a fine giro, interazioni comprese (CPU 4×) | 0.0009 (1280, la demo) | 0 |
| Viewport allargato o scroll orizzontale, da 320 a 1440 | 0 coi dati veri; coi numeri enormi 401 a 320, 436 a 390 | 0, anche coi numeri enormi |
| Testo che esce o è tagliato (SPILL/CLIP) | 0 | 0 |
| Bersagli sotto 44 (l'area che risponde davvero) | 0 | 0 |
| Superfici sfocate a schermo (budget 3) | 2 a riposo | 2 a riposo, 2 col menu della guida, 3 col foglio |
| Reduced motion e «Ferma le animazioni» | niente si muove, numeri già finali, demo senza autoplay, Wrapped da scorrere a mano, Pallo fermo | invariato |
| Caricamento con CPU 4× (FCP · TBT) | 92–156ms · 7–8ms | 108–172ms · 0–33ms (variano da un giro all'altro, sono la stessa cosa) |
| Fotogrammi sopra 25ms scorrendo tutta la pagina con un gesto vero (CPU 4×) | a 390 un task da 72ms uscendo dall'hero, a ogni giro | 0 in uscita dall'hero (3 giri su 3); per il resto vedi i compromessi |
| Interazioni (Event Timing, come INP): guida, foglio, tab, chat, demo ±1 | ≤ 24ms | ≤ 24ms |
| Proprietà animate | `transform`, `opacity` | invariato |
| Geist su Slow 4G (150ms RTT, 1.6 Mbps) | pronto ~1.3s dopo il primo disegno | pronto prima del primo disegno (4 giri su 4); FCP +~150ms |
| Bundle gzip: JS (pagina + 3 moduli dell'app) · CSS · HTML | 25.16 · 20.56 · 15.40 KB | 25.22 · 20.78 · 15.46 KB |

### Compromessi noti

- **Il preload di Geist costa ~150ms di FCP su Slow 4G.** Il font si contende la banda col CSS, che blocca il disegno. In cambio il titolo dell'hero non cambia carattere sotto gli occhi. Sulle reti veloci non si misura differenza.
- **Restano fotogrammi lenti isolati in Chrome headless**: 0–1 per giro (33–117ms), ogni volta in una sezione diversa. Nel trace non c'è nessun task del main thread sopra i 12ms, e uno era un `GPUTask` da 92ms: è la rasterizzazione software di headless (SwiftShader). Si attribuiscono all'ambiente, ma su un telefono vero non è verificato.
- **axe lascia «contrasto incompleto» su 25–33 nodi per scena.** Sono i nodi su vetro, gradienti e sovrapposizioni, dove axe non sa dire il fondo. I ruoli del testo li ricalcola `landing.tokens.test.ts`; l'anello e gli stati li misura questo giro. Non c'è una misura a pixel nodo per nodo.
- **Il wordmark che svanisce resta un link largo quanto il nome.** Il nome è trasparente e non c'è più, ma un tocco su quello spazio porta comunque in cima. Accorciare il link sarebbe un cambio di layout.
- **Il −1 a zero** è `--ink-disabled` (1.9:1): esente da WCAG, e non è mai l'unico segnale, come nell'app. Un tocco sul pannello a set finito rifà la battuta e ora lo dice anche allo screen reader (L12).
- **`theme-color` resta carta anche sopra l'inchiostro di `#numeri` e `#wrapped`.** È la regola di UX LC13, non toccata.
- **Non verificato su dispositivi veri**: Safari iOS (vetro `-webkit-`, nessuna timeline di scroll, quindi la versione ferma voluta da MOTION RL1) e Android.

### Come rifare le misure

```sh
npm run build && npx vite preview --port 5199 --strictPort --host 127.0.0.1   # una porta propria, mai la 5173
node docs/qa/landing.mjs tutto            # oppure: axe | tab | sweep | targets | cls | reduced | perf | numeri
FLAT=1 V=1 INC=1 node docs/qa/landing.mjs axe   # senza gradienti, coi nodi e coi contrasti incompleti
ALL=1 node docs/qa/landing.mjs tab        # ogni fermata, con quanto si vede l'anello
CSS='.barra{--focus-ring:#1C1C1E!important}' node docs/qa/landing.mjs tab   # rimette un difetto: la prova deve trovarlo
```

`LBASE` cambia l'URL e `W` le larghezze; `PORTA_CDP` vale 9343 di serie. Sotto i 900px la pagina si apre come Safari 26 su iPhone; `ANDROID=1` usa invece Chrome. Ogni caricamento è una prima visita: `bvd_landing_fermo` e `bvd_landing_visti` si azzerano, perché il profilo di Chrome resta fra un giro e l'altro.
