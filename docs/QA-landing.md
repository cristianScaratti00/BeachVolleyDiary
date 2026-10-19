# QA della landing `/presentazione` («Controluce»)

L'inventario degli stati di [UX.md §L6](../UX.md) e i contratti di §L7–§L9 come lista di controllo: per ogni stato, **dove** è verificato. Tre livelli, come per l'app ([QA-refactor.md](QA-refactor.md)):

- **jsdom**: Vitest, Testing Library e axe (`npm test`). Ruoli, nomi, tastiera, focus, history, testi, soglie e tempi. La pagina viva la monta [`src/test/landing.ts`](../src/test/landing.ts):
  - l'HTML finito di `componiLanding`, poi `fermo.js` e i moduli veri da capo;
  - un'impaginazione finta ma coerente, misurata da un IntersectionObserver con la regola vera (rootMargin, soglie, prima notizia asincrona);
  - scroll a passi con l'evento `scroll`, e tempo finto (`passa`).

  I test sono questi:
  - [`landing.test.ts`](../src/test/landing.test.ts): l'HTML e i fogli letti come testo, §L14.1;
  - [`landing.vivo.test.ts`](../src/test/landing.vivo.test.ts): barra, salti, guida, menu, fermo, giro del Tab, misure, axe;
  - [`landing.sezioni.test.ts`](../src/test/landing.sezioni.test.ts): tablist e chat, demo live, numeri, mappa, Wrapped, telefono, finale;
  - [`landing.installa.test.ts`](../src/test/landing.installa.test.ts): pulsanti, prompt nativo, foglio, varianti;
  - [`PartitaLive.regole.test.ts`](../src/screens/PartitaLive.regole.test.ts): le regole condivise con l'app.
- **browser**: [`docs/qa/landing.mjs`](qa/landing.mjs) sulla **build di produzione** (`npx vite preview --port 5199`), Chrome headless su CDP 9343. Misura layout, anelli di focus (con la loro visibilità in pixel), bersagli, overflow per breakpoint, vetro, CLS, prestazioni a CPU 4×, reduced-motion vero, richieste di rete e tocchi veri (`Input.dispatchTouchEvent`).
- **manuale**: quello che serve un dispositivo vero (§L14.4).

Ultimo giro: 2026-10-20, Chrome headless (macOS). Larghezze 320 · 360 · 390 · 768 · 844×390 (telefono in orizzontale) · 1024 · 1280 · 1440.

## Difetti trovati da questo giro (e corretti)

| # | Difetto (come si vedeva) | Dove | Correzione | Test che lo blocca |
|---|---|---|---|---|
| L1 | **La nuvoletta di Pallo della demo live arrivava agli screen reader.** UX §L7.6 la vuole `aria-hidden`, come `.live-pallo` nell'app (`PartitaLive.tsx:629`). Nella demo viva il campo perde `role="img"` e la battuta («Bel punto! Avanti così.», «Tocca tu: chi fa punto?») si leggeva come testo fra i due pannelli. Così le notizie arrivavano due volte: una dallo status, una dalla nuvoletta. | `presentazione/index.html`, `.demo-mezzo` | `aria-hidden="true"` sul contenitore di Pallo e della nuvoletta; la nuvoletta rimontata da `live.ts` resta dentro | `landing.test.ts › #live: un tabellone fermo…`, `landing.sezioni.test.ts › Pallo e la sua nuvoletta sono aria-hidden…` |

## Scostamenti dalle specifiche lasciati aperti (da decidere)

- **«Ferma le animazioni» è la 10ª fermata del Tab sul telefono (11ª da 900px).** UX §L8.7 la vuole «entro le prime 8 fermate», ma l'ordine che la stessa UX fissa in §L8.1 ne mette almeno 8 prima:
  - il salto al contenuto;
  - le 4 tab e il ＋;
  - «Crea il tuo diario» e «Ho già un account»;
  - più «Installa sul telefono» quando c'è, e il marchio della barra da 900px.

  Il codice segue §L8.1: lo fissa `landing.vivo.test.ts › il giro del Tab`, e il browser lo conferma. Le due regole non stanno insieme: o si sposta il comando prima dei CTA (cambia §L8.1), o il «primi 8» diventa «primi 10».
