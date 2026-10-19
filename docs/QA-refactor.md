# QA del refactor «Liquid Glass» / «Bagnasciuga»

L'inventario degli stati di [UX.md §6](../UX.md) come lista di controllo: per ogni stato, **dove** è verificato. Tre livelli:

- **jsdom** — Vitest + Testing Library + axe (`npm test`). Ruoli, nomi, tastiera, focus, history, testi. Il test dell'app intera è [`src/app/AppView.test.tsx`](../src/app/AppView.test.tsx): monta `AppView` con un diario in memoria ([`src/test/app.tsx`](../src/test/app.tsx)) e ci si muove come un utente.
- **browser** — gli script CDP di [`docs/qa/`](qa/) sull'anteprima `docs/preview` (comandi in [POLISH.md](../POLISH.md)). Layout, anelli di focus, bersagli, overflow per breakpoint, vetro, contrasto in hover, reduced-motion e reduced-transparency veri.
- **manuale** — quello che serve un dispositivo vero (§14.3).

Ultimo giro: 2026-10-19, Chrome 154 headless, larghezze 320 · 359 · 390 · 600 · 899 · 900 · 1280.

## Difetti trovati da questo giro (e corretti)

| # | Difetto (come si vedeva) | Dove | Correzione | Test che lo blocca |
|---|---|---|---|---|
| Q1 | **Il focus usciva dal dialogo appena aperto.** ＋ → «Nuovo torneo»: lo sheet metteva il focus nel campo, poi il menu che usciva lo riportava al ＋, dietro al velo. Tab e lettere finivano nella pagina sotto. Idem «⋯» → «Elimina torneo» (focus su «Altre azioni» con l'alertdialog aperto) e ＋ → «Check-in oggi» (il focus tornava al ＋ invece che all'h1 di `/oggi`). Nascosto in sviluppo dal doppio effetto di StrictMode; misurato sulla build di produzione dell'anteprima. | `useReturnFocus` (`src/components/ui/overlay.ts`) | chi esce rimette il focus solo se è rimasto senza casa (body, nodo staccato, dentro un overlay `inert` o dentro sé stesso); se un altro overlay o la rotta nuova l'ha già preso, non lo tocca | `menu ＋ › «Nuovo torneo» sostituisce il menu…`, `conferme distruttive › Elimina torneo…`, `menu ＋ › «Check-in oggi» è una rotta…` |
| Q2 | **«Scarta» mandava il focus all'h1** invece che al ＋ che aveva aperto lo sheet: il dialogo, aperto da un pulsante dello sheet che stava uscendo anche lui, ricadeva sull'h1 | `restoreFocus` | un opener dentro un overlay che esce lascia il focus a quell'overlay, che lo rende al suo opener | `sheet › sporco: «Scarta» chiude entrambi e il focus torna al ＋` |
| Q3 | **Primo caricamento fallito senza ritorno** se `AppView` si monta già fallita (`?fallito` dell'anteprima): «Riprova» riusciva ma l'ErrorState restava | `useScreenData` | il riferimento ai dati del fallimento parte anche dal montaggio | `useScreenData › montato già fallito…` |

## 6.0 Stati trasversali

| Stato | Verifica |
|---|---|
| Avvio: splash unico; dopo 10s «Ci sta mettendo più del solito.» + Riprova | jsdom `Splash.test` (il conto parte dall'apertura della pagina, non dal montaggio) |
| Primo caricamento fallito → ErrorState nella shell, TabBar visibile, Riprova | jsdom `AppView › stati di §6 › primo caricamento fallito…`, `…offline: il testo lo dice`; `useScreenData.test` |
| Chunk lazy in caricamento → skeleton `aria-busy` | jsdom `Tornei.test › in Timeline il diario arriva dal suo chunk`, `ChiCeOggi.test › skeleton occupato` · browser `sweep.mjs` (nessun buco al posto del chunk) |
| Chunk lazy fallito → «Questa parte non si è caricata.» + Riprova | jsdom `LazyBoundary.test` |
| Offline dopo l'avvio: «Sei offline» persistente; scritture con il testo dedicato e sheet aperto | jsdom `AppView › avvisi › offline…`, `sheet › offline: il salvataggio fallito…` |
| Connessione lenta | browser (Chrome headless la dichiara: `SLOWNET=1` per vederla) |
| Torneo condiviso: etichetta, niente modifica, Storia sì | jsdom `AppView › torneo condiviso…`, `TorneoDetail.test › sola lettura` |

## 6.1 Home

| Stato | Verifica |
|---|---|
| Primo avvio: banner, EmptyState, link assistente, card check-in, niente numeri | jsdom `AppView › primo avvio: Home vuota…`, `Home.test` |
| Tornei senza partite: nota + «Aggiungi partita» | jsdom `Home.test › tornei senza partite…` |
| *Adesso*: oggi/prossimo, ultimo risultato, «Com'è andata» | jsdom `Home.test` (4 test) |
| Wrapped solo se disponibile | jsdom `Home.test › Beach Wrapped compare solo…` |
| Banner chiuso resta chiuso, per utente | jsdom `AppView › banner alpha › chiuso resta chiuso dopo un refresh…` |
| Ordine di tabulazione | jsdom `AppView › shell › mobile: il primo Tab…` · browser `tab.mjs` (anello, coperto, CLIP: 0) |

## 6.2 Statistiche

| Stato | Verifica |
|---|---|
| 0 partite nel periodo, filtri, un solo annuncio | jsdom `Statistiche.test` |
| Layout a 1 colonna / griglia | browser `sweep.mjs` (0 overflow 320–1280) |

## 6.3 Tornei (Lista · Timeline · Mappa)

| Stato | Verifica |
|---|---|
| Primo avvio: UN EmptyState, senza ricerca né segmented | jsdom `AppView › primo avvio: Tornei…`, `Tornei.test` |
| Sottotitolo dal vivo (#1), filtro scartato (#2) | jsdom `Tornei.test › il sottotitolo si accorda…`, `…un filtro scartato non si riattiva…` |
| Ricerca, 0 risultati, Esc, `/` | jsdom `Tornei.test`, `Timeline.test` |
| Mappa: stagione vuota, tile non caricate, bucket, pin approssimati | jsdom `Mappa.test` |
| Cambio di vista in `replace`, focus fermo sul segmento | jsdom `AppView › navigazione › il segmented cambia vista…` |
| Utente esperto (`?estremo`: 44 tornei, nomi lunghi, stringhe vuote) | browser `QS=estremo sweep.mjs` |

## 6.4 Dettaglio torneo

| Stato | Verifica |
|---|---|
| Non trovato (mai la lista) | jsdom `AppView › un torneo che non c'è…`, `TorneoDetail.test` |
| 0 partite, 0 foto, senza luogo, foto legacy | jsdom `TorneoDetail.test` |
| Successo / errore di scrittura (Toast, si resta) | jsdom `AppView › conferme distruttive` (eliminazioni riuscite e fallite) |
| Indietro dal dettaglio: focus alla card | jsdom `AppView › navigazione › dettaglio dalla lista e ‹ Indietro…` |

## 6.5 Visori

| Stato | Verifica |
|---|---|
| Lightbox: «Foto i di n», ✕ a t0, trappola, ←/→, Esc, indietro | jsdom `AppView › visori › lightbox…`, `…il tasto indietro chiude il lightbox…` |
| Storia: dialog, ✕ a t0, colore a radiogroup con le frecce | jsdom `AppView › visori › Storia…` |
| Wrapped: fuori stagione, pochi dati, «Preparo…», errori, condivisione | jsdom `Wrapped.test`, `WrappedModal.test` |
| PNG col font giusto, senza blur, zone sicure | manuale/harness di produzione (memoria `export-immagini-html-to-image`) |

## 6.6 Compagni

| Stato | Verifica |
|---|---|
| Vuoto con CTA, non trovato, 0 partite insieme | jsdom `AppView`, `Compagni.test`, `CompagnoDetail.test` |
| Collega: < 3 lettere, Cerco…, nessuno, errore | jsdom `CollegaSheet.test` |
| Elimina / Scollega con conferma, `replace` alla lista | jsdom `AppView › conferme distruttive` |

## 6.7 Chi c'è oggi

| Stato | Verifica |
|---|---|
| Modulo, stanza bloccata, in check-in, vuota, filtro, aggiunto, errori | jsdom `ChiCeOggi.test` |
| Termina check-in con conferma | jsdom `AppView › Termina check-in` |

## 6.8 Profilo, Segnala, Segnalazioni

| Stato | Verifica |
|---|---|
| Avatar, nome, password, condivisioni, OAuth, admin | jsdom `Profilo.test`, `PasswordSheet.test` |
| Togli condivisioni, Esci con conferma | jsdom `AppView › conferme distruttive` |
| Segnala e bacheca admin | jsdom `Segnala.test`, `Segnalazioni.test` |

## 6.9 Login · 6.10 Assistente

| Stato | Verifica |
|---|---|
| Login: etichette, errori `alert`, invio in sola lettura, offline | jsdom `Login.test` |
| Assistente: focus al dock, un indicatore, successo parziale, un canale d'errore, guardia dell'indietro | jsdom `CreaChat.test`, `router.test` |
| `/crea` a tutto schermo (niente TabBar, Sidebar su desktop) | jsdom `AppView › breakpoint › /crea è a tutto schermo…` |

## Contratti trasversali (§7, §8, §9)

| Contratto | Verifica |
|---|---|
| Menu ＋: ordine, sottotitoli, frecce/Home/Fine, Esc, Tab, Annulla, indietro, popover desktop | jsdom `AppView › menu ＋` (9 test) |
| Sheet: dialog, trappola, Esc, guardia sporco (Esc, Annulla, indietro), disattivo che spiega, occupato, errore, refresh | jsdom `AppView › sheet` (12 test), `Sheet.test` (10, invariati) |
| ConfirmDialog per ogni riga di §7.7: titolo, conseguenza, focus su Annulla, Esc, esito | jsdom `AppView › conferme distruttive` (12 test) |
| Toast: regione sempre montata, errore persistente con «Chiudi avviso» | jsdom `AppView › avvisi` |
| Focus all'h1 e `document.title` a ogni rotta; ritorno alla card | jsdom `AppView › navigazione` |
| Landmark, «Vai al contenuto», ordine DOM (mobile main → TabBar, desktop Sidebar → main) | jsdom `AppView › shell` |
| Sidebar/TabBar ai due lati di 900, TabBar nascosta con la tastiera su | jsdom `AppView › breakpoint` |
| TabBar con un ConfirmDialog aperto (§7.1) | browser, 390: il dialogo a forma di action sheet la copre per intero (al centro della barra risponde il dialogo); la trappola del focus la tiene fuori dal Tab. Da 600 a 899 resta visibile sotto il velo (vedi «Scostamenti») |
| Tocco: sheet aperto col dito → focus al titolo (M3) | jsdom `AppView › tocco` |
| Reduced motion: ritocco della tab senza smooth; flussi che arrivano in fondo | jsdom `AppView › reduced-motion` · browser `reduced.mjs` (nessuna traslazione, pillole a scatto) |
| Reduced transparency: vetro opaco | browser `TRANSP=1 reduced.mjs` |
| axe | jsdom: ogni schermata e primitiva + `AppView › axe sui flussi principali` (7 test, 12 scene) e `AppView › visori › axe…`; browser `axe.mjs`: 42 scene, 0 violazioni WCAG (resta il `region` best-practice del menu ＋, compromesso di POLISH.md) |
| Anello di focus visibile, non coperto, non tagliato | browser `tab.mjs`: 0 fermate segnalate su 8 rotte |
| Bersagli ≥ 44 | browser `targets.mjs`: restano le eccezioni dichiarate in POLISH.md (campo di ricerca, 39 di area utile; link nel testo del banner; cluster della mappa, 41) |
| Nessuno scroll orizzontale | browser `sweep.mjs`: 0 su 14 rotte × 7 larghezze, dati normali ed estremi |
| Contrasto, anche in hover/premuto | jsdom `tokens.test`, `contrast.test` · browser `hover.mjs` |

## Scostamenti dalle specifiche lasciati aperti

- **TabBar con un ConfirmDialog, da 600 a 899** (UX §7.1 la vuole nascosta): il dialogo è centrato e la barra resta visibile, attenuata, sotto il suo velo. Non si raggiunge (velo che intercetta il tocco, trappola del focus), ma si vede. Sotto i 600 il dialogo la copre.
- **Nome accessibile di ‹ Indietro**: è il solo titolo della schermata precedente («Tornei», «Profilo»), come l'etichetta visibile. Con la tab omonima nella stessa pagina uno screen reader sente due «Profilo» (un pulsante e un link).
- **Regressione visiva**: il repo non ha uno strumento di confronto per immagini (gli script di `docs/qa` fanno screenshot ma non baseline). Non se n'è introdotto uno.

## Solo su dispositivo vero (§14.3)

Safari iOS e Chrome Android: indietro/avanti e sheet col tasto indietro, tastiera virtuale negli sheet, `-webkit-backdrop-filter`, fluidità con 3 superfici sfocate, *Riduci trasparenza* e *Contrasto elevato*, VoiceOver e TalkBack su card, menu ＋, sheet e assistente; `/presentazione` servita e `offline.html` dal service worker in modalità aereo; PNG di Storia e Wrapped.
