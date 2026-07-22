# QA — Suddivisione tornei per formato

Verifica della schermata **Tornei** dopo l'introduzione del raggruppamento per
formato e del filtro a chip (commit `08135cd`, `fbfc3a0`).

| | |
|---|---|
| Ambito | `src/screens/Tornei.tsx`, `src/lib/derive.ts` (helper lista tornei), `src/components/ui.tsx` (`FilterChips`), `src/index.css` (focus) |
| Ambiente | Node 22 · Vitest 3.2.7 · jsdom 26 · Testing Library React 16 · axe-core 4.12 |
| Suite | 78 test: 74 verdi + 4 `skip`, che sono la riproduzione eseguibile dei difetti #1, #2, #4, #5 (verificati falliti togliendo lo `.skip`) |
| Comandi | `npm test` · `npm run typecheck` · `npm run typecheck:test` · `npm run build` |

Tutti e quattro i comandi passano.

## Cosa è stato verificato

**Regole del data layer** (`src/lib/derive.tornei.test.ts`, 29 test) — funzioni
pure con `today` iniettabile, nessun mock dell'orologio:

- `splitUpcoming` — confine `date >= today`: un torneo **di oggi è imminente**,
  non passato; ordine in ingresso preservato; input non mutato.
- `torneiFormats` — ordine fisso di `FORMATS` anche con dati in ordine inverso;
  nessun duplicato; formati assenti omessi; un formato fuori da `FORMATS`
  (`1vs1`) finisce in coda invece di sparire dalla pagina.
- `groupTorneiByFormat` — nessun gruppo vuoto, ordine "agenda" preservato dentro
  al gruppo, nessun torneo perso.
- `deriveTorneiSections` — imminenti in cima e mai duplicati nel gruppo del loro
  formato; opzioni calcolate su *tutti* i tornei (restano disponibili anche a
  filtro attivo); nessuna opzione con un formato solo; filtro non valido o
  inventato → fallback su "Tutti"; lista vuota; solo futuri; solo passati.

**Schermata** (`src/screens/Tornei.test.tsx`, 43 test) — sezioni e ordine dei
titoli, contatori con singolare ("1 torneo") e plurale, empty state, filtro
(stato iniziale, `aria-pressed` su tutte le chip, riclic sulla chip attiva,
ritorno a "Tutti", filtro applicato anche a "Prossimi tornei"), apertura della
card giusta anche dopo il filtro, badge "Condiviso", Invio/Spazio da tastiera,
ordine di tabulazione, gerarchia dei titoli, tre scansioni axe (dati completi,
empty state, filtro attivo) senza violazioni.

**Contrasto** (`src/test/contrast.test.ts`, 6 test) — calcolato sui colori veri:
axe non può misurarlo in jsdom (niente layout, niente canvas).

**Non copribile in automatico qui:** rendering cross-browser, scroll orizzontale
reale, resa con screen reader. Serve un browser vero (Playwright) o una verifica
manuale — vedi *Da verificare a mano*.

---

## Difetti

### #1 — Il sottotitolo della pagina non segue il filtro · media

**Riproduzione** — `Tornei.test.tsx`, `it.skip('il sottotitolo si accorda con il filtro attivo')`

1. Account con 3 tornei di formati diversi.
2. Aprire **Tornei**, cliccare la chip `3vs3`.

**Atteso** — l'intestazione descrive ciò che si vede sotto.
**Osservato** — il sottotitolo resta `3 tornei · 1 podi · miglior piazzamento 1° 🏆`
mentre in pagina c'è una sola card. L'intestazione contraddice il contenuto.

**Causa** — `tPlayed`/`podi`/`bestPlacement` arrivano da `TorneiListData`,
calcolati in `derive.ts:481` prima e indipendentemente dal filtro, che vive nello
stato di `Tornei.tsx:19`.

**Nota** — si somma al problema già segnalato come fuori scope nel piano:
`tPlayed` è calcolato su `yearT` (filtrato per anno) mentre le card vengono da
`data.tournaments` (non filtrato), quindi il sottotitolo era già disallineato
rispetto alla lista. Una correzione dovrebbe sistemare entrambe le cose insieme.
Da decidere se il sottotitolo debba restare un totale (e allora renderlo
esplicito, es. "su 3 totali") o seguire il filtro.

