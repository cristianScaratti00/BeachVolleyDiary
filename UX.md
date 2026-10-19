# UX.md: refactor "Liquid Glass" e nuova architettura dei flussi

| | |
|---|---|
| Ruolo | UX strategist, ruolo 1 di 6. Specifica soltanto: **nessuna riga di codice UI** in questo commit |
| Base | `6f2ace8` (branch `queuer/refactor-app-82fd3c95`), audit del 2026-10-18 |
| Piano di riferimento | "Refactor dell'app Beach Volley Diary" (briefing della squadra), con le 8 risposte dell'utente in §15.1 |
| Lingua dell'interfaccia | italiano, registro informale ("tu") |
| Livelli di obbligo | **DEVE** = criterio di accettazione · **DOVREBBE** = atteso, salvo motivo scritto · **PUÒ** = facoltativo |

**Come leggere i seam.** Ogni punto lasciato ai ruoli successivi è marcato `⟂ Fn`, dove *n* è la fase del piano:
- F1: token e base CSS
- F2: primitive
- F3: shell, router e modali
- F4: migrazione delle schermate
- F5: cambi di flusso
- F6: pulizia
- QA: verifica

L'indice completo è in §16. Dove questo documento contraddice il piano lo dice esplicitamente, e vince questo documento, perché è stato scritto leggendo il codice attuale (§1).