- **Deep link e ricarica: gli effetti già superati.**
  - UX §L4.2: «Gli effetti delle sezioni già superate vanno allo stato finale».
  - MOTION §L4.2: «fuori vista, sopra o sotto, si arma; scatta la prima volta che entra».

  Il codice segue MOTION, e i test pure (`deep link a #live: … il ＋ sopra, armato, si apre risalendo`). MOTION §L13 non elenca questo punto fra i suoi scostamenti (ML1–ML18).
- **Il fuoco si perde quando il pulsante d'installazione sparisce.** Succede in tre casi:
  - prompt nativo accettato;
  - prompt nativo rifiutato;
  - `appinstalled` col foglio aperto (il fuoco torna al pulsante, che subito dopo diventa `hidden`).

  I pulsanti diventano `hidden` col fuoco addosso, e il browser rimanda il fuoco al body. È contro UX §L8.2 («mai su un elemento nascosto»), ma la UX non dice dove deve andare. Proposto come attività a parte.
- **Il registro della chat è una fermata del Tab** (`tabindex="0"`, «Conversazione con Pallo»), che §L8.1 non elenca. È giusto così: è un contenitore che scorre (ML10), e da tastiera si deve poter scorrere. Lo fissa il test del giro del Tab.
- **Vetro col foglio aperto dall'hero: 3 superfici** (capsula, «Ho già un account» in `glass-clear`, foglio). È il tetto di MOTION R5, e il caso peggiore che UX §L10 accetta «contato». La tabella di §L10 diceva «barra + foglio = 2». Dal menu o dal finale restano 2.

## L6.0 Stati trasversali

