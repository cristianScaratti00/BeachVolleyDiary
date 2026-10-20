# QA della landing `/presentazione`

La landing dalla tavola «Landing page» di Claude Design ([UX.md](../UX.md), Parte L) come lista di controllo: per ogni cosa, **dove** è verificata. Tre livelli, come per l'app ([QA-refactor.md](QA-refactor.md)):

- **jsdom**: Vitest e axe (`npm test`). La pagina non ha JavaScript, quindi si legge come testo:
  - [`landing.test.ts`](../src/test/landing.test.ts): CSP, meta, struttura, porte dell'app, immagini, l'apertura della Home, sprite e marchio, regole dei fogli (anche fotogrammi e reduced-motion), axe;
  - [`landing.tokens.test.ts`](../src/styles/landing.tokens.test.ts): i contrasti dei token e la riserva metrica di Geist.
- **browser**: [`docs/qa/landing.mjs`](qa/landing.mjs) sulla **build di produzione** (`npx vite preview --port 5199`), Chrome headless su CDP 9343. Layout per larghezza, anello di focus con la sua visibilità in pixel, la fila dei telefoni, bersagli, CLS, reduced-motion, l'apertura della Home, prestazioni a CPU 4× e richieste di rete. I risultati sono in [POLISH.md](../POLISH.md), Parte L.
- **manuale**: quello che serve un dispositivo vero.

Il giro di oggi: 2026-10-20 (dopo la rifinitura), Chrome headless (macOS). Larghezze 320 · 360 · 390 · 768 · 820 · 1024 · 1280 · 1440, più il telefono in orizzontale (844 × 390).

## La pagina

| Che cosa | jsdom | browser | manuale |
|---|---|---|---|
| Niente script, niente stili in linea, niente risorse da altri host | `landing.test.ts › CSP` | `landing.mjs rete` (13 richieste, tutte al sito) | — |
| Titolo, description, canonical, og:*, theme-color | `landing.test.ts › documento e meta` | — | anteprima del link in un'app di messaggi |
| Le quattro sezioni in ordine, ognuna col suo titolo; testata fuori da `<main>` | `landing.test.ts › struttura` | — | — |
| Id unici, riferimenti ARIA e ancore che esistono | `landing.test.ts › struttura` | — | — |
| Nessun modulo: la registrazione resta nell'app | `landing.test.ts › le porte dell'app` | — | — |
| Ogni link verso l'app apre la vista giusta (`?accesso=registrati` / `accedi`) | `landing.test.ts › le porte dell'app`; `Login.test.tsx › il deep link ?accesso=` | — | da iPhone: «Crea il tuo diario» apre Registrati |
| Le schermate: file veri, 390 × 844, testo alternativo, hero subito e le altre lazy | `landing.test.ts › le schermate dei telefoni` | `landing.mjs sweep` (nessuna immagine senza misure) | — |
| Le nove carte delle funzionalità, ognuna un titolo e una riga | `landing.test.ts › struttura` | — | — |
| Il giro: sei momenti in un elenco ordinato (titolo, frase, schermata), la barra decorativa, il foglio che conosce sei momenti | `landing.test.ts › il giro di #schermate` | — | — |
| L'apertura: fasce e tabellone decorativi e senza testo, coerenti con `misure.css` (generato), la Home senza cifre chiesta solo col movimento | `landing.test.ts › l'apertura della Home nel telefono dell'hero` | — | — |
| Marchio e icone dall'app, e nessuna direttiva rimasta | `landing.test.ts › componiLanding` | — | — |

## Accessibilità

| Che cosa | jsdom | browser | manuale |
|---|---|---|---|
| axe | `landing.test.ts › axe` (WCAG 2.1 A/AA) | `landing.mjs axe` (2.0/2.1/2.2 AA e best practice, a 390 e 1280): 0 violazioni | VoiceOver su iPhone |
| Giro del Tab: salto, testata, porte dell'hero e del finale | — | `landing.mjs tab`: 7 fermate a 390, 10 a 1280, nessun anello mancante, tagliato o coperto, tutti ≥ 3 | — |
| Bersagli ≥ 44 | — | `landing.mjs targets`: nessuno sotto 44 | — |
| Contrasti del testo, dell'anello e dei pulsanti | `landing.tokens.test.ts` | — | — |

## Layout e movimento

| Che cosa | jsdom | browser | manuale |
|---|---|---|---|
| Niente scroll orizzontale né testo che esce, da 320 a 1440 | — | `landing.mjs sweep`: pulito a ogni larghezza e a 844 × 390 | iPhone in orizzontale (la tacca) |
| Il punto di rottura a 820 (testata, hero impilato, spazi più stretti) e le soglie del telefono: 760 (nel giro il testo sopra o sotto il telefono), 600 (le carte in un gruppo), 480 (porte una per riga) | — | `landing.mjs sweep` a 820, 768, 390, 360, 320 | — |
| CLS col font in ritardo | `landing.tokens.test.ts › la riserva metrica di Geist` | `landing.mjs cls`: 0 a 390, 0.0001 a 1280 | — |
| Si muovono la pressione, l'apertura e il giro; solo `transform`, `opacity`, `visibility`; ogni animazione dentro `prefers-reduced-motion: no-preference`; colori dell'hover senza transizione; hover solo col puntatore | `landing.test.ts › CSS della landing` | `landing.mjs reduced`: niente in moto, pressione a 1 | — |
| L'apertura: a tempo su tablet e desktop, legata allo scroll sul telefono; a fine corsa resta la Home vera | — | `landing.mjs apertura` a 390, 768, 1280 e 844 × 390 | Safari 26 su iPhone: le cifre che scattano scorrendo |
| Il giro: la scena ferma e un momento per tratto; l'elenco fermo con reduced-motion e sotto i 500px di altezza | — | `landing.mjs giro` a 390, 1280 e 844 × 390 | Safari 26 su iPhone: la scena con le barre del browser che si chiudono |
| Prestazioni | — | `landing.mjs perf` (CPU 4×): FCP 60–64ms, TBT 0, nessun fotogramma lento | rete lenta vera |

## Non verificato

- Safari su iPhone e Chrome su Android veri: il giro sopra è in Chrome headless, con lo user agent di Safari sotto i 900px. Le animazioni legate allo scroll (l'apertura sul telefono, il giro) sono verificate solo nel motore di Chrome.
- L'anteprima del link (`og.png`) nelle app che la mostrano.
