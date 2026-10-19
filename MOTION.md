# MOTION.md: il movimento di "Bagnasciuga"

| | |
|---|---|
| Ruolo | Interaction e motion designer, ruolo 3 di 6. Specifica i momenti **fra** gli stati; **nessun componente di produzione** in questo commit |
| Base | `UX.md` (ruolo 1, `19bf228`) per il comportamento, `ART_DIRECTION.md` (ruolo 2, `1257279`) per vocabolario e aspetto. Dove questo documento li corregge lo dice in §14 |
| Demo di riferimento | `docs/motion/` (sette demo più l'indice). Leggono i token veri (`src/styles/tokens.css`, `materials.css`); si aprono senza build (§15) |
| Verifica | Ogni demo è stata pilotata in Chrome headless (tocchi, tasti, trascinamenti veri via CDP), **con e senza** `prefers-reduced-motion`. Il badge `?audit` ha registrato zero animazioni fuori da transform/opacità (salvo l'eccezione dichiarata E1) e al massimo 2 superfici sfocate contemporanee |
| Lingua | italiano; nomi di token, classi e costanti come nel codice |
| Livelli di obbligo | **DEVE** = criterio di accettazione · **DOVREBBE** = atteso, salvo motivo scritto · **PUÒ** = facoltativo |
| Landing | la landing `/presentazione` ha la sua parte in fondo: **[Parte L, il movimento di «Controluce»](#parte-l-la-landing-presentazione-il-movimento-di-controluce)** (ottobre 2026). Le regole di questo documento valgono anche lì; la Parte L aggiunge due eccezioni (scroll legato e sfalsamento narrativo) **solo** per la landing |

**Chi vince su cosa.** UX.md decide *cosa* succede (stati, flussi, focus, history). ART_DIRECTION.md decide *con che cosa* si muove (le cinque curve, le durate, i materiali). Questo documento decide *come si passa* da uno stato all'altro: cosa fa partire il movimento, in che ordine, quali proprietà, quanto dura, che cosa resta con reduced-motion. I seam per le fasi successive sono marcati `⟂ Fn` come in UX.md (indice in §17).

---

## Indice

0. [In una frase](#0-in-una-frase)
1. [Le regole dure](#1-le-regole-dure)
2. [Vocabolario e costanti](#2-vocabolario-e-costanti)
3. [Coreografia: regole trasversali](#3-coreografia-regole-trasversali)
4. [Specifica per elemento](#4-specifica-per-elemento)
5. [Le transizioni dei flussi](#5-le-transizioni-dei-flussi)
6. [Caricamento](#6-caricamento)
7. [Feedback immediato e ottimistico](#7-feedback-immediato-e-ottimistico)
8. [Recupero dagli errori](#8-recupero-dagli-errori)
9. [Scroll](#9-scroll)
10. [Il momento firmato: «Punto segnato»](#10-il-momento-firmato-punto-segnato)
11. [Riduzione del movimento: la matrice](#11-riduzione-del-movimento-la-matrice)
12. [Costi: cosa è caro e cosa usare al suo posto](#12-costi-cosa-è-caro-e-cosa-usare-al-suo-posto)
13. [Cosa cambia nel codice di oggi](#13-cosa-cambia-nel-codice-di-oggi)
14. [Deviazioni da UX.md e ART_DIRECTION.md](#14-deviazioni-da-uxmd-e-art_directionmd)
15. [Le demo](#15-le-demo)
16. [Verifica e test](#16-verifica-e-test)
17. [Seam per i ruoli successivi](#17-seam-per-i-ruoli-successivi)
- [Parte L. La landing `/presentazione`: il movimento di «Controluce»](#parte-l-la-landing-presentazione-il-movimento-di-controluce)

---

## 0. In una frase

**Il movimento dice da dove viene una cosa e dove è finita. Se non dice nessuna delle due, non c'è.**

Sei principi, in ordine di priorità:

1. **Causa → effetto.** Ogni movimento parte da ciò che hai toccato (il menu dal ＋, il visore dalla miniatura) oppure arriva dove il risultato si posa (la riga nuova, il numero che scatta). Un movimento che non ha né origine né destinazione è decorazione, ed esce.
2. **Mai aspettare.** L'input è accettato dal primo fotogramma, ogni transizione è interrompibile, il focus si sposta all'istante zero. Nessuna animazione sta fra il dito e il risultato.
3. **Solo transform e opacità.** Sui percorsi caldi (§1.2) non si anima altro. C'è una sola eccezione di layout che resta (E1), dichiarata e misurata; le altre (§1.3) sono pittura di un elemento o codice di oggi in uscita.
4. **Ridurre il movimento non toglie il feedback.** Con `prefers-reduced-motion` sparisce lo *spostamento*; restano le dissolvenze, lo strato di pressione, la traccia sulla riga nuova, e il contenuto continua a seguire il dito.
5. **Il contenuto non balla.** Rotte, tab, liste ricaricate, risultati di ricerca: cambiano nello stesso fotogramma, senza animazione. Si muove solo ciò che è cambiato *per mano tua*.
6. **Il vetro non sfora mai, nemmeno di passaggio.** Il budget di 3 superfici sfocate (UX §10) vale anche nei 180ms in cui un overlay esce e un altro entra.

---

## 1. Le regole dure

### 1.1 Il contratto

| # | Regola | Come si verifica |
|---|---|---|
| R1 | **Tutto rispetta `prefers-reduced-motion`.** Ogni animazione CSS, ogni molla di Motion, ogni scroll programmatico, ogni attesa artificiale ha la sua variante (matrice in §11). | Le demo con `?reduce`; in jsdom il ramo ridotto con `matchMedia` finto (§16) |
| R2 | **Sui percorsi caldi si animano solo `transform` e `opacity`** (più `visibility`, che è discreta e non costa). | Badge `?audit` delle demo; test statico sul CSS (§16, `⟂ QA`) |
| R3 | **Niente blocca l'input né ritarda la risposta percepita.** Nessun `pointer-events: none` su ciò che entra; focus all'istante zero; nessun `AnimatePresence mode="wait"`; nessun `startTransition` sulla navigazione; ogni transizione si inverte dal valore corrente. | §3.1–§3.3 |
| R4 | **Il movimento chiarisce causa e gerarchia, mai decora.** Per ogni animazione la tabella di §4 dice che cosa chiarisce. Se la cella è vuota, l'animazione non si fa. | Revisione |
| R5 | **Il budget del vetro (≤ 3 superfici con `backdrop-filter` visibili) vale a ogni fotogramma**, transizioni comprese. | Contatore del badge `?audit` |
| R6 | **Mai `transition: all`.** Si elencano le proprietà. Un `all` anima anche `outline` (l'anello di focus deve comparire istantaneo) e qualunque proprietà di layout che un domani cambi. | `grep` nel test statico (§16) |

### 1.2 Che cosa è un "percorso caldo"

È caldo un fotogramma che appartiene a uno di questi casi:

1. **durante uno scroll, un trascinamento o un pizzico** (anche gli hover che scattano scorrendo con la rotella sotto un puntatore fermo);
2. **più elementi insieme** in una lista o in una griglia;
3. **qualcosa che si ripete** a ogni navigazione, a ogni tasto, a ogni ricaricamento;
4. **qualunque animazione infinita** (skeleton, indicatore "sta scrivendo").

Fuori da questi casi resta solo il cambio di stato di un singolo controllo piccolo nel momento in cui lo tocchi. Anche lì questa specifica usa transform e opacità: le proprietà di pittura sono tollerate solo nelle eccezioni qui sotto.

### 1.3 Le eccezioni (tutte e sole)

| # | Cosa | Proprietà | Perché è ammessa | Come è marcata |
|---|---|---|---|---|
| **E1** | Crescita dentro uno sheet ancorato in basso: **«Altri dettagli»** (ART_DIRECTION §11.1, regola 2) e la **riga di un set** aggiunta o tolta in Nuova partita | `grid-template-rows: 0fr ↔ 1fr` | Lo sheet sta attaccato al fondo e cresce verso l'alto. Un FLIP sposterebbe l'ancora (il piè con i pulsanti scenderebbe sotto lo schermo e risalirebbe). Un solo contenitore, un solo gesto, sottoalbero piccolo. | `data-motion-exception="altri-dettagli"` (o `"riga-set"`) sul contenitore: il badge `?audit` lo segna ambra, non rosso |
| **E2** | **Grafici** di Statistiche al primo montaggio: la linea di *Andamento* (`stroke-dashoffset`) e l'anello di *Vinte/perse* (`stroke-dasharray`) | pittura di un SVG da ~120×120 | Una volta per montaggio o per cambio di filtro, un elemento, `--dur-racconto`. Non c'è un equivalente in transform che disegni una linea. | `data-motion-exception="grafico"`; con reduced-motion non si anima |
| **E3** | `NumeroCheSale` di oggi (testo riscritto a ogni fotogramma) | layout e pittura di uno `span` | **Transitoria**: vale finché il tabellone (§10) non lo sostituisce. | |
| **E4** | Le animazioni interne di Leaflet e markercluster (zoom, dissolvenza delle tile, raggruppamenti) | gestite dalla libreria | Non sono nostre; con reduced-motion sono già spente (`zoomAnimation`, `fadeAnimation`, `markerZoomAnimation`, `animate` del cluster: `ConquisteMap.tsx:131-151`, `VenueMap.tsx:54-56`). | |

Qualunque altra proprietà animata (larghezze, `top`/`left`, colori, ombre, raggi, filtri, sfocature) è un errore di revisione.

---

## 2. Vocabolario e costanti

### 2.1 Le cinque curve (da ART_DIRECTION §11.1, invariate)

| Nome | Token CSS | Motion | A che cosa serve, qui |
|---|---|---|---|
| **SVELTO** | `--dur-svelto` 180ms + `--ease-standard` | `SVELTO` | colore e opacità, cambi di stato (la NavBar che scatta), **tutte le uscite** comandate da un pulsante |
| **ENTRATA** | `--dur-entrata` 260ms + `--ease-standard` | `ENTRATA` | comparse: dialoghi, avvisi, messaggi d'errore, apertura di «Altri dettagli», contenuto che arriva |
| **MOLLA** | `--dur-molla` 320ms + `--ease-molla` | `MOLLA` | tutto ciò che si sposta nello spazio: sheet che sale, pillole, FLIP, ritorno dopo un trascinamento, il tabellone di ±1 |
| **RACCONTO** | `--dur-racconto` 800ms + `--ease-racconto` | (la curva di `NumeroCheSale`) | numeri che cambiano di più di uno, barre e grafici; una volta per causa |
| **RESPIRO** | `--dur-respiro` 1400ms + `--ease-respiro` | | solo la pulsazione degli skeleton |

### 2.2 Le regole d'uso che questo documento aggiunge

1. **Le uscite sono più veloci delle entrate (SVELTO) — tranne quelle a gesto.** Un foglio buttato giù con il dito esce con la **molla che parte dalla velocità del dito** (`MOLLA` con `velocity`). Un'uscita in SVELTO da metà gesto è uno scatto in avanti: a 500px dal fondo, `ease-standard` parte a ~11.000 px/s contro gli 800 del dito. Vale per sheet, visore foto e qualunque cosa si chiuda trascinando. (M7)
2. **L'inchiostro di una selezione viaggia con la pillola.** Quando la pillola navy scivola (tab, segmented, chip), lo scambio fra etichetta scura ed etichetta bianca usa `MOLLA`, non SVELTO. In SVELTO l'etichetta bianca arriva prima del fondo e per un attimo è bianco su vetro: trovato nella demo 06. (M8)
3. **Due meccanismi per reduced-motion, e non si confondono:**
   - **scostamenti di passaggio** (da dove entra, dove esce): si moltiplicano per `--motion-scale`, che con reduced-motion vale 0 (`translateY(calc(12px * var(--motion-scale)))`, `scale(calc(1 - .04 * var(--motion-scale)))`);
   - **spostamenti fra due stati di riposo** (la pillola da una tab all'altra, il pomello dell'interruttore, il chevron ruotato, le cifre del tabellone): con reduced-motion **saltano** (`transition: none`). Moltiplicarli per zero sarebbe sbagliato: la pillola resterebbe ferma sulla tab di prima.
4. **Sfalsamento: zero.** Nessuno stagger su liste, griglie, voci di menu, card della Home (ART_DIRECTION §11.1, regola 3). L'unico ritardo ammesso è **causale**: un effetto parte quando la sua causa è visibile (il tabellone scatta quando lo sheet ha liberato la vista, §10). È un ritardo dell'effetto, mai della risposta.
5. **Animazioni a keyframe solo per i fatti che non si annullano** (l'avviso che entra, la traccia che svanisce, lo skeleton). Gli stati che possono tornare indietro a metà strada (menu, sheet, NavBar, disclosure) usano **transizioni**, che si invertono dal punto in cui sono; un keyframe ripartirebbe da zero.

### 2.3 Costanti nuove (contratto, `⟂ F2`)

Valori che la specifica introduce. Nomi e valori sono vincolanti; dove vanno, anche.

| Nome | Valore | Dove | Per cosa |
|---|---|---|---|
| `--delay-skeleton` | `150ms` | `tokens.css` (motion), più ART_DIRECTION §11.1 e il test | comparsa delle forme dello skeleton (§6.2) |
| `--delay-respiro` | `600ms` | idem | inizio della pulsazione dello skeleton |
| `FLIP_MAX` | `24` | `src/components/Motion.tsx` | oltre questo numero di elementi che si spostano, il layout cambia senza animazione (§12) |
| `BUSY_MIN_MS` | `300` | `Motion.tsx` | durata minima visibile dello stato occupato **solo per i "Riprova"** (§8.4) |
| `battitura(n)` | `min(700, 250 + 6·n)` ms, `n` = caratteri | `src/screens/CreaChat.tsx` (ex `780 + 17·n`, max 1700) | la pausa "sta scrivendo" dell'assistente; 0 con reduced-motion; interrotta da qualunque input (§5 F11) |
| `ELASTICO_SPORCO` | `0.35` | `Sheet.tsx` | elasticità verso il basso con modulo sporco (con modulo pulito resta `0.9`) |
| `CHIUDI_OLTRE_PX` / `CHIUDI_OLTRE_VELOCITA` | `120` / `550` | `Sheet.tsx` (**invariati**, fissati da `Sheet.test.tsx`) e visore foto | soglie di chiusura a gesto, le stesse ovunque |
| `SALTO_SCROLL` | `3 × innerHeight` | dove si torna in cima | oltre, prima un salto secco a una schermata dalla cima, poi lo scorrimento morbido (§9.3). Misurato in Chrome: smooth da 2.000px 744ms, da 8.000 e da 20.000px ~1.500ms; con il salto, da 20.000px 443ms |
| `TOAST_MS` | `4000` | Toast | chiusura automatica di info e successo (UX §7.8) |

---

## 3. Coreografia: regole trasversali

### 3.1 La scala dei tempi di risposta

| Da quando tocchi | Che cosa DEVE esserci |
|---|---|
| **stesso fotogramma** | lo stato premuto (`:active` o lo strato di stato); l'etichetta occupata («Creo…») con `aria-busy`; la pillola che **comincia** a muoversi; il focus spostato |
| **≤ 100ms** | ogni risultato locale (filtri, ricerca, segmented, interruttori, chip) **già leggibile nello stato finale**. Il movimento accompagna, non rimanda: il contenuto nuovo c'è mentre la pillola sta ancora scivolando |
| **100ms – 1s** (rete) | solo lo stato occupato del controllo. Nessuno spinner, niente si muove |
| **oltre 1s** | ancora lo stato occupato; l'avviso di connessione lenta dove UX lo prevede (UX §6.0) |
| **esito** | §5 per il successo, §8 per l'errore |

### 3.2 Interrompibilità

- Ogni stato reversibile si anima con una **transizione** (CSS) o una **molla** (Motion), che ripartono dal valore corrente. Aprire e richiudere il menu ＋ a metà corsa lo fa tornare indietro da dov'è (provato nella demo 01).
- Un gesto che riprende un elemento ancora in movimento **lo ferma dov'è** e lo porta con sé (demo 02: `Lab.stop` + `Lab.springValue`; in Motion è il comportamento predefinito di `drag`).
- Nessuna animazione viene "attesa" prima di accettare il tocco successivo. In particolare: **mai** `AnimatePresence mode="wait"` (ritarderebbe l'entrata della durata dell'uscita).

### 3.3 Chi esce non blocca, chi entra risponde

- All'istante zero di un'uscita l'elemento riceve `inert` e `pointer-events: none`: il tocco successivo va a ciò che c'è sotto o a ciò che sta entrando.
- Ciò che entra è **interattivo dal primo fotogramma**: niente `pointer-events: none` durante l'entrata, niente pulsanti disattivati "finché l'animazione non finisce".
- `visibility: hidden` arriva **a fine** uscita (`transition: visibility 0s linear var(--dur-svelto)`), e torna `visible` **a inizio** entrata. È così che l'uscita si vede e che un elemento invisibile non riceve il focus.

### 3.4 Il vetro durante le transizioni

Il budget conta a ogni fotogramma (R5). Quattro regole lo tengono:

1. **Chi esce smette di sfocare.** All'istante zero di un'uscita, una superficie di vetro passa a `data-material="frost"` (la stessa tinta, opaca, senza `backdrop-filter`). Fra `.86` e `1` di alpha sopra un fondo velato non si vede differenza, e così il menu ＋ che esce mentre lo sheet entra non fa quattro superfici. Il materiale torna `glass-*` quando l'elemento è invisibile.
2. **Il vetro trasparente è anche nascosto.** Il livello di vetro della NavBar, a opacità 0, ha anche `visibility: hidden`: una sfocatura trasparente costa lo stesso e conterebbe nel budget.
3. **Il velo appartiene all'host degli overlay, non al singolo overlay.** Quando uno overlay ne sostituisce un altro (menu ＋ → sheet), il velo resta dov'è: niente dissolvenza in uscita e di nuovo in entrata, niente sfarfallio. `⟂ F3` (`ModalHost`).
4. **La TabBar sale sopra il velo solo per il menu ＋** (`z-index: calc(var(--z-scrim) + 1)`), così il ＋ da cui il menu nasce resta acceso. Torna a `--z-tabbar` quando il velo è sparito (fine dell'uscita) o quando uno sheet l'ha coperta (fine dell'entrata dello sheet): il cambio di livello avviene sempre dove nessuno lo vede. Con uno sheet aperto resta sotto il velo, come dice UX §7.1.

Misurato nelle demo: menu ＋ aperto = 2 (TabBar + menu); passaggio menu → sheet = 2; NavBar scattata + TabBar = 2; visore foto = 2. Il caso peggiore previsto (menu ＋ aperto sopra una NavBar già scattata) fa 3: nessuna demo lo combina, e va contato a mano in QA (§16.3).

### 3.5 Focus e animazione (M3)

Il focus si sposta **all'istante zero**, mai "a fine animazione": i tasti battuti nei 320ms dell'entrata andrebbero persi.

| Apertura | Il focus va | Note |
|---|---|---|
| Sheet aperto **da tastiera o mouse** | al primo campo, a `t0`, con `preventScroll: true` | si scrive subito; il campo si sta muovendo ma è un transform, nessun problema |
| Sheet aperto **col dito** (`pointerType` `touch` o `pen` dell'evento che l'ha aperto) | al **titolo** dello sheet (`<h2 tabIndex={-1}>`), a `t0` | alzare la tastiera mentre lo sheet sale ridimensiona il viewport a metà corsa. E iOS non alza comunque la tastiera per un `focus()` dato fuori dal gesto, quindi "il primo campo a fine animazione" (UX §7.5.2) su iPhone dà un campo con il focus e senza tastiera. Un tocco sul campo, e la tastiera sale a sheet fermo |
| Menu ＋, popover, menu "⋯" | alla prima voce, a `t0` | |
| ConfirmDialog | all'azione **non** distruttiva, a `t0` | UX §7.7 |
| Visore foto, Storia | al ✕, a `t0` | UX §8.2 |
| Chiusura di qualunque overlay | all'elemento che l'ha aperto, a `t0` (non a fine uscita) | se non esiste più (eliminazione), all'h1 (UX §8.3.3) |
| Cambio di rotta | all'h1, a `t0` | non c'è animazione da aspettare (§4.1) |

### 3.6 Origine: ciò che tocchi è ciò che si apre

| Overlay | `transform-origin` | Perché |
|---|---|---|
| Menu ＋ (mobile) | il centro del ＋: `50% calc(100% + var(--space-2) + var(--tabbar-h) / 2)` | il principio scritto nel commento di `BottomNav.tsx` (UX C2) |
| Popover "＋ Nuovo" (Sidebar), menu "⋯" della NavBar | l'angolo del pulsante dal lato in cui il popover si apre | |
| Visore foto | la miniatura toccata (scala e traslazione calcolate, §4.2) | |
| ConfirmDialog su mobile | `50% 100%` | ha la forma di un action sheet |
| Form sheet e ConfirmDialog da 600px | `50% 50%` | |

### 3.7 Overlay impilati

- Al massimo due (UX §4.3.5). Il secondo porta il **suo** velo, sopra il primo: due veli a `.36` fanno un fondo più scuro, ed è giusto, perché dice profondità.
- Si chiude dall'alto. Chiudere il ConfirmDialog con «Scarta» chiude anche lo sheet: le due uscite partono **insieme**, non in sequenza.

### 3.8 History e animazioni

- **Indietro** (telefono o browser) chiude l'overlay in cima con **la stessa uscita** di ✕/Annulla.
- **Successo che porta altrove** (torneo creato → `/tornei/:id`, UX §4.2): la rotta nuova si disegna **subito, sotto lo sheet che esce**. Lo sheet scende in SVELTO e scopre la pagina del torneo appena creato: è l'unico "effetto di transizione" fra rotte dell'app, ed è gratis.
- Il menu ＋ che passa a uno sheet sostituisce la propria voce di history (UX §4.3.5): l'indietro dallo sheet non rianima il menu.

---

## 4. Specifica per elemento

Colonne: **Momento** · **Innesco** · **Proprietà** · **Tempo** (durata e curva) · **Con reduced-motion** · **Che cosa chiarisce**. Dove una cella dice "—" non c'è movimento. **Lo sfalsamento è 0 in ogni riga** (§2.2.4): la colonna compare solo dove serve ricordarlo, e l'unica eccezione dell'app sono i puntini dell'assistente (§5 F11).

### 4.1 Shell

**TabBar** (demo 01, 03)

| Momento | Innesco | Proprietà | Tempo | Sfals. | Reduced | Chiarisce |
|---|---|---|---|---|---|---|
| Cambio tab | `click` su una tab | pillola: `translateX(i · 100%)` (le tab hanno larghezza uguale, un solo elemento) | MOLLA | 0 | salta | da quale tab a quale |
| Inchiostro della tab | idem | due livelli sovrapposti, contorno `--ink-3`/`--ink-2` e pieno `--on-select`: si scambiano l'**opacità** | MOLLA (§2.2.2) | 0 | dissolvenza | stato attivo con cambio di forma (contorno → pieno, WCAG 1.4.1) |
| Contenuto della rotta | idem | **nessuna** | — | — | — | (la tab è un posto, non una transizione: ART_DIRECTION §11.3) |
| Ritocco della tab attiva | `click` sulla tab corrente | scroll in cima (§9.3) | `behavior: smooth` | — | `behavior: auto` | dove sei |
| Pressione del ＋ | `:active` | `scale(var(--press-scale))` | SVELTO | — | nessuna scala | |
| ＋ con menu aperto | `aria-expanded="true"` | **nessuna** rotazione in × (ART_DIRECTION §11.3) | — | — | — | |
| Tastiera virtuale aperta (campo con focus **fuori** da uno sheet, < 900px) | `focusin` su un campo testuale | `opacity: 0` + `translateY(calc(16px * var(--motion-scale)))`, poi `visibility: hidden` | SVELTO | — | solo opacità | la barra non è raggiungibile mentre scrivi |
| Tastiera chiusa | `focusout`, verificato al fotogramma dopo (passare da un campo all'altro non deve farla lampeggiare) | ritorno | ENTRATA | — | solo opacità | |

**Sidebar** (≥ 900px)

| Momento | Innesco | Proprietà | Tempo | Reduced |
|---|---|---|---|---|
| Voce attiva | cambio di rotta | pillola navy `translateY(i · altezza voce)` (voci alte uguali) | MOLLA | salta |
| Hover di una voce | `:hover` (solo `hover: hover`) | strato di stato `opacity 0 → 1` | SVELTO | uguale |
| Popover «＋ Nuovo» | `click` | `opacity` + `translateY(calc(-4px * var(--motion-scale)))`, origine sotto il pulsante | SVELTO (ART_DIRECTION §11.2) | dissolvenza |
| Chiusura popover | Esc, scelta, clic fuori | `opacity → 0`, materiale → `frost` | SVELTO | uguale |

**NavBar con large title** (demo 03)

| Momento | Innesco | Proprietà | Tempo | Reduced | Chiarisce |
|---|---|---|---|---|---|
| Scatto | una sentinella sotto il large title esce da sotto la barra (`IntersectionObserver`, `rootMargin: -altezzaBarra`) | livello di vetro `opacity 0 → 1` e `visibility` (§3.4.2); filo inferiore insieme al vetro | SVELTO | dissolvenza (M9) | il contenuto ora scorre **sotto** qualcosa |
| Titolo compatto | idem | `opacity` + `translateY(calc(4px * var(--motion-scale)) → 0)` | SVELTO | dissolvenza | dove sei, ora che l'h1 non si vede |
| Lente di ricerca (Tornei) | idem | `opacity` + `visibility`; `tabIndex` 0 solo quando visibile | SVELTO | dissolvenza | |
| Ritorno in cima | la sentinella rientra | lo stesso all'indietro, **simmetrico** (è un cambio di stato, non un'entrata) | SVELTO | | |
| Large title | scroll | **nessuna**: esce dalla vista con il contenuto (ART_DIRECTION §11.3) | — | — | |
| Tocco sulla lente | `click` | scroll in cima (§9.3) **e** focus nel campo a `t0` con `preventScroll` | smooth | auto | i tasti battuti finiscono nel campo mentre la pagina sale |

**Toast** (demo 05; riferimento completo in `docs/motion/_lab.js`, `toast()`)

| Momento | Innesco | Proprietà | Tempo | Reduced |
|---|---|---|---|---|
| Entrata | nuovo avviso | `opacity 0 → 1` + `translateY(calc(-8px * var(--motion-scale)) → 0)` | ENTRATA | dissolvenza |
| Uscita (✕, timer, sostituzione) | | `opacity → 0`; `inert` a `t0` | SVELTO | uguale |
| Chi resta | fine dell'uscita | FLIP verticale (sale al posto liberato) | MOLLA | salta |
| Avviso identico | stesso tipo e testo | **nessun avviso nuovo**: compare o cresce il contatore «×2», con un cenno `scale(1.25 → 1)` sul solo contatore; il timer riparte | MOLLA | il numero cambia senza cenno |
| Terzo avviso | | esce il più vecchio fra quelli a chiusura automatica (altrimenti il più vecchio) | SVELTO + FLIP | |
| Pausa | `mouseenter`, `focusin`, scheda nascosta (`visibilitychange`) | il timer si ferma | — | |
| Offline | `navigator.onLine === false` | avviso persistente; esce da solo al ritorno in linea | ENTRATA / SVELTO | |

**Splash, salto al contenuto, ErrorState a tutta pagina**

| Momento | Proprietà | Tempo | Reduced |
|---|---|---|---|
| Splash → app pronta | l'app si disegna **sotto**; lo splash sopra va `opacity → 0`, con `pointer-events: none` da `t0` (i tocchi arrivano già all'app) | SVELTO | uguale |
| «Ci sta mettendo più del solito.» (10s, UX F0) | `opacity` | ENTRATA | uguale |
| «Vai al contenuto» | compare al focus, **istantaneo** | — | — |
| ErrorState «Non riesco a caricare il diario» | compare senza animazione (è il contenuto della pagina); [Riprova] → §8.4; al successo il contenuto arriva in SVELTO (opacità) | | |

### 4.2 Overlay

**Menu ＋** (mobile, demo 01)

| Momento | Innesco | Proprietà | Tempo | Reduced | Chiarisce |
|---|---|---|---|---|---|
| Apertura | `click` sul ＋ | velo `opacity 0 → 1`; menu `opacity 0 → 1` + `translateY(calc(12px * var(--motion-scale))) scale(calc(1 - .04 * var(--motion-scale))) → none`, origine sul ＋ (§3.6); TabBar sopra il velo | velo ENTRATA; menu: opacità ENTRATA, transform MOLLA | dissolvenze | il menu esce da ciò che hai toccato |
| Le tre voci | | compaiono **con** il pannello, nessuno stagger (oggi c'è: `BottomNav.tsx:54-58`) | — | — | |
| Chiusura (Annulla, velo, Esc, ritocco del ＋, indietro) | | inverso; materiale → `frost` a `t0`; focus al ＋ a `t0`; TabBar torna sotto a fine uscita | SVELTO | dissolvenze | |
| **Passaggio a uno sheet** | scelta di «Nuovo torneo» o «Aggiungi partita» | il menu esce (SVELTO, `frost`) e **nello stesso istante** lo sheet sale (MOLLA). Il velo non si muove (§3.4.3). La voce di history viene sostituita | SVELTO ∥ MOLLA | dissolvenze incrociate | una sola catena di gesti, un solo velo |
| Voce che porta a una rotta («Check-in oggi») | | il menu esce (SVELTO) e la rotta si disegna sotto nello stesso istante | SVELTO | | |

**Popover** (desktop «＋ Nuovo», «⋯» della NavBar su ogni misura): `opacity` + `translateY(calc(-4px * var(--motion-scale)))` in SVELTO, origine sul pulsante; uscita in SVELTO di sola opacità; vetro `glass-thick`; la voce distruttiva («Elimina torneo») sta su una riga **opaca** dentro il popover (ART_DIRECTION §4.4). Niente velo sul desktop: il clic fuori chiude.

**Sheet dal basso** (< 600px, demo 02)

| Momento | Innesco | Proprietà | Tempo | Reduced | Chiarisce |
|---|---|---|---|---|---|
| Entrata | apertura | `translateY(calc(100% * var(--motion-scale))) → 0`; velo ENTRATA | MOLLA | dissolvenza SVELTO | da dove viene (il fondo, dove sta il pollice) |
| Uscita da pulsante, velo, Esc, indietro | | `translateY → 100%`; materiale → `frost` a `t0`; velo SVELTO; focus a `t0` all'opener | SVELTO | dissolvenza | |
| Trascinamento | `pointerdown` **sulla sola maniglia** (UX §7.5) | il foglio segue il dito: `translateY(dy · 0.9)` in giù, `dy · 0.02` in su | diretto (nessuna curva) | **uguale**: è manipolazione diretta | |
| Rilascio sotto soglia | `dy ≤ 120` e `v ≤ 550 px/s` | ritorno a 0 con la molla **partendo dalla velocità del dito** | MOLLA + `velocity` | salta a 0 | |
| Rilascio oltre soglia, modulo pulito | `dy > 120` o `v > 550` | uscita con la molla dalla posizione e dalla velocità del dito (M7) | MOLLA + `velocity` | dissolvenza sul posto | il gesto continua, non riparte |
| **Modulo sporco: resistenza** | trascinamento con almeno un campo cambiato | elasticità `ELASTICO_SPORCO` (0.35 invece di 0.9): il foglio cede meno del dito | diretto | uguale | anticipa il "no" prima del rilascio (come `isModalInPresentation` di iOS) |
| Modulo sporco: rilascio oltre soglia | | il foglio **torna su** con la molla e, nello stesso istante, si apre il ConfirmDialog «Scartare le modifiche?» | MOLLA ∥ ENTRATA | salta ∥ dissolvenza | |
| Durante il salvataggio | trascinamento, velo, Esc | il foglio torna su; non si chiude finché l'esito non c'è | MOLLA | salta | il salvataggio non si perde a metà |
| Tastiera virtuale | `visualViewport` `resize` | altezza e posizione seguono il viewport **senza transizione** | — | — | iOS anima la tastiera da sé: qualunque transizione nostra le correrebbe dietro |
| Maniglia | | **nessuna** animazione di layout: oggi ha `layout="position"` (`Sheet.tsx:134`), che fa misurare a Motion la maniglia a **ogni** render, cioè a ogni tasto battuto nel modulo. Va tolto | — | — | |

**Form sheet** (≥ 600px): `opacity` + `scale(calc(1 - .04 * var(--motion-scale))) → 1`, origine al centro, in ENTRATA; uscita SVELTO; niente maniglia, niente trascinamento (UX Q10); `--elev-dialog`. Demo 02 a 720px.

**ConfirmDialog**

| Misura | Entrata | Uscita | Reduced |
|---|---|---|---|
| < 600 (forma di action sheet, opaco) | `opacity` + `translateY(calc(12px * var(--motion-scale)))` + `scale(calc(1 - .04 * var(--motion-scale)))`, origine `50% 100%`, ENTRATA; il suo velo sopra lo sheet in ENTRATA (M5) | SVELTO | dissolvenza |
| ≥ 600 (dialogo centrato largo 320) | `opacity` + `scale(.96 → 1)`, origine al centro, ENTRATA | SVELTO | dissolvenza |

Il pulsante distruttivo non lampeggia, non scuote, non cambia colore all'apertura: la gerarchia la fanno il riempimento `--danger` e la posizione.

**Visore foto** (lightbox, demo 07)

| Momento | Innesco | Proprietà | Tempo | Reduced | Chiarisce |
|---|---|---|---|---|---|
| Apertura | `click` su una miniatura | fondo `--viewer-bg` `opacity` (ENTRATA); immagine: da `translate(Δx, Δy) scale(s)` a `none`, dove `s` è la scala **uniforme** che copre la miniatura e Δ la distanza fra i centri; opacità `0 → 1` nel primo terzo; la miniatura sorgente a `opacity: 0` finché il visore è aperto | immagine MOLLA, opacità SVELTO×0.6 | solo dissolvenze | quale foto si è aperta e da dove |
| Barre del visore (`glass-dark`) | idem | `opacity` | ENTRATA | uguale | |
| Sfoglia | trascinamento orizzontale (asse deciso oltre 8px) | la fila delle foto segue il dito 1:1; ai bordi `0.2` | diretto | uguale | |
| Rilascio sfoglia | spostamento oltre ¼ della larghezza o velocità oltre 550 px/s | molla verso la foto accanto **con la velocità del dito**, altrimenti ritorno | MOLLA + `velocity` | salta | |
| ← / → / pulsanti | tasto o `click` | la stessa molla, senza velocità | MOLLA | salta | |
| Giù per chiudere | trascinamento verticale verso il basso | immagine `translate(dx · .5, dy) scale(1 - min(dy, 400)/1600)`; fondo `opacity 1 - min(dy, 300)/400`; barre `opacity 0` | diretto; barre SVELTO | uguale | |
| Rilascio oltre soglia | `dy > 120` o `v > 550` | l'immagine torna nella **sua** miniatura (quella della foto corrente, anche se hai sfogliato) dalla posizione lasciata dal dito; dissolvenza nell'ultimo 40% | SVELTO | dissolvenza sul posto | dove "vive" la foto nella griglia |
| Rilascio sotto soglia | | ritorno con la molla | MOLLA | salta | |
| Immagine in caricamento | | lo spinner sull'immagine (una delle sole due eccezioni allo skeleton, ART_DIRECTION §11.3) | | fermo | |

L'apertura è la versione **economica**: scala uniforme più dissolvenza nascondono il passaggio dal ritaglio quadrato (1:1, `object-fit: cover`) alla foto intera. Quella "vera" (ritaglio che si apre, `layoutId` di Motion fra miniatura e immagine) corregge raggio e proporzioni a ogni fotogramma sul thread principale: costa più di quanto chiarisca (§12).

**Visori Storia e Wrapped**

| Momento | Proprietà | Tempo | Reduced |
|---|---|---|---|
| Storia: apertura (overlay) | fondo `--viewer-bg` `opacity`; card `opacity` + `scale(calc(1 - .04 * var(--motion-scale))) → 1`; barre `glass-dark` `opacity` | ENTRATA | dissolvenze |
| Storia: cambio palette (radiogroup) | la tela cambia **senza animazione** (è un'anteprima) | — | — |
| Storia: «Generazione…» | etichetta occupata, pulsante disattivo (UX §6.5) | — | — |
| Wrapped: ingresso nella rotta `/wrapped` | il visore c'è subito (è una rotta: niente transizione, ART_DIRECTION D10); la prima card entra con `wrappedin` | `wrappedin` in **ENTRATA** (oggi `.4s`, `WrappedModal.tsx:557`): `opacity` + `translateY(calc(14px * var(--motion-scale)))` + `scale(calc(1 - .015 * var(--motion-scale)))` | nessuna (già così) |
| Wrapped: slide successiva | la card nuova entra con `wrappedin`; la vecchia sparisce nello stesso fotogramma | ENTRATA | nessuna |
| Wrapped: barre di avanzamento | `scaleX(0 → 1)` lineare per la durata della slide; in pausa (dito giù) si fermano dove sono | lineare, `SLIDE_MS` | **restano**: dicono quanto tempo manca. Con reduced-motion l'autoplay è già spento (`WrappedModal.tsx:147`), quindi stanno ferme |

**Dialogo del consenso**: come il ConfirmDialog su mobile (ENTRATA dal basso), sopra a tutto (`--z-consent`). Si apre con la pagina alla prima visita; non ha uscita animata da aspettare: alla scelta esce in SVELTO.

### 4.3 Primitive

**Lo strato di stato.** Tutto ciò che si preme ha un livello sotto il contenuto (`::before`, `z-index: -1` dentro un elemento con `isolation: isolate`) che cambia **solo opacità**:

| Superficie | Tinta dello strato | Hover (`hover: hover`) | Premuto | Reduced |
|---|---|---|---|---|
| Pulsanti (tutte le varianti) | `currentColor` (segue l'etichetta: nessun token nuovo) | `.08`, SVELTO | `.12`, **0ms** all'andata, SVELTO al ritorno; più `scale(var(--press-scale))` in SVELTO | lo strato sì, la scala no: **il feedback resta** |
| Righe di ListGroup, MatchRow interattive | `--surface-pressed` | `1`, SVELTO | `1`, 0ms / SVELTO | uguale |
| Card di entità (`article` + link esteso) | `--surface-pressed` per il premuto; per l'hover un **anello** `inset 0 0 0 1px var(--edge-strong)` in un secondo livello | anello `opacity 0 → 1`, SVELTO | fondo `opacity 1`, 0ms / SVELTO | uguale |
| Disattivo (`aria-disabled`) | — | nessuno | nessuno: niente scala, niente strato. Il tocco su «Crea torneo» disattivo porta al campo che manca (§8.1) | |

Le card **non** si sollevano e **non** scalano (ART_DIRECTION §8). Il loro stato si legge con `:has()`: `.ui-card:has(.stretch:hover)::after`, `.ui-card:has(.stretch:active)::before`, `.ui-card:has(.stretch:focus-visible)` per l'anello di focus sulla card intera. Demo 06.

| Primitiva | Momento | Proprietà | Tempo | Reduced | Note |
|---|---|---|---|---|---|
| **Button** | occupato | etichetta che cambia («Creo…», «Salvataggio…», «Carico…») a `t0`; `min-width` bloccata **prima** del cambio | — | — | nessuno spinner nel pulsante |
| **Anello di focus** | `:focus-visible` | compare **istantaneo** | — | — | nessuna transizione nomina `outline` (R6) |
| **SegmentedControl** | scelta | pillola `translateX(i · 100%)` (segmenti uguali); inchiostro a due livelli | MOLLA | salta / dissolvenza | il **contenuto** della vista cambia nello stesso fotogramma, senza animazione; il **focus resta sul segmento** (M4) |
| **FilterChips** | scelta | pillola **in tre pezzi**: due tappi rotondi che traslano, una barra senza raggio che `scaleX` fra i due. Livelli: fondo della chip (-1) < pillola (0) < etichetta (1) | MOLLA | salta | larghezze diverse senza deformare la capsula e senza animare il raggio (§12). La chip scelta entra in vista con `scrollIntoView({inline: 'nearest'})` |
| | filtro scartato (UX #2) | lo stato torna a "Tutti": la pillola scivola su "Tutti" | MOLLA | salta | |
| **Switch** | cambio | pomello `translateX(20px)`; fondo navy come livello che cambia **opacità** | pomello MOLLA, fondo SVELTO | pomello salta, fondo dissolve | oggi si animano `left` e `background` (`ChiCeOggi.tsx:345-347`) |
| **Campioni colore** (radiogroup) | scelta | anello istantaneo; spunta `opacity` | SVELTO | uguale | |
| **TextField / Select** | focus | anello istantaneo, il bordo resta | — | — | |
| | errore al tentativo d'invio | bordo `--danger` **istantaneo**; messaggio sotto `opacity` + `translateY(calc(-4px * var(--motion-scale)))`; il contenuto sotto scende in un colpo | ENTRATA | dissolvenza | niente scossone (§8.1) |
| **SearchField** | si scrive | i risultati sostituiscono la vista **nello stesso fotogramma**; il sottotitolo (live region) si aggiorna | — | — | chi scrive non aspetta un'animazione per leggere |
| | campo pieno / vuoto | il ✕ ha lo **spazio riservato**: compare con `opacity` e `visibility` | SVELTO | uguale | il testo non si sposta mentre scrivi |
| **Disclosure «Altri dettagli»** | `click` (`aria-expanded`) | contenitore `grid-template-rows 0fr → 1fr` (E1); contenuto interno `opacity`; chevron `rotate(90deg)`; il riassunto dei valori `opacity → 0` | apertura ENTRATA, chiusura SVELTO | **istantaneo** (righe, chevron) | in modifica è già aperto e non si anima (è lo stato di partenza) |
| **Righe dei set** (Nuova partita) | «＋ Aggiungi set» / «Togli set N» | come la disclosure (E1, `data-motion-exception="riga-set"`) | ENTRATA / SVELTO | istantaneo | il focus va al campo «Noi» del set nuovo, a `t0` |
| **Avatar** | caricamento di una foto | **anteprima locale** (`URL.createObjectURL`) subito al 60% di opacità + spinner (UX §6.8); a successo `opacity → 1` | SVELTO | uguale | |
| **Badge, Pill, EmptyState** | | nessuna animazione | — | — | lo stato vuoto tipografico non entra con un effetto |
| **Skeleton** | | §6.2 | | | |

**Inserire e togliere in una pila verticale (fuori dagli sheet).** Banner alpha chiuso, modulo di check-in che diventa la card «Sei a X oggi», campo «Nome» che compare in Registrati, riga città della Mappa che si apre: **nessuna altezza animata**. Lo schema è uno solo:

1. chi esce va **fuori dal flusso a `t0`** (posizione assoluta dov'era, come `AnimatePresence mode="popLayout"`) e svanisce in SVELTO;
2. chi entra c'è subito al suo posto e compare in ENTRATA (`opacity`, più `translateY(calc(8px * var(--motion-scale)))` se è una card);
3. ciò che sta **sotto** fa un FLIP verticale in MOLLA: se è un contenitore solo, un elemento; se sono righe sorelle, ognuna (`layout="position"` di Motion), fino a `FLIP_MAX`.

Le righe sotto sono opache e scivolano sopra il contenuto che compare o svanisce: si legge come un cassetto, ed è tutto transform.

### 4.4 Dati

| Elemento | Momento | Proprietà | Tempo | Reduced | Note |
|---|---|---|---|---|---|
| **Numeri** (StatTile, StatGrid, numeri chiave, KeyNumbers) | cambio di valore per una causa (partita salvata o eliminata, filtro) | **il tabellone** (§10): strisce di cifre che `translateY` | ±1 MOLLA; altrimenti RACCONTO | arrivano fermi | |
| | primo montaggio della **sessione** per quella schermata | salita da 0 | RACCONTO | fermi | una volta sola (M1) |
| | montaggi successivi (tab, indietro) | **fermi**, nessuna salita | — | — | così, quando un numero si muove, vuol dire che è cambiato |
| **Barre** (MeterRow, Piazzamenti, Punti) | montaggio e cambio di filtro | la barra è larga quanto il binario, arrotondata, e sta dentro il binario con `overflow: hidden`: si anima `translateX(calc((valore - 100) * 1%))`. Il bordo destro resta tondo a ogni fotogramma | RACCONTO, una volta per causa | arrivano ferme | oggi `transition: width` (`ui.tsx:337`, `PlacementCard.tsx:15`, `PointsCard.tsx:15,24`). `scaleX` schiaccerebbe le estremità |
| **Anello vinte/perse** | montaggio, cambio di filtro | `stroke-dasharray` (E2) | RACCONTO (oggi `.8s ease`) | nessuna | |
| **Linea Andamento** | primo montaggio | `stroke-dashoffset` (E2) | RACCONTO (oggi `dash 1.2s`) | nessuna | |
| | cambio di filtro | **dissolvenza incrociata** vecchia linea → nuova (`opacity`), niente ridisegno da zero | SVELTO | dissolvenza | ridisegnare a ogni filtro è decorazione |
| **Mappa (Leaflet)** | zoom, tile, cluster | interne alla libreria (E4) | | spente (già fatto) | |
| | riga città aperta da un pin | la riga si apre (schema §4.3) e la lista la porta in vista: `scrollIntoView({block: 'nearest'})` | smooth | auto | |
| **VenueMap** | chunk in arrivo | segnaposto alto 200 (§6.3), poi le tile in dissolvenza (`fadeAnimation`) | | spenta | il link «Apri la mappa ↗» c'è anche durante il caricamento |
| **Liste** (tornei, timeline, partite, compagni) | `reload()`, cambio di stagione, ricerca | **nessuna**: le righe sono già al loro posto (ART_DIRECTION §11.3) | — | — | |
| | **una** riga creata, cambiata o eliminata da te | §10 (traccia, uscita con FLIP) | | | |

---

## 5. Le transizioni dei flussi

Tempi in ms da `t0` = il tocco, salvo dove è scritto `t0 = esito` (la risposta della rete). Ogni riga è un fatto che **parte** in quel momento.

### F0. Avvio

| t | Che cosa |
|---|---|
| 0 | Splash (unico, UX F0) |
| dati pronti | l'app si disegna sotto lo splash; lo splash `opacity → 0` in SVELTO, già trasparente ai tocchi; il focus all'h1 della rotta |
| 10.000 | «Ci sta mettendo più del solito.» con [Riprova], in ENTRATA |
| primo caricamento fallito | ErrorState senza animazione; [Riprova] §8.4 |

### F1. Primo avvio

Niente animazione di benvenuto. Lo «0» da tabellone dello stato vuoto (ART_DIRECTION §2.4.5) **non** sale: è fermo, perché è vero.

### F2. Creare un torneo

| t | Che cosa |
|---|---|
| 0 | tocco sul ＋ → menu (§4.2) |
| scelta | menu esce ∥ sheet sale (MOLLA), stesso velo; focus secondo §3.5 |
| «Crea torneo» | stesso fotogramma: «Creo…», `aria-busy`, campi `readonly`; il doppio tocco non fa niente |
| `t0 = esito` ok | la rotta `/tornei/:id` si disegna **sotto** lo sheet; lo sheet esce (SVELTO, `frost`); il velo esce (SVELTO); toast «Torneo creato» (ENTRATA); focus all'h1 del torneo |
| `t0 = esito` errore | il pulsante torna a riposo; toast d'errore persistente; lo sheet resta, i dati restano, il focus resta sul pulsante (§8.2) |
| «Usa l'assistente» col modulo sporco | ConfirmDialog sopra lo sheet (§3.7) |

### F3. Aggiungere una partita → «Punto segnato»

| t | Che cosa |
|---|---|
| 0 | da Home, dal ＋ o dal dettaglio: sheet Nuova partita |
| «Salva partita» | «Salvataggio…» |
| `t0 = esito` ok, **già sul dettaglio** | sheet esce (SVELTO); la lista delle partite è **già** nello stato nuovo, la riga nuova porta la **traccia** (§10); a `t0 + SVELTO` il tabellone del torneo scatta; toast «Partita aggiunta»; focus a «＋ Aggiungi partita» |
| `t0 = esito` ok, **da un'altra schermata** | la rotta `/tornei/:id` si disegna sotto lo sheet; la riga nuova arriva con la traccia (l'id passa nello `state` della navigazione); i numeri sono **fermi** (non c'è un "prima" visto su questa schermata, e salire da zero nasconderebbe la differenza); toast «Partita aggiunta a «X»» |
| errore | §8.2 |

### F4. Tornei: viste, ricerca, filtri

| Momento | Che cosa |
|---|---|
| Segmented Lista · Timeline · Mappa | pillola MOLLA; vista nuova nello stesso fotogramma; focus sul segmento (M4); la Timeline e la Mappa, se il chunk non c'è, mostrano lo skeleton (§6) |
| Si scrive nella ricerca | risultati e sottotitolo nello stesso fotogramma; il segmented e le chip **spariscono senza animazione** (UX F4) e ricompaiono uguali quando la ricerca si svuota |
| Chip di formato | pillola a tre pezzi, MOLLA; la lista sotto cambia nello stesso fotogramma |
| Tocco su una card | strato premuto a 0ms; push della rotta nello stesso task: lo stato premuto si vede al più un fotogramma, ed è giusto così (nessuna attesa artificiale) |
| Indietro dal dettaglio | la lista torna con lo scroll e il focus ripristinati **senza animazione** (UX §4.2, §4.4) |
| «Mostra altri 60» (Timeline, PUÒ) | le voci nuove compaiono senza animazione; il focus va al link della prima voce nuova |

### F5. Dettaglio torneo

| Momento | Che cosa |
|---|---|
| «⋯» | popover dal pulsante (§4.2) |
| Modifica | sheet con «Altri dettagli» già aperto; a successo lo sheet esce, ciò che è cambiato **nell'intestazione** (nome, badge del piazzamento) porta la traccia; toast «Torneo aggiornato» |
| Elimina torneo | ConfirmDialog; a successo: dialogo esce (SVELTO), `replace` verso `/tornei` (nessuna animazione di rotta), toast «Torneo eliminato». A errore: dialogo esce, si resta, toast d'errore (UX C13) |
| Elimina partita (dallo sheet) | ConfirmDialog sopra lo sheet; a successo escono **insieme** dialogo e sheet; la riga esce con lo schema di §4.3 (fuori flusso, SVELTO, le righe sotto in FLIP); il tabellone scatta all'indietro |
| Aggiungi foto | sheet; scelta del file → **anteprima locale** subito, al 60%, con «Carico…» (lo sheet non si chiude, UX F5); a successo lo sheet esce, la cella nuova nella griglia porta la traccia |
| Elimina foto | ConfirmDialog; a successo la cella esce (`opacity` + `scale(calc(1 - .04 * var(--motion-scale)))`, SVELTO, fuori flusso) e le celle **dopo** di lei scalano in FLIP (MOLLA, fino a `FLIP_MAX`). Demo 07 |
| Tocco su una foto | visore (§4.2) |

### F6. Chi c'è oggi

| Momento | Che cosa |
|---|---|
| «Fai check-in» | «Check-in…» |
| esito ok | il modulo esce (fuori flusso, SVELTO); la card «Sei a {città} oggi» entra al suo posto (ENTRATA, `translateY(calc(8px * var(--motion-scale)))`); la stanza sotto fa un FLIP del contenitore (MOLLA) e mostra il suo skeleton (§6.3) |
| «Termina check-in» | ConfirmDialog leggero; a successo lo stesso schema al contrario |
| Switch «Cerco compagno» | §4.3 |
| «＋ Aggiungi come compagno» | occupato; a successo il pulsante e «Aggiunto ai compagni» si scambiano **sul posto** (dissolvenza incrociata SVELTO, stessa altezza riservata) |

### F7. Compagni

Nuovo compagno: sheet corto; a successo esce e la card nuova nella griglia porta la traccia. Collega: i risultati della ricerca sostituiscono la lista nello stesso fotogramma («Cerco…» come testo); a successo lo sheet esce e la riga «Collegato a un utente» porta la traccia. Scollega ed Elimina: ConfirmDialog, poi come F5.

### F8. Statistiche e Wrapped

| Momento | Che cosa |
|---|---|
| Cambio di Compagno o Stagione | i numeri scorrono dal vecchio al nuovo (RACCONTO), le barre traslano, l'anello si ridisegna (E2), la linea fa la dissolvenza incrociata; gli stati vuoti delle card cambiano **senza** animazione; un solo annuncio polite (UX §6.2) |
| «Beach Wrapped ›» | push di `/wrapped`: §4.2 |

### F9. Profilo

| Momento | Che cosa |
|---|---|
| Si modifica il Nome | «Salva nome» compare nello **spazio già riservato** (`opacity` + `visibility`, ENTRATA): il campo non si sposta mentre scrivi |
| «Salva nome» | «Salvataggio…»; esito inline (ENTRATA, §4.3) |
| Cambia foto profilo | §4.3 Avatar |
| Esci | action sheet «Esci dall'account» (come il menu ＋, origine sulla riga) |

### F10. Segnala e segnalazioni

| Momento | Che cosa |
|---|---|
| Invio riuscito | il modulo esce (fuori flusso, SVELTO) e il pannello «Grazie, l'abbiamo ricevuta» entra al suo posto (ENTRATA); focus al titolo del pannello |
| Admin: cambio di stato (ottimistico) | la pillola della chip di stato scivola **subito** (MOLLA). Se la segnalazione esce dal filtro corrente: esce dalla lista (fuori flusso, SVELTO) e le righe sotto salgono (FLIP). Se la rete fallisce: §8.3 |

### F11. Assistente

| Momento | Che cosa |
|---|---|
| Ingresso in `/crea` | nessuna transizione di rotta; il primo messaggio c'è già, **senza** pausa "sta scrivendo" (la schermata si è appena aperta) |
| L'utente risponde | la sua bolla compare **subito** (ENTRATA, `translateY(calc(8px * var(--motion-scale)))`): è l'eco del tocco |
| Pausa "sta scrivendo" | **un solo** indicatore (UX §6.10), per `battitura(n)` ms (§2.3); il dock resta montato e disattivo |
| Durante la pausa | **qualunque input sul dock la interrompe**: la domanda compare subito e il tasto o il tocco vanno a segno. La pausa è ritmo, non un cancello (R3) |
| Domanda nuova | bolla in ENTRATA; focus al primo controllo del dock **quando la bolla entra nel DOM**, non a fine animazione |
| Scorrimento della trascrizione | in fondo, smooth, **solo se** l'utente era già entro 80px dal fondo; se sta rileggendo più su, non lo si strappa via |
| Puntini dell'indicatore | i tre puntini `opacity` + `translateY(-3px)` sfalsati di 160ms: è l'unico sfalsamento dell'app, perché è un indicatore e non una lista | 
| Con reduced-motion | pausa 0, nessun indicatore, scorrimento `auto` (UX F11.4) |
| Successo | «Fatto!» come bolla in ENTRATA; «Apri il torneo» → `replace` senza animazione |

---

## 6. Caricamento

### 6.1 Spinner: solo due, e nessun altro

Lo spinner esiste **solo** sull'immagine del visore foto e sull'avatar che si sta caricando (ART_DIRECTION §11.3). Ovunque si aspetti un contenuto con una forma nota c'è lo **skeleton**; ovunque si aspetti l'esito di un'azione c'è l'**etichetta occupata** del pulsante.

### 6.2 Lo skeleton in tre tempi (demo 05)

| Da quando l'area chiede i dati | Che cosa si vede |
|---|---|
| **0ms** | lo spazio è **riservato all'altezza giusta**, ma è vuoto. Nessuno spostamento quando arriva il contenuto |
| **150ms** (`--delay-skeleton`) | compaiono le forme `--fill`, in ENTRATA (opacità). Un chunk già in cache arriva prima: nessun lampo grigio |
| **600ms** (`--delay-respiro`) | parte il respiro `opacity 1 ↔ .55`, RESPIRO, `alternate infinite`. Mai lo shimmer (pittura per fotogramma su tutta l'area) |
| **contenuto arrivato** | sostituisce lo skeleton **sul posto**, in SVELTO (opacità). Se è arrivato prima dei 150ms, **senza** dissolvenza: non c'era niente da sostituire |

- Il contenitore ha `aria-busy="true"` e un testo nascosto «Caricamento…» (UX §7.11).
- Lo skeleton e il suo respiro sono **due elementi** annidati: due `animation` sullo stesso nodo si cancellano a vicenda (trovato nella demo 05).
- Con reduced-motion: le forme compaiono uguali, il respiro è **spento esplicitamente** (`animation: none; opacity: .75`). Non basta `--dur-respiro: 0ms`: un'animazione infinita a durata zero è un caso limite della specifica.
- **Liste**: lo skeleton riempie la **prima schermata** e basta. Quante voci arriveranno non si sa; sotto la piega non si promette niente.
- **Navigazione**: la rotta nuova si disegna subito (NavBar, h1) e l'area lazy mostra lo skeleton. **Mai** tenere la schermata vecchia finché il chunk non arriva (`startTransition`): il tocco sembrerebbe non aver fatto niente.

### 6.3 Inventario degli skeleton

| Area (UX §6) | Forma | Misure |
|---|---|---|
| Tornei · Timeline (chunk lazy) | voce: colonna data (barra 40×20 + 28×12) e corpo (titolo 70% × 16, meta 45% × 12, copertina 16:10 a voci alterne) | colonna data 64 (< 600) / 78; le barre occupano esattamente l'interlinea (22 per il titolo, 18 per la meta). Misurato: 598 contro 600px reali sulla prima schermata |
| Tornei · Mappa | riquadro `--radius-card` | `MAPPA_H = 380` (UX C3); statistiche e legenda **non** aspettano: sono dati client |
| VenueMap | riquadro | alto 200, raggio della mappa |
| Chi c'è oggi · stanza | due card persona (avatar 40 + due righe) | più il testo «Aggiornamento…» (`role=status`) sopra |
| Segnalazioni (admin) | righe di ListGroup a due righe | fino alla prima schermata |
| Assistente `/crea` (chunk) | la cornice vera (✕, titolo, dock vuoto) **subito**, una bolla skeleton | |
| Storia (chunk) | la card in scala 9:16, `--radius-card` | come la card vera |
| Wrapped | le barre di avanzamento vere e la card skeleton | «Preparo…» sul pulsante finché il PNG non è in cache (UX §6.5) |
| Statistiche | **nessuno**: il calcolo client è istantaneo e la RPC "non deve far saltare" i numeri (UX §6.2) | |

### 6.4 Chunk lazy fallito

Riquadro d'errore **nell'area** («Questa parte non si è caricata.» con [Riprova], UX §6.0), che entra in ENTRATA al posto dello skeleton. [Riprova] → §8.4 → di nuovo lo skeleton nei tre tempi → il contenuto.

---

## 7. Feedback immediato e ottimistico

**Immediato sempre, ottimistico solo dove un errore non costa dati.** Il refactor non ha una coda di scritture offline (UX §2.2, fuori scope), e UX vuole che il modulo «non vada mai perso per una rete instabile»: quindi i salvataggi aspettano il server, ma **rispondono subito**.

| Azione | Nello stesso fotogramma | Ottimistico? | Successo | Errore |
|---|---|---|---|---|
| Filtri, segmented, chip, interruttori, ricerca | lo stato nuovo, già leggibile | sì (è locale) | — | — |
| Chiudere il banner alpha | il banner esce (§4.3, schema pila) | sì (`localStorage`) | — | — |
| Cambio di stato di una segnalazione (admin) | la pillola scivola; la riga esce dal filtro se deve | **sì** (UX §6.8) | — | §8.3 |
| Crea o modifica torneo, partita, compagno | «Creo…» / «Salvataggio…», campi bloccati | no | §5 F2, F3 | §8.2 |
| Foto (torneo e avatar) | **anteprima locale** dal file scelto, al 60%, più «Carico…» o lo spinner | l'immagine sì, il salvataggio no | opacità a 1, traccia | anteprima tolta, errore inline |
| Check-in, Termina, Aggiungi come compagno | etichetta occupata | no | §5 F6 | Toast o inline (UX §6.7) |
| Risposta all'assistente | la bolla dell'utente | sì (è un'eco) | | |
| Eliminazioni | ConfirmDialog, poi etichetta occupata sul pulsante distruttivo | no | uscita della riga o `replace` | il dialogo esce, si resta |

---

## 8. Recupero dagli errori

### 8.1 Niente scossone

Lo "shake" orizzontale non c'è, da nessuna parte. È un movimento brusco (il primo che chi soffre di disturbi vestibolari chiede di togliere), non dice **dove** è l'errore e non funziona con reduced-motion. Al suo posto:
- il campo sbagliato prende il bordo `--danger` (istantaneo), `aria-invalid`, il messaggio sotto (ENTRATA);
- il **focus va al primo campo sbagliato** a `t0`, e l'area dello sheet lo porta in vista: `scrollIntoView({block: 'center', behavior: reduced ? 'auto' : 'smooth'})`;
- toccare un pulsante `aria-disabled` («Crea torneo» col Nome vuoto) fa la stessa cosa: un pulsante che non risponde in silenzio sembra rotto. (UX dice "disattivo": lo resta per gli screen reader, con `aria-disabled` invece dell'attributo `disabled`.)

### 8.2 Salvataggio fallito

Il pulsante torna a riposo, il toast d'errore entra (persistente, `role="alert"`), lo sheet resta aperto e **non si muove**, il focus resta sul pulsante. Nessuna animazione "di errore": l'informazione è nel toast, e i dati sono lì.

### 8.3 Ottimismo smentito

La segnalazione il cui cambio di stato fallisce **torna indietro con la stessa molla** con cui era andata (la pillola risale sullo stato di prima; se era uscita dal filtro, rientra al suo posto con la traccia), più il toast d'errore. Lo stesso movimento all'inverso dice "non è successo", meglio di qualunque segnale nuovo.

### 8.4 «Riprova»

- Etichetta occupata («Riprovo…») a `t0`, per **almeno `BUSY_MIN_MS` (300ms)** anche se la rete risponde "no" in un fotogramma (offline): un tentativo che dura 10ms non si vede, e l'utente crede che il pulsante non funzioni. Vale **solo** per i "Riprova", mai per i salvataggi riusciti.
- Se fallisce ancora: il riquadro d'errore **rientra** (la sua comparsa in ENTRATA riparte), così si vede che il tentativo c'è stato senza un testo nuovo. (PUÒ, `⟂ UX`: una riga «Ultimo tentativo alle {hh:mm}».)
- ErrorState del primo caricamento: con l'evento `online` riprova da sé una volta (UX §6.0), con lo stesso stato occupato sul pulsante.

### 8.5 Gesti rifiutati

Un trascinamento che non può chiudere (modulo sporco, salvataggio in corso) **resiste prima** (elasticità 0.35) e **torna dopo** (molla con la velocità del dito). Non si chiude e poi si riapre.

---

## 9. Scroll

### 9.1 Effetti legati allo scroll: solo a soglia

| Effetto | Come | Perché così |
|---|---|---|
| NavBar che diventa vetro, titolo compatto, lente | `IntersectionObserver` su una sentinella, **cambio di stato** in SVELTO | nessun listener di scroll, nessun valore calcolato per fotogramma: su iOS gli effetti legati allo scroll scattano (ART_DIRECTION §11.3) |

### 9.2 Rifiutati, con il motivo

| Effetto | Perché no |
|---|---|
| Large title che si rimpicciolisce con lo scroll | scalare del testo grande lo ri-rasterizza (sfocato a metà corsa) e lega un'animazione al thread dello scroll; ART_DIRECTION §11.3 |
| Parallasse, sole basso che si muove | decorazione; `background-attachment: fixed` non funziona su iOS; ART_DIRECTION §4.2 (`--bg-canvas` non è `fixed`). **Nell'app.** Sulla landing il tramonto dell'hero è permesso, con timeline native e i limiti della Parte L (EL1, §L5.6) |
| TabBar che si nasconde scorrendo in giù (iOS 26) | sposta la navigazione principale sotto il pollice in modo imprevedibile, proprio per la persona che usa una mano sola (UX P1) |
| Pull-to-refresh | il `reload()` scatta già a ogni rotta, focus e ritorno visibile (UX §4.9); in modalità standalone combatte con l'overscroll di iOS |
| CSS scroll-driven animations (`animation-timeline: scroll()`) | supporto su Safari troppo recente per la persona primaria, e servirebbero solo agli effetti qui sopra |
| Header di sezione "sticky" animati | nessun valore informativo in più di quello statico |

### 9.3 Scroll programmatici

| Caso | Comportamento | Reduced |
|---|---|---|
| Push di una rotta | in cima, **istantaneo** | uguale |
| Indietro / avanti | posizione salvata, **istantanea** (UX §4.2) | uguale |
| Ritocco della tab attiva, lente nella NavBar | se `scrollY > SALTO_SCROLL`: prima un salto secco a una schermata dalla cima, **poi** `smooth` fino a 0 (lo smooth di Chrome da 8.000px in su dura ~1,5s; col salto ~0,44s) | `auto` |
| Primo campo sbagliato in uno sheet | `scrollIntoView({block: 'center'})`, smooth | `auto` |
| Chip scelta in una riga che scorre | `scrollIntoView({inline: 'nearest'})`, smooth | `auto` |
| Riga città aperta da un pin (Mappa) | `scrollIntoView({block: 'nearest'})`, smooth | `auto` |
| Voce attiva di un combobox (VenuePicker) | `block: 'nearest'`, **istantaneo** (si segue la freccia, non si aspetta) | uguale |
| Trascrizione dell'assistente | §5 F11 | `auto` |
| `scroll-behavior: smooth` nel CSS | **mai** globale: renderebbe smooth anche il ripristino dello scroll e i salti delle ancore | |

Dentro gli sheet: `overscroll-behavior: contain` (già fissato da `Sheet.test.tsx`).

---

## 10. Il momento firmato: «Punto segnato»

### 10.1 Che cos'è

ART_DIRECTION fa dei numeri il soggetto dell'app (mossa firmata 3, «I numeri da tabellone»). Il movimento rende quella metafora **letterale** in un solo momento: **quando segni una partita, il tabellone scatta.**

Salvi una partita vinta: lo sheet scende, la riga nuova è già in cima alla lista con un velo arancio pallido che si spegne, e le cifre delle statistiche del torneo **girano come quelle di un tabellone segnapunti**: «Partite» da 3 a 4 con uno scatto secco, «Vinte» da 2 a 3, «Punti» da 125 a 167 con una corsa più lunga. Ogni cifra rotola solo se cambia; quelle che restano non si muovono.

Non è decorazione: è la **conseguenza visibile** del tocco. Dice *cosa* è cambiato (solo quelle celle), *di quanto* (uno scatto o una corsa) e *dove* è finito il dato (la riga con la traccia). Ed è possibile solo perché il resto dell'app sta fermo (M1): se i numeri salissero a ogni apertura di schermata, lo scatto di un punto si perderebbe nel rumore.

Demo 04 (`docs/motion/04-punto-segnato.html`).

### 10.2 La coreografia

| t | Che cosa | Proprietà | Tempo |
|---|---|---|---|
| tocco su «Salva partita» | «Salvataggio…», larghezza bloccata | — | stesso fotogramma |
| **`t0` = esito ok** | lo sheet esce (`frost`), il velo esce | `translateY → 100%`, `opacity` | SVELTO |
| `t0` | la lista è **già** nello stato nuovo: la riga non "entra", c'è | — | — |
| `t0` | la riga nuova riceve la **traccia**: un livello `--accent-wash` sotto il contenuto, pieno | `opacity 1` | — |
| `t0` | toast «Partita aggiunta» in alto (dove lo sheet non c'è) | §4.1 | ENTRATA |
| `t0 + SVELTO` | **il tabellone scatta**, solo le celle cambiate, solo se il tabellone è in vista | strisce di cifre `translateY` | ±1: MOLLA · altrimenti RACCONTO |
| `t0 + SVELTO` | la traccia comincia a spegnersi | `opacity 1 → 0` | RACCONTO, `--ease-respiro` |
| ~`t0 + 1s` | tutto fermo | | |

Il ritardo di SVELTO è **causale** (§2.2.4): l'effetto parte quando la sua causa ha liberato la vista. Un tabellone che scatta dietro uno sheet che scende non lo vede nessuno.

Lo stesso tabellone, senza traccia, gira **all'indietro** quando elimini una partita (la riga esce con lo schema di §4.3) e **corre** in RACCONTO quando cambi stagione o compagno in Statistiche. Dove la causa non è un tuo gesto (un `reload()`, un'altra scheda) i numeri arrivano fermi.

### 10.3 Come è fatto il tabellone (`⟂ F2`, sostituisce `NumeroCheSale`)

- **Struttura**: per ogni cifra una colonna ritagliata in verticale (`clip-path: inset(0 -0.2em)`, ferma) che contiene una **striscia** di 21 celle: `[vuoto, 0–9, 0–9]`, alte un'interlinea (`--lh`, 1.875rem per `--type-num-l`, 2.5rem per `--type-num-xl`, 3.5rem per `--type-num-hero`). Il valore è la posizione della striscia: `translateY(calc(var(--k) * -1 * var(--lh)))`. Cambiare valore = cambiare `--k` con una transizione su `transform`. **Solo transform, sul compositor.** Il `NumeroCheSale` di oggi riscrive il testo a ogni fotogramma per 800ms (E3).
- **Il secondo giro** serve a passare da 9 a 0 **in avanti**, come un contachilometri: in salita, se la cifra nuova è minore della vecchia, si va all'indice del secondo giro (+10) e a fine corsa si ricolloca la striscia sul primo giro, senza transizione (stessa immagine). In discesa, il simmetrico.
- **Direzione**: valori che crescono rotolano verso l'alto, valori che calano verso il basso.
- **Quando il numero guadagna o perde una cifra** (9 → 10, 10 → 9): la colonna nuova entra dal vuoto; la colonna che se ne va esce dal flusso (assoluta dov'era), rotola al vuoto e svanisce; le cifre che restano fanno un FLIP orizzontale di una colonna (transform). Provato con 3 → 23, 125 → 926 e ritorno.
- **Caratteri non numerici** («%», «+», «-»): fermi, prima e dopo le colonne. Le stringhe formattate (`"67%"`) quindi **scattano anche loro**, cosa che `NumeroCheSale` non sa fare (anima solo i `number`).
- **Accessibilità**: le strisce sono `aria-hidden` e `user-select: none`; accanto c'è uno `span` visivamente nascosto con il valore finale, già aggiornato a `t0`. Nessun annuncio dal vivo: lo fa il toast.
- **Solo se in vista**: se il tabellone è fuori dallo schermo il valore arriva fermo. Un giro che nessuno guarda è solo lavoro.
- **Interruzione**: un valore nuovo a metà corsa riparte dall'arrivo del precedente (salto di al più una cifra a metà rotolamento; raro).
- **Una salita da zero per sessione e per schermata** (chiave `sessionStorage`: `home`, `statistiche`, `torneo:{id}`, `compagno:{id}`). Dopo, la schermata si apre con i numeri fermi (M1).
- **Reduced-motion**: le strisce saltano al valore finale (`transition: none`); la traccia resta e si spegne in ENTRATA (con `--dur-racconto` a zero sparirebbe di colpo).
- **Costo**: 6 celle × 3 cifre × 21 celle di striscia = ~380 nodi per un dettaglio torneo, tutti fermi tranne quelli che scattano; ogni scatto è un transform per colonna. Il fallback economico, se servisse, è `NumeroCheSale` con `contain: layout paint` sullo `span` e le cifre tabellari (la pittura resta, ma il layout non esce dalla cella).

### 10.4 La traccia, altrove

Lo stesso livello `--accent-wash` che si spegne segna **ogni entità creata o cambiata da un tuo gesto, quando la si vede dopo che l'overlay se n'è andato**: la card del compagno nuovo, la cella della foto aggiunta, l'intestazione del torneo modificato, la riga «Collegato a un utente», la segnalazione che rientra dopo un errore (§8.3). È arancio perché è il risultato di un'azione (ART_DIRECTION §4.3.1: arancio = azione), è sotto il contenuto (il testo resta `--ink` su un fondo a 12.07:1) e dura meno di un secondo.

---

## 11. Riduzione del movimento: la matrice

### 11.1 I meccanismi

| Livello | Come | Cosa copre |
|---|---|---|
| CSS, scostamenti di passaggio | `--motion-scale: 0` (già in `tokens.css`) | entrate e uscite di sheet, menu, dialoghi, toast, titolo compatto |
| CSS, spostamenti fra stati di riposo | `@media (prefers-reduced-motion: reduce) { transition: none }` sul singolo elemento | pillole, pomello, chevron, strisce del tabellone, disclosure (E1) |
| CSS, animazioni infinite | `animation: none` esplicito | skeleton, puntini dell'assistente |
| CSS, pressione | `--press-scale: 1` (già in `tokens.css`) | scala delle capsule; lo strato di stato resta |
| Motion | `MotionRoot reducedMotion="user"` (già c'è) | molle, `layout`, `layoutId`, `drag` (il rilascio salta, il trascinamento resta) |
| JS | `useReducedMotion()` di Motion (una fonte sola) | `scrollTo`/`scrollIntoView` (`behavior`), `battitura(n)`, tabellone, autoplay di Wrapped, opzioni di Leaflet |

### 11.2 Che cosa resta, sempre

- **Le dissolvenze** (opacità): sheet, dialoghi, menu, toast, NavBar, contenuto che arriva (ART_DIRECTION §11.2).
- **Il feedback di pressione** (lo strato), che non è movimento.
- **La traccia** sulle righe nuove (§10.4), in ENTRATA.
- **La manipolazione diretta**: lo sheet e le foto seguono il dito. È l'utente a muoverli; cambia solo che al rilascio non volano, saltano o svaniscono.
- **Le barre di avanzamento di Wrapped**, che dicono il tempo (ferme, perché l'autoplay è spento).

### 11.3 La matrice

| Elemento | Normale | Reduced-motion |
|---|---|---|
| Sheet: entrata / uscita | `translateY` MOLLA / SVELTO | dissolvenza SVELTO |
| Sheet: rilascio | molla con velocità | salto (ritorno) o dissolvenza sul posto (chiusura) |
| Form sheet, ConfirmDialog, Storia | opacità + scala .96 | opacità |
| Menu ＋ | opacità + 12px + scala .96, MOLLA | opacità |
| Popover | opacità + 4px | opacità |
| Toast | opacità + 8px; FLIP dei restanti; cenno del contatore | opacità; salto; nessun cenno |
| NavBar | vetro in opacità, titolo opacità + 4px | vetro e titolo in opacità (M9) |
| Pillole (tab, segmented, chip, sidebar) | MOLLA | salto; l'inchiostro in dissolvenza |
| Switch | pomello MOLLA, fondo opacità | pomello salta, fondo opacità |
| Pressione capsule | scala .97 + strato | strato |
| «Altri dettagli», righe dei set | `grid-template-rows` ENTRATA, chevron | istantaneo |
| Inserire/togliere in una pila | uscita fuori flusso + FLIP MOLLA | dissolvenze, il resto salta |
| Tabellone | strisce MOLLA / RACCONTO | valore finale |
| Salita da zero (prima volta) | RACCONTO | valore finale |
| Traccia | opacità RACCONTO dopo SVELTO | opacità ENTRATA dopo SVELTO |
| Barre dei grafici | `translateX` RACCONTO | ferme |
| Anello, linea (E2) | pittura RACCONTO | ferme |
| Skeleton | forme in 150ms, respiro da 600ms | forme in 150ms, ferme a .75 |
| Visore foto: apertura / chiusura | zoom dalla miniatura | dissolvenza |
| Visore foto: sfoglia | molla con velocità | salto |
| Wrapped: card | `wrappedin` | nessuna |
| Wrapped: autoplay | sì | no (già così) |
| Assistente: pausa, indicatore | `battitura(n)`, puntini | 0, nessuno |
| Scroll programmatici | `smooth` | `auto` |
| Leaflet | zoom, dissolvenze, cluster animati | spenti (già così) |

---

## 12. Costi: cosa è caro e cosa usare al suo posto

| Effetto | Perché costa | Al suo posto |
|---|---|---|
| Animare il raggio di `backdrop-filter` | ricalcolo della sfocatura a ogni fotogramma; su Safari `-webkit-backdrop-filter` è già fragile | animare l'**opacità** di un livello di vetro sempre presente (NavBar, ART_DIRECTION §9.3) |
| Una superficie di vetro che si muove (sheet che sale) | la sfocatura si ricampiona a ogni fotogramma, come quando il contenuto scorre sotto la TabBar | ammessa entro il budget; chi **esce** passa a `frost` a `t0` (§3.4) |
| Vetro a opacità 0 | trasparente ma composto lo stesso, e conta | `visibility: hidden` quando è a 0 (§3.4.2) |
| `height: auto` (menu di `BottomNav.tsx:190`, righe città di `Mappa.tsx:293`) | layout e pittura di tutto ciò che sta sotto, a ogni fotogramma | origine e scala (menu ＋); uscita fuori flusso + FLIP (righe città). Unica eccezione E1 |
| `transition: width` sulle barre | layout per fotogramma, su più barre insieme (percorso caldo, caso 2) | barra piena dentro il binario `overflow: hidden`, `translateX` (§4.4). **Non** `scaleX`: schiaccia le estremità tonde |
| `layoutId` su una capsula che cambia larghezza (FilterChips di oggi) | Motion scala la pillola e **corregge `border-radius` a ogni fotogramma** (pittura, thread principale) | pillola in tre pezzi: due tappi che traslano e una barra senza raggio in `scaleX` (§4.3, demo 06) |
| `left` sul pomello e `background` sul fondo dell'interruttore (`ChiCeOggi.tsx:345-347`) | layout e pittura | `translateX` + livello navy in opacità |
| `border-color` in hover su ogni card (`.lift`, oggi con anche `translateY(-2px)`) | scorrendo con la rotella le card passano in hover una dopo l'altra: una ridipintura per card | anello in un livello che cambia opacità (§4.3) |
| Ombre animate (sollevamento, "pressione profonda") | `box-shadow` si ridipinge a ogni fotogramma, e la sfocatura dell'ombra è cara | nessuna ombra si anima; l'elevazione è fissa per livello (ART_DIRECTION §7) |
| Shimmer degli skeleton (`background-position` animato) | pittura di tutta l'area per fotogramma, all'infinito | respiro in opacità, che parte solo dopo 600ms |
| Velo con `backdrop-filter: blur(3px)` / `blur(6)` (`Sheet.tsx:88`, `StoryModal.tsx:110`, `BottomNav.tsx:134`) | una superficie sfocata a tutto schermo **in più**, che sfora il budget | `--scrim` piatto (UX §10) |
| Testo del contatore riscritto a ogni fotogramma (`NumeroCheSale`) | layout e pittura dello span per 800ms, su 4–6 numeri insieme | il tabellone (§10.3); fallback `contain: layout paint` |
| `layout` di Motion su un elemento che non si sposta (maniglia, `Sheet.tsx:134`) | Motion lo misura a **ogni render** del componente: in uno sheet, a ogni tasto | togliere `layout` |
| FLIP su molti elementi (griglia di 30+ foto, liste lunghe) | misurare e animare N nodi; su un Android economico la misura costa più del movimento | sopra `FLIP_MAX` (24) elementi in movimento il layout cambia senza animazione; e si muovono solo gli elementi **dopo** quello tolto |
| Zoom "vero" del visore (`layoutId` fra miniatura e foto, con ritaglio che si apre) | correzione di proporzioni e raggio a ogni fotogramma sul thread principale | scala uniforme + traslazione + dissolvenza nel primo terzo (demo 07) |
| Smooth scroll da molto lontano | in Chrome ~1,5s da 8.000px in su (misurato), un'attesa senza informazione | salto secco fino a una schermata dalla meta, poi smooth: 443ms da 20.000px (§9.3) |
| Scalare testo grande (large title che si rimpicciolisce) | ri-rasterizzazione, sfocato a metà corsa | non si fa (§9.2) |
| `will-change` lasciato fisso su molti elementi | memoria della GPU per ogni livello promosso | lo mette Motion durante l'animazione e lo toglie; nel CSS **non** si scrive `will-change` permanente |

---

## 13. Cosa cambia nel codice di oggi

| Dove | Oggi | Domani | Fase |
|---|---|---|---|
| `src/screens/{Home:82, Tornei:39, Diario:210, TorneoDetail:47, CompagnoDetail:74, Compagni:12, Profilo:140, Segnala:97, ChiCeOggi:81}.tsx` | `animation: 'pop .32s ease both'` sul contenitore della schermata: un'entrata di rotta mascherata, che riparte a ogni cambio di tab | **tolta** (ART_DIRECTION §11.3, D10) | `⟂ F4` |
| `src/components/BottomNav.tsx:54-58` | stagger delle voci del menu | nessuno stagger | `⟂ F5` |
| `BottomNav.tsx:190` | pannello che cresce in `height: auto` | menu ＋ separato che scala dal ＋ (§4.2) | `⟂ F5` |
| `BottomNav.tsx:277` | `backgroundColor` e `color` animati da Motion su ogni tab | pillola unica + inchiostro a due livelli | `⟂ F3` |
| `BottomNav.tsx:296` | ＋ che ruota di 45° | nessuna rotazione | `⟂ F3` |
| `BottomNav.tsx:134` | velo con `blur(2px)` | `--scrim` piatto | `⟂ F3` |
| `src/components/modals/Sheet.tsx:88` | velo `rgba(27,42,74,.35)` + `blur(3px)` | `--scrim`, nessun blur | `⟂ F2` |
| `Sheet.tsx:92` | entrata da `y: 24` + opacità | `y: '100%'` con MOLLA; dissolvenza solo con reduced-motion | `⟂ F2` |
| `Sheet.tsx:97` | uscita `.2s` `ease [.4,0,1,1]` | SVELTO da pulsante; molla con `velocity` da gesto (`onDragEnd` → `animate(y, h, { ...MOLLA, velocity })`) | `⟂ F2` |
| `Sheet.tsx` (nuovo) | stessa elasticità sempre | `dragElastic` bottom `ELASTICO_SPORCO` con modulo sporco; ritorno + ConfirmDialog | `⟂ F2` |
| `Sheet.tsx:134` | `layout="position"` sulla maniglia | tolto | `⟂ F2` |
| `src/components/ui.tsx:135`, `:206` | `transition: 'color …, border-color …, opacity …'` su chip e segmenti | livelli d'inchiostro in opacità (MOLLA); chip con pillola in tre pezzi | `⟂ F2` |
| `ui.tsx:279-296` (`NumeroCheSale`) | testo per fotogramma, sale da 0 a **ogni** montaggio | tabellone; salita una volta per sessione | `⟂ F2` |
| `ui.tsx:337`, `dashboard/PlacementCard.tsx:15`, `dashboard/PointsCard.tsx:15,24` | `transition: width` | `translateX` dentro il binario, RACCONTO, ferme con reduced-motion | `⟂ F4` |
| `dashboard/WinLossCard.tsx:11` | `stroke-dasharray .8s ease`, anche con reduced-motion | RACCONTO, E2, spento con reduced-motion | `⟂ F4` |
| `dashboard/TrendCard.tsx:33` | `dash 1.2s ease .1s` | RACCONTO al primo montaggio; dissolvenza incrociata al cambio di filtro; spento con reduced-motion | `⟂ F4` |
| `src/screens/ChiCeOggi.tsx:345-347` | interruttore con `background` e `left` animati | primitiva Switch (§4.3) | `⟂ F2`/`F4` |
| `src/screens/CreaChat.tsx:177` | pausa `min(1700, 780 + 17·n)` ms | `battitura(n)`, interrompibile, 0 con reduced-motion | `⟂ F4` |
| `CreaChat.tsx:212` | `scrollTo` sempre `smooth`, anche mentre l'utente rilegge | solo entro 80px dal fondo; `auto` con reduced-motion | `⟂ F4` |
| `CreaChat.tsx:687`, `:835` | due indicatori "sta scrivendo" | uno (UX §6.10); spento con reduced-motion | `⟂ F4` |
| `CreaChat.tsx:786`, `:824` | `bubble .28s` con `scale(.98)` | ENTRATA, `translateY(calc(8px * var(--motion-scale)))`, senza scala | `⟂ F4` |
| `src/screens/Mappa.tsx:288-311` | righe città in `height: auto` | uscita fuori flusso + FLIP delle righe sotto (§4.3) | `⟂ F4` |
| `src/components/PhotoLightbox.tsx:118`, `:136` | velo `overlay .2s`, immagine `sheet .3s` dal basso | visore di §4.2 | `⟂ F4` |
| `src/components/modals/StoryModal.tsx:110`, `:139` | velo con `blur(6px)`, card `sheet .3s` | §4.2 (Storia) | `⟂ F4` |
| `src/components/ConsensoCookie.tsx:112`, `:128` | `overlay` e `sheet` | come il ConfirmDialog su mobile | `⟂ F4` |
| `src/components/ConnectionSnackbar.tsx:35` | opacità e `translateY` sempre montati, testo costante | regione Toast (§4.1) | `⟂ F3` |
| `src/components/wrapped/WrappedModal.tsx:557` | `wrappedin .4s` | ENTRATA | `⟂ F4` |
| `src/index.css` | `@keyframes pop/overlay/sheet/bubble/blink/dash`, `.lift` con `translateY(-2px)`, `.chip:hover { opacity }`, `.nav { transition: color }` | assorbiti o tolti quando nessuno li usa più | `⟂ F6` |

Resta com'è: `App.tsx:310-335` (scroll in cima istantaneo su ogni navigazione), le opzioni `calm` di Leaflet, il `wrappedbar` lineare, `MotionRoot`.

---

## 14. Deviazioni da UX.md e ART_DIRECTION.md

| # | Il documento dice | Qui | Perché |
|---|---|---|---|
| **M1** | ART_DIRECTION §11.2: i numeri «salgono da 0 al montaggio» | da 0 **una volta per sessione e per schermata**; poi fermi; i cambi scattano dal vecchio al nuovo | se salgono a ogni ritorno sulla tab, sono decorazione (800ms in cui non si leggono) e coprono il solo movimento che conta: quello del numero cambiato da te (§10) |
| **M2** | Piano: «i numeri che salgono in StatTile» (`NumeroCheSale` resta) | il comportamento resta, il meccanismo diventa il tabellone (transform) | `NumeroCheSale` riscrive il testo a ogni fotogramma (R2); il tabellone anima anche le stringhe formattate (`"67%"`) |
| **M3** | UX §7.5.2 e F2: focus sul primo campo «a fine animazione» | **a `t0`**: primo campo da tastiera e mouse, titolo dello sheet da tocco | i tasti battuti durante l'entrata andrebbero persi; su iOS un focus dato a fine animazione non alza la tastiera, e alzarla durante l'entrata ridimensiona il viewport a metà corsa (§3.5) |
| **M4** | UX §4.4: a ogni navigazione, anche `replace`, il focus va all'h1 | il cambio di vista dal **segmented** lascia il focus sul segmento | è un controllo della pagina: spostare il focus all'h1 obbligherebbe chi usa la tastiera a tornare indietro di quattro fermate per cambiare vista di nuovo. Il sottotitolo (live region) annuncia la vista nuova |
| **M5** | ART_DIRECTION §11.2: ConfirmDialog = opacità + scala | su mobile anche `translateY(12px)`, origine `50% 100%` | ha la forma di un action sheet: stessa forma, stesso movimento del menu ＋ |
| **M6** | UX §10: action sheet e sheet si sostituiscono restando a 3 superfici | chi esce passa a `frost` a `t0`; la TabBar sale sopra il velo solo per il menu ＋ | durante i 180ms di sovrapposizione le superfici sarebbero 4; e il ＋ da cui il menu nasce deve restare acceso |
| **M7** | ART_DIRECTION §11.1: «si esce con SVELTO» | le uscite **a gesto** escono con la molla e la velocità del dito | un'uscita a durata fissa da metà gesto è uno scatto in avanti (§2.2.1) |
| **M8** | ART_DIRECTION §11.1: colore e opacità in SVELTO | lo scambio d'inchiostro di una selezione usa MOLLA | in SVELTO l'etichetta bianca arriva prima del fondo navy (bianco su vetro per ~100ms) |
| **M9** | UX §7.3: con reduced-motion il passaggio della NavBar «è istantaneo» | dissolvenza in SVELTO, come ART_DIRECTION §11.2 («solo opacità») | le due fonti si contraddicono; vale la più recente e più precisa. Una dissolvenza non è uno spostamento |
| **M10** | UX F11.4: con reduced-motion «il ritardo di battitura è 0» (nient'altro) | anche senza reduced-motion la pausa scende a `min(700, 250 + 6·n)` ms ed è interrotta da qualunque input | con 9–11 domande la pausa di oggi arriva a ~15s di attesa per una procedura scriptata; R3 |
| **M11** | UX §6.0: skeleton per i chunk lazy | lo skeleton compare dopo 150ms, respira da 600ms | un chunk in cache non deve lampeggiare grigio (§6.2) |
| **M12** | UX §6 e §7.5.8: nessuna regola sulla durata degli stati occupati | «Riprova» resta occupato almeno 300ms | un tentativo che fallisce in un fotogramma non si vede (§8.4) |
| **M13** | ART_DIRECTION §11.1, regola 2: l'altezza si anima solo in «Altri dettagli» | anche la riga di un set aggiunta o tolta (E1) | è lo stesso caso: crescita dentro uno sheet ancorato in basso |
| **M14** | ART_DIRECTION §11.2: hover delle card = bordo → `--edge-strong` | stesso aspetto, ottenuto con un anello in un livello che cambia opacità | l'hover scatta in serie scorrendo con la rotella: un `border-color` animato è un percorso caldo (§12) |
| **M15** | UX §5 F2 e §7.5.8: «Crea torneo» disattivo finché il Nome è vuoto | `aria-disabled` (non l'attributo `disabled`): il tocco porta al campo e dice cosa manca | un pulsante che non risponde in silenzio sembra rotto; con `aria-disabled` resta disattivo per gli screen reader (§8.1) |

Una nota per ART_DIRECTION D10 («niente animazioni fra le rotte, si scontrerebbero con lo swipe indietro di iOS»): il manifest dichiara `display: standalone`, e nell'app installata **Safari non ha lo swipe indietro**. La decisione resta giusta per altre ragioni (coerenza fra browser e app installata, focus sull'h1 a `t0`, un `reload()` a ogni rotta), ma in standalone su iPhone l'unico indietro è il pulsante della NavBar. Proposto come attività separata: un gesto dal bordo per l'indietro in modalità standalone.

---

## 15. Le demo

`docs/motion/` contiene sette pagine HTML statiche, un indice e due file di strumenti. **Non sono codice di produzione** e non entrano nella build (Vite costruisce solo `index.html` e `presentazione/`). Leggono i token veri: se un token cambia, le demo cambiano con lui.

| File | Che cosa mostra | Sezioni |
|---|---|---|
| `01-crea.html` | TabBar (pillola, inchiostro, nessuna transizione di rotta, ritocco in cima); menu ＋ dal ＋; passaggio menu → sheet sotto un solo velo; focus da tocco e da tastiera | §3.4–§3.6, §4.1, §4.2 |
| `02-sheet.html` | trascinamento con velocità, resistenza col modulo sporco, ConfirmDialog sopra lo sheet, «Altri dettagli» (E1), campioni colore, occupato, errore senza scossone, form sheet da 600px | §4.2, §4.3, §8 |
| `03-navbar.html` | NavBar a soglia, titolo compatto, lente, ricerca che sostituisce la lista, segmented con focus che resta, salto da lontano | §4.1, §9 |
| `04-punto-segnato.html` | il momento firmato: tabellone, traccia, eliminazione con FLIP, cambio di stagione, salita una volta per sessione | §10 |
| `05-caricamento.html` | skeleton in tre tempi, contenuto che arriva, errore d'area e «Riprova», mappa del luogo, regione degli avvisi | §4.1 Toast, §6, §8.4 |
| `06-tocco.html` | strato di stato su pulsanti, righe e card; disattivo; occupato; pillola in tre pezzi; interruttore | §4.3 |
| `07-visore.html` | zoom dalla miniatura, sfoglia, giù per chiudere, eliminazione di una foto con FLIP | §4.2, §5 F5 |
| `index.html` | tutte le demo in cornici da telefono (390×720, e 720 per il form sheet) con gli interruttori globali | |
| `_lab.css`, `_lab.js` | base comune; molla campionata con velocità iniziale (`Lab.spring`), FLIP (`Lab.flip`), regione degli avvisi completa (`Lab.toast`), trappola del focus, audit | |

**Come aprirle.** Dalla radice del repo: `npx vite` e poi `/docs/motion/`, oppure `python3 -m http.server` e la stessa strada. Le singole pagine funzionano anche da `file://`; l'indice no (gli iframe non si possono pilotare). Su un **iPhone vero** (stessa rete, `npx vite --host`): è l'unico modo di vedere il vetro di Safari.

**Parametri dell'URL** (anche sulle singole pagine): `?reduce` simula `prefers-reduced-motion` (si aggiunge alla preferenza di sistema, non la sostituisce); `?slow` è la moviola ×5 (stesse curve, durate più lunghe); `?audit` mostra il badge in basso a sinistra:
- ✓ / ✗ con il nome della prima proprietà animata fuori regola e l'elemento; in ambra le eccezioni dichiarate con `data-motion-exception`;
- «vetro n/3 · max m»: superfici con `backdrop-filter` visibili adesso e il massimo da quando la pagina è aperta.

Lo stesso resoconto è in `window.__labReport` e in console (`[lab] fuori regola: …`), quindi si controlla anche da un Chrome headless.

---

## 16. Verifica e test

### 16.1 Che cosa si può fissare in jsdom (`⟂ F2`, `⟂ QA`)

jsdom non anima e non fa layout: si verificano i **contratti**, non i fotogrammi.

- **Focus a `t0`**: dopo l'apertura di uno sheet, *senza* avanzare i timer, `document.activeElement` è il primo campo (apertura da tastiera) o il titolo (con un `pointerdown` di tipo `touch` prima del clic).
- **Stato occupato**: `aria-busy="true"` e l'etichetta nuova nello stesso `act()` del clic; `min-width` impostata.
- **Reduced-motion**: con `matchMedia('(prefers-reduced-motion: reduce)')` finto a `true`, il tabellone scrive il valore finale senza transizione, la pausa dell'assistente è 0, `scrollTo` riceve `behavior: 'auto'`.
- **Tabellone**: il testo nascosto vale il valore finale a `t0`; le strisce sono `aria-hidden`.
- **Una salita per sessione**: secondo montaggio con la chiave in `sessionStorage` → nessuna salita.
- **Guardia sullo sheet**: con il modulo sporco, la fine di un trascinamento oltre soglia apre il ConfirmDialog e lo sheet resta montato (i 10 test di `Sheet.test.tsx` restano invariati).
- **Marcatura delle eccezioni**: il contenitore di «Altri dettagli» ha `data-motion-exception="altri-dettagli"`.

### 16.2 Un test statico sul CSS (`⟂ QA`)

Come `tokens.test.ts` legge i token come testo, un `src/styles/motion.test.ts` PUÒ leggere con `fs` i `.css` di `src/components/ui/*` e `base.css` e fallire su:
- `transition: all` o `transition-property: all`;
- una `transition` o un `@keyframes` che nomina `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `box-shadow`, `filter`, `backdrop-filter`, `border-radius`, `border-color`, `background`, `color`, salvo un commento `/* E1 */` o `/* E2 */` sulla stessa regola;
- `scroll-behavior: smooth` fuori da un `@media (prefers-reduced-motion: no-preference)`;
- un `@keyframes` con `infinite` senza una regola `animation: none` sotto `prefers-reduced-motion`.

Con `fs`, non con `import '?raw'`: Vitest svuota gli import di CSS, e allargare `css.include` farebbe iniettare il CSS dei componenti in jsdom (trappola 1 della conoscenza di progetto).

### 16.3 A mano, su dispositivi veri

| Dove | Che cosa |
|---|---|
| iPhone, Safari e app installata | `:active` sui pulsanti al tocco (iOS lo applica solo se c'è un listener `touchstart` nella catena: React ne mette uno alla radice; se manca, uno passivo e vuoto su `document`); menu ＋ e sheet a 60fps con NavBar scattata; il trascinamento dello sheet con la tastiera aperta; tastiera che **non** si alza aprendo uno sheet col dito; *Riduci movimento* e *Riduci trasparenza* insieme |
| Android economico, Chrome | scroll con TabBar e NavBar di vetro più un menu aperto (3 superfici); il tabellone di un dettaglio con 6 celle; la griglia di 30 foto con un'eliminazione (FLIP sotto `FLIP_MAX`) |
| Desktop | hover con la rotella su una lista lunga (lo strato, non il bordo); popover; form sheet; scrollbar visibili; Tab su ogni demo |
| Ogni demo con `?audit` | nessun ✗; vetro mai oltre 3 |

---

## 17. Seam per i ruoli successivi

| Fase | Seam | Riferimento |
|---|---|---|
| **F1** | Aggiungere `--delay-skeleton: 150ms` e `--delay-respiro: 600ms` a `tokens.css` (motion), ad ART_DIRECTION §11.1 e a `tokens.test.ts` | §2.3, §6.2 |
| F1 | `base.css`: `-webkit-tap-highlight-color: transparent`; anello di focus senza transizione; nessuno `scroll-behavior: smooth` globale | §4.3, §9.3 |
| **F2** | Costanti in `Motion.tsx`: `FLIP_MAX`, `BUSY_MIN_MS`; in `Sheet.tsx`: `ELASTICO_SPORCO` (le soglie 120/550 restano) | §2.3 |
| F2 | Strato di stato per Button, IconButton, ListRow, MatchRow, Card (`:has()`); pressione con `--press-scale`; disattivo con `aria-disabled` | §4.3 |
| F2 | Sheet: entrata `y: '100%'` MOLLA; uscita SVELTO o molla con `velocity`; resistenza col modulo sporco; `frost` in uscita; focus a `t0` secondo §3.5; niente blur sul velo; via `layout` dalla maniglia | §4.2, §13 |
| F2 | ConfirmDialog, Toast (regione: `_lab.js` `toast()` è il riferimento), SegmentedControl e FilterChips (inchiostro a due livelli, pillola in tre pezzi), Switch, Disclosure (E1, con `data-motion-exception`), Skeleton in tre tempi | §4.1–§4.3, §6 |
| F2 | Tabellone al posto di `NumeroCheSale`, con la salita una volta per sessione e la traccia come utilità (`.traccia`) | §10 |
| **F3** | `ModalHost`: il velo è suo e resta fra due overlay; menu ＋ → sheet con `replaceState`; TabBar sopra il velo solo per il menu; indietro = la stessa uscita | §3.4, §3.8, §4.2 |
| F3 | Router: nessuna animazione di rotta, scroll e focus istantanei; nessun `startTransition` sulla navigazione; `state` della navigazione porta l'id della riga da segnare con la traccia | §3.8, §5 F3, §6.2 |
| F3 | NavBar a soglia (sentinella + `IntersectionObserver`, vetro con `visibility`); TabBar: pillola, inchiostro, nascosta con la tastiera, ritocco in cima con `SALTO_SCROLL` | §4.1, §9 |
| **F4** | Togliere `pop` dalle nove schermate; barre in `translateX`; grafici E2 spenti con reduced-motion; visore foto, Storia e Wrapped secondo §4.2; Mappa con lo schema "fuori flusso + FLIP"; assistente: `battitura(n)`, un indicatore, autoscroll condizionato | §13 |
| **F5** | Coreografie dei flussi: §5 F2, F3 («Punto segnato»), F5 (eliminazioni), F6, F10 (ottimismo e ritorno) | §5, §7, §8 |
| **F6** | Togliere da `index.css` i keyframe e le classi di movimento rimasti senza uso | §13 |
| **QA** | `src/styles/motion.test.ts` statico (§16.2); le verifiche a mano di §16.3; ogni demo con `?audit` | §16 |

---

# Parte L. La landing `/presentazione`: il movimento di «Controluce»

| | |
|---|---|
| Ruolo | Interaction e motion designer, ruolo 3 di 6 della squadra «REDESIN sito presentazione». Specifica i momenti **fra** gli stati della landing; **nessun componente di produzione** in questo commit |
| Base | `UX.md` Parte L (ruolo 1, `7f31fba`) per il comportamento, `ART_DIRECTION.md` Parte L «Controluce» (ruolo 2, `3f14b2c`) per il vocabolario, su `be9c4bd` (`main` con la versione D). Dove questa parte li corregge lo dice in §L13 |
| Token | due molle nuove in `presentazione/styles/tokens.css` (`--ease-salto`, `--dur-salto`, `--ease-caduta`, `--dur-caduta`, `--caduta-y`), ricalcolate da `src/styles/landing.tokens.test.ts` (3 test in più, 62 in tutto) |
| Demo di riferimento | `docs/motion/L1-salto.html` … `L5-soglie.html`, più `docs/motion/_landing.js` (§L14). Leggono i token veri dell'app **e** della landing; si aprono senza build |
| Verifica | le cinque demo pilotate in Chrome headless via CDP a 390×844 (L1 anche a 1280×800), con `prefers-reduced-motion` simulato (`?reduce`) e con `data-movimento="fermo"`: scroll, tocchi veri, tasti, salti. Il badge `?audit` non ha registrato proprietà animate fuori da transform/opacità; il vetro non ha mai superato 2 superfici, nemmeno nel passaggio menu → foglio (§L14) |
| Chi vince | UX.md Parte L decide **che cosa** succede; ART_DIRECTION Parte L **con che cosa** si muove; questa parte **come si passa** da uno stato all'altro. Le Parti 0–17 di questo documento restano il contratto dell'app: qui si citano, non si ripetono |

### Indice della Parte L

- L0. [In una frase](#l0-in-una-frase)
- L1. [Le regole dure della landing](#l1-le-regole-dure-della-landing)
- L2. [Vocabolario e costanti](#l2-vocabolario-e-costanti)
- L3. [I due interruttori, e cambiare a metà](#l3-i-due-interruttori-e-cambiare-a-metà)
- L4. [Dal primo fotogramma: caricamento, ricarica, deep link](#l4-dal-primo-fotogramma-caricamento-ricarica-deep-link)
- L5. [Specifica per elemento](#l5-specifica-per-elemento)
- L6. [Caricamento delle immagini: lo skeleton che ha la forma vera](#l6-caricamento-delle-immagini-lo-skeleton-che-ha-la-forma-vera)
- L7. [Feedback immediato](#l7-feedback-immediato)
- L8. [Recupero dagli errori](#l8-recupero-dagli-errori)
- L9. [Scroll](#l9-scroll)
- L10. [Il momento firmato: «Il passaggio di consegne»](#l10-il-momento-firmato-il-passaggio-di-consegne)
- L11. [La matrice ferma](#l11-la-matrice-ferma)
- L12. [Costi: cosa è caro e cosa usare al suo posto](#l12-costi-cosa-è-caro-e-cosa-usare-al-suo-posto)
- L13. [Deviazioni da UX.md e ART_DIRECTION.md (Parte L)](#l13-deviazioni-da-uxmd-e-art_directionmd-parte-l)
- L14. [Le demo della landing](#l14-le-demo-della-landing)
- L15. [Verifica](#l15-verifica)
- L16. [Seam per i ruoli successivi](#l16-seam-per-i-ruoli-successivi)

---

## L0. In una frase

**Si muove ciò che hai toccato, ciò che lo scroll sta raccontando, e Pallo. Il resto sta fermo, perché il testo c'era già.**

È il principio di ART §L11.1 («l'hai toccata, lo scroll racconta, Pallo è vivo») tradotto in sei regole di regia:

1. **La pagina è completa senza movimento.** Lo stato fermo è l'HTML di base (UX §L6.0); il movimento è uno strato sopra, che arriva col modulo e se ne va con un comando. Niente diventa leggibile, cliccabile o raggiungibile «a fine animazione».
2. **Lo scroll legato gira sul compositor, o non gira.** Parallasse, slide orizzontali e pallone dell'avanzamento usano le timeline native del browser. Dove non ci sono, quell'effetto resta nella sua versione ferma: niente `scroll` in JavaScript che scrive stili (RL1).
3. **Una volta per sessione.** Numeri, pin, ＋ che si apre, ventaglio, salto di Pallo: la prima volta raccontano, poi stanno fermi. Così, quando una cosa si muove, vuol dire qualcosa (è M1 dell'app, allargato).
4. **Niente lavoro fuori vista.** Ogni ciclo (scena, palleggio, vita di Pallo, autoplay) si sospende quando la sua sezione esce o la scheda si nasconde.
5. **Un Pallo alla volta, anche nei passaggi.** Il Pallo dell'hero sparisce nel fotogramma in cui parte quello che vola; quello che parla ha sempre accanto il suo testo.
6. **Mai aspettare.** Il primo tocco va a segno anche mentre qualcosa si muove: la demo accetta punti durante il pop, la chat salta la pausa, il menu si chiude mentre entra.

---

## L1. Le regole dure della landing

Valgono tutte le regole dell'app (R1–R6, §1.1): reduced-motion ovunque, solo transform e opacità sui percorsi caldi, niente che blocca l'input, il movimento chiarisce, il vetro non sfora, mai `transition: all`. La landing ne aggiunge sette.

| # | Regola | Come si verifica |
|---|---|---|
| **RL1** | **Lo scroll legato usa solo timeline native**: `animation-timeline: view()` / `scroll()` in CSS, dietro `@supports`. Motion `scroll()` è ammesso solo dove si aggancia da sé a `ScrollTimeline`/`ViewTimeline` (offset preset), **mai** nel suo ripiego JavaScript. Senza supporto, l'effetto resta fermo (§L9.3) | `@supports` nel CSS; `perf.mjs` adattato: 0 fotogrammi lunghi con la CPU a 4× |
| **RL2** | **Nessuna lettura del layout durante lo scroll.** Le soglie sono `IntersectionObserver`. L'unico listener di `scroll` (passivo) legge `scrollY` e `event.timeStamp` per la velocità (FL7) e la quiete (§L5.2): mai `getBoundingClientRect`, mai `offsetTop`. Le misure (FLIP, larghezze) si prendono **una volta**, nel fotogramma della decisione o al `resize` | revisione; profilo di `perf.mjs` (nessun «Forced reflow» durante lo scroll) |
| **RL3** | **Gli effetti a soglia si armano solo fuori vista.** All'avvio ogni effetto parte nello stato finale (è l'HTML). Se la sua prima notizia dall'`IntersectionObserver` dice «fuori vista» e non è già stato visto in questa sessione, si **arma** (numeri a zero, pin sollevati, menu chiuso): il cambio avviene dove nessuno guarda. Se dice «in vista», resta finale e si segna come visto | jsdom (§L15.1) |
| **RL4** | **Un effetto armato che riceve il focus scatta subito allo stato finale.** Chi arriva da tastiera dentro un pannello ancora chiuso (il ＋ di `#registra`, la Storia) lo trova aperto, senza animazione | jsdom: `focusin` → stato finale nello stesso task |
| **RL5** | **Niente lavoro fuori vista** (UX §L11.2). rAF, timer e animazioni CSS infinite di una sezione girano solo con la sezione in vista e la scheda visibile. Le animazioni CSS si fermano con `animation-play-state: paused` sotto un attributo (`data-fuori`), i cicli JS con l'`IntersectionObserver` della loro sezione | `document.getAnimations().filter(a => a.playState === 'running')` vuoto per la scena con l'hero fuori vista |
| **RL6** | **Due interruttori, una funzione, un evento.** `movimentoFermo()` e `alCambioDelMovimento(fn)` (§L3) sono la sola fonte: nessun modulo legge la media query da sé. Cambiare a metà porta ogni effetto in corso al suo **stato finale** (`finish()`), mai a quello iniziale | demo `?fermo` (§L14) |
| **RL7** | **Lo sfalsamento narrativo vive solo in LM4, LM5, LM6 e LM9**: passo `--stagger-narrativo` (50ms), al più `--stagger-max` (8) elementi, al più ~670ms in tutto, una volta per sessione. Fuori da lì vale «sfalsamento: zero» (§2.2.4) | revisione; demo `L4`, `L5` |

### L1.1 Le eccezioni della landing (tutte e sole)

| # | Che cosa | Dove | Limiti | Come è marcata |
|---|---|---|---|---|
| **EL1** | **Scroll legato** (l'app lo vieta, §9.2) | LM1 parallasse dell'hero, LM8 slide di Wrapped, LM10 pallone dell'avanzamento | solo `transform`; timeline native (RL1); spento col fermo; mai sul vetro | nel CSS, sempre dentro `@supports (animation-timeline: …)` |
| **EL2** | **Sfalsamento narrativo** (l'app lo vieta, §2.2.4) | LM4 voci del ＋, LM5 pin, LM6 risposte della chat, LM9 Storia | RL7 | `--rise-i` / `--i` sull'elemento; nessun ritardo scritto a mano |
| E2 (dell'app) | La linea di Andamento, se la sezione Numeri la mostra (PUÒ, UX §L7.7) | `#numeri` | `stroke-dashoffset`, RACCONTO, una volta per sessione | `data-motion-exception="grafico"` |

Nient'altro anima proprietà diverse da `transform` e `opacity` (più `visibility` a fine uscita). In particolare: il pulsante «Chiudi il set» della demo **non** copia la pulsazione in `box-shadow` dell'app (§L12).

---

## L2. Vocabolario e costanti

### L2.1 Le curve (ART §L11.2), e dove le usa la landing

| Nome | Token | Sulla landing |
|---|---|---|
| **SVELTO** | `--dur-svelto` 180ms + `--ease-standard` | uscite (guida, nuvoletta, menu, foglio, Storia chiusa dal fermo); scambio di materiale della capsula; sparizione della lente |
| **ENTRATA** | `--dur-entrata` 260ms + `--ease-standard` | comparse: nuvoletta, schermo nuovo del telefono, pulsante d'installazione, riepilogo della demo, bolle della chat, la guida che compare dove la vista è ferma |
| **MOLLA** | `--dur-molla` 320ms + `--ease-molla` | ciò che si sposta: la guida dal bordo, il menu della guida, il foglio, il ＋ di `#registra` che si apre, il ventaglio della Storia, lo scambio dell'inchiostro delle tab (M8) |
| **PRESSIONE** | `--dur-press` 400ms + `--ease-press` | `.press` su pulsanti, voci, pannelli della demo; il pop del punteggio; il ＋ di `#registra` premuto |
| **SALITA** | `--dur-rise` 600ms + `--ease-rise`, passo `--rise-step` | le voci del ＋ (LM4), le risposte rapide della chat (LM6) |
| **Lente** | `--dur-rise` + `--ease-press` | la lente della capsula, come `.ui-tabbar-pill` dell'app (ART A5) |
| **RACCONTO** | `--dur-racconto` 800ms + `--ease-racconto` | i numeri che salgono (`Odometro`), la barra vinte/perse |
| **RESPIRO** | `--dur-respiro` 1400ms + `--ease-respiro` | i puntini di Pallo che scrive; il respiro dello skeleton delle schermate |
| **SALTO** (nuova) | `--dur-salto` 510ms + `--ease-salto` | il passaggio di consegne (§L10) |
| **CADUTA** (nuova) | `--dur-caduta` 400ms + `--ease-caduta`, da `--caduta-y` (−24px) | i pin (LM5) |
| **lineare** | `linear`, durata = lo scroll | LM1, LM8, LM10: la curva la fa il dito |

**SALTO e CADUTA sono `linear()` campionati**, come `--ease-molla` dell'app, e non molle di una libreria. Le ha fissate ART (stiffness, damping, mass); qui diventano token che CSS e Web Animations usano direttamente:

| | Molla | ζ | Superamento | Ferma entro | Durata | Note |
|---|---|---|---|---|---|---|
| SALTO | 300 / 26 / 1 | 0.75 | +2.8% | 2‰ della corsa (≈ 1px su 600) | **510ms** | 30 campioni equidistanti, errore d'interpolazione ≤ 0.009 |
| CADUTA | 500 / 24 / 1, **riflessa** | 0.54 | nessuno: il superamento torna in alto | 1% (¼ px su 24) | **400ms** | contatti con la mappa a 113ms e 280ms, scritti come punti della curva (`1 28.47%`, `1 70.31%`) |

Perché **riflessa**: una molla che supera il segno, applicata a un pin che cade, lo fa **affondare** 3px sotto la sua città e poi riemergere. Riflettere il superamento (`v > 1 ? 2 − v : v`) dà il rimbalzo che ART chiede («un rimbalzo») senza mai passare il punto d'arrivo. `landing.tokens.test.ts` ricalcola i campioni dalla forma chiusa, controlla le durate e che CADUTA non superi mai 1.

Con Motion (`animate` di `motion`, senza React) le stesse molle si scrivono `{ type: 'spring', stiffness, damping, mass }`: è ammesso, purché l'animazione resti una Web Animation di `transform`/`opacity`. Il contratto sono i **valori**, non la libreria.

### L2.2 Costanti (contratto per `presentazione/js/*`, `⟂ C`)

| Nome | Valore | Dove | Per cosa |
|---|---|---|---|
| `LINEA_SEZIONE` | `0.40` | `nav.ts`, `guida.ts` | la sezione corrente contiene la linea al 40% del viewport: `rootMargin: '-40% 0px -59% 0px'` (UX §L4.1) |
| `LINEA_CAPITOLO` | `0.72` sotto i 900px, `0.50` da 900 | `scene.ts` | il capitolo del telefono (ART A8); fascia dell'1% |
| `SALTO_PX` / `RITORNO_PX` | `24` / `96` | `guida.ts` | la testa del Pallo dell'hero sale a 24px dalla cima del viewport: salta, ancora tutto in vista; torna sotto i 96px: la guida esce. Isteresi di 72px di scroll. Due sentinelle sopra la testa (§L9.1, §L10.2, ML2) |
| `BOLLA_MS` | `4000` | `guida.ts` | quanto resta una battuta (= `--dur-bolla`, = `TOAST_MS`) |
| `QUIETE_MS` | `250` | `guida.ts` | la battuta aspetta che lo scroll sia fermo da tanto (ML4) |
| `SONNO_MS` | `10000` | `guida.ts` | inattività prima di `dorme` (UX FL7) |
| `VELOCE_PX_S` / `VELOCE_MS` / `SORPRESO_OGNI_MS` | `3000` / `150` / `8000` | `guida.ts` | scroll veloce → `sorpreso` (UX FL7) |
| `TOCCHI_GAP_MS`, `PRESSIONE_LUNGA_MS`, `REAZIONE_MS` | `700`, `600`, `1000` | da `Pallo.tsx`, non riscritte | i tocchi di Pallo |
| `PROGRAMMATICO_MS` | `300` | `nav.ts` | dopo un salto da tab o menu, lo scroll non conta come «veloce» e non sveglia la battuta del passaggio |
| `AUTOPLAY` | partenza Noi 3 · Loro 2; punti `['noi', 'loro']`; primo a +600ms, poi ogni 1000ms; battuta finale a +1000ms | `live.ts` | §L5.10. Deterministico: il test lo può fissare |
| `SOGLIA_LIVE` | `0.6` | `live.ts` | l'autoplay parte con la demo visibile almeno al 60% (UX §L6.4) |
| `SOGLIA_EFFETTO` | `0.5` (numeri, mappa, Storia), `0.6` (il ＋ di `#registra`) | `numeri.ts`, `scene.ts`, `chat.ts` | quando un effetto armato scatta |
| `SESSIONE` | `sessionStorage['bvd_landing_visti']`, un array JSON di chiavi: `salto`, `registra`, `numeri`, `mappa`, `storia`, `autoplay`, `bolla:{sezione o capitolo}` | `movimento.ts` | RL3; letto e scritto in try/catch: se manca, è sempre la prima visita (UX §L6.0) |
| `FERMO` | `localStorage['bvd_landing_fermo'] = '1'` | `movimento.ts`, `fermo.js` | §L3 |

---

## L3. I due interruttori, e cambiare a metà

### L3.1 Una funzione, un evento, un attributo

```ts
// presentazione/js/movimento.ts (⟂ C). Il riferimento eseguibile è docs/motion/_landing.js.
export function movimentoFermo(): boolean          // prefers-reduced-motion OPPURE <html data-movimento="fermo">
export function alCambioDelMovimento(fn: (fermo: boolean) => void): () => void  // media query + comando
export function impostaFermo(on: boolean): void    // scrive l'attributo, localStorage (try/catch), aria-pressed sulle tre istanze
```

- `Pallo.vita.ts`, `Odometro.ts` e il pilota del palleggio (`⟂ E`) **ricevono** il predicato e l'iscrizione: oggi `useVita` legge `matchMedia` da sé (`Pallo.tsx:530`) e non saprebbe del comando. La firma è `avviaVita(svg, { segui, vivo, fermo: () => boolean, alCambio: (fn) => () => void })`, con i valori di serie che leggono la media query (così l'app non cambia).
- **Prima del primo disegno.** Chi ha scelto «Ferma le animazioni» in una visita passata non deve vedere la scena muoversi per i 200–300ms che servono al modulo. La CSP vieta gli script in linea (`script-src 'self'`), quindi un file minuscolo e bloccante nel `<head>`, `presentazione/js/fermo.js` (script classico, ~200 byte, **non** `defer`), legge `localStorage` in try/catch e scrive `data-movimento="fermo"` sull'`<html>`. Il modulo vero arriva dopo e trova lo stato già giusto. (`⟂ C`, ML15)

### L3.2 Il CSS: un blocco che spegne, con due selettori

I fogli dell'app che la landing importa spengono le animazioni **solo** con la media query (`Pallo.css:369`, `Login.css:163`, `Tabellone.css:39`). Il comando della pagina non la attiva, quindi la landing aggiunge, in `presentazione/styles/movimento.css` (`@layer components`, `⟂ C`), lo stesso spegnimento sotto il suo attributo:

```css
@layer components {
  /* «Ferma le animazioni» vale quanto prefers-reduced-motion: gli stessi spegnimenti dei fogli dell'app. */
  :root[data-movimento="fermo"] :is(.pallo, .pallo *) { animation: none !important; transition: none !important; }
  :root[data-movimento="fermo"] :is(.pallo-volto, .pallo-sguardo) { transform: none !important; }
  :root[data-movimento="fermo"] :is(.accesso-scena-svg, .accesso-scena-svg *) { animation: none !important; }
  :root[data-movimento="fermo"] :is(.ui-odo-strip, .ui-odo-d) { transition: none !important; }
}
```

Le variabili (`--motion-scale: 0`, `--press-scale: 1`, `--dur-racconto: 0ms`, `--dur-respiro: 0ms`) le mette già il blocco `:root[data-movimento="fermo"]` dei token (ART §L11.5). I fogli della landing scrivono ogni loro animazione **una volta**, e la spengono così:

```css
@media (prefers-reduced-motion: reduce) { .x { animation: none; } }
:root[data-movimento="fermo"] .x { animation: none; }
```

e gli spostamenti fra stati di riposo (lente, pillole, cifre) con `transition: none` negli stessi due posti (§2.2.3: moltiplicarli per zero lascerebbe la lente sulla tab vecchia).

### L3.3 Cambiare a metà

Il comando si tocca a pagina viva, anche mentre qualcosa si muove (il menu di Pallo si apre ovunque). Le regole:

| Effetto | Fermo **acceso** a metà | Fermo **spento** dopo |
|---|---|---|
| Web Animation in corso (salto, pin, ventaglio, menu, foglio, lente) | `finish()`: salta allo stato finale. Mai `cancel()`, che lo riporterebbe all'inizio | le prossime partono normali |
| Animazioni CSS infinite (scena, Pallo, puntini, «Chiudi il set») | si fermano dal CSS (§L3.2), nel disegno di riposo | ripartono dal CSS, solo in vista (RL5) |
| Scroll legato (LM1, LM8, LM10) | si stacca dal CSS: piani della scena a riposo, pallone nascosto, Wrapped → riga a mano | si riaggancia |
| Vita di Pallo, palleggio | spenti: sguardo a riposo (`posa(0, 0)`), palleggio al fotogramma `FERMO` | riaccesi se in vista |
| Autoplay della demo | se sta girando, il punto in corso arriva subito e l'autoplay **finisce** (consumato) | non riparte mai: uno per visita |
| Pausa «Pallo scrive» | finisce subito: il messaggio compare | — |
| Effetti armati non ancora scattati | restano armati; quando scattano, arrivano fermi | scattano animati |
| **Telefono sticky, Wrapped bloccato, Storia** | cambiano **layout** (capitoli in linea, riga a mano, carte affiancate): vedi sotto | tornano al layout vivo, con lo stesso aggancio |

**Riaggancio dello scroll.** Spegnere il telefono sticky o il blocco di Wrapped cambia l'altezza della pagina sotto chi legge. Prima del cambio si prende la sezione sotto la `LINEA_SEZIONE` e la distanza del suo `h2` dalla cima del viewport; dopo il cambio (nel fotogramma successivo) si fa `scrollBy` istantaneo della differenza. Chi aveva davanti `#wrapped` lo ritrova lì. Lo stesso vale quando un `resize` accende o spegne il telefono sticky (soglie d'altezza, UX §L9.2).

**Il comando stesso** non si anima: `aria-pressed` cambia nel fotogramma del tocco, l'icona passa da pausa a play senza dissolvenza (è la lettura di uno stato), il cerchio si riempie di colpo. Il feedback del tocco è lo strato di pressione, come ogni pulsante.

---

## L4. Dal primo fotogramma: caricamento, ricarica, deep link

### L4.1 La sequenza d'avvio (FL1)

| t | Che cosa si vede | Movimento |
|---|---|---|
| **0** (HTML, CSS) | La pagina intera: `h1`, frase, CTA, la scena al tramonto e il Pallo dell'hero (inseriti in build, ART A12), i testi di ogni sezione, i telefoni con le cornici misurate, la demo come tabellone fermo, Wrapped come riga a mano | **nessuno.** Le animazioni CSS della scena e di Pallo sono **in pausa** finché il modulo non dice `data-viva` (sotto). `fermo.js` ha già scritto `data-movimento` se serve |
| font | Geist sostituisce la riserva metrica | nessuno (CLS 0, ART §L3.1) |
| **modulo pronto** (obiettivo < 300ms dopo il DOMContentLoaded su 4G) | ogni sezione riceve `data-viva` quando il **suo** modulo ha finito l'init senza errori | la scena e Pallo riprendono **dal fotogramma 0** delle loro animazioni (erano in pausa lì: nessun salto). Il palleggio parte dal fotogramma `FERMO` (`⟂ E`: il primo fotogramma di `avviaPalleggio` deve coincidere con `FERMO`, altrimenti i giocatori saltano) |
| installabile | «Installa sul telefono» nel posto riservato della riga dei comandi | `opacity 0 → 1` in ENTRATA, nessuno spostamento (il posto c'era) |
| sotto l'hero all'avvio | la guida c'è già nell'angolo, con l'umore della sezione | `opacity 0 → 1` in ENTRATA: è contenuto che arriva. **Niente salto** (§L10): il salto è il passaggio che si vede, non un'entrata in scena |

**Perché la scena aspetta il modulo.** Senza JavaScript, «Ferma le animazioni» non funziona: le nuvole (26s), i gabbiani, la barca, la schiuma e la palma si muoverebbero per sempre senza un modo per fermarli (WCAG 2.2.2). Quindi `#inizio:not([data-viva]) :is(.accesso-scena, .pallo) * { animation-play-state: paused; }`: senza modulo la scena è un quadro. Con il modulo, il comando esiste e la scena si muove (ML14).

**Mai all'apertura** (ART §L11.4): preloader, dissolvenza della pagina, titolo che sale, testo che si scrive, schermata di benvenuto.

### L4.2 Ricarica, deep link, ritorno nella sessione

| Caso | Regola |
|---|---|
| Un effetto è **in vista** al primo `IntersectionObserver` (deep link a `#numeri`, ricarica a metà) | resta nello stato finale e si segna visto (RL3) |
| Un effetto è **fuori vista**, sopra o sotto | si arma; scatta la prima volta che entra, da qualunque lato |
| L'effetto è già **visto** in questa sessione (`bvd_landing_visti`) | stato finale, mai armato |
| Deep link sotto l'hero | la guida è già nell'angolo (§L4.1); il salto non c'è stato e **non** viene segnato: tornando all'hero e riscendendo, Pallo salta |
| `history.scrollRestoration` `auto` (UX §L4.2) | il browser rimette lo scroll **prima** del primo `IntersectionObserver`: le sezioni sotto la posizione ripristinata risultano in vista o sopra, e si comportano come sopra |
| Stampa (`@media print`) | tutto allo stato finale, scena ferma, guida e barra nascoste |

---

## L5. Specifica per elemento

Colonne come §4: **Momento** · **Innesco** · **Proprietà** · **Tempo** · **Fermo** (= reduced-motion **o** «Ferma le animazioni») · **Chiarisce**. Dove la colonna «Fermo» dice «uguale» resta la dissolvenza o lo strato di stato: §11.2.

### L5.1 La barra (≙ TabBar; demo `L2`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Lente si sposta** | cambio della sezione corrente (`LINEA_SEZIONE`), anche dopo un salto da tab | `translateX(calc(var(--i) * (100% + var(--space-0-5))))`, un elemento | Lente (`--dur-rise` + `--ease-press`) | salta (`transition: none`) | da quale tab a quale |
| **Inchiostro della tab** | idem | due livelli sovrapposti per tab (spento, d'inchiostro pieno; acceso, `--lente-label`): si scambiano l'**opacità** | MOLLA (M8: l'arancio non arriva prima della lente bianca) | dissolvenza | stato acceso con forma (lente) e colore |
| **Lente sparisce** | la sezione corrente non ha tab (hero, `#dati`, finale) | `opacity → 0` | SVELTO | uguale | nessuna tab è «qui» |
| **Lente ricompare** | torna una sezione con tab | **prima** si mette sulla tab nuova senza transizione (è invisibile), **poi** `opacity → 1` | ENTRATA | uguale | compare dove sei, non scivola da una tab vecchia (ML12) |
| **Materiale della capsula** | la sezione sotto la linea mediana della capsula cambia `data-fondo` | due strati (`glass-regular`, `glass-dark`) si scambiano l'opacità; chi esce prende `visibility: hidden` a fine corsa | SVELTO | istantaneo | il vetro segue il fondo (ART §L9.2) |
| **Inchiostro delle tab spente** (inchiostro ↔ bianco) | idem | `color` cambia **di colpo a metà** dello scambio: il JS scrive `data-inchiostro` mezzo SVELTO dopo `data-sopra`; nessuna transizione nomina `color` | discreto, a +90ms | subito | una pittura sola, nessun colore animato (ML13) |
| Pressione di una tab | `:active` | `scale(0.94)` | PRESSIONE | nessuna scala | |
| Hover di una tab (`hover: hover`) | `:hover` | strato di stato `opacity 0 → var(--state-hover)` sotto l'etichetta | SVELTO | uguale | |
| ＋ «Apri il diario» | `:active` / hover | `scale(0.94)` / strato | PRESSIONE / SVELTO | strato | **mai** ruota in × |
| Tocco su una tab | `click` | salto **istantaneo** + focus all'`h2` a `t0` (§L9.2); la lente si sposta perché cambia la sezione | — | uguale | |
| Foglio d'installazione aperto | | la barra resta dov'è, sotto il velo e `inert`: nessun movimento suo | — | — | |
| Da 900px (in alto) | | identico | | | |

**Il budget.** Nei 180ms dello scambio le superfici sfocate della capsula sono due: è il caso peggiore contato da ART §L9.3 (2 + «Ho già un account» = 3, all'uscita dall'hero). Mai tre strati: lo scambio successivo, se arriva a metà, inverte quello in corso (transizione) invece di aggiungerne uno.

### L5.2 Pallo guida (demo `L1`, `L2`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Il salto** dall'hero | §L10 | FLIP con SALTO | 510ms | dissolvenze incrociate | la guida **è** il Pallo dell'hero |
| **Entra dal bordo** (dopo il primo salto, o tornando da una sezione «fuori») | la sezione corrente lo vuole (UX §L3.2) | `translateX(calc(100% + var(--guida-right) + var(--space-2))) → 0` (× `--motion-scale`) e `opacity 0 → 1`; `visibility: visible` e via `inert` a `t0` | transform MOLLA, opacità ENTRATA | sola opacità | da dove arriva: il bordo vicino, il lato del pollice |
| **Esce** | sezione «fuori», foglio aperto | lo stesso all'indietro; `inert` a `t0`, `visibility: hidden` a fine corsa | SVELTO | sola opacità | |
| Non esce | ha il focus o il menu è aperto | aspetta `focusout` / la chiusura, poi esce subito | | | il focus non sparisce sotto la mano (UX §L6.10) |
| **Cambio d'umore** | cambio di sezione o di capitolo | il disegno si sostituisce **nello stesso fotogramma** (nessuna dissolvenza fra umori: Pallo non si «trasforma», cambia faccia) | — | uguale | |
| **Battuta** | la sezione o il capitolo diventano correnti **per la prima volta nella sessione**, e lo scroll è fermo da `QUIETE_MS` | nuvoletta: `opacity 0 → 1` + `translateY(calc(6px * var(--motion-scale))) → 0`, `transform-origin` in basso a destra (verso Pallo) | ENTRATA; resta `BOLLA_MS`; esce SVELTO | sola opacità | chi parla e di che cosa |
| Battuta sostituita | arriva quella di un'altra sezione | la vecchia esce (SVELTO) e la nuova entra **nello stesso istante** | | | |
| Battuta tolta | cambio di sezione, Esc, apertura del menu, uscita della guida | esce SVELTO; la battuta saltata **non** è segnata come detta | | | |
| **Tocco** | `click` (anche Invio, Spazio) | `reagisci()`: `data-tocco` (il «boing» di `Pallo.css`, 620ms) **e** il menu si apre a `t0`, non a fine boing | 620ms | il disegno allegro per `REAZIONE_MS`, fermo | |
| Tocchi di fila | entro `TOCCHI_GAP_MS` | ogni tocco riavvia il boing (`data-tocco` 0/1 alternati); il menu resta aperto | | | |
| **Sorpresa** | 5° tocco di fila o pressione da `PRESSIONE_LUNGA_MS` | `data-sorpresa` (palleggio 1.4s o occhiali 0.7s, `Pallo.css`); il menu esce SVELTO | | il disegno (`esulta` o `cool`) per la durata, fermo | |
| **Sguardo** | `pointermove` (`segui`) | `.pallo-volto` / `.pallo-sguardo` in `transform`, `Pallo.vita.ts` | transizione .24s del disegno | spento | Pallo ti vede |
| **Scroll veloce** | > `VELOCE_PX_S` per `VELOCE_MS`, non programmatico | umore `sorpreso` per `REAZIONE_MS` | | uguale, senza animazione | |
| **Dorme** | `SONNO_MS` senza scroll, tocchi, puntatore, tasti; mai col menu aperto né con una battuta in vista | umore `dorme` (le «z» di `Pallo.css`) | | il disegno `dorme`, fermo | |
| **Sveglia** | primo gesto | `sorpreso` per `REAZIONE_MS`, poi l'umore della sezione; nessuna battuta | | uguale | |

**Il bersaglio.** È il `<button>` a muoversi, non solo il disegno: durante il salto e l'entrata il tocco va dove l'occhio vede Pallo (R3). Il disegno può sbordare dal pulsante (il palleggio sale di 58px), ma solo il pulsante riceve i tocchi.

**Isteresi della sezione.** Una sezione «fuori» seguita da una «dentro» a meno di `QUIETE_MS` di distanza (uno scroll che attraversa `#live`) non fa uscire e rientrare la guida: le decisioni di presenza si prendono nel fotogramma dopo l'ultimo cambio (un solo `requestAnimationFrame` che raccoglie tutte le notizie degli observer, §L9.1).

### L5.3 Il menu «Dove vuoi andare?» (disclosure; demo `L2`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Apertura** | tocco, Invio, Spazio su Pallo | `hidden` tolto e `aria-expanded="true"` a `t0`; `opacity 0 → 1`; `translateY(calc(12px * var(--motion-scale))) scale(calc(1 - .04 * var(--motion-scale))) → none`; `transform-origin` sul **centro di Pallo** (sotto i 600: `calc(100% - var(--guida-size) / 2) calc(100% + var(--guida-gap) + var(--guida-size) / 2)`) | opacità ENTRATA, transform MOLLA | dissolvenza | il menu esce da Pallo |
| Focus | apertura | alla prima voce, **a `t0`** (§3.5) | | | |
| Nuvoletta | apertura | esce SVELTO a `t0` | | | |
| **Chiusura** (Esc, tocco fuori, focus che esce, scelta) | | `inert` e `data-material="frost"` a `t0`; `opacity → 0` + lo stesso scostamento all'indietro; `hidden` a fine uscita (con una rete di `--dur-svelto` + 80ms se `transitionend` non arriva) | SVELTO | dissolvenza | |
| Scelta di una sezione | `click` su un link | il menu esce **mentre** la pagina salta e il focus va all'`h2` (tutto a `t0`) | SVELTO ∥ istantaneo | | |
| «Installa l'app» | `click` | menu → `frost` a `t0` ed esce; il foglio entra nello stesso istante (§L5.4) | SVELTO ∥ MOLLA | | |
| «Ferma le animazioni» | `click` | `aria-pressed` cambia; il menu **resta aperto**; la sua uscita, quando verrà, sarà di sola opacità | — | | |
| Riapertura durante l'uscita | tocco | la transizione si inverte dal punto in cui è (§3.2) | | | |

Il menu non ha velo (non è modale) ed è `glass-thick`: con la capsula fa **2** superfici.

### L5.4 Il foglio d'installazione (demo `L2`)

| Momento | Innesco | Proprietà | Tempo | Fermo |
|---|---|---|---|---|
| **Apertura < 600** | pulsante o voce del menu | velo `--scrim` `opacity 0 → 1` (ENTRATA, **senza** sfocatura); foglio `translateY(calc(100% * var(--motion-scale))) → 0`; `inert` sul resto della pagina e focus al titolo a `t0`; scroll bloccato | MOLLA | dissolvenza |
| **Apertura ≥ 600** | idem | form sheet: `opacity` + `scale(calc(1 - .04 * var(--motion-scale))) → 1`, origine al centro | ENTRATA | dissolvenza |
| **Pallo sbircia** | il foglio è arrivato (`t0 + --dur-molla`; da 600, `t0 + --dur-entrata`) | sale da dietro il bordo alto: `translateY(40%) → 0`, `opacity 0 → 1` | MOLLA | c'è da `t0`, fermo |
| **Chiusura** (Esc, ×, «Ho capito», velo) | | foglio → `frost` a `t0`, `translateY → 100%` (< 600) o `opacity → 0` (≥ 600); velo SVELTO; via `inert` dalla pagina **e poi** focus a chi l'ha aperto, entrambi a `t0` | SVELTO | dissolvenza |
| Scroll bloccato | apertura / chiusura | `overflow: hidden` sull'`<html>` **più** `scrollbar-gutter: stable` sempre attivo: su desktop la barra di scorrimento non sparisce, e la pagina non si sposta di 15px | — | — |

Nessun trascinamento per chiudere: il foglio non disegna la maniglia (UX §L7.12 elenca le chiusure, e il gesto non c'è).

**Installata** (`appinstalled`): se il foglio è aperto si chiude come con ×. Poi **ogni pulsante d'installazione diventa la sua conseguenza, nello stesso posto**: il pulsante esce in SVELTO e, nello stesso riquadro, entra in ENTRATA lo status «Fatto: Beach Diary è tra le tue app.» (`role="status"`). Niente collassa, niente si sposta (ML9). La guida, se è in scena, passa a `festa` con la battuta di UX §L12.4.

### L5.5 Pallone dell'avanzamento (LM10; demo `L2`)

| Momento | Innesco | Proprietà | Tempo | Fermo |
|---|---|---|---|---|
| Scorrere la pagina | scroll | `transform: translateX(calc(var(--corsa) * p)) rotate(calc(var(--giri) * p * 1turn))`, con `p` dato da `animation-timeline: scroll(root block)` | lineare (lo scroll) | **non c'è** (`display: none`) |

- `--corsa` è la larghezza del binario meno il pallone, in unità di contenitore: il binario ha `container-type: inline-size` e i keyframe scrivono `translateX(calc(100cqw - var(--progress-ball)))`.
- `--giri` = corsa ÷ (π × diametro): **rotola senza strisciare**. CSS non divide una lunghezza per un'altra su Safari, quindi lo scrive `scene.ts` con un `ResizeObserver` sul binario (un numero, una volta per ridimensionamento).
- Senza `@supports (animation-timeline: scroll())` non c'è: un pallone fermo all'inizio direbbe «sei in cima» a chi è in fondo.

### L5.6 Hero `#inizio` (LM1; demo `L1`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Uscita: il tramonto** | scroll, mentre l'hero esce dal viewport (`view-timeline` dell'hero, `animation-range: exit-crossing 0% exit-crossing 100%`) | **tre piani** della scena (§L12): `cielo` (cielo, nuvole, gabbiani) `translateY(0 → 15%)`; `sole` (alone e disco) `translateY(0 → 30%)`; `terra` (mare, riflesso, barca, sabbia, schiuma, palma, rete, giocatori, pallone) **fermo con la pagina**. Le percentuali sono dell'altezza della scena, cioè dello scroll | lineare | fermo, fotogramma `FERMO` | il sole tramonta mentre lasci la spiaggia; la profondità (il sole più lontano del cielo, il cielo più lontano della sabbia) |
| Palleggio, scena viva | hero in vista, scheda visibile, movimento permesso | il loop di `avviaPalleggio` e le animazioni CSS della scena | — | fermi (`FERMO`) | |
| Hero fuori vista | `IntersectionObserver` | palleggio sospeso; `data-fuori` → `animation-play-state: paused` sulla scena e sul Pallo dell'hero (RL5) | | | |
| CTA, «Ho già un account» | `:active` / hover | `.press` e strato di stato (`Button.css`) | PRESSIONE / SVELTO | strato | |
| «Installa sul telefono» compare | installabile | `opacity` nel posto riservato | ENTRATA | uguale | |
| `theme-color` | il fondo dell'hero passa la cima del viewport (sentinella) | il `<meta>` passa a `#F6F6F4`, e viceversa (UX LC13) | istantaneo | uguale | la barra del browser continua il fondo |
| **Il salto** | §L10 | | | | |
| Ritorno nell'hero | la testa del Pallo dell'hero torna sotto `RITORNO_PX` | la guida esce (SVELTO); il Pallo dell'hero `opacity 0 → 1` | ENTRATA | uguale | **niente** salto al contrario (UX §L6.1) |

**Perché i fattori sono quelli** (ART chiedeva cielo × 0.5, sole × 0.6, mare × 0.3, ML1). La fascia del mare, fra l'orizzonte e la riva, è alta **46px** nel disegno. Se il mare scorresse a 0.3 rispetto alla sabbia, la sabbia (disegnata sopra) lo coprirebbe tutto dopo 46 ÷ 0.3 ≈ **153px** di scroll, con l'orizzonte ancora a metà schermo: il mare sparirebbe a vista. Il mare quindi sta con la terra. Il sole deve tramontare **dietro il mare** mentre l'orizzonte è ancora visibile (a 390×844 l'orizzonte esce dall'alto dopo ~290px): a × 0.30 il disco (raggio 42) è sotto l'orizzonte dopo 140px, e a 290px l'alone si è abbassato di 87px, con il bagliore ancora sopra l'orizzonte. Il cielo a × 0.15 si abbassa di ~45px: la fascia arancio vicino all'orizzonte scende e il cielo sopra il mare si fa più scuro. Profondità coerente: sul viewport il sole va a 0.70, il cielo a 0.85, la terra a 1.

### L5.7 Il diario in tasca `#diario` (LM3; demo `L3`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Schermo nuovo** | il testo di un capitolo contiene `LINEA_CAPITOLO` (fascia dell'1%) | le quattro schermate sono impilate; quella del capitolo passa in cima e fa `opacity 0 → 1`; quella sotto resta piena finché la nuova non lo è, poi scende a 0 senza transizione | ENTRATA | (sticky spento: capitoli in linea) | quale schermata va con quale testo |
| Andata e ritorno veloci | quattro capitoli in 300ms | ogni schermata nuova parte dall'opacità in cui è: nessun lampo di bianco, nessuna coda di dissolvenze | | | |
| Fascia sticky | scroll | nessun movimento suo: è `position: sticky` (il compositor) | | | |
| Battuta del capitolo | §L5.2 | | | | |
| Immagine in arrivo | §L6 | | | | |

La cornice non si muove, non s'inclina, non entra: è un oggetto fermo, ed è proprio quello che lo fa leggere come il telefono in mano (ART §L2.4, mossa 4).

### L5.8 Cosa registriamo? `#registra` (LM4, LM6; demo `L4`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Il ＋ si apre** (una volta per sessione) | il ＋ decorativo in testa al menu è visibile almeno al 60%, l'effetto è armato (RL3) | a `t0`: il ＋ fa la pressione (`scale(.94) → 1`, PRESSIONE) e il pannello del menu `opacity 0 → 1` + `translateY(calc(12px * var(--motion-scale))) scale(calc(1 - .04 * var(--motion-scale))) → none`, origine sul centro del ＋; le quattro voci con la SALITA (`--rise-i` 0–3) | pannello: opacità ENTRATA, transform MOLLA; voci 600 + 3 × 50ms | il menu è già aperto | è il ＋ dell'app: lo premi, si apre il menu |
| Focus dentro mentre è armato | `focusin` | stato finale subito (RL4) | | | |
| **Scelta di una voce** (tablist) | `click`, frecce, Home, Fine | il pannello cambia **nello stesso fotogramma**, senza dissolvenza; la voce scelta prende il filo d'inchiostro da 2px di colpo (è uno stato) | — | uguale | il contenuto non balla (§0, principio 5) |
| Pressione di una voce | `:active` | `.press` + strato | PRESSIONE | strato | |
| **Chat: la tua risposta** | tocco su una risposta rapida | la tua bolla compare **subito** a destra: `opacity` + `translateY(calc(8px * var(--motion-scale)))`, nessuna scala (§5 F11); le risposte vecchie escono dal DOM a `t0`; focus al gruppo delle risposte (`tabindex="-1"`, `aria-busy="true"`) a `t0` | ENTRATA | sola opacità | l'eco del tocco |
| **Pallo scrive** | subito dopo | avatar `pensa`; i tre puntini (`crea-puntino` dell'app, RESPIRO, sfalsati di metà MOLLA) per `battitura(n)` ms (`copione.ts`) | `min(700, 250 + 6·n)` | pausa 0, niente puntini | c'è qualcuno dall'altra parte |
| Salta la pausa | `pointerdown` o `keydown` dentro la chat | il messaggio compare subito; il tocco o il tasto vanno a segno (§5 F11, R3) | | | |
| **Domanda nuova** | fine della pausa | bolla di Pallo ENTRATA; le risposte nuove con la SALITA (`--rise-i` 0–2); `aria-busy` tolto | ENTRATA; SALITA | sole dissolvenze | |
| Scorrimento del registro | messaggio nuovo | il registro ha **altezza fissa** e scorre dentro (ML10); si porta in fondo `smooth` **solo se** chi legge era entro 80px dal fondo | smooth | `auto` | |
| **Fine** | «Conferma» | card del riepilogo ENTRATA, avatar `contento`, focus al messaggio finale a `t0` | | | |
| «Ricomincia» | `click` | il registro si sostituisce di colpo con `RIPARTENZA` già scritta (niente pausa: la conversazione riparte, non arriva); focus alla prima risposta | — | uguale | |

L'altezza fissa del registro non è un dettaglio di layout: una chat che cresce spinge giù `#live` e tutto il resto **mentre l'utente sta toccando le risposte**, e ogni messaggio sarebbe uno spostamento (CLS, e la risposta dopo che scappa da sotto il dito).

### L5.9 Partita live `#live` (demo `L4`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Punto** (+1 o −1) | `click`, ↑ ↓, Maiusc+↑ ↓ (focus dentro la demo) | il numero cambia a `t0` e fa il **pop** dell'app: `scale(1 → 1.16 → 1)` su `.live-num[data-pop]`, `a`/`b` alternati così ogni punto lo riavvia (`PartitaLive.css:115-121`, ridichiarato nel foglio della landing con gli stessi valori) | PRESSIONE | cambio istantaneo | quale numero è cambiato |
| Pressione del pannello | `:active` | `.press` + strato | PRESSIONE | strato | |
| **Battuta** | `battuta()` cambia testo | la nuvoletta si rimonta (chiave = testo) e fa `live-bolla`: `opacity` + `translateY(calc(4px * var(--motion-scale))) scale(calc(1 - .08 * var(--motion-scale)))` | PRESSIONE | sola opacità | Pallo commenta **questo** punto |
| Umore di Pallo | `battuta().umore` | il disegno cambia nello stesso fotogramma | — | uguale | |
| **−1 a zero** | `click` | niente (`aria-disabled`): nessun movimento, nessuna nuvoletta | — | — | |
| **+1 a set finito** | `click` | nessun punto; la nuvoletta del set **rientra** (rimontata: stessa animazione) | PRESSIONE | sola opacità | «no, prima chiudi il set», senza scossone (§8.1) |
| **«Chiudi il set» compare** | set finito | nel suo posto riservato della riga delle azioni: `opacity 0 → 1` + `scale(calc(1 - .04 * var(--motion-scale))) → 1`; poi l'**anello**: un `::after` capsula col filo `--accent-edge-tint` che fa `scale(1 → 1.12)` e `opacity .6 → 0`, **3 volte** | ENTRATA; anello 1600ms × 3, `--ease-respiro` | compare; nessun anello | il passo successivo, una volta, poi basta (ML8) |
| **«Chiudi il set»** | `click` | titolo «Set 2 di 3» e punteggi a zero **di colpo** (non è un punto: niente pop); la pillola «Set 1 21–18» compare nella riga dei set (altezza riservata) con `opacity`; focus al titolo del set a `t0` | ENTRATA (pillola) | uguale | |
| **Partita finita** | ultimo set chiuso | il riepilogo copre i pannelli **nello stesso riquadro** (`live-entra` dell'app: `opacity` + `translateY(calc(var(--rise-y) * var(--motion-scale)))` + `scale(calc(1 - .02 * var(--motion-scale)))`); focus al suo titolo a `t0`, **poi** `inert` sui pannelli | SALITA | sola opacità | |
| «Ricomincia» | `click` | il riepilogo esce (SVELTO) e lo stato riparte nello stesso fotogramma; il focus va al «Ricomincia» della riga delle azioni (sempre presente), a `t0` | SVELTO | uguale | |
| Vibrazione | tocco dell'utente | `navigator.vibrate(12)`, mai nell'autoplay, mai col fermo (è movimento del telefono) | | spenta | |

**L'autoplay** (UX FL3), deterministico:

| t (da quando la demo è visibile al 60% la prima volta, movimento permesso, focus fuori) | Che cosa |
|---|---|
| 0 | punteggio di partenza già scritto (Noi 3 · Loro 2), Pallo `saluta`: «Si comincia! Tocca chi fa punto.» |
| +600 | **il pannello «Noi» mostra il suo stato premuto per 120ms** (strato, niente scala) e poi segna: 4–2, pop, battuta |
| +1600 | lo stesso su «Loro»: 4–3, somma 7 → «Cambio campo!» |
| +2600 | nuvoletta «Tocca tu: chi fa punto?» e l'autoplay è finito |

- Il pannello che «si preme da solo» è la causa visibile del punto: un numero che cambia senza nessuno che tocca sembra un errore.
- Lo status (`role="status"`) **non** viene scritto (UX §L7.6); la vibrazione non c'è.
- `pointerdown`, `keydown` o `focusin` nella demo prima della fine: i timer si cancellano, il punteggio resta quello che è (niente ritorno indietro), l'autoplay è consumato.
- La demo scende sotto il 60% durante l'autoplay: si ferma e si consuma. Uno per visita (`autoplay` in `bvd_landing_visti`).
- Con il fermo: non parte.

### L5.10 I numeri `#numeri` (LM7; demo `L5`)

| Momento | Innesco | Proprietà | Tempo | Fermo |
|---|---|---|---|---|
| **Salita** (una volta per sessione) | la sezione è visibile al 50% ed è armata | `Odometro`: strisce di cifre in `translateY` da 0 al valore (il «66%» e le celle insieme: stessa causa, **nessuno sfalsamento**); il «%» e il «/» fermi | RACCONTO | valori finali |
| Barra vinte/perse | idem | la barra, larga quanto il binario, `translateX(calc((v - 100) * 1%)) → translateX(calc((V - 100) * 1%))` dentro il binario `overflow: hidden` (§4.4: **non** `scaleX`, schiaccerebbe le estremità) | RACCONTO | ferma |
| Andamento (PUÒ) | idem | E2 | RACCONTO | ferma |
| Lettura | sempre | il valore finale è già nel testo nascosto a `t0` (come `Tabellone`) | | |

### L5.11 La mappa `#mappa` (LM5; demo `L5`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Pin che cadono** (una volta per sessione) | il riquadro della mappa visibile al 50%, armato | ogni pin: `translateY(var(--caduta-y)) → 0` con CADUTA, e `opacity 0 → 1` nel primo quarto (100ms, lineare); `--i` da nord a sud, passo `--stagger-narrativo`; al più 8: dal nono in poi compaiono in opacità insieme all'ottavo | 400ms + 7 × 50 = 750ms in tutto | già posati | ogni città è un luogo dove sei stato, una dopo l'altra lungo la costa |
| Etichette, legenda, elenco delle città | | **nessuno**: sono testo | — | — | |
| Pin e doppio bordo | | il pin è **un** elemento: alone, filo e riempimento cadono insieme | | | |

I pin DOVREBBERO essere elementi HTML posati sopra l'SVG della costa (`left`/`top` in percentuale, una volta): così cadono sul compositor. Dentro l'SVG, un `transform` animato su un `<g>` ridipinge tutta la mappa a ogni fotogramma (§L12, ML11).

### L5.12 Beach Wrapped e la Storia `#wrapped` (LM8, LM9; demo `L3`)

| Momento | Innesco | Proprietà | Tempo | Fermo | Chiarisce |
|---|---|---|---|---|---|
| **Slide che scorrono** | scroll dentro la sezione bloccata | la fila: `translateX(0) → translateX(calc(-1 * var(--wrapped-corsa)))` con `animation-timeline: view()` della sezione e `animation-range: contain 0% contain 100%` | lineare | riga a mano | lo scroll verticale diventa lo sfoglio delle slide |
| La pista | CSS sotto `[data-viva]` | il titolo e la frase della sezione scorrono via sopra (restano il bersaglio del focus nei salti); sotto c'è la **pista**, alta `100svh` più la corsa, che porta la `view-timeline`; dentro, il blocco `position: sticky; top: 0; height: 100svh; container-type: inline-size`. La corsa: `--wrapped-corsa: calc(var(--n-slide) * (var(--slide-w) + var(--slide-gap)) - var(--slide-gap) - 100cqw)` (il blocco è largo quanto il contenuto, cioè viewport meno i gutter). 1px di scroll = 1px di slide, nessun calcolo per fotogramma | | | |
| Capsula durante il blocco | | nessun cambio: le slide stanno sopra la capsula (ART A2) | | | |
| **Storia a ventaglio** (una volta per sessione) | la figura visibile al 50%, armata | le tre carte, impilate al centro, si aprono: sinistra `translateX(-62%) rotate(calc(-1 * var(--story-tilt)))`, destra `translateX(62%) rotate(var(--story-tilt))`, la centrale ferma e davanti; sinistra poi destra (`--i` 0, 1) | MOLLA, passo 50ms | affiancate (layout di base) | da un torneo, tre Storie |

- **Il blocco è nativo o non c'è.** Senza `@supports (animation-timeline: view()) and (animation-range: contain 0%)`, oppure sotto i 600px d'altezza (UX §L9.2), oppure col fermo: la riga a mano (`overflow-x: auto`, `scroll-snap-type: x mandatory`), che sul telefono è anche il gesto naturale.
- Il blocco non intrappola: Pagina giù e spazio scorrono come sempre; nessuna slide ha controlli (UX §L7.10).
- La Storia ha **due layout**: impilata (viva, poi aperta in `transform`) e affiancata (base e fermo). Passare dall'uno all'altro col comando riaggancia lo scroll (§L3.3).
- **Per `⟂ A` / `⟂ C`**: a 390×844 senza le barre di Safari, `--slide-h` dà 688px e quindi slide larghe **387px**, più dei 358 del contenuto. Bloccata, la fila mostra una slide alla volta e la prima tocca il bordo destro. Va deciso se limitare `--slide-w` alla larghezza del contenuto (e la `--slide-h` di conseguenza). Il movimento non cambia: cambia solo la corsa.

### L5.13 Il diario resta tuo `#dati`, finale, footer

| Dove | Movimento |
|---|---|
| `#dati` | **nessuno**, a parte la guida (`sbircia`). Le righe non salgono quando entrano (ART §L11.4) |
| Finale | Pallo grande `cuori`, con la sua vita (solo in vista). Hover (`hover: hover`) o `:focus-visible` sul CTA → `festa`, **nello stesso fotogramma**; uscita dall'hover o blur → `cuori`. Al tocco no: il CTA porta via subito (UX §L6.9). Il sole è fermo: è un disegno, non un effetto |
| Footer | nessuno. «Torna su» salta all'`#inizio` (istantaneo) e mette il focus sull'`h1` (`tabindex="-1"`, `⟂ C`); la guida esce e il Pallo dell'hero ricompare (§L5.6) |

---

## L6. Caricamento delle immagini: lo skeleton che ha la forma vera

Sulla landing non c'è rete da aspettare, tranne le immagini (le quattro schermate del telefono, i tre PNG della Storia). Niente spinner, mai: lo spinner dell'app esiste solo nel visore foto e sull'avatar (§6.1).

| Da quando la cornice è in vista con l'immagine non ancora `complete` | Che cosa si vede (demo `L3`) |
|---|---|
| **0ms** | la cornice d'inchiostro alle misure giuste (`width`/`height`, `aspect-ratio`), lo schermo `--fill` |
| **150ms** (`--delay-skeleton`) | lo strato dello skeleton compare in ENTRATA: fondo `--bg` (la pagina dell'app) e le **forme della schermata vera** in `--fill`, come gli skeleton dell'app. Per la Home il titolo-frase (barra 70% × 4%), la card delle partite vinte, la coppia di card, la capsula della TabBar in fondo; per la Mappa il riquadro della mappa e due righe; per il Diario l'intestazione del mese e due voci con la copertina; per Compagni due card persona. Posizionate in percentuale dello schermo, `aria-hidden` |
| **600ms** (`--delay-respiro`) | il respiro `opacity 1 ↔ .55` (RESPIRO, `alternate infinite`) su un elemento **annidato** dentro quello che compare (due `animation` sullo stesso nodo si annullano, §6.2) |
| **immagine arrivata** | l'immagine `opacity 0 → 1` sopra lo skeleton in SVELTO, poi lo skeleton si toglie. Arrivata prima dei 150ms: nessuna dissolvenza (non c'era niente da sostituire) |
| **errore** (offline, 404) | il respiro si ferma (`animation: none; opacity: .75`), le forme restano, l'`<img>` prende `visibility: hidden` (niente icona d'immagine rotta, niente `alt` disegnato sopra la cornice): «una cornice vuota non deve sembrare rotta» (UX §L6.0). L'`alt` resta nell'albero d'accessibilità |

- Lo skeleton nasce col modulo (`data-attesa` sulla cornice); senza JavaScript la cornice resta `--fill` e l'immagine arriva quando arriva.
- Lo skeleton è **una** forma per schermata, scritta una volta nel CSS: costa zero quando l'immagine è in cache, perché i 150ms non passano mai.
- Fermo: forme ferme a `.75`, nessun respiro; le dissolvenze restano.
- **Il markup di Pallo in un chunk a parte** (UX §L13, se `⟂ C` lo separa): se l'umore che serve non è ancora arrivato, la guida tiene il disegno che ha e cambia faccia quando arriva. Nessun segnaposto: Pallo non è un contenuto da aspettare.

---

## L7. Feedback immediato

Sulla landing tutto è **locale**: ogni risposta è nel fotogramma del tocco, e niente è «ottimistico» perché niente può essere smentito dalla rete.

| Tocco | Nello stesso fotogramma |
|---|---|
| Tab, voce del menu, «Torna su» | scroll istantaneo, focus all'`h2`, `replaceState` |
| Pallo | boing, `aria-expanded`, menu visibile, focus alla prima voce |
| +1 / −1 | numero nuovo, pop, battuta, status (UX §L7.6) |
| Risposta della chat | la tua bolla, focus al gruppo delle risposte |
| Voce del ＋ | il pannello nuovo |
| «Ferma le animazioni» | `data-movimento`, `aria-pressed` sulle tre istanze, ogni effetto al suo stato finale (§L3.3) |
| «Installa» | `prompt()` nativo (o il foglio). Nessuna etichetta occupata: l'interfaccia del browser è la risposta |
| CTA verso `/` | lo strato premuto; la navigazione parte nello stesso task (nessuna attesa artificiale) |

**Niente aspetta un'animazione**: le voci del menu sono cliccabili mentre entrano, i pannelli della demo accettano tocchi durante il pop (ogni tocco lo riavvia), le risposte della chat mentre salgono, la guida mentre vola.

---

## L8. Recupero dagli errori

| Errore | Che cosa si vede | Movimento |
|---|---|---|
| Il modulo non parte (CSP, browser vecchio, eccezione) | la versione di base (UX §L6.0) | nessuno: **chi arma, arma per ultimo**. Uno stato di partenza (numeri a zero, pin sollevati, ＋ chiuso) si scrive solo **dopo** che il suo observer è in piedi. Se l'init lancia prima, l'elemento resta nello stato finale: mai una sezione lasciata a opacità 0 |
| `IntersectionObserver` assente | stati finali | gli effetti a soglia non si armano mai |
| `Element.animate` assente | stati finali | salti al valore finale |
| `linear()` assente | SALTO e CADUTA con `--ease-standard` (token) | |
| Timeline di scroll assenti | parallasse ferma, nessun pallone, Wrapped a mano (RL1) | |
| Immagine non arrivata | §L6, errore | |
| `prompt()` rifiutato o in errore | il foglio, variante `altro` (UX FL5), che entra subito | §L5.4 |
| `localStorage` / `sessionStorage` che lanciano | in memoria: ogni visita è la prima, il fermo vale fino alla ricarica | |
| Tocco non ammesso (−1 a zero, +1 a set finito) | §L5.9 | la nuvoletta che rientra; mai uno scossone |

---

## L9. Scroll

### L9.1 Soglie (tutte `IntersectionObserver`)

| Soglia | Osserva | `rootMargin` / `threshold` | Decide |
|---|---|---|---|
| Sezione corrente | ogni `<section>` | `-40% 0px -59% 0px` | lente, materiale (con la sua linea), guida dentro/fuori, umore, battuta |
| Materiale della capsula | ogni `<section>` | una fascia dell'1% sulla linea mediana della capsula (sotto i 900: `100% − --tabbar-bottom − --tabbar-h/2`; da 900: `--barra-inset + --tabbar-h/2` dall'alto) | `data-sopra` |
| Capitolo | i quattro testi di `#diario` | fascia dell'1% su `LINEA_CAPITOLO` | lo schermo del telefono |
| Testa di Pallo | due sentinelle da 1px, 24px e 96px sopra la testa del Pallo dell'hero | **una** radice = tutto ciò che sta sopra il viewport: `rootMargin: '99999px 0px -100% 0px'`. «Interseca» vuol dire «ha passato il bordo alto», e conta anche un salto istantaneo che le porta molto più su (con una radice al 20% in alto, una sentinella che va da sotto la fascia a sopra lo schermo senza toccarla non manda notizie) | salto e ritorno (§L10) |
| `theme-color` | una sentinella in fondo all'hero | `0px 0px -100% 0px` più `boundingClientRect` della notizia | il `<meta>` |
| Effetti armati | numeri, pin, ＋, Storia, demo | `threshold: [0, 0.5, 0.6]` | §L5 |

**Un solo arbitro.** Le notizie degli observer arrivano in callback separate. `guida.ts` e `nav.ts` le raccolgono e decidono in **un** `requestAnimationFrame`, con lo stato di tutte le soglie. Così un salto da `#inizio` a `#wrapped` (dove la guida è «fuori») non fa partire il salto di Pallo, e uno scroll che attraversa `#live` in 100ms non fa uscire e rientrare la guida.

### L9.2 Salti programmatici

- **Sempre istantanei** (`scrollIntoView({ block: 'start', behavior: 'auto' })`), anche oltre `SALTO_SCROLL`. UX §L4.2 permetteva il salto composto: qui non si usa (ML7). Ogni salto lungo della landing attraversa sezioni a soglia o bloccate; il focus all'`h2` dice già dove sei; e uno smooth che passa per l'hero farebbe partire il salto di Pallo a metà corsa.
- Focus all'`h2` **dopo** lo scroll, nello stesso task, con `preventScroll: true`.
- `PROGRAMMATICO_MS`: per 300ms dopo un salto, lo scroll non conta come veloce (UX §L4.3) e non conta per `QUIETE_MS`: la battuta della sezione d'arrivo esce appena il salto è fatto.
- Un salto istantaneo non disegna le sezioni di mezzo: i loro observer non scattano, e i loro effetti restano armati per quando ci arriverai davvero.

### L9.3 Scroll legato: come, e dove no

| Effetto | Timeline | Range | Gate (`@supports`) | Senza supporto |
|---|---|---|---|---|
| LM1 tramonto | `view-timeline: --inizio block` su `#inizio`, `animation-timeline: --inizio` sui piani | `exit-crossing 0%` → `exit-crossing 100%` (dall'hero in cima al viewport all'hero sopra il viewport, qualunque sia la sua altezza) | `(animation-timeline: view()) and (animation-range: exit-crossing 0%)` | scena ferma (si muovono solo le animazioni del disegno) |
| LM8 slide | `view-timeline: --wrapped block` sulla **pista** di `#wrapped` (§L5.12) | `contain 0%` → `contain 100%` (il tratto in cui la pista copre il viewport, cioè il blocco) | `(animation-timeline: view()) and (animation-range: contain 0%)` | riga a mano |
| LM10 pallone | `scroll(root block)` | tutta la pagina | `(animation-timeline: scroll())` | non c'è |

- **Perché non Motion `scroll()`**: per un `target`, Motion si aggancia a `ViewTimeline` solo con gli offset preset (`offset-to-range.mjs`), e `exit-crossing` non ci sta; altrimenti ripiega su `scrollInfo`, che misura in JavaScript a ogni scroll (RL1). Il CSS dice la stessa cosa in tre righe, e si spegne col fermo senza codice.
- Supporto, ottobre 2026: Chrome e Edge (dalla 115), Safari 26. Firefox e Safari fino a 18: la versione ferma di quegli effetti, e il resto della pagina uguale.
- `scroll-behavior: smooth` globale, scroll-snap verticale, scroll dirottato: mai (ART §L11.4).
- `content-visibility: auto` sulle sezioni: **no**. Con `contain-intrinsic-size` stimato, la pagina cambia altezza mentre la si scorre e i deep link atterrano nel posto sbagliato; sulla landing costa più di quanto risparmi.

---

## L10. Il momento firmato: «Il passaggio di consegne»

### L10.1 Che cos'è

Pallo ti saluta dalla spiaggia, in piedi sopra il titolo. **Appena cominci a scorrere, salta giù dalla scena e ti atterra accanto, sopra il ＋**, strizza l'occhio e ti dice: «Quando vuoi, il ＋ arancio apre il diario.» Da lì ti accompagna.

Non è decorazione. Dice tre cose che nessun altro movimento della pagina può dire:
- **identità**: la guida nell'angolo **è** il Pallo dell'hero, non un'icona nuova. Una dissolvenza fra due Pallo direbbe il contrario;
- **causa**: è partito perché tu hai cominciato a scorrere, e viene con te;
- **gerarchia**: atterra sopra il ＋, l'unica azione che conta in ogni punto della pagina, e la nomina.

È il gemello del «Punto segnato» dell'app (§10): là il tabellone scatta perché hai segnato una partita, qui il personaggio si sposta perché hai fatto il primo passo. Demo `L1` (`docs/motion/L1-salto.html`).

### L10.2 L'innesco

**Quando la testa del Pallo dell'hero arriva a 24px dalla cima del viewport** (`SALTO_PX`), nel fotogramma dell'arbitro (§L9.1), se:
- la sezione sotto `LINEA_SEZIONE` vuole la guida «dentro», oppure è ancora l'hero (che a quel punto non ha più il suo Pallo);
- il salto non è già avvenuto in questa sessione (`salto` in `bvd_landing_visti`);
- non è un salto programmatico;
- c'è stato almeno uno scroll dell'utente. Su uno schermo basso la testa può stare sopra i 24px già all'avvio: lì Pallo aspetta il primo scroll, non salta da solo.

Stimato sulla composizione di ART §L5.4 a 390×844: i piedi stanno a ~320px dalla cima e la testa a ~154; Pallo salta dopo ~130px di scroll, **interamente visibile**. Una linea in percentuale dell'altezza non va: il punto in cui la testa esce dipende da quanto è alto il telefono, e nella demo `L1` una linea al 20% faceva partire Pallo con la testa già tagliata. UX diceva «quando il fondo dell'hero passa il 30%»: a quel punto il Pallo dell'hero è già ~270px **sopra** lo schermo, e il salto partirebbe da fuori (ML2).

### L10.3 La coreografia

`t0` = il fotogramma della decisione. Misure prese **una volta**, a `t0`: il riquadro del Pallo dell'hero (`first`) e quello della guida a riposo (`last`).

| t | Che cosa | Proprietà | Tempo |
|---|---|---|---|
| **`t0`** | il Pallo dell'hero va a `opacity: 0` **di colpo** (è lui che parte, non svanisce); la sua vita si spegne | `opacity` | istantaneo |
| `t0` | la guida (il `<button>`) è visibile e interattiva, con l'umore `saluta` dell'hero; la sua posizione di partenza è quella dell'hero: `translate(Δx, Δy) scale(s₀)`, con `s₀ = first.width / last.width`, `transform-origin: 0 0` | `transform` | — |
| `t0 → t0 + 510` | **la corsa**: il pulsante va a `none` | `transform` | SALTO (`--ease-salto`, `--dur-salto`) |
| `t0 → t0 + 215` | **l'arco**: la figura dentro il pulsante sale e ricade: `translateY(0 → −h → 0)`, `h = min(48px, 12% di |Δy|)`; picco al 20% della corsa con `ease-out`, ricaduta al 42% con `ease-in` | `transform` (elemento annidato: due transform sullo stesso nodo si coprono) | keyframe, 215ms |
| `t0 + 215` | **atterra**: SALTO tocca il segno per la prima volta al 42% della durata. `data-tocco` (il boing di `Pallo.css`, 620ms) e l'umore passa a `occhiolino` | | |
| `t0 + 215 → 510` | il superamento di SALTO (+2.8%) e il ritorno: lo schiaccio del boing ci cade sopra | | |
| `t0 + 510` e scroll fermo da `QUIETE_MS` | la nuvoletta «Quando vuoi, il ＋ arancio apre il diario.» (§L5.2), segnata come la battuta `bolla:diario-1` | ENTRATA | |

Tutto è `transform` e `opacity` su **un** livello composto (il pulsante) più la figura annidata. Il ritardo della nuvoletta è **causale** (§2.2.4): non parla prima di essere arrivato.

### L10.4 Interruzioni

| Mentre vola… | Allora |
|---|---|
| si torna su, con la testa sotto `RITORNO_PX` | la corsa si ferma dov'è (`commitStyles` + `cancel`), e la guida esce **da lì** (SVELTO, verso il bordo); il Pallo dell'hero torna in ENTRATA. Il salto è consumato: la prossima volta la guida entrerà dal bordo |
| si tocca Pallo | è il pulsante: il menu si apre a `t0`, la corsa continua. Il menu è ancorato alla posizione di riposo, dove Pallo sta arrivando |
| si accende il fermo | `finish()`: Pallo è nell'angolo |
| `resize` | `finish()` (le misure non valgono più) |
| la sezione corrente diventa «fuori» (scroll molto veloce fino a `#registra`) | la corsa finisce e la guida esce subito dopo, da ferma: niente uscita a metà volo verso un posto che cambia |

### L10.5 Fermo

Il Pallo dell'hero `opacity → 0` in SVELTO; la guida `opacity 0 → 1` in ENTRATA, già nell'angolo, già `occhiolino`. La battuta arriva come sempre (sola opacità). Stesso significato («è lui, ora è qui»), nessuno spostamento.

### L10.6 Nitidezza, e perché non altro

- **La scala va da `s₀ > 1` a 1**: la figura parte grande (128 o 240) e diventa 64. Chrome rasterizza un livello animato alla scala massima dell'animazione; WebKit può non farlo, e i primi fotogrammi sarebbero un 64 ingrandito. Se in QA su iPhone si vede, la ricetta è: la figura della guida è disegnata **alla misura dell'hero** e scalata in giù a riposo (`scale(var(--guida-size) / --pallo-hero)`, un numero scritto da JS al `resize`). Così la scala è sempre ≤ 1. DOVREBBE, `⟂ C` `⟂ QA`.
- Un **clone** che vola mentre la guida aspetta invisibile: no. Per 510ms il bersaglio sarebbe un pulsante invisibile nell'angolo, e il Pallo che si vede non si potrebbe toccare (R3).
- Una **traiettoria su curva** calcolata in rAF: no. Thread principale durante lo scroll, proprio quando la pagina deve scorrere liscia; l'arco annidato fa lo stesso effetto sul compositor.
- Una **dissolvenza incrociata** fra i due Pallo, anche senza fermo: no. Perde l'identità, che è il motivo del momento.

**Costo**: un livello composto per ~510ms, più le animazioni dell'umore dentro la figura (già pagate). Nessuna lettura di layout dopo `t0`.

---

## L11. La matrice ferma

Con `prefers-reduced-motion: reduce` **o** `data-movimento="fermo"` (UX §L11.3, completata con i meccanismi):

| Elemento | Normale | Fermo | Meccanismo |
|---|---|---|---|
| Scena dell'hero | palleggio, nuvole, gabbiani, barca, schiuma, palma, sole | fotogramma `FERMO` | §L3.2 (CSS), predicato (`avviaPalleggio`) |
| Parallasse, sole che scende (LM1) | scroll legato | fermo | CSS: il gate esclude il fermo |
| Pallo, ovunque | vita, sguardo, umori animati, boing, sorprese, «z» | il disegno dell'umore; gli umori cambiano lo stesso | §L3.2 + predicato in `Pallo.vita.ts` |
| Il salto (LM2) | FLIP SALTO | dissolvenze incrociate | JS |
| Guida: entra / esce | MOLLA dal bordo / SVELTO | sola opacità | `--motion-scale` |
| Nuvoletta, menu, foglio | opacità + spostamento | sola opacità | `--motion-scale` |
| Pallo sbircia dal foglio | sale dopo il foglio | c'è da `t0` | JS |
| Lente | si sposta | salta | `transition: none` |
| Inchiostro delle tab, materiale della capsula | dissolvenze | dissolvenza (inchiostro) / istantaneo (materiale) | |
| Pallone dell'avanzamento | rotola | **non c'è** | CSS |
| Telefono sticky (LM3) | schermo a soglia, dissolvenza | capitoli in linea | `data-viva` + gate |
| ＋ che si apre (LM4) | MOLLA + SALITA | già aperto | RL3 col predicato: mai armato |
| Chat (LM6) | pausa e puntini; bolle con spostamento | pausa 0, niente puntini; bolle in opacità | predicato; `--motion-scale` |
| Demo: autoplay | sì | no | predicato |
| Demo: pop, «Chiudi il set» | pop, anello × 3 | cambio istantaneo, nessun anello | CSS |
| Numeri, barra (LM7) | RACCONTO | valori finali | predicato (`Odometro`) + `--dur-racconto: 0ms` |
| Pin (LM5) | CADUTA sfalsata | posati | predicato: mai armati |
| Wrapped (LM8) | bloccato | riga a mano | gate + `data-viva` |
| Storia (LM9) | ventaglio | affiancata | predicato + layout di base |
| Skeleton delle schermate | forme a 150ms, respiro a 600ms | forme a 150ms, ferme a .75 | `animation: none` esplicito |
| Pressione | scala + strato | strato | `--press-scale: 1` |
| Scroll programmatici | istantanei | istantanei | — |
| Vibrazione della demo | sì | no | predicato |

**Che cosa resta sempre**: le dissolvenze (guida, nuvoletta, menu, foglio, schermo del telefono, immagini), lo strato di pressione, gli umori di Pallo (cambiano senza muoversi), la lente come forma (salta), il focus e i suoi anelli.

---

## L12. Costi: cosa è caro e cosa usare al suo posto

| Effetto | Perché costa | Al suo posto |
|---|---|---|
| **Parallasse dentro un solo SVG** (`transform` su `<g>` della scena) | i figli di un SVG non hanno un livello loro: ogni fotogramma ridipinge tutta la scena (1350×844 di viewBox, tre gradienti e un pattern) sul thread principale, durante lo scroll | **tre piani**: tre `<svg>` con lo stesso `viewBox` e lo stesso `preserveAspectRatio`, impilati in `position: absolute` e allineati per costruzione. Si muovono i contenitori HTML di `cielo` e `sole` (compositor); `terra` sta con la pagina. I gradienti si citano da un piano all'altro (`url(#…)` vale in tutto il documento). Lo snapshot di `⟂ E` emette i tre piani: in `Login.scena.tsx` bastano tre `<g data-piano="cielo|sole|terra">` che non cambiano il disegno |
| …i piani in memoria | due livelli in più grandi quanto la scena: ~12MB l'uno a 390×844 @3x | il gate li crea solo con l'hero in vista (la timeline ferma, fuori range, non anima); niente `will-change` fisso |
| Le animazioni infinite della scena (nuvole, gabbiani, barca, schiuma, palma, ali) | animazioni CSS su figli di SVG: pittura sul thread principale per tutto il tempo in cui l'hero è in vista. È il costo che il Login paga già | in pausa fuori vista e senza `data-viva` (RL5, §L4.1). **Se** `perf.mjs` a CPU 4× trova fotogrammi lunghi nello scroll dell'hero: in pausa anche durante lo scroll attivo (`data-scorre` sull'hero dal primo `scroll` a 150ms dall'ultimo; due ricalcoli di stile per gesto). Prima si misura |
| **«Chiudi il set» che pulsa in `box-shadow`**, all'infinito (`PartitaLive.css:243-247`) | ridipinge il pulsante e la sua ombra a ogni fotogramma, per sempre; e un'animazione infinita che dura più di 5s senza comando | un `::after` a capsula con il filo dell'arancio che fa `scale` e `opacity`, **tre** volte (4.8s) e poi basta. Proposto anche per l'app come attività a parte |
| Pin dentro l'SVG della mappa | come sopra: pittura della mappa intera per 750ms | pin HTML sopra l'SVG, posati in percentuale (ML11). Se restano nell'SVG: ammesso, è una volta per sessione e la mappa è piccola (356×318) |
| Lettura del layout nello scroll (offsetTop per il telefono sticky, getBoundingClientRect per la velocità) | layout forzato a ogni evento | `IntersectionObserver` per le soglie; `scrollY` e `timeStamp` per la velocità (RL2) |
| Motion `scroll()` col ripiego JS | `scrollInfo` misura a ogni scroll sul thread principale | CSS `animation-timeline` dietro `@supports`, e la versione ferma dove manca (RL1) |
| Etichette delle tab con `transition: color` (come `.ui-tab` dell'app) | durante lo scroll, a ogni cambio di sezione, quattro etichette si ridipingono per 180ms | inchiostro acceso/spento su due livelli in opacità; spento chiaro/scuro con un cambio **discreto** a metà dello scambio del vetro (`data-inchiostro`, scritto dal JS): una pittura sola (ML13). Un `transition: color 0s` con ritardo farebbe lo stesso, ma è comunque una transizione di `color` e il badge `?audit` (giustamente) la segna |
| Due strati di vetro della capsula | durante i 180ms dello scambio, due sfocature | è il prezzo dichiarato (ART §L9.3); lo strato che esce prende `visibility: hidden` alla fine, e uno scambio a metà si inverte invece di sommarsi |
| Guida che vola con la figura a 64 ingrandita | rasterizzazione alla scala di riposo su WebKit: primi fotogrammi sfocati | figura alla misura dell'hero, scalata in giù (§L10.6), solo se si vede |
| Chat che cresce nella pagina | ogni messaggio sposta tutto ciò che sta sotto (CLS, bersagli che scappano) | registro ad altezza fissa con scroll interno (ML10) |
| Bottoni che collassano dopo `appinstalled` | spostamento del finale (CLS) | il pulsante diventa lo status, nello stesso riquadro (ML9) |
| `will-change` scritto nel CSS | memoria della GPU per tutta la vita della pagina | lo mettono le Web Animations e le timeline mentre corrono |
| Markup dei 14 umori sempre nel DOM | migliaia di nodi SVG che non si vedono | un umore alla volta: la stringa generata si sostituisce (`innerHTML` di un `<g>`), nello stesso fotogramma del cambio |
| `content-visibility: auto` sulle sezioni | altezze stimate che cambiano scorrendo, deep link che sbagliano posto | non si usa (§L9.3) |

---

## L13. Deviazioni da UX.md e ART_DIRECTION.md (Parte L)

| # | Il documento dice | Qui | Perché |
|---|---|---|---|
| **ML1** | ART §L11.3 LM1: cielo × 0.5, sole × 0.6, mare e barca × 0.3 | cielo **0.15**, sole **0.30**, mare e barca **con la terra** (0) | la fascia del mare è alta 46px: a × 0.3 la sabbia la copre in ~153px di scroll, con l'orizzonte a metà schermo. A × 0.6 il sole tramonterebbe in 70px. Così il disco è sotto l'orizzonte dopo 140px e il bagliore resta finché l'orizzonte è in vista (§L5.6) |
| **ML2** | UX §L6.1: Pallo salta quando il fondo dell'hero passa il 30% del viewport | quando **la sua testa** arriva a 24px dalla cima (`SALTO_PX`); la guida esce quando torna sotto i 96px (`RITORNO_PX`); mai senza uno scroll dell'utente | col fondo dell'hero al 30%, a 390×844 il Pallo dell'hero è già ~270px sopra lo schermo: il salto partirebbe da fuori. Una soglia in pixel sulla testa, e non in percentuale del viewport, vale su ogni altezza di telefono. L'isteresi evita l'andirivieni sul filo |
| **ML3** | UX §L12.4: la prima battuta («il ＋ arancio…») al capitolo 1 di `#diario` | all'**atterraggio** del salto | Pallo atterra sopra il ＋ e lo nomina: causa ed effetto nello stesso posto. Al capitolo 1 non si ripete |
| **ML4** | UX §L6.10: la battuta compare al cambio di sezione | compare quando lo scroll è fermo da `QUIETE_MS` (250ms); se nel frattempo la sezione cambia, vale quella nuova | una nuvoletta che spunta durante una scorsa veloce è rumore; UX L0 chiede che Pallo «non parli mai durante lo scroll» |
| **ML5** | Piano: Motion `scroll()` per gli effetti a scroll | timeline native in CSS; la versione ferma dove mancano | Motion ripiega su JavaScript proprio dove il compositor non c'è (§L9.3); `exit-crossing` non è tra i suoi preset |
| **ML6** | Piano: le molle con Motion | SALTO e CADUTA come token `linear()` + Web Animations (Motion ammesso coi valori uguali) | una dipendenza in meno nel bundle della landing (≤ 70KB gzip, UX §L13), e la stessa curva in CSS e in JS |
| **ML7** | UX §L4.2: oltre `SALTO_SCROLL` PUÒ fare il salto composto | sempre istantaneo | ogni salto lungo attraversa effetti a soglia o bloccati; uno smooth dall'hero farebbe partire il salto di Pallo |
| **ML8** | UX §L6.4 e l'app: «Chiudi il set» pulsa (`box-shadow`, infinito) | anello in `transform`/`opacity`, tre volte | R2; WCAG 2.2.2 |
| **ML9** | UX FL5: dopo `appinstalled` «pulsanti via» | il pulsante si trasforma nello status, nello stesso riquadro | niente collassa (CLS 0); il risultato appare dove l'hai causato |
| **ML10** | UX §L6.3 / ART §L5.4: la chat nel pannello, larga al più 420 | anche **alta** al più `min(28rem, 60svh)`, con scroll interno (`overscroll-behavior: contain`) | una chat che cresce sposta la pagina sotto il dito a ogni messaggio |
| **ML11** | ART §L10.7: pin nell'SVG della costa | DOVREBBERO essere HTML sopra l'SVG | cadono sul compositor (§L12) |
| **ML12** | App (`.ui-tabbar-pill`): la lente nascosta torna scivolando | ricompare sulla tab nuova, senza scivolare | dopo una sezione senza tab, la posizione vecchia non vuol dire niente |
| **ML13** | App: etichette delle tab con `transition: color` | due livelli d'inchiostro in opacità; spento chiaro/scuro con un attributo scritto a metà scambio, senza transizione | percorso caldo (§1.2): succede durante lo scroll |
| **ML14** | UX §L6.0: senza JS, la versione ferma | anche la scena è ferma senza JS (animazioni CSS in pausa fino a `data-viva`) | senza JS il comando «Ferma le animazioni» non c'è, e la scena si muoverebbe per sempre (WCAG 2.2.2) |
| **ML15** | UX §L7.13: lo stato del fermo in `localStorage`, letto dal modulo | letto **prima del primo disegno** da `presentazione/js/fermo.js`, classico e bloccante | il modulo arriva dopo il primo disegno: chi ha chiesto il fermo vedrebbe la scena muoversi per un attimo |
| **ML16** | UX FL3: autoplay «pochi punti, ~1 al secondo» | sequenza fissa (3–2 → 4–2 → 4–3, «Cambio campo!», «Tocca tu») col pannello che si mostra premuto | un punto senza una causa visibile sembra un errore; deterministico per i test |
| **ML17** | UX §L6.3: il ＋ «si apre nel menu come nell'app» | il ＋ fa la pressione a `t0` e il menu si apre da lui; un focus dentro un effetto armato lo apre subito (RL4) | causa visibile; nessun focus dentro qualcosa di invisibile |
| **ML18** | ART §L5.7: Storia «aperta a ventaglio», «ferma: affiancata» | viva: impilata, poi a ventaglio in `transform`; base e fermo: affiancata | il ventaglio è uno stato raggiunto col movimento; da ferma la Storia si legge meglio affiancata |

---

## L14. Le demo della landing

Cinque pagine in `docs/motion/`, fuori dalla build come le altre. Leggono `src/styles/tokens.css`, `materials.css` **e** `presentazione/styles/tokens.css`; usano `_lab.js` (molle, audit, `?reduce`, `?slow`, `?audit`) e `_landing.js`, che è il riferimento eseguibile di `movimento.ts` (`movimentoFermo`, `alCambioDelMovimento`, `impostaFermo`, la memoria di sessione, gli effetti armati di RL3/RL4, l'arbitro di §L9.1). Pallo è un **segnaposto** disegnato con due cerchi: le demo mostrano il movimento, non il disegno (quello lo porta lo snapshot di `⟂ E`).

| File | Che cosa mostra | Sezioni |
|---|---|---|
| `L1-salto.html` | l'hero coi tre piani e il tramonto legato allo scroll; **il passaggio di consegne** (FLIP con SALTO e l'arco annidato, atterraggio, battuta dopo la quiete); ritorno con isteresi; guida dentro/fuori per sezione; tocco, cinque tocchi, sonno | §L5.2, §L5.6, §L10 |
| `L2-barra.html` | la capsula a due materiali su fondi chiari e scuri, la lente con l'inchiostro a due livelli, la lente che ricompare; il pallone dell'avanzamento; il menu della guida dal centro di Pallo; il foglio d'installazione dal menu (`frost` a `t0`, conto del vetro); il comando «Ferma le animazioni» in tre istanze | §L3, §L5.1–§L5.5 |
| `L3-scroll.html` | il telefono sticky con la linea al 72%/50% e lo skeleton delle schermate (immagini lente simulate, e una che fallisce); Wrapped bloccato con la timeline nativa e la riga a mano; la Storia a ventaglio; il riaggancio dello scroll quando si accende il fermo | §L3.3, §L5.7, §L5.12, §L6 |
| `L4-gioca.html` | il ＋ che si apre una volta (armato, e aperto dal focus); la chat con la pausa interrompibile e il registro ad altezza fissa; la demo live con l'autoplay deterministico, il pop, le battute, «Chiudi il set» con l'anello × 3, il riepilogo | §L5.8, §L5.9 |
| `L5-soglie.html` | gli effetti armati di RL3: numeri che salgono, barra vinte/perse, pin con CADUTA sfalsati, una volta per sessione; il caso «già in vista all'avvio» (`#numeri` in fondo all'URL) | §L4.2, §L5.10, §L5.11 |

**Parametri in più** (oltre a `?reduce`, `?slow`, `?audit`): `?fermo` accende «Ferma le animazioni» all'apertura; `?nuova` svuota la memoria di sessione (`bvd_landing_visti`) **e** la scelta del fermo salvata nel dispositivo (`bvd_landing_fermo`), per rivedere gli effetti «una volta». L1 accetta anche `?sonno=3` (il sonno di Pallo dopo 3s invece di 10). L4 ha «Live: 20–19» per arrivare al set point.

**Una trappola trovata provandole**: la scelta del fermo resta nel `localStorage` dell'origine. Una demo in cui si è premuto «Ferma le animazioni» lascia ferme anche le altre aperte dopo dallo stesso server, finché non si ripreme il comando o si apre con `?nuova`. È il comportamento giusto per la landing, ma in QA va azzerato a ogni pagina.

---

## L15. Verifica

### L15.1 In jsdom (`⟂ QA`)

- **Armare solo fuori vista** (RL3): con un `IntersectionObserver` finto, prima notizia «in vista» → nessun attributo di partenza scritto, chiave in `bvd_landing_visti`; «fuori vista» → armato; poi «in vista» → scatta.
- **Focus dentro un effetto armato** (RL4): `focusin` → stato finale nello stesso task.
- **Il fermo a metà** (RL6): con `Element.prototype.animate` finto che registra, accendere il fermo chiama `finish()` su ogni animazione aperta, mai `cancel()`.
- **Autoplay**: con i timer finti, i due punti a +600 e +1600 e la battuta a +2600; un `pointerdown` a +900 lascia 4–2 e non scrive lo status; mai con `matchMedia` ridotto né con `data-movimento="fermo"`.
- **Battuta e quiete**: cambio di sezione durante uno scroll → nessuna nuvoletta finché non passano `QUIETE_MS` senza `scroll`.
- **Salto**: il FLIP non parte se l'arbitro vede una sezione «fuori»; parte una volta per sessione; col fermo, nessun `transform`.
- **Statico sul CSS della landing** (si aggiunge a `src/test/landing.test.ts`, UX §L14.1): ogni `animation-timeline` sta dentro un `@supports`; ogni `@keyframes` infinito ha il suo `animation: none` **sia** sotto `prefers-reduced-motion` **sia** sotto `:root[data-movimento="fermo"]`; nessuna `transition`/`@keyframes` nomina proprietà diverse da `transform`, `opacity`, `visibility` (salvo E2 marcata); niente `will-change`.

### L15.2 Nel browser (`docs/qa/landing.mjs`, `⟂ QA`)

- A ogni fermata e **durante** i passaggi (uscita dall'hero, menu → foglio): vetro ≤ 3, e ≤ 2 a riposo, contato come `?audit`.
- Col fermo e con `prefers-reduced-motion`: dopo 1s, `document.getAnimations()` senza animazioni in corso (UX §L14.3), a parte le timeline staccate.
- Hero fuori vista: nessuna animazione della scena in corso (RL5).
- `perf.mjs` adattato (build di produzione, CPU 4×, scroll completo): 0 fotogrammi lunghi, nessun layout forzato nei gestori di scroll, CLS 0.
- Salto di Pallo: screenshot a `t0 + 0`, `+ 215`, `+ 510` a 390×844 e a 1280×800; la figura non deve apparire sfocata (su iPhone vero: §L10.6).

### L15.3 A mano

| Dove | Che cosa |
|---|---|
| iPhone, Safari 26 | il tramonto e le slide bloccate (timeline native); il salto di Pallo (nitidezza); la pila in basso con la barra di Safari che si compatta mentre Pallo atterra |
| iPhone, Safari 18 | la versione ferma degli effetti a scroll, senza buchi: scena ferma, Wrapped a mano, niente pallone |
| Android economico | lo scroll dell'hero con la scena viva (§L12, «se `perf.mjs` trova fotogrammi lunghi») |
| Ogni demo `L*` con `?audit`, `?reduce`, `?fermo` | nessun ✗, vetro mai oltre 3 |

---

## L16. Seam per i ruoli successivi

| Seam | Che cosa | Riferimento |
|---|---|---|
| **⟂ E** | `Pallo.vita.ts`, `Odometro.ts`, `avviaPalleggio`: il predicato del fermo e l'iscrizione ai cambi **iniettati** (default = la media query), così il comando della pagina li spegne; il primo fotogramma di `avviaPalleggio` = `FERMO` | §L3.1, §L4.1 |
| ⟂ E | `Login.scena.tsx`: tre `<g data-piano="cielo|sole|terra">` (nessun cambio visivo); lo snapshot emette tre piani con lo stesso `viewBox` | §L12 |
| **⟂ C** | `presentazione/js/fermo.js` (classico, bloccante, nel `<head>`); `movimento.ts` sul modello di `docs/motion/_landing.js`; `presentazione/styles/movimento.css` col blocco di §L3.2 | §L3 |
| ⟂ C | le costanti di §L2.2 coi loro nomi; l'arbitro unico delle soglie (§L9.1); armare per ultimo (§L8) | §L2.2, §L8, §L9 |
| ⟂ C | `data-viva` per sezione; scena in pausa senza (ML14); `data-fuori` fuori vista (RL5) | §L4.1 |
| ⟂ C | gli effetti a scroll in CSS dietro `@supports` (§L9.3); `--giri` dal `ResizeObserver` del binario | §L5.5, §L5.6, §L5.12 |
| ⟂ C | il salto di §L10 (anche l'arco annidato e il boing all'atterraggio); la guida come `<button>` che si muove | §L10 |
| ⟂ C | la chat ad altezza fissa (ML10); il pulsante d'installazione che diventa status (ML9); «Chiudi il set» con l'anello × 3 (ML8); i pin HTML (ML11) | §L5 |
| ⟂ C | lo skeleton delle quattro schermate e della Storia, con le forme vere (§L6) | §L6 |
| **⟂ QA** | i test di §L15.1 (jsdom e statico); `docs/qa/landing.mjs` con il conto del vetro nei passaggi, le animazioni ferme fuori vista e col fermo, il salto in tre fotogrammi | §L15 |
| fuori scope | «Chiudi il set» dell'app (`PartitaLive.css:243`) pulsa in `box-shadow` all'infinito: stessa correzione di ML8, proposta come attività a parte | §L12 |
