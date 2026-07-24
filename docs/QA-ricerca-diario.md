# QA — Ricerca sul Diario

Verifica della **barra di ricerca del Diario**: un solo campo che interroga
tutto il diario — nome del torneo, città, categoria/formato/superficie/
piazzamento, data, compagni, avversari, **note delle partite** e didascalie
delle foto — e mostra, sotto la voce, *quale partita* ha risposto. Livello
presentazionale + data layer client (ruolo 1 della pipeline).

| | |
|---|---|
| Ambito | `src/lib/search.ts` (**nuovo**), `src/lib/derive.ts` (`DiaryEntry` estesa, `DiaryMatchHit`, `DiarySearchFields`, `deriveDiarySearch`), `src/screens/Diario.tsx`, `src/index.css`, `src/test/factories.ts` (`makeDiaryEntry`, `makeDiaryMatchHit`) |
| Ambiente | Node 24 · Vitest 3.2.7 · jsdom 26 · Testing Library React 16 · axe-core 4.12 |
| Suite | 267 test: 263 verdi + 4 `skip` preesistenti (difetti noti di Tornei). **+105 nuovi**: `search.test.ts` (24), `derive.diary.test.ts` (39), `Diario.test.tsx` (42) |
| Comandi | `npm test` · `npm run typecheck` · `npm run typecheck:test` · `npm run build` |

Tutti e quattro i comandi passano. Il Diario **non aveva alcun test**: questi
sono i primi, e coprono anche il comportamento preesistente (ordine, recap,
4 foto + contatore) che prima non era presidiato da niente.

Nessuna migration, nessuna RPC, nessuna dipendenza nuova, nessuna nuova query:
tutto il diario è già in memoria (`useDiary.fetchAll`), quindi la ricerca è
puramente client-side. `App.tsx`, `useDiary.ts` e `models.ts` non sono stati
toccati: i campi nuovi viaggiano con le `entries` che App già passa.

## Cosa è stato verificato (automatico)

**Primitive di testo** (`src/lib/search.test.ts`, 24 test) — solo stringhe,
nessun dominio:

- `normalizeText` — accenti via (`Forlì`→`forli`, `Cesenático`→`cesenatico`),
  maiuscole abbassate, spazi compattati, forma precomposta e decomposta
  ricondotte alla stessa stringa, idempotente, stringa vuota/assente innocua.
- `tokenize` — spezza sugli spazi; query vuota, di soli spazi o di soli segni
  diacritici → nessun token (= nessuna ricerca).
- `isSubsequence` — caratteri in ordine non contigui; rifiuta l'ordine sbagliato
  e non recupera un carattere in più (non è una distanza di edit).
- `tokenMatchesField` — substring sempre; subsequence solo da `SEARCH_FUZZY_MIN`
  (3) caratteri e **solo dentro a una parola** (vedi *Decisioni*, punto 3).
- `matchesAllTokens` — AND fra i token, OR fra i campi; nessun token → risponde
  tutto; la subsequence non attraversa la concatenazione dei campi.

**Regole del data layer** (`src/lib/derive.diary.test.ts`, 39 test) — funzioni
pure, nessun orologio (il Diario non ha il concetto di "imminente"):

- `deriveDiary` — comportamento attuale intatto (ordine dal più recente, recap
  `desc`, massimo 4 foto + `morePhotos`) **più** i campi nuovi: `search`
  normalizzato in sette campi, `matches` decorate (esito, chip dei set, nota),
  torneo senza partite → `matches: []`, campi della partita tenuti separati.
- `deriveDiarySearch` — query vuota → `active: false` e tutto il diario;
  `DIARIO_SEARCH_MIN` a 1; riscontro per nome, città, categoria, formato,
  superficie, piazzamento, compagno, avversario, **nota**, didascalia, anno,
  mese abbreviato e per esteso; AND multi-token con token che rispondono da
  campi diversi; insensibile ad accenti e maiuscole; refuso tollerato;
  `hits` solo con le partite che rispondono; riscontro sul solo torneo →
  `hits: []`; nessun risultato → `[]`; ordine cronologico preservato; input non
  mutato; diario vuoto.

**Schermata** (`src/screens/Diario.test.tsx`, 42 test) — montata con `vi.fn()` e
dati di fabbrica, nessun mock di Supabase:

- Campo: nome accessibile, placeholder, assente con diario vuoto, filtro mentre
  si digita, accenti/maiuscole, due termini che si intersecano, cancellazione.
- Reset: compare solo con una query in corso, svuota il campo, **restituisce il
  focus** al campo, raggiungibile e attivabile da tastiera.
