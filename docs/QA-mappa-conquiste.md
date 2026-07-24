# QA — "La mappa delle conquiste" (livello presentazionale + selettori)

Nuova **seconda vista della schermata Tornei**: l'Italia disegnata in SVG con un pin
per ogni città in cui hai giocato, colorato dal miglior piazzamento ottenuto lì.
A colpo d'occhio: *dove gioco davvero bene?*

| | |
|---|---|
| Ambito | `src/lib/italy.ts` (tracciato), `src/lib/geo.ts` (proiezione + gazetteer + declustering), `src/lib/derive.mappa.ts` (`deriveMappa`), `src/screens/Mappa.tsx` (presentazionale), `src/screens/Tornei.tsx` (selettore di vista), `src/lib/derive.ts` (`dotForRank` esportata), `src/components/modals/Sheet.tsx` (`CityInput`), `src/components/modals/TorneoModal.tsx`, `src/components/modals/QuickTorneoModal.tsx` (campo Città), `src/hooks/useDiary.ts` (`quickCreateTorneo` salva la città), `src/App.tsx`, `src/test/factories.ts`, `src/test/contrast.test.ts` |
| Ambiente | Node 22 · Vitest 3.2.7 · jsdom 26 · Testing Library React 16 · axe-core 4.12 |
| Suite | 297 test: 293 verdi + 4 `skip` preesistenti (difetti noti di Tornei). **+178 nuovi**: `geo.test.ts` (48), `derive.mappa.test.ts` (41), `Mappa.test.tsx` (35), `Tornei.test.tsx` (+8 sul selettore di vista), `contrast.test.ts` (+3), più i test preesistenti adeguati |
| Comandi | `npm test` · `npm run typecheck` · `npm run typecheck:test` · `npm run build` |

Tutti e quattro i comandi passano. **Nessuna migration**: la feature è interamente client-side.

---

## Come è nato il tracciato dell'Italia

`src/lib/italy.ts` è **generato una volta sola e committato**. Non è uno step di
build e non aggiunge dipendenze. Questa è l'unica traccia riproducibile di come è
nato: se il tracciato va rigenerato, si riparte da qui.

Fonte: **Natural Earth 1:50m `admin_0_countries`** (pubblico dominio).
L'1:110m perde lo sperone del Gargano e il tacco; l'1:10m è sproporzionato per un
riquadro da 340 px.

```bash
curl -sLO https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip
unzip -o ne_50m_admin_0_countries.zip

npx mapshaper@0.6.44 ne_50m_admin_0_countries.shp \
  -filter 'ADM0_A3=="ITA"' \
  -filter-islands min-area=1000km2 \
  -simplify visvalingam 70% keep-shapes \
  -o precision=0.001 format=geojson italy.json
```

Poi uno script Node usa e getta mappa gli anelli nel riquadro 340×408 con **le
stesse costanti di `project()`** (`src/lib/geo.ts`), arrotonda a un decimale e
stampa `M x y L x y … Z` per anello:

```js
const W = 340, H = 408, LAT_TOP = 47.45, LNG0 = 12.5
const K = Math.cos(42 * Math.PI / 180), SCALE = 36
const px = (lng) => W / 2 + (lng - LNG0) * K * SCALE
const py = (lat) => (LAT_TOP - lat) * SCALE
// per ogni anello esterno: dedup dei punti dopo l'arrotondamento, poi 'M…L…Z'
```

Risultato: **3 anelli, 392 vertici, 4.695 byte grezzi (~2 KB gzippati)**.

### Due scelte da non disfare per sbaglio

- **`min-area=1000km2`** tiene penisola + Sicilia (25.000 km²) + Sardegna
  (24.000 km²) e scarta l'Elba (224 km²) e tutte le minori, che a questa scala
  sarebbero 1-2 px di rumore. Le loro località restano geocodabili: il pin cade
  appena al largo, che è geograficamente corretto (test dedicato).
- **Niente `-proj` in mapshaper.** Il piano prevedeva `-proj '+proj=eqc +lat_ts=42
  +lon_0=12.5'`, che è esattamente la proiezione di `project()`. La conversione
  finale però va comunque fatta nello script Node con le costanti condivise, e
  proiettare due volte con due implementazioni diverse è proprio il modo in cui
  tracciato e pin divergono. Semplificare in gradi è **equivalente**: la
  proiezione scala tutte le x per lo stesso `cos(42°)`, quindi il rapporto fra le
  aree dei triangoli di Visvalingam — l'unica cosa che conta per l'ordine di
  rimozione dei vertici — non cambia. Una sola implementazione della proiezione,
  quella di `geo.ts`.

### Il modo silenzioso in cui questa feature si rompe