### #2 — Un filtro scartato si riattiva da solo · bassa

**Riproduzione** — `Tornei.test.tsx`, `it.skip('un filtro scartato non si riattiva da solo quando il formato ritorna')`

1. Filtrare su `4vs4`.
2. Far sparire dai dati l'ultimo torneo `4vs4` (`list` aggiornata senza smontare
   lo screen). La pagina ricade correttamente su "Tutti".
3. Far ricomparire un torneo `4vs4`.

**Atteso** — resta "Tutti": l'utente non ha cliccato niente.
**Osservato** — la pagina si rifiltra da sola su `4vs4`.

**Causa** — `Tornei.tsx:19` tiene `format` nello stato, `deriveTorneiSections`
ricalcola `active` ad ogni render (`derive.ts:473`). Il fallback su "Tutti" è
un valore derivato, non un reset: lo stato continua a contenere `4vs4`.

**Impatto reale limitato** — oggi lo screen si smonta quando si naviga altrove,
quindi la sequenza è raggiungibile solo se `list` cambia mentre si è fermi sulla
pagina. Diventa concreta se in futuro la lista si aggiorna in tempo reale.

**Correzione suggerita** — far restituire a `deriveTorneiSections` anche il fatto
che il filtro è stato scartato, e resettare lo stato (`setFormat`) quando accade;
oppure spostare il reset in un `useEffect` sulle `options`.

### #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione)

I due `SectionCount` di `Tornei.tsx:93` riusano **esattamente** le coppie di
colori già in uso nel progetto, quindi non introducono token nuovi — ma quelle
coppie non raggiungono il minimo WCAG AA 1.4.3 (4.5:1 per testo normale; a
12px/700 non vale la soglia "large text"):

| Elemento | Colori | Rapporto | Minimo | Esito |
|---|---|---|---|---|
| Contatore neutro (`2vs2 · 4 tornei`) | `rgba(27,42,74,.55)` su `#F2F0EC` | **3.34:1** | 4.5:1 | ✗ |
| Contatore "Prossimi tornei" | `#C4501E` su `#FFF1EA` | **4.21:1** | 4.5:1 | ✗ |
| *(rif.)* `Badge tone="neutral"` | stessi colori | 3.34:1 | 4.5:1 | ✗ preesistente |
| *(rif.)* badge piazzamento podio | stessi colori | 4.21:1 | 4.5:1 | ✗ preesistente |
| *(rif.)* meta card | `rgba(27,42,74,.55)` su `#fff` | 3.47:1 | 4.5:1 | ✗ preesistente |
| *(rif.)* `.lbl` | `rgba(27,42,74,.42)` su `#fff` | 2.46:1 | 4.5:1 | ✗ preesistente |

È un debito **sistemico del design system** (testo secondario a opacità 42–55%),
non di questa schermata. Va affrontato sui token, non caso per caso: portare
`MUTED` da `.55` a circa `.7` porterebbe la coppia neutra sopra 4.5:1.
`src/test/contrast.test.ts` fissa i valori attuali a numero, così un ulteriore
schiarimento fa fallire il test.

**Verificati OK** invece i colori davvero nuovi del filtro:
testo chip 14.22:1 in entrambi gli stati, riempimento navy della chip attiva
13.42:1 sullo sfondo pagina, contorno di focus 13.42:1 (l'`outline-offset: 2px`
lo disegna **fuori** dalla chip, quindi sullo sfondo crema e non sul navy — il
commento in `index.css:32-34` è corretto).

### #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente)