- Sottotitolo (live region `role="status"`): conteggio dei tornei senza ricerca,
  conteggio dei risultati con la ricerca attiva, singolare/plurale, "Nessun
  risultato per «…»".
- Riscontri: la partita con l'avversario cercato compare sotto la voce giusta
  con fase, punteggi e **nota**; solo le partite che rispondono; niente righe
  quando risponde il torneo; niente righe senza ricerca.
- Nessun risultato: empty state dedicato (diverso da "diario vuoto"), link che
  cancella la ricerca, nessuna frase ripetuta due volte in pagina.
- Apertura: click sul titolo, click sulla card, click su una riga di partita e
  apertura dopo una ricerca portano tutti al torneo giusto; la storia Instagram
  **non** apre anche il torneo.
- Tastiera/a11y: Invio e Spazio sul titolo, percorso completo campo → reset →
  titolo senza mouse, landmark `search`, unico `h1`, **quattro scansioni axe**
  (diario pieno, ricerca attiva con riscontri, nessun risultato, diario vuoto).

## Decisioni e assunzioni (documentate)

1. **AND fra i token, OR fra i campi.** `riccione 2025` chiede entrambi i
   termini, ciascuno può arrivare da un campo diverso (nome + data). L'OR fra i
   token trasformerebbe ogni termine aggiunto in *più* risultati invece che meno:
   il contrario di ciò che si fa scrivendo una parola in più.
2. **Nessun riordino per rilevanza.** I risultati restano in ordine cronologico.
   Un diario si legge nel tempo e i risultati sono pochi per costruzione:
   rimescolarli per punteggio disorienta più di quanto aiuti.
3. **Fuzzy limitato: substring + subsequence dentro a una parola.** La soglia
   `SEARCH_FUZZY_MIN = 3` spegne il fallback sotto i 3 caratteri (con 1-2
   risponderebbe quasi tutto e la lista sembrerebbe non filtrata). La
   subsequence si valuta **su una parola sola**, mai sul campo intero né sulla
   concatenazione dei campi: sui dati veri, senza questo limite `2025` trovava
   un torneo del **2024** (sottosequenza di «2024 ago agosto 05») e `indoor` uno
   su «sabbia **outdoor**». Riscontri corretti per l'algoritmo, inspiegabili per
   chi cerca. Verificato da `search.test.ts` → *la subsequence non attraversa le
   parole del campo*.
4. **Niente `fuse.js` né altre dipendenze.** Il repo tiene le deps al minimo e
   serve una manciata di funzioni su stringhe, non un motore di ricerca.
5. **Niente debounce.** Il filtro è O(tornei + partite) su dati già in memoria;
   la `deriveDashboard` chiamata ad ogni render è molto più pesante. Un debounce
   aggiungerebbe complessità e latenza percepita senza guadagno.
6. **`normalizeText` ≠ `normalizeCity`.** `normalizeCity` (derive.ts) rispecchia
   il `city_key = lower(btrim(city))` del DB e **deve restare identica al
   server**, accenti compresi; `normalizeText` toglie i diacritici perché in
   italiano si scrivono a memoria. Due domande diverse, due funzioni separate.
7. **Il sottotitolo segue ciò che si vede.** `3 risultati per «riccione»` invece
   del conteggio fisso dei tornei: è il difetto #1 di `QA-tornei-formati.md`, qui
   nasce corretto. È anche la live region, così il conteggio viene annunciato
   mentre si digita senza aggiungere un secondo nodo che parlerebbe in doppio.
8. **Righe di partita non cliccabili.** Sono contesto, non azioni: il click bolle
   fino alla card e apre il torneo, dove le partite si vedono comunque tutte. Il
   deep-link alla singola partita richiederebbe `onOpenMatch` da App, che apre il
   modale di *modifica* e rifiuta i tornei condivisi.
9. **Le didascalie di tutte le foto sono cercabili**, non solo delle 4 in
   miniatura: una didascalia identifica il torneo anche quando la sua foto non è
   fra quelle mostrate (vedi *Limitazioni*).
10. **`DiaryMatchHit.search` è un `string[]`** (fase, avversari, nota, compagno),
    non una stringa unica: è la stessa regola del punto 3 applicata alla partita.
    È l'unica aggiunta rispetto alla forma prevista dal piano.
11. **`'Nessuno'` non è cercabile.** È il fallback di `partnerName` per i tornei
    e le partite senza compagno: un'etichetta da mostrare, non un dato. Metterlo
    nel testo cercabile avrebbe fatto rispondere *tutti* i tornei senza compagno
    a chi cerca «nessuno» (o «ness», o «nsn»).
12. **Alla partita si chiedono solo i token che il torneo non spiega già.**
    Sostituisce la regola iniziale («la partita risponde solo se soddisfa TUTTI i
    token»), che rompeva la ricerca su query di restringimento — le più naturali
    da scrivere, prima il torneo e poi cosa ci si cerca dentro. Vedi sotto.

