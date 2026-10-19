# POLISH.md — la rifinitura dopo il refactor «Bagnasciuga»

Giro di rifinitura (ruolo 5) sull'interfaccia già costruita: breakpoint veri, dati veri e dati estremi, tastiera senza mouse, axe nel browser, contrasto anche in hover, reduced-motion, prestazioni misurate sulla build di produzione. Tutto quello che si cita qui si rifà con gli script in [`docs/qa/`](docs/qa/) (in fondo il come).

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
