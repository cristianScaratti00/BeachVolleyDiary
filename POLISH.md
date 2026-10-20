# POLISH.md — la rifinitura dopo il refactor «Bagnasciuga»

Giro di rifinitura (ruolo 5) sull'interfaccia già costruita: breakpoint veri, dati veri e dati estremi, tastiera senza mouse, axe nel browser, contrasto anche in hover, reduced-motion, prestazioni misurate sulla build di produzione. Tutto quello che si cita qui si rifà con gli script in [`docs/qa/`](docs/qa/) (in fondo il come).

La landing `/presentazione` ha il suo giro, con un suo script: è la [Parte L](#parte-l--la-landing-presentazione), in fondo.

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

## Il giro del 20 ottobre 2026: l'app dopo la versione D

Un secondo giro sull'app intera, dopo il redesign Liquid Glass, Solby e la landing. Le stesse prove sull'anteprima (`docs/preview`) a 390 con la tacca simulata (`--safe-top: 59px`), più gli stati `?vuoto`, `?fallito` ed `?estremo`; le prestazioni sulla build di produzione dell'anteprima.

### Cosa è stato sistemato

| # | Difetto trovato (com'era misurato) | Correzione | Dopo |
|---|---|---|---|
| 1 | **Il service worker non lo registrava nessuno**: lo faceva `presentazione/js/install.ts`, uscito con «Controluce». Chi arrivava da allora non aveva la pagina offline | lo registra l'app (`src/main.tsx`), in produzione, al `load` | — |
| 2 | **La Fase della Partita live usciva dallo schermo**: le chip erano il filtro che scorre (`FilterChips`), e a 390 «Finale» restava tagliata al bordo. Nel foglio «Nuova partita» la stessa scelta va a capo | `SheetChips`, come nel foglio | le cinque fasi su due righe, a 320 e a 390 |
| 3 | **Le chip di «Dove succede» (Segnala) erano una copia a mano** di `SheetChips`: stesso disegno, stessa scelta con `aria-pressed`, un foglio a parte | `SheetChips`; tolto il CSS doppio | stesso aspetto, l'etichetta come gli altri campi |
| 4 | **Bersagli delle chip a 42** (Tornei, Mappa): la riga che scorre teneva 4px sopra e sotto, tarati sulle chip da 36; con quelle da 34 il `::after` da 44 veniva tagliato | lo spazio della riga è `max(--focus-reach, (--touch − --chip-h) / 2)` | 44 |
| 5 | **«Tutti i tornei» in Home a 38**: sotto, a 6px, comincia il collegamento della prima riga, che si prendeva un pezzo del bersaglio | il bersaglio cresce più verso l'alto | 44 |
| 6 | **Col movimento ridotto la lente della TabBar scivolava ancora** (`reduced`: una transizione di `transform` da 200ms cambiando tab): la radice di `liquid-glass-react` porta un suo `transition: all 0.2s`, e la regola spegneva solo `.glass` | con reduced-motion, nessuna transizione in tutto lo strato di vetro | la lente salta |
| 7 | **Due nomi per la stessa azione**: «Usa l'assistente» negli stati vuoti di Home e Tornei e nel foglio «Nuovo torneo», «Raccontalo a Solby» nel ＋ | «Raccontalo a Solby» ovunque (UX §12) | — |
| 8 | **`Button` leggeva `offsetWidth` dopo ogni disegno** (la larghezza di riposo per «Salvataggio…»): ogni render di ogni pulsante costringeva il browser a impaginare | la misura la dà un solo `ResizeObserver` per tutti i pulsanti, a impaginazione fatta | aprendo «Nuovo torneo», da 2 fotogrammi lunghi a 1 |
| 9 | **Gli script di QA erano rimasti alla struttura di prima**: `reduced.mjs` e `perf.mjs` cercavano la tab Tornei con `href="/tornei"` (oggi ricorda la vista: `/tornei/mappa`) e aprivano la prima voce del ＋ (oggi la Partita live, a schermo intero); `perf.mjs` cercava la terza vista di Tornei (il Diario è una tab) e righe `ui-card-link` | le tab per `href*=`, la voce «Torneo» per nome, i passi sulle viste di oggi; in più lo scroll del Diario | girano da capo a fondo |

### Cosa è stato misurato

| Cosa | Risultato |
|---|---|
| axe nel browser, 14 rotte e gli overlay a 390 e 1280 (FLAT=1) | 0 violazioni fuori dal menu ＋ (sotto, compromessi) |
| Tab, a 390 e 1280 | nessun anello mancante, tagliato o coperto; i soli `ui-card-link` di Compagni, falsi positivi noti (l'anello è sul genitore) |
| Bersagli (portati al centro dello schermo) | 44 ovunque, tranne il campo di ricerca (42, già fra i compromessi) |
| Sweep 320 · 390 · 768 · 1280, dati normali ed estremi | nessuno scroll orizzontale, nessun testo che esce (il solo «SPILL» di «Tutti» è il suo `::after`, non il testo) |
| Reduced motion | nessuno spostamento: restano le dissolvenze e le salite a 0px |
| La TabBar ferma (`barra.mjs`) | ferma |
| Contrasto in hover e premuto | ≥ 6.08 |
| Prestazioni (CPU 4×, `?estremo`), tre giri | caricamento FCP 268–308 · LCP 1.112–1.140 · TBT 51–99ms; apertura di «Nuovo torneo» un fotogramma da 100–150ms, interazione 144–184ms; scroll del Diario e di Tornei 0 fotogrammi lenti |

### Compromessi noti, di questo giro

- **Le superfici di vetro visibili sono più di 3** (UX §10, MOTION R5): 6 nel Diario, 5 nel dettaglio torneo, nel dettaglio compagno e in Statistiche. È il vetro della versione D, voluto dall'utente in tutta l'app. Misurato: il Diario scorre senza un fotogramma lento a CPU 4× (109 su 109 sotto i 17ms). Il budget va riscritto o il vetro ridotto: è una scelta da fare, non un difetto.
- **Aprire «Nuovo torneo» costa un fotogramma da 100–150ms a CPU 4×** (era 33–50 nel primo giro): è l'impaginazione del foglio sopra la Home, ~85ms a CPU 4× (~21ms veri). L'interazione resta sotto i 200ms («buona» per Web Vitals). Toglierlo vorrebbe dire non bloccare lo scroll della pagina sotto o tenere il foglio montato.
- **axe, menu ＋ a 390: contrasto 2.63 sulle etichette della TabBar.** Mentre il foglio del menu sale, la TabBar sta sopra il velo; a foglio fermo è coperta e non si legge. Resta anche il `region` del primo giro.

### Come rifare le misure di questo giro

```sh
# l'anteprima su una porta propria (mai la 5173)
VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=x npx vite --port 5198 --strictPort
BASE=http://127.0.0.1:5198/docs/preview/ node docs/qa/reduced.mjs
# prestazioni: build di produzione dell'anteprima con una config temporanea
# (input docs/preview/index.html, lo stesso manualChunks di vite.config.ts),
# poi `vite preview` su 4173
PBASE=http://127.0.0.1:4173/docs/preview/index.html QS=estremo node docs/qa/perf.mjs
```

---

## Parte L — la landing `/presentazione`

Il giro sulla landing rifatta dalla tavola «Landing page» di Claude Design (UX, ART_DIRECTION e MOTION, Parte L), il 20 ottobre 2026, e la sua rifinitura dello stesso giorno: l'apertura della Home nel telefono dell'hero, il telefono come primo schermo, la pulizia di «Controluce»; poi, la sera, il giro di `#schermate` e le nove carte. Misurata sulla **build di produzione** servita da `vite preview`, in Chrome headless, con [`docs/qa/landing.mjs`](docs/qa/landing.mjs). Sotto i 900px la pagina si apre come Safari su iPhone. Il giro su «Controluce», che c'era prima, è nella storia di git fino al commit `a9793f3`.

### Cosa è stato sistemato

| # | Difetto trovato (com'era misurato) | Correzione | Dopo |
|---|---|---|---|
| 1 | **La vecchia landing ancora nel repository**: `presentazione/js/` (15 moduli), 11 fogli, `fermo.js`, 6 schermate WebP, `tsconfig.landing.json` e cinque file di test che la montavano. 85 test rossi, fra cui quello che vuole ogni foglio della cartella importato | tolti (restano nella storia, `a9793f3`), con le demo `L1`–`L5` di `docs/motion` | 64 file, tutti verdi |
| 2 | **La pagina era ferma**, e la richiesta era presentare l'app | l'apertura della Home nel telefono dell'hero, quella dell'app (MOTION.md, Parte L) | sotto |
| 3 | **Le sei carte sul telefono**: alte una sopra l'altra, ~1.400px di scroll per sei frasi | un gruppo solo, come le liste raggruppate dell'app | con le altre correzioni sul telefono (5, 6), la pagina a 390 passa da 4.744 a 4.047px |
| 4 | **La fila dei telefoni** trabocca già a 1024: il terzo telefono tagliato al bordo della colonna, e lo scorrimento taglia l'ombra lunga dei telefoni in un rettangolo chiaro (visibile a 768 e 1024) | prima una fila in riga e un carosello sotto i 700px; la sera la fila è diventata il giro (sotto) | nessun taglio |
| 5 | **Le due porte sul telefono**: due capsule di larghezze diverse (180 e 185) una sopra l'altra | sotto i 480px una per riga, larghe quanto la colonna | — |
| 6 | **216px fra una sezione e l'altra** anche sul telefono | 72–88 sotto gli 820px | — |
| 7 | **Anello della fila fuori dallo schermo** (introdotto dal carosello da bordo a bordo: `tab` CLIP:BODY a 390) | anello rientrato; poi la fila è uscita col giro, e con lei la sua fermata | 0 difetti |
| 8 | **Le schermate senza parole e le funzioni che mancavano**: Partita live, Raccontalo a Solby, Storia Instagram, Chi c'è oggi e i compagni collegati non comparivano | il giro: sei momenti con la schermata vera e due righe, che si sfogliano scorrendo (MOTION.md, Parte L, L2); le carte da sei a nove | `giro`: la scena resta ferma e a ogni tratto si vede il suo momento, 6 su 6 |

E un difetto trovato e **non** sistemato qui, perché sta nell'app: il service worker (`public/sw.js`, la pagina offline e l'installabilità) lo registrava `presentazione/js/install.ts`. La landing nuova non ha JavaScript, e oggi nessuno lo registra: chi arriva adesso non ha la pagina offline. Va registrato da `src/main.tsx`.

### L'apertura: le misure

Il tabellone disegnato dalla landing contro le cifre della Home vera, sovrapposti in `difference` e allineati cercando lo scarto che li fa coincidere (dpr 4, telefono a 304px): in orizzontale 0; in verticale 0.3 (63), 1.0 (+36 e 5) e 1.6 (1) pixel dell'app, tutti verso l'alto. È l'arrotondamento delle metriche del carattere alla taglia del telefono (18.7px invece di 24). Per questo le cifre della landing ci sono solo mentre girano: da ferma la schermata è l'immagine della Home vera, e il cambio a 1.650ms non si vede (i fotogrammi a 1.640 e 1.700ms sono uguali).

### Cosa è stato misurato

| Cosa | Risultato |
|---|---|
| axe nel browser (WCAG 2.0/2.1/2.2 AA e best practice), a ogni sezione, a 390, 1280 e 844 × 390 | 0 violazioni |
| Giro del Tab: anello presente, non tagliato, non coperto, e quanto si vede (pixel acceso contro spento, almeno 3) | 0 difetti: 7 fermate a 390, 10 a 1280 |
| Il giro di `#schermate`: a metà di ogni tratto la scena è in cima e si vede un momento solo, quello giusto | 6 su 6 a 390 (422px per momento) e a 1280 (400px); con reduced-motion e a 844 × 390 è l'elenco fermo, 6 momenti visibili su 6 |
| Viewport allargato, scroll orizzontale, testo che esce o tagliato, immagini senza misure: 320, 360, 390, 768, 820, 1024, 1280, 1440 e 844 × 390 | 0 |
| Bersagli sotto 44 (l'area che risponde davvero), a 390, 1280 e 844 × 390 | 0 |
| CLS al caricamento con Geist in ritardo di 1.5s, poi tutta la pagina giù e su | 0 a 390; 0.0001 a 1280 (le voci della testata) |
| Reduced motion | niente in moto; la pressione a 1; nessuno strato sopra la Home |
| L'apertura | a 1280 e 768 parte al caricamento e dopo 2.4s gli strati non ci sono più; a 390 e a 844 × 390 è legata allo scroll e gli strati se ne vanno col telefono in vista |
| Caricamento con CPU 4× (FCP · LCP · TBT) | 80ms · 80ms (il telefono dell'hero) · 0 |
| Fotogrammi sopra 25ms scorrendo ogni sezione con un gesto vero (CPU 4×), il giro compreso | 0 |
| Richieste dal caricamento al fondo | 13, tutte verso il sito |
| Bundle gzip: HTML · CSS · JS | 5.03 · 8.39 KB · nessuno |

### Compromessi noti

- **CLS 0.0001 a 1280 col font in ritardo**: le voci della testata (Geist 600) e la loro riserva Arial differiscono di un soffio in larghezza. È mille volte sotto la soglia di 0.1.
- **axe lascia «contrasto incompleto» su 2 nodi a 390**: nodi che axe non sa leggere sopra il fondo; i ruoli del testo li ricalcola `landing.tokens.test.ts`.
- **Il giro è lungo**: la scena resta ferma per 300svh di scroll (2.400px su un portatile alto 800). È il prezzo della scena che si ferma; chi va di fretta ha «Iscriviti» nella testata.
- **Col giro in movimento i momenti nascosti restano nel documento**: un «trova nella pagina» li trova anche quando non si vedono.
- **Dove `animation-timeline` non c'è** (Firefox), sul telefono l'apertura va a tempo al caricamento, fuori vista: si arriva comunque alla Home vera, senza aver visto il giro delle cifre. Il giro di `#schermate` lì è l'elenco fermo.
- **+1.5 KB gz di CSS e una schermata in più (50 KB)** per l'apertura; la schermata si chiede solo con il movimento consentito.
- **Non verificato su dispositivi veri** (Safari iOS, dove le animazioni legate allo scroll ci sono da Safari 26; Android).

### Come rifare le misure

```sh
npm run build && npx vite preview --port 5199 --strictPort --host 127.0.0.1   # una porta propria, mai la 5173
node docs/qa/landing.mjs tutto            # oppure: axe | tab | giro | sweep | targets | cls | reduced | apertura | perf | rete
W=844 H=390 node docs/qa/landing.mjs sweep,axe,targets,apertura,giro   # il telefono in orizzontale
ALL=1 node docs/qa/landing.mjs tab        # ogni fermata, con quanto si vede l'anello
CSS='.cta{outline:none!important}' node docs/qa/landing.mjs tab   # rimette un difetto: la prova deve trovarlo
node docs/qa/landing-shots.mjs            # schermate, Home senza cifre e misure.css, insieme
```

`LBASE` cambia l'URL, `W` le larghezze e `H` l'altezza; `PORTA_CDP` vale 9343 di serie. `ANDROID=1` apre la pagina come Chrome invece che come Safari.