### Correzione: le query di restringimento (ruolo 2)

La prima regola chiedeva **tutti** i token a una singola partita. Su dati
realistici produceva due difetti, entrambi confermati con una sonda su
`deriveDiary` + `deriveDiarySearch`:

- **Falso negativo.** `girone` trovava il torneo di Riccione; **`riccione girone`
  non trovava niente**. `phase` vive solo sulla partita e non compare fra i campi
  della voce (`DiarySearchFields` non ha un campo fase): nessuna partita poteva
  soddisfare anche «riccione», e la voce spariva del tutto. Aggiungere una parola
  per restringere faceva sparire un torneo che c'era.
- **Spiegazione persa.** `rossi` mostrava la voce **e** la riga della partita
  contro Rossi; `riccione rossi` mostrava la voce **senza** alcuna riga. Proprio
  il "perché" che la ricerca promette svaniva appena si restringeva.

Ora `deriveDiarySearch` calcola i **token residui**: quelli a cui i campi di
contesto della voce (titolo, luogo/categoria/formato/superficie/piazzamento,
data, compagno, didascalie) non rispondono già. Alla partita si chiedono solo
quelli.

- Residuo vuoto → risponde il torneo per intero, nessuna riga: `riccione` e
  `riccione 2025` restano puliti come prima.
- Residuo non vuoto → le righe sono le partite che lo soddisfano: `riccione
  rossi` → la partita contro Rossi; `riccione girone` → il girone di Riccione.
- Token che arrivano da **partite diverse** (`gialli rimonta`, una per uno) →
  la voce compare, ma senza righe: nessuna singola partita spiega entrambi, e
  mostrarne una mentirebbe sul perché.

`opponents` e `notes` restano nell'aggregato della voce (`entryFields`) proprio
per quest'ultimo caso: servono a far comparire la voce, non a spiegarla.

Coperto da 4 test in `derive.diary.test.ts` e 2 in `Diario.test.tsx`; verificato
anche nel browser a 320px.

### Card del Diario raggiungibili da tastiera — come, e perché così

Le card erano `div` con solo `onClick`: da tastiera non si raggiungevano né si
aprivano (stesso difetto già censito su Tornei). Con la ricerca stonava di più —
si digita e poi non si può tabulare fino al risultato.

**Non** è stato replicato il `role="button"` + `tabIndex` della card di Tornei:
la card del Diario contiene già un `<button>` ("Storia Instagram"), e un pulsante
dentro a un altro pulsante è una violazione axe (`nested-interactive`, WCAG
4.1.2) oltre che il difetto #5 di `QA-tornei-formati.md` (i discendenti di
`role="button"` escono dall'albero di accessibilità).

È stato adottato il pattern *card con azione primaria*, che è anche la
correzione suggerita in quel documento: **il titolo della voce è un `<button>`
vero**. Si raggiunge con Tab, si attiva con Invio/Spazio nativi, il contenuto
della card resta leggibile agli screen reader, e il click sulla card continua a
funzionare per il mouse (il titolo ferma la propagazione per non aprire due
volte). Stessi stop di tabulazione della soluzione con `role="button"`, senza
le due controindicazioni.

## Limitazioni note

- **Il perché non è sempre visibile.** Se il riscontro arriva da un campo che il
  Diario non mostra (categoria, superficie, didascalia di una foto oltre la
  quarta), la voce compare senza una riga che lo spieghi. Le partite — il caso
  più frequente e l'unico dato altrimenti invisibile — hanno i loro riscontri.
- **Nessuna evidenziazione `<mark>`** del termine dentro al titolo o alla nota:
  fuori scope, resta un follow-up.
- **`InlineLink` "Cancella la ricerca →" non è raggiungibile da tastiera**:
  è uno `<span>` in `ui.tsx` (difetto #4 di `QA-tornei-formati.md`, preesistente
  e sistemico). Chi naviga da tastiera ha comunque il pulsante `×` del campo,
  che è un `<button>` vero e fa la stessa cosa.
- **Ricerca solo sul Diario.** Le altre schermate non hanno un campo: Tornei ha
  il filtro a chip per formato, Compagni e Home niente.
- **La ricerca si azzera aprendo un risultato e tornando indietro.** `App`
  renderizza le schermate con uno `switch` su `screen`: aprire un torneo smonta
  il Diario e con esso lo stato locale della query. È coerente con il resto
  dell'app (il filtro a chip di Tornei si comporta uguale) e con la scelta di non
  toccare `App.tsx`, ma su una query digitata pesa più che su un chip. Per
  conservarla servirebbe alzare lo stato ad `App` — scelta di prodotto, non
  difetto: lasciata al proprietario del progetto.