Cambiare `LAT_TOP`, `LNG0`, `K` o `SCALE` in `geo.ts` **senza rigenerare
`italy.ts`** scollega i pin dalla costa, e niente in TypeScript se ne accorge.
Le difese: il commento in testa a entrambi i file, il test sui quadranti dei punti
di riferimento (Trieste a nord-est, Lecce in basso a destra, Cagliari nell'isola)
e — la più forte — il ciclo che verifica che **ogni voce del gazetteer cada sulla
terraferma disegnata**.

---

## Cosa è stato verificato (automatico)

### `src/lib/geo.test.ts` (48 test) — puro

- **`geoKey`**: minuscole, trim, diacritici (`Forlì`→`forli`, `Cefalù`→`cefalu`,
  `Nardò`→`nardo`), trattini e apostrofi ridotti a spazi, sequenze di spazi
  collassate, stringa di sola punteggiatura → `''`.
- **`normalizeCity` invariata** — guardia di regressione, non un doppione:
  `normalizeCity('Forlì ')` è ancora `'forlì'` mentre `geoKey` dà `'forli'`. Le
  due funzioni **non vanno unificate**: `normalizeCity` deve continuare a
  rispecchiare `check_ins.city_key` del DB (`lower(btrim(city))`), o le stanze di
  "Chi c'è oggi" si spaccano in silenzio.
- **`geocodeCity`**: esatta, maiuscole/spazi, accentata e non, alias
  (`Bellaria-Igea Marina` = `Bellaria`, `Reggio nell'Emilia` = `Reggio Emilia`),
  fallback sui prefissi (`Lido di Jesolo` = `Jesolo`, `Marina di Sperlonga` =
  `Sperlonga`), **precedenza della voce propria sul fallback** (Marina di Ravenna
  ≠ Ravenna: sono 12 km), sconosciuta → `null`, vuota → `null`.
  **Mai un fuzzy match**: `Riminii` → `null`, perché un pin nella città sbagliata
  è peggio di nessun pin.
- **Ciclo su TUTTO il gazetteer** (~300 voci): lat ∈ [36,5; 47,2], lng ∈ [6,5;
  18,6], `project()` dentro il riquadro, e soprattutto **distanza dalla sagoma
  vera ≤ 2 unità** (≈ 6 km, la tolleranza della semplificazione sulle località
  costiere). È il test che prende i modi realistici in cui 300 coordinate scritte
  a mano si rompono: lat/lng scambiate, segno invertito, errore di 10 gradi.
  Ha già trovato un caso reale in scrittura (Carloforte, isola di San Pietro).
- **Simmetrico**: le località estere **non** devono cadere sulla terraferma
  italiana — un refuso al contrario.
- Igiene: ogni chiave uguale a `geoKey(chiave)`, ogni alias punta a una voce
  esistente, nessun alias ombreggia una voce vera.
- **`ITALY_OUTLINE`**: comincia per `M`, esattamente 3 `M` e 3 `Z`, nessun `NaN`,
  tutto dentro il riquadro, `length < 8000` (tetto di payload fissato a numero,
  nello stesso spirito con cui `contrast.test.ts` fissa i rapporti).
- **`spreadPins`**: la riviera romagnola a 6 comuni viene distanziata di almeno
  `MIN_DIST`; una sola città resta sulla propria ancora; l'ancora resta la
  proiezione vera; **mescolare l'input dà coordinate identiche**; Rimini+Palermo
  non si spostano mai; tutto resta dentro il riquadro; lista vuota → `[]`.
- **`CITTA_SUGGERITE`**: ogni suggerimento si geocodifica davvero e cade dentro
  il riquadro, nessun doppione, grafie con accenti e maiuscole vere.

### `src/lib/derive.mappa.test.ts` (41 test) — puro, `today` iniettato

- Aggregazione per `geoKey`: `"Rimini"` / `" rimini "` / `"RIMINI"` → un pin;
  `"Forlì"` e `"Forli"` → un pin; la grafia mostrata è quella del torneo più
  recente; il miglior piazzamento vince il tier; podi contati; record e win% dalle
  partite di quella città.
- **Tornei condivisi inclusi**, con `shared: true` sul pin solo se *tutti* i
  tornei di quella città lo sono.
- Tre bucket, nessuno silenzioso: `pins` · `fuoriItalia` (e il **viewBox non
  cambia**) · `sconosciute` · `senzaCitta` · `nonGiocati`.
- Declustering: nessuna coppia sotto `MIN_DIST`, una sola non spostata, ancore
  vere, **coordinate identiche mescolando l'input**, tutto dentro il riquadro.
- **Il filtro anno non muove i pin**: si scioglie il grappolo sull'insieme
  completo delle città e *poi* si filtra. Proprietà strutturale con il suo test.
- Forma: `vinto` = pieno + punto interno, `podio` = pieno, `giocato` = vuoto.
  **Invarianti**: il raggio massimo non supera `MIN_DIST / 2` (o due pin adiacenti
  si sovrapporrebbero nonostante il declustering), e una vittoria singola non è
  mai più grande di tre uscite ai gironi (i due assi resterebbero indistinguibili).
- Purezza: input mai mutato, due chiamate danno lo stesso risultato.

### `src/screens/Mappa.test.tsx` (35 test)

Montata con `vi.fn()` e dati di fabbrica, **niente mock di Supabase**.

- Stato vuoto → nessun `svg[role=img]`, invito a creare un torneo.
- L'SVG ha `role="img"` + `aria-label` che nomina il numero di città, e
  `focusable="false"`.
- **Il gruppo dei pin è `aria-hidden` e senza `tabIndex`** (aggiungerlo farebbe
  scattare `aria-hidden-focus` di axe): la superficie da tastiera è la lista.
- **Il risultato non è mai solo colore**: contorno navy su ogni pin, badge
  testuale su ogni riga, tre voci testuali in legenda.
- Lista di `<button>` veri con `aria-expanded`, ordinata dal risultato migliore.
- **Pin e riga sono la stessa selezione**: cliccare il pin espande la riga.
- **Il click sul pin non lancia in jsdom** (la guardia su `scrollIntoView`).
- Filtro per risultato: compare solo se separa qualcosa, filtra, torna a "Tutte".
- Sezioni "Fuori dall'Italia" / "Non ancora sulla mappa" / note su città mancanti
  e tornei in corso.
- **axe su tre stati**: vuoto, pin collassati, una città espansa.

### Verifica visiva (jsdom non fa layout)

La schermata è stata renderizzata con dati realistici e guardata in Chrome —
non c'è modo di sapere altrimenti se una mappa "legge". Da lì è uscita una
correzione vera: con `MIN_DIST = 16` la riviera romagnola galleggiava in mezzo
all'Emilia. Portato a **13** (≈ 40 km), il grappolo resta attaccato alla sua costa
e i pin non si toccano comunque (raggio max 6,5 = 13/2).

---

## Decisioni e assunzioni

- **Nessuna tabella `places`, gazetteer statico committato.** Le località del
  beach italiano sono poche decine e stabili. Una migration costerebbe
  `database.types.ts` + `models.ts` + i mapper + due modali + backfill, su una
  cronologia migration **già disallineata dal DB remoto** (`profiles.avatar_url` e
  la RPC `set_avatar` sono in `database.types.ts` ma in nessun file di migration).
  La domanda decisiva — *"qualcuno aggiungerà mai una città senza fare un
  deploy?"* — oggi ha risposta no. Il passaggio resta additivo: `geocodeCity()` è
  l'unico punto di risoluzione.
- **Vista dentro Tornei, non una voce di navigazione.** `BottomNav` è una pill di
  6 slot da 46 px: 6·46 + 5·6 + 14 = **320 px**, che sta in un viewport da 360. Un
  settimo slot la porta a **372 px** e sfora su iPhone SE/mini; scendere a 40 px
  passerebbe sotto il target di tocco iOS di 44 px. Il selettore `Lista / Mappa`
  in cima a Tornei non tocca la navigazione.
- **Solo tornei già giocati** (`placement !== 'In corso'` **e** `date <= oggi`).
  È la mappa delle *conquiste*. Quelli esclusi sono comunque contati e dichiarati
  in fondo alla pagina — non spariscono in silenzio.
- **Colore = miglior piazzamento** (riusando `dotForRank`), **dimensione = numero
  di tornei**, win% nella riga di lista e nel tooltip del pin.
- **Tornei condivisi inclusi**, con contorno tratteggiato e badge "Condiviso":
  erano eventi a cui c'eravate entrambi.
- **Peso**: il chunk principale passa da **39,5 a 51,4 KB gzippati** (+11,9 KB).
  È il prezzo della vista dentro Tornei: dietro un toggle a un click, un chunk
  lazy comprerebbe soprattutto uno spinner. `derive.mappa.ts` resta comunque il
  punto di taglio pronto, se un domani la mappa diventasse una schermata a sé.

---

## Accessibilità — perché il contorno dei pin non è una rifinitura

I rapporti sul fondo terra `#F2F0EC`, calcolati in `src/test/contrast.test.ts`:

| riempimento | su `#F2F0EC` | soglia 1.4.11 |
|---|---|---|
| `#FF6B35` (vinto) | **2,49:1** | 3:1 ❌ |
| `#F7A883` (podio) | **1,70:1** | 3:1 ❌ |
| `rgba(27,42,74,.25)` (giocato) | **1,63:1** | 3:1 ❌ |
| `#1B2A4A` (`INK`, **contorno**) | **12,49:1** | 3:1 ✅ |

Su una card il pallino da 8 px sta accanto a un'etichetta: è decorativo. Sulla
mappa lo stesso colore sarebbe **l'unico portatore** di "qui sono uscito ai
gironi", quindi 1.4.11 si applica davvero. Da qui, tutte requisiti e non ritocchi:

1. **Contorno navy 1,4 su ogni pin.** È il contorno, non il riempimento, a dare il
   contrasto. I tre rapporti bocciati sono fissati a numero nel test apposta: se
   qualcuno "pulisce" il contorno come rumore visivo, il test dice che quel
   contorno era l'unica cosa conforme.
2. **Forma prima del colore**: pieno-con-punto / pieno / vuoto si distingue a
   10 px, in bianco e nero e con qualsiasi deficit della visione cromatica.
3. **Legenda in DOM reale**, tre righe sempre presenti anche a zero, con lo stesso
   glifo del pin (`aria-hidden`) accanto al testo.
4. **La lista è la superficie accessibile**: `<button>` veri con `aria-expanded`
   che portano ogni fatto che porta la mappa. L'SVG è `role="img"` con un
   `aria-label` riassuntivo e i pin sono `aria-hidden`.

---

## Difetti noti (preesistenti, ereditati e resi visibili)

1. **`placementRank('Semifinale')` vale 9**, cioè *peggio* di `'Gironi'` (8)
   — `src/lib/stats.ts:60-69`, stessa incoerenza nella funzione SQL
   `public.placement_rank` (`20260705120500_screen_aggregation_rpcs.sql:8-14`).
   Sulla mappa una città il cui miglior risultato è una semifinale finisce in
   fondo alla lista, sotto le uscite ai gironi.
   La mappa **non propaga** il difetto nell'etichetta: `best` porta la stringa
   grezza del piazzamento, non `PLACEMENT_LABELS[rank]`, che per 9 stamperebbe
   `'—'`. Il comportamento attuale è asserito da due test **apposta**, così
   correggerlo sarà una scelta deliberata: quando `placementRank` cambierà, quei
   test falliranno e chi corregge saprà di dover guardare anche qui.
   Correggerlo richiede di toccare **client e SQL insieme**, o i due percorsi
   divergono.
2. **`deriveWrapped` conta le città senza normalizzarle**
   (`derive.ts:772`, `new Set(tourns.map(t => t.city))`): "Rimini" e "rimini "
   contano due volte. La mappa usa `geoKey` e non ha il problema.
3. **`README.md`** era disallineato (citava la schermata `Galleria`, cancellata,
   e `localStorage`, sostituito da Supabase). Aggiornato in questo lavoro.

## Cosa resta fuori

- La copertura del gazetteer non è esaustiva: la sezione **"Non ancora sulla
  mappa"** rende visibili le città mancanti invece di scartarle in silenzio, ed è
  essa stessa il meccanismo di scoperta. Il `<datalist>` nei due modali è il
  rimedio a monte: previene i refusi invece di curarli.
- Il declustering fa "mentire" la mappa di qualche decina di chilometri. La
  mitigazione è dichiarata: filo di richiamo verso il punto vero, una riga di
  testo sotto la mappa che lo spiega, e la lista come fonte precisa.

## Prove manuali consigliate (`npm run dev`)

Con i dati demo (`select public.seed_demo();`), aprire **Tornei → Mappa**:

- Cervia (arancio pieno col punto, 1°), Rimini (arancio soft, 2°) e Jesolo
  (vuoto, Gironi) **sulla costa adriatica**, non nell'entroterra.
- Un torneo a `"  RICCIONE  "` → pin nuovo accanto a Rimini, distanziato, col filo.
- Due tornei nella stessa città con piazzamenti diversi → un pin, colore del
  migliore, contatore a 2.
- Torneo rapido senza città → contato in "senza città", non è un pin.
- Città inventata → "Non ancora sulla mappa". Città estera → "Fuori dall'Italia",
  e l'Italia non si rimpicciolisce.
- A 360 px la mappa scala e la bottom nav resta a 6 slot.
- Tab attraverso le righe città; Invio espande; Invio su un torneo apre il dettaglio.
- Nel form torneo (completo e rapido), digitare "Cer" nel campo Città e verificare
  che compaiano i suggerimenti.

**Nessuna migration da applicare.** Se in futuro ne servisse una: via SQL Editor o
MCP `apply_migration`, **non** `supabase db push` (cronologia remota disallineata
— vedi `docs/QA-chi-ce-oggi.md`).
