# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primario: il giocatore amatoriale di beach volley, solo dal telefono** (confermato dall'utente, 20 ottobre 2026). Gioca 5–20 tornei a stagione, da maggio ad agosto, quasi tutti 2vs2 e spesso sulla riviera adriatica. Apre l'app in spiaggia, fra una partita e l'altra (pause di 10–30 minuti) o subito dopo, per registrare un torneo, segnare un risultato o vedere come sta andando. Il desktop deve funzionare (Sidebar dai 900px, sheet centrati dai 600px), ma non è un pubblico per cui progettare.

Altri ruoli che il prodotto ha già:

- **Compagno collegato**: qualcuno l'ha collegato come compagno e vede i tornei dell'altro in sola lettura. Deve capire perché non può modificare senza scoprirlo da un errore.
- **Admin dell'alpha**: smista le segnalazioni dei bug dalla bacheca nel Profilo.

## Product Purpose

Beach Diary tiene la memoria della carriera di un amatore (tornei, partite con i set, compagni, spiagge, foto) e la restituisce come statistiche e come ricordi da condividere.

I lavori che deve rendere facili, con il loro criterio di successo (UX.md §2.2):

- **Registrare un torneo** prima, durante o dopo: lo sheet si apre in ≤2 tocchi da qualunque schermata e si salva anche col solo nome.
- **Segnare il risultato di una partita** fra un match e l'altro: ≤3 tocchi dalla Home ai campi del punteggio, e il modulo non si perde con la rete instabile.
- **Ritrovare un torneo passato** per nome, città, avversario, nota o didascalia, con il perché del riscontro visibile.
- **Capire come sto andando**: stagione, compagni, fasi; Statistiche a 1 tocco dalla Home, filtri visibili.
- **Condividere** un torneo (Storia Instagram) o la stagione (Beach Wrapped) con un PNG corretto su iOS Safari e Chrome Android.
- **Trovare chi c'è oggi in spiaggia** e farsi trovare (check-in in ≤2 tocchi).
- **Gestire compagni e condivisioni**, capendo cosa succede ai dati.
- **Segnalare un problema**, perché l'app è in alpha.

## Positioning