- **`placementRank` non gestisce `'Semifinale'`** (nota di progetto): non tocca
  la ricerca — `place` contiene la stringa di piazzamento testuale, che risponde
  comunque — ma resta un difetto a monte, condiviso fra client e SQL.

## Verifica nel browser vero (ruolo 2 — integrazione)

Il livello dati era già completo: `useDiary.fetchAll` scarica in un colpo solo
tornei, partite (con `opponents` **e** `note`), compagni e foto
(`useDiary.ts:49-62`), senza pagine né limiti. La ricerca client-side copre
quindi davvero tutto il diario: nessuna query nuova serviva, e nessun campo
cercabile resta scoperto per dati non caricati.

Ciò che jsdom non calcola è stato verificato montando il vero `<Diario>` con dati
finti in una pagina Vite temporanea (banco di prova non committato), misurando in
Chrome con `getComputedStyle`/`getBoundingClientRect`. Il media query mobile è
stato esercitato dentro a un iframe da 320px, che valuta le media query sulla
propria viewport.

| Punto | Esito |
|---|---|
| `padding-left` 38px (lente) a 320px | ✅ 38px, lente non sovrapposta al testo |
| `padding-right` 42px con query in corso | ✅ 42px; il `×` è 26×26 e resta dentro al campo, 8px dal bordo |
| Nessuno zoom su iOS (`font-size: 16px` sotto 900px) | ✅ a 317px di viewport il campo calcola `16px` |
| Overflow orizzontale a 320px | ✅ assente, con card e righe di partita in pagina |
| Crocetta nativa di WebKit | ❌ **difetto trovato e corretto** (vedi sotto) |
| Contorno di focus del titolo tagliato dalla card | ✅ non può esserlo: il pulsante sta a 16px dal bordo alto e ~100px dai lati, il contorno è 2px |

### Difetto trovato: due pulsanti di cancellazione nel campo

`appearance: none` sull'`<input>` **non** toglie la crocetta nativa di WebKit:
quella è lo pseudo-elemento `::-webkit-search-cancel-button`, che si spegne solo
prendendolo di mira. Verificato su Chrome: con una query in corso il campo
mostrava **due** `×` affiancati — il nostro (tondo, con `aria-label`) e quello
nativo (muto, fuori dalla grammatica visiva). La nota precedente dava la cosa per
risolta dall'inline style; non lo era.

Corretto in `src/index.css` con la regola sullo pseudo-elemento — non può stare
negli style inline di React. Il commento in `Diario.tsx` che attribuiva il merito
ad `appearance: none` è stato corretto per non rimandare qualcun altro sulla
stessa pista.

Non è testabile in jsdom (non rende gli pseudo-elementi): resta una verifica
visiva, ora documentata.

## Da verificare a mano (resta fuori portata)

Serve `npm run dev` con un `.env` valido (vedi `.env.example`) e un account con
dati — **non c'è `.env` nel worktree**, quindi il giro end-to-end contro Supabase
vero non è stato fatto.

1. **Safari**: la regola su `::-webkit-search-cancel-button` è verificata su
   Chrome; Safari usa lo stesso pseudo-elemento, ma va confermato sul browser
   vero.
2. **Screen reader** (VoiceOver/NVDA): il sottotitolo `role="status"` deve
   annunciare il conteggio mentre si digita, senza diventare logorroico.
3. **Prova sui dati veri**: refuso (`rccione`), due token (`riccione 2025`),
   parola presente solo in una nota, accenti (`Forlì`/`forli`/`FORLI`).

## Follow-up (fuori scope, come da piano)

- **Ricerca sulla schermata Tornei** (oggi solo chip per formato) e, più avanti,
  una ricerca globale da ogni schermata (tocca `App.tsx`, `Sidebar`,
  `BottomNav`, `NavIcons`).
- **Evidenziazione `<mark>`** del termine trovato in titolo e nota.
- **`Button`/`InlineLink` come `<button>` veri** in `ui.tsx`: correzione
  sistemica del difetto #4, da pianificare a parte perché tocca ogni schermata.
- **Deep-link alla singola partita** dai riscontri, se e quando esisterà una
  vista partita in sola lettura.

## Come far girare la suite

```bash
npm install            # node_modules non è versionato
npm test               # vitest run
npm run typecheck      # app (tsc -b)
npm run typecheck:test # test (tsconfig.test.json)
npm run build          # tsc -b && vite build
```

I 4 `skip` di `Tornei.test.tsx` sono difetti noti preesistenti: restano skip,
non vanno cancellati per far tornare verde la suite.
