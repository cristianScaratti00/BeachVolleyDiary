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

> **Ottobre 2026: la landing.** La [Parte L](#parte-l-la-landing-presentazione), in fondo, è il contratto UX della landing `/presentazione`: dal 20 ottobre la tavola «Landing page» di Claude Design, solo HTML e CSS. Le sezioni 0–16 restano il contratto dell'app.

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
- **L.** [La landing `/presentazione`](#parte-l-la-landing-presentazione)

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
| **Landing** | La landing `/presentazione` dalla tavola «Landing page» | Parte L |

---

# Parte L. La landing `/presentazione`

| | |
|---|---|
| Data | 20 ottobre 2026 |
| Fonte | la tavola **«Landing page»** del canvas di Claude Design «Beach Diary — Redesign Liquid Glass» ([canvas](https://claude.ai/artifact/Sr7p7hVVqwC6PNkJUzdsDd), file `project/Landing.dc.html`, 1440 × 3495). La richiesta dell'utente: «rifai la landing page come mi ha sviluppato Claude» |
| Cosa sostituisce | la landing «Controluce» (scena al tramonto, Pallo guida, demo giocabili, chat, installazione). La sua specifica e il suo codice restano nella storia di git, fino al commit `a9793f3` |
| Il resto | aspetto e misure in `ART_DIRECTION.md`, Parte L; movimento in `MOTION.md`, Parte L; misure nel browser in `POLISH.md`, Parte L |

## L0. In una frase

Una pagina sola, solo HTML e CSS, che dice che cos'è Beach Diary e apre due porte dell'app: **registrarsi** (`/?accesso=registrati`) ed **entrare** (`/?accesso=accedi`). Tutto il resto (registrazione, installazione, dati) succede nell'app.

## L1. Le sezioni

L'ordine è contratto: lo fissano `src/test/landing.test.ts` e `docs/qa/landing.mjs`.

| # | Dove | Titolo | Che cosa c'è |
|---|---|---|---|
| — | `<header class="testata">` (fuori da `<main>`) | — | il marchio, che torna in cima (`#inizio`); la navigazione «Sezioni»: Funzionalità (`#funzionalita`), Schermate (`#schermate`), Accedi (`/?accesso=accedi`) e il pulsante «Iscriviti» (`/?accesso=registrati`). Sotto gli 820px resta solo «Iscriviti» |
| 1 | `#inizio` | **h1** «Il diario delle tue partite di beach volley.» | occhiello «Per chi gioca a beach volley», la frase, «Crea il tuo diario» e «Ho già un account»; la Home vera dell'app in un telefono |
| 2 | `#funzionalita` | «Tutta la stagione, in un posto solo.» | nove carte, un titolo e una riga ciascuna: Diario, Partita live, Solby l'assistente; Statistiche, Compagni, Mappa delle conquiste; Chi c'è oggi, Storia Instagram, Beach Wrapped |
| 3 | `#schermate` | «Semplice da usare, a bordo campo.» | il giro: sei momenti di una stagione, ognuno con la schermata vera e due righe (Solby compila il torneo, Partita live, il torneo nel diario, i compagni, la Storia Instagram, Beach Wrapped) |
| 4 | `#iscriviti` | «Crea il tuo diario.» | la frase «Ti bastano nome, email e password…» e le stesse due porte dell'hero |

I testi dell'hero, delle testate delle sezioni e del finale sono quelli della tavola, parola per parola. Le tre carte nuove e il giro vengono dalla richiesta dell'utente (20 ottobre 2026: «aggiungi le funzioni importanti dell'app e spiegale con parole essenziali»), e dicono solo cose che l'app fa: Solby compila il torneo senza essere un'AI, la Storia si scarica e si pubblica a mano, il compagno collegato vede i tornei condivisi in sola lettura.

## L2. Le porte dell'app

- La **registrazione resta nell'app** (decisione dell'utente, 20 ottobre 2026: «la registrazione rimane in app, toglila dalla landing page»). Nella tavola `#iscriviti` aveva un modulo con nome, email e password: non c'è. Al suo posto i due pulsanti. Nella landing non ci sono `<form>`, campi né `<button>` (lo controlla il test).
- Ogni link verso l'app usa il parametro di `Login.tsx` (`PARAM_ACCESSO`): `registrati` apre direttamente Registrati, `accedi` apre Accedi, così il Benvenuto non fa ripetere una scelta appena fatta. Il parametro si legge una volta e si toglie dall'indirizzo.
- La nota «Continuando accetti i Termini e l'Informativa privacy» della tavola stava sotto il modulo: va via con lui. Resta nell'app, come testo senza link, finché quelle pagine non esistono (`Login.tsx`).

## L3. Che cosa non c'è più (rispetto a «Controluce»)

La barra a capsula in basso, Pallo guida e il suo menu, la demo della Partita live, la chat «Raccontalo a Pallo», i numeri che salgono, la mappa disegnata, le slide di Wrapped, la Storia, «Il diario resta tuo», il foglio d'installazione e il comando «Ferma le animazioni». La tavola non li ha. Chi installa l'app lo fa dall'app o dal browser.

## L4. Accessibilità

- **Struttura.** `lang="it"`; un solo `h1` (l'hero); ogni sezione ha `aria-labelledby` sul suo titolo; `header`, `nav aria-label="Sezioni"` e `main` sono i landmark. Le carte sono `article` con un `h3`.
- **Tastiera.** «Salta al contenuto» è il primo Tab e porta a `<main>`. Il giro del Tab, a 1280: salto, marchio, tre voci, Iscriviti, le due porte dell'hero, le due porte del finale. Il giro di `#schermate` non ha fermate: è testo e immagini. Sotto gli 820px le voci non ci sono. L'anello è quello dell'app (inchiostro, 2px a 2px di distanza) e si vede su ogni fondo.
- **Il giro** di `#schermate` è un `<ol>`: sei momenti in ordine, ognuno con un `h3`, una frase e la schermata con il suo testo alternativo, nello stesso ordine per chi legge e per chi ascolta. Col movimento i momenti stanno uno sopra l'altro e si vedono uno alla volta, ma sono tutti nel documento: un lettore di schermo li legge di fila. La barra delle storie è decorativa (`aria-hidden`).
- **L'apertura della Home** nel telefono dell'hero (MOTION.md, Parte L) è decorativa: fasce e tabellone sono `aria-hidden` e senza testo, e il testo alternativo resta sull'immagine della Home vera, che è quella che si vede da ferma. Con reduced-motion non c'è.
- **Immagini.** Ogni schermata ha un testo alternativo che dice che cosa mostra (la frase della Home, i numeri, i tornei); le icone sono decorative (`aria-hidden`), perché il titolo della carta dice già tutto.
- **Bersagli.** Almeno 44 × 44: i pulsanti sono alti 52 (44 nella testata), le voci e il marchio hanno l'area allungata a 44.
- **Zoom.** Le taglie sono in rem; il viewport non blocca lo zoom.

## L5. Responsive

La tavola ha un solo punto di rottura, a **820px**: sotto, margini da 16 invece di 32, la testata con il solo «Iscriviti», l'hero impilato (testo sopra, vetrina a tutta colonna), e meno spazio fra le sezioni (72–88 invece di 96–120). La griglia delle carte si adatta da sola (tre colonne a 1200). Sotto i 340px di colonna il telefono dell'hero si stringe e tiene la proporzione. In orizzontale sul telefono i margini non entrano sotto la tacca (`safe-area-inset`).

La rifinitura aggiunge tre soglie per il telefono, dove la tavola non diceva niente:

- **760px**: sotto, nel giro il testo va sopra il telefono (fermo) o sotto (la scena che si ferma), centrato;
- **600px**: sotto, le nove carte delle funzionalità sono un gruppo solo, come le liste raggruppate dell'app;
- **480px**: sotto, le due porte dell'hero e del finale vanno una per riga, larghe quanto la colonna.

## L6. Contenuti e meta

- `<title>`: «Beach Diary · Il diario delle tue partite di beach volley»; description: la frase dell'hero. `theme-color` è la carta, `#F6F6F4`.
- `og:image` è `public/presentazione/og.png` (1200 × 630): il marchio e il titolo a sinistra, la vetrina con la Home a destra. Si rigenera con `docs/qa/landing-og.mjs`.
- Le schermate sono quelle dell'anteprima (`docs/preview`) col diario di prova al 17 ottobre 2026 (`OGGI_LANDING`): si rigenerano con `docs/qa/landing-shots.mjs`.

## L7. Prestazioni

Niente JavaScript: anche l'apertura della Home e il giro sono CSS. In build la pagina è HTML (5.0 KB gzip) e un foglio (8.4 KB gzip), più Geist e le schermate (25–53 KB l'una, WebP). Il telefono dell'hero si carica subito (`fetchpriority="high"`), le sei schermate del giro quando servono (`loading="lazy"`, 22–50 KB l'una). La Home senza cifre delle fasce (`home-fondo.webp`, 50 KB) si chiede subito con un `preload`, ma solo a chi vede il movimento (`media="(prefers-reduced-motion: no-preference)"`). L'apertura muove solo `transform`, `opacity` e `visibility`: il telefono dell'hero resta l'elemento LCP (l'immagine è dipinta dal primo fotogramma, sotto gli strati). Il sottoinsieme latino di Geist parte insieme al CSS (`landingFont` in `vite.config.ts`), e finché non arriva la riserva metrica tiene le righe al loro posto.

## L8. Test e verifiche

| Che cosa | Dove |
|---|---|
| CSP (niente script né stili in linea), meta, struttura, porte dell'app, immagini, sprite, CSS (livelli, colori, transizioni, fotogrammi, animazioni solo col movimento consentito), l'apertura coerente con `misure.css`, axe in jsdom | `src/test/landing.test.ts` |
| Contrasti dei token della landing, riserva metrica di Geist | `src/styles/landing.tokens.test.ts` |
| axe nel browser, giro del Tab con l'anello misurato a pixel, il giro di `#schermate` (la scena ferma, un momento per tratto; l'elenco con reduced-motion), overflow da 320 a 1440, bersagli, CLS, reduced-motion, l'apertura (a tempo e legata allo scroll), prestazioni, rete | `docs/qa/landing.mjs` (risultati in `POLISH.md`, Parte L) |
| Le misure dell'apertura (fasce, colonne, barra) e la Home senza cifre, rigenerate insieme alle schermate | `docs/qa/landing-shots.mjs` → `presentazione/styles/misure.css` |