> **Ottobre 2026: la landing.** La [Parte L](#parte-l-la-landing-presentazione-rifatta-sulla-versione-d), in fondo, è il contratto UX della landing `/presentazione` rifatta sulla versione D (base `be9c4bd`). Per la landing vale quella, con i suoi seam `⟂ E`/`⟂ A`/`⟂ M`/`⟂ C`/`⟂ I`/`⟂ QA`. Le sezioni 0–16 restano il contratto dell'app.

---

## Indice

0. [Sintesi](#0-sintesi)
1. [Contraddizioni con il prodotto esistente](#1-contraddizioni-con-il-prodotto-esistente-leggere-per-prime)
2. [Utenti e obiettivi](#2-utenti-e-obiettivi)
3. [Architettura dell'informazione](#3-architettura-dellinformazione)
4. [Modello di navigazione e contratto del router](#4-modello-di-navigazione-e-contratto-del-router)
5. [Flussi](#5-flussi)
6. [Inventario degli stati, schermata per schermata](#6-inventario-degli-stati-schermata-per-schermata)
7. [Contratti d'interazione (shell e primitive)](#7-contratti-dinterazione-shell-e-primitive)
8. [Accessibilità](#8-accessibilità)
9. [Comportamento responsive](#9-comportamento-responsive)
10. [Mappa d'uso del vetro](#10-mappa-duso-del-vetro)
11. [Immagini esportate (Storia e Wrapped)](#11-immagini-esportate-storia-e-wrapped)
12. [Contenuti e microcopy](#12-contenuti-e-microcopy)
13. [Analytics: contratto da preservare](#13-analytics-contratto-da-preservare)
14. [Impatto sui test](#14-impatto-sui-test)
15. [Decisioni prese e domande aperte](#15-decisioni-prese-e-domande-aperte)
16. [Indice dei seam](#16-indice-dei-seam)
- **L.** [La landing `/presentazione` rifatta sulla versione D](#parte-l-la-landing-presentazione-rifatta-sulla-versione-d) (indice proprio all'inizio della parte)

---

## 0. Sintesi

- **Tab bar mobile** (sotto i 900px): `Home · Tornei · ＋ · Compagni · Profilo`. Il ＋ è un'azione, non una tab: apre un action sheet con tre voci, *Nuovo torneo*, *Aggiungi partita* e *Check-in oggi*. Sul desktop c'è un solo pulsante "＋ Nuovo" nella Sidebar che apre lo stesso menu.
- **Tornei assorbe il Diario.** Le viste diventano tre, `Lista · Timeline · Mappa`, sotto un'unica ricerca. Quando la ricerca è attiva, i risultati sostituiscono la vista. `/diario` reindirizza a `/tornei/timeline`.
- **Home dice cosa serve adesso.** Prima *Adesso* (torneo di oggi o prossimo, ultimo risultato, check-in di oggi), poi i *Numeri chiave*, infine i link a *Statistiche* (che diventa una rotta a sé) e a *Beach Wrapped*. Il widget dell'assistente esce dalla Home.
- **Un solo sheet "Nuovo torneo".** Contiene cinque campi essenziali e la sezione "Altri dettagli" chiusa, più il link all'assistente. Sostituisce TorneoModal e QuickTorneoModal, e in modifica è lo stesso sheet.
- **URL vere** per ogni schermata e dettaglio. Il tasto indietro chiude gli sheet. Un modulo con modifiche non salvate chiede conferma prima di perderle.
- **Ogni azione distruttiva passa da un ConfirmDialog.** Oggi l'eliminazione di un torneo o di una partita non chiede niente, e le altre usano `window.confirm`.
- **Il caricamento fallito non è più uno stato vuoto.** Oggi, se il diario non si carica, l'utente vede «Nessun torneo ancora».
- **Il vetro va solo sui livelli di navigazione e controllo**, mai su più di 3 superfici sfocate contemporaneamente. Il testo appoggiato sul vetro deve superare AA anche sul fondo peggiore (§8.5).
- **La tastiera deve arrivare dappertutto.** Oggi l'intero assistente guidato, i pulsanti `Button`/`BackLink`/`InlineLink`, il lightbox, le azioni dei modali e i campioni colore non si raggiungono.

---

## 1. Contraddizioni con il prodotto esistente (leggere per prime)

Queste sono differenze tra quello che danno per scontato il piano o la conoscenza di progetto e quello che c'è davvero nel codice. Nessuna è stata aggirata in silenzio: ognuna ha una decisione proposta, che i ruoli successivi devono rispettare o discutere.

| # | Il piano o la conoscenza dice | Il codice dice (verificato) | Impatto | Decisione proposta |
|---|---|---|---|---|
| C1 | "Chi c'è oggi ha uno slot fisso nella bottom nav" | È **commentato fuori** sia da `BottomNav` SLOTS (`BottomNav.tsx:29`) sia da `Sidebar` NAV (`Sidebar.tsx:15`) dal commit `c4d2bd8` (27/07/2026). Nessun punto dell'app porta a `screen === 'oggi'`: oggi la funzione è **irraggiungibile**. | La risposta 5 ("card in Home + rotta") la **riaccende**, e non si limita a spostarla. | Riaccenderla come chiesto, ma dietro una costante unica `OGGI_ATTIVO` in `src/app/routes.ts`. Con `false`, la card della Home, la voce del ＋ e la rotta spariscono insieme. Va chiesto all'utente se era stata spenta di proposito (Q1). `⟂ F3` |
| C2 | "FAB speed-dial" | Lo speed-dial non c'è più: la **barra stessa cresce** e diventa un menu di 4 voci (assistente, nuovo torneo, rapido, nuova partita), `role="menu"` senza frecce da tastiera (`BottomNav.tsx:181-250`). | Va sostituito il pannello, non uno speed-dial. | L'action sheet del ＋ **sale dalla tab bar**: conserva il principio, scritto nel commento del codice, che "quello che hai toccato è quello che si apre". Le voci passano da 4 a 3. `⟂ F5` |
| C3 | "ConquisteMap in SVG, eager, offline" (vincolo del piano e nota di progetto) | `ConquisteMap.tsx` usa **Leaflet + markercluster** con tile OSM, caricato in `lazy()` da `Mappa.tsx:24`. `src/lib/italy.ts` non esiste più. Il README (righe 48 e 103) è rimasto indietro. | La vista Mappa **non funziona offline** (le tile non arrivano). Il vincolo "SVG eager" del piano non si può rispettare. | L'invariante vera è un'altra: **non si tocca `derive.mappa.ts`**, il caricamento resta `lazy` con un segnaposto **alto quanto la mappa** (`MAPPA_H = 380`), i pin conservano il **doppio bordo** (fissato in `contrast.test.ts`). La cornice si può rifare, la mappa no. |
| C4 | "Ordine `geocodeCity(city) ?? coordinateDelLuogo(...)`, 5 test" | È **al contrario**, e lo è di proposito: `posizioneDellaCitta()` (`derive.mappa.ts:225-237`) prova prima le coordinate del luogo e ricade sul gazetteer, con il flag `preciso`. È fissato da `describe('deriveMappa — dove cade il pin')`. `puntoDelGruppo` e `coordinateDelLuogo` non esistono. | Chi "ripristina l'invariante" del piano rompe 3 test e la feature. | **Non cambiare l'ordine in nessuna delle due direzioni.** È stata registrata una nota di progetto che sostituisce quella vecchia. |
| C5 | "`quickCreateTorneo` scrive sempre `city: ''`" | Oggi passa da VenuePicker e da `citySnapshot()` (`useDiary.ts:357-360`). | La frase in `Mappa.tsx` «i tornei creati in modalità rapida partono senza [città]» è **falsa**. | Nuovo testo: «{n} tornei non hanno un luogo: aggiungilo dal torneo e compariranno qui.» `⟂ F4` |
| C6 | Profilo è una tab | Su mobile Profilo si apre dal chip avatar nella top bar (`App.tsx:875-911`), che porta anche il BrandLockup. Sul desktop dal piede della Sidebar. | Con la tab Profilo la top bar sparisce, e con lei l'unico logo visibile su mobile. | Il marchio resta su Splash, Login e nella NavBar della Home (BrandMark piccolo come leading item). La tab Profilo mostra l'avatar dell'utente (Q17). `⟂ F3` |
| C7 | | La Sidebar chiama la Home "**Dashboard**" (`Sidebar.tsx:13`), la nav mobile "Home". | Due nomi per lo stesso posto. | "Home" ovunque. La dashboard diventa la rotta "Statistiche". |
| C8 | | Se il primo caricamento fallisce, `useDiary` lascia `data` **vuoto** e App mostra solo un toast (`App.tsx:212-216`). Le schermate dicono allora «Nessun torneo ancora. Crea il primo torneo». | Con la rete assente all'avvio, l'utente crede di aver perso il diario. | ErrorState dedicato (§6.0), riconosciuto **senza modificare `useDiary`** (§4.10). `⟂ F3` |
| C9 | | Finché il dettaglio non è pronto (in caricamento **oppure inesistente**) App mostra la **lista** Tornei o Compagni (`App.tsx:654-655`, `679-687`). | Con gli URL, un refresh su `/tornei/:id` mostrerebbe per un attimo la lista e un id sbagliato la lascerebbe lì per sempre. | Stati distinti: *caricamento* (scheletro) e *non trovato* (§6). `⟂ F3` |
| C10 | | I filtri **compagno/anno stanno solo in Home**, ma pilotano di nascosto anche il sottotitolo di Tornei (`deriveTorneiList(data, fYear)`), la Mappa (`deriveMappa(data, fYear)`) e l'intervallo di Wrapped. | Un'influenza invisibile: la mappa cambia per un filtro che da lì non si vede. | La stagione resta uno stato condiviso, ma si vede ed è modificabile **ovunque abbia effetto**: Statistiche e Mappa (§3.3, Q7). `⟂ F5` |
| C11 | "Codice dormiente dei piani" | Peggio di così: in Home `<Badge>Premium</Badge>` è **incondizionato** (`Home.tsx:186`), quindi tutti vedono "Premium" su una funzione gratuita. Il `Badge` di default scrive "Premium" a 8px. | | Nessun badge Premium e nessun lucchetto nella UI finché `PLANS_ENABLED=false`. I `perm.check` restano in `useActions` e un diniego diventa un Toast. `⟂ F6` |
| C12 | | Le eliminazioni di **torneo** e **partita** non chiedono conferma (`App.tsx:539-554`). Quelle di foto, compagno e condivisioni usano `window.confirm`. | Si perde un torneo (con partite e foto in cascata) con un tocco. | ConfirmDialog per ogni azione distruttiva (§7.7). `⟂ F2` `⟂ F5` |
| C13 | | `doDeleteTorneo` chiude e naviga su Tornei **anche se l'eliminazione è fallita**, e `doDeletePartita` chiude sempre. | | Si naviga solo dopo il successo. Se fallisce, il dialogo si chiude, lo sheet resta e compare un Toast d'errore. `⟂ F3` |
| C14 | | Il Diario mostra "Storia Instagram" anche per i tornei **condivisi**, mentre TorneoDetail la nasconde in sola lettura (insieme a Modifica e Partita). | Regola incoerente. | La Storia è permessa anche sui tornei condivisi: non modifica niente, e quel torneo l'hai giocato (Q4). |
| C15 | Le emoji come icone (difetto #9) | `'1° 🏆'` è un **valore del DB** (`PLACEMENTS`, `db.enums.ts:29`, CHECK in SQL), non decorazione. | Toglierla dal dato è fuori scope (niente migration). | Si sostituisce solo **in visualizzazione**: badge "1°" più l'icona trofeo SVG e il nome accessibile "Primo posto". Il valore salvato non cambia. `⟂ F2` |
| C16 | Le azioni primarie sono arancioni | Il bianco su `#FF6B35` sta a **2,84:1**, sotto AA anche per il testo grande. Il rosa d'errore `#FF477E` su bianco sta a 3,25, il verde `#14B87A` a 2,57. | Tutti i CTA arancioni attuali sono sotto soglia. | Requisiti di contrasto in §8.5. L'arancio brand resta come **tinta** e il testo/icona usa la variante scura o l'inchiostro. `⟂ F1` |
| C17 | `theme-color` chiaro e scuro (piano, Fase 1) | Risposta 2: **niente dark mode**. | | Un solo `theme-color` chiaro, il colore del fondo in alto. I token vanno comunque predisposti per il dark. `⟂ F1` |
| C18 | | "Socio" e "compagno" convivono nella UI: «Elimina socio», «Collega questo socio», «Aggiungi un socio…» (`CompagnoDetail.tsx`, `CompagnoModal.tsx`). | | Nella UI si dice solo **"compagno"**. Il codice (`ModalKind 'socio'`, gli eventi `socio_*`) resta com'è. |
| C19 | | Due "Esci" con significati opposti: il logout (Profilo, Sidebar) e l'uscita dal check-in (`ChiCeOggi.tsx:206`). | | Il check-in usa **«Termina check-in»**. "Esci" significa solo logout. |
| C20 | | Le schermate chiamano `reload()` a **ogni** cambio schermata e al ritorno sulla tab (`App.tsx:221-234`), e ogni errore diventa un toast. | Con gli URL e la rete assente, **un toast d'errore a ogni tocco**. | Mentre si è offline non si mostrano gli errori di `reload()`: c'è un indicatore offline persistente e i toast identici vengono raggruppati (§7.8). `⟂ F3` |
| C21 | | `CityInput` (`Sheet.tsx:156-184`) non è importato da nessuno. Il commento dice il contrario. I suggerimenti `CITTA_SUGGERITE` non arrivano più in nessun campo. | Il datalist delle città che la nota di progetto considera importante è spento. | Si riaccende nel campo Città di "Chi c'è oggi". Il campo città di VenuePicker ha già un suo combobox con ricerca di rete (Photon) e resta com'è. `⟂ F4` |
| C22 | | I commenti di `VenueMap.tsx:12-13` e `ConquisteMap.tsx:15-16` dicono che la ricerca del luogo "resta senza rete". Non è vero: VenuePicker interroga `photon.komoot.io`. | Solo documentazione. | Da correggere in F6. `⟂ F6` |

---

## 2. Utenti e obiettivi

### 2.1 Persone

| Persona | Contesto d'uso | Vincoli che pesano sul design |
|---|---|---|
| **P1 · Giocatore amatoriale** (primaria) | 5–20 tornei a stagione (maggio–agosto), quasi tutti 2vs2 e spesso sulla riviera adriatica. Usa il telefono **in spiaggia, tra una partita e l'altra** (pause di 10–30 minuti). | Sole diretto, quindi contrasto alto. Una mano sola, a volte bagnata o con sabbia: bersagli ≥44pt, niente gesti di precisione. Rete 3G/4G a singhiozzo: niente perdite di dati. Poco tempo: ≤3 tocchi per l'azione più frequente. |
| **P2 · Revisore da desktop** (secondaria) | A casa dopo il weekend: completa i dettagli, aggiunge le foto, guarda le statistiche. | Tastiera e mouse, finestra larga (≥900), link apribili in un'altra scheda. |
| **P3 · Compagno collegato** | Qualcuno l'ha collegato come compagno e vede i tornei di un altro **in sola lettura**. | Deve capire perché non può modificare, senza scoprirlo da un errore. |
| **P4 · Admin (alpha)** | Smista le segnalazioni. | Vuole la bacheca a un tocco dal Profilo, non in fondo a una pagina lunga. |

### 2.2 Obiettivi (jobs-to-be-done) e criteri di successo

| ID | L'utente vuole… | Successo misurabile |
|---|---|---|
| G1 | **Registrare un torneo** prima, durante o dopo averlo giocato | Da qualunque schermata, il form si apre in ≤2 tocchi. Si salva con il solo nome. Dopo il salvataggio si arriva sul dettaglio. |
| G2 | **Segnare il risultato di una partita** tra un match e l'altro | Ad app chiusa, con un torneo in corso oggi: ≤3 tocchi fino ai campi del punteggio (Home → "＋ Partita" → campi). Il form non va mai perso per una rete instabile. |
| G3 | **Ritrovare un torneo passato** per nome, città, avversario, nota o didascalia | Ricerca raggiungibile in 1 tocco da Tornei, risultati mentre si scrive, il perché del riscontro visibile (partita con l'avversario cercato). |
| G4 | **Capire come sto andando** (stagione, compagni, fasi) | Statistiche a 1 tocco dalla Home, filtri visibili, ogni grafico con il suo stato vuoto. |
| G5 | **Condividere** un torneo (Storia) o la stagione (Wrapped) | PNG corretto (font giusto, niente artefatti) su iOS Safari e Chrome Android. Condivisione nativa dove esiste, download altrimenti. |
| G6 | **Trovare chi c'è oggi in spiaggia** e farsi trovare | Check-in in ≤2 tocchi dalla Home, con la città precompilata. |
| G7 | **Gestire compagni e condivisioni** | Collegare e scollegare con una conferma. Capire cosa succede ai dati. |
| G8 | **Segnalare un problema** (l'app è in alpha) | ≤2 tocchi dal Profilo, più il banner alpha della Home. |
| G9 | (Admin) **Smistare le segnalazioni** | Bacheca a 1 tocco dal Profilo, con filtro per stato. |

**Fuori scope** in questo giro: dark mode, nuove funzioni sui dati, realtime, tour di onboarding, coda di scritture offline, recupero password (manca del tutto, vedi Q19), nuove dipendenze runtime, migration e RPC.

---

## 3. Architettura dell'informazione

### 3.1 Mappa del sito

```
(pubblico)
├─ /presentazione               landing statica, fuori dall'app (niente React né Supabase): contratto nella Parte L
└─ Login                        qualunque percorso senza sessione → Login (l'URL resta)

(autenticato)
├─ Home  /                                         tab Home
│   ├─ Statistiche        /statistiche             push
│   ├─ Beach Wrapped      /wrapped                 visore a tutto schermo
│   └─ Chi c'è oggi       /oggi                    push (anche dal ＋)
├─ Tornei  /tornei                                 tab Tornei · vista Lista
│   ├─        /tornei/timeline                     vista Timeline (ex Diario)
│   ├─        /tornei/mappa                        vista Mappa
│   ├─        /tornei?q=…                          ricerca attiva (su qualunque vista)
│   └─ Dettaglio torneo  /tornei/:id               push
│        ├─ [sheet]  Modifica torneo
│        ├─ [sheet]  Nuova / Modifica partita
│        ├─ [sheet]  Aggiungi foto
│        ├─ [visore] Storia Instagram
│        └─ [visore] Foto (lightbox)
├─ ＋  (azione, non è una rotta)                    action sheet
│   ├─ Nuovo torneo      → [sheet] Nuovo torneo ─→ (link) Assistente /crea
│   ├─ Aggiungi partita  → [sheet] Nuova partita
│   └─ Check-in oggi     → /oggi
├─ Compagni  /compagni                             tab Compagni
│   ├─ [sheet] Nuovo compagno
│   └─ Dettaglio compagno  /compagni/:id           push
│        └─ [sheet] Collega a un utente
├─ Profilo  /profilo                               tab Profilo
│   ├─ [sheet] Cambia password
│   ├─ Segnala un problema   /profilo/segnala      push (anche dal banner alpha)
│   └─ Segnalazioni ricevute /profilo/segnalazioni push · solo admin
├─ Assistente guidato  /crea                       a tutto schermo, senza tab bar
└─ /diario  →  redirect (replace) a /tornei/timeline
```

### 3.2 Glossario dell'interfaccia

Questi termini si usano sempre e solo in questo modo.

| Termine UI | Significa | Da non usare |
|---|---|---|
| **Torneo** | una manifestazione con data e luogo | evento, gara |
| **Partita** | un match dentro un torneo, con set e punteggi | incontro, match |
| **Compagno** | la persona con cui si gioca | socio, partner (nell'UI) |
| **Luogo** | spiaggia o impianto (venue) | venue, location |
| **Piazzamento** | il risultato finale nel torneo | posizione |
| **Stagione** | l'anno del filtro (`fYear`); "Sempre" = tutte | periodo, anno |
| **Condiviso** | torneo o compagno di un altro, in sola lettura | |
| **Check-in** | segnalare "sono in spiaggia oggi a X" | |
| **Storia** | PNG 1080×1920 di un torneo | story, post |
| **Beach Wrapped** | il recap della stagione | |

### 3.3 Stato condiviso che attraversa le schermate

| Stato | Dove vive | Chi lo legge | Dove si vede e si cambia |
|---|---|---|---|
| Stagione (`fYear`, default "Sempre") | App (`useScreenData`) | Statistiche, numeri chiave della Home, Mappa, Wrapped | **Statistiche** (selettore) e **Mappa** (selettore nella stessa riga delle statistiche). Nella Home si vede come etichetta ("Stagione 2026"), che porta a Statistiche. |
| Compagno (`fPartner`, default "all") | App | Statistiche, Wrapped | Statistiche |
| Vista di Tornei (`lista`/`timeline`/`mappa`) | **URL** (segmento) più l'ultima usata in memoria | Tornei | Tornei (segmented). Toccando la tab Tornei si torna all'ultima vista usata. |
| Ricerca (`q`) | **URL** (`?q=`, sempre in `replace`) | Tornei | Campo di ricerca in Tornei |
| Filtro formato (Lista) | stato locale di Tornei | Lista | FilterChips. **Si azzera** quando il formato sparisce dai dati (difetto #2). |
| Banner alpha chiuso | `localStorage` per utente | Home | Banner (×). Riapribile da Profilo → "Segnala un problema", che resta sempre visibile. |

---

## 4. Modello di navigazione e contratto del router

### 4.1 Tabella delle rotte

Il file è **`src/app/routes.ts`**, nuovo: le rotte non vanno in `models.ts`, che è condiviso con l'app mobile.

| Percorso | `Route` | Tab attiva | `document.title` | Indietro (in UI) |
|---|---|---|---|---|
| `/` | `{ name: 'home' }` | home | `Home · Beach Diary` | n/a |
| `/statistiche` | `{ name: 'statistiche' }` | home | `Statistiche · Beach Diary` | Home |
| `/wrapped` | `{ name: 'wrapped' }` | home | `Beach Wrapped · Beach Diary` | ✕ (chiude) |
| `/oggi` | `{ name: 'oggi' }` | home | `Chi c'è oggi · Beach Diary` | Home |
| `/tornei` | `{ name: 'tornei', vista: 'lista' }` | tornei | `Tornei · Beach Diary` | n/a |
| `/tornei/timeline` | `{ name: 'tornei', vista: 'timeline' }` | tornei | idem | n/a |
| `/tornei/mappa` | `{ name: 'tornei', vista: 'mappa' }` | tornei | `Mappa dei tornei · Beach Diary` | n/a |
| `/tornei/:id` | `{ name: 'torneo', id }` | tornei | `{nome torneo} · Beach Diary` | Tornei (alla vista ricordata) |
| `/compagni` | `{ name: 'compagni' }` | compagni | `Compagni · Beach Diary` | n/a |
| `/compagni/:id` | `{ name: 'compagno', id }` | compagni | `{nome} · Beach Diary` | Compagni |
| `/profilo` | `{ name: 'profilo' }` | profilo | `Profilo · Beach Diary` | n/a |
| `/profilo/segnala` | `{ name: 'segnala' }` | profilo | `Segnala un problema · Beach Diary` | Profilo |
| `/profilo/segnalazioni` | `{ name: 'segnalazioni' }` | profilo | `Segnalazioni · Beach Diary` | Profilo |
| `/crea` | `{ name: 'crea' }` | nessuna (tab bar nascosta) | `Assistente · Beach Diary` | ✕ Esci |
| `/diario` | redirect `replace` a `/tornei/timeline` | | | |
| tutto il resto | `{ name: 'nonTrovato' }` | nessuna | `Pagina non trovata · Beach Diary` | Home |

**Regole di parsing.**
- `timeline` e `mappa` sono **parole riservate** sotto `/tornei/` e si confrontano prima di `:id`.
- Gli id sono UUID; un segmento che non è UUID né parola riservata dà `nonTrovato`.
- La barra finale viene ignorata (`/tornei/` = `/tornei`).
- **L'hash non si tocca mai**: supabase-js lo usa per i token di conferma e OAuth (`detectSessionInUrl`), quindi il router non deve leggerlo né riscriverlo.
- Query riconosciute: `q` su `tornei`. Le altre si conservano ma non si interpretano.

**Firma proposta** (`⟂ F3`; i nomi sono vincolanti, l'implementazione no):

```ts
// src/app/routes.ts
export type TabKey = 'home' | 'tornei' | 'compagni' | 'profilo'
export type TorneiVista = 'lista' | 'timeline' | 'mappa'
export type Route =
  | { name: 'home' } | { name: 'statistiche' } | { name: 'wrapped' } | { name: 'oggi' }
  | { name: 'tornei'; vista: TorneiVista; q?: string }
  | { name: 'torneo'; id: string }
  | { name: 'compagni' } | { name: 'compagno'; id: string }
  | { name: 'profilo' } | { name: 'segnala' } | { name: 'segnalazioni' }
  | { name: 'crea' } | { name: 'nonTrovato' }
export function parseLocation(pathname: string, search: string): Route   // include i redirect
export function routeHref(r: Route): string
export function routeTab(r: Route): TabKey | null
export function routeParent(r: Route): Route | null                      // per l'Indietro senza storia
export const OGGI_ATTIVO: boolean                                        // C1

// src/app/router.ts (History API + popstate, nessuna dipendenza)
useRoute(): Route
navigate(to: Route, opts?: { replace?: boolean }): void
goBack(fallback: Route): void          // history.back() se la voce è nostra, altrimenti navigate(fallback, {replace})
<Link to={Route}>                      // <a href> vero: intercetta solo il click sinistro senza modificatori
openOverlay(o: Overlay): void          // voce di history leggera (§4.3)
closeOverlay(): void
```

`TorneiVista` oggi è esportato da `src/screens/Tornei.tsx`. In F3 si sposta in `routes.ts` e prende il valore in più `'timeline'`.

### 4.2 Semantica della history

| Gesto | Operazione | Motivo |
|---|---|---|
| Aprire un dettaglio (card, riga, link) | `push` | è un livello più in profondità |
| Cambiare tab | `push` verso **la radice della tab**. Per Tornei la radice è l'ultima vista usata. | comportamento web prevedibile: il tasto indietro di Android ripercorre le tab visitate |
| Ritoccare la tab attiva | se si è alla radice: scroll in cima animato (salvo `reduced-motion`). Altrimenti `navigate(radice)` in push. | convenzione iOS |
| Cambiare vista Lista/Timeline/Mappa | `replace` | il segmented non crea storia (iOS). L'indietro da Mappa non deve tornare a Lista. |
| Scrivere nella ricerca | `replace` di `?q=` (debounce di 250ms) | l'indietro non deve ripercorrere le lettere |
| Azione completata che porta altrove (torneo creato → dettaglio) | **`replace` della voce overlay** con la destinazione | evita la corsa con il `popstate` asincrono e lascia la history pulita |
| Eliminazione riuscita del torneo o compagno aperto | `replace` verso la lista | l'indietro non deve riportare a un dettaglio che non esiste più |
| Redirect (`/diario`, segnalazioni senza diritti) | `replace` | |

**Pulsante Indietro della NavBar**: usa `goBack(routeParent(route))`.
- Se la voce precedente è dell'app (`history.state.idx > 0`), chiama `history.back()` e l'etichetta è il titolo della schermata precedente, salvato in `history.state.prevTitle`. Per un dettaglio aperto dalla Home l'etichetta è quindi "Home".
- Altrimenti (deep link, refresh) naviga al genitore con `replace` e l'etichetta è il titolo del genitore.

**Scroll.**
- `history.scrollRestoration = 'manual'`.
- Su `push` si scrolla in cima.
- Su indietro/avanti si ripristina la posizione salvata nello `state` di quella voce. Su desktop il contenitore che scorre è `<main>`, quindi è lui a salvare e ripristinare.

### 4.3 Sheet, dialoghi e visori nella history

Tutti gli overlay (sheet, action sheet, ConfirmDialog, visore Storia, lightbox) **aggiungono una voce di history leggera**: stesso URL, `state.overlay = <id>`.

1. **Indietro** (tasto del telefono o del browser) **chiude l'overlay in cima** e non cambia pagina.
2. Chiusura dall'interfaccia (✕, Annulla, tocco sullo sfondo, trascinamento, `Esc`): `closeOverlay()` chiama `history.back()` solo se la voce in cima è la nostra.
3. **Modifiche non salvate.** Se lo sheet ha un modulo *sporco*, cioè con almeno un campo diverso dal valore iniziale:
   - indietro, sfondo e trascinamento **non** chiudono; mostrano invece il ConfirmDialog «Scartare le modifiche?» con [Scarta] e [Continua a modificare];
   - se l'evento era un `popstate`, la voce overlay si **ri-aggiunge** prima di mostrare il dialogo, perché il `popstate` non si può annullare.
4. **Refresh con un overlay aperto**: all'avvio `state.overlay` viene ignorato e ripulito con `replaceState`, quindi gli sheet non si riaprono da soli.
5. **Overlay impilati**: al massimo due (sheet più ConfirmDialog, oppure action sheet che passa a uno sheet). Quando l'action sheet apre uno sheet, **sostituisce** la propria voce (`replaceState`), così l'indietro dallo sheet non riapre l'action sheet.
6. **Non hanno una rotta** (decisione): Storia, lightbox, sheet. Hanno una rotta: `/wrapped` (dal piano) e `/crea` (schermata intera).

**Reducer dei modali** (`ModalHost`, `⟂ F3`). Sostituisce `ModalKind` più `editId`, `storyT`, `fabOpen` e `form` sparsi in App:

```ts
type Overlay =
  | { kind: 'crea' }                                              // action sheet del ＋
  | { kind: 'torneo'; mode: 'nuovo' } | { kind: 'torneo'; mode: 'modifica'; id: string }
  | { kind: 'partita'; mode: 'nuova'; tournamentId: string | null }
  | { kind: 'partita'; mode: 'modifica'; matchId: string }
  | { kind: 'foto'; tournamentId: string }
  | { kind: 'compagno' }                                          // nuovo compagno
  | { kind: 'collega'; partnerId: string }                        // collega a un utente
  | { kind: 'password' }
  | { kind: 'storia'; tournamentId: string }
  | { kind: 'lightbox'; tournamentId: string; index: number }
  | { kind: 'conferma'; spec: ConfirmSpec }
```

Il nome `crea` per l'action sheet **non** è la rotta `/crea`. Se crea confusione, chiamarlo `azioni`. Decide `⟂ F3`, ma va scelto una volta per tutte.

### 4.4 Gestione del focus al cambio di rotta

- A ogni navigazione (push, replace, popstate) il focus va **all'`<h1>` della schermata** (`tabIndex={-1}`) e `document.title` si aggiorna. Fa eccezione il solo cambio di `?q=`, perché il focus deve restare nel campo di ricerca.
- Su indietro/avanti il focus torna, se possibile, **all'elemento che aveva aperto il dettaglio** (la card), salvato nello `state` della voce. È più utile del titolo quando si scorre una lista.
- Un annuncio `aria-live="polite"` sul solo titolo della nuova pagina va bene come rinforzo, ma deve esserci **uno solo** dei due meccanismi che parla. Preferito: il focus sull'h1.

### 4.5 Autenticazione e deep link

- Senza sessione su qualunque percorso si mostra **Login senza cambiare URL**. Dopo il login si arriva esattamente al percorso richiesto.
- Logout: `navigate(home, {replace: true})`, poi Login.
- Gli **id che non esistono o non sono visibili** (eliminati, oppure condivisioni revocate) mostrano lo stato "non trovato" (§6) e non la lista.
- `/profilo/segnalazioni` senza ruolo admin fa redirect `replace` a `/profilo`. È solo UI: il cancello vero è la RPC `is_admin()`.

### 4.6 Gating funzionale

- `OGGI_ATTIVO=false` fa sì che `/oggi` dia `nonTrovato` e nasconde la card in Home e la voce nel ＋.
- Wrapped non disponibile (calendario o dati) mostra su `/wrapped` lo stato "in arrivo" (§6.5), mai una pagina vuota.

### 4.7 Vercel e service worker

- `vercel.json` riceve una `rewrite` SPA verso `/index.html` per i percorsi dell'app. Deve **escludere** `/presentazione` (la landing, che è una seconda pagina della build), `/icons/*`, `/assets/*`, `/sw.js`, `/manifest.webmanifest` e `/offline.html`. `⟂ F3`
- `sw.js` intercetta solo le **navigazioni** e serve `offline.html` quando la rete fallisce. Con le rotte nuove resta corretto, perché ogni percorso dell'app è una navigazione. La verifica è manuale (§14.3). Il SW lo registra la landing, non l'app: chi non è mai passato da `/presentazione` non ha la pagina offline. Va accettato, perché è fuori scope.
- La CSP non cambia: nessuna origine nuova.

### 4.8 Analytics e percorsi

Con gli URL, Vercel Analytics conta le pageview **per percorso**. Per non avere un percorso per ogni UUID, `<Analytics beforeSend>` deve normalizzare `/tornei/<uuid>` in `/tornei/[id]` e `/compagni/<uuid>` in `/compagni/[id]` (Q11). `⟂ F3`. Clarity resta com'è: gli UUID non sono dati personali.

### 4.9 Ricaricamento dei dati

Il comportamento attuale resta: `reload()` scatta a ogni cambio di **rotta**, al focus e al ritorno visibile. Non scatta invece sull'apertura e chiusura degli overlay né sui cambi di `?q=`. Gli effetti RPC per schermata si spostano senza modifiche in `useScreenData` e si legano al `name` della rotta invece che a `screen`. `⟂ F3`

### 4.10 Primo caricamento fallito: come riconoscerlo senza toccare `useDiary`

App si monta mentre `useDiary().loading === true` (Splash). Nel momento in cui `loading` passa a `false`:
- se c'è un `error` → `caricamento = 'fallito'`;
- altrimenti → `caricamento = 'pronto'`.

Finché lo stato resta `'fallito'` tutte le schermate di dati mostrano l'ErrorState (§6.0) e **non** lo stato vuoto. "Riprova" chiama `reload()`: se va a buon fine (`error` torna `null`), lo stato passa a `'pronto'`. Gli errori successivi (`'pronto'` + `error`) sono errori di mutazione o di reload e restano Toast. `⟂ F3`

---

## 5. Flussi

Notazione:
```
[Schermata]   (sheet/dialogo)   {decisione}   ──▶ avanti   ⇢ ramo di errore   ✓ esito
```

### F0. Avvio e autenticazione

```
apertura app
  └─▶ [Splash "Caricamento…"]  ← useAuth.loading
        {sessione?}
          ├─ no ──▶ [Login] ──(Entra / Crea account)──▶ {ok?}
          │                    ├─ sì ──▶ (torna sopra con la sessione)
          │                    ├─ conferma email richiesta ──▶ [Login] con avviso verde, modalità Accedi
          │                    └─ ⇢ errore inline sotto il form (role=alert), campi intatti
          └─ sì ──▶ [Splash] ← useDiary.loading (stessa grafica, nessuno sfarfallio)
                     {primo caricamento?}
                       ├─ ok ──▶ rotta richiesta ✓
                       └─ ⇢ ErrorState "Non riesco a caricare il diario" [Riprova]
  (in parallelo) {consenso già espresso?} no ──▶ (Cookie e statistiche) bloccante, in basso
```
- Lo **splash resta uno solo** dall'autenticazione ai dati: stessa posizione e stesso testo, così non si vedono due caricamenti diversi uno dopo l'altro.
- Dopo 10 secondi sullo splash **DOVREBBE** comparire il testo «Ci sta mettendo più del solito.» con il pulsante [Riprova] (ricarica la pagina). `useAuth` non ha un `.catch`, quindi oggi lo splash può restare per sempre. Il timer si mette in `Root` e `useAuth` non si tocca. `⟂ F4`

### F1. Primo avvio (account appena creato)

```
[Home vuota]
  ├─ banner alpha (compatto, chiudibile)
  ├─ EmptyState "Il tuo diario è vuoto"
  │     [Crea il primo torneo] ──▶ (Nuovo torneo) ──▶ F2
  │     link "Preferisci farti guidare? Usa l'assistente" ──▶ /crea ──▶ F11
  └─ card "Sei in spiaggia oggi?" [Fai check-in] ──▶ /oggi ──▶ F6   (solo se OGGI_ATTIVO)
```
- I numeri chiave e il link "Statistiche" **non** compaiono finché non c'è almeno una partita: una fila di zeri non è un'informazione.
- Tornei e Compagni mostrano il proprio EmptyState con un CTA, un vero `<button>` (difetto #4).
- **Niente tour d'onboarding.** Il primo avvio lo spiegano gli stati vuoti.

### F2. Creare un torneo (sheet unificato)

Ci si arriva da: ＋ → "Nuovo torneo" · Sidebar "＋ Nuovo" → "Nuovo torneo" · EmptyState di Home, Tornei o Mappa.

```
(Nuovo torneo)
  Essenziali:  Nome* · Data · Dove hai giocato · Con chi · Com'è andata
  [▸ Altri dettagli  · Amatoriale · 2vs2 · Sabbia outdoor]   ← riassunto dei valori correnti
      Categoria · Formato · Superficie · Tabellone · Etichetta colore
  link "Preferisci farti guidare? Usa l'assistente →"
  [Annulla]                                   [Crea torneo] (disattivo finché Nome è vuoto)
      │
      ├─ Crea torneo ──▶ stato "Creo…" (pulsante occupato, campi bloccati)
      │     ├─ ✓ ──▶ replace overlay → /tornei/:id  + Toast "Torneo creato"
      │     └─ ⇢ lo sheet resta aperto con i dati intatti + Toast d'errore (offline: testo dedicato)
      ├─ link assistente {modulo sporco?}
      │     ├─ no ──▶ /crea
      │     └─ sì ──▶ (Passare all'assistente? Quello che hai scritto qui non viene portato) [Passa] [Resta]
      └─ Annulla / indietro / sfondo / trascinamento {sporco?} ──▶ chiudi | (Scartare le modifiche?)
```

**Campi e default** (unione dei campi di TorneoModal e QuickTorneoModal):

| Campo | Controllo | Default alla creazione | Note |
|---|---|---|---|
| Nome torneo* | TextField, placeholder «es. Summer Cup Rimini» | vuoto | Il focus arriva qui **a fine animazione** di apertura. Unico obbligatorio. |
| Data | `type=date` | oggi (vedi Q20 su UTC) | |
| Dove hai giocato | **VenuePicker**, tutte le funzioni (ricerca, nuovo luogo, GPS, unisci) | nessun luogo | La scelta di un luogo con superficie aggiorna "Superficie" (comportamento attuale di `suggestSurface`). |
| Con chi | Select: «Nessuno», i compagni, «＋ Nuovo compagno…» (mostra il campo nome) | **il compagno del torneo proprio più recente**, altrimenti «Nessuno» (Q21) | Il Quick partiva dal primo compagno, il form completo da nessuno. |
| Com'è andata | Select dei `PLACEMENTS` | **«In corso»** | Il badge mostra "1°" più l'icona trofeo (C15). |
| *Altri dettagli*: Categoria | Select `CATEGORIES` | Amatoriale | |
| *Altri dettagli*: Formato | Segmented 2vs2 · 3vs3 · 4vs4 | 2vs2 | |
| *Altri dettagli*: Superficie | Select | Sabbia outdoor (o quella del luogo) | |
| *Altri dettagli*: Tabellone | Select «Nessuno», Gold, Silver, Bronze, Girone unico | Nessuno | |
| *Altri dettagli*: Etichetta colore | **radio group** di 5 campioni (`role=radiogroup`, frecce, nome accessibile per ognuno: "Arancio", "Azzurro", "Giallo", "Rosa", "Blu notte") | Arancio | Oggi sono `div` non raggiungibili. |

- **Modifica** (dal menu "…" del dettaglio): è lo stesso sheet con titolo «Modifica torneo» e pulsante «Salva».
  - "Altri dettagli" è **aperto**: chi modifica di solito cerca proprio un dettaglio.
  - Sotto la nota «Cambiandolo, il compagno viene aggiornato su tutte le partite del torneo.» c'è «Elimina torneo» (distruttivo), che apre ConfirmDialog (§7.7).
- Su un **torneo condiviso** lo sheet non si apre. La voce di menu non esiste e, se ci si arriva comunque, compare il Toast «Questo torneo è condiviso da un altro utente: solo chi l'ha creato può modificarlo.».
- **Doppio tocco**: il pulsante occupato ignora i tocchi successivi. Oggi nessun modale lo fa.
- **Analytics**: `torneo_creato { via: 'rapido' }` se "Altri dettagli" non è mai stato aperto, `{ via: 'completo' }` se lo è stato. La serie storica resta confrontabile (§13).
- **Seam di salvataggio** (Q2): `saveTorneo` oggi restituisce `boolean` e non l'id, quindi non si può navigare al dettaglio. `quickCreateTorneo` restituisce l'id ma ignora Formato, Superficie e Colore. `⟂ F5`

### F3. Aggiungere una partita

Ci si arriva da: Home → card "Oggi giochi" → [＋ Partita] · ＋ → "Aggiungi partita" · dettaglio → [＋ Aggiungi partita] · EmptyState delle partite.

```
{torneo di destinazione}
  1. sei su /tornei/:id e il torneo è tuo                       → quello
  2. un tuo torneo con data = oggi                              → quello (il primo in ordine agenda)
  3. un tuo torneo «In corso» con data ≤ oggi, il più recente   → quello
  4. il tuo torneo più recente                                  → quello
  5. nessun torneo tuo                                          → la voce "Aggiungi partita" non compare
(Nuova partita)  Torneo (select, preselezionato) · Fase · Avversari · Set ×2 (fino a 3) · Note
   [Annulla]                                              [Salva partita]
     ├─ ✓ {eri già sul dettaglio di quel torneo?}
     │       ├─ sì ──▶ chiudi, la lista partite si aggiorna, Toast "Partita aggiunta"
     │       └─ no ──▶ replace overlay → /tornei/:id, Toast "Partita aggiunta a «X»"
     └─ ⇢ lo sheet resta aperto con i dati + Toast d'errore
```
- Il sottotitolo della voce nel ＋ dice **dove** andrà la partita: «a «Rimini Open»». L'utente non deve indovinarlo.
- **Set**: due righe vuote di default e massimo 3. Ogni riga ha "Set N" con i campi "Noi" e "Loro", entrambi `inputmode="numeric"` con un'etichetta vera (oggi solo placeholder). Una riga a metà **non si scarta in silenzio**: viene segnalata («Completa il set 2 o toglilo»). `⟂ F4`
- Avversari vuoto: si salva come «Avversari» (comportamento attuale). Il placeholder lo dice: «es. Bianchi / Verdi (facoltativo)».
- **Modifica** (tocco sulla riga): lo stesso sheet, «Modifica partita», «Salva» ed «Elimina partita», che apre ConfirmDialog.
- Partite di un torneo condiviso: la riga non è interattiva.

### F4. Ritrovare un torneo (Tornei)

```
[Tornei]  large title + sottotitolo dal vivo
  ├─ ricerca (role=search)
  │     q ≠ '' ──▶ segmented e chip nascosti; lista dei risultati (card stile Timeline con le partite che combaciano)
  │               └─ 0 risultati ──▶ EmptyState "Nessun torneo contiene «q»" [Cancella la ricerca]
  │     Esc / ✕ / campo svuotato ──▶ si torna alla vista di prima
  ├─ segmented  Lista · Timeline · Mappa · {n città}   (replace)
  │     Lista    ──▶ FilterChips formato (solo con ≥2 formati) · "Prossimi tornei" · gruppi per formato
  │     Timeline ──▶ voci cronologiche (ex Diario): data, recap, foto, [Storia]
  │     Mappa    ──▶ selettore stagione · statistiche · mappa (lazy) · legenda · elenco città · bucket
  └─ tocco su una card / riga / città-torneo ──▶ push /tornei/:id
```
- **Sottotitolo** (difetto #1). Descrive **ciò che si vede**: `{n} torneo|tornei · {p} podio|podi`, contato sulle card visibili, quindi formato attivo compreso. È una live region (`role="status"`). In Timeline: `{n} tornei nel diario`. Con la ricerca attiva: `{n} risultati per «q»` (il testo di oggi del Diario).
- **La Lista non è filtrata per stagione** (C10): è l'archivio. La stagione agisce solo sulla Mappa, e lì si vede.
- **Filtro scartato** (difetto #2): quando un formato sparisce dai dati, lo stato torna a "Tutti" e non si riattiva da solo.
- **Ricerca**:
  - fuzzy, quella di oggi (`deriveDiarySearch`), applicata alle voci del diario;
  - i risultati sono gli stessi in qualunque vista;
  - `/` mette il focus sul campo (desktop, PUÒ);
  - nella NavBar compatta, dopo lo scroll, un'icona lente riporta in cima e mette il focus sul campo (DOVREBBE).

### F5. Dettaglio torneo

```
[Torneo]  NavBar: ‹ Indietro · (titolo compatto dopo lo scroll) · [⋯]
  ⋯ menu (proprio):     Modifica · Storia Instagram · ─ · Elimina torneo (distruttivo)
  ⋯ menu (condiviso):   Storia Instagram
  intestazione: categoria · badge piazzamento · [Condiviso con te · sola lettura]
                h1 nome · meta · 📍 storia del luogo
  [＋ Aggiungi partita]   (solo proprio; pulsante pieno, principale della schermata)
  statistiche (6 riquadri)   ← nascoste se 0 partite; al loro posto l'EmptyState delle partite
  Luogo (se ha coordinate): VenueMap lazy, segnaposto alto 200 + link "Apri la mappa ↗"
  Partite: righe <button> → (Modifica partita)
  Foto: [＋ Aggiungi foto] · griglia → (lightbox) · ogni foto ha [Elimina foto] → ConfirmDialog
```
- Elimina torneo → ConfirmDialog «Eliminare «{nome}»?», con il testo «Spariscono anche le sue {n} partite e {m} foto. Non si può annullare.». Se riesce: `replace` a `/tornei` (alla vista ricordata) e Toast «Torneo eliminato». Se fallisce: Toast d'errore e si resta sul dettaglio (C13).
- **Foto**:
  - l'upload apre (Aggiungi foto), con una dropzone che è un vero `<button>`;
  - durante il caricamento c'è uno stato occupato «Carico…» (oggi non c'è) e lo sheet non si può chiudere;
  - errori inline (formato, oltre 5 MB) con `role="alert"`;
  - se va a buon fine: Toast «Foto aggiunta».

### F6. Check-in "Chi c'è oggi" (solo se `OGGI_ATTIVO`)

```
Home card "Sei in spiaggia oggi?"  /  ＋ "Check-in oggi"
  └─▶ [Chi c'è oggi /oggi]
        {hai già fatto check-in?}
          ├─ no ──▶ modulo: Città (prefill dal torneo più recente + suggerimenti CITTA_SUGGERITE)
          │         · Giorno: Oggi · [switch] Cerco compagno · Nota (facoltativa, max 80)
          │         [Fai check-in] ──▶ ✓ card "Sei a {città} oggi" + la stanza si carica
          │                           ⇢ errore: Toast, modulo intatto
          │         stanza: "Fai check-in per vedere chi c'è oggi…" (reciprocità)
          └─ sì ──▶ card "Sei a {città} oggi" [Termina check-in] ──▶ ConfirmDialog leggero ──▶ modulo
                    stanza: {caricamento} "Aggiornamento…" | {vuota} "Ancora nessun altro qui. [Aggiorna]"
                            | chip Tutti/Cerca compagno (solo se separano qualcosa) | card persone
                    card persona [＋ Aggiungi come compagno] ──▶ occupato ──▶ ✓ "Aggiunto ai compagni" | ⇢ errore inline
```
- La stanza si carica **all'apertura della rotta** (decisione Q4 di "Chi c'è oggi": niente realtime).
- La card della Home mostra **solo il proprio stato** (`own`), già caricato al montaggio di `useCheckIn`, e non provoca richieste in più.

### F7. Compagni

```
[Compagni]  large title · [＋] (Nuovo compagno) nella NavBar
  ├─ (Nuovo compagno) Nome* [Annulla][Salva] ──▶ ✓ chiudi + Toast "«Giulia» aggiunto ai compagni"
  └─ card ──▶ push /compagni/:id
[Compagno]  ‹ Compagni · [⋯ Elimina compagno]
  Condivisione:
    non collegato ──▶ riga "Collega a un utente" ──▶ (Collega «X» a un utente)
                       campo di ricerca (min 3 lettere) · "Cerco…" · "Nessun utente trovato."
                       risultato <button> ──▶ occupato ──▶ ✓ chiudi + Toast "Collegato" | ⇢ errore inline
    collegato     ──▶ "Collegato a un utente" [Scollega] ──▶ ConfirmDialog ──▶ ✓ Toast
  statistiche · Partite insieme (righe <button> → Modifica partita)
  Elimina compagno ──▶ ConfirmDialog (testo attuale, «socio» → «compagno») ──▶ ✓ replace /compagni + Toast
```

### F8. Statistiche e Beach Wrapped

```
Home "Numeri chiave" (tocco) / riga "Tutte le statistiche" ──▶ push /statistiche
[Statistiche]  ‹ Home · filtri: Compagno ▾ · Stagione ▾
   (Beach Wrapped {disponibile}) · Andamento · Vinte/perse · Punti · Per fase · Piazzamenti · Per compagno
Home card "Beach Wrapped" / riga in Statistiche ──▶ push /wrapped
[Wrapped]  visore a tutto schermo: ✕ · barre di avanzamento · card (tap, swipe, ← →, Spazio)
   ultima slide: [Condividi] [↓ Scarica]  (o solo [↓ Scarica il riepilogo])
   ✕ / Esc / indietro ──▶ goBack(home)
```
- L'intervallo di Wrapped segue la **stagione** condivisa, come oggi (`wrappedRangeForYear`).
- Un refresh su `/wrapped` riparte dalla stagione di default.

### F9. Profilo

```
[Profilo]  large title
  intestazione: avatar [Cambia foto profilo] (button) · nome · email · badge Admin
  Account      Nome (campo in linea; [Salva nome] compare solo se modificato)
               Email (sola lettura)
               Password ›  ──▶ (Cambia password) Nuova · Conferma [Aggiorna password]
                 (account Google/Apple: riga informativa al posto della voce)
  Condivisioni Condivisioni ricevute  {n}
               [Togli tutte le condivisioni] (distruttivo, solo con n > 0) ──▶ ConfirmDialog
  Privacy      Cookie e statistiche  {Accettati|Rifiutati|Da scegliere} ›  ──▶ riapre il dialogo del consenso
  Supporto     Segnala un problema ›  ──▶ /profilo/segnala
               Segnalazioni ricevute {n nuove} ›  ──▶ /profilo/segnalazioni   (solo admin)
  ─────────
  Esci  (distruttivo) ──▶ action sheet "Esci dall'account" [Esci] [Annulla]
  piè di pagina: "Beach Diary · versione alpha"
```

### F10. Segnala un problema e bacheca admin

```
banner alpha "Segnala un problema →" (Home) / Profilo › Segnala ──▶ push /profilo/segnala
[Segnala]  ‹ (Home o Profilo, secondo la history) · Dove succede ▾ · Il problema in una riga · Cosa è successo
   [Invia segnalazione] (disattivo finché incompleta) ──▶ occupato
      ├─ ✓ "Grazie, l'abbiamo ricevuta" [Segnala un altro problema] [Torna indietro]
      └─ ⇢ errore inline role=alert, campi intatti
[Segnalazioni ricevute] (admin)  chip per stato con i conteggi · elenco · cambio stato ottimistico
   caricamento: "Carico le segnalazioni…" · errore: [Riprova] · vuoto: "Nessuna segnalazione, per ora. Buon segno."
```
- "Torna alla home" diventa **"Torna indietro"**, che usa `goBack(profilo)`, perché ci si arriva da due posti.

### F11. Assistente guidato

Ci si arriva da: il link nello sheet "Nuovo torneo" · il link secondario dell'EmptyState di Home e Tornei · `/crea` diretto.

```
[/crea]  schermo intero, tab bar nascosta (la Sidebar resta su desktop)
  header: ✕ Esci · "Assistente torneo"
  trascrizione (role=log, aria-live=polite) ◀── domande una alla volta
  dock: campo di testo con etichetta  |  chip-pulsanti  |  punteggio set
  Esci {risposte date e torneo non creato?}
     ├─ no ──▶ goBack(tornei)
     └─ sì ──▶ (Uscire dall'assistente? Il torneo non è ancora stato creato: le risposte andranno perse.) [Esci] [Resta]
  riepilogo [✅ Crea torneo] [✏️ Ricomincia]
     ├─ ✓ "Fatto!" [Apri il torneo →] ──▶ replace /tornei/:id
     └─ ⇢ "Ops, qualcosa è andato storto…" + chip di nuovo attivi (UN SOLO canale d'errore: niente Toast doppio)
```
Correzioni obbligatorie (oggi l'assistente **non si usa da tastiera**, §8.2):

1. Ogni chip, ✕, "Salva partita", "Apri il torneo", "Crea un altro" e la rimozione dei set diventano `<button>`.
2. Dopo ogni domanda il focus va al **primo controllo del dock**: il campo, oppure il primo chip.
3. I campi hanno un'etichetta (quella visibile, oppure `aria-label` con il testo della domanda). Il pulsante d'invio ha il nome «Invia».
4. Con `prefers-reduced-motion` il ritardo di battitura è 0 e lo scroll non è animato.
5. Il testo «ti faccio due domande al volo» (sono 9–11) diventa «ti faccio qualche domanda al volo».
6. Indietro (tasto del telefono) equivale a ✕ Esci, con la stessa conferma.

---

## 6. Inventario degli stati, schermata per schermata

Legenda delle colonne:
- **Primo avvio**: account senza dati;
- **Vuoto**: nessun dato per quella vista;
- **Caricamento**: dati o chunk in arrivo;
- **Parziale**: dati incompleti ma validi;
- **Errore**: richiesta fallita;
- **Successo**: esito di un'azione;
- **Offline**: rete assente dopo l'avvio;
- **Utente esperto**: molti dati;
- **Sola lettura**: dati condivisi.

### 6.0 Stati trasversali (valgono per ogni schermata di dati)

| Stato | Comportamento |
|---|---|
| **Avvio** | Splash unico (F0). |
| **Primo caricamento fallito** (§4.10) | **ErrorState** a tutta pagina dentro la shell (tab bar visibile). <br>Titolo «Non riesco a caricare il diario». <br>Testo: online → «Qualcosa non ha risposto. I tuoi dati sono al sicuro.»; offline → «Sei offline. Il diario si carica quando torni in linea.». <br>[Riprova] chiama `reload()`. Con l'evento `online` riprova da solo una volta (DOVREBBE). |
| **Chunk lazy in caricamento** (Timeline, Mappa, assistente, Storia, Wrapped, VenueMap) | **Skeleton** della stessa altezza del contenuto che arriva, con `aria-busy="true"` sul contenitore. Mai il `<div padding:24/>` vuoto di oggi (`App.tsx:912`). |
| **Chunk lazy fallito** (deploy nuovo, rete) | Errore locale «Questa parte non si è caricata.» con [Riprova] (rimonta l'import). L'app non crasha: un error boundary per ogni area lazy. `⟂ F3` |
| **Offline dopo l'avvio** | Indicatore **persistente** «Sei offline» (Toast di stato, non si chiude da solo finché si è offline). <br>Le letture funzionano sui dati in memoria. <br>Le scritture falliscono con Toast «Sei offline: non ho salvato. Riprova quando torni in linea.» e **lo sheet resta aperto con i dati**. <br>Gli errori di `reload()` vengono taciuti (C20). |
| **Connessione lenta** | Toast transitorio di 5s «Connessione lenta: potrebbe volerci un po'.». Solo dove esiste la Network Information API. |
| **Diniego per piano** (dormiente) | Toast con il messaggio di `perm.check`. Nessun lucchetto e nessun badge. |
| **Torneo condiviso** (P3) | Etichetta «Condiviso con te · sola lettura» nell'intestazione. Righe partite non interattive. Nessun pulsante di modifica, ma la Storia è permessa. |

### 6.1 Home `/`

| Stato | Cosa si vede |
|---|---|
| Primo avvio | Banner alpha, poi EmptyState «Il tuo diario è vuoto» con [Crea il primo torneo] e il link all'assistente, poi la card check-in. Nient'altro. |
| Vuoto parziale (tornei senza partite) | La sezione *Adesso* funziona. Al posto dei numeri chiave c'è la nota «Aggiungi la prima partita per vedere i tuoi numeri» con [＋ Aggiungi partita]. |
| Caricamento | Nessuno visibile: i dati arrivano prima dallo splash. La dashboard server ricade sul calcolo client, che è istantaneo. |
| Parziale: *Adesso* | Ogni card compare **solo se ha qualcosa da dire**: <br>"Oggi giochi" (proprio, data = oggi) **oppure** "Prossimo torneo" (data futura più vicina, anche se condiviso); <br>"Ultimo risultato" (passato più recente con piazzamento ≠ In corso); se il passato più recente è ancora «In corso» diventa invece "Com'è andata a «X»?" con [Aggiorna il piazzamento], che apre Modifica torneo; <br>"Chi c'è oggi". |
| Wrapped | Card stagionale **dopo** *Adesso*, solo se `wrappedDisponibile()` e almeno `WRAPPED_MIN_MATCHES` partite. |
| Banner alpha chiuso | Sparisce e resta chiuso, salvato per utente (§3.3). |
| Errore | §6.0. |
| Utente esperto | La Home non cresce con i dati: *Adesso* ha al massimo 3 card e i numeri chiave sono 4. Il resto sta in Statistiche. |

**Ordine** (il contenuto prima del contorno):
1. NavBar con il large title «Ciao, {nome}» (Q22)
2. Banner alpha
3. *Adesso*
4. Beach Wrapped (stagionale)
5. *Numeri chiave* con l'etichetta di stagione
6. *Approfondisci* (ListGroup): «Tutte le statistiche ›», «Beach Wrapped ›» (quando disponibile)

Il widget dell'assistente, i grafici e "Ultimi tornei" **escono** dalla Home.

### 6.2 Statistiche `/statistiche`

| Stato | Cosa si vede |
|---|---|
| Vuoto (0 partite nel periodo) | Filtri visibili. Ogni card mostra il suo `EmptyNote`. **Nuovi** stati vuoti per *KeyNumbers*, *Vinte/perse* e *Punti* (oggi mostrano zeri): «Nessuna partita in questo periodo.». |
| Caricamento | Il calcolo client compare subito. Quando arriva la RPC i numeri **non devono saltare**: sono uguali per costruzione. |
| Parziale | *Andamento* vuole almeno 2 mesi («Servono partite in almeno due mesi diversi…»); *Per compagno* vuole partite con un compagno. |
| Filtri | Compagno: «Tutti i compagni» più l'elenco. Stagione: le stagioni con dati più «Sempre». Cambiarli aggiorna le card e annuncia, una volta sola, «Statistiche aggiornate: {etichetta periodo}» in modo polite. |
| Utente esperto | Più compagni: *Per compagno* mostra i primi 6 e un link «Vedi tutti» alla tab Compagni. |

### 6.3 Tornei `/tornei[/timeline|/mappa]`

| Stato | Lista | Timeline | Mappa |
|---|---|---|---|
| Primo avvio / vuoto | **Un solo** EmptyState per tutta la schermata, senza ricerca né segmented: «Nessun torneo ancora.» con [Crea il primo torneo] e il link all'assistente | (uguale) | (uguale) |
| Caricamento | n/a | Skeleton (chunk lazy, oggi Diario è `lazy`) | Statistiche e legenda subito; riquadro mappa con il segnaposto da 380px |
| Parziale | Solo passati, solo futuri, un formato solo (niente chip) | Voci senza foto e senza descrizione | Bucket «Fuori dall'Italia», «Non ancora sulla mappa», «senza luogo», «non ancora giocati», **tutti visibili** e mai silenziosi. Nota "pin approssimati" se ce n'è almeno uno con `preciso=false`. |
| Vuoto filtrato | Formato senza tornei: non succede (le opzioni vengono dai dati) | n/a | Stagione senza città: «Nessuna città in questa stagione.» e [Mostra tutte le stagioni] |
| Ricerca senza risultati | «Nessun torneo contiene «q».» con [Cancella la ricerca] | | |
| Errore | §6.0 | Chunk fallito → §6.0 | **Tile non caricate** (offline o OSM giù): la mappa resta grigia, con l'avviso dentro il riquadro «Mappa non disponibile senza rete: l'elenco qui sotto ha tutte le città.». Elenco e statistiche restano. |
| Offline | Funziona | Funziona (foto non caricate → riquadro colore) | Vedi errore |
| Sola lettura | Badge «Condiviso» sulla card | Idem | I tornei condivisi contano (la mappa usa i dati client) |
| Utente esperto (100+ tornei) | "Prossimi" in cima, poi gruppi per formato. Chip su una riga che scorre. | Le immagini si caricano in `lazy`. Oltre 60 voci compare [Mostra altri 60] invece di montare tutto (PUÒ). | Cluster (già fatto da markercluster) |

### 6.4 Dettaglio torneo `/tornei/:id`

| Stato | Cosa si vede |
|---|---|
| Caricamento (deep link prima dei dati) | Non capita, perché i dati arrivano allo splash. Se la RPC di dettaglio è in volo si usa il calcolo client, che è immediato. |
| **Non trovato** | Titolo «Torneo non trovato». Testo: «Potrebbe essere stato eliminato, o non è più condiviso con te.». Pulsante [Vai ai tornei]. Mai la lista al suo posto (C9). |
| 0 partite | Le 6 statistiche sono **nascoste**. Al loro posto l'EmptyState «Nessuna partita ancora.» con [＋ Aggiungi partita]. |
| Senza luogo, o luogo senza coordinate | Nessuna sezione "Luogo". Il nome del luogo resta nel `meta`. |
| VenueMap in caricamento | Segnaposto alto 200, stesso raggio della mappa. |
| VenueMap fallita | Oggi l'errore viene inghiottito (`VenueMap`). Spec: «Mappa non disponibile.» più il link «Apri la mappa ↗», che resta. |
| 0 foto | «Nessuna foto per questo torneo.» con [＋ Aggiungi foto] (proprio). |
| Foto legacy senza URL | Riquadro colore non interattivo, con l'etichetta accessibile «Foto non disponibile». |
| Sola lettura | §6.0 più il menu "…" con la sola Storia. |
| Successo | Toast: «Torneo aggiornato», «Partita aggiunta», «Partita aggiornata», «Partita eliminata», «Foto aggiunta», «Foto eliminata». |
| Errore di scrittura | Toast d'errore; sheet e dialoghi restano aperti. |
| Utente esperto | 20+ partite: elenco completo, niente paginazione. 30+ foto: griglia con le immagini in lazy. |

### 6.5 Visori: Storia, Wrapped, Foto

| Stato | Storia | Wrapped `/wrapped` | Foto (lightbox) |
|---|---|---|---|
| Caricamento | Skeleton della card in scala. Download disattivo finché i font non sono pronti, con timeout 3s come in Wrapped. | Barre e card. «Preparo…» sul pulsante finché il PNG non è in cache. | Spinner sull'immagine. Il contatore «i / n» resta visibile. |
| Vuoto / non disponibile | n/a | **Fuori stagione**: «Il recap arriva a fine stagione, da settembre.» <br>**Pochi dati**: «Servono almeno qualche partita in questo periodo…» (testo attuale). <br>Entrambi con [Ho capito] (un `<button>`) che chiude. | n/a |
| Generazione | «Generazione…», con il pulsante **disattivato** (oggi resta attivo) | idem | n/a |
| Errore | Toast «Impossibile generare l'immagine. Riprova.» | idem. Più il caso specifico «Immagine pronta: tocca di nuovo "Condividi".» | Download fallito: si apre l'immagine in una nuova scheda (comportamento attuale) |
| Successo | Download, oppure **foglio di condivisione nativo** dove esiste (oggi la Storia ha solo `data:` URL, che su iOS non funziona: va allineata a Wrapped) | Condividi oppure scarica; «Immagine copiata…» dove c'è il fallback agli appunti | |
| Offline | Le foto della Storia cadono in silenzio, e così si genera la versione senza foto. Font: si aspetta 3s, poi si genera con quel che c'è. | idem | Immagine non caricata: «Foto non disponibile offline.» |

### 6.6 Compagni `/compagni` e `/compagni/:id`

| Stato | Lista | Dettaglio |
|---|---|---|
| Primo avvio / vuoto | «Nessun compagno ancora.» con [Aggiungi un compagno] | n/a |
| Non trovato | n/a | «Compagno non trovato» con [Vai ai compagni] |
| 0 partite insieme | La card mostra «0 partite insieme» | Statistiche **nascoste**. Testo: «Ancora nessuna partita insieme.». |
| Ricerca utente (collega) | n/a | Meno di 3 lettere: «Scrivi almeno 3 lettere del nome. Se conosci la sua email, incollala per intero.». Poi «Cerco…», «Nessun utente trovato.», la lista, l'errore «Collegamento non riuscito.» (`role=alert`). |
| Successo | Toast ««X» aggiunto ai compagni» | Toast «Collegato», «Scollegato», «Compagno eliminato» (+ `replace` alla lista) |
| Sola lettura | Compagni `shared` (righe di altri): **non** sono nella lista Compagni (comportamento attuale, da preservare) | n/a |
| Utente esperto (30+) | Griglia ordinata come oggi. Ricerca nella NavBar (PUÒ). | n/a |

### 6.7 Chi c'è oggi `/oggi`

| Stato | Cosa si vede |
|---|---|
| Non in check-in | Modulo più la stanza bloccata (reciprocità): «Fai check-in per vedere chi c'è oggi e metterti in contatto.» |
| Check-in in corso | Pulsante «Check-in…», occupato e disattivo |
| In check-in, stanza in caricamento | «Aggiornamento…» (`role=status`) |
| Stanza vuota | «Ancora nessun altro qui.» con [Aggiorna] |
| Filtro senza risultati | «Nessuno sta cercando un compagno al momento.» |
| Persona aggiunta | «Aggiunto ai compagni» (`role=status`) al posto del pulsante |
| Errore | check-in o check-out: Toast, modulo intatto. Aggiungi compagno: errore inline (`role=alert`). |
| Offline | Il check-in fallisce: Toast offline. La stanza mostra l'ultimo stato noto con la nota «Aggiornato alle {hh:mm}» (DOVREBBE). |

### 6.8 Profilo, Segnala, Segnalazioni

| Schermata | Stati |
|---|---|
| Profilo | **Avatar in caricamento**: avatar al 60% più spinner, intestazione non interattiva. <br>**Avatar fallito**: errore inline sotto l'intestazione («Impossibile aggiornare la foto: …»). <br>**Nome**: [Salva nome] solo se modificato, «Salvataggio…», esito inline verde o rosso (`role=status`/`alert`). Se il nome è rifiutato si torna a quello in sessione (comportamento attuale). <br>**Password**: nello sheet; esito inline; se va a buon fine lo sheet si chiude con il Toast «Password aggiornata». <br>**Condivisioni**: 0 → spiegazione; >0 → conteggio, azione distruttiva, «Rimozione…», esito. <br>**Account OAuth**: riga informativa al posto di "Password". |
| Segnala | Incompleta: invio disattivo. Poi «Invio…», successo (pannello di ringraziamento), errore (`role=alert`), contatore caratteri. |
| Segnalazioni (admin) | «Carico le segnalazioni…», errore con [Riprova], «Nessuna segnalazione, per ora. Buon segno.», filtro vuoto: «Nessuna segnalazione in questo stato.». Il cambio di stato è ottimistico: se fallisce si ricarica. |

### 6.9 Login

| Stato | Cosa si vede |
|---|---|
| Accedi / Registrati | SegmentedControl con `aria-pressed`. Il link nel piede è un `<button>`. |
| Validazione | Errori `role="alert"` sotto il form, con l'elenco dei messaggi in §5 F0. |
| Nome (registrazione) | Controllo dal vivo: «Verifico disponibilità…», «✓ Nome disponibile», «✕ Nome già in uso», annunciati con `aria-live="polite"`. |
| Invio | «Attendere…». Anche i campi diventano `readonly` (oggi restano attivi). |
| Conferma email richiesta | Avviso verde (`role=status`), si passa ad Accedi, l'email resta |
| Offline | «Sei offline: non posso verificare le credenziali.» |
| Consenso cookie | Il dialogo bloccante si apre sopra il Login alla prima visita (comportamento attuale) |

### 6.10 Assistente `/crea`

| Stato | Cosa si vede |
|---|---|
| Sta scrivendo | **Un solo** indicatore (oggi due), cioè la bolla nella trascrizione, con l'annuncio polite «L'assistente sta scrivendo». Il dock **resta montato e disattivo**: smontarlo oggi fa cadere il focus sul `body`. |
| Riepilogo | Card di riepilogo più [Crea torneo] e [Ricomincia] |
| Salvataggio | «Sto creando il torneo…», dock assente |
| Successo | «🎉 Fatto!» con [Apri il torneo] e [Crea un altro] |
| Successo parziale (partite non salvate) | **DEVE** dirlo: «Ho creato il torneo, ma {k} partite non sono state salvate. Aggiungile dal torneo.». Oggi dice "Ho registrato anche N partite" anche quando non è vero. |
| Errore | Un solo canale: il messaggio in chat, con i chip di nuovo attivi. Il Toast d'errore di `useDiary` va **soppresso** su questa rotta. |

---

## 7. Contratti d'interazione (shell e primitive)

Le primitive vivono in `src/components/ui/*` (piano, F2). Qui c'è il **comportamento**; l'aspetto lo decide `⟂ F1`/`⟂ F2`.

### 7.1 TabBar (sotto i 900px)

- **Slot**: Home · Tornei · **＋** · Compagni · Profilo.
  - Le 4 tab sono `<a href>` (link veri, apribili in una scheda) con `aria-current="page"` sulla tab attiva.
  - Il ＋ è un `<button aria-haspopup="menu" aria-expanded>` con il nome «Crea».
- **Etichette visibili** sotto le icone, a 11px minimo (Q16). Oggi ci sono solo le icone.
- Profilo mostra **l'avatar** a 24px quando c'è, altrimenti l'icona.
- **Stato attivo** segnalato da **forma o riempimento più colore**, mai dal solo colore (WCAG 1.4.1).
- **Capsula flottante** con margine `16px` ai lati e `max(12px, env(safe-area-inset-bottom))` sotto.
  - Il contenuto ha un padding inferiore pari ad altezza più margine, così l'ultimo elemento non finisce mai sotto la barra.
  - I Toast non usano un `bottom: 96` cablato: stanno in alto (§7.8).
- **Tastiera virtuale aperta** (un campo ha il focus fuori da uno sheet): la tab bar **si nasconde**, perché su Android salirebbe sopra la tastiera.
- Nascosta su `/crea`, nei visori (Wrapped, Storia, lightbox) e quando è aperto un ConfirmDialog. Con uno sheet aperto resta visibile sotto il velo.
- Ordine di tabulazione: dopo il contenuto principale (§8.3).

### 7.2 Sidebar (dai 900px in su)

- Voci: Home · Tornei · Compagni · Profilo (`<a href>`, `aria-current`), più **un solo** pulsante «＋ Nuovo» che apre lo stesso menu del ＋ come **popover ancorato** (non un action sheet), più il piede con avatar, nome ed email, che porta a Profilo.
- **Spariscono** i tre bottoni di creazione separati e il logout nel piede: il logout sta in Profilo, con conferma.
- La voce "Chi c'è oggi" non c'è: la funzione vive in Home e nel ＋ (risposta 5).

### 7.3 NavBar con large title

- In cima alla pagina: **sfondo trasparente**, large title nel flusso del contenuto (`<h1>`), eventuale sottotitolo e, sotto, la ricerca (Tornei).
- Quando il large title esce dalla vista (IntersectionObserver su una sentinella):
  - la barra diventa **vetro**;
  - il titolo compatto (17px semibold) compare al centro, in dissolvenza;
  - con `reduced-motion` il passaggio è istantaneo.
- Leading: ‹ Indietro, con etichetta (§4.2), solo sulle rotte figlie. Trailing: al massimo 2 azioni (icone a 44px con nome accessibile).
- Desktop: la barra è sticky dentro `<main>`, con lo stesso comportamento.
- Il titolo compatto è `aria-hidden`: l'h1 resta l'unico titolo.

### 7.4 Action sheet del ＋ e popover desktop

- **Voci** in ordine fisso, per la memoria muscolare:

| Voce | Sottotitolo | Quando compare |
|---|---|---|
| **Nuovo torneo** | «Nome, data e luogo: il resto dopo» | sempre |
| **Aggiungi partita** | «a «{torneo}»» | solo se esiste un torneo di destinazione (F3) |
| **Check-in oggi**, oppure **Sei a {città} oggi** | «Chi c'è in spiaggia» | solo con `OGGI_ATTIVO` |

  Sotto le voci c'è «Annulla», che su mobile è separato.
- **Pattern ARIA menu**:
  - contenitore `role="menu"` con `aria-labelledby` sul titolo «Crea»;
  - voci `role="menuitem"`, ognuna un `<button>`;
  - ↑/↓, Home/Fine, Invio/Spazio; Esc chiude;
  - il focus va **alla prima voce** all'apertura e **torna al ＋** alla chiusura.
- Su mobile sale **dalla tab bar** (C2), con velo e tocco fuori che chiude. È nella history (§4.3).
- Scegliere una voce sostituisce la voce di history del menu con quella dello sheet.

### 7.5 Sheet (restyle di `Sheet.tsx`)

**Da conservare** (sono fissati da `Sheet.test.tsx`):
- drag solo dalla maniglia (`dragListener={false}`);
- chiusura oltre 120px **oppure** oltre 550px/s;
- `touch-action` mai sul foglio;
- area che scorre con `overflow-y:auto` e `overscroll-behavior:contain`;
- `max-height` in `dvh`;
- maniglia fuori dall'area che scorre e `aria-hidden`;
- tocco sullo sfondo che chiude e tocco dentro che no.

**Da aggiungere** (oggi assenti):
1. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sul titolo, che diventa un `<h2>`.
2. **Focus iniziale**: il primo campo del modulo, a fine animazione. Negli sheet senza campi, il titolo.
3. **Trappola del focus** (Tab e Maiusc+Tab ciclano dentro). **Ritorno del focus** all'elemento che l'ha aperto.
4. **Esc** chiude, con controllo "sporco".
5. **Blocco dello scroll** della pagina sotto.
6. **Guardia sulle modifiche non salvate** per sfondo, trascinamento, indietro ed Esc (§4.3).
7. **Tastiera virtuale**: lo sheet usa `visualViewport` (o `100dvh`) perché il campo con il focus **e** il pulsante principale restino visibili. Il piè delle azioni è **sticky in fondo** all'area che scorre.
8. **Azioni**: `Actions` diventa una fila di veri `<button>`.
   - Ordine: [distruttivo a sinistra] · spazio · [Annulla] · [primario].
   - Il primario ha gli stati `disabled` e `busy` (`aria-busy`, con l'etichetta che cambia: «Salvataggio…», «Creo…», «Carico…»).
9. Montaggio in un **portal** su `document.body`, così z-index e `overflow` degli antenati non lo tagliano.

Dai 600px lo sheet diventa un **form sheet centrato** (§9) e il trascinamento è spento, perché lì non c'è un dito.

### 7.6 Card cliccabili e righe (difetti #4 e #5)

- **Card di entità** (torneo, voce di Timeline, compagno):
  - contenitore `<article>` (in un `<ul>/<li>` se è una lista);
  - **titolo `<h3>` che contiene un `<a href>`** con il **nome** dell'entità come nome accessibile;
  - tutta la card è cliccabile grazie a un'estensione dell'area del link (`::after` assoluto sulla card); il resto del contenuto resta **leggibile** dagli screen reader;
  - una sola fermata di tabulazione per card;
  - `aria-describedby` sul link punta alla riga `meta`, così al focus si sente «Rimini Open, link, Pro · 1° · 12 lug · Rimini».
  - Nessun `role="button"` e nessun `aria-label` che sovrascriva il contenuto.
- **Pulsanti dentro una card** (es. [Storia] in Timeline): sono fratelli del link, con `position:relative; z-index` sopra l'area estesa, e **non** sono annidati nel link.
- **MatchRow**:
  - interattiva: `<button type="button">` **senza** `aria-label`. Il nome si compone dal contenuto e l'esito "V"/"P" ha il testo per screen reader «Vinta»/«Persa».
  - non interattiva (sola lettura, riscontri di ricerca): `<div>` senza handler, cursore normale, niente effetto hover.
- **Mappa, elenco città**: la riga città è un `<button aria-expanded>` che apre i suoi tornei. I tornei sono `<a href>`.

### 7.7 ConfirmDialog e azioni distruttive

- `role="alertdialog"`, `aria-labelledby` (titolo come domanda), `aria-describedby` (conseguenza).
- **Focus iniziale su «Annulla»**, cioè l'azione non distruttiva. Esc equivale ad Annulla. Il pulsante distruttivo dice **cosa fa** («Elimina torneo», non «OK»).
- Su mobile ha la forma di un action sheet; dai 600px quella di un dialogo centrato.

| Azione | Titolo | Testo | Conferma |
|---|---|---|---|
| Elimina torneo | Eliminare «{nome}»? | Spariscono anche le sue {n} partite e {m} foto. Non si può annullare. | Elimina torneo |
| Elimina partita | Eliminare la partita contro {avversari}? | Non si può annullare. | Elimina partita |
| Elimina foto | Eliminare questa foto? | Non si può annullare. | Elimina foto |
| Elimina compagno | Eliminare «{nome}»? | Nei tornei e nelle partite resterà segnato come "nessuno" e non conterà più nelle sue statistiche. Non si può annullare. | Elimina compagno |
| Scollega compagno | Scollegare «{nome}» dal suo account? | I tornei giocati insieme smettono di essere condivisi con quell'account. Potrai ricollegarlo quando vuoi. | Scollega |
| Togli condivisioni | Togliere tutte le condivisioni ricevute? | I tornei degli altri spariranno dal tuo diario e dalle tue statistiche. | Togli condivisioni |
| Termina check-in | Terminare il check-in a {città}? | Non comparirai più fra chi è in spiaggia oggi. | Termina check-in |
| Scarta modifiche | Scartare le modifiche? | Quello che hai scritto andrà perso. | Scarta · (secondario: Continua a modificare) |
| Esci dall'assistente | Uscire dall'assistente? | Il torneo non è ancora stato creato: le risposte andranno perse. | Esci · (secondario: Resta) |
| Logout | Esci dall'account? | | Esci |

L'unione dei luoghi resta senza un secondo dialogo: è già un flusso esplicito in due passi, con spiegazione e scelta.

### 7.8 Toast (sostituisce il "notice" di App e ConnectionSnackbar)

- **Una sola regione** in alto, centrata, sotto `env(safe-area-inset-top)`, con al massimo 2 toast visibili. I toast identici si fondono in uno solo con il contatore.
- **Tipi**:
  - `info` e `success`: `role="status"`, polite, chiusura automatica a **4s**, pausa con hover o focus;
  - `error`: `role="alert"`, **nessuna chiusura automatica**;
  - `offline`: persistente finché vale `navigator.onLine === false`.
- Chiusura con un **vero `<button aria-label="Chiudi avviso">`** (oggi è uno `<span>`).
- **Niente azioni dentro i toast**: il tempo limitato le rende inaccessibili, e i flussi in §5 non ne hanno bisogno.
- La regione live è **sempre montata e vuota**, e si riempie quando serve. Oggi ConnectionSnackbar tiene sempre lo stesso testo e cambia solo l'opacità, quindi non annuncia niente.
- Livello: sopra sheet e visori, **sotto** il dialogo del consenso.

### 7.9 Ricerca (SearchField)

- `role="search"` sul contenitore, `<label>` (anche solo per screen reader) **«Cerca nei tornei»**, `type="search"`.
- Placeholder «Cerca un torneo, una città, un avversario…».
- [✕ Cancella la ricerca] è un `<button>` e il focus resta nel campo.
- La crocetta nativa di WebKit resta spenta (la regola che oggi sta in `index.css` va riportata in `base.css`).
- Esc con il campo pieno lo svuota; con il campo vuoto toglie il focus.
- Il conteggio dei risultati lo annuncia il **sottotitolo**, che è la live region (comportamento attuale del Diario), e mai un secondo nodo.

### 7.10 SegmentedControl e FilterChips

API e contratto ARIA **invariati**: `role="group"` con `aria-label`, `<button aria-pressed>`, pillola animata `layoutId`.
- **Segmented**: segmenti di larghezza uguale e `max-width: 420px`.
- **Chip**: una riga sola che scorre in orizzontale, con 2px di margine per l'anello di focus.

I test che oggi verificano lo stile inline (`flex:'1'`, `flexWrap:'nowrap'`) passano a un contratto `data-*` (§14).

### 7.11 Altri controlli

| Controllo | Contratto |
|---|---|
| Button | `<button type="button">` vero. Varianti `filled`/`tinted`/`glass`/`plain`/`destructive`. `data-variant`, `data-size`, `disabled`, `aria-busy`. Icona con `aria-hidden`. Un pulsante con sola icona ha `aria-label`. |
| Link interno (ex `InlineLink`/`BackLink`) | `<a href>` tramite `<Link>` se naviga, `<button>` se esegue un'azione. Mai uno `<span>`. |
| ListGroup / ListRow | `<ul>`/`<li>`. Una riga che naviga è un `<a>` con chevron (`aria-hidden`); una riga d'azione è un `<button>`; un valore a destra fa parte del nome («Condivisioni ricevute, 2»). Le righe distruttive sono testo `--danger` (§8.5) e aprono sempre un ConfirmDialog. |
| TextField / Select | `<label for>` vero (oggi `Label` è un `div`). Il suggerimento va in `aria-describedby`. L'errore usa `aria-invalid` più un messaggio `role="alert"` collegato. Almeno 16px su mobile (anti-zoom di iOS, regola già in `index.css`). |
| Switch | `<button role="switch" aria-checked>` (quello di ChiCeOggi è già corretto: riusarlo). |
| Stepper / set | Due `input inputmode="numeric"` con etichetta, più «＋ Aggiungi set» e «Togli set N», entrambi `<button>`. |
| Avatar | `<img alt="">` se decorativo accanto al nome. Se è un pulsante, il nome è l'azione («Cambia foto profilo»). |
| EmptyState | Titolo, testo e **al massimo un** CTA principale (`<button>` o `<a>`) più un link secondario. |
| Skeleton | Forme statiche con un'animazione leggera, ferme con `reduced-motion`. Il contenitore ha `aria-busy="true"` e il testo nascosto «Caricamento…». |
| Badge / Pill | Almeno 11px. Mai "Premium" come default (C11). |

---

## 8. Accessibilità

Obiettivo: **WCAG 2.2 AA** su tutte le schermate e le primitive, verificato con axe (`src/test/axe.ts`) e con il test del contrasto sui token reali.

### 8.1 Difetti accertati da chiudere

| Difetto | Dove | Criterio |
|---|---|---|
| `div` con `onClick`, non raggiungibili da tastiera | `Button`, `BackLink`, `InlineLink` (`ui.tsx`) · le azioni di `Sheet.Actions` · tutti i chip e i pulsanti di CreaChat · Sidebar (voci, CTA, logout) · TorneoDetail (Storia, Modifica, ＋ Partita, ＋ Foto, elimina foto, apertura foto) · CompagnoDetail (Collega, Scollega, Annulla, risultati, Elimina) · Compagni (card) · Profilo (avatar, Esci) · i controlli di PhotoLightbox · la dropzone di FotoModal · "Ho capito" di Wrapped · la chiusura del notice di App · i campioni colore · il link nel piè del Login | 2.1.1, 4.1.2 |
| `role="button"` che nasconde il contenuto | card Tornei (#5) | 1.3.1, 4.1.2 |
| Contrasto | contatori di sezione (#3: 3,34 e 4,21) · `MUTED` .55 su riempimenti (3,34–3,47) · CTA arancioni (2,84) · rosa d'errore (3,25) · verde di successo (2,57) | 1.4.3, 1.4.11 |
| Focus che sparisce | `outline:none` sugli input (`index.css:14`) · card Wrapped `outline:none` · focus su `body` a ogni passo dell'assistente | 2.4.7, 2.4.3 |
| Dialoghi senza ruolo, trappola e Esc | Sheet, StoryModal, PhotoLightbox | 4.1.2, 2.1.2 |
| Etichette mancanti | tutti i campi di Sheet (`Label` non collegato) · PartitaModal (nessuno) · CreaChat · Login (`div.lbl`) | 1.3.1, 3.3.2 |
| Annunci mancanti | errori del Login · trascrizione dell'assistente · ConnectionSnackbar (testo costante) | 4.1.3 |
| Testo sotto 11px | Badge 8/8,5/9px · etichette dei grafici SVG (circa 8–9px reali) · pill di VenuePicker 10,5px | 1.4.4 (e leggibilità al sole) |
| Pesi di font non caricati | 800 e 300 usati, ma non scaricati | resa sintetica (si risolve con il cambio di font, Q3) |
| Scrollbar nascoste ovunque | `::-webkit-scrollbar { width:0 }` (`index.css:55`) | 2.1.1 / scopribilità su desktop |

### 8.2 Percorsi da tastiera

**Globale**:
- primo Tab: link **«Vai al contenuto»** (visibile al focus), che porta a `<main>`;
- desktop: Sidebar → `<main>`;
- mobile: `<main>` → TabBar (la TabBar è **dopo** il contenuto nel DOM, anche se in basso sullo schermo);
- Esc chiude l'overlay in cima.

| Schermata | Ordine di tabulazione |
|---|---|
| Home | (h1, focus programmatico) → banner alpha: [Segnala un problema] [× Chiudi] → card *Adesso*: link al torneo, [＋ Partita], link Ultimo risultato, [Storia], [Fai check-in] → Wrapped → numeri chiave (link a Statistiche) → righe *Approfondisci* |
| Statistiche | ‹ Indietro → h1 → Compagno ▾ → Stagione ▾ → Wrapped → «Vedi tutti» (compagni) |
| Tornei · Lista | h1 → ricerca → [✕] (se pieno) → segmented (3) → chip formato → link delle card (uno per card) |
| Tornei · Timeline | h1 → ricerca → segmented → per ogni voce: link al titolo, poi [Storia] |
| Tornei · Mappa | h1 → ricerca → segmented → Stagione ▾ → [Mappa: regione con riassunto; **i pin non sono fermate** (decisione di accessibilità esistente)] → chip risultato → righe città (`aria-expanded`) → link tornei → bucket |
| Dettaglio torneo | ‹ Indietro → [⋯] → h1 → [＋ Aggiungi partita] → «Apri la mappa ↗» → righe partita → [＋ Aggiungi foto] → foto (button) → [Elimina foto] per ogni foto |
| Compagni | h1 → [＋ Nuovo compagno] → link delle card |
| Dettaglio compagno | ‹ → [⋯] → h1 → [Collega a un utente] oppure [Scollega] → righe partita |
| Chi c'è oggi | ‹ → h1 → Città → switch Cerco compagno → Nota → [Fai check-in] oppure [Termina check-in] → [Aggiorna] → chip → [Aggiungi come compagno] per ogni persona |
| Profilo | h1 → [Cambia foto profilo] → Nome → [Salva nome] → Password › → [Togli condivisioni] → Cookie › → Segnala › → Segnalazioni › (admin) → Esci |
| Assistente | ✕ Esci → (trascrizione: nessuna fermata) → **controllo attivo del dock** (focus spostato a ogni passo) |
| Sheet Nuovo torneo | Nome → Data → Luogo (select, poi i campi del luogo nuovo) → Con chi (→ nome nuovo compagno) → Com'è andata → [Altri dettagli ▸] (`aria-expanded`) → … → link assistente → [Annulla] → [Crea torneo] |
| Lightbox | [✕] → [Precedente] → [Successiva] → [Scarica]. ←/→ cambiano foto, Esc chiude. |
| Wrapped | [✕] → card (`tabIndex=0`, con **anello di focus visibile**: ←/→, Spazio) → [Condividi] → [Scarica] |

### 8.3 Focus: regole

1. **L'anello di focus si vede sempre** con `:focus-visible`, su ogni elemento interattivo e su ogni fondo:
   - **2px**, offset 2px;
   - contrasto ≥3:1 sia sul fondo pagina sia sul controllo (WCAG 2.4.11/2.4.13);
   - con `outline` e non `box-shadow`, così sopravvive a `forced-colors`.
   - Gli input **non** perdono l'outline: il bordo colorato da solo non basta.
2. Il focus programmatico va: all'h1 dopo una navigazione, al primo campo all'apertura di uno sheet, ad «Annulla» in un ConfirmDialog, alla prima voce in un menu, al controllo del dock nell'assistente.
3. Il focus torna sempre all'elemento che ha aperto l'overlay. Se quell'elemento non esiste più (es. dopo un'eliminazione), va all'h1 della schermata.
4. Nessun `tabIndex` positivo.

### 8.4 Ruoli e attributi ARIA

| Elemento | ARIA |
|---|---|
| Shell | `<nav aria-label="Principale">` per TabBar e Sidebar · `<main id="contenuto">` · un `<h1>` per schermata · `<h2>` per le sezioni · `<h3>` per i titoli delle card |
| Tab | `<a aria-current="page">` · ＋: `aria-haspopup="menu" aria-expanded` |
| Menu ＋ | `role="menu"`/`menuitem`, `aria-labelledby` |
| Sheet | `role="dialog" aria-modal="true" aria-labelledby` |
| ConfirmDialog | `role="alertdialog"`, `aria-labelledby` e `aria-describedby` |
| Visori | `role="dialog" aria-modal="true" aria-label` («Storia di {torneo}», «Beach Wrapped», «Foto {i} di {n}») |
| Altri dettagli | `<button aria-expanded aria-controls>` |
| Ricerca | `role="search"`, `<label>`, sottotitolo `role="status"` |
| Sottotitolo Tornei | `role="status"` (una live region sola) |
| Segmented / chip | `role="group" aria-label`, `aria-pressed` |
| Campioni colore | `role="radiogroup"` con `role="radio" aria-checked` e frecce |
| Toast | regione sempre montata; `role="status"` (info/successo/offline), `role="alert"` (errore) |
| Assistente | trascrizione `role="log" aria-live="polite"`; avatar ed emoji decorative `aria-hidden` |
| Mappe | `role="region"` con `aria-label` riassuntivo (già presente), pin non focusabili, l'elenco è la superficie accessibile |
| Grafici (Statistiche) | `<figure>` con `<figcaption>` e un riassunto testuale (`aria-describedby`), per esempio «Win rate in salita: 58% ad agosto, +6 sul mese prima». Le parti SVG sono `aria-hidden`. |
| Esito partita | testo per screen reader «Vinta»/«Persa» accanto a "V"/"P" |
| Piazzamento con trofeo | «1°» più l'icona `aria-hidden` e il testo nascosto «Primo posto» (C15) |

### 8.5 Contrasto: obiettivi e calcolo sul vetro

**Soglie**:
- testo normale ≥ **4,5:1**;
- testo grande (≥24px, oppure ≥18,66px in grassetto) ≥ **3:1**;
- componenti, icone che portano significato e anelli di focus ≥ **3:1**;
- placeholder: sono testo, quindi ≥4,5:1, oppure non devono portare informazioni necessarie.

**Numeri misurati** con la formula di `contrast.test.ts`; vanno fissati nei test di `⟂ F1`:

| Coppia | Rapporto | Esito |
|---|---|---|
| Bianco su `#FF6B35` (CTA arancione di oggi) | 2,84 | ✗ anche come testo grande. Il pulsante pieno deve usare un'altra coppia. |
| `#1B2A4A` (INK) su `#FF6B35` | 5,02 | ✓ |
| Bianco su `#C4501E` | 4,65 | ✓ testo normale |
| `#C4501E` su `#FAF8F5` (sabbia) | 4,39 | ✗ come testo sul fondo pagina (già fissato nei test) |
| `#B84A1A` su sabbia / su bianco | 4,91 / 5,21 | ✓: è il minimo per un "accento come testo" sul fondo pagina |
| INK al .55 (`MUTED` di oggi) su bianco / `#F2F0EC` | 3,47 / 3,34 | ✗ |
| INK al .65 su bianco / sabbia / `#F2F0EC` | 4,66 / 4,55 / 4,41 | ✗ su `#F2F0EC` |
| INK al **.68** su bianco / sabbia / `#F2F2F7` / `#F2F0EC` | 5,11 / 4,98 / 4,86 / 4,82 | ✓ su tutti: è il **minimo per il testo secondario** |
| Grigio secondario iOS (`#3C3C43` al 60%) su bianco | 3,44 | ✗: lo stile iOS "puro" non basta, quindi `--ink-2` va scurito |
| `#FF477E` (danger di oggi) su bianco | 3,25 | ✗. Serve uno scuro (es. `#D7265E` = 4,85). |
| `#14B87A` / `#2FBF71` (successo di oggi) su bianco | 2,57 / 2,38 | ✗ come testo. Come pallino di stato servono 3:1, quindi va scurito. |

**Testo sul vetro: la regola del fondo peggiore.** Sotto una barra di vetro può scorrere di tutto: il banner Wrapped navy, una foto scura, le tile di un bosco su Leaflet. Il rapporto va calcolato componendo il vetro (bianco ad alpha *a*) **sul nero**, che è il fondo peggiore possibile, perché la sfocatura non cambia la luminanza media. Il blur aiuta la leggibilità, non il contrasto.

| Vetro bianco ad alpha | INK sopra (fondo peggiore = nero) | INK al .70 sopra | Arancio `#FF6B35` sopra |
|---|---|---|---|
| .45 | 2,99 ✗ | 2,19 ✗ | 1,68 ✗ |
| .60 | 4,99 ✓ | 3,05 (solo icone) | 1,00 ✗ |
| **.72** | **7,14** ✓ | 3,78 (solo icone) | 1,42 ✗ |
| .85 | 10,05 ✓ | 4,57 ✓ | 2,00 ✗ |

Ne seguono tre regole, che sono **requisiti** per `⟂ F1`/`⟂ F2`:
1. **Un vetro che porta testo ha alpha ≥ .72** (`--glass-regular` o più spesso). `--glass-thin` (.45) **non porta testo**: solo superfici decorative o icone sopra un fondo controllato.
2. **Il testo secondario sul vetro** (es. le etichette delle tab inattive) è ≥ INK al .85 sul vetro .72, oppure si usa INK pieno. Un'icona inattiva (componente, 3:1) è ≥ INK al .70.
3. **L'arancio non porta significato da solo sul vetro né sul bianco**. La tab attiva, il segmento attivo e il CTA usano una forma o un riempimento (pillola INK o arancio scuro) con contenuto bianco o INK conforme.

**Preferenze di sistema**: con `prefers-reduced-transparency: reduce`, `prefers-contrast: more` e i browser senza `backdrop-filter` (`@supports not`), ogni vetro diventa **opaco** (la sua tinta ad alpha 1). Con `prefers-contrast: more` anche i bordi hairline diventano 1px INK al .3 o più. Con `forced-colors: active` niente vetro, niente ombre e colori di sistema.

`⟂ F1`: `contrast.test.ts` viene riscritto sulle coppie di token nuove, compreso «testo su vetro composto sul nero». I test esistenti su pin della mappa, banner alpha e riga del luogo **restano**, perché fissano requisiti e non scelte di stile.

### 8.6 Bersagli tattili

- **Almeno 44×44 CSS px** per ogni controllo (Apple HIG; WCAG 2.5.8 chiede almeno 24 con spaziatura, ma qui l'obiettivo è il dito in spiaggia).
- Da ingrandire, almeno come area cliccabile:
  - elimina foto (28)
  - cancella ricerca (26)
  - × dei set
  - × del notice
  - chiudi di Lightbox e Wrapped (40)
  - campioni colore (38)
- Spazio ≥8px tra bersagli distruttivi e non distruttivi vicini.

### 8.7 Movimento e trasparenza

- `MotionRoot reducedMotion="user"` resta. **Ogni** animazione CSS nuova (compressione della NavBar, comparsa dei toast, skeleton, sheet) ha la sua variante `prefers-reduced-motion`. Oggi solo `.wrapped-card-anim` la rispetta.
- Il vocabolario `ENTRATA`/`SVELTO`/`MOLLA` è il solo set di tempi. Le durate CSS dei token si allineano a quei valori.
- Niente parallasse né sfocature animate. Il blur del vetro è statico.

### 8.8 Testo, zoom e lingua

- Tipografia in `rem`, su una scala che regge lo **zoom al 200%** senza scroll orizzontale né testo tagliato (1.4.4, 1.4.10 a 320 CSS px).
- Il viewport **non** blocca lo zoom (`maximum-scale` assente: va mantenuto così).
- `lang="it"`. I termini stranieri (Wrapped, check-in) restano come sono.
- Corpo minimo 11px (Caption 2) e solo per le etichette; il testo di lettura ≥15px.

### 8.9 Annunci

| Evento | Come |
|---|---|
| Cambio di rotta | focus sull'h1 più `document.title` |
| Risultati della ricerca | sottotitolo `role="status"` |
| Salvataggio, eliminazione | Toast `status` |
| Errore di scrittura | Toast `alert` (sheet aperto) oppure errore inline `alert` |
| Campo non valido | `aria-invalid` più messaggio collegato, al tentativo di invio e non a ogni tasto |
| Caricamento di un'area | `aria-busy` sul contenitore |
| Filtri di Statistiche | un `status` riassuntivo |
| Assistente | `role="log"` |

---

## 9. Comportamento responsive

### 9.1 Breakpoint

| Nome | Larghezza | Navigazione | Overlay | Note |
|---|---|---|---|---|
| **xs** | < 360 | TabBar flottante, etichette a 11px | sheet a tutta larghezza | iPhone SE 1ª gen. (320): nessuno scroll orizzontale (verificare a 320, §14.3) |
| **sm** | 360–599 | TabBar flottante | sheet dal basso (`max-height` 92dvh) | il caso di riferimento: anteprima 390×664 |
| **md** | 600–899 | TabBar flottante, capsula larga al massimo 480 e centrata | **form sheet centrato** (max 560, raggio 28 su tutti gli angoli, niente trascinamento) | telefoni grandi in orizzontale, tablet in verticale |
| **lg** | ≥ 900 | **Sidebar** di vetro (240), niente TabBar | form sheet centrato · ＋ come popover · ConfirmDialog centrato | è la soglia di oggi (`useIsWide`) e resta |
| **xl** | ≥ 1280 | Sidebar | idem | contenuto con `max-width` 1120 (come oggi). Le colonne di lettura (Profilo, Segnala, form) a 720 al massimo. |

### 9.2 Per schermata

| Schermata | < 600 | 600–899 | ≥ 900 |
|---|---|---|---|
| Home | 1 colonna. Card *Adesso* impilate. Numeri chiave 2×2. | *Adesso* su 2 colonne. Numeri 4×1. | idem, *Adesso* fino a 3 colonne |
| Statistiche | filtri su una riga che scorre (o a capo), card a 1 colonna | griglia `auto-fit minmax(280px)` (come oggi) | idem |
| Tornei · Lista | griglia `auto-fill minmax(min(100%,300px),1fr)` (come oggi: mai scroll orizzontale) | 2 colonne | 3 colonne |
| Tornei · Timeline | colonna della data a 64 (oggi 78) | 78 | 78, larga al massimo 840 |
| Tornei · Mappa | mappa alta 380 a tutta larghezza | idem | mappa ed elenco città **affiancati** (60/40) (PUÒ) |
| Dettaglio torneo | statistiche 3×2 (min 110); foto `minmax(100px)` | statistiche 6×1 | idem |
| Compagni | 1 colonna | 2 | 3–4 |
| Chi c'è oggi | modulo poi stanza | idem | modulo e stanza affiancati (PUÒ) |
| Profilo | ListGroup a tutta larghezza (inset 16) | colonna 720 | colonna 720 |
| Assistente | a tutto schermo (`100dvh`), dock sticky sopra la tastiera | idem | colonna centrale 720, Sidebar visibile |
| Login | solo BrandLockup | idem | pannello del marchio a sinistra (come oggi) |
| Wrapped e Storia | anteprima scalata su `100dvh`, azioni sopra `safe-area-inset-bottom` | idem | idem, con la card al massimo all'80vh |

### 9.3 Aree sicure, tastiera e orientamento

- `index.html`: `viewport-fit=cover`. NavBar e TabBar rispettano `env(safe-area-inset-*)` e lo stesso fanno visori e sheet a tutto schermo. `⟂ F1`
- **Tastiera virtuale**:
  - negli sheet il campo con il focus e il pulsante principale restano visibili (`visualViewport` oppure `interactive-widget=resizes-content`, da provare su iOS 17+ e Chrome Android);
  - la TabBar si nasconde mentre è aperta;
  - il dock dell'assistente sta sopra la tastiera.
- **Orizzontale su telefono** (il manifest dice `portrait`, ma il browser ruota):
  - la TabBar resta e si abbassa (senza etichette sotto i 400 di altezza, con le icone che conservano il nome accessibile);
  - gli sheet arrivano fino al 100dvh e scorrono.
- **Hover**: gli effetti di hover (`.lift`, opacità dei chip) solo dentro `@media (hover: hover)`. Al tocco restano "appiccicati".
- **Scrollbar**: **visibili su desktop** (oggi nascoste ovunque). Si nascondono solo le righe che scorrono in orizzontale (chip) su dispositivi touch.

---

## 10. Mappa d'uso del vetro

**Regola** (linee guida Apple, dal piano): il vetro va **solo** sui livelli di navigazione e controllo. Il contenuto (card, liste, grafici) resta pieno. **Al massimo 3 superfici con `backdrop-filter` contemporaneamente** su schermo, per i telefoni Android economici.

| Superficie | Vetro? | Quando | Superfici blur nel caso peggiore |
|---|---|---|---|
| TabBar (capsula) | sì, `regular` | sempre (mobile) | 1 |
| NavBar | sì, `regular` | **solo dopo lo scroll**; in cima è trasparente | +1 = 2 |
| Sidebar (desktop) | sì, `thick` | sempre (lg) | (niente TabBar su desktop) |
| Action sheet ＋ / popover | sì, `thick` | aperto | il velo sotto **non** è sfocato (è un colore) → +1 = 3 |
| Sheet / form sheet | sì, `thick` | aperto | aprendosi **sostituisce** l'action sheet, quindi resta 3 |
| ConfirmDialog | **opaco** (`surface`) | aperto | sopra uno sheet (3) farebbe 4: per questo è opaco |
| Segmented (traccia) | sì, `thin`, senza testo sul vetro: il testo sta sulla pillola o su un fondo controllato | sempre in Tornei | +1 al massimo. Il segmented scorre via con il contenuto e la NavBar diventa vetro solo dopo lo scroll, quindi raramente coesistono. Se coesistono, il segmented diventa opaco (PUÒ). |
| Toolbar di visori (Wrapped, Storia, lightbox) | sì, `regular` scura | aperto (il resto è coperto e la TabBar è nascosta) | ≤2 |
| Toast | **opaco** | | |
| Card, liste, banner, grafici, mappe | **no** | | |
| Velo degli overlay | colore semitrasparente, **senza blur** (oggi Sheet usa `blur(3px)` e StoryModal `blur(6)`: da togliere) | | |
| **Tela del PNG esportato** | **mai** (vincolo html-to-image) | | |

Fallback opachi: §8.5.

---

## 11. Immagini esportate (Storia e Wrapped)

La risposta 8 chiede di **ridisegnare anche i PNG**, opachi e senza vetro. I vincoli UX:

1. **Dimensioni invariate**: Storia 1080×1920 (`pixelRatio 1`), Wrapped 2160×3840 (`pixelRatio 2`). Il nome dei file resta com'è (`{slug}-story.png`, `{slug}-NN.png`).
2. **Zone sicure di Instagram**: niente testo essenziale nei **primi 250px** e negli **ultimi 250px** (su 1920), dove Instagram mette avatar, risposta e sticker. Oggi il piè «IL MIO DIARIO · BEACH VOLLEY» ci finisce dentro: è accettabile perché è un marchio, non un'informazione.
3. **Contrasto della tela** ≥4,5:1 per ogni testo, su **tutte** le palette. Oggi la palette `orange` (`WRAPPED_PALETTES`, `palette.ts`) mette **bianco su `#FF6B35` = 2,84 ✗**. Nella palette arancio il testo va in navy (`#16233F` su `#FF6B35` = 5,50) oppure il fondo va scurito.
4. **Solo colori letterali e opachi** nella tela, in `wrapped/palette.ts`. La Storia oggi ha una **copia della palette** dentro `StoryModal.tsx:9-13`, che si discosta su due valori: va **unificata** su `palette.ts`. `⟂ F4`
5. **Font**: la tela deve usare un font **incorporabile** (foglio Google Fonts con `crossorigin="anonymous"`), anche se l'interfaccia passa al font di sistema (Q3). Un font di sistema nel PNG darebbe un'immagine diversa su iPhone e su Android.
6. **Comportamento del visore**:
   - Storia e Wrapped condividono la stessa cornice (✕, `role="dialog"`, Esc, focus, blocco dello scroll, toolbar a 44px);
   - la Storia adotta il **download via Blob e la condivisione nativa** di Wrapped (il `data:` URL di oggi su iOS fallisce);
   - il selettore di colore della Storia è un `radiogroup` con le frecce.
7. **Verifica**: l'harness con build di produzione, CSP vera e CDP headless (memoria di progetto `export-immagini-html-to-image`). Il PNG deve uscire con il font giusto, senza artefatti di blur e con le zone sicure rispettate. `⟂ QA`

---

## 12. Contenuti e microcopy

- **Tono**: tu, frasi brevi, verbi d'azione nei pulsanti («Crea torneo», «Aggiungi partita», «Fai check-in»). Niente punto esclamativo negli errori.
- **Errori**: cosa è successo, poi cosa fare. Esempio: «Sei offline: non ho salvato. Riprova quando torni in linea.».
  - L'errore generico del DB, «Errore di comunicazione con il database.», diventa in UI «Non è stato possibile salvare. Riprova tra poco.».
  - Il dettaglio tecnico finisce in `console.error`, come oggi.
- **Date**:
  - nelle card: «sab 12 lug»;
  - nella Home: date relative «oggi», «domani», «ieri», «tra 3 giorni», sempre accompagnate dalla data assoluta per gli screen reader;
  - numeri tabulari per i punteggi.
- **Emoji**:
  - **restano come contenuto**: l'emoji del torneo, le emoji delle slide Wrapped, la 🏆 dentro il valore del piazzamento quando la si legge nei testi;
  - **non come icone di interfaccia**: ＋, 📷, 🔗, ✨, ⚡, 🏐, 📍, 🔒, ↻ diventano icone SVG del set interno (estensione di `NavIcons.tsx`, 20/24px, tratto 1,9, `currentColor`).
- **Nomi delle azioni** (sempre gli stessi):

| Azione | Copy |
|---|---|
| Nuovo torneo | Nuovo torneo |
| Nuova partita | Aggiungi partita (nel ＋, in Home, nel dettaglio) / Nuova partita (titolo dello sheet) |
| Modifica | Modifica (menu) / Salva (sheet) |
| Elimina | Elimina {cosa} |
| Storia | Storia Instagram |
| Check-in | Fai check-in / Termina check-in |
| Logout | Esci |

---

## 13. Analytics: contratto da preservare

Gli eventi esistenti **non cambiano nome**: le serie storiche devono restare confrontabili.

| Evento | Dove resta | Nota |
|---|---|---|
| `torneo_creato { via }` | sheet unificato e assistente | `via: 'rapido'` (sheet senza aprire "Altri dettagli") · `'completo'` (aperto) · `'assistente'` |
| `torneo_modificato`, `torneo_eliminato` | modifica ed eliminazione | `torneo_eliminato` solo dopo il **successo** (oggi parte anche se fallisce, C13) |
| `partita_aggiunta`, `partita_modificata`, `partita_eliminata` | sheet partita | idem |
| `foto_aggiunta`, `foto_eliminata` | dettaglio | |
| `socio_creato`, `socio_collegato`, `socio_scollegato`, `socio_eliminato` | compagni | il nome resta `socio_*` (C18 riguarda solo l'UI) |
| `storia_aperta`, `storia_scaricata` | visore Storia | |
| `wrapped_aperto`, `wrapped_scaricato`, `wrapped_condiviso { via }` | `/wrapped` | `wrapped_aperto` scatta all'**ingresso nella rotta**, anche da URL diretto |
| `mappa_aperta` | passaggio alla vista Mappa | invariato: solo nel passaggio verso la mappa, compreso l'ingresso diretto su `/tornei/mappa` |
| `assistente_ai_usato` | creazione riuscita dall'assistente | |
| `login`, `logout`, `registrazione`, `password_cambiata`, `segnalazione_inviata { area }` | invariati | |

Pageview: §4.8. **Nessun evento nuovo** è richiesto da questa specifica.

---

## 14. Impatto sui test

Il piano dice: si riscrivono sul contratto nuovo, **nessuno si cancella**. Queste sono le parti di suite toccate dai cambi di flusso:

### 14.1 Contratti che cambiano

| Test | Oggi verifica | Nuovo contratto |
|---|---|---|
| `Tornei.test.tsx` (29 occorrenze in Tornei e Mappa) | `getByLabelText('Apri il torneo X')` | `getByRole('link', { name: 'X' })` (§7.6) |
| `Tornei.test.tsx:595` (skip #5) | che dentro l'elemento etichettato ci sia il contenuto | la card (`closest('article')`) contiene categoria e piazzamento, il link ha come nome il nome del torneo, **nessun** `role="button"` contiene contenuto. Togliere lo `skip`. |
| `Tornei.test.tsx:582` (skip #4) | `getByRole('button', { name: /Nuovo torneo/ })` nell'header | l'header di Tornei **non** ha più "Nuovo torneo" (la creazione sta nel ＋ e nella Sidebar). Il test va rivolto al CTA dell'**EmptyState** («Crea il primo torneo», `<button>` raggiungibile e attivabile con Invio) e a un test della TabBar o del menu ＋. Togliere lo `skip`. |
| `Tornei.test.tsx:547` (skip #1) | `/^1 torneo ·/` dopo il filtro `3vs3` | invariato: il sottotitolo `{n} torneo · {p} podi` (§F4) lo soddisfa. Togliere lo `skip`. |
| `Tornei.test.tsx:556` (skip #2) | il filtro scartato resta "Tutti" | invariato. Togliere lo `skip`. |
| `Tornei.test.tsx:605-635` | `toHaveStyle({gridTemplateColumns})`, `{flexWrap:'nowrap', overflowX:'auto'}`, `{flex:'1'}` | attributi: `data-layout="grid-auto"` sulla griglia, `data-overflow="scroll"` sulla riga delle chip, `data-fill="equal"` sul segmented (oppure le classi `ui-` dichiarate dalla primitiva). I **nomi** li sceglie `⟂ F2`; la regola è: si verifica la classe o l'attributo dichiarato, non lo stile calcolato. |
| `Tornei.test.tsx` (prop `canAssistant`, `onAssistant`) | prop dello schermo | le prop spariscono (C11): i render dei test si aggiornano |
| `Diario.test.tsx` (42 test) | schermata Diario autonoma, `searchbox` «Cerca nel diario», titolo voce come `button` | si spostano su **Tornei · Timeline** più ricerca: `searchbox` «Cerca nei tornei», titolo voce come `link`, [Storia Instagram] come `button`, live region `status` invariata. Le regole della ricerca (`derive.diary.test.ts`, `search.test.ts`) **non cambiano**. |
| `Mappa.test.tsx` | testo «modalità rapida» e righe «Apri il torneo» | nuovo testo «senza luogo» (C5), link per nome |
| `BannerAlpha.test.tsx` | non chiudibile, unico ingresso a Segnala | chiudibile: [× Chiudi] è un `button`, lo stato chiuso viene salvato e Segnala resta raggiungibile dal Profilo |
| `Segnala.test.tsx` | `onBack` → «Torna alla home» | «Torna indietro» |
| `Sheet.test.tsx` | 10 test (§7.5) | **tutti invariati**. Se ne aggiungono per ruolo `dialog`, Esc, focus iniziale e di ritorno, guardia "sporco". |
| `TorneoModal.test.tsx` | il modale completo | si sposta sullo sheet unificato (modalità `nuovo` e `modifica`) |
| `contrast.test.ts` | coppie attuali | coppie di token nuove più vetro sul nero (§8.5). I test sui **pin** e sulla **riga del luogo** restano identici. Il test del banner alpha si aggiorna sulle sue coppie nuove. |
| `WrappedModal.test.tsx` (21) | visore | la cornice cambia, i comportamenti (tastiera, Esc, condivisione) no |

### 14.2 Test nuovi richiesti dalla specifica

- **Router**: `parseLocation` e `routeHref` andata e ritorno per ogni rotta. Parole riservate prima di `:id`. Redirect di `/diario`. Hash ignorato. `nonTrovato`.
- **Overlay e history**: indietro chiude lo sheet. Con il modulo sporco compare la conferma e la voce viene ri-aggiunta. Il refresh non riapre. Il successo fa `replace`.
- **Focus**: h1 dopo la navigazione, ritorno alla card su indietro, ritorno del focus alla chiusura di sheet e menu.
- **ConfirmDialog** su ogni azione distruttiva della tabella in §7.7.
- **Primo caricamento fallito** porta all'ErrorState e non allo stato vuoto (§4.10).
- **Destinazione di "Aggiungi partita"**: i 5 casi di F3.
- **axe** su ogni schermata e primitiva nuova (piano).

### 14.3 Verifiche manuali (fuori dalla portata di jsdom)

- Scroll orizzontale assente a **320px** su ogni schermata.
- Indietro e avanti, refresh su `/tornei/:id`, apertura e chiusura degli sheet col tasto indietro su **Android Chrome** e **iOS Safari**.
- `/presentazione` ancora servita, `offline.html` dal SW in modalità aereo.
- Tastiera virtuale negli sheet: campo e pulsante visibili.
- Vetro: `-webkit-backdrop-filter` su iOS, fluidità dello scroll con 3 superfici sfocate su un Android economico, fallback con *Riduci trasparenza* (iOS) e *Contrasto elevato*.
- VoiceOver e TalkBack su: card tornei (link più contenuto), action sheet ＋, sheet, assistente.
- PNG di Storia e Wrapped (§11.7).

---

## 15. Decisioni prese e domande aperte

### 15.1 Già deciso dall'utente (da non riaprire)

| # | Domanda | Risposta |
|---|---|---|
| 1 | Consegna | Un solo branch, commit separati per fase |
| 2 | Dark mode | No, solo chiaro (token predisposti) |
| 3 | Identità | Arancio come unico accento, neutri stile iOS, font di sistema (SF Pro / Inter) |
| 4 | Diario e Tornei | Unire: Tornei con Lista · Timeline · Mappa più ricerca globale |
| 5 | Chi c'è oggi | Card in evidenza in Home più rotta dedicata; esce dalla tab bar |
| 6 | Creazione | Un solo sheet con divulgazione progressiva più assistente facoltativo |
| 7 | URL | Sì, `/tornei/:id` con rewrite su Vercel |
| 8 | PNG esportati | Ridisegnarli (opachi, senza vetro) |

### 15.2 Domande aperte (con la risposta raccomandata)

Ogni domanda ha una raccomandazione: i ruoli successivi procedono con quella, salvo una risposta diversa dell'utente.

| # | Domanda | Raccomandazione | Perché |
|---|---|---|---|
| **Q1** | "Chi c'è oggi" era stato spento di proposito (C1)? | **Riaccenderlo** come da risposta 5, dietro `OGGI_ATTIVO` (default `true`). | La risposta 5 lo presuppone attivo; il flag rende reversibile la scelta in una riga. |
| **Q2** | Come ottiene l'id del torneo appena creato lo sheet unificato, se `saveTorneo` restituisce `boolean`? | **Cambio minimo in `useDiary.saveTorneo`**: all'inserimento `.select('id').single()` e si restituisce l'id (`string \| false`). I chiamanti che fanno `if (await saveTorneo(...))` continuano a funzionare. **Alternativa senza toccare `useDiary`** (se il vincolo "non toccare" è rigido): confrontare gli id dei tornei prima e dopo il `reload()` interno, con un ref su `data`. Da **non** fare: `quickCreateTorneo` seguito da `saveTorneo(form, id)`, perché con un compagno "nuovo" ne creerebbe due. | Senza l'id non si arriva al dettaglio, che è il passo successivo naturale (G1). Il cambio è di tre righe e retrocompatibile. |
| **Q3** | Quale font esattamente? | **UI**: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif`, con Inter caricato da Google Fonts (origine già in CSP), così Android e Windows hanno Inter invece di Roboto o Segoe. **Numeri**: `font-variant-numeric: tabular-nums`. **PNG**: `"Inter"` per primo, perché si incorpora e il risultato è uguale su ogni dispositivo. | Il font di sistema non si può incorporare nel PNG: senza Inter lo stesso recap uscirebbe diverso su iPhone e su Android (§11.5). |
| **Q4** | La Storia si può fare sui tornei condivisi (C14)? | **Sì.** | Non modifica nulla, e il torneo l'hai giocato anche tu. Oggi il Diario lo permette già. |
| **Q5** | Il banner alpha chiuso resta chiuso per sempre? | **Sì per quel dispositivo e utente** (`localStorage` con chiave `bvd_alpha_chiuso:{userId}`), con la voce «Segnala un problema» sempre in Profilo. | Un banner che non si chiude diventa rumore; l'ingresso a Segnala non si perde. |
| **Q6** | Ogni tab ricorda la sua pila di navigazione (come iOS)? | **No.** Tab = radice della tab; Tornei ricorda solo la **vista**. | Con un'unica history del browser le pile per tab rendono il tasto indietro imprevedibile. |
| **Q7** | Dove si sceglie la stagione (C10)? | Stato condiviso, **mostrato e modificabile** in Statistiche e in Mappa, etichetta in Home. Non nell'URL (PUÒ: `?stagione=` in un secondo momento). | Chiude la dipendenza invisibile Home → Mappa senza moltiplicare le fonti di verità. |
| **Q8** | Dove vanno le azioni del dettaglio torneo? | [＋ Aggiungi partita] come pulsante principale nel contenuto. Modifica, Storia ed Elimina nel menu "…" della NavBar. | L'azione più frequente in stagione resta in vista; il resto non affolla l'intestazione. |
| **Q9** | Si conferma anche l'eliminazione di una partita? | **Sì** (ConfirmDialog breve). | È irreversibile ed è a un tocco da "Salva" nello stesso sheet. |
| **Q10** | Sheet su desktop? | **Form sheet centrato dai 600px** (max 560), senza trascinamento. | Un bottom sheet largo 520 ancorato in basso su un monitor da 27" è scomodo da raggiungere col mouse. |
| **Q11** | Normalizzare i percorsi per Vercel Analytics? | **Sì** (`beforeSend`: UUID → `[id]`). | Altrimenti ogni torneo è una "pagina" a sé e i report sono illeggibili. |
| **Q12** | Che cosa conta come "in corso" per la Home e per il ＋? | Data = oggi, **oppure** placement «In corso» con data ≤ oggi (il più recente). | Copre sia il torneo di oggi sia quello di più giorni non ancora chiuso. |
| **Q13** | Scorciatoie da tastiera su desktop? | Solo `/` (ricerca in Tornei) ed `Esc`. | Utili, scopribili, senza conflitti con gli screen reader. |
| **Q14** | Il logout chiede conferma? | **Sì**, action sheet. | Rientrare da telefono, con l'email e la password, costa molto di più di un tocco in più. |
| **Q15** | Dove si entra nell'assistente? | Dal link nello sheet "Nuovo torneo", dal link secondario degli EmptyState e da `/crea`. **Non** dal ＋, dalla Home o dall'header di Tornei. | Risposta 6: facoltativo, non una terza porta principale. |
| **Q16** | Etichette sotto le icone della TabBar? | **Sì**, sempre. | Oggi le icone sole sono ambigue: "Diario" e "Tornei" erano due quaderni. |
| **Q17** | Icona della tab Profilo? | L'**avatar** dell'utente (fallback: icona persona). | Rende riconoscibile la tab e riusa ciò che c'era nella top bar. |
| **Q18** | Statistiche è una rotta? | **Sì**, `/statistiche`. Il piano non la elencava. | È una schermata vera, con filtri, che ha senso linkare e da cui tornare indietro. |
| **Q19** | Recupero password (oggi assente)? | **Fuori scope** per questo refactor: è stato proposto come attività separata, perché serve gestire `PASSWORD_RECOVERY` di Supabase. | Senza nuove dipendenze né RPC è fattibile, ma è una funzione nuova e non un restyle. |
| **Q20** | "Oggi" in UTC (`todayISO()`, e il default della data in `App.tsx:385`) | **Non toccare in questo giro** (`derive.ts` è condiviso con l'app mobile). Il default della data nello sheet usa la **stessa** funzione, così confine "prossimi/passati" e form non si contraddicono. | Coerenza prima di tutto; il caso limite riguarda le 00:00–02:00 locali. |
| **Q21** | Compagno di default nello sheet? | Il compagno del **torneo proprio più recente**, altrimenti «Nessuno». | Si gioca quasi sempre con la stessa persona: è un tocco in meno nel caso frequente. |
| **Q22** | Large title della Home? | «Ciao, {nome}» (fallback «Ciao»), con la data di oggi come sottotitolo. Il BrandMark piccolo come leading item della NavBar. | Dà un h1 significativo e rimette il marchio nella chrome mobile (C6). |

---

## 16. Indice dei seam

| Fase | Seam | Riferimento |
|---|---|---|
| **F1** | Token di colore che rispettano i rapporti di §8.5 (accento come testo ≥ `#B84A1A`; testo secondario ≥ INK .68; danger e success scuriti) | §8.5, C16 |
| F1 | Materiali di vetro: alpha minima .72 per il vetro che porta testo; `thin` senza testo; fallback opachi (`reduced-transparency`, `contrast: more`, `@supports`, `forced-colors`) | §8.5, §10 |
| F1 | `viewport-fit=cover`; un solo `theme-color` (niente dark, C17); anello di focus globale; scrollbar visibili su desktop; crocetta di `type=search` spenta; input ≥16px su mobile | §8.3, §9.3 |
| F1 | Font (Q3); `contrast.test.ts` riscritto con il vetro sul nero | Q3, §8.5 |
| **F2** | Button, Link, ListRow, Switch, Stepper, campioni colore come controlli veri; card come `article` + link (#4, #5) | §7.6, §7.11 |
| F2 | Sheet con dialog, focus, Esc, blocco dello scroll, guardia sulle modifiche, portal, azioni `busy`; i 10 test esistenti invariati | §7.5 |
| F2 | ConfirmDialog, Toast (regione unica, tipi, offline persistente), ActionSheet/menu, SearchField, EmptyState, ErrorState, Skeleton | §7.4, §7.7–7.9 |
| F2 | Badge del piazzamento con trofeo SVG; nessun "Premium" di default | C15, C11 |
| F2 | Contratto `data-*` per i test di layout | §14.1 |
| **F3** | `src/app/routes.ts` (`Route`, `TabKey`, `parseLocation`, `routeHref`, `routeTab`, `routeParent`, `OGGI_ATTIVO`) e `src/app/router.ts` (`useRoute`, `navigate`, `goBack`, `Link`, `openOverlay`/`closeOverlay`) | §4.1 |
| F3 | Overlay nella history, guardia sulle modifiche, refresh che non riapre, `replace` al successo | §4.3 |
| F3 | `ModalHost` con il tipo `Overlay` | §4.3 |
| F3 | Focus e titolo al cambio rotta; ripristino di scroll e focus su indietro | §4.2, §4.4 |
| F3 | `useScreenData` (effetti RPC legati a `route.name`), primo caricamento fallito senza toccare `useDiary`, toast di `reload()` taciuti offline | §4.9, §4.10, C20 |
| F3 | Stati "non trovato" per `/tornei/:id` e `/compagni/:id` | C9, §6.4, §6.6 |
| F3 | Rewrite in `vercel.json` con le esclusioni; `beforeSend` di Analytics | §4.7, §4.8 |
| F3 | Error boundary per ogni area lazy | §6.0 |
| **F4** | Migrazione delle schermate con gli stati di §6; testi di C5, C18, C19 | §6, §12 |
| F4 | `CityInput`/`CITTA_SUGGERITE` di nuovo nel campo città di "Chi c'è oggi" | C21 |
| F4 | Assistente: le 6 correzioni obbligatorie, un solo canale d'errore, successo parziale dichiarato | §5 F11, §6.10 |
| F4 | Visori: cornice comune; la Storia con Blob e condivisione; palette unica in `palette.ts`; palette arancio conforme; zone sicure | §11 |
| F4 | Login: etichette, titoli, `aria-live`, segmented, link come `button`; timeout dello splash in `Root` | §6.9, F0 |
| **F5** | Action sheet ＋ (3 voci, destinazione della partita); popover desktop | §7.4, §5 F3 |
| F5 | Sheet unificato del torneo (campi, default, "Altri dettagli", modifica, analytics `via`); Q2 | §5 F2 |
| F5 | Home riordinata (*Adesso*, numeri, *Approfondisci*); rotta `/statistiche`; banner alpha chiudibile | §6.1, §6.2 |
| F5 | Tornei: Lista · Timeline · Mappa più ricerca; redirect `/diario`; sottotitolo dal vivo (#1); reset del filtro (#2); stagione visibile in Mappa | §5 F4, C10 |
| F5 | Profilo a ListGroup; `/profilo/segnala`, `/profilo/segnalazioni`; logout con conferma | §5 F9 |
| F5 | ConfirmDialog in ogni punto della tabella §7.7; navigazione solo dopo il successo | C12, C13 |
| **F6** | Togliere i resti dei piani dalla UI (badge, lucchetti, prop `canAssistant`/`canAiCreate`/`canAddFoto`/`canShareStory`); `UpgradeSheet` resta isolato | C11 |
| F6 | Correggere i commenti e il README rimasti indietro (C3, C21, C22) | §1 |
| **QA** | §14.3 e §11.7; `docs/QA-refactor.md` con l'inventario degli stati di §6 come checklist | §6, §14 |
| **Landing** | Tutti i seam della landing `/presentazione` (`⟂ E`, `⟂ A`, `⟂ M`, `⟂ C`, `⟂ I`, `⟂ QA`) | §L16 |

---

# Parte L. La landing `/presentazione` rifatta sulla versione D

| | |
|---|---|
| Ruolo | UX strategist, ruolo 1 di 6 della squadra «REDESIN sito presentazione». Solo specifica: **nessuna riga di codice UI** in questo commit |
| Base | `be9c4bd` su `main`, che contiene già il redesign «versione D» (la risposta 1 dell'utente: «redesign è già stato unito a main»). Audit del 2026-10-19 |
| Piano di riferimento | «Redesign del sito presentazione `/presentazione`» (briefing della squadra), con le 6 risposte dell'utente in §L15.1 |
| Cosa sostituisce | §3.1 diceva «landing statica: fuori dall'app, non si tocca». Per la landing vale da ora questa parte. Le Parti 0–16 restano il contratto dell'app, e qui si citano senza ripeterle |
| Livelli di obbligo | gli stessi del resto del documento: **DEVE**, **DOVREBBE**, **PUÒ** |

**Come leggere i seam.** Questa parte non segue le fasi F1–F6 del refactor dell'app. Ogni punto lasciato ai ruoli successivi è marcato con il mestiere che lo deve chiudere:

| Seam | Chi | Che cosa |
|---|---|---|
| `⟂ E` | estrazioni nell'app | i moduli senza framework presi dall'app, i test di snapshot, i piccoli cambi all'app (§L1) |
| `⟂ A` | art direction | valori visivi in `ART_DIRECTION.md` e nei token: materiali, contrasti, disegno delle sezioni |
| `⟂ M` | movimento | il paragrafo «Landing (`/presentazione`)» di `MOTION.md`: curve, soglie, eccezioni |
| `⟂ C` | costruzione | `presentazione/index.html`, `presentazione/styles/*`, `presentazione/js/*` |
| `⟂ I` | immagini e meta | schermate, icone PWA, manifest, og:image, favicon |
| `⟂ QA` | verifica | `src/test/landing.test.ts`, gli script di `docs/qa`, le prove a mano |

L'indice dei seam è in §L16. Dove questa parte contraddice il piano lo dice esplicitamente (§L1, colonna «Il piano dice»). Vince questa parte, perché è stata scritta leggendo il codice di `be9c4bd`.

### Indice della Parte L

- L0. [Sintesi](#l0-sintesi)
- L1. [Contraddizioni con il piano e con il prodotto](#l1-contraddizioni-con-il-piano-e-con-il-prodotto-leggere-per-prime)
- L2. [Visitatori e obiettivi](#l2-visitatori-e-obiettivi)
- L3. [Architettura dell'informazione](#l3-architettura-dellinformazione)
- L4. [Navigazione: barra, ancore, history](#l4-navigazione-barra-ancore-history)
- L5. [Flussi](#l5-flussi)
- L6. [Inventario degli stati, sezione per sezione](#l6-inventario-degli-stati-sezione-per-sezione)
- L7. [Contratti d'interazione](#l7-contratti-dinterazione)
- L8. [Accessibilità](#l8-accessibilità)
- L9. [Comportamento responsive](#l9-comportamento-responsive)
- L10. [Vetro: mappa d'uso e budget](#l10-vetro-mappa-duso-e-budget)
- L11. [Movimento: i confini che la landing deve rispettare](#l11-movimento-i-confini-che-la-landing-deve-rispettare)
- L12. [Contenuti e microcopy](#l12-contenuti-e-microcopy)
- L13. [Prestazioni e caricamento](#l13-prestazioni-e-caricamento)
- L14. [Test e verifiche](#l14-test-e-verifiche)
- L15. [Decisioni prese e domande aperte](#l15-decisioni-prese-e-domande-aperte)
- L16. [Indice dei seam](#l16-indice-dei-seam)

---

## L0. Sintesi

- **Una pagina sola, pensata per il telefono**, che racconta le funzioni vere dell'app di oggi e le fa **provare** senza account: la Partita live si gioca nella pagina e «Raccontalo a Pallo» si sfoglia come nell'app.
- **Ordine delle sezioni ritoccato** rispetto al piano (§L1, LC1): Hero → Il diario in tasca → **Cosa registriamo?** → Partita live → Numeri → Mappa → Wrapped e Storia → I tuoi dati → Finale. Il ＋ dell'app presenta le quattro voci, e la prima, «Partita live», porta dritta alla demo.
- **La barra in basso è la TabBar dell'app**: quattro tab, **Diario · Live · Numeri · Wrapped**, più il ＋ arancio «Apri il diario». Sono ancore vere e la lente si sposta a soglia. Nell'hero, nei dati e nel finale nessuna tab è accesa. Su desktop la stessa barra sta in alto.
- **Pallo guida, uno solo alla volta.** È un `<button>` nell'angolo, che apre «Dove vuoi andare?» (una *disclosure* con i salti e le azioni) e dice una battuta per sezione. Esce di scena quando la sezione ha un Pallo suo: hero, chat, live, Wrapped, finale. **Non parla mai durante lo scroll**, né allo screen reader né sopra un'azione.
- **Tutto il movimento si ferma.** Vale `prefers-reduced-motion`, più un comando visibile **«Ferma le animazioni»** nell'hero, nel menu di Pallo e nel footer (WCAG 2.2.2: la scena dell'hero e la vita di Pallo durano più di 5 secondi). La versione ferma è la base dell'HTML; il movimento la arricchisce.
- **La pagina si legge anche se il JavaScript non parte.** Testi, ancore, CTA e immagini stanno nell'HTML. Demo, guida, scene e pin arrivano col modulo, in scatole già misurate (CLS 0).
- **I numeri non si inventano.** Statistiche, pin, slide di Wrapped e consigli di Pallo vengono da **un solo** dataset dimostrativo, quello dell'anteprima, passato dalle funzioni vere dell'app (Q-L3). Così coincidono con le schermate del telefono.
- **«Il diario resta tuo» dice solo cose verificate nel codice** (§L12.8). Tre frasi della landing di oggi sono false o eccessive, compresa «Un solo servizio esterno» (LC9).
- **Il vetro si conta**: al massimo 2 superfici sfocate nel caso tipico e 3 nel peggiore. La capsula cambia materiale a soglia sui fondi scuri (hero, slide d'inchiostro), perché il vetro dell'app (.32) è misurato su carta e foto, non sul buio (LC7).
- **Installare costa al massimo due tocchi** da qualunque punto. Con il prompt nativo dove c'è, altrimenti con il foglio istruzioni nella variante giusta: iOS 26, iOS fino a 18, altri browser iOS, il resto (LC12). Se l'app è già installata, i pulsanti non compaiono.

---

## L1. Contraddizioni con il piano e con il prodotto (leggere per prime)

Ognuna ha una decisione proposta. I ruoli successivi la rispettano o la riaprono con l'utente; nessuna va aggirata in silenzio.

| # | Il piano dice | Il codice dice (verificato su `be9c4bd`) | Impatto | Decisione proposta |
|---|---|---|---|---|
| **LC1** | Tab della barra «Live · Numeri · Pallo · Wrapped»; sezioni nell'ordine hero, diario, live, numeri, mappa, *cosa registriamo*, Wrapped, dati, finale | La sezione più lunga, «Il diario in tasca» (4 capitoli), non ha una tab. «Pallo» come tab sarebbe la mascotte, non una funzione: la chat è «Raccontalo a Pallo», una delle voci del ＋ (`ModalHost.tsx:159`). | Con le tab del piano la lente resterebbe spenta per la parte più lunga della pagina, e la tab «Pallo» porterebbe a una sezione che il ＋ presenta comunque. | Tab **Diario · Live · Numeri · Wrapped** (quattro, come l'app). «Cosa registriamo?» si sposta **subito dopo il diario**: il ＋ presenta le quattro voci e la prima, «Partita live», introduce la demo. Mappa sezione→tab in §L3.2. Q-L1. `⟂ C` |
| **LC2** | Scena del Login: «117 righe, usa solo `useId`. Il file non si tocca, l'utente ci ha del lavoro non committato (`Login.palleggio.ts`)» | `Login.scena.tsx` ha **268 righe**, importa `useEffect`, `useId` e `useRef`, e anima i due giocatori con `usePalleggio` (rAF che scrive gli attributi) sui numeri di `Login.palleggio.ts` (217 righe, puro). Il lavoro è **committato** in `be9c4bd`. Il movimento CSS della scena (zoom, palma, nuvole, gabbiani, barca, schiuma, sole) sta in `Login.css` (`.accesso-scena*`), insieme agli stili del modulo di accesso. Il loop rAF si ferma solo con il movimento ridotto: **non si sospende fuori vista** (niente IntersectionObserver; a scheda nascosta lo frena il browser). | Uno snapshot con `renderToStaticMarkup` cattura solo il fotogramma `FERMO` e i nomi delle classi. Senza `Login.css` non si muove niente, e importare `Login.css` nella landing porterebbe dentro tutto il CSS del login. Il loop sempre acceso, nella landing, girerebbe anche con l'hero fuori vista. | **(a)** Spostare le sole regole `.accesso-scena*` in `src/screens/Login.scena.css`, importato da `Login.scena.tsx`: spostamento puro, il comportamento dell'app non cambia. **(b)** Estrarre il pilota DOM di `usePalleggio` in `Login.palleggio.ts` (o in un file `.dom.ts` accanto) come `avviaPalleggio(svg): () => void`, che `Login.scena.tsx` chiama da un `useEffect`. La landing lo usa e lo **sospende fuori vista e a scheda nascosta**. Il vincolo «non si tocca» è caduto con il commit. Q-L8. `⟂ E` |
| **LC3** | «Le cifre [della demo live] girano con `Odometro`» | Il tabellone di Partita live **non usa** `Tabellone`/`Odometro`: il numero è testo che fa un «pop» (`.live-num[data-pop]`, scala 1.16 e ritorno, `PartitaLive.css:115-121`). `Tabellone` è usato in Home, nel dettaglio torneo e in `Stat`. | Una demo con il contachilometri mostrerebbe un'app che non esiste. | La demo usa **il pop dell'app**. `Odometro` serve alla sezione Numeri, dove l'app usa davvero `Tabellone`. L'estrazione di `Odometro.ts` resta utile e resta nel piano. Q-L4. `⟂ C` |
| **LC4** | Nella sezione Numeri, «barre per mese in `translateY` dentro il binario» | L'app non ha un grafico a barre per mese. Ha **Andamento** (la percentuale di vittorie mese per mese, una linea: `TrendCard.tsx`) e, in Home, la **barra vinte/perse** (`home-barra`, vinte d'inchiostro e perse sul filo). | Un grafico che nell'app non c'è. | Numeri = le tre card della Home (Partite vinte con punti di scarto e barra, Tornei vinti, Serie record), più la linea di Andamento (PUÒ) disegnata una volta con l'eccezione E2 di MOTION.md. Niente barre per mese. `⟂ C` `⟂ M` |
| **LC5** | Hero: «Crea il tuo diario», poi «Ho già un account» | Tutti e due portano a `/`. Lì `Login` parte **sempre** dal Benvenuto: `vista` è uno stato locale, che nessun URL imposta (`Login.tsx:44, 84`). Il Benvenuto ripropone «Crea il tuo diario» / «Ho già un account». | Due pulsanti diversi portano allo stesso posto, che fa ripetere la scelta: un tocco inutile proprio nel passo che converte. | **Deep link minimo**: `Login` legge una sola volta, al montaggio, `?accesso=registrati` oppure `?accesso=accedi`, apre quella vista e toglie il parametro con `replaceState`. I CTA puntano a `/?accesso=registrati` e `/?accesso=accedi`. Con una sessione attiva `/` apre il diario e il parametro si ignora. Se l'utente rifiuta: un CTA solo, «Apri il diario», e via «Ho già un account». Q-L2. `⟂ E` |
| **LC6** | MOTION.md vieta parallasse ed effetti legati allo scroll (§9.2) e lo sfalsamento (§2.2.4). Il piano chiede un'eccezione solo per lo scroll | Il piano usa anche **sfalsamenti**: i pin che cadono uno alla volta, le nuvolette della chat in sequenza, il ventaglio della Storia. MOTION §2.2.4 dice «sfalsamento: zero». | Senza un'eccezione scritta, chi costruisce rompe una regola, o chi revisiona boccia una scelta del piano. | Il paragrafo «Landing» di MOTION.md elenca **due** eccezioni: lo scroll legato e lo sfalsamento narrativo, con i limiti di §L11.2. `⟂ M` |
| **LC7** | Vetro della barra con la ricetta CSS dell'app (`glass-regular`) | `glass-regular` è bianco a **.32** (`materials.css:48`). ART_DIRECTION (versione D) lo dichiara leggibile perché «sotto le barre di vetro passano solo carta, mappa e foto», con il caso peggiore misurato su `#8C8C8C`. Sulla landing, sotto la capsula passano l'**hero** (`--surface-brand` `#120E14`), le slide **d'inchiostro** di Wrapped e il finale scuro. | Etichette d'inchiostro su vetro chiaro .32 sopra `#120E14`: sotto 4.5, di molto. | La capsula sceglie il materiale **dalla sezione che ha sotto**, a soglia (mai per fotogramma): chiaro sui fondi chiari, scuro (inchiostri invertiti, `data-surface="dark"`) sui fondi marcati `data-fondo="scuro"`. Il cambio usa SVELTO e, con il movimento ridotto, è immediato. I rapporti si calcolano sul fondo peggiore di **ogni** sezione e si fissano in un test. Q-L10. `⟂ A` `⟂ C` |
| **LC8** | Lente della barra «come nell'app» | Nell'app la lente è un secondo strato `LiquidGlass` (variante `lente`) dentro la capsula: una seconda sfocatura. | Contata dal badge `?audit`, la barra da sola fa già 2 superfici. | Sulla landing la lente **non ha `backdrop-filter`**: tinta, filo di luce e ombra, senza sfocatura. La barra conta 1. `⟂ A` |
| **LC9** | «Il diario resta tuo», riscritto solo con fatti verificati | Nella landing di oggi: «Un solo servizio esterno» è **falso** (tile OSM, geocoder Photon e, col consenso, Clarity e Vercel, più Google Fonts sulla landing stessa). «Nessun altro utente può leggere i tuoi tornei» e «Nient'altro» sono **eccessivi**: un compagno collegato legge i tornei in cui è il compagno principale, **tutte** le loro partite (note comprese) e i set, e quei tornei entrano nelle sue statistiche (`20260713120000_partner_user_link_sharing.sql:54-76`). **Non esistono** né la cancellazione dell'account né l'esportazione dei dati. Il bucket `avatars` è pubblico. | Promettere ciò che il codice non fa, nella sezione sulla fiducia. | Testo di §L12.8, riga per riga con la fonte. Niente promesse su cancellazione o esportazione: c'è una proposta di attività a parte (§L15.3). «Foto private» vale per le **foto dei tornei**, non per l'immagine del profilo. `⟂ C` |
| **LC10** | Schermate: «Rotte: `/`, `/tornei/mappa`, `/diario`, `/compagni`, `/live` (si arriva cliccando «Inizia»), `/crea`, `/wrapped`» | `docs/preview/main.tsx` usa la data **vera** (`new Date()`, righe 42-43): «oggi» si sposta e **`/wrapped` esiste solo a ottobre** (`wrappedAOttobre`, `selectors.ts:468`). `/tornei/mappa` è Leaflet con le tile di OpenStreetMap. | Rigenerate a novembre, le schermate perdono Wrapped e i tornei «di oggi». Se la cornice taglia l'attribuzione © OpenStreetMap, la schermata della mappa viola la licenza delle tile. | Lo script fissa la data a un giorno di ottobre (`Emulation.setVirtualTimePolicy` oppure `Date` sostituito via `Page.addScriptToEvaluateOnNewDocument`), aspetta il caricamento delle tile e **lascia visibile l'attribuzione**. `⟂ I` |
| **LC11** | QA: «gli script di `docs/qa` con `BASE=http://127.0.0.1:5199/presentazione/`» | Gli script sono costruiti per le **rotte** dell'anteprima: navigano a `${BASE}?r=/rotta`, e `axe.mjs` ha le scene cablate, con clic sui selettori dell'app (`.ui-tab-plus`, `[role=menuitem]`). Sulla landing `?r=` non vuol dire niente. | Ogni «rotta» misurerebbe la cima della pagina e le azioni fallirebbero: le sezioni sotto la piega e gli stati bloccati (telefono sticky, Wrapped) non verrebbero mai misurati. | Uno script nuovo, **`docs/qa/landing.mjs`**, su `cdp.mjs`: scorre per ancore e posizioni (`#diario`, a metà del pin di Wrapped…) e per ogni fermata fa axe, overflow, conteggio del vetro e Tab. In più apre il menu di Pallo, il foglio d'installazione e la demo. Gli script esistenti non si piegano. Q-L14. `⟂ QA` |
| **LC12** | Foglio d'installazione: «Pallo indica il pulsante Condividi di Safari» | Le istruzioni di oggi dicono «Tocca **Condividi** nella barra di Safari» e «Aggiungi a Home». Su **iOS 26** Safari, nel layout «Compatto» (quello proposto di serie), Condividi sta dentro il menu **⋯** (da confermare su un iPhone in italiano). L'etichetta italiana di iOS è «Aggiungi alla schermata Home». Dalla 16.4 aggiungono alla Home anche gli altri browser di iOS. | Istruzioni sbagliate proprio sul telefono della persona primaria. | Quattro varianti di passi (§L12.10), scelte dallo user agent: Safari con `Version/` 26 o superiore, Safari fino a 18, altro browser iOS (`CriOS`, `FxiOS`, `EdgiOS`), resto. Pallo indica **il bordo** verso la barra di Safari, non un punto preciso. Da provare su un iPhone vero. Q-L9. `⟂ C` `⟂ QA` |
| **LC13** | `theme-color` `#F6F6F4` | L'hero, la prima cosa che si vede, è `--surface-brand` `#120E14`. | Su Chrome Android la barra degli indirizzi sarebbe chiara sopra un hero scuro: una cucitura in cima alla pagina. | `theme-color` `#120E14` nell'HTML. Il modulo lo porta a `#F6F6F4` quando l'hero esce di vista, e viceversa: a soglia, con un solo `<meta>` aggiornato. Il manifest resta `#F6F6F4` (§L15.2, Q-L5). `⟂ C` `⟂ I` |
| **LC14** | «Chi c'è oggi dentro Compagni» | In Compagni c'è una **card che porta** a `/oggi`: «Chi c'è in spiaggia oggi?» / «Fai check-in e trova un compagno sul posto» (`Compagni.tsx:87-104`). Il check-in lo vede solo chi ha fatto check-in nella stessa città lo stesso giorno (giorno UTC). Mostra nome, foto profilo, «Cerca compagno» e nota (`checkins_who_is_here.sql:70-105`). | Il testo non deve dire che la funzione «sta» in Compagni, né che il check-in scade a mezzanotte. | Testo: «Da Compagni vedi chi è in spiaggia oggi nella tua città, e chi cerca un compagno.» Nessuna promessa sulla scadenza. `⟂ C` |
| **LC15** | Il ＋ in sezione mostra «Partita live, Torneo, Torneo rapido, Raccontalo a Pallo» | Nell'app il menu ha anche **«Partita»** («Aggiungi un risultato a «{torneo}»»), ma solo quando c'è un torneo di destinazione (`ModalHost.tsx:139-147`). Titolo «Cosa registriamo?», sottotitolo «Scegli tu, al resto penso io.» | Nessuno, se è dichiarato. | La landing mostra le quattro voci sempre presenti, con **i loro sottotitoli veri**, e una riga: «Con un torneo in corso c'è anche «Partita»: un risultato in più, dritto nel torneo.» `⟂ C` |
| **LC16** | Testi della landing di oggi | Parlano di «Dashboard», «socio», «win rate» e «Tre modi per segnare un torneo» (oggi sono quattro voci, più la Partita live). La legenda della mappa dice «Podio / Buon piazzamento / Giocato»; l'app dice **Vinta · Podio · Giocata** (`Mappa.tsx:47`). | Il glossario dell'app (§3.2) dice «compagno», non «socio». | Glossario di §L3.4. Le parole sono quelle dell'app: «Partite vinte», «punti di scarto», «compagno», «Vinta · Podio · Giocata». `⟂ C` |
| **LC17** | — | `public/offline.html`, la pagina che il service worker serve senza rete, usa ancora navy `#1b2a4a`, `#ff6b35` e `system-ui`. «Continuando accetti i Termini e l'Informativa privacy» (Benvenuto) **non ha pagine**: Termini e Informativa non esistono nel repo. | Fuori scope, ma la landing non deve linkare pagine che non ci sono. | Nessun link a Termini o Informativa dalla landing. Due attività proposte a parte (§L15.3). |
| **LC18** | «Su desktop la stessa barra sta in alto» | L'app su desktop (≥900) usa la Sidebar, non una barra in alto (§7.2). | Non è un errore. È una scelta diversa dall'app, e va detta. | Sulla landing la barra in alto va bene: una Sidebar ruberebbe 240px a una pagina di lettura. Il marchio sta a sinistra, la capsula al centro e il ＋ con l'etichetta a destra (§L9). |

---

## L2. Visitatori e obiettivi

### L2.1 Persone

| Persona | Come arriva | Vincoli che pesano sul design |
|---|---|---|
| **V1 · Curioso dal telefono** (primaria) | Da un link: la Storia di un torneo o lo slide di Wrapped condivisi su Instagram, il gruppo WhatsApp della spiaggia, il passaparola. Usa Safari su iPhone o Chrome su Android, spesso in spiaggia. | Attenzione di 30–90 secondi. Una mano sola, sole forte, rete a singhiozzo. Vuole sapere **cos'è, se fa per lui e come si comincia**, prima di scorrere. |
| **V2 · Già convinto** | Un amico gliel'ha fatta vedere. | Vuole **installarla** subito, e con le istruzioni giuste per il suo telefono. |
| **V3 · Ha già il diario** | Un vecchio link, un preferito, il risultato di una ricerca. | Un tocco per **aprire il diario**, da qualunque punto della pagina. |
| **V4 · Dal computer** | Il link aperto sul portatile. | Legge con calma, con mouse o tastiera, in una finestra larga. L'app è fatta per il telefono, e la pagina glielo deve dire senza escluderlo. |
| **V5 · Con tecnologie assistive** | VoiceOver, TalkBack, sola tastiera, zoom al 200–400%, movimento ridotto, contrasto alto. | Ogni cosa che si vede si legge anche nel testo. Niente parla da sola durante lo scroll. Tutto si ferma. |
| **V6 · Telefono economico** | Android di fascia bassa, rete 3G. | Pagina leggera (niente React né Supabase), scroll fluido con la CPU rallentata 4×, nessun lavoro fuori vista. |

### L2.2 Obiettivi e criteri di successo

| ID | Il visitatore vuole… | Successo misurabile |
|---|---|---|
| **GL1** | **Capire in un colpo d'occhio** | Senza scorrere, a 390×844 **e** a 320×568, si vedono il titolo, una frase e «Crea il tuo diario». LCP ≤ 2,5 s su 4G lento. |
| **GL2** | **Vedere che è vero** | Ogni funzione nominata ha una schermata vera o una demo che funziona. Nessuna funzione inventata. I numeri vengono dal dataset dimostrativo (Q-L3). |
| **GL3** | **Provarla senza account** | La demo della Partita live è a un tocco dalla barra («Live»). Si gioca col dito e con la tastiera fino al set vinto. |
| **GL4** | **Cominciare** | «Crea il tuo diario» sta nell'hero e nel finale; il ＋ «Apri il diario» sta sempre nella barra. Al massimo 1 tocco da qualunque punto. |
| **GL5** | **Installarla** | Da qualunque punto, al massimo 2 tocchi (menu di Pallo → «Installa l'app»), con il prompt nativo o il foglio giusto (LC12). Con l'app già installata non compare. |
| **GL6** | **Fidarsi** | Ogni frase della sezione dati ha una fonte nel codice (§L12.8). La landing non carica statistiche, cookie né caratteri di terzi. |
| **GL7** | **Divertirsi senza intralci** | Pallo reagisce, ma non copre un'azione, non blocca un tocco e non parla durante lo scroll. Tutto il movimento si ferma con un comando. |

**Fuori scope**: analytics sulla landing (servirebbe il consenso e un banner), QR code per passare dal computer al telefono, traduzioni, pagine legali, restyle di `offline.html`, recupero password.

---

## L3. Architettura dell'informazione

### L3.1 La pagina

```
/presentazione/  (una pagina, una history)
│
├─ [skip link]  «Salta al contenuto» → #contenuto
├─ <nav aria-label="Sezioni">  barra: Diario · Live · Numeri · Wrapped  +  ＋ «Apri il diario» → /
├─ [Pallo guida]  <button> → disclosure «Dove vuoi andare?»
│
└─ <main id="contenuto">
    ├─ #inizio     Hero «Ogni partita, nel tuo diario.»                (h1)
    ├─ #diario     Il diario in tasca: telefono sticky, 4 capitoli     (h2 + 4 h3)
    ├─ #registra   Cosa registriamo?: il ＋, 4 voci, mini chat         (h2)
    ├─ #live       Partita live: provala qui (demo)                    (h2)
    ├─ #numeri     I numeri li fa l'app                                (h2)
    ├─ #mappa      La mappa delle conquiste                            (h2)
    ├─ #wrapped    Beach Wrapped e la Storia                           (h2 + h3)
    ├─ #dati       Il diario resta tuo                                 (h2 + h3 per riga)
    └─ #comincia   Finale «La prossima stagione te la ricordi per intero» (h2)
<footer>  marchio, «Apri il diario», «Ferma le animazioni», «Torna su»
<div role="dialog">  foglio d'installazione (fuori da main, inert finché chiuso)
```

- **Un solo `h1`** (l'hero). Ogni sezione è una `<section aria-labelledby>` col suo `h2`, che ha `tabindex="-1"` perché è la destinazione del focus nei salti (§L4.3).
- Gli id sono **contratto** (`⟂ C`, `⟂ QA`): li usano la barra, il menu di Pallo, i deep link e lo script di QA. Sono in italiano, minuscoli e senza accenti, come sopra.

### L3.2 Sezione → tab → Pallo

| Sezione | Tab accesa | Fondo (per la capsula, LC7) | Pallo in scena | Guida |
|---|---|---|---|---|
| `#inizio` | nessuna | **scuro** | grande, `saluta`, `segui` | **fuori** |
| `#diario` | Diario | chiaro | (solo nelle schermate) | dentro: umore e battuta per capitolo (§L12.4) |
| `#registra` | Diario | chiaro | `testa` nella chat: `pensa` mentre scrive, `contento` alla fine | **fuori** |
| `#live` | Live | chiaro (i pannelli sono carta bianca, come nell'app) | nella demo, con `battuta()` | **fuori** |
| `#numeri` | Numeri | chiaro | — | dentro, `cool` |
| `#mappa` | Numeri | chiaro | — | dentro, `pensa` |
| `#wrapped` | Wrapped | **misto**: slide arancio, d'inchiostro e sabbia | nelle slide: `festa`, `cool`, `cuori` (`umoreSlide`) | **fuori** |
| `#dati` | nessuna | chiaro | — | dentro, `sbircia` |
| `#comincia` | nessuna | **scuro** (`--surface-brand`, PUÒ: `⟂ A`) | grande, `cuori` → `festa` col CTA in hover o a fuoco | **fuori** |
| footer | nessuna | `⟂ A` | — | fuori (il finale è appena sopra) |

**Regola «un Pallo alla volta».** Parla un Pallo che ha accanto un testo visibile (nuvoletta, messaggio, slide). Quando una sezione ha un Pallo suo, la guida esce. I Pallo dentro le **schermate** del telefono sono immagini e non contano, ma la guida non ripete il consiglio che la schermata mostra già (§L12.4).

### L3.3 Gerarchia dei contenuti per sezione

| Sezione | Primo piano | Secondo piano | Azione |
|---|---|---|---|
| Hero | titolo, una frase, il CTA | scena al tramonto, Pallo che saluta | **Crea il tuo diario** · Ho già un account · Installa sul telefono · Ferma le animazioni |
| Il diario in tasca | lo schermo del telefono che cambia | 4 capitoli di testo, uno per schermata | — |
| Cosa registriamo? | le 4 voci del ＋ come nell'app | il pannello della voce scelta (la chat di default) | scegliere una voce; rispondere a Pallo; «Ricomincia» |
| Partita live | il tabellone con due pannelli | le regole e i fatti (schermo acceso, refresh) | +1 · −1 · Chiudi il set · Ricomincia |
| Numeri | le tre card della Home | Andamento (PUÒ); che cosa c'è in Statistiche | — |
| Mappa | la costa con i pin | la legenda Vinta · Podio · Giocata; l'elenco delle città | — |
| Wrapped | le slide che scorrono | la Storia nei 3 layout | — |
| Dati | le righe raggruppate | — | — |
| Finale | il titolo, Pallo grande | — | **Crea il tuo diario** · Installa sul telefono · Ho già un account |

### L3.4 Glossario (estende §3.2)

| Si dice | Non si dice | Nota |
|---|---|---|
| **Beach Diary** | Beach Volley Diary (nei testi) | `manifest.name` resta «Beach Volley Diary» (`⟂ I`) |
| **compagno** | socio, partner | §3.2, C18 |
| **Partite vinte** (con la percentuale) | win rate | l'etichetta della Home |
| **punti di scarto** | differenziale | l'etichetta della Home |
| **Statistiche** | Dashboard | C7 |
| **Partita live** | segnapunti live, scoreboard | il nome della voce del ＋ |
| **Raccontalo a Pallo** | assistente AI, chatbot | è un copione, non un modello |
| **Vinta · Podio · Giocata** | Podio / Buon piazzamento / Giocato | la legenda della Mappa |
| **la Storia** | story, post | il PNG 1080×1920 di un torneo |
| **installare**, «Aggiungi alla schermata Home» | scaricare, store | è una PWA, non c'è uno store |

---

## L4. Navigazione: barra, ancore, history

### L4.1 La barra (≙ TabBar, §7.1)

- **Quattro link** `<a href="#diario">` … `<a href="#wrapped">`, ognuno con icona ed etichetta visibile. La tab della sezione corrente ha **`aria-current="true"`**, non `"page"`: siamo dentro una pagina sola. Nell'HTML statico nessuna tab ha `aria-current`, lo mette il modulo.
- **Sezione corrente** = quella che contiene la linea orizzontale al **40% dell'altezza del viewport**. Si calcola con un IntersectionObserver su una fascia sottile (per esempio `rootMargin: "-40% 0px -59% 0px"`), mai leggendo il layout a ogni fotogramma. La lente si sposta quando la sezione cambia (MOLLA). Sezioni senza tab (§L3.2): la lente sparisce in opacità, come nell'app con `i < 0`.
- **Il ＋** è un **link** a `/`, arancio, con il glifo d'inchiostro. Non ha il parametro di Q-L2: lo tocca anche chi ha già un account (V3), e il Benvenuto gli fa scegliere.
  - Sotto i 600px è solo icona, con nome accessibile «Apri il diario».
  - Dai 600px è una capsula con l'etichetta visibile «Apri il diario».
  - La prima battuta della guida dopo l'hero lo spiega (§L12.4).
- **Posizione**: sotto i 900px è flottante in basso, con le misure della TabBar (`--tabbar-*`, `--plus-size`, `--tabbar-bottom` con la safe area). Dai 900px sta in alto: il marchio a sinistra (link a `#inizio`), la capsula al centro, il ＋ con l'etichetta a destra (§L9).
- **Nell'ordine del DOM la barra viene prima di `main`**, dopo lo skip link, a ogni larghezza. È la convenzione dei siti, e lo skip link la salta. L'app la mette dopo il contenuto (§7.1) perché lì non c'è uno skip link e la barra è la shell.
- **Mai nascosta scorrendo** (MOTION §9.2). Si nasconde solo mentre è aperto il foglio d'installazione, sotto il velo e `inert`.

### L4.2 Ancore e history

| Caso | Comportamento | Reduced / fermo |
|---|---|---|
| Tocco su una tab, una voce del menu di Pallo, «Torna su» | Il modulo intercetta il clic. Salto **istantaneo** alla sezione (`scrollIntoView({block: 'start'})` con `behavior: 'auto'`; MOTION §9.3 vieta lo `smooth` globale). Focus all'`h2` a `t0`. `history.replaceState` con il nuovo hash. | uguale |
| Distanza oltre `SALTO_SCROLL` (3 × innerHeight) | PUÒ fare il salto composto di MOTION §9.3: prima secco fino a una schermata dalla meta, poi smooth. **Non** se di mezzo c'è una sezione bloccata o a soglia (Wrapped, numeri non ancora saliti): attraversarla di corsa farebbe partire i suoi effetti fuori dalla vista. Nel dubbio, istantaneo. | istantaneo |
| Senza JavaScript | L'ancora nativa salta e aggiunge una voce di history. Va bene. | — |
| Deep link `/presentazione/#live` | La pagina si apre sulla sezione. La guida compare **già nell'angolo**, senza il passaggio dall'hero. Gli effetti delle sezioni già superate vanno allo **stato finale**, senza animazione. | uguale |
| Indietro del browser | Lascia la landing: con `replaceState` i salti fra sezioni non riempiono la history. | — |
| Ricarica a metà pagina | `history.scrollRestoration` resta `auto`. Gli effetti già superati vanno allo stato finale. | — |

**Perché `replaceState`.** Il V1 arriva da Instagram o WhatsApp. Se ogni tocco su una tab aggiungesse una voce, l'«indietro» del telefono lo farebbe passare da una sezione all'altra invece di riportarlo da dove è venuto.

### L4.3 Focus nei salti

- La destinazione è l'`h2` della sezione (`tabindex="-1"`), con `focus({preventScroll: true})` a `t0`, **dopo** lo scroll istantaneo. Così il prossimo Tab parte dalla sezione.
- **Nessun elemento a fuoco finisce sotto le barre** (WCAG 2.4.11). Il `:root` della landing ha `scroll-padding`:
  - sotto i 900px: `scroll-padding-top` = safe-top + 12px; `scroll-padding-bottom` = barra + safe area + **Pallo guida** + 16px;
  - dai 900px: `scroll-padding-top` = barra in alto + 16px; `scroll-padding-bottom` = Pallo + 16px.

  È la stessa regola di `AppShell.css`, che POLISH.md vieta di togliere. `⟂ C`
- I salti programmatici **non** contano come «scroll veloce» per Pallo (§L7.2).

---

## L5. Flussi

### FL0. Il percorso principale

```
link (Instagram · WhatsApp · ricerca)
  │
  ▼
#inizio ─ «Crea il tuo diario» ───────────────▶ /?accesso=registrati  (Q-L2; senza: / → Benvenuto)
  │      ├ «Ho già un account» ───────────────▶ /?accesso=accedi
  │      ├ «Installa sul telefono» ───────────▶ FL5
  │      └ «Ferma le animazioni» ─────────────▶ FL8
  │ scorre: la scena scende, Pallo salta nell'angolo e diventa la guida
  ▼
#diario ─ 4 capitoli, il telefono cambia schermo
  ▼
#registra ─ il ＋ si apre ─ voce ─▶ pannello
  │                         ├ «Partita live» ─▶ salto a #live
  │                         └ «Raccontalo a Pallo» ─▶ FL4
  ▼
#live ─ FL3
  ▼
#numeri ─▶ #mappa ─▶ #wrapped ─▶ #dati ─▶ #comincia ─ CTA ─▶ /
                                               └ Installa ─▶ FL5
Sempre: barra (Diario · Live · Numeri · Wrapped · ＋) e, dove c'è, Pallo ─▶ FL2
```

### FL1. Primo colpo d'occhio (GL1)

1. Si apre il primo fotogramma, senza aspettare il JavaScript: fondo `--surface-brand`, titolo, frase, «Crea il tuo diario» e «Ho già un account». Il pulsante d'installazione non è ancora deciso, e il suo posto è riservato (§L6.1).
2. Il modulo arriva. Entrano la scena e Pallo, in un livello già misurato; lo spazio del pulsante d'installazione si riempie o resta vuoto, senza spostare niente.
3. Pallo saluta, gli occhi seguono il dito.

### FL2. Saltare (barra e Pallo)

```
tab ──────────────────────────▶ salto istantaneo · focus all'h2 · lente MOLLA · replaceState
Pallo ─ tocco ─▶ «Dove vuoi andare?» (focus alla prima voce, t0)
   ├ voce di sezione ─▶ chiude · salto · focus all'h2 · la guida dice la battuta (se è la prima volta)
   ├ «Installa l'app» ─▶ chiude (frost a t0) · FL5
   ├ «Ferma le animazioni» ─▶ aria-pressed · il menu resta aperto · FL8
   ├ «Apri il diario» ─▶ /
   └ Esc · tocco fuori · focus che esce ─▶ chiude · focus a Pallo (Esc) o dove l'utente l'ha messo
```

### FL3. Partita live (GL3)

```
fuori vista ─▶ (stato di partenza preparato)
in vista ≥ 60%, nessun tocco, movimento permesso
   ─▶ autoplay: pochi punti, ~1 al secondo, Pallo commenta · NESSUN annuncio
   ─▶ arriva al primo «Cambio campo!» e si ferma prima del set point
   ─▶ Pallo: «Tocca tu: chi fa punto?»
primo tocco · tasto · focus dentro la demo ─▶ autoplay spento per sempre (in questa visita)
+1 / −1 ─▶ pop sul numero · battuta() · status «14 a 12» (+ la notizia)
set point ─▶ «Set point per voi!» · match point ─▶ sorpreso
set finito ─▶ «Set vostro! Chiudetelo.» festa ─▶ compare «Chiudi il set» (focus resta sul pannello)
«Chiudi il set» ─▶ set 2 (o 3, a 15) · titolo «Set 2 di 3» · pillola «Set 1 21–18»
partita finita ─▶ riepilogo «Partita vostra, 2–1» · focus al titolo del riepilogo · «Ricomincia»
«Ricomincia» ─▶ stato di partenza · focus resta su «Ricomincia»
```

### FL4. Raccontalo a Pallo (la mini chat)

```
pannello «Raccontalo a Pallo» (scelto di default)
  ─▶ già scritti, senza pausa: «Ciao! Sono Pallo. Ti faccio qualche domanda e il torneo lo compilo io.» · «Come si chiama il torneo?»
  ─▶ risposte rapide: [Rimini Open] [Cervia Beach Cup]
tocco ─▶ la risposta va a destra · focus al gruppo delle risposte (t0) · Pallo «pensa» per battitura(n)
      ─▶ la domanda dopo (copione.ts: `domanda(step, …)`) · le risposte nuove
… nome · compagno · data · finito o in corso · piazzamento
  ─▶ «Ecco il riepilogo. Confermo la creazione?» + card riepilogo (`righeRiepilogo`)
  ─▶ [Conferma] ─▶ Pallo `contento` · «Fatto. Nell'app adesso sarebbe nel tuo diario.» · [Ricomincia]
Qualunque tasto o tocco durante «pensa» salta la pausa (MOTION §5 F11).
```

### FL5. Installare (GL5)

```
tocco «Installa sul telefono» / «Installa l'app» / «Aggiungi alla Home»
 ├─ prompt nativo pronto (beforeinstallprompt) ─▶ prompt()
 │    ├─ accettato ─▶ appinstalled ─▶ pulsanti via · status «Fatto: Beach Diary è tra le tue app.»
 │    ├─ rifiutato ─▶ pulsanti via fino alla prossima visita (come oggi: «meglio che insistere»)
 │    └─ errore ─▶ foglio, variante «altro»
 ├─ iOS / iPadOS ─▶ foglio, variante per browser e versione (LC12)
 └─ nient'altro ─▶ il pulsante non c'è mai stato
standalone (già installata) ─▶ nessun pulsante, in nessun punto
```

Il foglio: focus al titolo a `t0`, Tab chiuso dentro il foglio, Esc, tocco sul velo o «Ho capito» per chiudere, focus che torna a chi l'ha aperto. Il resto della pagina è `inert` (§L7.12).

### FL6. Ha già il diario (V3)

Il ＋ della barra (oppure «Ho già un account») → `/`. Se c'è una sessione, l'app apre il diario e il parametro `?accesso` si ignora (LC5). La landing non sa se l'utente è loggato, e non deve provarci: niente Supabase.

### FL7. Giocare con Pallo

| Gesto | Reazione |
|---|---|
| tocco (Invio, Spazio) | `reagisci()` (un umore allegro a caso, 1 s) e il menu si apre o si chiude |
| tocchi entro 0,7 s dal precedente | contano «di fila»: il menu **non** si richiude, e Pallo reagisce a ognuno |
| il quinto di fila, oppure un tocco lungo (600 ms) | `sorpresa()` (palleggio o occhiali, a turno). Il menu si chiude. Il tocco lungo non apre il menu né quello contestuale (`usePalloTocco`) |
| dito o puntatore che si muove | gli occhi seguono (`segui`) |
| scroll veloce (più di ~3.000 px/s per più di 150 ms, non programmatico) | `reagisci('sorpreso')`, al massimo una volta ogni 8 s |
| 10 s senza scroll, tocchi, puntatore né tasti | `dorme` (le «z» salgono). Mai con il menu aperto, mai durante una battuta |
| primo gesto dopo il sonno | `sorpreso` per 1 s, poi l'umore della sezione. Nessuna battuta |

### FL8. Ferma le animazioni

Tocco su «Ferma le animazioni» (hero, menu di Pallo o footer): `aria-pressed="true"` su **tutti e tre**, e la pagina passa alla versione ferma (§L11.3). La scelta resta nel dispositivo (`localStorage`, chiave `bvd_landing_fermo`, letta e scritta in try/catch). Un secondo tocco riaccende. Con `prefers-reduced-motion: reduce` la pagina è già ferma: il comando lo dice («Animazioni già ridotte dal sistema»), ed è disattivato con una spiegazione.

---

## L6. Inventario degli stati, sezione per sezione

### L6.0 Stati trasversali (valgono per ogni sezione)

| Stato | Che cosa si vede | Requisito |
|---|---|---|
| **Senza JavaScript** (o il modulo non parte: CSP, browser vecchio, errore) | Tutti i testi, le ancore native, i CTA, le immagini. Il telefono mostra il primo schermo, la chat un copione già scritto, la demo live un tabellone fermo senza pulsanti, Wrapped una riga che si scorre a mano. Nessun Pallo guida, nessun pulsante d'installazione. | **DEVE.** La versione ferma è la **base dell'HTML** e il modulo la arricchisce con un attributo (`data-viva` sulla sezione). Mai il contrario: una pagina «rotta senza JS» è vietata. |
| **Un modulo fallisce** | Le altre funzioni restano. | `main.ts` inizializza ogni modulo in un try/catch suo; un errore non tocca gli altri. **DEVE** |
| **Rete lenta** | Testo subito, col carattere di riserva. Geist arriva con `font-display: swap`, senza spostare il layout (riserva con le metriche di Geist, `⟂ A`). Le schermate arrivano lazy, dentro cornici già misurate. | CLS 0 anche quando il carattere cambia (`docs/qa/fontcls.mjs`). |
| **Offline dopo il caricamento** | La pagina continua: ancore, demo, chat e menu sono tutti locali. Le immagini non ancora scaricate lasciano la cornice col fondo neutro e l'`alt`. | Una cornice vuota non deve sembrare rotta: fondo `--fill`, nessuna icona di immagine mancante in vista. I CTA verso `/` danno la pagina offline del SW (LC17). |
| **Movimento ridotto o «Ferma le animazioni»** | La versione ferma (§L11.3): numeri pieni, Pallo fermo nel suo umore, scene ferme, niente autoplay, Wrapped come riga manuale, niente indicatore di avanzamento. | **DEVE.** La leggibilità è la stessa della versione animata. |
| **Trasparenza ridotta, contrasto alto, colori forzati** | Il vetro diventa opaco (`materials.css`, già fatto). In colori forzati: bordi veri, niente ombre; Pallo e la scena restano disegni (SVG con `forced-color-adjust: none` solo sulle illustrazioni decorative, `⟂ A`). | Nessun testo che si regge solo sul vetro. |
| **Prima visita / ritorno nella stessa sessione** | Alla prima visita i numeri salgono da zero e la guida dice una battuta per sezione. Tornando nella sessione, numeri fermi e battute già dette in silenzio (cambia solo l'umore). | `sessionStorage`, chiave `bvd_landing_visti`, in try/catch. Se manca, si comporta come una prima visita. |
| **Visitatore esperto** | Deep link alle sezioni, tastiera, scroll veloce. | I deep link funzionano (§L4.2). Nessuna scorciatoia globale da tastiera: quelle della demo valgono solo con il focus dentro la demo (§L7.6). |
| **Già installata** (`display-mode: standalone`) | Nessun pulsante d'installazione, nessuna voce nel menu. | Come oggi. |
| **Desktop** (puntatore fine, ≥ 900) | Due colonne (§L9). Una riga nel finale: «È fatta per il telefono: apri bv-diary.vercel.app dal tuo.» | Il pulsante d'installazione compare solo se c'è il prompt nativo (Chromium), con l'etichetta «Installa l'app» (Q-L7). |

### L6.1 Hero `#inizio`

| Stato | Contenuto / comportamento |
|---|---|
| Primo fotogramma | Fondo `--surface-brand`, marchio, `h1`, frase, «Crea il tuo diario», «Ho già un account». **Lo spazio del pulsante d'installazione è riservato** (la riga ha un'altezza minima, oppure il pulsante sta in un livello che non sposta niente, `⟂ A`). Senza questa riserva, la sua comparsa sposta tutto (CLS). |
| Modulo pronto | Scena (snapshot) e palleggio (`avviaPalleggio`), Pallo `saluta` con `segui`. Il pulsante «Ferma le animazioni» sta nell'angolo della scena. |
| Installabile | «Installa sul telefono» nel posto riservato. |
| Movimento ridotto o fermo | La scena è un quadro: il fotogramma `FERMO` del palleggio. Pallo fermo in `saluta`. Niente parallasse in uscita. |
| Hero fuori vista | Palleggio, sguardo e vita di Pallo **sospesi** (IntersectionObserver più `visibilitychange`). |
| Uscita dall'hero (scroll in giù) | I piani della scena scorrono a velocità diverse e il sole scende (scroll legato, §L11). Quando il fondo dell'hero passa il 30% del viewport, Pallo **salta nell'angolo**: FLIP con molla, e l'hero perde il suo Pallo (opacità 0). |
| Ritorno nell'hero | La guida esce (SVELTO) e il Pallo dell'hero ricompare in dissolvenza. Il ritorno non ha il FLIP al contrario. |
| 320×568 | Sopra la piega: marchio, `h1`, frase, «Crea il tuo diario». Pallo e la scena possono stare dietro o più in basso. |
| Landscape su telefono (altezza < 500) | L'hero non è a tutta altezza: testo e CTA a sinistra, la scena a destra (PUÒ), oppure il solo testo. |

### L6.2 Il diario in tasca `#diario`

| Stato | Contenuto / comportamento |
|---|---|
| Base (HTML) | Quattro capitoli in fila, ognuno con `h3`, testo e la **sua** schermata (`img` con `width`/`height`). È anche la versione ferma, quella senza JS e quella a viewport basso. |
| Telefono sticky (JS, altezza ≥ 640, larghezza ≥ 360, movimento permesso) | Una sola cornice di telefono sticky, con le quattro schermate impilate. Lo schermo cambia **a soglia**, quando il testo di un capitolo passa la linea del 50%. Dissolvenza di ENTRATA; con il movimento ridotto lo scambio è istantaneo. Le immagini dei capitoli in linea si nascondono **solo per gli occhi**: `alt` e testo restano una volta sola nell'albero di accessibilità (le copie della cornice sono `aria-hidden`, oppure una sola serie di immagini cambia posto via CSS, `⟂ C`). |
| Immagini non ancora arrivate | Cornice con fondo `--fill` e misure fisse. La prima immagine si carica quando la sezione è a una schermata di distanza, le altre in lazy. |
| Guida | Dentro. Umore e battuta per capitolo (§L12.4), una volta per capitolo per sessione. |
| Sotto i 900px | Telefono sticky in alto, alto al massimo il 56% di `svh`; i capitoli scorrono sotto. Il testo di un capitolo non passa **mai** sotto la cornice. |
| Dai 900px | Due colonne: testo a sinistra, telefono sticky a destra. |

### L6.3 Cosa registriamo? `#registra`

| Stato | Contenuto / comportamento |
|---|---|
| Base | Titolo «Cosa registriamo?», sottotitolo «Scegli tu, al resto penso io.». Le quattro voci come **elenco** con i sottotitoli veri (LC15). Sotto, il copione della chat già scritto per intero, come trascrizione (`<ol>`). |
| JS | Le voci diventano una **tablist verticale** (`aria-orientation="vertical"`, attivazione automatica con ↑/↓, Home e Fine). Il pannello mostra la voce scelta. «Raccontalo a Pallo» è scelta di default, perché è l'unica interattiva. |
| Entrata in vista (prima volta) | Il ＋ «si apre nel menu» come nell'app: origine dal ＋, MOLLA (MOTION §3.6). Una volta per sessione. Fermo: il menu è già aperto. |
| Pannello «Partita live» | Due righe e il link «Provala qui sotto» → `#live` (salto come §L4.2). |
| Pannello «Torneo» | La schermata del foglio «Nuovo torneo» (`⟂ I`, opzionale) e una riga: «Luogo, formato, compagno, piazzamento.» |
| Pannello «Torneo rapido» | «Nome e piazzamento, i dettagli dopo.» |
| Chat: inizio | I due messaggi d'apertura sono **già scritti**, senza pausa (come `INTRO` in `copione.ts`). Sotto, il gruppo delle risposte rapide. |
| Chat: Pallo «scrive» | Avatar `testa` in `pensa`, i tre puntini (`aria-hidden`) per `battitura(n)`. Qualunque input salta la pausa. Fermo: pausa 0, niente puntini. |
| Chat: risposta scelta | La bolla dell'utente a destra. Focus al **gruppo delle risposte** (`role="group"`, `tabindex="-1"`) a `t0`; le risposte nuove compaiono lì dentro. |
| Chat: fine | La card del riepilogo (`righeRiepilogo`), Pallo `contento`, la frase finale (§L12.5) e «Ricomincia». Il focus va al messaggio finale. |
| «Ricomincia» | Si riparte da `RIPARTENZA` («Ripartiamo da capo.», «Come si chiama il torneo?»). Il focus va alla prima risposta. |
| Guida | Fuori: parla il Pallo della chat. |

### L6.4 Partita live `#live`

| Stato | Contenuto / comportamento |
|---|---|
| Base (senza JS) | Tabellone fermo (per esempio «Set 1 di 3», Loro 18, Noi 20, la battuta «Set point per voi!»), i pulsanti `hidden`, e il testo delle regole. Il tabellone fermo è un'immagine fatta di testo, con un nome che lo dice (`role="img"` + `aria-label="Esempio: Noi 20, Loro 18, set point per voi"`). |
| Pronta (JS, fuori vista) | Stato di partenza: Set 1 di 3, a 21, con un punteggio basso. Pulsanti visibili. Pallo `saluta`, «Si comincia! Tocca chi fa punto.» |
| Autoplay | Entra in vista per almeno il 60%, nessuno l'ha ancora toccata, movimento permesso. Pochi punti, uno ogni ~1 s, finché non arriva il primo «Cambio campo!». Si ferma **prima** di un set point. **Non annuncia niente.** Non parte se il focus è già dentro la demo. Un solo autoplay per visita. |
| In gioco | Il primo tocco, tasto o focus dentro la demo **spegne l'autoplay per sempre**. Ogni punto fa il pop, cambia la battuta (`battuta()`) e scrive lo status «{noi} a {loro}», seguito dalla notizia quando `notizia: true`. PUÒ vibrare (`navigator.vibrate(12)`) **solo** sui tocchi, mai nell'autoplay. |
| −1 a zero | `aria-disabled="true"`; il tocco non fa niente (come l'app). |
| Set point / match point | La battuta dell'app. Match point: `sorpreso`. |
| Ai vantaggi | «Ai vantaggi: servono due punti di fila.» |
| Set finito | `festa` o `triste`, «Set vostro! Chiudetelo.» o «Set loro: chiudi e si riparte.». Compare «Chiudi il set», e il focus resta sul pannello toccato. Il +1 non accetta più punti finché il set non si chiude: è `aria-disabled` e il tocco ripete la battuta. |
| Set successivo | «Set 2 di 3» (il terzo a 15), la pillola del set prima («Set 1 21–18»), punteggio a zero, focus al titolo del set. |
| Partita finita | Riepilogo: «Partita vostra, 2–1» oppure «Partita loro, 1–2», i set, Pallo `festa` o `triste`. **Focus al titolo del riepilogo** a `t0`, perché i pannelli diventano `inert`. «Ricomincia». |
| Movimento ridotto o fermo | Niente autoplay. Il pop diventa un cambio istantaneo; Pallo cambia umore senza animarsi. |
| Guida | Fuori. |
| Il tasto ↑/↓ con il focus fuori dalla demo | Fa scorrere la pagina, come sempre. Le scorciatoie non sono globali. |

### L6.5 I numeri li fa l'app `#numeri`

| Stato | Contenuto / comportamento |
|---|---|
| Base | Tre card come in Home, con i **valori finali nel testo** dell'HTML (generati dal dataset, Q-L3). Barra vinte/perse ferma. |
| JS, fuori vista all'avvio | Il modulo monta `Odometro` e porta i numeri a zero senza transizione (fuori vista non si vede). |
| Prima entrata in vista (≥ 50%) | I numeri salgono da zero, RACCONTO, **una volta per sessione** (chiave `numeri` in `bvd_landing_visti`). La barra cresce in `translateX` dentro il binario (MOTION §12). |
| Già in vista all'avvio (deep link, ricarica) | Numeri fermi al valore finale. |
| Ritorno nella sessione | Numeri fermi. |
| Ridotto o fermo | Valori finali, barra ferma. |
| Guida | Dentro, `cool`: «{n} vittorie di fila: è il tuo record. Non fermarti adesso!» |
| Accessibilità | Le strisce di `Odometro` sono `aria-hidden`, il valore è testo nascosto già aggiornato (come `Tabellone`). «2/14» si legge «2 su 14» (come `home-mini-di`). |

### L6.6 La mappa delle conquiste `#mappa`

| Stato | Contenuto / comportamento |
|---|---|
| Base | Un'illustrazione SVG della costa, con i pin già posati (`role="img"` + `aria-labelledby` su una didascalia «Illustrazione: {n} città…»), la legenda **Vinta · Podio · Giocata**, e l'elenco delle città con il piazzamento **in testo**. Il colore non è mai l'unica informazione (1.4.1). |
| Prima entrata in vista | I pin cadono uno alla volta con una molla (sfalsamento narrativo, LC6), al massimo 8, in ordine da nord a sud. |
| Ridotto o fermo | Pin già posati. |
| Pin | Colori dei dati (`--data-win`, `--data-podium`, `--data-rest`) e **doppio bordo** (alone bianco più filo d'inchiostro), come la mappa vera e come vuole `contrast.test.ts`. |
| Guida | Dentro, `pensa`: «Il tuo posto magico? {città}: {1° in n tornei / n volte sul podio}.» (il modello di `deriveConsigli`) |
| Testo | Dice che nell'app la mappa usa OpenStreetMap, e che questa è un'illustrazione. |

### L6.7 Beach Wrapped e la Storia `#wrapped`

| Stato | Contenuto / comportamento |
|---|---|
| Base | Una **riga di slide che si scorre a mano** (`overflow-x: auto`, `scroll-snap-type: x mandatory`), dentro una regione focalizzabile (`role="region"`, `tabindex="0"`, `aria-label="Slide di Beach Wrapped"`): le frecce la scorrono. Le slide sono un `<ol>` di testi veri (occhiello, numero, titolo), più Pallo decorativo. |
| Bloccata (JS, altezza ≥ 600, movimento permesso) | La sezione si **blocca**: lo scroll verticale fa scorrere le slide in orizzontale (`translateX` legato allo scroll). L'altezza della sezione la decide il CSS sotto `[data-viva]`, non un calcolo per fotogramma. |
| Durante il blocco | La capsula sceglie il materiale dalla slide che ha sotto (LC7): arancio e sabbia → chiaro, inchiostro → scuro. |
| Storia | Le tre impaginazioni (Tabellone, Foto, Polaroid) si aprono **a ventaglio** all'entrata in vista. Da ferme sono affiancate e leggibili. Ognuna ha la sua didascalia. |
| Ridotto o fermo | La riga manuale, e la Storia già aperta. |
| Guida | Fuori: parlano le slide. |
| Testo | «a ottobre» (`wrappedAOttobre`); PNG per slide e «Condividi» (§L12.7). |

### L6.8 Il diario resta tuo `#dati`

| Stato | Contenuto / comportamento |
|---|---|
| Base | Righe raggruppate come `List` dell'app: un `<ul>`, e per ogni riga un `<h3>` e un `<p>`. Nessuna riga è un link. Testi di §L12.8. |
| Guida | Dentro, `sbircia`: «I tuoi tornei li vedi tu. E chi ci ha giocato con te, se lo colleghi.» |

### L6.9 Finale `#comincia` e footer

| Stato | Contenuto / comportamento |
|---|---|
| Base | Pallo grande `cuori`, il titolo, una riga, «Crea il tuo diario», «Installa sul telefono» (se c'è) e «Ho già un account». |
| Hover o focus sul CTA | Pallo passa a `festa`. Con `@media (hover: hover)` per il puntatore, e con `:focus-visible` per la tastiera. Non con il tocco: lì il CTA porta via subito. |
| Desktop | La riga «È fatta per il telefono: apri bv-diary.vercel.app dal tuo.» |
| Installata | I pulsanti d'installazione non ci sono. |
| Footer | Marchio (pallone bianco con la fascia arancio sulla tessera d'inchiostro), una riga, «Apri il diario», «Ferma le animazioni», «Torna su». |

### L6.10 Pallo guida (lo stato globale)

| Stato | Quando | Che cosa |
|---|---|---|
| fuori | hero, `#registra`, `#live`, `#wrapped`, `#comincia`, footer; foglio aperto | traslato fuori dal bordo, `visibility: hidden`, `inert`. **Non esce** mentre ha il focus o il menu è aperto: aspetta il blur o la chiusura |
| entra | la sezione corrente lo vuole | MOLLA dal bordo; da ferma, dissolvenza |
| fermo nell'umore | dentro una sezione | l'umore della sezione; vita (`vivo`) e sguardo (`segui`) accesi solo in vista e col movimento permesso |
| parla | la sezione diventa corrente per la prima volta in questa sessione | la nuvoletta per `BOLLA_MS` = 4.000 ms (lo stesso tempo di `TOAST_MS`). Esc la chiude. Non blocca mai un tocco: `pointer-events: none` |
| reagisce | tocco, scroll veloce | FL7 |
| dorme | 10 s di inattività | FL7 |
| menu aperto | tocco | §L7.2 |

---

## L7. Contratti d'interazione

### L7.1 La barra

Requisiti, in aggiunta a §L4.1:
- La capsula è `<nav aria-label="Sezioni">`; dentro, quattro `<a>`. Il ＋ sta **fuori** dall'elenco delle tab ma dentro il `nav`, come nell'app.
- Bersagli di almeno 44×44 (`--touch`). Le etichette sono visibili, a 10,5px come nell'app (§7.1, Q16).
- Lo stato attivo è dato dalla **lente** (forma) più icona ed etichetta in arancio scuro (`--accent-text`, colore): mai il solo colore (1.4.1).
- Il materiale si sceglie per sezione, a soglia (LC7): l'attributo `data-sopra="chiaro|scuro"` sulla capsula cambia in SVELTO.
- L'ordine di tabulazione è quello del DOM: le 4 tab, poi il ＋.
- Sotto i 400px di altezza, con il telefono orizzontale, le etichette spariscono e le icone tengono il nome accessibile (§9.3).

### L7.2 Pallo guida

**Il pulsante**
- `<button type="button" class="guida" aria-expanded="false" aria-controls="guida-menu" aria-describedby="guida-bolla">`, con il nome accessibile «Pallo: dove vuoi andare?».
- Dentro c'è l'SVG di Pallo, `aria-hidden` (il markup generato, §L13).
- Il pulsante è grande almeno 56×56. Sotto i 900px sta in basso a destra, **sopra il ＋** (allineato al ＋, a 8px dal suo bordo alto); dai 900px in basso a destra, con la safe area.
- Nel DOM viene **subito dopo la barra**: chi naviga da tastiera lo raggiunge presto. Quando è «fuori» non è nel giro del Tab (`inert`).

**La nuvoletta**
- `<p id="guida-bolla" class="guida-bolla" aria-hidden="true">`. Il testo è HTML vero, non dentro l'SVG.
- È `aria-hidden`, ma il pulsante la usa come **descrizione**: `aria-describedby` legge anche i nodi nascosti. Chi arriva a Pallo con lo screen reader sente «Pallo: dove vuoi andare?, pulsante, compresso» e poi la battuta corrente. Una descrizione che cambia **non** viene annunciata da sola: è proprio quello che si vuole, perché niente parla durante lo scroll.
- Non è una live region. Le battute sono un di più: nessuna informazione sta solo lì.
- Posizione: sopra Pallo, allineata a destra, larga al massimo `min(280px, 100vw - 2 × gutter)`. Si legge a 15px.
- Fondo **opaco** (`--surface` col filo `--edge`): porta testo sopra qualunque sezione, anche scura, e non conta nel budget del vetro.
- Compare e sparisce in opacità, più un piccolo `translateY` moltiplicato per `--motion-scale`.

**Il menu «Dove vuoi andare?»: una disclosure, non un `role="menu"`**
- Che cos'è: `<div id="guida-menu" hidden>`, che contiene un `<nav aria-labelledby="guida-titolo">` col titolo visibile «Dove vuoi andare?».
- Perché non `role="menu"`: è soprattutto **navigazione** (link). Il pattern ARIA menu è per i comandi: toglie la modalità di lettura agli screen reader e vuole `role="menuitem"` sui link. La disclosure è il pattern della WAI per i menu di navigazione. Il menu ＋ dell'app resta `role="menu"`: lì le voci sono comandi.
- Contenuto, in quest'ordine:
  1. **«Vai a»**: un `<ul>` di link, con `aria-current="true"` sulla sezione corrente:
     - Il diario in tasca
     - Raccontalo a Pallo (`#registra`)
     - Partita live
     - I numeri e la mappa (`#numeri`)
     - Beach Wrapped
     - I tuoi dati
     - Torna su (`#inizio`)
  2. **Azioni**:
     - «Installa l'app» (solo se l'installazione è possibile, con le stesse regole dei pulsanti);
     - «Ferma le animazioni» (`aria-pressed`).
  3. **«Apri il diario»**: link a `/`, nello stile del CTA.
- **Apertura**: tocco, Invio o Spazio sul pulsante → `aria-expanded="true"`, focus **alla prima voce a `t0`** (MOTION §3.5). Se in quel momento Pallo sta parlando, la nuvoletta si chiude.
- **Chiusura**:
  - Esc → focus a Pallo;
  - tocco fuori, oppure il focus che esce dal menu e dal pulsante → il focus resta dove l'utente l'ha messo;
  - scelta di una voce;
  - un altro tocco su Pallo (a più di 0,7 s, FL7).
- **Tab** scorre le voci. Dopo l'ultima, il focus esce e il menu si chiude. Maiusc+Tab dalla prima torna a Pallo, e il menu resta aperto.
- **Frecce** (PUÒ): ↑/↓ fra le voci, come scorciatoia. Il Tab basta.
- **Forma**:
  - sotto i 600px: un pannello largo quanto lo schermo meno il margine, sopra la barra. È alto al massimo `100svh - safe-top - barra - 24px` e scorre dentro, con `overscroll-behavior: contain`;
  - dai 600px: un popover ancorato a Pallo, largo 320.
- **Materiale**: `glass-thick` (.92). Niente velo: la disclosure non è modale. Esce con `frost` a `t0` (MOTION §3.4).
- **Origine** del movimento: il centro di Pallo (MOTION §3.6).

**Umori e gesti**: la mappa di §L3.2, i gesti di FL7, l'API di `Pallo.tsx` (`reagisci`, `tocca`, `sorpresa`) e `Pallo.vita.ts` (sguardo, ammiccare, gesti: solo in vista, pagina visibile e movimento permesso).

**Passaggio dall'hero** (`⟂ M`): FLIP della **stessa** istanza, oppure di un clone, dalla posizione del Pallo dell'hero all'angolo, con `animate` e una molla. Si fa solo al primo passaggio in giù della sessione. Fermo: la guida compare in dissolvenza.

### L7.3 Indicatore di avanzamento

- Il pallone del marchio rotola su una riga di sabbia: `translateX` e `rotate` legati allo scroll.
- È **decorativo**: `aria-hidden`, `pointer-events: none`, opaco (niente vetro), alto al massimo 16px. La posizione nella pagina la dice già la barra.
- Dove: sotto i 900px, al bordo alto sotto la safe area; dai 900px, appena sotto la barra in alto. Il disegno è `⟂ A`; non copre mai un controllo.
- Con il movimento ridotto o fermo **non c'è**: un oggetto che si muove con lo scroll è movimento provocato dall'interazione (WCAG 2.3.3).

### L7.4 Hero

- I CTA sono `<a>` veri (link a `/` col parametro di Q-L2): «Crea il tuo diario» (arancio, etichetta d'inchiostro) e «Ho già un account» (vetro chiaro sul buio, come il Benvenuto).
- «Installa sul telefono» è un `<button hidden>`, nel posto riservato (§L6.1).
- Sotto i 600px i pulsanti sono a tutta larghezza e impilati, come nel Benvenuto. Dai 600px sono affiancati.
- **«Ferma le animazioni»**: `<button aria-pressed="false">` con l'icona pausa/play e il nome «Ferma le animazioni» (il nome non cambia: cambia `aria-pressed`). Sta nell'angolo in basso a sinistra della scena, almeno 44×44.
- La scena e Pallo sono `aria-hidden`. Il fondo e i testi sono `data-surface="dark"`: inchiostri e anello di focus invertiti (`materials.css`).

### L7.5 Telefono sticky

- La cornice è disegnata in CSS ed è `aria-hidden`. Le schermate sono `<img>` con `alt` (§L12.3), `width="390" height="844"` e `srcset` @2x (780×1688), `decoding="async"`. La prima si carica una schermata prima della sezione, le altre `loading="lazy"`.
- Il capitolo attivo è quello il cui testo contiene la linea del 50%. Il cambio di schermo è a soglia, mai per fotogramma.
- **Tastiera e screen reader**: i capitoli sono testo nel flusso. Nessun controllo per «sfogliare»: si scorre.
- Requisiti d'attivazione: altezza ≥ 640 e larghezza ≥ 360, movimento permesso. Altrimenti si resta sulla base (§L6.2).

### L7.6 Demo Partita live

- Struttura come l'app (`PartitaLive.tsx:700-760`):
  - in cima l'occhiello («Tra amici · set a 21») e il titolo del set (`h3`, `tabindex="-1"`);
  - poi il pannello **Loro**, Pallo con la battuta, il pannello **Noi**;
  - sotto, «Chiudi il set» quando serve e «Ricomincia».
- **Pannello** = `<button>` grande, il «+1»:
  - `aria-label="Punto per noi, ora {n}"` / `"Punto per {loro}, ora {n}"`;
  - `aria-keyshortcuts="ArrowDown"` / `"ArrowUp"`.
- **«−1»** = `<button>` nell'angolo del pannello, almeno 44×44, con `aria-label="Togli un punto a noi"` e `aria-keyshortcuts="Shift+ArrowDown"`. È a più di 8px dal bordo del «+1» (§8.6).
- **Scorciatoie**: ↑, ↓, Maiusc+↑ e Maiusc+↓, **solo con il focus dentro la demo** (`keydown` sul contenitore, `preventDefault` solo per quei tasti). Una riga visibile le dice: «Da tastiera: ↑ loro, ↓ noi, con Maiusc togli.»
- **Regole**: quelle vere, importate da `src/screens/PartitaLive.regole.ts` (`obiettivo`, `setFinito`, `cambioOgni`, `daVincere`, `vinti`, `partitaChiusa`, `battuta`). La demo usa sempre il formato beach: 3 set, a 21, il terzo a 15.
- **Differenze dichiarate dall'app**: la demo non chiude un set non finito (niente ConfirmDialog), non ha timeout, non salva, non tiene lo schermo acceso e non sopravvive al refresh. Il testo accanto dice che **l'app** fa queste cose (§L12.6).
- **Annunci**: un `<p role="status" aria-live="polite" class="sr-only">` dentro la demo, scritto solo dai punti dell'utente («14 a 12. Cambio campo!»). L'autoplay non ci scrive.
- **Pallo** e la sua nuvoletta sono `aria-hidden`, come nell'app: ciò che conta lo dice lo status.
- **−1** senza vetro: niente `backdrop-filter` (§L10).

### L7.7 Numeri

- Le tre card sono `<article>` (o `<div>` con titolo). Le etichette sono quelle della Home: «Partite vinte», «punti di scarto», «Tornei vinti», «Serie record», «vittorie di fila».
- Le cifre usano `Odometro` (`src/components/ui/Odometro.ts`) con le classi di `Tabellone.css`, una salita per sessione (§L6.5).
- Andamento (PUÒ): la linea disegnata una volta (E2, `data-motion-exception="grafico"`), con il riassunto in testo («Partite vinte: dal {x}% di maggio al {y}% di agosto»).

### L7.8 Mappa

- SVG `role="img"` con `aria-labelledby` sulla didascalia. L'elenco delle città è un `<ul>` subito sotto (o accanto dai 900px), col piazzamento in testo («Rimini · vinta»).
- Nessun pin è interattivo: la mappa vera sta nell'app.

### L7.9 Il ＋ in sezione e la chat

- Le voci: `role="tablist"` con `aria-orientation="vertical"`. Ogni voce è `role="tab"`, con icona, nome e sottotitolo dell'app, `aria-controls` e `aria-selected`. Una voce sola sta nel giro del Tab (roving tabindex). ↑/↓, Home e Fine, attivazione automatica.
- Il pannello: `role="tabpanel"`, `aria-labelledby` sulla voce.
- La chat:
  - `<ol role="log" aria-label="Conversazione con Pallo">`. Il log ha `aria-live="polite"` implicito, e va bene: i messaggi arrivano per un tocco dell'utente.
  - Bolle di Pallo a sinistra con l'avatar `testa` (`aria-hidden`), bolle dell'utente a destra.
  - Le risposte stanno in `<div role="group" aria-label="Le tue risposte" tabindex="-1">`: ogni risposta è un `<button>` di almeno 44px. Durante la pausa il gruppo ha `aria-busy="true"`.
- Il copione viene da `src/screens/crea/copione.ts` (`INTRO`, `RIPARTENZA`, `domanda`, `battitura`, `righeRiepilogo`), che non dipende da un framework. Un sottoinsieme di passi con risposte rapide decise dalla landing (§L12.5) e un `Contesto` finto (compagni e luoghi del dataset). Così il testo non diverge dall'app. `⟂ C`

### L7.10 Wrapped e la Storia

- Le slide: `<ol aria-label="Slide di Beach Wrapped">`, una `<li>` per slide con occhiello, numero e titolo **in testo**, e Pallo `aria-hidden`.
  - I colori sono quelli delle slide dell'app: arancio con testo d'inchiostro, inchiostro con testo bianco, sabbia con testo d'inchiostro.
  - Mai bianco su arancio.
- Nella versione bloccata nessuna slide ha controlli. Il blocco non intrappola: Pagina giù, lo spazio e lo scroll escono dalla sezione normalmente.
- La Storia: `<figure>` con tre `<img>` («Storia, layout Tabellone»…) e la `<figcaption>`.

### L7.11 «Il diario resta tuo»

Un `<ul>` di righe come `ListGroup`: titolo e testo. Nessuna riga sembra cliccabile: niente chevron.

### L7.12 Foglio d'installazione

- `<div role="dialog" aria-modal="true" aria-labelledby="installa-titolo" aria-describedby="installa-testo" hidden>`, montato **fuori da `main`**.
- Quando si apre:
  - il resto della pagina (barra, guida, `main`, footer) prende `inert`;
  - lo scroll si blocca;
  - il velo è `--scrim`, senza sfocatura.
- **Focus al titolo** (`h2 tabindex="-1"`) a `t0`, come negli sheet senza campi (§7.5.2, MOTION §3.5). Tab e Maiusc+Tab restano dentro il foglio.
- **Chiusura**: Esc, ×, «Ho capito», tocco sul velo. Il focus **torna** al pulsante che l'ha aperto. Se quello era una voce del menu di Pallo, ormai chiuso, il focus va a Pallo.
- **Materiale** `glass-thick`. Sotto i 600px è ancorato in basso, dai 600px è un form sheet centrato (§9.1).
- **Pallo** `sbircia` dal bordo del foglio (`aria-hidden`) e indica **in giù**, verso la barra di Safari (LC12). La guida, sotto il velo, è `inert` e senza nuvoletta.
- **Varianti dei passi** (`data-passi`): `ios26`, `ios`, `ios-altro`, `altro` (§L12.10). Nelle varianti iOS c'è anche la riga «Se l'hai già aggiunta, la trovi tra le tue app.»: iOS non dice alla pagina se è installata.
- **La logica di `setupInstall()`** passa così com'è, compreso il commento su iPadOS («MacIntel» con il touch):
  - `beforeinstallprompt` con `preventDefault`;
  - `appinstalled`;
  - `display-mode: standalone` e `navigator.standalone`;
  - il prompt consumato che nasconde i pulsanti;
  - il ripiego sul foglio se `prompt()` fallisce.

  Resta anche la registrazione di `/sw.js` al `load`, con `scope: '/'` (UX §4.7: senza di lei, chi non passa dalla landing non ha la pagina offline).
- Dopo `appinstalled`: uno status (`role="status"`) «Fatto: Beach Diary è tra le tue app.». Se è in scena, la guida passa a `festa`.

### L7.13 «Ferma le animazioni»

- Tre istanze dello stesso comando: hero, menu di Pallo, footer. Sono `<button aria-pressed>` col nome fisso «Ferma le animazioni», e cambiano tutti insieme.
- Lo stato vive su `<html data-movimento="fermo">`. **Una sola funzione** `movimentoFermo()` = `matchMedia('(prefers-reduced-motion: reduce)').matches || data-movimento === 'fermo'`. La usano tutti i moduli: è la sola fonte, come `useReducedMotion()` nell'app (MOTION §11.1).
- **Il CSS** la legge con `:root[data-movimento="fermo"]`, oltre alla media query. `--motion-scale: 0` e `--press-scale: 1` valgono anche lì (`⟂ M`).
- **Con il movimento già ridotto dal sistema**: `aria-disabled="true"` e, accanto, «Animazioni già ridotte dalle impostazioni del telefono.».

---

## L8. Accessibilità

### L8.1 Percorsi da tastiera (ordine del Tab)

1. **«Salta al contenuto»** (visibile al focus) → `#contenuto`.
2. Barra: Diario · Live · Numeri · Wrapped · ＋ «Apri il diario».
3. Pallo guida, se è in scena.
4. Hero: «Crea il tuo diario» · «Ho già un account» · «Installa sul telefono» (se c'è) · «Ferma le animazioni».
5. `#diario`: nessuna fermata.
6. `#registra`: la tablist (una fermata, poi le frecce) → nel pannello della chat, le risposte o «Ricomincia»; nel pannello della Partita live, il link «Provala qui sotto».
7. `#live`: Loro +1 · Loro −1 · Noi +1 · Noi −1 · «Chiudi il set» (quando c'è) · «Ricomincia».
8. `#numeri`, `#mappa`: nessuna fermata.
9. `#wrapped`: la regione delle slide, solo nella riga manuale.
10. `#dati`: nessuna fermata.
11. `#comincia`: «Crea il tuo diario» · «Installa sul telefono» · «Ho già un account».
12. Footer: «Apri il diario» · «Ferma le animazioni» · «Torna su».

Con il menu di Pallo aperto: le sue voci, fra Pallo e l'hero. Con il foglio aperto: solo il foglio.

### L8.2 Regole del focus

- L'anello è quello globale di `base.css` (`:focus-visible`). Sui fondi scuri, `data-surface="dark"` lo fa bianco. Sui pulsanti arancio l'anello deve fare ≥ 3:1 sia col pulsante sia col fondo (`⟂ A`).
- Il focus si sposta a `t0`, mai a fine animazione (MOTION §3.5):
  - all'`h2` nei salti;
  - alla prima voce del menu;
  - al titolo del foglio;
  - al gruppo delle risposte nella chat;
  - al titolo del riepilogo a fine partita.
- **Mai su un elemento nascosto o `inert`.** La guida non esce col focus addosso (§L6.10). I pannelli della demo diventano `inert` solo dopo che il focus è passato al riepilogo.
- **Mai sotto le barre** (`scroll-padding`, §L4.3). `docs/qa/landing.mjs` lo verifica con la logica di `tab.mjs` («covered»).

### L8.3 Ruoli e attributi

| Elemento | Ruolo e attributi |
|---|---|
| Barra | `<nav aria-label="Sezioni">`, `<a>` con `aria-current="true"` sulla sezione corrente; ＋ `<a aria-label="Apri il diario">` sotto i 600px |
| Pallo guida | `<button aria-expanded aria-controls="guida-menu" aria-describedby="guida-bolla">`, nome «Pallo: dove vuoi andare?» |
| Nuvoletta | `<p id="guida-bolla" aria-hidden="true">` |
| Menu della guida | `<div id="guida-menu" hidden>` > `<nav aria-labelledby="guida-titolo">`, link con `aria-current="true"`, «Ferma le animazioni» con `aria-pressed` |
| Indicatore, scena, Pallo decorativi, cornice del telefono | `aria-hidden="true"` |
| Sezioni | `<section aria-labelledby="{id}-titolo">`, `h2` con `tabindex="-1"` |
| Schermate | `<img alt="…" width height>` |
| Tablist del ＋ | `role="tablist" aria-orientation="vertical"`, `role="tab" aria-selected aria-controls`, `role="tabpanel" aria-labelledby` |
| Chat | `<ol role="log" aria-label="Conversazione con Pallo">`; risposte `role="group" aria-label="Le tue risposte" tabindex="-1"`, `aria-busy` durante la pausa |
| Demo live | `<section>`; pannelli `<button aria-label aria-keyshortcuts>`; −1 `aria-disabled` a zero; `role="status"` per il punteggio; tabellone fermo senza JS `role="img"` |
| Mappa | `<svg role="img" aria-labelledby>`, più un `<ul>` delle città |
| Wrapped (riga manuale) | `role="region" tabindex="0" aria-label="Slide di Beach Wrapped"`, `<ol>` |
| Foglio | `role="dialog" aria-modal="true" aria-labelledby aria-describedby`; il resto della pagina `inert` |
| «Ferma le animazioni» | `<button aria-pressed>`; `aria-disabled` con la spiegazione se il sistema ha già ridotto il movimento |

### L8.4 Annunci (tutti e soli)

| Evento | Come |
|---|---|
| Salto a una sezione | focus all'`h2` (lo screen reader legge il titolo) |
| Punto nella demo (dell'utente) | `role="status"`: «{noi} a {loro}», più la notizia |
| Messaggio di Pallo nella chat | `role="log"` |
| App installata | `role="status"`: «Fatto: Beach Diary è tra le tue app.» |
| Battute della guida, cambio di sezione, autoplay, numeri che salgono, pin che cadono, sonno di Pallo | **niente**. È la regola del piano: lo screen reader non riceve messaggi durante lo scroll |

### L8.5 Contrasto: obiettivi

Soglie di §8.5: testo ≥ 4,5; testo grande ≥ 3; componenti, icone che portano significato e anello di focus ≥ 3. Le coppie della landing che vanno calcolate e fissate (`⟂ A`, in un test sulla stessa logica di `tokens.test.ts`):

| Coppia | Caso peggiore da usare |
|---|---|
| Testo e CTA dell'hero sulla scena | il pixel **più chiaro** della scena sotto ciascun riquadro di testo (il sole, il riflesso). Se non regge, un velo come `.accesso-velo` del Login |
| Etichette della capsula, variante chiara | `#8C8C8C` (la regola dell'app) e il fondo chiaro più scuro delle sezioni chiare |
| Etichette della capsula, variante scura | `#FFFFFF` sotto il vetro scuro (una slide sabbia o una schermata chiara che passa) e `--accent` (slide arancio) |
| Tab accesa | `--accent-text` su vetro chiaro, e la sua controparte sul vetro scuro |
| Testo sulle slide | inchiostro su `--accent` (`--on-accent` 5,97 ✓), bianco su inchiostro, inchiostro su sabbia. **Mai bianco su arancio** (2,85 ✗) |
| Pin della mappa | doppio bordo su fondo carta e su fondo mare (`contrast.test.ts`) |
| Nuvoletta | inchiostro su `--surface` (opaca) ✓ |
| Anello di focus | su `--surface-brand`, su `--accent`, su vetro chiaro e su vetro scuro |
| Testo secondario | `--ink-2` sul fondo di ogni sezione |

Verifica in browser: `docs/qa/landing.mjs` con axe, `FLAT=1` per risolvere i gradienti (POLISH.md). **0 violazioni.**

### L8.6 Bersagli

- Tutti ≥ 44×44 (`--touch`). Pallo guida ≥ 56. Ogni −1 ≥ 44, e a più di 8px dal suo «+1».
- Le risposte rapide della chat ≥ 44 di altezza, con almeno 8px fra l'una e l'altra.
- I link nel testo corrente sono esenti (WCAG 2.5.8), ma i link dentro le righe sono a tutta riga.
- Verifica con la logica di `docs/qa/targets.mjs`, dentro `landing.mjs`.

### L8.7 Movimento, tempo, lampeggi

- **2.2.2 Pausa, ferma, nascondi.** Partono da sé e durano più di 5 s: il palleggio dell'hero, il movimento CSS della scena, la vita di Pallo, il sonno con le «z». → «Ferma le animazioni» (§L7.13), raggiungibile entro le prime 8 fermate di Tab, più `prefers-reduced-motion`. L'autoplay della demo dura meno di 10 s, si ferma al primo tocco e non riparte.
- **2.3.3 Animazioni da interazione** (AAA, la si vuole lo stesso): parallasse, avanzamento, Wrapped bloccato e telefono sticky si spengono con il movimento ridotto o fermo.
- **2.3.1**: niente lampeggi. I coriandoli di `festa` non superano 3 lampi al secondo (sono traslazioni, non lampi).
- **Mai bloccare l'input**: niente che diventa interattivo «a fine animazione» (MOTION R3).

### L8.8 Testo, zoom, lingua

- `lang="it"`. Il viewport **non** blocca lo zoom (`width=device-width, initial-scale=1, viewport-fit=cover`, senza `maximum-scale`).
- `rem` dappertutto. A **320 CSS px** (zoom 400% su 1280) nessuno scroll orizzontale: blocchi e sticky si spengono da soli, per le condizioni d'altezza (§L9.2).
- Il testo di lettura è ≥ 15px; il minimo assoluto è 11px, solo per le etichette.
- Al 200% di zoom del testo (Safari, «Testo più grande») niente si taglia senza «…»: lo controlla lo sweep (SPILL/CLIP).

### L8.9 Screen reader: l'esperienza attesa

Con VoiceOver su iPhone, scorrendo da sinistra a destra:
1. skip link;
2. «Sezioni, navigazione», le 4 tab e «Apri il diario»;
3. «Pallo: dove vuoi andare?», con la battuta come descrizione;
4. il titolo dell'hero, la frase e i pulsanti;
5. poi ogni sezione col suo titolo, il testo e le immagini con l'`alt`.

Le illustrazioni non si leggono, i numeri si leggono una volta col valore finale, e la demo e la chat parlano solo quando le si usa.

---

## L9. Comportamento responsive

### L9.1 Breakpoint (gli stessi dell'app, `BP` in `theme.ts`)

| Nome | Larghezza | Barra | Pallo guida | Menu della guida | Foglio |
|---|---|---|---|---|---|
| **xs** | < 360 | in basso; `--tabbar-side` ridotto (come l'app, `tokens.css:465`); ＋ solo icona | 56, sopra il ＋ | pannello a tutta larghezza | ancorato in basso |
| **sm** | 360–599 | in basso (riferimento 390×844) | 64, sopra il ＋ | pannello a tutta larghezza | ancorato in basso |
| **md** | 600–899 | in basso, capsula al massimo `--tabbar-max` e centrata; ＋ con etichetta | 64, in basso a destra | popover 320 | form sheet centrato |
| **lg** | ≥ 900 | **in alto**: marchio, capsula, ＋ con etichetta | 64, in basso a destra | popover 320 sopra Pallo | form sheet centrato |
| **xl** | ≥ 1280 | in alto, contenuto al massimo `--content-max` | idem | idem | idem |

### L9.2 Condizioni d'altezza (valgono a qualunque larghezza)

| Effetto | Acceso solo se | Altrimenti |
|---|---|---|
| Telefono sticky (`#diario`) | altezza ≥ 640, larghezza ≥ 360 | capitoli con le immagini in linea |
| Wrapped bloccato | altezza ≥ 600 | riga manuale |
| Hero a tutta altezza | altezza ≥ 560 | hero alto quanto il contenuto |
| Etichette della barra | altezza ≥ 400 | solo icone (nome accessibile) |

Con il movimento ridotto o fermo, telefono sticky e Wrapped bloccato sono spenti a qualunque misura.

### L9.3 Per sezione

| Sezione | < 600 | 600–899 | ≥ 900 |
|---|---|---|---|
| Hero | una colonna; CTA a tutta larghezza impilati; Pallo sotto il testo o di lato | CTA affiancati | testo a sinistra, Pallo e scena a destra; la scena prende il panorama (`slice` a 1350, come il Login) |
| Il diario in tasca | telefono sticky in alto (≤ 56svh), capitoli sotto | idem, telefono più grande | testo a sinistra, telefono sticky a destra |
| Cosa registriamo? | voci impilate, pannello sotto | idem | voci a sinistra (larghe come il menu dell'app), pannello a destra |
| Partita live | demo a tutta larghezza (max 420), fatti sotto | idem, centrata | fatti a sinistra, demo a destra |
| Numeri | card come la Home (Partite vinte, poi la coppia) | idem | card a destra, testo a sinistra |
| Mappa | illustrazione, poi l'elenco | idem | illustrazione ed elenco affiancati |
| Wrapped | slide alte quanto il viewport (meno la barra) | idem | slide a 9:16 centrate; la Storia a ventaglio accanto |
| Dati | righe a tutta larghezza (inset 16) | colonna 720 | due colonne di righe (PUÒ), oppure 720 |
| Finale | una colonna | idem | idem, centrato |

### L9.4 Aree sicure, Safari, orientamento

- `viewport-fit=cover`. L'hero scuro arriva sotto la barra di stato; il suo contenuto parte da `--safe-top` + `--page-top`.
- **Safari su iOS 26** ha la sua barra flottante in basso. Gli elementi `fixed` stanno sopra di lei e scendono quando lei si compatta scorrendo. La barra e Pallo usano `--tabbar-bottom` (con la safe area) e si provano su un iPhone vero (`⟂ QA`), perché la pila in basso (barra di Safari, capsula, Pallo) è il punto più affollato della pagina.
- **Orizzontale su telefono**: l'hero non è a tutta altezza, blocchi e sticky sono spenti dalle condizioni d'altezza, la barra perde le etichette sotto i 400 di altezza.
- **Hover** solo dentro `@media (hover: hover)`: Pallo `festa` sul CTA del finale, gli stati dei pulsanti. Con la tastiera, lo stesso effetto su `:focus-visible`.

---

## L10. Vetro: mappa d'uso e budget

**Regola** (§10, MOTION R5): al massimo **3** superfici con `backdrop-filter` visibili **a ogni fotogramma**, passaggi compresi. Sulla landing l'obiettivo è **≤ 2 nel caso tipico**. Il vetro si usa solo dove sotto scorre qualcosa (ART_DIRECTION §9.1).

| Superficie | Materiale | Quando | Conta |
|---|---|---|---|
| Capsula della barra | `glass-regular`, oppure la variante scura scelta per sezione (LC7) | sempre | **1** |
| Lente nella capsula | tinta, filo e ombra, **senza** `backdrop-filter` (LC8) | sempre | 0 |
| ＋ | arancio opaco | sempre | 0 |
| Pallo guida | nessun vetro | — | 0 |
| Nuvoletta | opaca (`--surface`) | — | 0 |
| «Ferma le animazioni» nell'hero | `glass-clear` (`⟂ A`), oppure opaco | nell'hero | +1 = **2** |
| Menu della guida | `glass-thick` | aperto (mai nell'hero: lì la guida è fuori) | +1 = **2** |
| Foglio d'installazione | `glass-thick`; velo senza blur | aperto. Se si apre dal menu, il menu passa a `frost` a `t0` (MOTION §3.4) e non conta | barra + foglio = **2** |
| «Ho già un account» nell'hero | `glass-clear` (come il Benvenuto) | nell'hero | +1 → con la pausa, **3**. `⟂ A`: o uno dei due diventa opaco, o si accetta 3 come caso peggiore (contato) |
| −1 della demo | `frost` o opaco: sotto c'è il colore piatto del pannello | — | 0 |
| Cornice del telefono, schermate, slide, Storia, card | opache | — | 0 |

Il conteggio lo fa `docs/qa/landing.mjs` con la stessa logica di `?audit` in `docs/motion/_lab.js`: elementi visibili con `backdrop-filter` diverso da `none`. Lo fa a ogni fermata di scroll, con il menu aperto, con il foglio aperto e durante il passaggio menu → foglio.

---

## L11. Movimento: i confini che la landing deve rispettare

Questa sezione è l'**ingresso** per il paragrafo «Landing (`/presentazione`)» di MOTION.md (`⟂ M`). Fissa che cosa è permesso e che cosa resta vietato. Curve, tempi e coreografie le scrive MOTION.md.

### L11.1 Permessi solo sulla landing

| # | Effetto | Tipo | Dove |
|---|---|---|---|
| LM1 | Parallasse dei piani della scena e sole che scende | scroll legato, `translateY` | uscita dall'hero |
| LM2 | Pallo che salta nell'angolo | soglia, FLIP con molla | fine dell'hero |
| LM3 | Schermo del telefono che cambia | soglia, opacità | `#diario` |
| LM4 | Il ＋ che si apre nel menu | soglia, una volta | `#registra` |
| LM5 | Pin che cadono uno alla volta | soglia, sfalsamento narrativo | `#mappa` |
| LM6 | Nuvolette della chat in sequenza | causa = tocco dell'utente, pausa `battitura(n)` | `#registra` |
| LM7 | Numeri che salgono, barra che cresce | soglia, una volta per sessione | `#numeri` |
| LM8 | Slide che scorrono in orizzontale | scroll legato, `translateX` | `#wrapped` |
| LM9 | Storia a ventaglio | soglia, una volta | `#wrapped` |
| LM10 | Pallone che rotola (avanzamento) | scroll legato, `translateX` + `rotate` | sempre |
| LM11 | Lente della barra, materiale della capsula | soglia | sempre |

### L11.2 Restano vietati (le regole dell'app valgono anche qui)

- Animare altro che `transform` e `opacity` (più `visibility`). Le uniche eccezioni sono quelle già dichiarate: E2 per la linea di Andamento, se c'è. Niente `height`, `width`, `top`, `filter`, raggi, ombre o colori animati.
- Animare la sfocatura, o tenere vetro trasparente visibile (MOTION §3.4.2).
- `scroll-behavior: smooth` globale.
- Focus spostato a fine animazione; input bloccato durante un'animazione.
- `transition: all`; `will-change` scritto fisso nel CSS.
- Lo **sfalsamento** fuori da LM5, LM6 e LM9. Dove è permesso: al massimo 8 elementi, al massimo ~600 ms in tutto, e una sola volta per sessione.
- Lavoro fuori vista: ogni rAF (palleggio, sguardo di Pallo, scroll legato) si **sospende** quando la sua sezione esce di vista o la scheda è nascosta.
- Leggere il layout a ogni fotogramma durante lo scroll: misure precalcolate e ricalcolate solo al resize, oppure le timeline native di `scroll()` di Motion.

### L11.3 La versione ferma

Con `prefers-reduced-motion: reduce` **oppure** `data-movimento="fermo"`:

| Elemento | Normale | Fermo |
|---|---|---|
| Scena dell'hero | palleggio, palma, nuvole, gabbiani, barca, schiuma, sole | fotogramma `FERMO` |
| Pallo (ovunque) | vita, sguardo, salti, coriandoli, sonno con le «z» | il disegno dell'umore, fermo. Gli umori cambiano lo stesso, senza movimento |
| Parallasse, sole, avanzamento | sì | no (l'avanzamento non c'è) |
| Pallo nell'angolo | FLIP | dissolvenza |
| Telefono sticky | sì | capitoli in linea |
| ＋ che si apre | MOLLA | già aperto |
| Pin | cadono | già posati |
| Chat | pausa `battitura(n)` e puntini | pausa 0, niente puntini |
| Numeri, barra | salgono | valori finali |
| Demo live | autoplay; pop | niente autoplay; cambio istantaneo |
| Wrapped | bloccato | riga manuale |
| Storia | ventaglio | aperta |
| Barra: lente, materiale | MOLLA, SVELTO | salto (`transition: none`), cambio istantaneo |
| Nuvoletta, menu, foglio | opacità + spostamento × `--motion-scale` | opacità |

---

## L12. Contenuti e microcopy

Il tono è quello dell'app: italiano, «tu», frasi corte, niente punti esclamativi fuori dalle battute di Pallo. Ogni testo che parla di una funzione ha la sua fonte nel codice. Dove c'è `{…}`, il valore viene dal dataset (Q-L3).

### L12.1 Meta (`⟂ I`)

| Campo | Valore |
|---|---|
| `<title>` | «Beach Diary · Ogni partita, nel tuo diario» |
| `description` | «Il diario dei tuoi tornei di beach volley: partite, set, compagni e statistiche. Segni i punti in torneo o tra amici, e a ottobre arriva Beach Wrapped.» |
| `theme-color` | `#120E14` (aggiornato a soglia, LC13) |
| viewport | `width=device-width, initial-scale=1, viewport-fit=cover` |
| canonical, `og:url` | `https://bv-diary.vercel.app/presentazione/` |
| `og:title` / `og:site_name` | «Beach Diary» |
| `og:description` | «Ogni partita, nel tuo diario. Tornei, set e compagni: tutta la tua stagione in spiaggia.» |
| `og:image` | `https://bv-diary.vercel.app/presentazione/og.png`, 1200×630, con Pallo e il titolo; `og:image:alt` «Pallo, la mascotte di Beach Diary, saluta accanto alla scritta "Ogni partita, nel tuo diario."» |
| `twitter:card` | `summary_large_image` |
| favicon | il data-URI di `index.html` (il marchio nella tessera d'inchiostro) |
| `apple-mobile-web-app-title` | «Beach Diary» |

### L12.2 Hero

- `h1`: **«Ogni partita, nel tuo diario.»** (il primo messaggio del Benvenuto, `Login.tsx:68`)
- Frase: «Tornei, set e compagni: tutta la tua stagione in spiaggia, in un posto solo.»
- Riga piccola: «Si usa dal browser e si installa sul telefono. Gratis.» («Gratis» è vero finché `PLANS_ENABLED = false`, `src/lib/limits.ts:14`. Se i piani si accendono, la riga va rivista: `⟂ QA` la mette nella checklist.)
- CTA: «Crea il tuo diario» · «Ho già un account» · «Installa sul telefono»
- Comando: «Ferma le animazioni»

### L12.3 Il diario in tasca

- `h2`: «Il diario in tasca»
- Capitolo 1, `h3` «La Home ti dice come va»: «Una frase sola, dai tuoi numeri: «Stai vincendo più di prima.». Sotto, le partite vinte, i punti di scarto e un consiglio di Pallo.» (`fraseHome`)
  - `alt`: «La Home: "{frase}", {pct}% di partite vinte, {diff} punti di scarto e il consiglio di Pallo.»
- Capitolo 2, `h3` «Tornei e mappa delle conquiste»: «Ogni torneo col suo luogo, il formato e il piazzamento. La mappa segna le città dove hai giocato: vinta, podio o giocata.»
  - `alt`: «La mappa delle conquiste con i pin di {n} città della costa.»
- Capitolo 3, `h3` «Il diario, mese per mese»: «Tornei, partite e foto in fila. La ricerca trova un torneo dal nome, dalla città, da un avversario o da una nota.»
  - `alt`: «Il Diario con i tornei di {mese}, le foto e il campo di ricerca.»
- Capitolo 4, `h3` «Compagni, e chi c'è oggi»: «Con chi vinci di più, partita per partita. E da Compagni vedi chi è in spiaggia oggi nella tua città, e chi cerca un compagno.» (LC14)
  - `alt`: «Compagni: le card dei compagni con le partite vinte insieme, e la card "Chi c'è in spiaggia oggi?".»

### L12.4 Battute della guida (una volta per sezione o capitolo, per sessione)

| Dove | Umore | Battuta |
|---|---|---|
| prima volta dopo l'hero (`#diario`, cap. 1) | `occhiolino` | «Quando vuoi, il ＋ arancio apre il diario.» |
| cap. 2 Tornei | `pensa` | «Il luogo lo scegli una volta: poi lo ritrovi a ogni torneo.» |
| cap. 3 Diario | `contento` | «{Hai vinto «nome» / Secondo posto a «nome»}: lo racconti in una storia?» (modello di `deriveConsigli`) |
| cap. 4 Compagni | `cuori` | «Con {compagno} avete vinto {n} partite. Si vede che vi intendete.» (`⟂ C`: dal dataset; se non c'è, «Trova con chi giochi meglio.», dal Benvenuto) |
| `#numeri` | `cool` | «{n} vittorie di fila: è il tuo record. Non fermarti adesso!» (`deriveConsigli`) |
| `#mappa` | `pensa` | «Il tuo posto magico? {città}: {1° in n tornei / n volte sul podio}.» (`deriveConsigli`) |
| `#dati` | `sbircia` | «I tuoi tornei li vedi tu. E chi ci ha giocato con te, se lo colleghi.» |
| sveglia | `sorpreso` | (nessuna battuta) |
| app installata | `festa` | «Fatto: mi trovi tra le tue app.» |

La guida **non ripete** il consiglio che la schermata del capitolo mostra già: chi prepara le schermate (`⟂ I`) dice quale consiglio c'è nella Home, e `⟂ C` sceglie una battuta diversa.

### L12.5 Cosa registriamo? e la chat

- `h2`: «Cosa registriamo?» · sottotitolo «Scegli tu, al resto penso io.»
- Le voci (`ModalHost.tsx:119-162`):
  - «Partita live»: «Segna i punti, in torneo o tra amici»
  - «Torneo»: «Luogo, formato, compagno, piazzamento»
  - «Torneo rapido»: «Nome e piazzamento, i dettagli dopo»
  - «Raccontalo a Pallo»: «Ti faccio io le domande, una alla volta»
- Riga: «Con un torneo in corso c'è anche «Partita»: un risultato in più, dritto nel torneo.»
- Chat, i passi della demo (le domande sono quelle di `domanda()`; le risposte rapide le sceglie la landing):

| Passo | Pallo | Risposte rapide |
|---|---|---|
| inizio | `INTRO`: «Ciao! Sono Pallo. Ti faccio qualche domanda e il torneo lo compilo io.» · «Come si chiama il torneo?» | «{torneo A}» · «{torneo B}» |
| `partner` | «Perfetto, «{nome}». Con chi hai giocato?» | «{compagno 1}» · «{compagno 2}» |
| `date` | «Quando si è svolto?» | «Oggi» · «Ieri» |
| `status` | «Il torneo è già finito o è ancora in corso?» | «Finito» · «In corso» |
| `placement` (se finito) | «Ottimo. Che piazzamento hai ottenuto?» | «1°» · «2°» · «3°» |
| `recap` | «Ecco il riepilogo. Confermo la creazione?» + la card | «Conferma» |
| fine (solo landing) | «Fatto. Nell'app adesso sarebbe nel tuo diario.» | «Ricomincia» |

- Sotto la chat: «Nell'app, Pallo segue un copione scritto a mano, una domanda alla volta: nessuna intelligenza artificiale. Niente esce dal telefono finché non salvi.» (`copione.ts:5-8`; l'unica chiamata di rete è il salvataggio finale)

### L12.6 Partita live

- `h2`: «Partita live» · sottotitolo «Il segnapunti da bordo campo, in torneo o tra amici.» (`PartitaLive.tsx:1065`)
- Sopra la demo: «Provala qui: tocca la squadra che fa punto.» · «Da tastiera: ↑ loro, ↓ noi, con Maiusc togli.»
- I nomi dei pannelli: «Noi» e «Loro» (come tra amici, senza nomi)
- Le battute: quelle di `battuta()`, senza cambiarle
- Riepilogo: «Partita vostra, {2–1}» / «Partita loro, {1–2}» · «Ricomincia»
- I fatti, ognuno con la sua fonte:
  - «Set a 21, il terzo a 15, sempre due punti di scarto. Cambio campo ogni 7 punti, ogni 5 nei set a 15.» (`PartitaLive.tsx:136-145`)
  - «In torneo, a fine partita la salvi nel torneo. Tra amici, le ultime 20 restano sul telefono.» (`PartitaLive.storico.ts`)
  - «Lo schermo resta acceso mentre giochi.» (Wake Lock, `:275-299`)
  - «Se ricarichi la pagina, la partita è ancora lì.» (`sessionStorage`, `:33-37`)
  - «Una vibrazione leggera a ogni punto, sui telefoni che la sanno fare.» (`navigator.vibrate`; l'iPhone no, e il testo non dice il contrario)

### L12.7 Numeri, mappa, Wrapped

- Numeri, `h2`: «I numeri li fa l'app» · «Tu giochi. Partite vinte, punti di scarto, tornei vinti e serie record si aggiornano a ogni risultato.» · «In Statistiche c'è il resto: l'andamento mese per mese, la resa per fase e per compagno, i piazzamenti.» (`src/components/dashboard/*`)
- Mappa, `h2`: «La mappa delle conquiste» · «Ogni città dove hai giocato diventa un pin, e il pin dice com'è andata: vinta, podio o giocata.» · didascalia «Illustrazione. Nell'app la mappa è vera, con OpenStreetMap.»
- Wrapped, `h2`: «Beach Wrapped» · «A ottobre la tua stagione diventa una storia: vittorie, serie, il compagno migliore, il rivale.» · «Le slide si scaricano in PNG, o si condividono dal telefono.» (`WrappedModal.tsx`)
  - Slide d'esempio, con gli occhielli veri: «Vittorie totali», «Striscia vincente», «Miglior compagno»
- Storia, `h3`: «E ogni torneo, una Storia» · «Tre impaginazioni (Tabellone, Foto, Polaroid) in inchiostro, sabbia o arancio, pronte per Instagram.» (`StoryModal.tsx:59-64`)

### L12.8 Il diario resta tuo (solo fatti verificati)

`h2`: «Il diario resta tuo»

| Riga (`h3`) | Testo | Fonte |
|---|---|---|
| I permessi stanno nel database | «Ogni tabella ha le sue regole d'accesso nel database (Row Level Security), non solo nell'app: gli altri utenti non leggono i tuoi tornei.» | RLS su tutte e 9 le tabelle; `anon` senza privilegi (`security_hardening.sql:190-193`) |
| Le foto dei tornei sono private | «Stanno in uno spazio privato e si aprono con link firmati che scadono dopo 8 ore.» | bucket `tournament-photos` `public = false`; `SIGNED_URL_TTL` = 28.800 s (`useDiary.ts:117`) |
| Condividi solo se colleghi | «Se colleghi un compagno al suo account, lui vede in sola lettura i tornei giocati con te: partite, punteggi e note, non le foto. Puoi scollegarlo quando vuoi.» | `partner_user_link_sharing.sql:50-76`; foto escluse (`:7-8`); «Scollega» (`useActions.ts:439-457`) |
| Chi c'è oggi lo vede chi è lì | «Il tuo check-in lo vede solo chi è in spiaggia nella stessa città, lo stesso giorno: nome, foto del profilo, nota e se cerchi un compagno.» | `checkins_who_is_here.sql:70-105` |
| Statistiche solo se dici sì | «Microsoft Clarity e Vercel Analytics partono solo se li accetti, e li spegni quando vuoi dal Profilo. Senza, l'app funziona uguale.» | `consenso.ts:86-140`, `main.tsx:30-41`, `Profilo.tsx:257-262` |
| Chi altro sente | «La mappa scarica le tile da OpenStreetMap; cercando un luogo, il testo che scrivi va a Photon (Komoot). Nient'altro, senza il tuo sì.» | `ConquisteMap.tsx:266`, `VenueMap.tsx:75`, `geosearch.ts:32`; CSP in `vercel.json` |
| Questa pagina | «Niente cookie né statistiche qui: caratteri e immagini arrivano da questo sito.» | vero **solo dopo** questo redesign (Geist servito in self-host, niente Google Fonts): `⟂ QA` lo verifica contando le richieste di rete della landing |

**Da non scrivere**:
- «puoi cancellare il tuo account» e «esporta i tuoi dati»: non esistono;
- «un solo servizio esterno»;
- «nient'altro» riferito ai compagni collegati;
- «i dati stanno in Europa»: non è verificato;
- «foto private» senza dire «dei tornei»: il bucket `avatars` è pubblico.

### L12.9 Finale e footer

- `h2`: «La prossima stagione te la ricordi per intero»
- Riga: «Ti registri con email e password, segni il primo torneo, e da lì il diario si scrive quasi da solo.» (l'accesso con Google o Apple c'è nel codice ma non nella UI: `auth.ts:192`, e non si nomina)
- CTA: «Crea il tuo diario» · «Installa sul telefono» · «Ho già un account»
- Desktop: «È fatta per il telefono: apri bv-diary.vercel.app dal tuo.»
- Footer: «Beach Diary» · «Tornei · Partite · Compagni · Statistiche» · «Apri il diario» · «Ferma le animazioni» · «Torna su»

### L12.10 Foglio d'installazione

| Variante | Titolo | Passi |
|---|---|---|
| `ios26` (Safari, iOS 26 e oltre) | «Aggiungi alla schermata Home» | 1. Tocca **⋯** in basso a destra, accanto all'indirizzo · 2. Tocca **Condividi**, poi **Aggiungi alla schermata Home** · 3. Conferma con **Aggiungi**: trovi l'icona tra le tue app |
| `ios` (Safari fino a iOS 18) | idem | 1. Tocca **Condividi** nella barra di Safari · 2. Scorri e scegli **Aggiungi alla schermata Home** · 3. Conferma con **Aggiungi** |
| `ios-altro` (Chrome, Firefox, Edge su iOS) | idem | 1. Tocca **Condividi** (nella barra dell'indirizzo o nel menu) · 2. Scegli **Aggiungi alla schermata Home** · 3. Conferma |
| `altro` (il prompt nativo non è partito) | «Installa Beach Diary» | 1. Apri il **menu del browser** (i tre puntini) · 2. Scegli **Installa app** o **Aggiungi a schermata Home** · 3. Conferma: trovi l'icona tra le tue app |

- Sottotitolo, per tutte: «Beach Diary si apre a tutto schermo, come un'app.»
- Varianti iOS: «Se l'hai già aggiunta, la trovi tra le tue app.»
- Pulsanti: × («Chiudi») · «Ho capito»
- Le etichette di iOS vanno ricontrollate su un iPhone in italiano, con iOS 26 e con iOS 18 (`⟂ QA`): sono le parole che l'utente cerca sullo schermo.

---

## L13. Prestazioni e caricamento

| Voce | Obiettivo | Note |
|---|---|---|
| Framework | **zero**: nessun `react`, `react-dom`, `motion/react`, `@supabase` nei chunk della landing | verifica sulla build (piano). Il `motion` vanilla (`animate`, `scroll`, `inView`) è permesso |
| JavaScript della landing | ≤ 70 KB gzip in tutto, caricato `type="module"` (che è già differito) | Il markup di Pallo (14 umori) e della scena è grande: `⟂ C` misura. Se pesa, gli umori che non servono al primo schermo si caricano in un chunk a parte, al primo `inView` della guida |
| CSS | ≤ 30 KB gzip; tutto in `@layer components`, più i token, la base e i materiali dell'app | niente CSS fuori dai layer (vince su tutto) |
| Caratteri | Geist variabile in self-host (`@fontsource-variable/geist`), solo il sottoinsieme latino; `font-display: swap` con la riserva metrica | `font-src 'self'` della CSP. Niente Google Fonts |
| LCP | ≤ 2,5 s su 4G lento | l'elemento LCP è l'`h1` (testo nell'HTML), non la scena |
| CLS | **0**, anche al cambio del carattere e alla comparsa del pulsante d'installazione | scatole riservate (§L6.1, §L6.2) |
| TBT, INP | TBT ≤ 200 ms con la CPU a 4×; INP ≤ 200 ms sui tocchi della demo | `perf.mjs` (build di produzione, CPU 4×) adattato alla landing |
| Scroll | 0 fotogrammi lunghi scorrendo tutta la pagina con la CPU a 4× | rAF sospesi fuori vista (§L11.2) |
| Immagini | schermate WebP 780×1688 (~≤ 120 KB l'una), Storia in tre WebP; `width`/`height` sempre; lazy tranne la prima del telefono | `⟂ I` |
| Service worker | registrato al `load`, come oggi | non mette in cache i bundle (`sw.js`) |

**Il contenuto decorativo che arriva col modulo** (scena, Pallo, pin) entra in scatole già misurate dal CSS, con posizione assoluta: senza JS restano vuote, con il fondo giusto. PUÒ essere inserito nell'HTML al momento della build (un plugin `transformIndexHtml` minimo in `vite.config.ts`), così si vede anche prima del modulo. È una scelta di `⟂ C`. UX chiede solo che **testi e CTA siano nell'HTML** e che non ci siano salti di layout.

---

## L14. Test e verifiche

### L14.1 `src/test/landing.test.ts` (legge l'HTML con `fs`, `⟂ QA`)

Quelli del piano:
- nessuno `<script>` senza `src`, nessun attributo `on*`;
- un solo `h1`, `lang="it"`;
- ogni `img` ha `alt`, `width` e `height`;
- il foglio ha `role="dialog"`, `aria-modal` e `aria-labelledby`.

In più, da questa specifica:
- esistono le sezioni `#inizio`, `#diario`, `#registra`, `#live`, `#numeri`, `#mappa`, `#wrapped`, `#dati`, `#comincia`, ognuna con **un** `h2` a `tabindex="-1"`;
- la barra ha **4** link, e ognuno punta a un id che esiste; il ＋ punta a `/`; nessuna tab ha `aria-current` nell'HTML statico;
- i pulsanti d'installazione hanno `hidden`; il foglio ha `hidden`, un titolo con id e i 4 `data-passi`;
- il viewport ha `viewport-fit=cover` e **non** ha `maximum-scale` né `user-scalable=no`;
- `og:image` e `og:url` sono URL assoluti su `https://bv-diary.vercel.app/`; c'è `link rel="canonical"`;
- nessun attributo `style` e nessun blocco `<style>` (il piano: «senza stili né script inline»);
- nessun link verso host esterni per caratteri o script (`fonts.googleapis.com`, `fonts.gstatic.com`, CDN);
- CSS della landing (letto come testo):
  - niente `scroll-behavior: smooth` su `html` o `:root`;
  - niente `transition: all`;
  - niente `backdrop-filter` (il vetro passa da `data-material`);
  - niente colori letterali (`#hex`, `rgb(`, `hsl(`) fuori dai token;
  - ogni regola dentro `@layer components`.

### L14.2 Test di comportamento (jsdom, `⟂ QA`)

| Area | Che cosa |
|---|---|
| Regole live | `PartitaLive.regole.ts`: obiettivo 21/21/15, scarto di 2, cambio campo a 7 e 14 nel set a 21 e a 5 in quello a 15, `battuta()` per set point, match point, vantaggi, set vinto. La rete esistente di `PartitaLive.test.tsx` resta verde |
| Demo | scorciatoie solo col focus dentro; status scritto solo dai tocchi dell'utente; autoplay mai con `matchMedia` ridotto né con `data-movimento="fermo"`; focus al riepilogo a fine partita |
| Guida | `aria-expanded` che cambia; focus alla prima voce all'apertura; Esc che chiude e riporta il focus a Pallo; la guida non esce col focus addosso; 5 tocchi entro 0,7 s → sorpresa e menu chiuso |
| Foglio | focus al titolo; Tab chiuso dentro; Esc; focus restituito; `inert` sul resto; variante scelta dallo user agent (4 casi) |
| Chat | `role="log"`; focus al gruppo delle risposte; `RIPARTENZA` su «Ricomincia»; le domande sono quelle di `domanda()` |
| Ferma le animazioni | le tre istanze in sincrono; `localStorage` assente (accessor che lancia) gestito; `aria-disabled` con il movimento ridotto dal sistema |
| Snapshot | `Pallo.landing.test.tsx`: i 14 umori e la scena, rigenerati con `-u` (piano) |

### L14.3 Nel browser (`docs/qa/landing.mjs`, LC11)

- Larghezze 320, 390, 768, 1280 (altezze 568, 844, 1024, 800), più 390 in orizzontale (844×390).
- A ogni fermata (ogni ancora e tre posizioni dentro Wrapped bloccato): axe (0 violazioni, `FLAT=1`), overflow orizzontale (0), SPILL/CLIP, superfici col vetro visibili (≤ 3), immagini senza misure (0).
- Tab dall'inizio alla fine: ogni fermata con l'anello, nessuna coperta dalle barre o da Pallo, nessuna tagliata.
- `prefers-reduced-motion: reduce` e `data-movimento="fermo"`: nessuna animazione in corso dopo 1 s (`document.getAnimations()` vuoto, a parte quelle di stato), numeri pieni, Wrapped in riga.
- Prestazioni: build di produzione, CPU a 4×: CLS, TBT e fotogrammi lunghi durante uno scroll completo.
- Rete: nessuna richiesta verso host diversi da quello della pagina (§L12.8, «Questa pagina»).
- Le porte del piano: `vite preview` su una porta propria (per esempio 5199), una porta CDP propria passata a `launch()`, **mai** 9333 né 5173 (il Vite dell'utente). Si chiude con il PID catturato.

### L14.4 A mano

- Su un iPhone vero, iOS 26, in Safari:
  - la pila in basso (barra di Safari, capsula, Pallo) con la barra di Safari espansa e compatta;
  - il foglio, variante `ios26`, con le etichette che si leggono sullo schermo;
  - «Aggiungi alla schermata Home» da `/presentazione/`: l'icona apre `/` (il `start_url`), non la landing.
- Su un Android: il prompt nativo, accettato e rifiutato; `appinstalled`; la vibrazione nella demo.
- Pallo: un tocco, 5 tocchi, il tocco lungo, il sonno dopo 10 s, lo scroll veloce, il menu da sola tastiera.
- La demo fino al cambio campo, al set point, al set vinto e alla partita finita.
- Con VoiceOver: il percorso di §L8.9 e il silenzio durante lo scroll.
- Che `/presentazione` e `/presentazione/` diano la stessa pagina su Vercel (la rewrite esclude `presentazione`).

---

## L15. Decisioni prese e domande aperte

### L15.1 Già deciso dall'utente (da non riaprire)

| # | Domanda | Risposta |
|---|---|---|
| 1 | Base del lavoro | Il redesign è già su `main` (`be9c4bd`): si parte da lì, niente fast-forward da `redesign` |
| 2 | Pallo, numeri e regole identici all'app | **Estrarre i moduli condivisi**, anche toccando l'app |
| 3 | Icone PWA e manifest col pallone nuovo | **Sì**, anche se cambia l'icona dell'app già installata |
| 4 | Schermate del telefono | Dall'**anteprima** con i dati di prova, rigenerabili da script |
| 5 | Desktop | **Mobile first**, ma layout curato anche su desktop |
| 6 | Dominio per og:image | `https://bv-diary.vercel.app` |

### L15.2 Domande aperte (con la risposta raccomandata)

I ruoli successivi procedono con la raccomandazione, salvo una risposta diversa dell'utente.

| # | Domanda | Raccomandazione | Perché |
|---|---|---|---|
| **Q-L1** | Tab e ordine delle sezioni (LC1)? | **Diario · Live · Numeri · Wrapped**, e «Cosa registriamo?» subito dopo il diario | Ogni sezione lunga ha la sua tab. La tab «Pallo» non porterebbe a una funzione. Il ＋ introduce la demo |
| **Q-L2** | Deep link `/?accesso=registrati\|accedi` nel Login (LC5)? | **Sì**: letto una volta al montaggio e tolto con `replaceState`, coperto da un test in `Login.test.tsx` | Toglie una scelta ripetuta nel passo che converte. È un cambio di poche righe, che non tocca il flusso dell'app |
| **Q-L3** | Da dove vengono i numeri della landing? | **Dal dataset dell'anteprima**, passato dalle funzioni vere: `computeStats`, `deriveConsigli`, `postoMagico`, `deriveMappa`, `deriveWrapped`. Va spostato da `docs/preview/main.tsx` in un modulo importabile (`docs/preview/dati.ts`), e un test di file-snapshot scrive `presentazione/js/generati/dati.ts` | Le schermate e i numeri del sito dicono la stessa cosa, e un cambio di regola nell'app si vede anche qui. Se non si fa: i numeri del piano (66%, +81, 2/14, 6), con la verifica a mano che la schermata della Home mostri gli stessi |
| **Q-L4** | Le cifre della demo live (LC3)? | **Il pop dell'app**, non `Odometro` | La demo mostra il prodotto com'è |
| **Q-L5** | `theme-color` (LC13)? | `#120E14` nell'HTML, `#F6F6F4` quando l'hero esce di vista. Il manifest `#F6F6F4` | La barra del browser continua il fondo che ha sotto |
| **Q-L6** | «Ferma le animazioni» visibile (§L7.13)? | **Sì**: hero, menu di Pallo, footer | WCAG 2.2.2: scena e Pallo si muovono da soli per più di 5 s, e `prefers-reduced-motion` è un'impostazione di sistema, non un comando della pagina |
| **Q-L7** | Installare dal computer? | Il pulsante compare solo col prompt nativo (Chromium desktop), con l'etichetta «Installa l'app». Più la riga «È fatta per il telefono…». **Niente QR** in questo giro | L'app è fatta per il telefono (preferenza dell'utente): dal computer si invita a passare al telefono, senza negare l'installazione a chi la vuole |
| **Q-L8** | La scena del Login sulla landing (LC2)? | Spostare il CSS della scena in `Login.scena.css` ed estrarre `avviaPalleggio`. Il loop si sospende fuori vista anche nell'app (un miglioramento) | Una sola scena per due pagine, senza portarsi dietro il CSS del modulo d'accesso |
| **Q-L9** | Istruzioni iOS per versione (LC12)? | **Quattro varianti dallo user agent**, provate su un iPhone vero | Su iOS 26 il passo «Condividi nella barra» è sbagliato |
| **Q-L10** | Capsula sui fondi scuri (LC7)? | **Variante scura a soglia**, coi rapporti fissati in un test | Il vetro .32 dell'app non regge su `#120E14` |
| **Q-L11** | Menu di Pallo: `role="menu"` o disclosure? | **Disclosure** (§L7.2) | Sono soprattutto link di navigazione: il pattern WAI per la navigazione è la disclosure |
| **Q-L12** | Le vecchie schermate `public/presentazione/screens/*.png`? | **Eliminarle** quando le WebP nuove sono al loro posto, e aggiornare i riferimenti | Nessun altro le usa: sono la vecchia landing |
| **Q-L13** | «Gratis» nell'hero? | **Sì**, finché `PLANS_ENABLED = false`, con una voce nella checklist di QA | È vero oggi, ed è un'informazione che il V1 cerca |
| **Q-L14** | QA della landing (LC11)? | **Uno script nuovo**, `docs/qa/landing.mjs`, sugli strumenti di `cdp.mjs` | Gli script esistenti sono costruiti per le rotte dell'anteprima; piegarli li romperebbe per l'app |

### L15.3 Attività proposte a parte (fuori scope)

- **Cancellazione dell'account ed esportazione dei dati** (LC9): oggi mancano del tutto. Sono diritti che il GDPR riconosce, e la landing non li può promettere.
- **Pagine Termini e Informativa privacy** (LC17): il Benvenuto le nomina, ma non esistono.
- **`offline.html` sulla versione D** (LC17): navy e arancio vecchi.

---

## L16. Indice dei seam

| Seam | Che cosa | Riferimento |
|---|---|---|
| **⟂ E** | `src/components/Pallo.vita.ts` (lo sguardo e la vita di `useVita` come funzione DOM), `src/components/ui/Odometro.ts`, `src/screens/PartitaLive.regole.ts` (con `battuta` e i tipi), come nel piano | piano, §L7.2, §L7.6, §L7.7 |
| ⟂ E | `src/screens/Login.scena.css` (spostamento delle regole `.accesso-scena*`) e `avviaPalleggio(svg)` estratto da `usePalleggio`, con la sospensione fuori vista | LC2, Q-L8 |
| ⟂ E | `Login`: `?accesso=registrati\|accedi`, letto una volta e tolto, con il test | LC5, Q-L2 |
| ⟂ E | `src/components/Pallo.landing.test.tsx` (14 umori più la scena, file-snapshot in `presentazione/js/generati/`); dataset dell'anteprima importabile e `generati/dati.ts` | piano, Q-L3 |
| **⟂ A** | Materiali della capsula per fondo chiaro e scuro, lente senza sfocatura, i rapporti di §L8.5 fissati in un test | LC7, LC8, §L8.5 |
| ⟂ A | Velo dell'hero sotto i testi; anello di focus su arancio e sul buio; nuvoletta opaca; pulsante «Ferma le animazioni»; posto riservato al pulsante d'installazione | §L6.1, §L7.2, §L7.4 |
| ⟂ A | Disegno dell'indicatore, della mappa schematica, della cornice del telefono, del finale (fondo scuro, PUÒ) | §L7.3, §L7.8, §L3.2 |
| ⟂ A | `ART_DIRECTION.md:86`: «la landing ora segue la versione D», più una sezione con i valori della landing | piano |
| **⟂ M** | Il paragrafo «Landing (`/presentazione`)» in MOTION.md: LM1–LM11, le due eccezioni (scroll legato e sfalsamento narrativo), i limiti di §L11.2, la matrice ferma di §L11.3, `data-movimento="fermo"` come secondo interruttore di `--motion-scale` | LC6, §L11 |
| **⟂ C** | `presentazione/index.html` con la struttura di §L3.1, gli id, i ruoli di §L8.3 e la versione ferma come base | §L3, §L6.0 |
| ⟂ C | `presentazione/js/main.ts`, più `nav.ts`, `pallo.ts`, `guida.ts`, `scene.ts`, `live.ts`, `chat.ts`, `numeri.ts`, `install.ts` (piano), più `movimento.ts` (`movimentoFermo()`, comando, `localStorage`), ognuno inizializzato da solo | §L6.0, §L7.13 |
| ⟂ C | Salti con `replaceState`, focus all'`h2`, `scroll-padding` per barra e Pallo, soglia del 40%, `theme-color` dinamico | §L4, LC13 |
| ⟂ C | La chat sul copione vero (`copione.ts`) | §L7.9, §L12.5 |
| ⟂ C | I testi di §L12, compresa la sezione dati riga per riga | §L12 |
| **⟂ I** | Schermate WebP 780×1688 dall'anteprima, con la data fissata a ottobre, le tile caricate e l'attribuzione OSM visibile; la Storia nei tre layout; l'elenco dei consigli visibili nelle schermate (per §L12.4) | LC10, §L12.4 |
| ⟂ I | Icone PWA (icon.svg, 180, 192, 512, maskable) col pallone; manifest `#F6F6F4`; og:image 1200×630; favicon; meta di §L12.1 | risposta 3, §L12.1 |
| **⟂ QA** | `src/test/landing.test.ts` (§L14.1), i test di comportamento (§L14.2), `docs/qa/landing.mjs` (§L14.3), le prove a mano (§L14.4) | §L14 |
| ⟂ QA | Verifica della build: nessun framework nei chunk della landing, caratteri da `/assets/`, nessuna richiesta a terzi | §L13, §L12.8 |
| ⟂ QA | `README`: la landing, come rigenerare snapshot, dati e schermate | piano |