**Riproduzione** — `Tornei.test.tsx`, `it.skip('le azioni dell\'header sono raggiungibili e attivabili da tastiera')`;
l'ordine di tabulazione effettivo è fissato dal test `l'ordine di tabulazione è filtro → card`.

Tabulando sulla pagina Tornei si raggiungono, in quest'ordine: `Tutti`, `2vs2`,
`3vs3`, `4vs4`, poi le card. **Non** si raggiungono mai `✨ Assistente`,
`⚡ Rapido`, `＋ Nuovo torneo`, né `Crea il primo torneo →` nell'empty state.

**Causa** — `ui.tsx:52` `Button` renderizza un `<div className="chip" onClick>` e
`ui.tsx:146` `InlineLink` uno `<span>`: nessun `tabIndex`, nessun `role`, nessun
handler da tastiera.

**Perché segnalarlo ora** — il difetto è preesistente, ma questa modifica lo rende
incoerente *dentro la stessa pagina*: il filtro e le card sono componenti veri e
raggiungibili, le azioni primarie no. Da tastiera si può filtrare e aprire un
torneo, ma non crearne uno.

**Correzione suggerita** — trasformare `Button`/`InlineLink` in `<button
type="button">` con `background: none; border: none; font: inherit`. Tocca molte
schermate: va pianificato a parte, non dentro a questa modifica.

### #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media

**Riproduzione** — `Tornei.test.tsx`, `it.skip('la card espone anche il proprio contenuto, non solo l\'etichetta')`.
Verifica finale da fare con uno screen reader vero.

`Tornei.tsx:126-128` mette `role="button"` + `aria-label` sull'intera card. Nella
specifica ARIA il ruolo `button` è fra quelli con *children presentational*: i
discendenti escono dall'albero di accessibilità. Chi usa uno screen reader sente
quindi solo *"Apri il torneo Rimini Open, pulsante"* e perde categoria,
piazzamento, data, città, compagno e record — cioè tutto ciò che serve a
scegliere quale torneo aprire. Per chi vede non cambia nulla.

L'aggiunta di `tabIndex`/`role` è comunque un miglioramento netto rispetto a
prima (la card era un `div` con solo `onClick`: non raggiungibile affatto).

**Correzione suggerita** — mantenere la card come contenitore semplice e rendere
il **nome del torneo** un `<button>` vero (pattern "card con link primario"): il
contenuto resta leggibile e resta un solo stop di tabulazione per card. In
alternativa, togliere `aria-label` così che il nome accessibile si componga dal
contenuto: più prolisso, ma non si perde niente.

---

## Osservazioni minori

- **Spazio tenuto premuto** (`Tornei.tsx:130-134`): l'handler agisce su `keydown`,
  che in un browser vero si auto-ripete, mentre un `<button>` nativo si attiva su
  `keyup`. `onOpenTorneo` è idempotente (porta sempre allo stesso torneo), quindi
  nessun effetto visibile; da tenere presente se un giorno diventasse un'azione
  non idempotente.
- **Il contatore fa parte del titolo**: l'`h2` si annuncia come "2vs2 1 torneo".
  È voluto e coerente con il commento nel codice; verificato dal test
  `il contatore fa parte del nome accessibile della sezione`.
- **Nessuna regressione sulla dashboard**: `meta` non è stata toccata e
  `RecentTornei` ignora i campi aggiunti a `TorneoCard`. `npm run typecheck`
  copre entrambi i punti di costruzione (`decorateTournament`,
  `deriveTorneiListServer`), obbligatori per costruzione.

## Da verificare a mano (fuori dalla portata di jsdom)

jsdom non calcola il layout: le voci qui sotto **non sono state verificate**, non
sono note come rotte.

1. **Nessuno scroll orizzontale a 320px** — la suite presidia il
   `minmax(min(100%,300px),1fr)` della griglia e il `flexWrap: wrap` delle chip,
   che sono i due meccanismi che lo evitano, ma la misura vera serve un browser.
2. **A capo delle chip su schermo stretto** con tutti e tre i formati presenti.
3. **Screen reader** (VoiceOver/NVDA) sulla card — conferma del difetto #5.
4. **Entrambi i path dati**: con un torneo condiviso (`hasShared === true`) si usa
   `decorateTournament`, senza si usa la RPC `tornei_list`. Il raggruppamento
   deve essere identico; i test coprono le regole a valle, non il fatto che i due
   path popolino `format`/`date` allo stesso modo su dati reali.
5. **Contrasto in condizioni reali** (luce forte, schermo mobile) dei contatori
   del difetto #3.

## Come far girare la suite

```bash
npm test              # vitest run
npm run test:watch    # vitest in watch
npm run typecheck     # app (tsc -b): i test sono esclusi da tsconfig.app.json
npm run typecheck:test # test (tsconfig.test.json, con i globals di vitest)
```

I test non entrano nel bundle: `vitest.config.ts` è separato da `vite.config.ts`
e nessun modulo dell'app importa `src/test/`.