Due cose insieme, nessuna delle due da sola (confermato dall'utente):

1. **Il diario del giocatore.** Non è un segnapunti, non organizza tornei e non è un tracker sportivo generico: è la memoria personale della tua stagione da amatore, torneo dopo torneo, con chi hai giocato, dove e com'è andata.
2. **I numeri della coppia.** Quello che registri torna indietro come risposta a «con chi gioco meglio e come sto andando»: win rate per compagno, per fase, per stagione, serie record, piazzamenti.

Il diario è l'ingresso, i numeri e i ricordi sono l'uscita. La Partita live (segnapunti da bordo campo) esiste per alimentare il diario, non come prodotto a sé.

## Operating Context

- **In spiaggia**: sole diretto, una mano sola (a volte bagnata o con la sabbia), occhiali da sole, rete 3G/4G a singhiozzo, poco tempo fra due partite.
- **La stagione** va da maggio ad agosto. Beach Wrapped, il recap di stagione, esiste solo a ottobre (`wrappedAOttobre` in `src/app/selectors.ts`).
- **PWA**: il manifest è `standalone` e `portrait`; si installa dalla landing `/presentazione` o dal browser, e l'icona apre direttamente il diario.
- **La landing `/presentazione`** è la pagina pubblica: senza JavaScript, porta a registrarsi (`/?accesso=registrati`) o ad accedere (`/?accesso=accedi`). La registrazione resta nell'app.
- **Condivisione su Instagram**: l'app genera i PNG (Storia 1080×1920, slide di Wrapped) e l'utente li scarica e li pubblica a mano; dove esiste c'è la condivisione nativa. Non c'è un'integrazione con Instagram.
- **Un database, due app**: lo stesso progetto Supabase serve anche l'app Expo/React Native (`~/Desktop/BVDiaryApp`). Alcuni file di `src/lib` (`derive.ts`, `models.ts`, `stats.ts`, `permissions.ts`, `limits.ts`…) nascono condivisi con quella.
- **Lingua**: solo italiano.

## Capabilities and Constraints

**Che cosa fa oggi** (dettagli in README.md): accesso con email e password (nickname verificato dal vivo); Home con la frase su come stai andando e il consiglio di Solby; Statistiche; Tornei con lista, mappa delle conquiste e ricerca fuzzy; Diario della stagione; dettaglio torneo con partite, set, foto e luogo; Partita live in torneo o fra amici; luoghi condivisi fra utenti con geocoding Photon; Chi c'è oggi (check-in reciproco per città e giorno); Compagni con collegamento a un utente e tornei condivisi in sola lettura; Storia Instagram; Beach Wrapped; Raccontalo a Solby; Profilo; Segnala un problema e bacheca admin.

**Vincoli di prodotto**:

- **Raccontalo a Solby non è un'intelligenza artificiale**: è una macchina a stati scritta a mano (`src/screens/CreaChat.tsx`). Nessun testo deve presentarlo come AI o come modello linguistico.
- **Il tabellone** (Gold / Silver / Bronze / Girone unico) è descrittivo: compare nel badge, nella Storia e nella ricerca, ma non cambia statistiche, podi né miglior piazzamento.
- **I tornei condivisi sono in sola lettura** per chi li riceve; le foto non si condividono mai. La Storia si può fare anche su un torneo condiviso.
- **Il compagno appartiene al torneo**: la partita lo eredita, e un compagno eliminato diventa «Nessuno» senza cancellare tornei o partite.
- **I valori dei piazzamenti stanno nel database** (per esempio `1° 🏆`, CHECK in SQL): l'interfaccia può cambiarne la resa, non il valore salvato.
- **Doppia manutenzione**: ogni aggregazione vive sia in una RPC SQL sia nel suo `derive*` di ripiego nel client; si cambiano insieme.
- **Dark mode**: no (decisione dell'utente); i token sono comunque predisposti.

**Terminologia** (UX.md §12): nella UI si dice sempre «compagno», mai «socio»; «Esci» vuol dire solo logout, il check-in si chiude con «Termina check-in»; «Storia Instagram», «Beach Wrapped», «Chi c'è oggi», «Raccontalo a Solby», «piazzamento», «tabellone».

**Ancora da decidere o da costruire**:

- **Recupero password**: non esiste (UX.md Q19).
- **Termini e Informativa privacy**: le pagine non esistono; nell'app la nota resta come testo senza link.
- **Piani**: oggi sospesi (`PLANS_ENABLED = false` in `src/lib/limits.ts`, tutti gli utenti hanno tutto). Vedi la fase qui sotto.

**Fase e modello: alpha aperta e gratuita, freemium dopo** (confermato dall'utente, 20 ottobre 2026). Finché i pagamenti non ci sono, nessun badge Premium e nessun lucchetto nell'interfaccia. Quando arrivano torna il piano Premium: oggi è scritto a €5 al mese, con il piano base limitato a 5 tornei e 2 compagni (`BASE_LIMITS` in `limits.ts`, trigger `enforce_plan_limits` nel database). Prezzo e limiti sono il punto di partenza scritto nel codice, non un listino pubblicato. Durante l'alpha il banner in Home e «Segnala un problema» nel Profilo sono il canale delle segnalazioni.

## Brand Commitments

- **Nome**: «Beach Diary» è il nome che si vede (titolo della pagina, landing, `short_name` del manifest, titolo dell'app su iOS); «Beach Volley Diary» è il nome esteso, nel `name` del manifest e nel repository.
- **Il marchio**: `BrandMark` in `src/components/Logo.tsx` (il pallone bianco con la fascia arancio), lo stesso nella favicon e nelle icone PWA.
- **Solby**, la mascotte (si chiamava Pallo: rinominata dall'utente il 20 ottobre 2026). Dà un consiglio alla volta calcolato dai dati, conduce Raccontalo a Solby, tifa nella Partita live e in Wrapped. È decorativa (`aria-hidden`) e si ferma con la riduzione del movimento. Nel codice si chiama ancora Pallo (`src/components/Pallo.tsx`, `PalloUmore`, le classi `*-pallo`): il nome che si vede è solo nelle stringhe.
- **Voce** (UX.md §12): del tu, frasi brevi, verbi d'azione nei pulsanti («Crea torneo», «Aggiungi partita», «Fai check-in»). Negli errori niente punto esclamativo: prima che cosa è successo, poi che cosa fare («Sei offline: non ho salvato. Riprova quando torni in linea.»). Il dettaglio tecnico va in console, non all'utente.
- **Emoji**: restano come contenuto (l'emoji del torneo, le slide di Wrapped, la 🏆 nel valore del piazzamento), non come icone dell'interfaccia.
- Il sistema visivo è registrato altrove: ART_DIRECTION.md («Bagnasciuga», versione D) e MOTION.md.

## Evidence on Hand

- **Schermate vere dell'app** in `public/presentazione/screens/` (Home, Diario, Beach Wrapped), scattate dall'anteprima `docs/preview` col diario di prova al 17 ottobre 2026 (`OGGI_LANDING` in `docs/preview/dati.ts`): dati di prova, non di utenti reali.
- **Anteprima social** `public/presentazione/og.png` e **icone PWA** in `public/icons/`, rigenerabili con `docs/qa/landing-og.mjs` e `docs/qa/icone.mjs`.
- **I testi della landing** in `presentazione/index.html`, presi parola per parola dalla tavola di Claude Design.
- **Report QA per funzione** in `docs/QA-*.md`, misure della rifinitura in POLISH.md.

**Non esistono, e non vanno inventati**: testimonianze, numeri di utenti o di tornei registrati, recensioni, stelle negli store, stampa, collaborazioni con FIPAV, circuiti od organizzatori, un listino pubblico, pagine di Termini e Privacy. L'alpha ha pochi utenti.

## Product Principles

1. **Prima il bordo campo.** L'azione più frequente in stagione (registrare un torneo o una partita) sta a pochi tocchi, si fa con una mano e non perde dati se la rete cade. Il resto può aspettare la sera.
2. **Ogni dato torna indietro.** Quello che il giocatore inserisce deve tornare come statistica, confronto con un compagno o ricordo da condividere. Un campo che non restituisce niente non si chiede.
3. **La coppia è l'unità.** Nel beach volley si gioca in due: i numeri si leggono anche per compagno, e il compagno si sceglie in fretta (di solito è lo stesso dell'ultima volta).
4. **Onesti con i numeri e con le funzioni.** Le statistiche vengono da dati veri; Solby non si spaccia per un'AI; durante l'alpha nessun Premium finto. Se il caricamento fallisce si dice, non si mostra un diario vuoto.
5. **Il diario è tuo.** Privato per impostazione (RLS per utente, foto private); la condivisione è in sola lettura, reversibile da entrambe le parti, e chiede conferma.

## Accessibility & Inclusion

- **WCAG 2.1 AA**, verificato nei test: axe-core nella suite Vitest (`src/test/axe.ts`) e i contrasti ricalcolati sui colori veri (`src/test/contrast.test.ts`, `src/styles/tokens.test.ts`, `src/styles/landing.tokens.test.ts`).
- **Leggibile al sole**: il testo sta sopra 4.5:1 anche sul vetro, misurato sul fondo peggiore (UX.md §8.5).
- **Una mano, dita bagnate**: bersagli di almeno 44×44, niente gesti di precisione.
- **Tastiera dappertutto**, anche se il pubblico usa il telefono: il desktop di ripiego e chi usa una tastiera esterna devono arrivare a ogni azione.
- **Movimento**: tutto rispetta `prefers-reduced-motion`, Solby compreso.
- **Zoom libero** (niente `maximum-scale`), lingua dichiarata `it`.
