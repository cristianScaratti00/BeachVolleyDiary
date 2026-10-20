# MOTION.md: il movimento di "Bagnasciuga"

| | |
|---|---|
| Ruolo | Interaction e motion designer, ruolo 3 di 6. Specifica i momenti **fra** gli stati; **nessun componente di produzione** in questo commit |
| Base | `UX.md` (ruolo 1, `19bf228`) per il comportamento, `ART_DIRECTION.md` (ruolo 2, `1257279`) per vocabolario e aspetto. Dove questo documento li corregge lo dice in §14 |
| Demo di riferimento | `docs/motion/` (sette demo più l'indice). Leggono i token veri (`src/styles/tokens.css`, `materials.css`); si aprono senza build (§15) |
| Verifica | Ogni demo è stata pilotata in Chrome headless (tocchi, tasti, trascinamenti veri via CDP), **con e senza** `prefers-reduced-motion`. Il badge `?audit` ha registrato zero animazioni fuori da transform/opacità (salvo l'eccezione dichiarata E1) e al massimo 2 superfici sfocate contemporanee |
| Lingua | italiano; nomi di token, classi e costanti come nel codice |
| Livelli di obbligo | **DEVE** = criterio di accettazione · **DOVREBBE** = atteso, salvo motivo scritto · **PUÒ** = facoltativo |
| Landing | la landing `/presentazione` ha la sua parte in fondo: **[Parte L](#parte-l-la-landing-presentazione-il-movimento)** (20 ottobre 2026). Le regole di questo documento valgono anche lì, senza eccezioni: si muove solo la pressione dei pulsanti |

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
- [Parte L. La landing `/presentazione`: il movimento](#parte-l-la-landing-presentazione-il-movimento)

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

**L'accesso** (dal 20 ottobre 2026): nessun movimento d'ambiente. Il tramonto animato (il palleggio, le onde, la palma) è uscito; resta la carta con Solby fermo, nessun `vivo` né `segui`. Si muove solo ciò che cambia: nel Benvenuto i messaggi scorrono da soli (5,5s l'uno, la barretta del puntino acceso che si riempie in `linear` è il loro tempo, e con il mouse sopra si ferma dov'è), la card di Solby cambia in ENTRATA (dissolvenza e 8px di salita) e il «63%» gira da zero una volta per sessione (il tabellone, §10.3). Con reduced-motion i messaggi partono fermi.

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
| Parallasse, sole basso che si muove | decorazione; `background-attachment: fixed` non funziona su iOS; ART_DIRECTION §4.2 (`--bg-canvas` non è `fixed`). Vale anche per la landing (Parte L) |
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

# Parte L. La landing `/presentazione`: il movimento

La landing (20 ottobre 2026) è la tavola «Landing page» del canvas di Claude Design (`ART_DIRECTION.md`, Parte L). Il movimento di «Controluce» (scroll legato al tramonto, il salto di Pallo, le soglie, le molle SALTO e CADUTA, le demo `L1`–`L5`) è uscito con lei: resta nella storia di git fino al commit `a9793f3`.

Dalla rifinitura dello stesso giorno la landing ha **due movimenti che raccontano qualcosa, tutti e due presi dall'app**. Il primo è l'apertura della Home nel telefono dell'hero (L1). Il secondo è il giro di `#schermate`, sei momenti di una stagione che si sfogliano scorrendo (L2). La pagina resta senza JavaScript: è tutto CSS (`presentazione/styles/apertura.css`, `schermate.css`).

## L1. Il momento firmato: l'apertura della Home

La landing dice che il diario diventa numeri. Il telefono dell'hero lo fa vedere con il gesto con cui l'app lo dice già: **la prima volta che apri la Home in una sessione**, i blocchi salgono uno dopo l'altro (la SALITA), le cifre del tabellone girano da zero (§10.3, la «salita da zero» di `Tabellone.tsx`) e la barra delle vinte cresce da sinistra (`Home.css`). Non c'è niente d'inventato: tempi, curve, ordine e misure sono quelli dell'app.

**Come è fatto.** Ferma, la schermata è l'`<img>` della Home vera (`home.webp`). Mentre l'apertura scorre ci stanno sopra due strati decorativi (`aria-hidden`):

- **le fasce**: `home-fondo.webp` (la Home senza cifre né barra), una striscia per blocco, che sale come il blocco dell'app;
- **il tabellone**: le colonne delle cifre (la striscia `[vuoto, 0–9, 0–9]` di `Odometro.ts`, in un `::before`) e le due parti della barra.

Le misure sono in pixel dell'app (390 × 844) per `--px` (`100cqw / 390`, lo schermo è un contenitore). Le scrive `docs/qa/landing-shots.mjs` in `presentazione/styles/misure.css`, nella stessa passata che scatta `home-fondo.webp`: si rigenerano insieme e restano al pixel. Lo script si ferma se l'hero di `presentazione/index.html` non ha le colonne o le fasce che servono.

A fine corsa i due strati spariscono e resta l'immagine. **Le cifre ferme sono quelle disegnate dall'app**, non quelle della landing: il browser arrotonda ascendente e discendente del carattere alla taglia a cui lo disegna. A 18.7px (il telefono a .78) le cifre cadrebbero fino a un pixel più in alto di quelle dell'app a 24px, misurato sovrapponendo le due in `difference`. Durante il giro lo scarto non si vede; da ferme sì.

**Tablet e desktop** (il telefono è nella prima vista): parte al caricamento, una volta.

| t | Che cosa | Tempo |
|---|---|---|
| 0 | lo schermo è la carta dell'app; la TabBar c'è già (nell'app è cornice, non sale) | — |
| 400ms (`--attesa`) | i blocchi salgono: testa, filtri, il consiglio di Solby, rendimento, Beach Wrapped, la coppia | SALITA (`--dur-rise`, `--ease-rise`), +`--rise-step` per blocco |
| 400ms | le cifre girano da zero: 63 e +36 e 5 in RACCONTO, l'1 in MOLLA (un salto di uno). Le colonne nuove entrano dal vuoto, quella che c'era scivola di una colonna a destra (il FLIP) | 800 / 320ms |
| 700 · 850ms | la barra cresce da sinistra: le vinte, poi le perse (6 e 9 passi, come `Home.css`) | RACCONTO |
| 1650ms (`--fine`) | gli strati spariscono, resta la Home vera | — |

**Telefono** (verticale, o in orizzontale sotto i 500px di altezza): l'hero sta sotto la piega, e un'apertura al caricamento la vedrebbe nessuno. Le cifre e la barra sono legate allo scroll: girano mentre il telefono entra in vista (`view-timeline` sul telefono). 63% e +36 partono a metà del suo ingresso; la fila dei tornei vinti e della serie, più in basso, parte più tardi. Tre differenze:

- le cifre scattano **una intera per passo** (`steps(n, jump-none)`): a scroll fermo non resta mai una cifra a metà;
- le colonne **non scivolano**: fermo a metà, lo scivolamento lascerebbe un buco fra la cifra e il «%»;
- i blocchi **non salgono**: quando il telefono compare sono già fermi.

Dove `animation-timeline` non c'è, il telefono fa l'apertura a tempo al caricamento, fuori vista, e arriva comunque alla Home vera.

## L2. Il giro: la stagione che si sfoglia scorrendo

`#schermate` racconta l'app in sei momenti, ognuno con la sua schermata vera e due righe: Solby che compila il torneo, la Partita live, il torneo nel diario, i compagni, la Storia Instagram, Beach Wrapped. **Lo scroll è il tempo del racconto**: scorrendo si va avanti nella stagione, e tornando su si torna indietro.

**Come è fatto.** `.giro` è alto una schermata più 60svh per ogni momento dopo il primo, e ha la view timeline `--giro`. Dentro, `.giro-scena` (`position: sticky`, alta `100svh`) resta incollata allo schermo per tutta la fase `contain` della timeline. I sei momenti stanno uno sopra l'altro nella stessa cella della griglia, e ognuno ha un sesto della fase `contain`:

| Che cosa | Come | Perché |
|---|---|---|
| La schermata | entra sopra la precedente nel primo 14% del suo tratto (`opacity`) e poi resta; tornando su se ne va e ricompare quella di prima | il telefono è uno solo (la cornice la disegna il primo momento, gli altri portano solo la schermata): cambia schermata come quando si sfoglia l'app, senza un fotogramma vuoto in mezzo |
| Il testo | sale di 16px entrando (14%), sale ancora uscendo (ultimo 14%), prima che arrivi il prossimo | due testi di altezza diversa non possono stare a metà uno sull'altro |
| La barra | sei segmenti, uno per momento, che si riempiono da sinistra (`scaleX`) lungo il loro tratto | sono le storie di Beach Wrapped: dicono quanti momenti ci sono e dove sei |

Il primo momento c'è già mentre la scena arriva (`--in: 1`), l'ultimo resta mentre se ne va (`--out: 1`). La scena resta ferma per 300svh di scroll (cinque volte 60svh), e ogni momento ne ha un sesto, 50svh: 422px su un telefono alto 844, 400 su un portatile alto 800.

**Fermo**, con reduced-motion, sotto i 500px di altezza (il telefono in orizzontale) e dove `animation-timeline` non c'è, il giro è l'elenco ordinato che è nel modello: sei coppie una sotto l'altra, il testo accanto al telefono (sopra di lui sul telefono), tutte visibili.

## L3. Le regole

| # | Regola |
|---|---|
| ML1 | **Si muovono tre cose sole**: la pressione dei pulsanti (`scale(var(--press-scale))` all'`:active`, gli stessi `--dur-press` e `--ease-press` dell'app), l'apertura della Home (L1) e il giro (L2). Nient'altro ha `transition` né `animation` |
| ML2 | **Si animano solo `transform`, `opacity` e `visibility`**, nelle transizioni e nei fotogrammi (R2). I colori dell'hover cambiano di colpo, e l'hover vale solo con un puntatore vero |
| ML3 | **Reduced motion**: ogni animazione sta dentro `prefers-reduced-motion: no-preference`. Con reduced-motion non ci sono gli strati dell'apertura (la Home vera, ferma), il giro è un elenco fermo con tutti i momenti visibili, e `--press-scale` vale 1: non si muove niente |
| ML4 | **Le cifre ferme sono quelle dell'app** (L1): gli strati esistono solo mentre l'apertura scorre |
| ML5 | **Lo scroll guida un'animazione solo dove la relazione dice qualcosa** (il telefono che entra in vista; lo scroll come tempo della stagione nel giro) e mai da solo: c'è sempre un ripiego senza `animation-timeline`, e il contenuto è lo stesso nei due casi. Nell'app gli effetti legati allo scroll restano rifiutati (§9.2); qui nessuna funzione ne dipende |
| ML6 | **Le ancore della testata saltano**, senza `scroll-behavior: smooth` (§9.3) |
| ML7 | **L'anello di focus compare istantaneo**: nessuna transizione nomina `outline`, e nessuna è `all` (R6) |

Lo verificano `src/test/landing.test.ts` (transizioni e fotogrammi dei fogli, animazioni solo con il movimento consentito, l'apertura coerente con `misure.css`, il giro coerente col suo foglio, l'hover) e `docs/qa/landing.mjs` (`reduced`: niente in moto, la pressione a 1; `apertura`: gli strati se ne vanno a fine corsa, a tempo o con lo scroll; `giro`: la scena ferma e un momento solo, quello giusto, per tratto).
