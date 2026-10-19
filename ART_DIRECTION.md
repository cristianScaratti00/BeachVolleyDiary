# ART_DIRECTION.md: "Bagnasciuga"

| | |
|---|---|
| Ruolo | Art director, ruolo 2 di 6. Definisce il sistema visivo; **non costruisce componenti** |
| Base | `UX.md` (ruolo 1, commit `19bf228`): questo documento ne rispetta i contratti e dice esplicitamente dove li corregge (§15) |
| Livello dei token | `src/styles/tokens.css` (custom properties) · `src/styles/materials.css` (vetro) · `src/lib/theme.ts` (`TOKEN`, `LIT`, `BP`, `dataTone`) |
| Verifica | `src/styles/tokens.test.ts`: legge i due fogli **come testo** e ricalcola ogni rapporto di contrasto citato qui (134 test). Specimen renderizzato a 390px in Chrome headless, sia con SF Pro (`-apple-system`) sia con Inter forzato |
| Lingua | italiano; i nomi dei token sono in inglese, come nel piano |
| Landing | la landing `/presentazione` ha la sua parte in fondo: **[Parte L, «Controluce»](#parte-l-la-landing-presentazione-controluce)** (ottobre 2026). Estende questo sistema, non lo cambia |

Ogni valore in questo documento è un numero o un token. Se un componente ha bisogno di un valore che qui non c'è, il sistema va esteso qui (e nel test), non nel componente.

---

## Indice

- [Versione D: il redesign Liquid Glass](#versione-d-il-redesign-liquid-glass-ottobre-2026)
0. [In una frase](#0-in-una-frase)
1. [Estendere o spingere: la decisione](#1-estendere-o-spingere-la-decisione)
2. [Direzione estetica](#2-direzione-estetica)
3. [Tipografia](#3-tipografia)
4. [Colore](#4-colore)
5. [Spazio e layout](#5-spazio-e-layout)
6. [Raggi e grammatica delle forme](#6-raggi-e-grammatica-delle-forme)
7. [Elevazione e ombre](#7-elevazione-e-ombre)
8. [Bordi e superfici](#8-bordi-e-superfici)
9. [Materiali: il vetro](#9-materiali-il-vetro)
10. [Iconografia e immagini](#10-iconografia-e-immagini)
11. [Movimento](#11-movimento)
12. [Il livello dei token: come si usa](#12-il-livello-dei-token-come-si-usa)
13. [Migrazione dal linguaggio vecchio](#13-migrazione-dal-linguaggio-vecchio)
14. [Il test "admin Bootstrap"](#14-il-test-admin-bootstrap)
15. [Dove questo documento corregge UX.md e il piano](#15-dove-questo-documento-corregge-uxmd-e-il-piano)
16. [Seam per i ruoli successivi](#16-seam-per-i-ruoli-successivi)
- [Parte L. La landing `/presentazione`: «Controluce»](#parte-l-la-landing-presentazione-controluce)

---

## Versione D: il redesign Liquid Glass (ottobre 2026)

> Questa sezione **vince** su tutto il resto del documento dove i due non coincidono. Il resto resta il ragionamento di fondo (carta e vetro, numeri da tabellone, accessibilità), ma i valori sono cambiati: la fonte è sempre `src/styles/tokens.css`, verificato da `tokens.test.ts`.

Il redesign è stato disegnato in Claude Design (19 schermate a 390×844, «versione D») e riprodotto nell'app. Cosa cambia:

| | Prima | Versione D |
|---|---|---|
| Inchiostro | navy `#1B2A4A` | nero neutro `#1C1C1E` (17.01 sul bianco); secondario `#6B6B68`, etichette dei campi `#3A3A38` |
| Fondo | sabbia con il "sole basso" | `#F6F6F4` piatto |
| Card | carta col filo all'8% | carta bianca col filo pieno `#E2E2DE`, raggio 22, nessuna ombra |
| Font | SF Pro / Inter | **Geist** variabile, servito dall'app (`@fontsource-variable/geist`), anche nei PNG |
| Titoli | 34/700 | **mobile first**: 30/800 sul telefono, 34 da 600px, stretti (−0.03em); sezioni 17/700; etichette dei numeri **minuscole** (12–13) |
| Ritmo verticale | — | 28px di respiro sotto la safe-area prima del titolo delle schermate radice (`--page-top`), 10 prima dei pulsanti di vetro (`--bar-top`); 16 fra i blocchi (`--stack`), 24 prima di una sezione (`--section-gap`) |
| Arancio | `#FF6B35`, etichetta navy | `#FF6B1A` col filo `#E05A10`, etichetta d'inchiostro a 700; testo arancio `#C2410C` |
| Selezione | pillola navy | tab: pillola arancio al 12% col filo, testo arancio · segmented: pillola **bianca** su guida `#EDEDEA` · chip: inchiostro pieno |
| Navigazione | Home · Tornei · ＋ · Compagni · Profilo | capsula di vetro **Home · Tornei · Compagni · Diario** + ＋ arancio staccato; il Profilo si apre dall'avatar in Home; il Diario (l'ex Timeline) torna una tab |
| Barre in cima | NavBar che diventa vetro allo scroll | **pulsanti di vetro che galleggiano** (‹ indietro, capsula delle azioni, ×); il titolo compatto arriva in una capsula di vetro |
| Vetro | `glass-regular` .72, blur 24 | vetro **liquido** alla Apple, non un pannello col bordo: bianco appena .32, `blur(10px) saturate(180%) brightness(1.05)`, **nessun bordo vero** ma la luce sul bordo direzionale (forte in alto a sinistra, tenue in basso a destra), lo spessore (luce dentro in alto, ombra appena in basso) e un'ombra morbida perché galleggia; il vetro di **liquid-glass-react** (rdev) in tutta l'app tramite `LiquidGlass`: sfocatura piegata dal filtro SVG e aberrazione sul bordo su Blink, sfocatura e bordi di luce su WebKit/Gecko; la tab accesa è una **lente** di vetro che scorre, l'arancio sta solo su icona ed etichetta |
| Piazzamento | badge | **medaglia** (`Medal`): 1° arancio, podio col filo d'inchiostro, il resto grigia |
| Esito partita | anello arancio/grigio | V = cerchio d'inchiostro pieno; set vinto col filo d'inchiostro, perso col filo chiaro |
| Mascotte | — | **Pallo** (`src/components/Pallo.tsx`): consigli in Home, sbircia dal ＋, conduce l'assistente, tifa nella partita live e in Wrapped |
| Movimento | ENTRATA · SVELTO · MOLLA | in più la **SALITA** (`.rise`: 12px, 600ms, sfalsata di 50ms) e la **PRESSIONE** (`.press`: .97 con rimbalzo `cubic-bezier(.3,1.6,.5,1)`, 400ms) |

Il contrasto del testo resta sempre ≥ 4.5. Due scelte consapevoli del redesign, fissate come prove negative in `tokens.test.ts`: il **filo dei campi** è leggero (`#D6D6D1`, 1.46 sul bianco: il campo si riconosce dall'etichetta, dal fondo bianco e dal focus arancio + anello; con `prefers-contrast: more` diventa un filo vero da 5.35), e il vetro si misura sul **grigio di una foto in ombra** (`#8C8C8C`) invece che sul nero, perché sotto le barre di vetro passano solo carta, mappa e foto.

---

## 0. In una frase

**Carta asciutta, vetro bagnato.** Il contenuto è carta opaca posata sulla sabbia: piatta, senza ombre, definita da un filo. I controlli sono vetro che galleggia sopra e lascia intravedere quello che ci scorre sotto. Sopra a tutto stanno i numeri di un tabellone, in navy, e un solo oggetto arancio per schermata: il salvagente.

Il nome viene dal *bagnasciuga*, la striscia di spiaggia fra il bagnato e l'asciutto. Le due fisiche dell'interfaccia sono quelle due metà.

---

## 1. Estendere o spingere: la decisione

**Si spinge la superficie, si estende il DNA.**

Il linguaggio attuale (sabbia `#FAF8F5`, navy `#1B2A4A`, arancio `#FF6B35`, Space Grotesk + Nunito Sans, card piatte bordate a raggio 11–14, etichette maiuscole) ha un'identità vera, ma non regge quattro cose che il refactor chiede:
- **le risposte dell'utente**: font di sistema, neutri stile iOS, arancio come unico accento (Q3);
- **i materiali "Liquid Glass"**: con il bordo su ogni superficie e niente gerarchia di profondità, il vetro non avrebbe niente da cui staccarsi;
- **il contrasto al sole**, che il linguaggio vecchio fallisce per costruzione: il CTA bianco su arancio fa 2.84:1, `MUTED` al 55% fa 3.34–3.47, il rosa d'errore 3.25, il verde 2.57 (UX §8.5);
- **la leggibilità minima**: badge a 8px, etichette dei grafici a 8–9px.

Restarci dentro voleva dire limare i difetti uno per uno. Spingere permette di rifare la gerarchia.

Non si butta però il riconoscimento. Il logo resta. La landing `/presentazione` restava com'era (era fuori scope); da ottobre 2026 segue la versione D, con la sua Parte L in fondo a questo documento. Gli utenti alpha hanno già in mano navy, arancio e sabbia. Si tiene quindi tutto ciò che è *marchio* e *grammatica*, e si cambia ciò che è *finitura*.

| Si tiene (estensione) | Si cambia (spinta) |
|---|---|
| Il **navy `#1B2A4A` come "nero"** dell'interfaccia: è l'inchiostro, non un colore | Font: Space Grotesk + Nunito Sans → **SF Pro / Inter** (risposta 3) |
| L'**arancio `#FF6B35` come unico accento**: marchio, azione, dato | Card piatte bordate ovunque → **due fisiche**: carta opaca (contenuto) e vetro galleggiante (controlli) |
| La **pillola navy piena per la selezione**, che già hanno FilterChips e SegmentedControl, e che diventa la regola unica (§4.3) | CTA bianco su arancio (2.84 ✗) → **arancio con etichetta navy** (5.50 ✓) |
| L'**etichetta maiuscola sotto i numeri** (`.lbl`), unico maiuscolo dell'app | Testo secondario in alpha al 42–55% → **inchiostri pieni "da sole"** (`--ink-2` a 5.34–6.40) |
| L'**esito V/P a cerchio**, i set come pastiglie colorate, la griglia di statistiche a celle separate da un filo | Raggi 11–14 sparsi → **scala concentrica** 10 · 14 · 22 · 28 · capsula |
| Il vocabolario di movimento `ENTRATA` / `SVELTO` / `MOLLA` (`Motion.tsx`) | Badge 8–9px → minimo **11px** (badge 12px) |
| Il **marchio** `BrandMark` (pin arancio + palla sabbia + quadrato navy), invariato | Emoji come icone → **set SVG a tratto** (estensione di `NavIcons.tsx`) |
| Il **doppio bordo dei pin**, che è un requisito (`contrast.test.ts`) | Scrollbar nascoste ovunque → visibili su desktop |

---

## 2. Direzione estetica

### 2.1 Aggettivi (in ordine di priorità)

1. **A prova di sole.** Si legge in spiaggia alle 14, a braccio teso, con gli occhiali da sole. Ogni testo sta sopra 4.5:1 anche sul vetro nel caso peggiore, e il secondario è più scuro di quello di iOS.
2. **Tabellare.** I numeri sono il soggetto: allineati in colonna, pesanti, stretti. Un punteggio si legge come su un tabellone, non come in un paragrafo.
3. **Galleggiante.** La navigazione non è attaccata ai bordi. Su mobile è una capsula sospesa sopra il contenuto, su desktop un pannello staccato di 12px.
4. **Asciutto.** Il contenuto è opaco: niente ombre, niente gradienti, niente lucido. Lo definiscono il fondo e un filo a 8%.
5. **Preciso.** Passi di 4, raggi concentrici, tre curve di movimento. Niente valori "a occhio".
6. **Caldo, non carino.** Sabbia e arancio, ma senza mascotte, senza illustrazioni, senza emoji nell'interfaccia e senza punti esclamativi.

### 2.2 Riferimenti (cosa si prende da ognuno)

| Riferimento | Cosa si prende | Cosa **non** si prende |
|---|---|---|
| **Apple iOS 26, Liquid Glass** (WWDC 2025, "Meet Liquid Glass") | Il vetro solo sul livello di controllo, la tab bar a capsula flottante, i raggi concentrici, il large title che cede il posto a una barra di vetro | La lente che deforma i bordi (non si fa in CSS su Safari), i riflessi che seguono il giroscopio, il vetro colorato |
| **Apple Fitness / Attività**, il riepilogo | Numeri enormi e tabellari come soggetto della schermata, con l'etichetta piccola sotto | Gli anelli multicolore: qui c'è un colore solo |
| **Segnaletica dei bagni della Riviera romagnola** | I numeri di cabine e bagni dipinti in blu su bianco; il salvagente arancio appeso, unico oggetto saturo nel campo visivo | Le righe degli ombrelloni come decorazione: niente pattern |
| **Otl Aicher, Monaco 1972** | Pittogrammi a tratto costante su griglia; per i PNG, campiture piatte e una griglia da manifesto sportivo | La policromia dei manifesti |
| **Grafiche TV del Beach Pro Tour FIVB** | I punteggi per set in colonne strette, con il set vinto evidenziato | Il nero lucido da broadcast |
| **Things 3 · Promemoria di Apple** | Le liste raggruppate calme e la gerarchia fatta solo di tipografia | |

### 2.3 Anti-riferimenti (se ci somiglia, è sbagliato)

- **AdminLTE / Bootstrap dashboard**: griglie di card uguali con l'ombra, una testata grigia su ogni card, otto grafici in Home, il blu "primary".
- **Glassmorphism da Dribbble**: blur su ogni card, macchie arcobaleno sullo sfondo, testo bianco su vetro chiaro.
- **Material 2**: FAB tondo con ombra a 6dp, ripple, elevazioni su ogni superficie.
- **Gradienti SaaS** (viola-teal, arancio-rosa sui pulsanti): il pulsante `assistant` di oggi (`#FF6B35 → #FF9558`) esce.
- **Lo stato vuoto "icona in un cerchio pastello + testo grigio"**.

### 2.4 Le sei mosse firmate

Sono le cose che rendono quest'app riconoscibile con il logo coperto. Un componente che ne rompe una deve avere un motivo scritto.

1. **La selezione è navy.** Tab attiva, segmento attivo e chip attiva sono una pillola `--select` piena con contenuto bianco. Non c'è altro modo di dire "selezionato".
2. **Il CTA è un salvagente.** Il pulsante principale è arancio pieno (`--accent`) con l'etichetta navy (`--on-accent`). È uno per schermata, al massimo due quando una è il ＋ della tab bar.
3. **I numeri da tabellone.** Cifre tabellari a peso 700 con tracking −0.025/−0.04em e l'etichetta maiuscola sotto. Le celle di una griglia di statistiche sono separate da un filo, non da spazio: sembrano un tabellone segnapunti.
4. **Il sole basso.** Nell'app è un alone arancio pallido in alto a destra del fondo (`--bg-glow`), l'unico punto in cui l'arancio tinge l'ambiente. Nei PNG è un disco pieno tagliato dal bordo della tela.
5. **Lo zero da tabellone.** Gli stati vuoti di primo avvio non hanno illustrazioni: mostrano «0» in `--type-num-hero` con l'etichetta («Tornei»), poi il testo e il CTA.
6. **La navigazione galleggia.** La TabBar è una capsula staccata dal bordo. La Sidebar è un pannello staccato di 12px dai bordi della finestra, con lo stesso raggio degli sheet.

---

## 3. Tipografia

### 3.1 Famiglie

```css
--font-ui:     -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif;
--font-export: "Inter", Arial, sans-serif;
```

- **iPhone e Mac** (la persona primaria): SF Pro tramite `-apple-system`. Safari e Chrome passano da soli fra SF Text e SF Display secondo la misura.
- **Android e Windows**: Inter, caricato da Google Fonts (origine già in CSP). `system-ui` sta in coda e non in testa, perché su Windows vincerebbe su Inter.
- **Tela dei PNG**: solo Inter, che si può incorporare. Un font di sistema darebbe un recap diverso su iPhone e su Android (UX §11.5).

**Foglio Google Fonts** (`⟂ F1`, in `index.html`, con `crossorigin="anonymous"` come quello di oggi):

```
https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap
```

Il font è variabile, con gli assi peso e dimensione ottica (`opsz` 14–32: a 28px e oltre Inter passa da solo al taglio Display).
- Durante la migrazione convive con il foglio di Space Grotesk e Nunito.
- In F6 quel foglio si toglie, quando `grep -r "Space Grotesk\|Nunito" src` non trova più niente.

> **Trappola per l'export (`⟂ F4`).** Sui dispositivi Apple l'interfaccia usa SF e **non scarica mai Inter**: quando `html-to-image` parte, le facce di Inter non sono caricate e il PNG ripiega su Arial. Prima di `toPng` va chiamato `await Promise.all(['800 100px Inter', '700 100px Inter', '600 100px Inter'].map((f) => document.fonts.load(f)))`, dentro il timeout di 3s che già esiste (UX §6.5).

### 3.2 Scala

Le taglie sono in rem (1rem = 16px) e reggono lo zoom al 200%. Le interlinee sono quelle di iOS, tranne il Body (vedi §15, D8). Il tracking è in em: è un compromesso fra il `trak` interno di SF e le "dynamic metrics" di Inter, verificato a 390px con entrambi i font.

Uso: `font: var(--type-body); letter-spacing: var(--track-body);`.

| Token | Taglia / interlinea | Peso | Tracking | Uso |
|---|---|---|---|---|
| `--type-large-title` | 34 / 41 | 700 | −0.022em | l'`<h1>` di ogni schermata, nel flusso del contenuto |
| `--type-title-1` | 28 / 34 | 700 | −0.02em | titolo del dettaglio quando il large title non c'è (visori, form sheet su desktop) |
| `--type-title-2` | 22 / 28 | 700 | −0.017em | titolo di EmptyState ed ErrorState |
| `--type-title-3` | 20 / 25 | 600 | −0.014em | `<h2>` di sezione («Adesso», «Partite») |
| `--type-headline` | 17 / 22 | 600 | −0.012em | titolo delle card (`<h3>`), titolo compatto della NavBar, etichetta dei pulsanti |
| `--type-body` | 17 / 24 | 400 | −0.012em | testo di lettura, righe di ListGroup, valori dei campi |
| `--type-body-strong` | 17 / 24 | 600 | −0.012em | enfasi dentro il body |
| `--type-callout` | 16 / 21 | 400 | −0.01em | ricerca, testo dei toast |
| `--type-subhead` | 15 / 20 | 400 | −0.008em | sottotitoli, testo secondario delle card, voci delle chip; **minimo per il testo di lettura** |
| `--type-subhead-strong` | 15 / 20 | 600 | −0.008em | segmenti, chip, nomi nelle MatchRow |
| `--type-footnote` | 13 / 18 | 400 | −0.003em | `meta` delle card, etichette dei campi, note sotto i gruppi |
| `--type-caption-1` | 12 / 16 | 500 | 0 | didascalie delle foto, assi dei grafici; badge (a peso 600) |
| `--type-caption-2` | 11 / 13 | 600 | +0.01em | **minimo assoluto**: etichette della TabBar, contatori |
| `--type-eyebrow` | 12 / 16 | 600 | +0.06em, MAIUSCOLO | etichetta sotto un numero, intestazione di gruppo nei form |

**Numerali da tabellone**, sempre con `font-variant-numeric: tabular-nums`:

| Token | Taglia / interlinea | Peso | Tracking | Uso |
|---|---|---|---|---|
| `--type-num-hero` | 56 / 56 | 700 | −0.04em | lo «0» degli stati vuoti; il numero principale di Statistiche |
| `--type-num-xl` | 40 / 40 | 700 | −0.035em | Numeri chiave in Home (griglia 2×2) |
| `--type-num-l` | 28 / 30 | 700 | −0.025em | le 6 statistiche del dettaglio torneo, gli `StatTile` |
| `--type-num-m` | 20 / 24 | 600 | −0.015em | `StatFooter` delle card entità |
| `--type-num-s` | 15 / 20 | 600 | 0 | pastiglie dei set («21-17»), punteggi in riga |

### 3.3 Regole

1. **Due pesi per schermata, più i numerali.** Il testo usa 400 e 600, i titoli 700. Il peso 500 è solo per `caption-1`. L'800 non esiste nell'interfaccia: è riservato alla tela dei PNG.
2. **Il maiuscolo è solo `--type-eyebrow`.** I badge, i pulsanti e i titoli di sezione no.
3. **Niente corsivo.** In nessun punto.
4. **`text-wrap: balance`** su h1, h2 e h3. **`text-wrap: pretty`** sui paragrafi.
5. **Cifre tabellari** su punteggi, statistiche, date in colonna e contatori. Il testo corrente mantiene le cifre proporzionali.
6. **Mai sotto gli 11px**, nemmeno nei grafici SVG. Le etichette degli assi si scrivono in px CSS fuori dal `viewBox` scalato, oppure il `viewBox` si dimensiona perché 12 unità diventino ≥ 11px reali (UX §8.1).
7. **Input a 16px minimo su mobile** (anti-zoom di iOS): il campo usa `--type-body` (17), quindi la regola è già rispettata. Non scendere a `subhead` dentro un `<input>`.
8. **Un numero non si colora per decorazione.** Si colora `--data-win` solo se *è* una vittoria o un primo posto (win rate, «1°»).

---

## 4. Colore

### 4.1 Principio

L'interfaccia usa **un inchiostro** (navy), **due superfici** (sabbia e carta) e **un accento** (arancio). Tutto il resto è stato o dato. Ogni coppia testo/fondo è misurata con la formula di `contrast.test.ts` (WCAG 2.x, arrotondata a 2 decimali) e fissata in `tokens.test.ts`.

### 4.2 Ruoli semantici: tema chiaro (attivo)

| Token | Valore | su `--surface` | su `--bg` | su `--fill` | su `--bg-glow` | su `--accent-wash` | Ruolo |
|---|---|---|---|---|---|---|---|
| `--ink` | `#1B2A4A` | 14.22 | 12.61 | 11.85 | 12.14 | 12.07 | testo primario, icone attive |
| `--ink-2` | `#545F77` | 6.40 | 5.68 | 5.34 | 5.47 | 5.44 | testo secondario (l'unico altro livello di testo) |
| `--ink-3` | `#7A8396` | 3.81 | 3.38 | 3.17 | 3.25 | 3.23 | **non è testo**: icone inattive, chevron, bordo dei campi |
| `--ink-placeholder` | `#697288` | **4.81** su `--field` | | | | | solo dentro un campo |
| `--accent-text` | `#B2461A` | 5.55 | 4.92 | 4.63 | 4.74 | 4.71 | arancio come testo: link, pulsanti *plain* e *tinted*, badge |
| `--accent-strong` | `#DC4F17` | 4.06 | 3.60 | 3.38 | 3.47 | 3.45 | arancio come grafica che porta significato |
| `--accent-text-state` | `#9D3E17` | 6.70 | 5.94 | 5.58 | 5.72 | 5.69 | l'etichetta arancio in hover e premuto (vedi sotto, «Strato di stato») |
| `--danger` | `#C81F52` | 5.56 | 4.93 | 4.64 | 4.75 | 4.72 | azioni distruttive, errori |
| `--danger-state` | `#B01B48` | 6.78 | 6.01 | 5.65 | 5.79 | 5.76 | l'etichetta danger in hover e premuto |
| `--success` | `#11784A` | 5.51 | 4.89 | 4.59 | 4.71 | 4.68 | esito positivo (solo testo e icone) |
| `--focus-ring` / `--select` | `#1B2A4A` | 14.22 | 12.61 | 11.85 | | | anello di focus, pillola di selezione |

| Fondi e superfici | Valore | Note |
|---|---|---|
| `--bg` | `#F3F1ED` | sabbia asciutta, un tono sotto il vecchio `#FAF8F5`, così la carta si stacca: `--surface` su `--bg` = 1.13 |
| `--bg-top` | `#FAF6F0` | il fondo schiarisce verso l'alto. È il valore di `theme-color` e di `background_color`/`theme_color` nel manifest |
| `--bg-glow` | `#FFE9DB` | il "sole basso": `radial-gradient(90% 420px at 100% 0%, …)` |
| `--bg-canvas` | gradiente composto | `background-image` del `body`, `background-repeat: no-repeat`, **non** `fixed` (su iOS non funziona) |
| `--surface` | `#FFFFFF` | carta: card, gruppi, dialoghi opachi, toast |
| `--surface-pressed` | `#F6F4F0` | riga o card premuta, hover delle righe |
| `--fill` | `#EDEAE5` | incassato: guida del segmented, chip e badge neutri, set perso, binari, skeleton |
| `--field` / `--field-border` | `#FFFFFF` / `#7A8396` | campo bianco, bordo a 3.81:1 (WCAG 1.4.11) |
| `--accent-wash` / `--accent-edge` | `#FFE8DC` / `rgb(220 79 23 / .22)` | fondo tinto. Sul `--bg` fa 1.04: il bordo gli dà la forma |
| `--danger-wash` · `--success-wash` | `#FDE8EE` · `#E4F4EC` | fondi dei badge di stato (danger sopra 4.76, success 4.84) |
| `--scrim` | `rgb(14 22 38 / .36)` | velo sotto sheet e dialoghi, **senza blur** |
| `--viewer-bg` | `#0B111D` | fondo di Wrapped, Storia e lightbox |
| `--surface-brand` | `#16233F` | il navy del marchio come superficie: pannello del Login (bianco sopra 15.6); è il fondo della palette `navy` dei PNG |

| Coppie su riempimento | Rapporto |
|---|---|
| `--on-accent` `#16233F` su `--accent` `#FF6B35` | **5.50** (il bianco lì fa 2.84 ✗) |
| `--on-select` `#FFFFFF` su `--select` | 14.22 |
| `--on-danger` `#FFFFFF` su `--danger` | 5.56 |

### 4.3 Le regole del colore

1. **Arancio = azione, marchio e dato.** Mai selezione, mai decorazione della chrome.
   - Nella NavBar e nella TabBar l'unico oggetto arancio è il ＋.
   - Il `#FF6B35` puro non porta mai testo e non disegna mai una linea su fondo chiaro: per quella c'è `--accent-strong`.
2. **Selezionato = navy pieno, contenuto bianco**, e in più un cambio di forma. Nella TabBar l'icona passa dal contorno al pieno (§10.1), così lo stato non si legge dal solo colore (WCAG 1.4.1).
3. **Due livelli di testo, non tre.** Testo primario `--ink` e secondario `--ink-2`. `--ink-3` è per le icone e i bordi. Un "terziario" grigio chiaro alla iOS qui non esiste, perché al sole sparisce.
4. **Il bianco scrive solo su**: `--select` (navy), `--surface-brand`, `--danger`, `--viewer-bg` e il vetro scuro. **Mai sull'arancio.**
5. **Niente giallo, niente "warning".** Un'avvertenza (connessione lenta, offline) usa l'inchiostro e un'icona. Un secondo colore caldo competerebbe con l'accento.
6. **Sul vetro si scrive solo con l'inchiostro** (§9.2). Accento, danger e success come *testo* vivono solo su superfici opache.
7. **L'etichetta colore del torneo è contenuto dell'utente**, non palette (`SWATCH_COLORS`: `#FF6B35 #00B4D8 #FFD23F #FF477E #1B2A4A`).
   - Compare solo come pallino da 10px accanto al nome, oppure come riquadro di una foto mancante.
   - Nel selettore (radiogroup, UX §5 F2), il campione ha un filo interno `inset 0 0 0 1px rgb(27 42 74 / .16)`, perché il giallo sul bianco fa 1.44.
   - Il selezionato ha l'anello `--focus-ring` a 2px con offset 2px e una spunta: `--ink` su tutti i campioni (≥ 4.37), bianca sul navy.

### 4.4 Il testo sul vetro (fondo peggiore)

Il vetro si compone sul **nero** per quello chiaro e sul **bianco** per quello scuro, che è il fondo peggiore in ciascun caso (UX §8.5). Poi si misura l'inchiostro sopra.

| Materiale | Composto (caso peggiore) | `--on-glass` | `--on-glass-2` (ink .85) | `--on-glass-3` (ink .72) | `--ink-2` pieno | `--accent-text` | `--danger` |
|---|---|---|---|---|---|---|---|
| `glass-thin` .48 | `#7A7978` | 3.29 (solo icone) | 2.79 ✗ | 2.39 ✗ | 1.48 ✗ | 1.28 ✗ | 1.29 ✗ |
| `glass-regular` .72 | `#B8B6B4` | **7.04** | **5.20** | 3.92 (icone) | 3.17 ✗ | 2.75 ✗ | 2.75 ✗ |
| `glass-thick` .86 | `#DBDAD7` | **10.15** | **6.91** | **4.85** | 4.57 | 3.96 ✗ | 3.97 ✗ |
| `glass-dark` .66 (su bianco) | `#5E626A` | bianco **6.13** | bianco .85: **4.97** | bianco .72: 4.09 (icone) | | | |

Ne seguono le regole del materiale (sono requisiti):
- **Il thin non porta testo.**
- **`[data-material^="glass"]` ridefinisce `--ink-2` e `--ink-3`** nelle versioni in alpha (`materials.css`). Un componente che usa `--ink-2` è già corretto dentro uno sheet, senza saperlo.
- **Accento e danger come testo non vanno mai sul vetro.**
  - Una voce distruttiva dentro uno sheet ("Elimina torneo") sta in una **riga opaca** (`--surface`) oppure è un pulsante **pieno** `--danger`.
  - Un pulsante "Annulla" su vetro è `--ink`, non arancio.

### 4.5 I colori dei dati

I file lib condivisi col mobile (`derive.ts`, `stats.ts`) restituiscono **letterali della palette vecchia**: `dotForRank`, `esitoStyle`, `setChips` e il `color` delle barre dei piazzamenti. Non si toccano. L'interfaccia li tratta come **segnali** e li ridipinge:

```ts
import { TOKEN, DATA_TONE, dataTone } from '../lib/theme'
const colore = TOKEN[DATA_TONE[dataTone(item.color)]]   // 'var(--data-win)' …
```

| Tono (`dataTone`) | Letterali lib riconosciuti | Grafica (linee, barre, anelli) | Pallino decorativo accanto al testo | Testo |
|---|---|---|---|---|
| `win` | `#FF6B35` · `#C4501E` · `#FFF1EA` | `--data-win` `#DC4F17` (4.06) | il letterale lib, invariato | `--accent-text` |
| `podium` | `#F7A883` | `--data-podium` `#B87048` (3.85) | il letterale lib, invariato | `--ink` |
| `rest` | tutto il resto (`rgba(27,42,74,.25)`, `.4`, `#F2F0EC`…) | `--data-rest` `#7A8396` (3.81) | il letterale lib, invariato | `--ink-2` |

- Griglia dei grafici `--data-grid` (navy al 8%); binari `--data-track` (`#EDEAE5`).
- **Un solo colore di serie** in ogni grafico: `--data-win` è il dato, `--data-rest` il confronto. Un grafico che ha bisogno di tre colori sta dicendo troppo.
- **I pin della mappa non cambiano**: restano i letterali di `dotForRank` con il doppio bordo bianco + navy, fissato da `contrast.test.ts`.
- **Pastiglie dei set**: vinto = `--accent-wash` + `--accent-text` (4.71); perso = `--fill` + `--ink-2` (5.34). Il vecchio `#C4501E` su `#FFF1EA` (4.21 ✗, UX #3) sparisce.
- **Esito V/P**: cerchio da 28px con bordo di 2px.
  - V: bordo `--data-win`, lettera `--accent-text`.
  - P: bordo `--ink-3`, lettera `--ink-2`.
  - In entrambi i casi il testo nascosto «Vinta»/«Persa» (UX §7.6).

### 4.6 Tema scuro: predisposto, non attivo

Risposta 2: niente dark mode in questo giro. I valori esistono in `:root[data-theme="dark"]` e sono verificati da `tokens.test.ts`, ma **nessuno li accende**: non c'è `prefers-color-scheme` nel CSS e il test fallisce se qualcuno lo aggiunge.

| Token | Scuro | su `--surface` `#172238` | su `--bg` `#0E1626` | su `--fill` `#212D45` |
|---|---|---|---|---|
| `--ink` | `#F4F2EE` | 14.20 | 16.17 | 12.31 |
| `--ink-2` | `#AEB5C3` | 7.71 | 8.78 | 6.68 |
| `--ink-3` | `#7F889B` | 4.46 | 5.08 | 3.86 |
| `--accent-text` | `#FF9466` | 7.32 | 8.33 | 6.34 |
| `--accent-strong` / `--data-win` | `#FF7A47` | 6.15 | 7.00 | 5.33 |
| `--danger` | `#FF6B8E` | 5.86 | 6.67 | 5.08 |
| `--success` | `#3FCF8E` | 7.96 | 9.06 | 6.90 |
| `--select` / `--on-select` | `#F4F2EE` / `#0E1626` | 16.17 fra loro | | |
| vetro regular .72 sul **bianco** | `rgb(23 34 56 / .72)` | `--on-glass` 5.66 · `-2` 4.62 · `-3` 3.83 | | |

L'arancio del marchio resta `#FF6B35` anche al buio, con `--on-accent` navy (5.50). Il "sole basso" diventa un riverbero brace (`#2B1C18`).

### 4.7 Palette dei PNG esportati (Storia e Wrapped, `⟂ F4`)

Letterali e **opachi** (anche le linee), in `src/components/wrapped/palette.ts`, che diventa l'unica fonte: la copia dentro `StoryModal.tsx:9-13` sparisce (UX §11.4). L'ordine di rotazione delle slide resta navy → orange → sand.

| Palette | `bg` | `fg` | `accent` | `muted` | `line` | `disc` (sole) |
|---|---|---|---|---|---|---|
| `navy` | `#16233F` | `#FAF8F5` · 14.71 | `#FF6B35` · 5.50 | `#A9B1C2` · 7.25 | `#3F4960` | `#22325A` (fg 11.85 · accent 4.43 · muted 5.83) |
| `sand` | `#F6F1E8` | `#1B2A4A` · 12.64 | `#B2461A` · 4.93 | `#545F77` · 5.69 | `#D7D5D2` | `#FFE4D5` (fg 11.72 · accent 4.57 · muted 5.28) |
| `orange` | `#FF6B35` | `#16233F` · 5.50 | `#16233F` · 5.50 | `#3A2A26` · 4.81 | `#C75A37` | `#FF8657` (fg 6.54 · accent 6.54 · muted 5.72) |

La palette arancio di oggi scrive bianco su `#FF6B35` (2.84 ✗). Qui è monocroma navy su arancio, e la gerarchia la fanno peso e taglia.

---

## 5. Spazio e layout

### 5.1 Scala (passi di 4)

| Token | `--space-0-5` | `-1` | `-2` | `-3` | `-4` | `-5` | `-6` | `-8` | `-10` | `-12` | `-16` | `-20` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| px | 2 | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 | 80 |

Un valore fuori scala (14, 18, 22) è il sintomo di un altro errore: di solito un'interlinea sbagliata o un bordo contato due volte.

### 5.2 Ritmo

| Dove | Valore |
|---|---|
| Margine laterale della pagina (`--gutter`) | 16 (< 600) · 24 (600–899) · 32 (≥ 900) |
| Sopra il large title | `--safe-top` + 8; large title → sottotitolo: 2; sottotitolo → primo contenuto: 16 |
| Fra sezioni (`<h2>` → `<h2>`) | 32 |
| Titolo di sezione → contenuto | 12 |
| Card impilate | 12 · griglie di card: gap 12 (< 600), 16 (≥ 600) |
| Padding delle card | 16 (< 600) · 20 (≥ 600) |
| Righe di ListGroup | altezza minima 44 (una riga) / 56 (con sottotitolo); padding 12 verticale, 16 orizzontale; separatore rientrato di 16 da sinistra (o fino al testo, se la riga ha un'icona) |
| Campi di un form | etichetta → campo: 6; campo → campo: 16; gruppo → gruppo: 24 |
| Chip in riga | gap 8; `--focus-reach` (4px) di margine per l'anello di focus, che sono anche i 4px che portano il bersaglio a 44 |
| Griglia foto | gap 4 (come Foto di Apple), celle `minmax(100px, 1fr)` |
| Griglia di statistiche | celle separate da **1px di `--edge`** (il "tabellone"), padding delle celle 16 |
| Fondo pagina su mobile | `padding-bottom: var(--tabbar-clearance)` = 64 + `max(12px, safe-area)` + 16 |
| Fondo pagina su desktop | 48 |
| Distanza fra un bersaglio distruttivo e uno no | ≥ 8 (UX §8.6) |

### 5.3 Costanti di layout

| Token | Valore | Note |
|---|---|---|
| `--content-max` | 1120px | colonna del contenuto su desktop (come oggi) |
| `--reading-max` | 720px | Profilo, Segnala, form, assistente |
| `--timeline-max` | 840px | Tornei · Timeline (UX §9.2) |
| `--sheet-max` | 560px | form sheet centrato da 600 in su |
| `--segmented-max` | 420px | |
| `--sidebar-w` / `--sidebar-inset` | 240px / 12px | la Sidebar galleggia a 12px dai bordi della finestra |
| `--touch` | 44px | bersaglio minimo, sempre |
| `--control-sm` / `-md` / `-lg` | 32 / 44 / 52 px | `sm` solo con area cliccabile estesa a 44 |
| `--navbar-h` | 52px | barra compatta, più `--safe-top` |
| `--tabbar-h` / `--tabbar-side` / `--tabbar-max` | 64 / 16 / 480 px | da 600 la capsula si centra, larga al massimo 480; sotto i 360 il margine scende a 8 (a 320 «Compagni» non ci stava) |
| `--tabbar-bottom` | `max(12px, env(safe-area-inset-bottom))` | |
| Breakpoint (`BP` in `theme.ts`) | 360 · 600 · 900 · 1280 | UX §9.1; il 900 è `useIsWide` e non si sposta |
| `--badge-h` · `--segment-h` · `--search-h` | 20 · 36 (44 − 2×4) · 40 px | badge, segmenti e chip, ricerca (§8) |
| `--esito-size` · `--plus-size` | 28 · 56 (64 − 2×4) px | cerchio V/P, ＋ della TabBar |
| `--switch-w` / `--switch-h` · `--handle-w` / `--handle-h` | 51 / 31 · 36 / 5 px | interruttore, maniglia dello sheet |
| `--swatch-ring` · `--photo-ring` | filo interno navy al 16% · al 6% | campioni colore (§4.3.7), foto (§10.3) |
| `--mappa-h` · `--venue-map-h` · `--dock-max` | 380 · 200 · 720 px | riquadro Mappa (UX C3), VenueMap, colonna dell'assistente |
| `--card-min` · `--card-min-narrow` · `--chart-min` · `--stat-min` · `--photo-min` | 300 · 250 · 280 · 110 · 100 px | il minimo delle colonne delle griglie (UX §9.2) |
| `--timeline-date` · `--empty-max` · `--dialog-w` · `--popover-w` | 64 (78 da 600) · 320 · 320 · 300 px | colonna della data in Timeline, stato vuoto, ConfirmDialog centrato, popover |
| `--state-hover` · `--state-press` | .08 · .12 | opacità dello strato di stato `currentColor` di pulsanti e chip (MOTION.md §4.3) |
| `--state-hover-soft` · `--state-press-soft` | .06 · .10 | lo stesso strato, tinto `--ink`, sopra vetro o `--fill` (voci di menu, righe della Mappa) |

---

## 6. Raggi e grammatica delle forme

### 6.1 Scala

| Token | px | Chi lo usa |
|---|---|---|
| `--radius-xs` | 6 | miniature dentro una riga (foto in MatchRow, campioni piccoli) |
| `--radius-chip` | 10 | pillola del segmented, pastiglie dei set |
| `--radius-control` | 14 | campi di testo, Select, guida del segmented, foto in griglia, banner compatti |
| `--radius-card` | 22 | card, ListGroup, riquadro mappa (Mappa e VenueMap), skeleton delle card |
| `--radius-sheet` | 28 | sheet (angoli alti su mobile, tutti e quattro da 600), action sheet, popover, Sidebar flottante |
| `--radius-capsule` | 999 | pulsanti (tutte le misure), chip filtro, badge, toast, ricerca, TabBar e la sua pillola attiva |
| cerchio | 50% | avatar, esito V/P, IconButton, ＋ della TabBar (56px) |

### 6.2 Concentricità

Dentro un contenitore con inset ≤ 10px: **raggio interno = raggio esterno − inset**. Esempi:
- guida del segmented 14, inset 4 → pillola 10;
- TabBar alta 64, a capsula (32), inset 4 → pillola e ＋ alti 56, raggio 28.

Oltre i 10px di inset ogni elemento usa il raggio del suo ruolo. Un pulsante dentro una card con padding 16 è una capsula, non un rettangolo da 6.

### 6.3 Grammatica

**Capsula = si preme. Rettangolo arrotondato = contiene. Cerchio = identità o risultato.**

Ne seguono tre regole:
- un campo di testo non è mai una capsula, **tranne la ricerca**, che è un controllo di navigazione e non un dato;
- una card non è mai una capsula;
- un pulsante non è mai un rettangolo.

Le FilterChips sono capsule e la guida del segmented è un rettangolo da 14 (§15, D3): è la forma a dire «questo filtra, quello cambia vista».

---

## 7. Elevazione e ombre

**Il contenuto non ha ombre.** Le ombre appartengono a ciò che galleggia, e sono tinte di navy (`rgb(14 22 38 / …)`), mai nere.

| Livello | Token | Valore | Chi |
|---|---|---|---|
| 0, carta | `--elev-none` | nessuna | card, liste, banner, grafici, mappe, foto, StatGrid |
| 1, galleggia | `--elev-float` | `0 10px 28px -8px rgb(14 22 38 / .22), 0 2px 6px -2px rgb(14 22 38 / .10)` | TabBar, Sidebar flottante, ＋, pulsanti di vetro sopra la mappa |
| 2, sopra | `--elev-overlay` | `0 -10px 40px -12px rgb(14 22 38 / .30), 0 2px 8px -4px rgb(14 22 38 / .12)` | sheet dal basso, action sheet, popover |
| 3, interrompe | `--elev-dialog` | `0 24px 64px -16px rgb(14 22 38 / .38), 0 0 0 .5px rgb(27 42 74 / .10)` | form sheet centrato, ConfirmDialog |
| toast | `--elev-toast` | `0 12px 32px -12px rgb(14 22 38 / .32), 0 0 0 .5px rgb(27 42 74 / .08)` | Toast |

- La **NavBar** è attaccata al bordo alto: non ha ombra. Dopo lo scroll prende un filo inferiore (`0 var(--hairline) 0 var(--separator)`).
- Il vetro aggiunge sempre `--glass-rim` (riflesso alto più filo interno) e `--glass-edge` (filo esterno navy al 12%). L'ombra del livello passa da `--material-elev` (§9.3).

**Livelli (z-index)**: `--z-content` 0 · `--z-sticky` 10 · `--z-navbar` 20 · `--z-tabbar` 30 · `--z-scrim` 40 · `--z-sheet` 50 · `--z-viewer` 55 · `--z-dialog` 60 · `--z-toast` 80 · `--z-consent` 90 · `--z-skip-link` 100.
- Il toast sta sopra sheet e visori e sotto il consenso (UX §7.8).
- Il dialogo sta sopra il visore, perché un'eliminazione chiesta da lì deve coprirlo.

---

## 8. Bordi e superfici

| Elemento | Trattamento |
|---|---|
| **Card di contenuto** | `--surface`, `1px solid var(--edge)` (navy all'8%), `--radius-card`, nessuna ombra. Hover (solo `@media (hover: hover)`): il bordo passa a `--edge-strong`, **la card non si sposta** (il `.lift` con `translateY(-2px)` esce). Premuta: `--surface-pressed`. |
| **ListGroup** (stile "inset grouped" di iOS) | Come la card. Righe separate da `var(--hairline) solid var(--separator)`, rientrato di 16. Chevron `--ink-3` 20px. Il valore a destra è `--ink-2`. Una riga distruttiva è testo `--danger`, senza icona rossa. |
| **Filo** (`--hairline`) | 1px, 0.5px sugli schermi ≥ 2x. Solo per i separatori di riga e il filo della NavBar: i bordi delle card restano a 1px, perché a 0.5px e all'8% spariscono. |
| **Campo di testo / Select** | `--field` bianco, `1px solid var(--field-border)` (3.81:1), `--radius-control`, alto 44, padding 12. Placeholder `--ink-placeholder`. **Focus: il bordo resta** e si aggiunge l'anello. **Errore**: il bordo passa a `--danger`, sotto c'è il messaggio `--type-footnote` `--danger` con un'icona; `aria-invalid`. |
| **Ricerca** | Capsula alta 40, `--field`, bordo `--field-border`, lente `--ink-3` 20px a sinistra, ✕ in un bersaglio da 44. |
| **Segmented** | Guida `--fill`, `--radius-control`, padding 4. Segmenti alti 36, `--type-subhead-strong`, `--ink-2`. Attivo: pillola `--select` (raggio 10) + `--on-select`. **Opaco** (§15, D1). |
| **FilterChips** | Capsula alta 36, padding 0 16, `--surface` + `1px solid var(--separator)`, `--type-subhead-strong` `--ink`. Attiva: `--select` pieno, bordo trasparente (lo spazio resta, niente salto di 1px). |
| **Badge** | Capsula alta 20, padding 0 8, `600 .75rem/1rem` (12px). Toni: neutro `--fill` + `--ink-2` (5.34) · accento `--accent-wash` + `--accent-text` (4.71) · selezione `--select` + bianco · success e danger sui loro *wash*. Il badge «1°» ha l'icona trofeo da 12px. **Nessun default "Premium"** (UX C11). |
| **Banner alpha** | `--accent-wash` + `1px solid var(--accent-edge)`, `--radius-card`, padding 12/16. Testo `--type-subhead` `--ink`, link `--accent-text` 600, ✕ in un bersaglio da 44. |
| **Card Beach Wrapped** (Home) | **L'unica card scura del contenuto**: è l'anteprima del PNG. `#16233F` pieno (niente gradiente), il disco del sole `#22325A` tagliato in alto a destra, titolo bianco (15.6), numeri `#FF6B35` (5.50), secondario `#A9B1C2` (7.25). Nessuna ombra. |
| **StatGrid** | Un contenitore con raggio da card e `overflow: hidden`, celle `--surface` separate da 1px di `--edge` (`gap: 1px` su fondo `--edge`, come oggi). Numero `--type-num-l`, eyebrow sotto. |
| **MatchRow** | Riga di ListGroup. A sinistra il cerchio V/P (`flex: none`, non si deforma), al centro nome (`--type-subhead-strong`) e dettaglio (`--type-footnote` `--ink-2`), a destra le pastiglie dei set. Sotto i 360px le pastiglie **vanno a capo** su una seconda riga allineata a destra, invece di schiacciare il nome. Le pastiglie hanno `white-space: nowrap`. |
| **Skeleton** | Forme `--fill` con il raggio dell'elemento che sostituiscono, altezze esatte del contenuto in arrivo. Pulsazione d'opacità (§11), mai lo shimmer. |
| **EmptyState** | Centrato, larghezza massima 320. Variante *primo avvio*: «0» in `--type-num-hero` `--ink` (`aria-hidden`), eyebrow sotto («Tornei»), titolo `--type-title-2`, testo `--type-subhead` `--ink-2`, un CTA *filled* e un link secondario. Variante *filtrato/errore*: icona 24px `--ink-3` senza cerchio dietro, poi titolo, testo e CTA *tinted*. |
| **Toast** | Capsula `--surface` opaca, `--elev-toast`, alto 44, padding 0 16, `--type-subhead-strong`. Icona 20 colorata per tipo (`--success`, `--danger`, `--ink` per offline). ✕ in un bersaglio da 44. |
| **ConfirmDialog** | **Opaco** (`--surface`), `--radius-sheet`, `--elev-dialog`. Su mobile ha la forma di un action sheet, da 600 di un dialogo centrato largo 320. |

**Pulsanti** (tutti capsule; testo `--type-headline`; icona 20 a sinistra con gap 8; altezze sm 32, md 44, lg 52; padding orizzontale 12 / 20 / 24):

| Variante | Fondo | Etichetta | Contrasto | Quando |
|---|---|---|---|---|
| `filled` | `--accent` | `--on-accent` | 5.50 | l'azione principale della schermata o dello sheet; una sola |
| `tinted` | `--accent-wash` | `--accent-text` | 4.71 | azione secondaria importante («＋ Aggiungi foto», CTA dello stato vuoto filtrato) |
| `glass` | `glass-regular` | `--on-glass` | 7.04 | sopra foto, mappe e visori |
| `plain` | nessuno | `--accent-text` (`--ink` sul vetro) | 5.55 | azioni terziarie, link in linea |
| `destructive` | `--danger` (pieno) oppure nessuno | `--on-danger` / `--danger` | 5.56 | conferma in un ConfirmDialog (pieno); riga in un gruppo (testo) |
| navy (`data-variant="select"`) | `--select` | `--on-select` | 14.22 | solo come stato premuto di un toggle, mai come CTA |

- **Disabilitato**: fondo `--fill`, etichetta `--ink-disabled`, `aria-disabled`. Niente `opacity` sull'intero pulsante: sul vetro l'opacità mostra quello che c'è sotto. Vale anche per `IconButton` (lo fa la primitiva). Il tocco su un disattivato dice perché (`onDisabledClick`: porta al campo che manca).
- **Strato di stato** (polish): lo strato è `currentColor` a .08/.12 *sotto* l'etichetta, quindi scurisce il fondo verso il testo. Con `--accent-text` il premuto scendeva a 4.01 sul wash e 4.17 sul fondo; con `--danger` a 4.09. In hover e premuto le varianti `tinted`, `plain` e `destructive-plain` passano a `--accent-text-state` / `--danger-state` (premuto ≥ 4.66 su ogni fondo). Il test che lo ricalcola è in `tokens.test.ts`.
- **Occupato**: l'etichetta cambia («Creo…»), `aria-busy`, larghezza bloccata con `min-width` alla misura di riposo, così il pulsante non si restringe.

**Focus** (`⟂ F1`, in `base.css`):

```css
:focus-visible { outline: var(--focus-width) solid var(--focus-ring); outline-offset: var(--focus-offset); }
```

- Navy su tutto il chiaro: 12.61 sul `--bg`, 7.04 sul vetro nel caso peggiore. Bianco dentro `[data-surface="dark"]` e `glass-dark` (lo fa `materials.css`).
- **Mai** `outline: none` senza un sostituto. Gli input tengono l'anello **e** il bordo.
- **`--focus-reach`** (= larghezza + offset, 4px): lo spazio che un contenitore con `overflow` lascia all'anello (`padding: var(--focus-reach); margin: calc(-1 * var(--focus-reach))`). Con 2px l'anello usciva mozzato (chip, «Altri dettagli», righe set).
- Nei gruppi di righe la prima e l'ultima riga prendono il raggio del gruppo, così l'anello (che segue il raggio) non viene tagliato dagli angoli.
- Chi scorre lascia libere le barre: `scroll-padding` sotto la NavBar compatta e sopra la TabBar (`AppShell.css`), così l'elemento a fuoco non finisce mai coperto (WCAG 2.4.11).

**Scrollbar** (`⟂ F1`): su `(hover: hover) and (pointer: fine)` sono visibili e sottili (`scrollbar-width: thin; scrollbar-color: var(--ink-3) transparent`). Si nascondono solo le righe che scorrono in orizzontale (chip), e solo su touch.

---

## 9. Materiali: il vetro

### 9.1 Il principio: il vetro si guadagna

Il vetro va **solo dove qualcosa ci scorre sotto**. Una sfocatura sopra un fondo fermo costa quanto le altre e non si vede. Per questo la Sidebar, che su desktop non ha niente sotto di sé, usa `frost`: la stessa tinta opaca con il riflesso, senza `backdrop-filter`.

Massimo **3 superfici sfocate** contemporaneamente (UX §10).

### 9.2 I materiali

| `data-material` | Tinta | Sfocatura | Testo | Chi |
|---|---|---|---|---|
| `glass-thin` | `rgb(255 253 250 / .48)` | `blur(16px) saturate(180%)` | **nessuno**: solo icone `--on-glass` (3.29) | pulsanti icona sopra la mappa |
| `glass-regular` | `rgb(255 253 250 / .72)` | `blur(24px) saturate(180%)` | `--on-glass`, `--on-glass-2` | TabBar; NavBar **dopo** lo scroll |
| `glass-thick` | `rgb(255 253 250 / .86)` | `blur(30px) saturate(180%)` | `--on-glass`, `-2`, `-3` | sheet e form sheet, action sheet del ＋, popover desktop |
| `glass-dark` | `rgb(11 17 29 / .66)` | `blur(24px) saturate(160%)` | `--on-glass-dark`, `-2` | toolbar della lightbox |
| `glass-media` | `rgb(255 255 255 / .12)` | `blur(12px) saturate(170%)` | il primo piano della superficie sotto (6.66 sull'arancio, 11.84 sull'inchiostro, 13.64 sul visore) | il «clear» di Apple sopra foto e colori pieni: × e azioni di Wrapped, ×, scelte e «Condividi» della Storia. Niente riflesso a gradiente, solo la luce sul bordo |
| `frost` | `#FFFDFA` opaco | nessuna | `--on-glass` | Sidebar flottante |

La tinta è sabbia-bianca (`255 253 250`) e non bianco puro, perché il vetro è "al sole". Il fallback opaco è la stessa tinta ad alpha 1 (`--glass-solid` `#FFFDFA`), quindi passando a opaco il colore non salta.

**Il "liquido"**, ovvero cosa rende vetro una superficie che non è solo bianca e sfocata:
- `--glass-sheen`: un gradiente bianco dal 38% a 0 sulla metà alta, un riflesso fermo;
- `--glass-rim`: un filo bianco al 70% sul bordo alto, più un filo interno al 50%;
- `--glass-edge`: un filo esterno navy al 12%, che stacca il vetro da una card bianca.

Niente lente che deforma, niente riflessi che si muovono: in CSS su Safari non si fanno bene, e un effetto fatto a metà è peggio di niente.

### 9.3 Come si applica

```html
<nav data-material="glass-regular" style="--material-elev: var(--elev-float)">…</nav>
```

- Il componente dichiara il materiale e, se galleggia, la sua elevazione. **Non scrive mai `backdrop-filter`**: sfocatura, fallback e ridefinizione degli inchiostri vengono da `materials.css`.
- Il foglio sta nel livello `utilities`, così il CSS di un componente non può sovrascrivere per sbaglio il fondo che regge il contrasto.

**La NavBar che diventa vetro**:
- il vetro è un livello (`::before` o un figlio) con `data-material="glass-regular"` sempre presente e `opacity: 0`;
- quando la sentinella del large title esce dalla vista, l'opacità va a 1 in `--dur-svelto`;
- **si anima l'opacità, mai il raggio di sfocatura** (UX §8.7).

### 9.4 Fallback (in `tokens.css` e `materials.css`)

| Condizione | Effetto |
|---|---|
| `@supports not (backdrop-filter …)` | tinte opache (`--glass-solid`), niente riflesso |
| `prefers-reduced-transparency: reduce` | tinte opache, `backdrop-filter: none`, niente riflesso |
| `prefers-contrast: more` | come sopra, più `--ink-2` `#3F4A62` (8.87), `--ink-3` `#5A647A`, separatori al 32%, bordi delle card al 30%, filo del vetro a 1px al 40%, velo al 50% |
| `forced-colors: active` | `Canvas`/`CanvasText`, niente ombre, un bordo vero di 1px |

> **Perché le sfocature sono letterali in `materials.css`.** `-webkit-backdrop-filter` con un `var()` dentro è il punto più fragile del vetro su Safari, ed è proprio Safari il browser della persona primaria. I raggi (16/24/30) sono quindi scritti a mano, e `tokens.test.ts` verifica che coincidano con `--blur-*`. Da provare comunque a mano su iOS 17 e 18 (`⟂ QA`, UX §14.3).

---

## 10. Iconografia e immagini

### 10.1 Il set di icone (estensione di `NavIcons.tsx`, `⟂ F2`)

**Griglia e tratto.**
- `viewBox` 24, area viva 20 (2 di margine), terminali e giunti arrotondati, raggio degli angoli 2–3 unità.
- Il colore è sempre `currentColor`.
- Nessuna icona multicolore, nessun duotone, nessun font di icone.

| Misura | Token | Tratto (unità viewBox) | Resa | Dove |
|---|---|---|---|---|
| 12 | `--icon-12` | 2.5 | 1.25px | solo nei badge (trofeo del «1°») |
| 16 | `--icon-16` | 2.1 | 1.40px | in linea nel `meta` (luogo, data) |
| 20 | `--icon-20` | 1.9 | 1.58px | pulsanti, righe, toast, ricerca |
| 24 | `--icon-24` | 1.75 | 1.75px | TabBar, NavBar, stati vuoti |

**Varianti piene.** Ogni icona di tab ha una variante `fill`: la sagoma è piena di `currentColor` e i dettagli interni sono ritagliati. La tab attiva usa la piena (bianca sulla pillola navy), le inattive il contorno in `--ink-3`.

**Colore.**
- Inattiva: `--ink-3` (≥ 3:1).
- Attiva: `--ink` oppure `--on-select`.
- Il ＋: `--on-accent` su `--accent`.
- Dato: `--accent-text` (il trofeo nel badge).
- L'arancio non colora nessun'altra icona.

**Inventario** (sostituisce le emoji usate come icone, UX §12):

| Icona | Sostituisce / nuova | Dove |
|---|---|---|
| `plus` | ＋ | TabBar, «Aggiungi partita», «Aggiungi foto» |
| `camera` | 📷 | dropzone delle foto |
| `link` | 🔗 | «Collega a un utente» |
| `chat` | ✨ ⚡ dell'assistente | link «Usa l'assistente guidato» |
| `ball` | 🏐 | la palla del logo senza pin: assistente, avatar dell'assistente |
| `pin` | 📍 | luogo nel `meta`; «Check-in oggi» (è l'attuale `oggi`) |
| `refresh` | ↻ | «Aggiorna» in Chi c'è oggi, «Riprova» |
| `trophy` | 🏆 nella UI | tab Tornei (contorno/pieno), badge «1°» (12px) |
| `home` · `people` · `person` | | tab Home, tab Compagni, ripiego dell'avatar in Profilo |
| `chevron-left` · `chevron-right` · `chevron-down` | ‹ › ▸ | Indietro, righe che navigano, «Altri dettagli» |
| `close` · `ellipsis` | × ⋯ | chiusure, menu della NavBar |
| `trash` · `pencil` | | Elimina, Modifica nei menu |
| `share` · `download` | | Storia, Wrapped |
| `search` | | ricerca, lente nella NavBar compatta |
| `list` · `timeline` · `map` | | eventuali icone del segmented (PUÒ; il testo resta) |
| `chart` · `sun` | | «Tutte le statistiche», «Beach Wrapped» (il sole è il motivo della stagione) |
| `flag` · `inbox` · `shield` | | «Segnala un problema», «Segnalazioni ricevute», badge Admin |
| `wifi-off` · `alert` · `check-circle` · `info` | | toast offline, errore, successo, informazione |

**Mai**: le emoji come icone di interfaccia, un'icona senza nome accessibile se è l'unico contenuto, le icone della TabBar senza etichetta. Le emoji restano **contenuto**: l'emoji del torneo, le slide Wrapped, la 🏆 dentro il valore `'1° 🏆'` quando lo si legge come testo.

### 10.2 Il marchio

`BrandMark` e `BrandLockup` restano come sono.
- **Misure**: 28 (leading della NavBar in Home, UX Q22), 40 (Sidebar), 72 (Splash e Login).
- **Spazio di rispetto**: il 25% della misura per lato.
- **Non si ricolora** e non si posa sull'arancio. Su fondi scuri si usa la variante `bare`.
- Il wordmark passa da Space Grotesk a `--font-ui` 700 con tracking −0.02em. La metà «Diary» è a peso 400 e `--ink-2`.

### 10.3 Immagini

**Foto dei tornei.**
- Si mostrano come sono: niente filtri, niente sovrapposizioni con gradiente e niente testo sopra (solo i pulsanti di vetro dei visori).
- Le **miniature** in griglia sono quadrate (1:1, `object-fit: cover`), con raggio `--radius-control` e gap 4.
- La **copertina** in Timeline è in 16:10, con raggio `--radius-control`.
- Tutte hanno un filo interno `inset 0 0 0 1px rgb(27 42 74 / .06)`, che stacca una foto di sabbia bianca dalla carta bianca.
- **Foto mancante o legacy**: riquadro dell'etichetta colore con l'icona `camera` in `--ink-3` e l'etichetta accessibile «Foto non disponibile».

**Avatar.**
- È un cerchio. Con l'iniziale: fondo `--select` e lettera bianca a peso 600, grande il 42% del diametro.
- Con la foto: lo stesso cerchio con il filo interno.
- Nella TabBar è da 24px, con un anello di 2px `--on-select` quando la tab è attiva.

**Mappe.**
- Le tile OSM **non si filtrano**, niente bianco e nero: il doppio bordo dei pin è misurato sui colori veri di OSM (`#AAD3DF`, `contrast.test.ts`), e desaturare le tile invaliderebbe quella prova.
- La cornice ha raggio `--radius-card` e bordo `--edge`. I pulsanti sopra la mappa sono `glass-thin`, solo icona, da 44px.
- Con `prefers-reduced-motion`, Leaflet riceve `zoomAnimation: false`, `fadeAnimation: false` e `markerZoomAnimation: false`.

**Illustrazioni: nessuna.** Gli stati vuoti sono tipografici (§8). Niente foto stock, niente persone disegnate, niente oggetti 3D.

### 10.4 La tela dei PNG (Storia 1080×1920 e Wrapped, `⟂ F4`)

È una grammatica da manifesto sportivo: campiture piatte, una griglia e numeri enormi. Palette in §4.7. **Niente `backdrop-filter`, niente ombre, niente gradienti.**

| Elemento | Valore (px della tela 1080×1920) |
|---|---|
| Margini laterali | 88 |
| Zone sicure | niente testo essenziale nei primi 250 e negli ultimi 250 (UX §11.2) |
| Disco del sole | diametro 920, centro in (1200, −120): tagliato in alto a destra, colore `disc`, dietro a tutto. Ogni testo della palette regge anche sopra il disco (§4.7) |
| Eyebrow | Inter 700, 28/36, +0.12em, maiuscolo, `muted`, a y = 264 |
| Titolo | Inter 800, 88/92, −0.03em, `fg`, al massimo 3 righe, `text-wrap: balance` |
| Numero eroe | Inter 800, 320, interlinea 0.86, −0.055em, cifre tabellari, `accent` (il piazzamento «1°» o il win rate) |
| Celle statistiche (2×2) | numero Inter 800, 112/112, −0.04em; etichetta Inter 700, 26/32, +0.1em maiuscola, `muted`; celle separate da filetti `line` di 2px, non da riquadri |
| Foto (fino a 3) | raggio 28, filo `line` di 2px, mai sotto il testo |
| Piè di pagina (marchio) | `BrandMark` 72 più «Beach Diary» Inter 700 34, −0.02em, ancorato a 88 dal fondo (sta nella zona sicura: è un marchio, non un'informazione) |

---

## 11. Movimento

### 11.1 Vocabolario (allineato a `Motion.tsx`, verificato da `tokens.test.ts`)

| Token CSS | Valore | Motion.tsx | Per cosa |
|---|---|---|---|
| `--dur-svelto` + `--ease-standard` | 180ms, `cubic-bezier(.2,.8,.2,1)` | `SVELTO` | colore, opacità, **tutte le uscite** |
| `--dur-entrata` + `--ease-standard` | 260ms, idem | `ENTRATA` | comparse |
| `--dur-molla` + `--ease-molla` | 320ms, `linear(0, .077, .236, …, 1)` | `MOLLA` (460/38/0.9, ζ 0.934) | tutto ciò che si sposta nello spazio |
| `--dur-racconto` + `--ease-racconto` | 800ms, `cubic-bezier(.16,1,.3,1)` | la curva di `NumeroCheSale` | numeri che salgono, grafici che si disegnano: una volta per montaggio |
| `--dur-respiro` + `--ease-respiro` | 1400ms, `cubic-bezier(.45,0,.55,1)` | | pulsazione degli skeleton (mezzo ciclo, `alternate`) |
| `--delay-skeleton` · `--delay-respiro` | 150ms · 600ms | | lo skeleton in tre tempi (MOTION.md §6.2): forme a 150ms, respiro da 600ms |
| `--motion-scale` | 1 (0 con reduced-motion) | | moltiplica ogni spostamento: `translateY(calc(12px * var(--motion-scale)))` |
| `--press-scale` | .97 (1 con reduced-motion) | | pressione dei pulsanti |

**`--ease-molla`** è la soluzione esatta della molla `MOLLA` campionata in 17 punti su 320ms: arriva al 50% a 72ms e al 90% a 158ms, e la sovraelongazione è dello 0,03%, cioè invisibile.
- Il JS usa `MOLLA`, il CSS usa `--ease-molla`: è lo stesso moto.
- Senza `linear()` si ripiega su `--ease-standard`.

**Regole.**
1. Le uscite sono più veloci delle entrate: si esce con `SVELTO`, si entra con `ENTRATA` o `MOLLA`.
2. Si animano **solo `transform` e `opacity`**. L'unica eccezione è l'apertura di «Altri dettagli» (altezza, via Motion `height: auto` oppure `grid-template-rows: 0fr → 1fr`).
3. Una molla per gesto. **Niente stagger** sulle liste: è il segno più riconoscibile di un template.
4. Tutto ciò che si muove nello spazio usa `--motion-scale`, così reduced-motion lo azzera senza un caso per componente.

### 11.2 Cosa si anima

| Elemento | Movimento | Tempo | Con `prefers-reduced-motion` |
|---|---|---|---|
| Sheet dal basso | `translateY(100% → 0)`; il trascinamento torna in posizione con la molla | `MOLLA`; uscita `SVELTO` | solo dissolvenza `SVELTO` |
| Velo | `opacity 0 → 1` | `ENTRATA`; uscita `SVELTO` | uguale |
| Form sheet (≥ 600) e ConfirmDialog | `opacity` + `scale(.96 → 1)` | `ENTRATA`; uscita `SVELTO` | dissolvenza |
| Action sheet del ＋ | `opacity` + `translateY(12px → 0)` + `scale(.96 → 1)`, `transform-origin` sul ＋ («ciò che hai toccato è ciò che si apre», UX C2) | `MOLLA` | dissolvenza |
| Popover desktop | `opacity` + `translateY(-4px → 0)` | `SVELTO` | dissolvenza |
| Pillola di tab, segmento e chip | `layoutId` che scivola | `MOLLA` | istantaneo (lo fa già Motion) |
| NavBar: comparsa del vetro | `opacity` del livello di vetro 0 → 1; titolo compatto `opacity` + `translateY(4px → 0)` | `SVELTO` | solo opacità |
| Toast | entrata `opacity` + `translateY(-8px → 0)`; uscita `opacity` | `ENTRATA` / `SVELTO` | dissolvenza |
| Pressione su capsule e pulsanti | `scale(var(--press-scale))` | `SVELTO` | nessuna |
| Pressione su righe e card | fondo → `--surface-pressed`, immediato all'entrata | 0ms / `SVELTO` all'uscita | uguale |
| Hover (solo `hover: hover`) | bordo → `--edge-strong`, fondo delle righe → `--surface-pressed` | `SVELTO` | uguale |
| Numeri (`NumeroCheSale`) | salgono da 0 al montaggio; a un cambio di filtro passano dal valore precedente al nuovo | `--dur-racconto` | compaiono già arrivati |
| Grafici | linee: `stroke-dashoffset` (il `@keyframes dash` di oggi); barre: `scaleX(0 → 1)` da sinistra | `--dur-racconto`, una volta | nessuno |
| Skeleton | `opacity 1 ↔ .55` | `--dur-respiro` `alternate infinite` | fermo a .75 |
| «Altri dettagli» | altezza più rotazione di 90° del chevron | `ENTRATA` | istantaneo |
| Card di Wrapped | il `wrappedin` di oggi | `ENTRATA` | nessuno (già così) |
| Barre di avanzamento di Wrapped | riempimento lineare, il `wrappedbar` di oggi | la durata della slide | **resta**: dice quanto tempo manca, non è decorazione |

### 11.3 Cosa NON si anima, di proposito

- **I cambi di rotta.** Niente slide né dissolvenza fra le schermate. Su iOS lo swipe indietro di Safari anima già un'istantanea della pagina: una seconda animazione nostra farebbe un doppio scorrimento. Il contenuto compare e il focus va sull'`<h1>` (UX §4.4).
- **Il cambio di tab.** Nessuna dissolvenza: la tab è un posto, non una transizione.
- **Il large title.** Non si rimpicciolisce e non si sposta con lo scroll: esce dalla vista insieme al contenuto, e al suo posto compare il titolo compatto. Niente animazioni legate allo scroll, che su iOS scattano.
- **Le liste al ricaricamento.** Un `reload()` non riordina con un'animazione: le righe sono già al loro posto.
- **Il raggio di sfocatura**, il fondo, l'alone del sole: niente parallasse, niente sfocature animate (UX §8.7).
- **L'anello di focus**: compare istantaneo.
- **Il ＋**: non ruota in ×. Il menu ha già «Annulla», e una croce che sostituisce il ＋ cambierebbe il nome di quel pulsante sotto il dito.
- **Gli stati di caricamento a spinner nel contenuto**: lo spinner esiste solo sull'immagine del lightbox e sull'avatar in caricamento (UX §6.5, §6.8). Altrove si usano lo skeleton o l'etichetta «…» nel pulsante.

---

## 12. Il livello dei token: come si usa

| File | Cosa contiene | Chi lo legge |
|---|---|---|
| `src/styles/tokens.css` | solo custom properties, l'ordine dei livelli `@layer reset, tokens, base, components, utilities`, il tema scuro predisposto, le preferenze di sistema | tutti i CSS; è importato **per primo** in `src/main.tsx` |
| `src/styles/materials.css` | `[data-material=…]` e `[data-surface="dark"]`: tinta, sfocatura, riflesso, inchiostri ridefiniti, fallback | i componenti di navigazione e di overlay |
| `src/lib/theme.ts` | `TOKEN` (riferimenti `var(--…)`), `LIT` (letterali per canvas e attributi SVG), `BP`, `dataTone` / `DATA_TONE`. `C` resta per il codice vecchio | JS: style dinamici, grafici, Leaflet |
| `src/styles/tokens.test.ts` | 134 test: contrasti, vetro nel caso peggiore, prove negative, dark, `TOKEN`/`LIT` contro CSS, sfocature letterali contro `--blur-*`, `Motion.tsx` contro le durate, `--ease-molla` contro `MOLLA` | `npm test` |
| `src/test/wcag.ts` | la formula del contrasto con `over()` per comporre l'alpha; legge anche `rgb(r g b / a)` | i test di contrasto; `contrast.test.ts` può migrarci in F1 |
| `vitest.config.ts` | `css.include` sui due fogli dei token: senza, Vitest restituisce `""` anche per `?raw` | |

**Regole d'uso.**
1. Nei componenti si usano **solo token semantici**. Un esadecimale in un file `.css` o `.tsx` nuovo è un errore di revisione, salvo i dati che arrivano da lib (§4.5) e la tela dei PNG (§4.7).
2. Tipografia: `font: var(--type-x); letter-spacing: var(--track-x);`, più `font-variant-numeric: tabular-nums` sui numerali.
3. **SVG**: `stroke="var(--x)"` come attributo di presentazione non è affidabile. Si usa `style={{ stroke: TOKEN.dataWin }}`, oppure `stroke="currentColor"` con il `color` dal CSS. `LIT` serve solo dove nemmeno `style` arriva (canvas).
4. **Le media query** non leggono le custom properties: i breakpoint si scrivono come numeri (`BP`), sempre quei quattro.
5. **Cambiare un token** vuol dire cambiare insieme `tokens.css`, `LIT` (se c'è), questo documento e i numeri fissati in `tokens.test.ts`: il test cade apposta.

---

## 13. Migrazione dal linguaggio vecchio

La tabella che serve a chi converte gli stili inline (`⟂ F4`). Ogni letterale vecchio ha una sola destinazione.

| Oggi | Diventa |
|---|---|
| `#FAF8F5` (fondo), `C.bg` | `--bg` più `--bg-canvas` sul body; nei sheet: il materiale |
| `#1B2A4A`, `INK`, `C.ink` | `--ink` |
| `MUTED` `rgba(27,42,74,.55)`, e `.5` `.45` `.42` `.4` usati per il **testo** | `--ink-2` |
| `rgba(27,42,74,.25)` `.28` `.3` `.32` per icone o grafica | `--ink-3`, oppure `--data-rest` nei grafici |
| `LINE` `rgba(27,42,74,.1)`, `.08`, `.07`, `C.line` | `--edge` (contorno card) · `--separator` (righe) · `--data-grid` (grafici) |
| `rgba(27,42,74,.16)` `.18` (bordi di chip e pulsanti *outline*) | `--separator` |
| `#F2F0EC`, `C.fill` | `--fill` |
| `#FBFAF8` `#FBFAF7` `#F7F5F1` (hover di riga) | `--surface-pressed` |
| `#FF6B35` come fondo con `#fff` sopra (Button `primary`, FAB) | `--accent` + `--on-accent` |
| `#FF6B35` come testo (InlineLink, Button `ghost`) | `--accent-text` |
| `#FF6B35` come linea o barra nei grafici | `--data-win` / `--accent-strong` |
| `#C4501E` su `#FFF1EA` (badge podio, contatore "Prossimi") | `--accent-text` su `--accent-wash` |
| `#FFF8F0` `#FFF1E8` (fondi caldi di App e CreaChat) | `--accent-wash` |
| `#F7A883`, `C.orangeSoft` | pallino: il letterale lib · grafica: `--data-podium` |
| `#FF477E` `#E5484D`, `rgba(255,71,126,.4)` | `--danger` · `--danger-wash` |
| `#14B87A` `#2FBF71` `#17B26A` | `--success` (testo e pallini) · `--success-wash` |
| `#16233F` | `--on-accent`; il fondo navy della card Wrapped e della palette `navy` |
| Gradienti `#FF6B35 → #FF9558` (Button `assistant`, BottomNav `accent`, Sidebar, CreaChat) | **escono**: `filled` pieno. Nessun gradiente sui controlli |
| Gradiente Wrapped in Home `#16233F → #243A63 → #FF6B35` | card navy piatta con il disco del sole (§8) |
| Gradiente Instagram `#F58529 #DD2A7B #8134AF` sui pulsanti Storia | esce: `tinted` con icona `share`. Non si dipingono marchi altrui nella chrome |
| `rgba(0,0,0,.6)` e `blur(3px)` / `blur(6)` sui veli | `--scrim` senza blur (sheet) · `--viewer-bg` (visori) |
| `.card` (bianco, bordo `.1`, raggio 14) | card: `--surface`, `--edge`, `--radius-card` |
| `.lift` (`translateY(-2px)` in hover) | esce: solo il bordo cambia (`--edge-strong`) |
| `.lbl` (11px 700 maiuscolo 1.2px, `.42`) | `--type-eyebrow` (12px 600, +0.06em, `--ink-2`) |
| `.num` (Space Grotesk 600 `tnum`) | `--type-num-*` + `tabular-nums` |
| `PageHeader` h1 `clamp(26px,4vw,34px)` peso 500 | `--type-large-title` (34/41, 700) |
| `SectionTitle` 18px peso 500 | `--type-title-3` (20/25, 600) |
| `Badge` 8–9px 800 maiuscolo, default «Premium» | badge 12px 600, minuscolo, senza default |
| Raggi 10 · 11 · 12 · 13 · 14 sparsi | §6: capsula per ciò che si preme, 14 per i campi, 22 per le card |
| `Sheet` sfondo `#FAF8F5`, raggio 22 | `glass-thick`, raggio 28, gruppi opachi dentro |
| `::-webkit-scrollbar { width: 0 }` | scrollbar visibili su desktop (§8) |
| `input:focus { outline: none }` | anello `:focus-visible`, bordo che resta |

---

## 14. Il test "admin Bootstrap"

Prima di chiudere una schermata, chi la migra la confronta con questa lista. Un solo sì vuol dire rifarla.

- [ ] Una card di contenuto ha un'ombra?
- [ ] Ci sono più di due superfici sfocate sullo schermo, o una superficie sfocata con niente che ci scorre sotto?
- [ ] C'è testo grigio chiaro (`--ink-3`) o arancio puro (`#FF6B35`) usato come testo?
- [ ] C'è testo bianco su arancio?
- [ ] Il "selezionato" è qualcosa di diverso da una pillola navy piena?
- [ ] Ci sono più di un pulsante `filled` nella stessa vista, ＋ della TabBar escluso?
- [ ] C'è un maiuscolo che non è un `--type-eyebrow`?
- [ ] C'è un testo sotto gli 11px o un testo di lettura sotto i 15?
- [ ] C'è un'emoji usata come icona, o un'icona dentro un cerchio pastello?
- [ ] C'è un gradiente su un controllo?
- [ ] La Home è una griglia di card uguali invece di una sequenza (*Adesso* → numeri → approfondisci)?
- [ ] Una card si solleva in hover?
- [ ] Una lista entra con uno stagger, o una schermata entra con una slide?
- [ ] C'è un valore di spaziatura o di raggio che non è un token?
- [ ] Uno stato vuoto ha un'illustrazione o uno spinner?

---

## 15. Dove questo documento corregge UX.md e il piano

UX.md vince sul comportamento. Questo documento vince sull'aspetto. Le correzioni che seguono toccano un punto dove le due cose si sovrappongono, e ognuna ha il suo motivo.

| # | UX.md / piano dice | Qui | Perché |
|---|---|---|---|
| D1 | Segmented: traccia in vetro `thin` (UX §10) | **Opaco**: guida `--fill` | Le etichette dei segmenti inattivi stanno sulla traccia, quindi sarebbero testo sul vetro thin (3.29 nel caso peggiore), contro la regola 1 di UX §8.5. UX stesso lo permette ("PUÒ") quando il segmented coesiste con la NavBar. |
| D2 | Sidebar: vetro `thick` (UX §10) | `frost` (opaco con riflesso) e flottante | Sotto la Sidebar non scorre niente: la sfocatura costerebbe senza vedersi. La superficie sfocata così risparmiata va a sheet e popover. |
| D3 | "chip 10" (piano) | FilterChips a **capsula** | Distingue «filtra» (capsula) da «cambia vista» (guida rettangolare): è la confusione che il commento sopra `SegmentedControl` in `ui.tsx` descrive. |
| D4 | Dark: "token predisposti" (risposta 2) | Valori scuri completi e verificati, **non raggiungibili** | Nessun `prefers-color-scheme` (un test lo impedisce). Si accende con `data-theme="dark"` quando verrà approvato. |
| D5 | Vetro bianco .45–.72 (piano) | .48 · .72 · **.86** | Il .86 degli sheet porta il terziario `--on-glass-3` a 4.85 (testo d'aiuto leggibile) e il secondario a 6.91. |
| D6 | (non specificato) | Dentro gli sheet di vetro i contenuti stanno su **gruppi opachi** | Accento e danger come testo sul vetro falliscono (2.75–3.97): la voce «Elimina torneo» vive su una riga bianca. |
| D7 | Accento come testo: almeno `#B84A1A` (UX §8.5) | `#B2461A` | Con `#B84A1A` sul `--fill` sarebbe 4.34 ✗. `#B2461A` passa su tutte le superfici chiare (min 4.63). |
| D8 | Body iOS 17/22 | Body **17/24** | 22 è l'interlinea di una riga di tabella iOS. Qui il body va anche a capo (descrizioni, stati vuoti, Segnala). Il `headline` resta 22 per le righe singole. |
| D9 | "Pill minimo 11px" (piano) | Badge **12px** 600 | A 11px un «1°» con l'icona accanto non si legge al sole. L'11 resta solo per le etichette della TabBar. |
| D10 | (non specificato) | **Niente animazioni** fra le rotte | Si scontrerebbero con lo swipe indietro nativo di iOS (§11.3). |
| D11 | `theme-color` = "colore del fondo in alto" (UX C17) | `#FAF6F0` (`--bg-top`), anche come `theme_color` e `background_color` del manifest | È il valore esatto del fondo dove sta la barra di stato. `apple-mobile-web-app-status-bar-style`: `default`. |
| D12 | Toast "opaco" (UX §10) | Capsula `--surface` in alto, con `--elev-toast` | Coerente con la grammatica: il toast è una notifica, non un controllo, quindi niente vetro. |

---

## 16. Seam per i ruoli successivi

| Fase | Cosa | Riferimento |
|---|---|---|
| **F1** | `src/styles/base.css` nel livello `base`: `color-scheme: light`; `body` con `--bg`/`--bg-canvas`, `--type-body`/`--track-body`, `--ink` e antialiasing; `:focus-visible` (§8); scrollbar (§8); crocetta di `type=search` spenta (la regola di `index.css`); link «Vai al contenuto» (`--z-skip-link`) | §3, §8 |
| F1 | `index.html`: foglio Inter (§3.1), `viewport-fit=cover`, `theme-color` `#FAF6F0`, `apple-mobile-web-app-status-bar-style` `default`. Manifest: `theme_color` e `background_color` `#FAF6F0` | §3.1, D11 |
| F1 | `contrast.test.ts`: le coppie dei token sono già in `tokens.test.ts`. Restano lì (e non si toccano) i test di pin, riga del luogo e banner, che fissano requisiti; il banner si aggiorna alla coppia `--ink` su `--accent-wash` (12.07). Può importare `contrast` da `src/test/wcag.ts` | §4, §12 |
| **F2** | Le primitive leggono solo token. Il vetro solo via `data-material`. I pulsanti con le varianti di §8. Il set di icone di §10.1, con le varianti piene delle tab. `dataTone` per i colori di lib | §6–§10 |
| F2 | MatchRow: cerchio V/P `flex: none`, pastiglie `nowrap` che vanno a capo sotto i 360. Trovato nello specimen a 390px, dove il nome finiva schiacciato su tre righe | §8 |
| **F3** | NavBar: livello di vetro a opacità animata, mai a sfocatura animata. TabBar: capsula `glass-regular` con `--elev-float`, pillola navy, ＋ arancio da 56. Sidebar `frost` flottante | §9.3, §2.4 |
| **F4** | Conversione degli stili inline con la tabella di §13. Card Wrapped navy piatta. PNG: palette di §4.7 in `palette.ts` (e la copia in `StoryModal` va tolta), la grammatica di §10.4, `document.fonts.load` di Inter prima di `toPng` | §4.7, §10.4, §13 |
| F4 | Leaflet con reduced-motion: `zoomAnimation`, `fadeAnimation` e `markerZoomAnimation` a `false` | §10.3 |
| **F6** | Togliere `C`, `INK`/`ORANGE`/`MUTED`/`LINE` da `ui.tsx` e il foglio Space Grotesk + Nunito quando non ci sono più usi; `index.css` assorbito in `base.css`; aggiornare la sezione "Design tokens" del README rimandando qui | §12 |
| **QA** | Su iOS Safari (17 e 18): `-webkit-backdrop-filter` dei tre materiali, il riflesso, *Riduci trasparenza*, *Aumenta contrasto*. Su un Android economico: lo scroll fluido con TabBar e NavBar di vetro più uno sheet aperto. Un PNG Storia e uno Wrapped da un iPhone (Inter caricato) | §9.4, §3.1 |

---

# Parte L. La landing `/presentazione`: «Controluce»

| | |
|---|---|
| Ruolo | Art director, ruolo 2 di 6 della squadra «REDESIN sito presentazione». Definisce il sistema visivo della landing; **non costruisce componenti** |
| Base | `UX.md` Parte L (ruolo 1, commit `7f31fba`), su `be9c4bd` (`main` con la versione D). Questa parte ne rispetta i contratti e dice dove li corregge (§L13) |
| Livello dei token | `presentazione/styles/tokens.css`: si importa **dopo** i fogli dell'app e aggiunge token, non ne cambia (§L12) |
| Verifica | `src/styles/landing.tokens.test.ts`: legge il foglio della landing e quello dell'app **come testo** e ricalcola ogni rapporto citato in questa parte (59 test). Più una tavola renderizzata a 390×844 in Chrome headless, con i fogli veri, la scena vera del Login e Pallo vero |
| Cosa vince | Sull'**aspetto** della landing vince questa parte; sul **comportamento** vince UX.md Parte L. Sui valori dell'app vince la sezione «Versione D» in cima a questo documento |

Ogni valore qui sotto è un numero o un token. Se chi costruisce ha bisogno di un valore che qui non c'è, lo aggiunge a `presentazione/styles/tokens.css` e al test, non al componente.

### Indice della Parte L

- L0. [In una frase](#l0-in-una-frase)
- L1. [Estendere o spingere: la decisione](#l1-estendere-o-spingere-la-decisione)
- L2. [Direzione estetica](#l2-direzione-estetica)
- L3. [Tipografia](#l3-tipografia)
- L4. [Colore](#l4-colore)
- L5. [Spazio e layout](#l5-spazio-e-layout)
- L6. [Raggi e forme](#l6-raggi-e-forme)
- L7. [Elevazione e ombre](#l7-elevazione-e-ombre)
- L8. [Bordi e superfici](#l8-bordi-e-superfici)
- L9. [Il vetro sulla landing](#l9-il-vetro-sulla-landing)
- L10. [Iconografia e immagini](#l10-iconografia-e-immagini)
- L11. [Movimento](#l11-movimento)
- L12. [Il livello dei token: come si usa](#l12-il-livello-dei-token-come-si-usa)
- L13. [Dove questa parte corregge UX.md](#l13-dove-questa-parte-corregge-uxmd)
- L14. [Il test «landing da template»](#l14-il-test-landing-da-template)
- L15. [Seam per i ruoli successivi](#l15-seam-per-i-ruoli-successivi)

---

## L0. In una frase

**Controluce.** Il sito è l'app vista al tramonto. Sagome d'inchiostro contro una luce calda (i giocatori, la palma, Pallo), pagine di carta per il diario e un tabellone acceso per i numeri. Dove l'app è una lista calma, il sito è una sequenza di manifesti: una cosa per schermata, il carattere grande come immagine, e un solo salvagente arancio da toccare.

Il nome viene dalla scena del Benvenuto, che è già in controluce: il sole basso dietro la rete, e davanti solo sagome. La landing comincia lì e finisce lì.

---

## L1. Estendere o spingere: la decisione

**Si estende il sistema, si spinge il registro.**

L'utente ha chiesto un sito «coerente con l'app: stessi token, font, marchio, vetro e voce». C'è anche un motivo che pesa di più: la landing è la porta dell'app. Chi tocca «Crea il tuo diario» atterra sul Benvenuto, cioè sulla stessa scena al tramonto, con lo stesso titolo e lo stesso Pallo. Se il sito avesse un altro linguaggio, il primo tocco sarebbe un cambio di marca.

Coerente però non vuol dire «l'app su una pagina più lunga». Con i titoli da 30px e le card bianche in colonna, la landing sembrerebbe la schermata Profilo. La landing di oggi, per contro, ha proprio la forma da template: telefono che galleggia accanto al titolo, tre card di funzioni con l'icona, barra mobile in fondo.

| Si estende (preso dall'app così com'è, importato e non copiato) | Si spinge (solo sulla landing) |
|---|---|
| I token: inchiostri, arancio, carta, raggi, spazi, curve (`src/styles/tokens.css`) | **La scala.** Sopra `--type-large-title` (30/34) c'è un gradino da manifesto: titolo fino a 84, numeri fino a 160 (§L3.2) |
| Il vetro e i suoi ripieghi (`materials.css`), **senza ritocchi** ai materiali | **Le campiture.** L'app ha un fondo solo. La landing alterna tre fondi pieni a tutta larghezza: tramonto, carta, inchiostro (§L4.2). È la grammatica delle slide di Wrapped, che è già prodotto |
| Geist, i pulsanti (`Button.css`), le icone (`Icon.tsx`), Pallo e i suoi 14 umori, il tabellone (`Odometro`) | **Il ritmo.** 96–144px fra le sezioni invece dei 24 dell'app: ogni sezione è un manifesto, e serve aria intorno |
| La scena del Benvenuto, le palette dei PNG, il vocabolario dei pin della Mappa | **Il movimento legato allo scroll**, che l'app vieta (MOTION §9.2). Qui c'è, con i limiti di §L11 e di MOTION.md («Landing») |

**Perché non oltre** (un'altra palette, un altro carattere, un'illustrazione nuova): il marchio della versione D ha tre settimane, e chi si installa l'app dalla landing deve riconoscere l'icona, la scena e Pallo nel primo minuto. Un sito «più bello dell'app» farebbe sembrare l'app una versione povera del sito.

**Perché non meno**: con la scala dell'app non ci sarebbe gerarchia fra un capitolo e una sezione, e senza campiture le nove sezioni sarebbero una sola striscia beige.

---

## L2. Direzione estetica

### L2.1 Aggettivi (in ordine di priorità)

1. **In controluce.** Le forme si leggono dal contorno, non dal dettaglio: sagome d'inchiostro su luce calda (la scena, Pallo davanti al sole del finale), numeri bianchi sul buio, schermate in una cornice d'inchiostro. Niente sfumature decorative, niente lucido.
2. **Da manifesto.** Una cosa per schermata. Il titolo occupa la larghezza, il numero è l'immagine, il fondo è una campitura piena. È la grammatica della tela dei PNG (§10.4 e `WrappedSlideCard.tsx`), portata sulla pagina.
3. **Vero.** Ogni immagine è il prodotto. Le schermate vengono dall'anteprima, le slide dalle palette dei PNG, le regole della demo da `PartitaLive.regole.ts` e i pin dalla Mappa. Non ci sono telefoni 3D, interfacce inventate o foto di repertorio.
4. **Giocabile.** Quello che si muove, per lo più, risponde: Pallo al dito, la demo al tocco, la chat alla risposta. Il movimento è una reazione prima che uno spettacolo.
5. **A prova di sole**, come l'app. Il testo sta sopra 4.5:1 nel caso peggiore **misurato**, anche sulla scena e sotto il vetro (§L4.8).
6. **Leggero.** Nessun framework, al più 2 superfici sfocate nel caso tipico, carattere servito dal sito.

Non è: carino, «tech», SaaS, una pagina prodotto Apple in nero.

### L2.2 Riferimenti (che cosa si prende da ognuno)

| Riferimento | Che cosa si prende | Che cosa **non** si prende |
|---|---|---|
| **Il Benvenuto dell'app** (`Login.scena.tsx`, `Login.css`) | La scena, il velo dal basso, il titolo 800 stretto, il vetro chiaro sul buio di «Ho già un account» | Il carosello dei messaggi: sulla landing il titolo è uno |
| **La tela di Beach Wrapped e della Storia** (versione D) | Campitura unica; numero a peso 900 con tracking −0.052em e interlinea 0.9; le celle 2×2 separate da un filetto; Pallo come unica figura | Le misure della tela (1080): qui si scala a × 1/3 (§L3.2) |
| **Tabelloni luminosi** dei campi, grafiche TV del Beach Pro Tour FIVB | Cifre bianche sul buio, tabellari, separate da filetti: è #numeri | Il nero lucido da broadcast, i gradienti metallici |
| **Scrollytelling delle redazioni** (The Pudding, i grafici del New York Times) | Il grafico fermo e i paragrafi che scorrono e lo cambiano **a soglia**: è il telefono di #diario | Lo «scrub» per fotogramma (un video legato allo scroll) |
| **Segnaletica dei bagni della Riviera** | Un solo oggetto saturo nel campo visivo, il salvagente arancio: il CTA | Righe degli ombrelloni, decori marinari |
| **Otl Aicher, Monaco 1972** | Campiture piatte e numeri enormi su griglia | La policromia |
| **iOS 26, Liquid Glass** | La capsula di vetro che cambia aspetto secondo quello che le passa sotto | La lente che deforma, il vetro colorato |

### L2.3 Anti-riferimenti (se ci somiglia, è sbagliato)

- **La landing SaaS da template**: titolo a sinistra e telefono inclinato a destra con una macchia di gradiente dietro; la griglia «Funzioni» con sei icone nei cerchi pastello; la fascia dei loghi; il carosello delle recensioni; i prezzi; le FAQ a fisarmonica; il footer con quattro colonne di link.
- **Il «reveal» su tutto**: ogni paragrafo che sale in dissolvenza quando entra in vista. È il segno più riconoscibile di un template (vedi §L11.4).
- **La pagina prodotto Apple rifatta**: tutto nero, video legato allo scroll, testo a gradiente da 120px.
- **I separatori a onda** fra le sezioni, i blob, i gradienti mesh di sfondo. Il bagnasciuga è un taglio netto, non un'onda disegnata.
- **Telefoni in 3D o in argilla**, inclinati, con riflessi e ombre portate; illustrazioni isometriche.
- **Emoji come icone delle funzioni** (🏐 📊 🗺️) e coriandoli a ogni tocco.
- **La landing di oggi**: navy e `#FF6B35`, Space Grotesk e Nunito, il vecchio pin, tre PNG del vecchio design in un carosello.

### L2.4 Le sette mosse firmate della landing

Le cose che la rendono riconoscibile con il marchio coperto. Chi costruisce e ne rompe una deve scrivere il motivo.

1. **Il tramonto apre e chiude.** Hero e finale stanno sul tramonto (`--field-dusk`, #120E14), tutto il resto sulla carta o sull'inchiostro. Nell'hero il sole scende dietro il mare mentre si scorre (§L11.3, LM1). Nel finale lo stesso sole è un disco basso tagliato dall'orizzonte, e Pallo ci sta davanti, in controluce (§L5.4).
2. **Una cosa per schermata.** Ogni sezione si apre con titolo, frase e **un** oggetto: il telefono, il menu ＋ con la chat, il tabellone della demo, il numero da manifesto, la mappa, le slide, le righe dei dati. Mai una griglia di funzioni.
3. **Il numero è l'immagine.** In #numeri «66%» è alto 96–160px, bianco sull'inchiostro, e il «%» è arancio come il «%» della Home. Sotto ci sono le celle del tabellone separate da un filetto, non card.
4. **Il prodotto vero, piatto e di fronte.** Le schermate stanno in una cornice d'inchiostro senza prospettiva, ombra né riflesso. Le slide sono quelle dei PNG, la demo usa le regole vere e la mappa la palette di OpenStreetMap.
5. **Il salvagente resta uno.** Arancio pieno solo per ciò che si tocca per cominciare: il CTA (uno per schermata) e il ＋ della barra. Il resto dell'arancio è dato (il «%», il pin vinto, la voce Partita live) o è la slide arancio, che è prodotto.
6. **Il vetro si guadagna.** È vetro solo la capsula, sempre, più il menu della guida e il foglio d'installazione quando sono aperti. «Ho già un account» è l'unico vetro dentro una sezione, ed è quello del Benvenuto (§L9).
7. **Pallo è l'unico personaggio.** Oltre a lui ci sono solo le sagome della scena. Ce n'è uno solo che parla alla volta (UX §L3.2), e la sua misura dice il suo ruolo: grande quando la sezione è sua, 64px quando fa da guida (§L10.3).

---

## L3. Tipografia

### L3.1 Il carattere e la sua riserva

- **Geist Variable** da `@fontsource-variable/geist`, servito dal sito: `font-src 'self'`, niente Google Fonts. Si importa il foglio del pacchetto (`@fontsource-variable/geist/wght.css`). Le sue `unicode-range` fanno scaricare all'italiano il solo file latino (`geist-latin-wght-normal.woff2`, assi 100–900), con `font-display: swap`.
- **Riserva metrica** (`"Geist Fallback"`, in `presentazione/styles/tokens.css`): Arial ridimensionato per occupare la stessa larghezza di Geist. Così il cambio di carattere non sposta niente (UX §L6.0, CLS 0). Le misure sono state prese in Chrome con `measureText` su una frase della landing. Geist ha ascendente 1.005 e discendente 0.295 dell'em. Arial ha solo il tondo e il neretto, quindi c'è una faccia per fascia di peso:

| Pesi | Sorgente | `size-adjust` | `ascent-override` | `descent-override` | Rapporto misurato (Geist ÷ Arial) |
|---|---|---|---|---|---|
| 100–549 | `local("Arial")` | 104.49% | 96.18% | 28.23% | 500: 62 850 ÷ 60 147 |
| 550–649 | `local("Arial Bold")` | 98.86% | 101.66% | 29.84% | 600: 64 301 ÷ 65 042 |
| 650–749 | `local("Arial Bold")` | 101.09% | 99.42% | 29.18% | 700: 65 752 ÷ 65 042 |
| 750–849 | `local("Arial Bold")` | 103.32% | 97.27% | 28.55% | 800: 67 203 ÷ 65 042 |
| 850–900 | `local("Arial Bold")` | 105.55% | 95.22% | 27.95% | 900: 68 654 ÷ 65 042 |

- `--font-ui` della landing: `"Geist Variable", "Geist", "Geist Fallback", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`. È l'unico nome dell'app che il foglio della landing ridefinisce sul `:root`, e il test lo controlla.
- Su Android Arial non c'è. Lì la riserva salta e si scende a Roboto, come nell'app: un salto possibile solo al primo caricamento e solo su Android. `docs/qa/fontcls.mjs` misura su Chrome desktop, dove Arial c'è.
- **Precaricamento** (`⟂ C`, PUÒ): il file latino con `<link rel="preload" as="font" type="font/woff2" crossorigin>`. Il nome del file ha l'hash di Vite, quindi serve un `transformIndexHtml` minimo, oppure niente: con la riserva metrica il salto non c'è comunque.

### L3.2 La scala da manifesto

Mobile first, gli stessi breakpoint dell'app (`BP`: 360 · 600 · 900 · 1280). La sintassi è quella dell'app: `font: var(--type-display-hero); letter-spacing: var(--track-display-hero);`. Le taglie sono in rem e reggono lo zoom al 200%. Niente `clamp()` con `vw`: la parte in `vw` non cresce con lo zoom della pagina (WCAG 1.4.4).

| Token | < 360 | 360–599 | 600–899 | 900–1279 | ≥ 1280 | Peso | Interlinea | Tracking | Uso |
|---|---|---|---|---|---|---|---|---|---|
| `--type-display-hero` | 44 | 48 | 64 | 72 | 84 | 800 | 1.0 | −0.045em | l'`h1` dell'hero, l'unico |
| `--type-display-section` | 34 | 34 | 44 | 52 | 56 | 800 | 1.04 | −0.04em | l'`h2` di ogni sezione |
| `--type-display-chapter` | 22 | 22 | 24 | 26 | 26 | 700 | 1.2 | −0.02em | gli `h3` dei capitoli di #diario e della Storia (gli `h3` delle righe dei dati sono a 600 16, §L8) |
| `--type-lede` | 18 | 18 | 19 | 20 | 20 | 500 | 1.45 | −0.01em | la frase sotto un `h2` (e sotto l'`h1`) |
| `--type-kicker` | 14 | 14 | 14 | 14 | 14 | 600 | 1.25 | 0 | l'occhiello sopra un `h2`, quando c'è: il nome della funzione come lo scrive l'app, minuscolo |
| `--type-num-poster` | 96 | 96 | 128 | 144 | 160 | 900 | 0.86 | −0.055em | il numero da manifesto di #numeri; cifre tabellari |
| `--type-num-cell` | 44 | 44 | 44 | 56 | 56 | 800 | 1.0 | −0.04em | le celle del tabellone di #numeri |
| `--type-live-num` | 112 | 112 | 112 | 112 | 112 | 800 | 1.0 | −0.045em | il punteggio della demo, come `live-num` dell'app |

**Le slide di Wrapped** sono la tela 1080 dei PNG scalata a una slide larga circa 360, cioè × 1/3. Per il testo da leggere il minimo è 15px:

| Token | px | Peso / interlinea | Tracking | Dalla tela (`WrappedSlideCard.tsx`) |
|---|---|---|---|---|
| `--type-slide-eyebrow` | 15 | 700 / 1.2 | 0 | 42 |
| `--type-slide-headline` | 88 | 900 / 0.9 | −0.052em | 266 (`xl`) |
| `--type-slide-headline-long` | 36 | 900 / 0.9 | −0.052em | 104 (`l`, i nomi) |
| `--type-slide-title` | 24 | 700 / 1.1 | −0.023em | 72 |
| `--type-slide-caption` | 15 | 500 / 1.3 | 0 | 42 |

**Dall'app, così come sono**: il corpo (`--type-body`, 16/1.45/500), il callout (15), la footnote (13), le etichette delle tab (`--type-caption-2`, 10.5/600), le etichette dei pulsanti (`Button.css`: 15/600, `lg` 16, il pieno a 700).

**Misure fatte** (Geist in Chrome, tracking compreso):

| Testo | Taglia | Largo | Spazio disponibile |
|---|---|---|---|
| «nel tuo diario.» (la riga più lunga dell'`h1`) | 44 | 270 | 288 a 320px |
| idem | 48 | 294 | 328 a 360px · 358 a 390px |
| «Ogni partita, nel tuo diario.» | 72 | 865 | due righe in 560 |
| «nel tuo diario.» | 84 | 515 | 560 (`--hero-text-max`) |
| «La mappa delle conquiste» | 34 | 402 | due righe in 358 |
| «66%» | 96 · 160 | 190 · 316 | 358 · 480 |
| «Compagni» (l'etichetta di tab più larga dell'app; la landing ha «Wrapped», 46) | 10.5 | 51 | ~84 per tab |

### L3.3 Regole

1. **Il titolo è uno, il numero è uno.** Per sezione ci sono un solo `display-section` e al più un `num-poster` (che c'è solo in #numeri).
2. **Due pesi per blocco di testo**: 500 per il testo e 600–700 per le etichette. I display sono a 800 e i numeri da manifesto a 900, come la tela dei PNG.
3. **Niente maiuscolo, niente corsivo.** L'occhiello è minuscolo come l'eyebrow della versione D.
4. **`text-wrap: balance`** sui titoli (lo fa già `base.css`), **`pretty`** sui paragrafi.
5. **Cifre tabellari** su ogni numero (`base.css` le mette sul `body`).
6. **Leggere costa ≥ 15px**: paragrafi a 16, note e fatti a 15, didascalie e meta a 13, etichette delle tab a 10.5 (l'eccezione dell'app, UX §7.1).
7. **Sui fondi chiari nessun testo copre più dell'80% del vetro della capsula**, cioè al più 112px a peso 800 o 96 a peso 900. Il motivo e la misura sono in §L9.2. Il numero da manifesto per questo sta sull'inchiostro.
8. **La misura**: la frase al più `--measure-lede` (34rem, ~60 caratteri a 20px), il corpo al più `--measure-body` (38rem).

---

## L4. Colore

### L4.1 Il principio

Gli stessi token dell'app, nessun colore nuovo per l'interfaccia. La landing aggiunge **tre campiture** (fondi pieni a tutta larghezza), **quattro ruoli del testo** che si ridefiniscono da soli sul buio, e i letterali di tre disegni che esistono già: la palette OSM della mappa, i grigi delle slide di `palette.ts` e la luce della scena. I letterali stanno **solo** in `presentazione/styles/tokens.css`, e il test lo controlla (§L12).

### L4.2 Le campiture e la loro sequenza

| Sezione | Campitura | `data-surface` | La capsula sopra (`data-fondo`) | Perché |
|---|---|---|---|---|
| `#inizio` | **tramonto** `--field-dusk` (#120E14) + la scena | `dark` | `scuro` | È il Benvenuto: chi tocca il CTA ritrova la stessa scena |
| `#diario` | **carta** `--field-paper` (#F6F6F4) | — | `chiaro` | Le pagine del diario; il telefono d'inchiostro ci si stacca a 15.72 |
| `#registra` | carta | — | `chiaro` | Il ＋ e la chat sono quelli dell'app, che stanno sulla carta |
| `#live` | carta | — | `chiaro` | La Partita live dell'app è carta: pannelli bianchi sul `--bg` |
| `#numeri` | **inchiostro** `--field-ink` (#1C1C1E) | `dark` | `scuro` | Il tabellone acceso: numeri bianchi sul buio (§L13, A1) |
| `#mappa` | carta | — | `chiaro` | La mappa ha la palette di OSM, che sta sulla carta |
| `#wrapped` | inchiostro | `dark` | `scuro` | Il visore di Wrapped: le slide sono tessere sul buio (§L13, A2) |
| `#dati` | carta | — | `chiaro` | Le righe raggruppate dell'app |
| `#comincia` | tramonto + il sole basso | `dark` | `scuro` | Il tramonto chiude quello che ha aperto |
| footer | tramonto, staccato dal filo dell'orizzonte | `dark` | `scuro` | È il mare sotto il sole del finale (§L5.4) |

Il ritmo che ne viene: **buio · carta · carta · carta · buio · carta · buio · carta · buio**. Il primo cambio di registro cade dove la pagina passa da «che cosa fai» (registri, giochi) a «che cosa ti dà» (numeri, mappa, Wrapped).

Fra due campiture il **taglio è netto**: niente onde, niente sfumature, niente ombre. L'unico gradiente di passaggio è il velo dell'hero, che sta dentro l'hero.

### L4.3 I ruoli del testo

Tre livelli più l'arancio. Sono definiti sul `:root` e ridefiniti in `[data-surface="dark"]`, così un componente scrive `color: var(--text)` e ha ragione su ogni fondo.

| Ruolo | Sul chiaro | su carta · su bianco | Sul buio | sul tramonto · sull'inchiostro | Uso |
|---|---|---|---|---|---|
| `--text-strong` | `--ink` #1C1C1E | 15.72 · 17.01 | `--on-glass-dark` bianco | 19.11 · 17.01 | titoli, numeri, etichette forti |
| `--text` | `--ink-label` #3A3A38 | 10.53 · 11.40 | bianco .82 | 12.88 · 11.73 | la frase, i capitoli, i paragrafi |
| `--text-muted` | `--ink-2` #6B6B68 | 4.94 · 5.35 | bianco .66 | 8.57 · 8.01 | note, fatti, didascalie, footer |
| `--text-accent` | `--accent-text` #C2410C | 4.79 · 5.18 | `--accent` #FF6B1A | 6.71 · 5.97 | occhiello, il «%» accanto a un numero |
| `--rule` | `--edge` #E2E2DE | — | bianco .16 | — | filetti delle celle, separatori sul buio (decorativi: il testo porta l'informazione) |

**Perché la frase è `--ink-label` e non `--ink-2`.** Sulla landing la frase sotto il titolo è la cosa che il visitatore legge per decidere, spesso al sole: 10.53 invece di 4.94. Il secondario (`--text-muted`) resta per ciò che si può saltare.

**Prova negativa (nel test):** l'arancio-testo dell'app sul buio fa 3.29 sull'inchiostro e 3.69 sul tramonto. Per questo sul buio `--text-accent` è l'arancio del marchio.

### L4.4 L'arancio sulla landing

| Come | Token | Dove | Rapporto |
|---|---|---|---|
| Riempimento d'azione | `--accent` + etichetta `--on-accent` (700) | «Crea il tuo diario» (uno per schermata), il ＋ della barra, «Chiudi il set» nella demo quando compare | 5.97 |
| Filo del riempimento | `--accent-strong` (inset 1px) | gli stessi: è il filo a staccarli dalla carta | 3.44 sulla carta (l'arancio da solo fa 2.63) |
| Riempimento di prodotto | `--accent` | la bolla dell'utente nella chat, il riquadro dell'icona di «Partita live» nel ＋, la slide arancio, il pin «vinta» | testo sopra: inchiostro, 5.97 |
| Testo | `--text-accent` | occhielli, il «%» | 4.79 / 5.97 |
| Mai | — | bianco sull'arancio (2.85), arancio come sfondo di una sezione, arancio sui separatori, sulle icone spente o sui bordi decorativi | — |

### L4.5 Le slide di Wrapped

Sono le palette di `src/components/wrapped/palette.ts`, copiate nei token e **confrontate una a una** dal test: se la tela dei PNG cambia, la landing fallisce finché non si allinea.

| Palette | Fondo | Testo | Accento | Secondario | Filetto | Rapporti (testo · secondario · accento) |
|---|---|---|---|---|---|---|
| arancio | `--accent` | `--ink` | `--ink` | #3E281D | #C6571B | 5.97 · 4.83 · 5.97 |
| inchiostro | `--ink` | bianco | `--accent` | #D2D2D2 | #4E4E50 | 17.01 · 11.25 · 5.97 |
| sabbia | `--bg` | `--ink` | `--accent-text` | #484849 | `--line-strong` | 15.72 · 8.44 · 4.79 |

Ogni slide ha un filo interno bianco al 16% (`--slide-ring`): sulla campitura d'inchiostro la slide d'inchiostro altrimenti sparirebbe (1.00). Il ciclo resta quello dell'app: arancio → inchiostro → sabbia.

### L4.6 La mappa disegnata

| Token | Valore | Perché |
|---|---|---|
| `--map-land` | #F2EFE9 | la terra di OpenStreetMap |
| `--map-sea` | #AAD3DF | l'acqua di OpenStreetMap: lo stesso fondo su cui `contrast.test.ts` misura i pin |
| Etichette delle città | `--ink` 600 12px, alone bianco 3px (`paint-order: stroke`) | 14.83 sulla terra, 10.61 sul mare |
| Pin | `--pin-win` (`--accent`) · `--pin-podium` (`--surface`) · `--pin-rest` (`--line-strong`) | i riempimenti di `ConquisteMap.tsx` (`RIEMPIMENTO`) |
| Doppio bordo | alone `--pin-halo` 3px fuori + filo `--pin-line` (`--ink`) 1.6 / 1.8 / 1.4 dentro (vinta / podio / giocata) | il requisito di `contrast.test.ts`: sul mare lavora l'inchiostro (10.61), dove è scuro il bianco; fra loro 17.01 |
| Raggio dei pin | 8–11px (il raggio della lib × 0.72, come l'app), più l'alone | la stessa scala della mappa vera |

La legenda è quella della Mappa dell'app (`Mappa.css`, `.mappa-glyph`): cerchio da 12px con lo stesso riempimento e il filo d'inchiostro (`--ink-2` per «giocata»). Il colore non è mai l'unica informazione: l'elenco delle città dice il piazzamento in testo.

### L4.7 La luce della scena e del finale

Sono i letterali del disegno della scena (`Login.scena.tsx`), riportati nei token solo per il finale:

| Token | Valore | Dove |
|---|---|---|
| `--sole-core` | #FFE1B8 | il disco del sole basso nel finale (sul tramonto 15.21: è un disegno, non un testo) |
| `--sole-halo` | `radial-gradient(closest-side, #FFE3BC 0%, rgb(255 193 132 / .55) 55%, rgb(255 154 77 / 0) 100%)` | l'alone, lo stesso `radialGradient` della scena |
| `--riflesso` | #FFC48A | i quattro tratti del riflesso sotto il sole, nel footer |
| `--horizon` | bianco .16 | il filo dell'orizzonte: il bordo alto del footer |

### L4.8 I casi peggiori, misurati

Il contrasto dell'app si misura sui fondi piatti. Quello della landing no: il testo dell'hero sta sopra una scena col sole, e sotto la capsula passano numeri da 112px. Questi sono i casi peggiori, tutti ricalcolati da `landing.tokens.test.ts`:

| Coppia | Fondo peggiore | Rapporto | Soglia |
|---|---|---|---|
| `h1` dell'hero (bianco, testo grande) | velo al 50% sopra il pallone #FFF7EE, il pixel più chiaro della scena | **3.76** | 3 |
| La frase dell'hero (bianco .82) | velo al 72% sopra il pallone · dove la frase può cominciare più in alto (200px, titolo di due righe: velo al 65.5%) | **6.04** · 4.89 | 4.5 |
| «Ho già un account» (bianco su `glass-clear`) | `glass-clear` sopra il velo al 72% sopra il pallone | **5.50** | 4.5 |
| Testo dell'hero da 900px (bianco .82 · vetro chiaro) | velo laterale al 78% sopra il pallone | 7.34 · 6.59 | 4.5 |
| Tab spenta sulla capsula chiara (`--on-glass`) | `glass-regular` .32 sopra il numero della demo sfocato (copertura 0.796) | **4.56** | 4.5 |
| idem | sopra un titolo di sezione da 60px (0.655) · sopra una foto in ombra (#8C8C8C, il caso dell'app) | 6.04 · 7.92 | 4.5 |
| Tab spenta sulla capsula scura (bianco) | `glass-dark` .66 sopra bianco pieno · sopra il «66%» da 160 (0.937) · sopra il sole · sopra l'arancio | **6.10** · 6.57 · 6.98 · 10.79 | 4.5 |
| Tab accesa (`--accent-text` sulla lente bianca) | la lente è opaca | **5.18** | 4.5 |
| Accesa contro spenta (senza vedere il colore) | `--accent-text` contro `--ink` | 3.29 | 3 |
| La lente sulla capsula scura (la forma) | bianco contro `glass-dark` sopra l'inchiostro | 18.28 | 3 |
| «Ferma le animazioni» nell'hero: anello | bianco .38 sul tramonto | 3.55 | 3 |
| Anello di focus | inchiostro su carta 15.72 · bianco sul tramonto 19.11 e sull'inchiostro 17.01 | ≥ 15.72 | 3 |

**Le coperture** sono una misura, non un calcolo. In Chrome si disegna il glifo d'inchiostro su bianco, lo si sfoca con lo stesso `blur(10px)` del vetro (canvas `filter`) e si legge il pixel più scuro:

| Testo | Copertura |
|---|---|
| «66%» 900 / 160 | 0.937 |
| «66%» 900 / 128 | 0.875 |
| «21» 800 / 112 (la demo) | 0.796 |
| «66%» 900 / 96 | 0.784 |
| «I numeri» 800 / 60 | 0.655 |
| «Ogni partita» 800 / 44 | 0.584 |
| testo 500 / 16 | 0.169 |

**Prove negative (nel test):**
- l'inchiostro al 78% delle tab dell'app, sopra il numero della demo, fa 3.39. Per questo sulla landing le tab spente sono d'inchiostro pieno;
- il «66%» da 160 sotto il vetro chiaro fa 3.36, quello da 128 fa 3.85. Per questo #numeri sta sull'inchiostro;
- al 50% di velo la frase dell'hero non regge. Per questo il velo ha una seconda soglia, al 72%.

### L4.9 Chiaro e scuro: che cosa vuol dire qui

La landing ha **fondi scuri per disegno** (il tramonto, l'inchiostro), non un tema scuro. Sul buio i ruoli del testo si invertono da soli (`[data-surface="dark"]`, §L4.3), e i rapporti di entrambe le varianti stanno nelle tabelle sopra.

Il **tema scuro di sistema** resta com'è nell'app: predisposto (`:root[data-theme="dark"]`) e spento. Nel CSS non c'è `prefers-color-scheme`: lo vieta `tokens.test.ts` per l'app, e `landing.tokens.test.ts` per il foglio della landing. La ragione è la stessa di §L1: dopo il CTA si apre l'app, che è chiara. Una landing che si fa scura da sola aprirebbe un'app che non lo fa.

---

## L5. Spazio e layout

### L5.1 La scala, prolungata

Restano i passi di 4 dell'app (`--space-*`). La landing ne aggiunge quattro:

| Token | `--space-14` | `--space-24` | `--space-30` | `--space-36` |
|---|---|---|---|---|
| px | 56 | 96 | 120 | 144 |

### L5.2 Il ritmo

| Dove | Token | < 600 | 600–899 | ≥ 900 |
|---|---|---|---|---|
| Sopra e sotto una sezione | `--section-pad` | 96 | 120 | 144 |
| Margine laterale | `--gutter` (app) | 16 | 24 | 32 |
| Occhiello → titolo | `--space-3` | 12 | 12 | 12 |
| Titolo → frase | `--section-head-gap` | 16 | 16 | 16 |
| Frase → oggetto | `--section-object-gap` | 40 | 40 | 56 |
| Fra due blocchi dello stesso oggetto | `--block-gap` | 24 | 24 | 24 |
| Fra due capitoli di #diario | `--space-12` | 48 | 48 | 48 |
| Larghezza della frase · del corpo | `--measure-lede` · `--measure-body` | 34rem · 38rem | idem | idem |
| Contenuto | `--content-max` (app) | — | — | 1120 |

### L5.3 La griglia (da 900px)

12 colonne, `--grid-gap` 32, larghezza massima `--content-max` (1120). Le sezioni a due colonne hanno tutte la stessa composizione:
- **testo nelle colonne 1–5**: occhiello, titolo, frase, e i fatti dove ci sono;
- **una colonna d'aria** (la 6);
- **l'oggetto nelle colonne 7–12**: telefono, demo, numeri, mappa, righe.

Il testo sta sempre a sinistra: lo sguardo scende lungo il bordo sinistro, e l'oggetto è la ricompensa a destra. L'unica eccezione è il finale, centrato in una colonna da 640: è un manifesto di chiusura, non una sezione da leggere.

### L5.4 La composizione, sezione per sezione

| Sezione | < 600 | ≥ 900 |
|---|---|---|
| **Hero** | Altezza almeno `100svh` (da 560 di altezza in su, UX §L9.2). In cima, a `--safe-top` + `--page-top`, il marchio (28 + «Beach Diary» 700 17, bianco: 17.66 sul cielo scuro). La scena riempie la sezione (`slice`), alzata come fa la camera del Benvenuto: `translateY(min(0px, calc(60.2% - 520px)))`. I piedi dei giocatori stanno al 39.8% dell'altezza, e il blocco del testo a 390px è alto circa 500 dal fondo: 520 lascia 20px di sabbia fra i piedi e il titolo. Il blocco del testo è ancorato in basso, con `padding-bottom: --tabbar-clearance`. Contiene `h1`, frase, «Crea il tuo diario» (`filled lg`, a tutta larghezza), «Ho già un account» (`glass-clear lg`, a tutta larghezza), gap 10; la riga piccola (13/1.4, `--text`); la **riga dei comandi** (alta 44: «Installa sul telefono» a sinistra, «Ferma le animazioni» a destra, §L8). Pallo da 128 (`--pallo-hero`) sta in piedi sulla sabbia, a destra, coi piedi a 4px sopra il titolo | Testo a sinistra, largo al più `--hero-text-max` (35rem), centrato in verticale. Scena intera (il panorama), velo di lato (`--hero-velo-lato`). Pallo da 240 in piedi sulla linea della sabbia, a destra del centro. Pulsanti affiancati da 600px, larghi quanto il contenuto |
| **Il diario in tasca** | La **fascia** sticky in cima: carta piena da `--scroll-pad-top` fino al fondo del telefono, poi 24px che sfumano (`--phone-band-fade`). Il testo che sale ci sparisce sotto e non passa mai sotto la cornice. Il telefono è centrato; sotto, i capitoli (`h3` + paragrafo `--type-body` in `--text`), 48 l'uno dall'altro | Telefono sticky nelle colonne 7–12, centrato in verticale fra la barra in alto e il fondo. Capitoli nelle colonne 1–5, ognuno alto almeno `70svh`, così sulla linea del 50% ce n'è uno solo |
| **Cosa registriamo?** | Le quattro voci impilate (gap 10), sotto il pannello (la chat, larga al più 420) | Voci nelle colonne 1–5 (larghe come il menu dell'app, 380), pannello nelle 7–12 |
| **Partita live** | La demo a tutta larghezza (al più `--demo-max`, 420), sotto i fatti | Fatti nelle colonne 1–5, demo nelle 7–12 |
| **I numeri** | Titolo e frase, poi «66%» (`--type-num-poster`) con l'etichetta «partite vinte» (600 15, `--text`), la barra vinte/perse (alta 8, raggio 4: vinte `--text-strong`, perse `--rule`), poi le celle 2×2 (`--type-num-cell` + etichetta 600 15), separate da filetti `--rule` da 1px, padding 16 | Il numero nelle colonne 1–5 sotto il titolo, le celle nelle 7–12 |
| **La mappa** | Il riquadro (`--map-ratio` 356/318, raggio 22, filo `--edge`), la legenda in riga (gap 16), poi l'elenco delle città (gruppo di righe da 44, §L8) | Riquadro nelle colonne 1–7, elenco nelle 8–12 |
| **Wrapped** | Titolo e frase; poi la fila delle slide (`--slide-w` × `--slide-h`, al più 360 × 640; ~334 × 594 con le barre di Safari), gap 12, la prima allineata al gutter; poi la Storia a ventaglio, centrata, con la didascalia | Slide 9:16 alte al più 640 (360 di larghezza), la Storia accanto, nelle colonne 8–12 |
| **I tuoi dati** | Un gruppo di righe a tutta larghezza (i 16 di margine), raggio 22 | Titolo nelle colonne 1–5, righe nelle 7–12 |
| **Finale** | Centrato, una colonna. Titolo, frase, CTA, «Installa sul telefono» e «Ho già un account» come pulsanti di testo; poi l'**orizzonte**: un riquadro alto `--sole-halo-r` + 24, con il sole (`--sole-r` 64, alone 220) centrato sul bordo basso e tagliato a metà dal footer. Pallo da 160 (`--pallo-finale`) sta in piedi sull'orizzonte, davanti al sole | Idem in 640 di larghezza; sole 96, alone 330, Pallo 240. La riga «È fatta per il telefono…» sotto i CTA, in `--text-muted` |
| **Footer** | Tramonto. Il bordo alto è l'orizzonte (`--horizon`, 1px), coi quattro tratti del riflesso del sole (`--riflesso`, larghi 76 · 56 · 36 · 20, alti 2, a 8px l'uno dall'altro, centrati, con opacità .6) che partono dal filo. Marchio (bare, 28), la riga, i tre comandi. Padding 32 sopra, `--tabbar-clearance` sotto | Marchio a sinistra, comandi a destra, padding sotto 48 |

**Il testo non entra mai nell'alone del sole.** Il riquadro dell'orizzonte è alto almeno `--sole-halo-r` + 24, e il CTA ci sta sopra.

### L5.5 Il telefono

| Token | < 600 | 600–899 | 900–1279 | ≥ 1280 |
|---|---|---|---|---|
| `--phone-screen-w` | `min(15rem, (56svh − 2·bezel) × 0.4621)` | `min(17.5rem, …)` | `min(20rem, (100svh − 192px − 2·bezel) × 0.4621)` | `min(22.5rem, …)` |
| `--phone-bezel` | 10 | 10 | 12 | 12 |
| Schermo | `aspect-ratio: 390 / 844`, raggio `--phone-screen-r` = larghezza × 0.1214 (47.33 su 390, come un iPhone) | | | |
| Cornice | `--phone-color` (`--ink`), raggio `--phone-r` = schermo + cornice (concentrico) | | | |

Sul telefono di riferimento (390×844 nell'emulazione, `svh` = 844) lo schermo è largo 209. Ombra, riflessi, isola, tasti, barra di stato finta: niente. La cornice è un rettangolo d'inchiostro, ed è proprio quello il controluce. Mentre l'immagine arriva, lo schermo è `--fill`.

### L5.6 La barra, Pallo guida, l'avanzamento

| Cosa | < 900 | ≥ 900 |
|---|---|---|
| Capsula | Come la TabBar dell'app: `--tabbar-h` 64, ai lati `--tabbar-side` (14; 8 sotto i 360), in basso `--tabbar-bottom`, padding 6, `--elev-float` | In alto, a `--barra-inset` (16): marchio a sinistra (tessera 32 + «Beach Diary»), capsula al centro larga `--barra-capsule-w` (25rem), ＋ a destra |
| ＋ | Cerchio da `--plus-size` (64), staccato di `--tabbar-gap` (10); solo icona fino a 599, capsula con «Apri il diario» da 600 | Capsula alta 64, icona 24 + «Apri il diario» (700 16), padding 0 24 |
| Pallo guida | `--guida-size` 64 (56 sotto i 360), sopra il ＋ allineato a destra: `bottom: --guida-bottom` (safe-area + 64 + 8), `right: --guida-right` | 64, in basso a destra: `bottom: max(24px, safe-area + 16px)`, `right: --gutter` |
| Nuvoletta | Sopra Pallo, allineata a destra, larga al più `--bolla-max` (min(280, 100vw − 32)), 8px sopra la sua testa | idem |
| Avanzamento | Al bordo alto: `top: --progress-top` (safe-area + 6), largo quanto il contenuto meno i gutter, alto `--progress-box` 16: binario 2px, pallone 12 | Appena sotto la barra in alto (16 + 64 + 8), pallone 14 |
| `scroll-padding` | in alto `--scroll-pad-top` (safe-area + 12), in basso `--scroll-pad-bottom` (64 + safe-area + 64 + 8 + 16) | in alto 16 + 64 + 16, in basso 64 + 24 + 16 |

**Livelli:** avanzamento `--z-progress` 25, barra `--z-tabbar` 30, Pallo e nuvoletta `--z-guida` 32, menu della guida `--z-guida-menu` 35. Velo e foglio sono quelli dell'app (`--z-scrim` 40, `--z-sheet` 50). Lo skip link è a `--z-skip-link` 100.

### L5.7 Slide e Storia

| Cosa | Valore |
|---|---|
| Slide, quando la fila è bloccata | `--slide-h` = `min(40rem, 100svh − safe-area − 28 − 64 − tabbar-bottom − 48)`; da 900 `min(40rem, 100svh − 16 − 64 − 64)`; `--slide-w` = h × 9/16. Il fondo della fila sta **sopra** la capsula: a riposo nessuna slide passa sotto il vetro |
| Slide, nella riga a mano | larghe `--slide-w-manual` (280; 320 da 600), 9:16, `scroll-snap-align: start`, `scroll-padding-inline: --gutter` |
| Dentro la slide | padding `--slide-pad` (24; 32 da 900), contenuto centrato in verticale con gap 10; Pallo da 96 (`--pallo-slide`) sopra l'occhiello |
| Fra le slide | `--slide-gap` 12 |
| La Storia | tre PNG 9:16 larghi `--story-w` (160; 216 da 900), raggio `--radius-card`. Aperti a ventaglio: −8° · 0° · +8° (`--story-tilt`), quelli ai lati spostati del 62% della larghezza, il centrale davanti. Fermi: affiancati, gap 12, nessuna rotazione |

---

## L6. Raggi e forme

La grammatica dell'app (§6.3) resta: **capsula = si preme, rettangolo arrotondato = contiene, cerchio = identità o risultato.**

| Oggetto della landing | Raggio | Token |
|---|---|---|
| Card, gruppo di righe, riquadro della mappa, slide, Storia | 22 | `--radius-card` |
| Menu della guida, foglio d'installazione, pannelli della demo | 34 | `--radius-sheet` |
| Voci del ＋ in #registra | 20 | `calc(--radius-row + --space-1)`, come `.ui-menu-opt` |
| Riquadro dell'icona di una voce | 13 | `--radius-track`, come `.ui-menu-ico` |
| Nuvoletta di Pallo e bolle della chat | 20, con l'angolo verso chi parla a 6 | `--bolla-r`, `--bolla-r-coda` |
| Pulsanti, capsula, lente, risposte rapide, pastiglia del set | capsula | `--radius-capsule` |
| ＋ (sotto i 600), «Ferma le animazioni» nell'hero, −1 della demo, Pallo, pin | cerchio | 50% |
| Schermo e cornice del telefono | 0.1214 × larghezza; + cornice | `--phone-screen-r`, `--phone-r` |
| Barra vinte/perse, binario dell'avanzamento | metà dell'altezza (4, 1) | — |

Le slide **non** sono capsule e il telefono non è una card: è un oggetto, con il raggio di un telefono.

---

## L7. Elevazione e ombre

Come nell'app: **il contenuto non ha ombre**, l'ombra è di ciò che galleggia ed è tinta d'inchiostro, mai nera.

| Che cosa | Ombra |
|---|---|
| Capsula, ＋ | `--elev-float` (app) |
| Lente | `--lente-elev`: il riflesso del vetro (`--glass-rim`) e `0 2px 8px -3px rgb(28 28 30 / .18)`, quello della pillola dell'app |
| Nuvoletta | `--elev-toast`, più il filo `--edge` |
| Menu della guida | `--elev-overlay` |
| Foglio d'installazione | `--elev-overlay` sotto i 600, `--elev-dialog` da 600 |
| «Ho già un account» | `--elev-glass` (app, il vetro posato nella pagina) |
| Telefono, slide, Storia, card, celle, mappa, Pallo guida | **nessuna** |

La Storia a ventaglio si stacca con un **taglio** del colore del fondo (`--story-keyline` 3px, come un adesivo), non con un'ombra. Pallo ha la sua ombra a ellisse negli umori in piedi (`ombra`). Da guida non ce l'ha: galleggia sulla pagina, non ci sta in piedi.

---

## L8. Bordi e superfici

| Elemento | Trattamento |
|---|---|
| **Campiture** | Piene, a tutta larghezza, taglio netto fra l'una e l'altra. L'hero ha la scena e il velo, il finale il sole. Nessun altro gradiente di fondo |
| **Card, gruppi di righe** (sulla carta) | `--surface`, filo 1px `--edge`, raggio 22, padding 16 (20 da 600). Righe alte almeno 56, separatori `--separator` rientrati fino al testo |
| **Righe di «Il diario resta tuo»** | A sinistra il riquadro dell'icona: 44, raggio 13, `--bg` col filo `--edge`, icona 20 `--ink`. Il titolo è `h3` a 600 16 `--text-strong`, il testo a 15/1.4 `--text-muted`. Niente chevron: non si toccano |
| **Voci del ＋** | Come `.ui-menu-opt` dell'app, ma **opache** (`--surface` + filo `--edge`): sotto non scorre niente. Partita live col riquadro arancio (`--accent`, filo `--accent-strong`, icona `--on-accent`) e il filo `--accent-edge`. **La voce scelta**: filo d'inchiostro da 2px (inset, la misura non cambia), il segno dei pannelli «noi» della Partita live. Non un riempimento d'inchiostro: §L13, A7 |
| **Chat** | Bolle di Pallo `--surface` col filo `--edge`, raggio 20/20/20/6. Bolle dell'utente `--accent` con l'inchiostro (5.97), raggio 20/20/6/20. Risposte rapide: capsule alte 44, `--surface` + filo `--edge`, 600 15 `--ink`, gap 8. I puntini di Pallo che scrive come in CreaChat (`--ink-3`) |
| **Demo** | Come `PartitaLive.css`: pannello «loro» `--surface` + filo `--edge`, pannello «noi» filo 2px `--ink`, raggio 34, alti `--live-panel-h` (168; 200 da 600). Numero `--type-live-num`. −1: cerchio 44 `data-material="frost"` (opaco, col riflesso: niente sfocatura), a 12 dall'angolo. Pastiglia del set: capsula alta 32, filo `--edge` |
| **Celle di #numeri** | Nessun riquadro: filetti `--rule` da 1px, in alto, in basso e al centro |
| **Slide** | Campitura della palette + `--slide-ring` |
| **Nuvoletta** | Opaca (`--surface` + `--edge`): porta testo su ogni fondo, anche scuro, e non conta nel budget del vetro |
| **«Ferma le animazioni»** | Nell'hero e nel footer (sul buio): cerchio 44, anello `--glass-clear-border` (bianco .38, 3.55), icona bianca. **Premuto** (`aria-pressed="true"`): cerchio bianco pieno, icona `play` color tramonto (19.11). Nel menu della guida (sul chiaro): capsula `neutral` dell'app con icona ed etichetta; premuto = la capsula d'inchiostro pieno con il bianco, la selezione delle chip dell'app |
| **Pulsanti** | Quelli di `Button.css`, importato così com'è: `filled`, `neutral`, `plain`, e il vetro chiaro sul buio (`data-material="glass-clear"` + `data-glass="clear"`). «Installa sul telefono» è un pulsante di testo con icona `download` 20: sul buio `--text`, sulla carta `--ink` |
| **Anello di focus** | Quello di `base.css`: inchiostro sul chiaro, bianco dentro `[data-surface="dark"]`. Sui pulsanti arancio l'anello è fuori (offset 2), sul fondo: 15.72 sulla carta, 19.11 sul tramonto |

---

## L9. Il vetro sulla landing

### L9.1 Che cosa è vetro, e che cosa no

| Superficie | Materiale | Conta |
|---|---|---|
| Capsula sulla carta | `glass-regular` dell'app (bianco .32, `blur(10px) saturate(180%) brightness(1.05)`), **senza ritocchi** | 1 |
| Capsula sul buio | `glass-dark` dell'app (inchiostro .66, `blur(24px) saturate(160%)`), senza ritocchi | 1 |
| Lente | **niente vetro**: pillola `--lente-bg` (bianco pieno) col riflesso e l'ombra, uguale sul chiaro e sul buio | 0 |
| «Ho già un account» (hero) | `glass-clear`, come il Benvenuto | 1 |
| Menu della guida | `glass-thick` (.92) | 1, solo aperto; mai nell'hero |
| Foglio d'installazione | `glass-thick`; velo `--scrim` senza sfocatura | 1, solo aperto. La barra sta sotto il velo, `inert` |
| ＋, Pallo, nuvoletta, «Ferma le animazioni», −1, telefono, slide, Storia, card, avanzamento | opachi (il −1 è `frost`) | 0 |

### L9.2 La capsula: due materiali, inchiostro pieno

- **Il materiale lo sceglie il fondo che le passa sotto**, a soglia (UX LC7): la sezione che contiene la linea mediana della capsula. `data-fondo="scuro"` vuol dire `glass-dark`, altrimenti `glass-regular`.
- **Due strati, uno visibile.** Dentro la capsula ci sono due livelli, uno per materiale (`data-material="glass-regular"` e `data-material="glass-dark"`). Al cambio di soglia si scambiano l'**opacità** in SVELTO; chi esce passa a `visibility: hidden` a fine corsa. Il raggio della sfocatura e il colore non si animano mai. Nei 180ms del passaggio i livelli sfocati sono due: è il caso peggiore contato in §L9.3. Fermo: lo scambio è istantaneo.
- **Le tab spente sono d'inchiostro pieno**: `--on-glass` sul chiaro (4.56 sopra il numero della demo sfocato), bianco sul buio (6.10 sopra il bianco pieno). L'inchiostro al 78% dell'app lì scende a 3.39.
- **La tab accesa**: la lente bianca piena, con icona ed etichetta `--lente-label` (`--accent-text`, 5.18 sempre). Lo stato si legge dalla forma (la lente), dal colore e dalla differenza di luminosità fra accesa e spenta (3.29).
- **Che cosa non deve passare sotto la capsula chiara**: un testo d'inchiostro che copra più dell'80% (oltre i 112px a 800 o i 96 a 900), e un blocco d'inchiostro pieno più alto di 16px. Per questo il numero da manifesto sta sull'inchiostro, e la voce scelta del ＋ ha un filo e non un riempimento.

### L9.3 Il budget, stato per stato

Il conteggio è quello di `?audit` in `docs/motion/_lab.js`: elementi visibili con `backdrop-filter` diverso da `none`.

| Stato | Superfici sfocate |
|---|---|
| Hero | capsula + «Ho già un account» = **2** |
| Uscita dall'hero (180ms, la capsula cambia materiale) | 2 strati della capsula + «Ho già un account» = **3**, il caso peggiore |
| Qualunque sezione, a riposo | capsula = **1** |
| Menu della guida aperto | capsula + menu = **2** |
| Menu → foglio | il menu passa a `frost` a `t0` (MOTION §3.4): capsula sotto il velo + foglio = **2** |
| Foglio aperto | foglio = **1** (la barra è sotto il velo) |

---

## L10. Iconografia e immagini

### L10.1 Le icone

Sono quelle dell'app (`src/components/ui/Icon.tsx`): griglia 24, tratto arrotondato, `currentColor`, nessuna icona piena tranne quelle che l'app ha già. Sulla landing arrivano come SVG **generati** dalla stessa sorgente (`⟂ E`, come Pallo), non ridisegnati.

| Misura | Tratto | Dove |
|---|---|---|
| 24 (23 nella barra, come la TabBar) | 2 | tab della barra |
| 28 | 2.6 | il ＋ |
| 20 | 2.1 | pulsanti, voci del ＋, righe dei dati, fatti della demo, comandi |
| 16 | 2.4 | in linea nei meta |

| Dove | Icone |
|---|---|
| Barra | Diario `book` · Live `clock` (quella di «Partita live» nel ＋ dell'app) · Numeri `chart` · Wrapped `sun` (il sole è il motivo della stagione, §10.1) · ＋ `plus` |
| Voci del ＋ | `clock` · `trophy` · `bolt` · `chat-dots`: quelle di `ModalHost.tsx` |
| Fatti della demo (UX §L12.6, uno per riga) | `volley` (set, scarto, cambio campo) · `trophy` (in torneo o tra amici) · `phone` (schermo acceso) · `refresh` (la partita resiste al refresh) · `bolt` (vibrazione) |
| Righe dei dati | `shield` (permessi) · `lock` (foto private) · `link` (condividi) · `pin` (chi c'è oggi) · `chart` (statistiche) · `map` (chi altro sente) · `info` (questa pagina) |
| Comandi | `download` (installa) · `pause` / `play` (ferma le animazioni) · `arrow-up` (torna su) · `close` (×) |

**Due icone nuove**, da aggiungere a `PATHS` in `Icon.tsx` (`⟂ E`), così l'app le ha se un giorno le vuole:
- `pause`: `M9 6v12M15 6v12`;
- `play`: `M8 5.5v13l10.5-6.5z` (tratto arrotondato, nessun riempimento).

Mai: emoji come icone, icone in un cerchio pastello, icone colorate a parte il ＋ e la tab accesa.

### L10.2 Il marchio

- È `BrandMark` dell'app: il pallone bianco con la fascia arancio. **Nudo** sul buio (hero, footer, slide d'inchiostro), **nella tessera d'inchiostro** sulla carta (la barra in alto da 900px). Raggio della tessera = 26% del lato.
- **Misure**: 28 nell'hero e nel footer, 32 nella barra in alto. Il wordmark «Beach Diary» è 700, tracking −0.02em, 17px accanto al 28 e 18 accanto al 32, nell'inchiostro del fondo.
- **Icone PWA e favicon** (`⟂ I`, risposta 3 dell'utente): il pallone nudo su una tessera d'inchiostro `#1C1C1E` a tutto campo (il sistema arrotonda da sé), col pallone in proporzione:
  - `apple-touch-icon` 180 e `icon` 192/512: diametro del pallone 62% del lato;
  - `maskable` 512: 56%, dentro la zona sicura (il cerchio dell'80%);
  - favicon SVG: la tessera col raggio 26% e il pallone al 72%, come `index.html`.

  Il manifest passa a `#F6F6F4` (`theme_color`, `background_color`).

### L10.3 Pallo

| Dove | Misura | Umore | Note |
|---|---|---|---|
| Hero | 128 (`--pallo-hero`); 240 da 900 | `saluta`, `segui` | in piedi sulla sabbia, con l'ombra |
| Guida | 64 (56 sotto i 360) | quello della sezione (UX §L12.4) | senza ombra |
| Chat | 38 (`soloTesta`) | `pensa` → `contento` | come CreaChat |
| Demo | 80 | da `battuta()` | senza ombra, come PartitaLive |
| Slide | 96 | `umoreSlide` | mani bianche sulla slide arancio (`palette.ts`, `mani`) |
| Foglio d'installazione | 72 | `sbircia` | dal bordo alto, come il consenso |
| Finale | 160; 240 da 900 | `cuori` → `festa` | in piedi sull'orizzonte, davanti al sole |

Pallo non si ricolora, non si ridisegna e non si deforma. I 14 umori arrivano dallo snapshot di `Pallo.tsx` (`⟂ E`).

### L10.4 La scena

È la scena del Benvenuto, uguale: stesso disegno (lo snapshot di `Login.scena.tsx`, `⟂ E`), stessi colori, stesso palleggio (`avviaPalleggio`). Sulla landing ha in più il parallasse dell'uscita (§L11.3). Sotto il testo c'è sempre il velo (`--hero-velo`, §L4.8), attaccato al blocco del testo e non alla scena: parte 96px sopra il titolo e vale a qualunque altezza e a qualunque a capo.

### L10.5 Le schermate del telefono

- Dall'anteprima (`docs/preview`) con i dati di prova, a 390×844 @2x, salvate in **WebP 780×1688**, qualità 82, ≤ 120 KB l'una (UX §L13).
- **Data fissata** a un giorno di ottobre (Wrapped esiste solo allora), tile caricate, **attribuzione © OpenStreetMap visibile**.
- **Nessuna cornice dentro l'immagine** (la cornice è CSS), niente barra di stato finta («9:41», batteria), nessun ritocco: è l'app com'è.
- Quattro schermate, una per capitolo: Home, Tornei · Mappa, Diario, Compagni. Chi le prepara scrive quale consiglio di Pallo si vede nella Home (UX §L12.4).

### L10.6 La Storia

I tre PNG veri (Tabellone, Foto, Polaroid) nelle tre palette, esportati da `StoryModal` col dataset di prova, in **WebP 540×960** (il doppio dei 216 di `--story-w` da 900px), qualità 82.

### L10.7 La mappa disegnata

Un SVG della costa romagnola, schematico: due campiture (`--map-land`, `--map-sea`), la linea di costa come confine fra le due (nessun filo in più), nessun rilievo, nessuna strada. Le etichette delle città sono quelle di §L4.6, i pin quelli della Mappa vera (§L4.6). La didascalia dice che è un'illustrazione (UX §L12.7).

### L10.8 L'anteprima social (`og:image`, `⟂ I`)

1200×630 PNG, la composizione dell'hero da 900px: tramonto, la scena a destra (il panorama), il velo laterale, «Ogni partita, nel tuo diario.» in Geist 800 da 76, tracking −0.045em, bianco, su due righe a 88 dal bordo sinistro, il marchio nudo da 48 sopra il titolo, Pallo `saluta` da 300 in piedi sulla sabbia. Nessun altro testo: le piattaforme ci scrivono già il titolo sotto.

### L10.9 Mai

Foto di repertorio, persone disegnate (a parte le sagome della scena), oggetti 3D, telefoni in prospettiva, illustrazioni nuove, macchie di gradiente, emoji come illustrazione. **Le illustrazioni della landing sono tre: la scena, Pallo, la mappa.** Più il sole del finale, che è un pezzo della scena.

---

## L11. Movimento

Questa sezione fissa il **linguaggio**: che cosa si muove, con che curva e che cosa resta fermo apposta. Le coreografie passo per passo, le soglie e le eccezioni scritte stanno nel paragrafo «Landing (`/presentazione`)» di MOTION.md (`⟂ M`), che parte da qui e da UX §L11.

### L11.1 Il principio

**Una cosa si muove per uno di tre motivi: l'hai toccata, lo scroll racconta, Pallo è vivo.** Niente si muove solo perché è entrato in vista. Il testo c'è dal primo fotogramma, e il movimento si aggiunge alla pagina, senza farla aspettare.

### L11.2 Il vocabolario

Le curve sono quelle dell'app. Nessuna curva nuova in CSS. In JS (Motion `animate`) la landing aggiunge due molle:

| Nome | Valore | Per cosa |
|---|---|---|
| SVELTO | `--dur-svelto` 180ms, `--ease-standard` | opacità, uscite, il cambio di materiale della capsula, la nuvoletta che sparisce |
| ENTRATA | `--dur-entrata` 260ms, `--ease-standard` | comparse: la nuvoletta, lo schermo nuovo del telefono (dissolvenza) |
| MOLLA | `--dur-molla` 320ms, `--ease-molla` (460/38/0.9) | ciò che si sposta: Pallo che entra dal bordo, il ＋ che si apre, il ventaglio della Storia |
| PRESSIONE | `--dur-press` 400ms, `--ease-press` | la pressione su capsule e pulsanti (`.press`), il pop del punteggio della demo |
| SALITA | `--dur-rise` 600ms, `--ease-rise`, 12px, passo 50ms | le voci del ＋ quando si apre, le bolle della chat |
| Lente | `--dur-rise` 600ms, `--ease-press` | la lente che scivola: la stessa transizione della TabBar dell'app |
| RACCONTO | `--dur-racconto` 800ms, `--ease-racconto` | i numeri che salgono (`Odometro`), la barra vinte/perse in `translateX` |
| RESPIRO | `--dur-respiro` 1400ms | i puntini di Pallo che scrive |
| **SALTO** (nuovo, JS) | molla stiffness 300, damping 26, mass 1 (ζ 0.75, ~3% oltre il segno) | Pallo che salta dall'hero all'angolo (FLIP) |
| **CADUTA** (nuovo, JS) | molla stiffness 500, damping 24, mass 1 (ζ 0.54, un rimbalzo) | i pin che cadono sulla mappa, da −24px |
| Sfalsamento narrativo | `--stagger-narrativo` 50ms, al più `--stagger-max` 8 elementi | pin, bolle della chat, ventaglio: in tutto ≤ 50 × 7 + 320 = 670ms |
| Nuvoletta | `--dur-bolla` 4000ms | quanto resta una battuta (come `TOAST_MS`) |

### L11.3 Che cosa si anima

Solo `transform` e `opacity` (più `visibility` a fine uscita).

| # | Che cosa | Come | Fermo |
|---|---|---|---|
| LM1 | Uscita dall'hero | scroll legato, dall'inizio della sezione al suo fondo: cielo `translateY` × 0.5 dello scroll, sole e alone × 0.6 (scende dietro il mare, che nel disegno sta sopra), mare e barca × 0.3, sabbia, palma, rete e giocatori fermi con la pagina | fermo, fotogramma `FERMO` |
| LM2 | Pallo nell'angolo | FLIP con SALTO, dalla posizione nell'hero a quella della guida, al primo passaggio della sessione | dissolvenza in ENTRATA |
| LM3 | Schermo del telefono | a soglia, dissolvenza in ENTRATA dello schermo nuovo sopra quello vecchio | scambio istantaneo |
| LM4 | Il ＋ che si apre | a soglia, una volta: `scale(.96 → 1)` + `translateY(12px → 0)` + opacità in MOLLA, con l'origine sull'icona ＋; le voci con la SALITA | già aperto |
| LM5 | Pin | a soglia, una volta: CADUTA da −24px, sfalsati di 50ms, da nord a sud, al più 8 | già posati |
| LM6 | Bolle della chat | dopo il tocco: la pausa `battitura(n)` coi puntini (RESPIRO), poi la SALITA | pausa 0, niente puntini |
| LM7 | Numeri | a soglia, una volta per sessione: `Odometro` in RACCONTO; la barra cresce in `translateX` dentro il binario | valori finali |
| LM8 | Slide | scroll legato, `translateX` lineare (lo scroll è la curva) | la riga a mano |
| LM9 | Storia | a soglia, una volta: ventaglio in MOLLA, sfalsato di 50ms | già aperta |
| LM10 | Pallone dell'avanzamento | scroll legato: `translateX` sul binario e `rotate` = distanza ÷ (π × diametro) × 360°, cioè rotola senza strisciare | non c'è |
| LM11 | Capsula | lente: transizione della TabBar; materiale: scambio di opacità in SVELTO | lente a scatto (`transition: none`), materiale istantaneo |
| — | Pressione | `.press` dell'app su pulsanti, voci, risposte, pannelli della demo | niente scala, resta lo strato |
| — | Pop del punteggio | `live-pop` dell'app: scala 1.16 e ritorno, PRESSIONE | cambio istantaneo |
| — | Pallo | la vita di `Pallo.vita.ts`: sguardo, ammiccare, gesti, sonno; solo in vista e a scheda visibile | fermo nell'umore |
| — | Nuvoletta | ENTRATA in comparsa con `translateY(6px × --motion-scale)`, SVELTO in uscita | sola opacità |
| — | Menu e foglio | quelli dell'app (MOTION §4.2): MOLLA, origine sul centro di Pallo; uscita SVELTO con `frost` a `t0` | dissolvenza |

### L11.4 Che cosa NON si anima, di proposito

- **I titoli e i paragrafi.** Niente parole che salgono una alla volta, niente testo che si «scrive», niente gradiente che scorre sul titolo. L'`h1` è l'elemento LCP e c'è dal primo fotogramma.
- **Le sezioni che entrano.** Niente dissolvenza dal basso a ogni blocco che entra in vista: è il segno del template. Si muove solo ciò che sta nella tabella sopra.
- **Le campiture e i loro tagli**: il colore del fondo non sfuma da una sezione all'altra.
- **La sfocatura, i colori, le ombre, i raggi, le altezze.** Il vetro cambia solo in opacità.
- **Lo scroll stesso**: niente `scroll-behavior: smooth` globale, niente scroll-snap verticale, niente scroll dirottato. I salti dalla barra sono istantanei (UX §L4.2).
- **La barra**: non si nasconde scorrendo, e il ＋ non ruota in ×.
- **Il cursore**: niente cursori personalizzati, niente pulsanti «magnetici», niente scie.
- **All'apertura**: niente preloader, niente animazione d'ingresso della pagina, niente schermata di benvenuto.
- **Video e Lottie**: nessuno.
- **Numeri al ritorno**: salgono una volta per sessione, poi stanno fermi.
- **L'anello di focus**: compare istantaneo.

### L11.5 Due interruttori, un solo stato fermo

`prefers-reduced-motion: reduce` **oppure** `<html data-movimento="fermo">` («Ferma le animazioni»). Il foglio dei token ripete per il secondo i valori del primo (`--motion-scale: 0`, `--press-scale: 1`, `--dur-racconto: 0ms`, `--dur-respiro: 0ms`), e il test controlla che coincidano. Le animazioni infinite (scena, Pallo) vanno spente **anche** sotto `:root[data-movimento="fermo"]`: i fogli dell'app che la landing importa (`Pallo.css`, `Login.scena.css`) le spengono solo con la media query (`⟂ M`, `⟂ C`).

---

## L12. Il livello dei token: come si usa

| File | Che cosa | Chi lo legge |
|---|---|---|
| `src/styles/tokens.css` | i token dell'app e l'ordine dei `@layer` | importato **per primo** dalla landing |
| `src/styles/base.css`, `src/styles/materials.css` | reset, focus, `.rise`, `.press`; il vetro e `[data-surface="dark"]` | importati dopo, così come sono |
| `src/components/ui/Button.css`, `src/components/ui/Tabellone.css`, `src/components/Pallo.css` (e `Login.scena.css`, `⟂ E`) | primitive dell'app in CSS puro, nel livello `components` | importati dalla landing: i pulsanti sono `.ui-button` veri, non copie |
| **`presentazione/styles/tokens.css`** | i token della landing: scala da manifesto, campiture, ruoli del testo, velo dell'hero, capsula, telefono, slide, mappa, sole, movimento, livelli, la riserva metrica di Geist, i fondi scuri, il fermo | importato **dopo** i fogli dell'app, prima dei fogli dei componenti della landing |
| `presentazione/styles/*.css` (`⟂ C`) | i componenti della landing, tutti in `@layer components` | leggono **solo** `var(--…)`: nessun colore letterale |
| `src/styles/landing.tokens.test.ts` | 59 test (§L4.8 e sotto) | `npm test` |
| `vitest.config.ts` | `css.include` ha in più il solo `presentazione/styles/tokens.css` | perché il test lo legga con `?raw` |

**Regole d'uso.**
1. Nei componenti della landing ci sono **solo token**. I colori letterali stanno nel foglio dei token e solo nei nomi `--map-*`, `--slide-*`, `--sole-*`, `--riflesso`, `--horizon`, `--lente-*` e `--rule`, e il test lo controlla.
2. Il foglio dei token **aggiunge**. L'unico nome dell'app ridefinito sul `:root` è `--font-ui`, più il blocco `[data-movimento="fermo"]`: il test fallisce se se ne aggiunge un altro. Se serve un valore diverso dall'app, si crea un ruolo nuovo (com'è stato per `--text-accent`).
3. I ruoli del testo (`--text-strong`, `--text`, `--text-muted`, `--text-accent`, `--rule`) si risolvono sul `:root`. Una sezione scura porta `data-surface="dark"`, e i ruoli si invertono da soli. **Non** si scrive `--ink` in un componente della landing che può finire su un fondo scuro: si scrive il ruolo.
4. Le sezioni portano anche `data-fondo="chiaro|scuro"`, per la capsula (UX LC7). Una sezione scura ha tutti e due gli attributi.
5. Le media query non leggono le custom property: i breakpoint si scrivono come numeri, sempre quei quattro (360 · 600 · 900 · 1280).
6. **Cambiare un token** vuol dire cambiare insieme il foglio, questa parte e i numeri fissati nel test. Il test cade apposta.

---

## L13. Dove questa parte corregge UX.md

UX.md vince sul comportamento, questa parte sull'aspetto. Ecco i punti in cui si sovrappongono, ognuno col suo motivo.

| # | UX.md Parte L dice | Qui | Perché |
|---|---|---|---|
| A1 | `#numeri` su fondo chiaro, «tre card come in Home» (§L3.2, §L6.5, §L7.7) | Campitura **d'inchiostro**: il numero da manifesto bianco col «%» arancio e le **celle del tabellone** (la grammatica delle celle della slide d'inchiostro), invece delle card bianche. Le etichette restano quelle della Home | La Home vera con le sue card è già nello schermo del capitolo 1. Un «66%» da 128–160 sotto il vetro chiaro va sotto AA (3.36–3.85), sull'inchiostro regge (6.57). La pagina ha bisogno di un cambio di registro a metà |
| A2 | `#wrapped` «misto»: la capsula cambia materiale per slide (§L3.2, §L6.7) | Campitura d'inchiostro per tutta la sezione. Le slide sono tessere che, bloccate, finiscono **sopra** la capsula (§L5.7) | A riposo nessuna slide passa sotto il vetro, quindi la capsula non lampeggia a ogni slide. Prima e dopo il blocco, il vetro scuro regge anche sull'arancio (10.79) e sul bianco (6.10) |
| A3 | Pin coi colori dei dati `--data-win` · `--data-podium` · `--data-rest` (§L6.6) | I pin di **ConquisteMap**: `--accent` · `--surface` · `--line-strong`, alone bianco 3px e filo d'inchiostro | La mappa disegnata deve dire la stessa cosa della mappa vera nello schermo del capitolo 2 |
| A4 | Capsula: «una variante scura scelta a soglia», lente «tinta, filo di luce e ombra» (LC7, LC8) | Variante scura = `glass-dark` dell'app, quella chiara = `glass-regular` dell'app, senza ritocchi. Le tab spente sono d'inchiostro pieno. La lente è una pillola **bianca piena**, uguale sui due materiali | L'inchiostro al 78% delle tab dell'app fa 3.39 sopra i numeri della demo; quello pieno 4.56. Una lente piena regge l'arancio (5.18) su ogni fondo |
| A5 | La lente si sposta in MOLLA (§L4.1) | La transizione della TabBar dell'app (`--dur-rise` + `--ease-press`) | La stessa barra si muove allo stesso modo nei due posti (`⟂ M` conferma) |
| A6 | «Ferma le animazioni» nell'angolo in basso a sinistra della scena; vetro `glass-clear` oppure opaco (§L7.4, §L10) | In fondo al blocco dell'hero, sulla **riga dei comandi** a destra di «Installa sul telefono». Opaco: un anello bianco .38 | La riga esiste sempre (alta 44), quindi il posto del pulsante d'installazione è riservato senza un buco. L'ordine del Tab coincide con quello visivo. Nell'hero il vetro resta a 2 |
| A7 | Le voci del ＋ come tablist; la scelta non ha un disegno (§L7.9) | Voce scelta = filo d'inchiostro da 2px, come il pannello «noi». Non la pillola d'inchiostro piena delle chip | Un blocco d'inchiostro pieno alto 72 sotto il vetro chiaro coprirebbe il 100%: le tab andrebbero a 3.0 |
| A8 | Lo schermo del telefono cambia quando un capitolo passa la linea del 50% (§L7.5) | Sotto i 900px la linea è al **72%** dell'altezza; dai 900px resta al 50% | Sul telefono la cornice occupa il 56% in alto: la linea del 50% è dietro la cornice, e lì il testo non c'è |
| A9 | Riga piccola dell'hero (non specificato) | Bianco .82 (`--text`), non .66 | Sopra la scena, col velo al 72%, il .66 sta al filo (4.57) e il .82 regge con margine (6.04) |
| A10 | Finale scuro «PUÒ», footer `⟂ A` (§L3.2) | Finale e footer sul tramonto: **DEVE**. Il bordo del footer è l'orizzonte del sole del finale | È la mossa firmata 1 (§L2.4) |
| A11 | −1 della demo «`frost` o opaco» (§L10) | `frost` | Il riflesso del vetro senza la sfocatura: si riconosce come il −1 di vetro dell'app |
| A12 | Il contenuto decorativo «PUÒ» essere inserito nell'HTML in build (§L13) | Consigliato per la scena e per il Pallo dell'hero | Il primo fotogramma è la scena: con l'hero vuoto finché il modulo non parte, il primo colpo d'occhio sarebbe un rettangolo scuro (GL1) |

---

## L14. Il test «landing da template»

Prima di chiudere una sezione, chi la costruisce la confronta con questa lista. Un solo sì vuol dire rifarla.

- [ ] C'è una griglia di funzioni con un'icona sopra ogni titolo?
- [ ] Un blocco sale in dissolvenza solo perché è entrato in vista?
- [ ] Il telefono è inclinato, in prospettiva, con un'ombra o un riflesso?
- [ ] C'è un gradiente, una macchia o un'onda fra due sezioni?
- [ ] Ci sono due CTA arancio nella stessa schermata (oltre al ＋ della barra)?
- [ ] C'è testo bianco sull'arancio, o arancio-testo sul buio?
- [ ] Un testo da leggere sta sotto i 15px, o un'etichetta sotto i 10.5?
- [ ] Sulla carta c'è un testo d'inchiostro oltre i 112px a 800 (o i 96 a 900), o un blocco d'inchiostro pieno più alto di 16px?
- [ ] Ci sono più di 2 superfici sfocate a riposo, o un vetro con niente che ci scorre sotto?
- [ ] C'è un colore, una misura o una durata scritti a mano in un foglio di componente?
- [ ] C'è un'illustrazione che non è la scena, Pallo o la mappa?
- [ ] Ci sono due Pallo che parlano nella stessa schermata?
- [ ] Il titolo o il paragrafo aspettano il JavaScript per comparire?
- [ ] Un'icona è un'emoji, o sta in un cerchio pastello?
- [ ] Una slide, una cifra o una regola della demo è diversa da quella dell'app?

---

## L15. Seam per i ruoli successivi

| Seam | Che cosa | Riferimento |
|---|---|---|
| **⟂ M** | Il paragrafo «Landing (`/presentazione`)» di MOTION.md: LM1–LM11 coi valori di §L11.3, le molle SALTO e CADUTA, lo sfalsamento narrativo (50ms, ≤ 8), lo scambio di materiale della capsula (due strati, opacità, SVELTO), `:root[data-movimento="fermo"]` che spegne **anche** le animazioni infinite di `Pallo.css` e della scena (lì oggi c'è solo la media query) | §L11 |
| **⟂ E** | Generare anche le icone (le stesse `PATHS` di `Icon.tsx`) come si fa per Pallo; aggiungere `pause` e `play` a `Icon.tsx` | §L10.1 |
| ⟂ E | Lo snapshot di Pallo deve tenere la prop `mani` (bianche sulla slide arancio) | §L10.3 |
| **⟂ C** | Import nell'ordine di §L12; `data-surface="dark"` + `data-fondo` sulle sezioni di §L4.2; i ruoli del testo invece di `--ink`; il velo come `::before` del blocco del testo (`inset: calc(-1 * var(--hero-velo-rise)) calc(-1 * var(--gutter)) …`); la capsula a due strati; la riga dei comandi dell'hero; la fascia sticky del telefono; le voci del ＋ con il filo da 2px | §L5, §L8, §L9 |
| ⟂ C | Le composizioni di §L5.4, la griglia di §L5.3; la lista di §L14 prima di chiudere ogni sezione | §L5, §L14 |
| **⟂ I** | Schermate WebP 780×1688 q82 (§L10.5), Storia 540×960 (§L10.6), icone PWA e favicon (§L10.2), og:image (§L10.8), manifest `#F6F6F4` | §L10 |
| **⟂ QA** | `src/test/landing.test.ts` deve **escludere** `presentazione/styles/tokens.css` dal controllo «niente colori letterali» (lì i letterali sono ammessi e già controllati da `landing.tokens.test.ts`). `docs/qa/landing.mjs`: il conteggio del vetro di §L9.3 compreso il passaggio di 180ms all'uscita dall'hero; la capsula nei due materiali; `fontcls.mjs` sulla landing | §L9.3, §L12 |
| ⟂ QA | Su un iPhone vero: la lente bianca sul vetro chiaro (si vede come forma?), il velo dell'hero al sole, la riserva metrica (in Safari si vede Arial per un istante, ma senza salti) | §L3.1, §L9.2 |