| Stato | Verifica |
|---|---|
| Senza JavaScript: tutti i testi, ancore native, tabellone fermo `role="img"`, chat già scritta, Wrapped manuale, niente guida né pulsanti d'installazione | jsdom `landing.test.ts › le sezioni senza JavaScript` (10 test), `CSP`, `struttura` |
| Un modulo fallisce: le altre parti partono, la sua sezione resta di base | jsdom `landing.vivo › un modulo che fallisce non ferma gli altri…` (rompe `CSS.supports`: Wrapped resta manuale, il resto è vivo, l'errore è nel log) |
| Rete lenta: CLS 0 col cambio di carattere | browser `landing.mjs cls` (Geist in ritardo di 1,5 s: CLS 0 a 390 e 1280) |
| Offline: le immagini mancanti lasciano le forme, senza icona rotta | jsdom `landing.sezioni › un'immagine che non arriva lascia le forme…` (`data-errore`) |
| Movimento ridotto / «Ferma le animazioni» | jsdom: autoplay, numeri, chat, ＋, pin, Wrapped, guida senza salto, vibrazione (14 test); browser `landing.mjs reduced`: niente in moto a 390 e 1280, coi due interruttori |
| Prima visita / ritorno nella sessione | jsdom: `bvd_landing_visti` per salto, battute, ＋, numeri, autoplay (`… già visto nella sessione …`, `… mai due volte nella sessione`) |
| Memoria che lancia (navigazione privata) | jsdom `landing.vivo › senza memoria (accesso che lancia)…` |
| Già installata (`display-mode: standalone`) | jsdom `landing.installa › già installata…` |
| Desktop: «Installa l'app» solo col prompt nativo; la riga «È fatta per il telefono» | jsdom `landing.installa › dal computer niente pulsante…` |
| Nessuna richiesta a terzi («Questa pagina», §L12.8) | browser `landing.mjs rete` |

## L6.1–L6.10 Le sezioni

| Sezione · stato | Verifica |
|---|---|
| Hero: CTA verso `/?accesso=…`, posto riservato del pulsante, comando fermo | jsdom `landing.test.ts › l'hero…`, `landing.installa › Safari su iPhone…`; browser `cls` (0) |
| Hero: la guida è fuori; tornando su esce e il Pallo dell'hero torna | jsdom `landing.vivo › in cima Pallo guida c'è ma è fuori scena`, `… tornando su nell'hero…` |
| #diario: lo schermo cambia a soglia (72% sotto 900, 50% da lì); skeleton → immagine; errore | jsdom `landing.sezioni › lo schermo segue il capitolo…`, `landing.vivo › il telefono di #diario cambia schermo al 72%…` |
| #registra: tablist verticale, roving tabindex, ↑ ↓ Home Fine, pannelli | jsdom `landing.sezioni › «Cosa registriamo?»` (6 test) |
| #registra: il ＋ armato fuori vista, si apre una volta; il fuoco lo apre subito (RL4); fermo o già visto: aperto | jsdom, idem |
| Chat: apertura già scritta, eco, fuoco al gruppo `aria-busy`, «pensa», domande di `copione.ts`, pausa saltata da un tasto, riepilogo, fine col fuoco, «Ricomincia» con `RIPARTENZA`, fermo senza pausa | jsdom `landing.sezioni › «Raccontalo a Pallo»` (6 test) |
| #live: pannelli `+1`/`−1` coi nomi e `aria-keyshortcuts` | jsdom `landing.sezioni › Partita live` (16 test) |
| #live: autoplay deterministico, senza annunci né vibrazione, una volta; spento dal primo tocco, dal fermo, dal fuoco | jsdom, idem |
| #live: status solo dai tocchi dell'utente, `vibrate(12)` solo senza fermo; scorciatoie solo col fuoco dentro | jsdom, idem |
| #live: −1 a zero, set point, vantaggi, set finito, «Chiudi il set», terzo set a 15, match point, riepilogo col fuoco, pannelli inerti, «Ricomincia», persa | jsdom, idem; `PartitaLive.regole.test.ts` (21 test) |
| #live a numeri estremi (vantaggi a 26–26) | browser `landing.mjs numeri` (niente overflow a 320, 390, 1280) |
| #numeri: armati a zero per gli occhi col valore vero nel testo; salgono una volta; deep link, già visti, fermo, ridotto: finali; il fuoco li chiude | jsdom `landing.sezioni › «I numeri li fa l'app»` (4 test) |
| #numeri con numeri enormi | browser `landing.mjs numeri` |
| #mappa: pin armati e caduti; fermo: posati; esito in testo | jsdom `landing.sezioni › i pin…`, `landing.test.ts › #mappa…` |
| #wrapped: bloccato (timeline, h ≥ 600, movimento) senza fermata; manuale altrimenti, anche ruotando | jsdom `landing.sezioni › Wrapped bloccato…`, `… senza timeline native…` |
| #wrapped: la Storia a ventaglio, con l'alt per impaginazione | jsdom `landing.sezioni › la Storia…` |
| #dati: righe senza link, solo fatti verificati | jsdom `landing.test.ts › #dati…`, `i testi dicono il vero` |
| Finale: `festa` col mouse (con hover) e con la tastiera; col dito no | jsdom `landing.sezioni › il finale` (4 test) |
| Guida: salto al primo scroll, battuta d'arrivo, una battuta per sezione a scroll fermo, mai due volte; esce in #live e non col fuoco addosso; deep link senza salto | jsdom `landing.vivo › Pallo guida` (6 test) |
| Guida: tocco, tocchi di fila, quinto tocco, tocco lungo (anche il menu contestuale), sonno e risveglio, mai col menu aperto, scroll veloce al più ogni 8 s | jsdom `landing.vivo › giocare con Pallo` (7 test) |

## Contratti (§L4, §L7, §L8, §L9)

| Contratto | Verifica |
|---|---|
| Barra: 4 tab, `aria-current="true"` per sezione (con le sezioni senza tab), ＋ verso `/` | jsdom `landing.vivo › la barra`, `landing.test.ts › la barra` |
| Il vetro della capsula scelto dal fondo che le passa sotto, in basso e in alto (900); rimisura al resize | jsdom `landing.vivo › la capsula sceglie il vetro…`, `le misure della pagina` |
| Salti istantanei, fuoco all'h2, `replaceState`; non contano come scroll veloce; il salto al contenuto resta nativo | jsdom `landing.vivo › una tab salta di colpo…` e seguenti |
| Menu della guida: disclosure, `aria-expanded`, fuoco alla prima voce, voce corrente, Esc → Pallo, ↑/↓, Maiusc+Tab → Pallo col menu aperto, Tab oltre l'ultima → chiuso, voce → salto, tocco fuori, «Ferma» lo lascia aperto | jsdom `landing.vivo › il menu «Dove vuoi andare?»` (7 test); browser `landing.mjs tab` (Enter → prima voce, Esc → Pallo) |
| Foglio: dialogo modale, fuoco al titolo, resto `inert`, scroll bloccato, Tab chiuso, Esc · × · «Ho capito» · velo, fuoco restituito (a Pallo se aperto dal menu), la guida esce | jsdom `landing.installa › il foglio d'istruzioni` (10 test); browser `landing.mjs tab` (Tab×4 dentro, Esc → pulsante), `tocco` |
| Varianti dei passi dallo user agent: ios26, ios, ios-altro, iPadOS, altro | jsdom `landing.installa › le istruzioni giuste…` (5 test) |
| Prompt nativo: accettato, rifiutato, fallito; `appinstalled` → status, guida in festa; service worker al load | jsdom `landing.installa › il prompt nativo` (4 test), `registra il service worker` |
| «Ferma le animazioni»: tre istanze in sincrono, `localStorage`, `fermo.js` prima dei moduli, `aria-disabled` col sistema ridotto (anche se cambia a pagina aperta) | jsdom `landing.vivo › «Ferma le animazioni»` (5 test) |
| Giro del Tab (§L8.1), col menu aperto, col foglio aperto, con «Chiudi il set» | jsdom `landing.vivo › il giro del Tab` (4 test); browser `landing.mjs tab` (390: 21 fermate, 1280: 22, 0 difetti) |
| Anello di focus visibile (≥ 3:1 in pixel), non coperto, non tagliato | browser `landing.mjs tab`: 0 difetti; la guida e la tab corrente sul buio e sulla carta: 15.7–17.0 |
| Bersagli ≥ 44 | browser `landing.mjs targets`: nessuno sotto 44 a 390, 1280 e 844×390 |
| Nessuno scroll orizzontale, niente SPILL/CLIP | browser `landing.mjs sweep`: pulito a 320–1440 e 844×390 |
| Vetro ≤ 3 | browser `landing.mjs sweep`: 2 a riposo, 2 col menu, 3 col foglio dall'hero |
| Tocco vero (eventi touch) | browser `landing.mjs tocco`; jsdom `col dito: un tocco su Pallo…`, `il tocco lungo col dito…` |
| axe | jsdom: pagina viva, menu aperto, fermo, foglio, demo a set finito e a fine partita; browser `landing.mjs axe` (FLAT=1): 29 scene a 390 e 1280, più 844×390, **0 violazioni** WCAG 2.2 AA e best-practice |
| HTML e CSS: CSP, un h1, id unici, riferimenti ARIA, alt e misure, meta, `@layer components`, niente colori letterali, `backdrop-filter`, `will-change`, `transition: all`, solo transform/opacity nelle animazioni | jsdom `landing.test.ts` (135 test, compreso il grafo degli import: da `main.ts` non si arriva a React, Supabase o a un `.tsx`) |
| Testi legati al codice: regole della partita, 20 partite tra amici, Wrapped a ottobre, «Gratis» solo coi piani spenti, niente promesse vietate da §L12.8, niente «＋» a tutta larghezza a schermo | jsdom `landing.test.ts › i testi dicono il vero` |

## Prestazioni (build di produzione, CPU 4×)

| Cosa | 390 | 1280 |
|---|---|---|
| FCP · LCP · TBT · CLS | 176 · 176 · 80 ms · 0 | 148 · 148 · 66 ms · 0 |
| Fotogrammi lenti (> 25 ms) scorrendo ogni sezione | 1 su 862 (83 ms, in #wrapped) | 0 su 864 |
| Interazioni (guida, foglio, tab, chat, demo) | INP ≤ 24 ms | INP ≤ 24 ms |
| Proprietà animate | transform, opacity | idem |

## Le prove falliscono davvero (mutazioni)

Ogni riga è un difetto messo apposta nel codice. I test l'hanno preso tutte le volte: con il difetto la suite era rossa, tolto il difetto è tornata verde.

| Difetto messo apposta | Preso da (il primo test rosso) |
|---|---|
| trappola del foglio tolta | il foglio d'istruzioni (UX §L7.12) > Tab e Maiusc+Tab restano dentro il foglio |
| fuoco non restituito dal foglio | il foglio d'istruzioni (UX §L7.12) > Esc chiude: il fuoco torna a chi l'ha aperto e la pagina torna viva |
| resto della pagina non inerte | il foglio d'istruzioni (UX §L7.12) > si apre come dialogo modale: titolo e testo per nome, il fuoco al titolo, il resto inerte e fermo |
| variante iOS sbagliata | il foglio d'istruzioni (UX §L7.12) > si apre come dialogo modale: titolo e testo per nome, il fuoco al titolo, il resto inerte e fermo |
| standalone ignorato | dove c'è il pulsante (UX FL5, §L6.0) > già installata (aperta dall'icona): nessun pulsante, in nessun punto, nemmeno col prompt |
| Esc del menu non torna a Pallo | il menu «Dove vuoi andare?» (UX §L7.2, FL2) > Esc chiude e riporta il fuoco a Pallo |
| fuoco del menu non alla prima voce | il menu «Dove vuoi andare?» (UX §L7.2, FL2) > si apre al tocco: aria-expanded, la nuvoletta via, il fuoco sulla prima voce a t0; la sezione corrente è marcata |
| guida resta in #live | Pallo guida (UX §L6.10, §L7.2, FL7) > esce dove la sezione ha un Pallo suo (#live), e rientra dopo |
| guida esce col fuoco addosso | Pallo guida (UX §L6.10, §L7.2, FL7) > non esce col fuoco addosso: aspetta che il fuoco vada altrove |
| cinque tocchi senza sorpresa | giocare con Pallo (FL7) > i tocchi di fila non richiudono il menu; il quinto è la sorpresa, e il menu si chiude |
| battuta ripetuta nella sessione | Pallo guida (UX §L6.10, §L7.2, FL7) > una battuta per sezione, solo a scroll fermo, e mai due volte nella sessione |
| salto con pushState | la barra (UX §L4.1, §L7.1) > una tab salta di colpo alla sezione, col fuoco al titolo e senza riempire la history |
| salto senza fuoco al titolo | la barra (UX §L4.1, §L7.1) > una tab salta di colpo alla sezione, col fuoco al titolo e senza riempire la history |
| comandi fermo non in sincrono | «Ferma le animazioni» (UX §L7.13, FL8) > le tre istanze cambiano insieme; lo stato sta sull'<html> e nel dispositivo |
| memoria che lancia non gestita | «Ferma le animazioni» (UX §L7.13, FL8) > senza memoria (accesso che lancia) la pagina parte lo stesso e il comando vale fino alla ricarica |
| fuoco dentro un effetto armato ignorato (RL4) | «Cosa registriamo?»: le voci del ＋ (UX §L6.3, §L7.9) > armato, il fuoco che arriva sulle voci lo apre subito, senza aspettare la soglia (RL4) |
| lente: registra non è del Diario | la barra (UX §L4.1, §L7.1) > la tab della sezione corrente ha aria-current="true"; «Cosa registriamo?» è del Diario, la mappa dei Numeri |
| autoplay annuncia | Partita live: la demo (UX FL3, §L6.4, §L7.6) > l'autoplay: in vista al 60%, qualche punto fino al primo «Cambio campo!», poi «Tocca tu»; senza annunci né vibrazione |
| scorciatoie globali | Partita live: la demo (UX FL3, §L6.4, §L7.6) > le scorciatoie valgono solo col fuoco dentro la demo; fuori le frecce restano della pagina |
| autoplay col fermo | Partita live: la demo (UX FL3, §L6.4, §L7.6) > niente autoplay col movimento ridotto, col «fermo», o col fuoco già dentro la demo |
| riepilogo senza fuoco | Partita live: la demo (UX FL3, §L6.4, §L7.6) > la partita finita: il riepilogo col fuoco al titolo, i pannelli inerti; «Ricomincia» torna a 0–0 |
| vibra anche col fermo | Partita live: la demo (UX FL3, §L6.4, §L7.6) > col fermo nessuna vibrazione, e il numero cambia senza «pop» |
| chat: fuoco non al gruppo | «Raccontalo a Pallo»: la mini chat (UX FL4, §L6.3) > una risposta: l'eco a destra, il fuoco al gruppo che aspetta (aria-busy), Pallo «pensa», poi la domanda vera |
| chat: aria-busy mai tolto | «Raccontalo a Pallo»: la mini chat (UX FL4, §L6.3) > una risposta: l'eco a destra, il fuoco al gruppo che aspetta (aria-busy), Pallo «pensa», poi la domanda vera |
| tablist senza roving tabindex | il giro del Tab (UX §L8.1) > dalla cima, sul telefono: salto, barra, hero col comando, una fermata per la tablist, la demo, il finale, il footer |
| numeri armati senza il valore per gli screen reader | «I numeri li fa l'app» (UX §L6.5, LM7) > fuori vista all'avvio: armati a zero per gli occhi, col valore vero per gli screen reader |
| Wrapped bloccato col fermo | la mappa e Wrapped (UX §L6.6, §L6.7) > Wrapped bloccato (timeline native, altezza ≥ 600, movimento permesso): la fila esce dal giro del Tab |
| nuvoletta della demo esposta | le sezioni senza JavaScript (UX §L6.0) > #live: un tabellone fermo che si legge come immagine, coi pulsanti nascosti |
| stile in linea nel modello | CSP: niente script né stili in linea (`script-src 'self'`) > il modello non ha attributi style né blocchi <style> |
| script in linea | CSP: niente script né stili in linea (`script-src 'self'`) > modello: ogni <script> ha un src, e nessun attributo on* |
| tab con aria-current nell'HTML | la barra (UX §L4.1, §L7.1) > quattro tab verso sezioni che esistono, con etichetta visibile e senza aria-current nell'HTML |
| transizione su all | CSS della landing (UX §L14.1, MOTION §L11.2) > barra.css: le transizioni muovono solo transform, opacity e visibility; mai `all` |
| colore letterale in un componente | CSS della landing (UX §L14.1, MOTION §L11.2) > live.css: niente colori letterali (solo var(--…) dei token) |
| backdrop-filter in un componente | CSS della landing (UX §L14.1, MOTION §L11.2) > guida.css: niente backdrop-filter (il vetro passa da data-material), niente will-change fisso |
| animare height | CSS della landing (UX §L14.1, MOTION §L11.2) > mappa.css: i fotogrammi chiave animano solo transform e opacity |
| regola fuori dal layer | CSS della landing (UX §L14.1, MOTION §L11.2) > dati.css: tutto dentro un solo @layer components |
| regole: terzo set a 21 | il set (UX §L12.6) > a 21, il terzo a 15; il set unico al suo punteggio |
| import di Supabase in un modulo della landing | la landing non tira dentro l'app (UX §L13) > dagli import di presentazione/js/main.ts non si arriva a un framework né a un .tsx |
| import di `Pallo.tsx` (un componente React) | idem |

39 su 39. Lo script che le applica una alla volta, e poi rimette il file com'era, non è nel repo: serve a questo giro, non è uno strumento da tenere.

## Non verificato

- **Su un iPhone vero** (§L14.4):
  - la pila in basso con la barra di Safari 26, espansa e compatta;
  - le etichette di iOS in italiano nelle varianti `ios26` e `ios`;
  - «Aggiungi alla schermata Home» che apre `/`.
- **Su Android**: il prompt nativo accettato e rifiutato; la vibrazione. Qui la logica è coperta solo col prompt finto.
- **VoiceOver e TalkBack**: il percorso di §L8.9 e il silenzio durante lo scroll. Qui sono verificati il ruolo e il nome di ogni cosa, e che le sole regioni live siano lo status della demo, quello dell'installazione e il registro della chat (che parla solo ai tocchi dell'utente).
- **Regressione visiva**: il repo non ha uno strumento di confronto per immagini. `landing-shots.mjs` e `landing-og.mjs` producono asset, non baseline. Non se n'è introdotto uno.

## Come rifare le misure

```sh
npm test                                   # tutta la suite (le pagine della landing: src/test/landing*.test.ts)
npm run build && npx vite preview --port 5199 --strictPort --host 127.0.0.1
FLAT=1 node docs/qa/landing.mjs axe,tab,sweep,targets,reduced
node docs/qa/landing.mjs cls,perf,numeri,rete,tocco
W=844 H=390 FLAT=1 node docs/qa/landing.mjs sweep,axe,targets   # il telefono in orizzontale
```
