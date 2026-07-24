# QA — Ricerca sul Diario

Verifica della **barra di ricerca del Diario**: un solo campo che interroga
tutto il diario — nome del torneo, città, categoria/formato/superficie/
piazzamento, data, compagni, avversari, **note delle partite** e didascalie
delle foto — e mostra, sotto la voce, *quale partita* ha risposto. Livello
presentazionale + data layer client (ruolo 1 della pipeline).

| | |
|---|---|
| Ambito | `src/lib/search.ts` (**nuovo**), `src/lib/derive.ts` (`DiaryEntry` estesa, `DiaryMatchHit`, `DiarySearchFields`, `deriveDiarySearch`), `src/screens/Diario.tsx`, `src/test/factories.ts` (`makeDiaryEntry`, `makeDiaryMatchHit`) |
| Ambiente | Node 24 · Vitest 3.2.7 · jsdom 26 · Testing Library React 16 · axe-core 4.12 |
| Suite | 262 test: 258 verdi + 4 `skip` preesistenti (difetti noti di Tornei). **+100 nuovi**: `search.test.ts` (24), `derive.diary.test.ts` (36), `Diario.test.tsx` (40) |
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

**Regole del data layer** (`src/lib/derive.diary.test.ts`, 36 test) — funzioni
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

**Schermata** (`src/screens/Diario.test.tsx`, 40 test) — montata con `vi.fn()` e
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
- **`placementRank` non gestisce `'Semifinale'`** (nota di progetto): non tocca
  la ricerca — `place` contiene la stringa di piazzamento testuale, che risponde
  comunque — ma resta un difetto a monte, condiviso fra client e SQL.

## Da verificare a mano (fuori dalla portata di jsdom)

jsdom non calcola il layout: le voci qui sotto **non sono state verificate**,
non sono note come rotte. Serve `npm run dev` con un `.env` valido
(vedi `.env.example`) e un account con dati.

1. **Resa del campo** a 320px e su desktop: il `padding-left` di 38px lascia
   spazio alla lente, il `padding-right` di 42px al pulsante `×` (che compare
   solo con una query in corso, quindi la larghezza del testo cambia mentre si
   digita).
2. **Nessuno zoom su iOS**: il campo eredita la regola `font-size: 16px` sotto i
   900px di `index.css:18-20`.
3. **Crocetta nativa di WebKit**: `appearance: none` dovrebbe toglierla su
   Safari/Chrome, lasciando solo il nostro `×`. Da confermare su Safari vero.
4. **Contorno di focus** del titolo-pulsante dentro alla card (`overflow:
   hidden` sulla card + `outline-offset: 2px`): verificare che non venga
   tagliato.
5. **Screen reader** (VoiceOver/NVDA): il sottotitolo `role="status"` deve
   annunciare il conteggio mentre si digita, senza diventare logorroico.
6. **Prova sui dati veri**: refuso (`rccione`), due token (`riccione 2025`),
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
