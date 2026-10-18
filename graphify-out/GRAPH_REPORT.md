# Graph Report - 66c99f24-3003-4f0b-9972-a7e02fa9cea1  (2026-10-18)

## Corpus Check
- 150 files · ~199,755 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1284 nodes · 2316 edges · 92 communities (84 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19bf2287`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]

## God Nodes (most connected - your core abstractions)
1. `AnyForm` - 22 edges
2. `ART_DIRECTION.md: "Bagnasciuga"` - 19 edges
3. `UX.md: refactor "Liquid Glass" e nuova architettura dei flussi` - 19 edges
4. `compilerOptions` - 18 edges
5. `compilerOptions` - 18 edges
6. `App()` - 17 edges
7. `deriveTorneoDetail()` - 17 edges
8. `deriveMappa()` - 16 edges
9. `compilerOptions` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `renderScreen()`  [INFERRED]
  src/App.tsx → src/screens/ChiCeOggi.test.tsx
- `Sidebar()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Sidebar.tsx → src/hooks/useAuth.tsx
- `Gruppo` --references--> `Tournament`  [EXTRACTED]
  src/lib/derive.mappa.ts → src/lib/models.ts
- `Tornei()` --calls--> `deriveTorneiSections()`  [EXTRACTED]
  src/screens/Tornei.tsx → src/lib/derive.ts
- `HomeFilters` --references--> `Option`  [EXTRACTED]
  src/screens/Home.tsx → src/lib/models.ts

## Import Cycles
- None detected.

## Communities (92 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (44): ConquisteMapProps, ITALIA, dotForRank(), cittaFuoriMappa(), deriveMappa(), formaDelPin(), grafiaPiuRecente(), Gruppo (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.24
Nodes (12): checkNameAvailable(), fetchProfile(), hasPasswordIdentity(), loginUser(), logoutUser(), NameCheck, registerUser(), sessionForUser() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (17): byAgendaDate(), deriveCompagni(), deriveCompagniServer(), deriveCompagnoDetailServer(), deriveTorneiList(), deriveTorneiListServer(), partnerOptions(), tournamentOptions() (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (12): CreaChat(), DockProps, fieldStyle, FINISHED_PLACEMENTS, fmtDate(), Handlers, initialDraft(), LABEL_COLORS (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): dependencies, html-to-image, leaflet, leaflet.markercluster, @microsoft/clarity, motion, react, react-dom (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (18): deriveDiary(), diario, entries(), entry(), FULL_YEAR, kinds(), seasonRich(), seasonWith() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (15): 0. Sintesi, 10. Mappa d'uso del vetro, 11. Immagini esportate (Storia e Wrapped), 12. Contenuti e microcopy, 13. Analytics: contratto da preservare, 15.1 Già deciso dall'utente (da non riaprire), 15.2 Domande aperte (con la risposta raccomandata), 15. Decisioni prese e domande aperte (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (34): dependencies, html-to-image, leaflet, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (15): EmptyNote(), MeterRow(), PartnerCard(), PhaseCard(), PlacementCard(), PointsCard(), StyleWithVars, TrendCard() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (24): citySnapshot(), cleanCity(), EMPTY, ResolvedVenue, useDiary, Bracket, Category, Format (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (24): CompagnoMatchRow, DashboardData, DatedMatch, DiaryMatchHit, DiaryPhotoThumb, DiarySearchData, DiarySearchResult, entryContextFields() (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (40): metaStyle, quando(), RigaSegnalazione(), aggiornaStato, elencoSegnalazioni, BackLink(), PageHeader(), aggiornaStato() (+32 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (15): fetchOwnCheckIn(), mapOwn(), OwnRow, useCheckIn, todayISO(), CheckIn, CheckInInput, PresentUser (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (18): deriveWhoIsHere(), getCompagniList(), getCompagnoDetail(), getTorneiList(), getTorneoDetail(), getWhoIsHere(), ok(), SvCompagno (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (9): resolveVenue(), parseLatLng(), venueLabel(), hintStyle, miniBtn, NewVenueFields(), panelStyle, SelectedVenueNote() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (16): PLACEMENTS, decorateTournament(), dotFor(), nelPeriodo(), torneoRow(), esitoStyle, fmtDate(), MatchResult (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (11): FilterChips(), SegmentedControl(), MappaCitta, MappaData, MappaTier, MappaTorneoRow, TorneiListData, ConquisteMap (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (11): #1 — Il sottotitolo della pagina non segue il filtro · media, #2 — Un filtro scartato si riattiva da solo · bassa, #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione), #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente), #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media, Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom) (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (6): StoryData, Palette, PaletteKey, PALETTES, StoryModalProps, VARIANTS

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (13): 1) Supabase CLI (consigliato), 1) Supabase CLI (solo per uno stack locale nuovo), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, `bug_reports` — l'altra asimmetria: owner in scrittura, admin in lettura, Come applicare, Dati demo (opzionale), Prossimi passi (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (7): MatchRow(), deriveDiarySearch(), DiaryEntry, Diario(), DiarioProps, searchField, srOnly

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (9): BRACKETS, CATEGORIES, MatchTyped, MatchWithSets, PHASES, PLANS, ROLES, SURFACES (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): Avvio, 🏐 Beach Volley Diary, Design tokens, Funzionalità, Struttura, Test

### Community 26 - "Community 26"
Cohesion: 0.53
Nodes (5): contrast(), flatten(), luminance(), parse(), RGB

### Community 27 - "Community 27"
Cohesion: 0.53
Nodes (4): name, organization_id, organization_slug, ref

### Community 29 - "Community 29"
Cohesion: 0.05
Nodes (38): dependencies, html-to-image, leaflet, leaflet.markercluster, @microsoft/clarity, motion, react, react-dom (+30 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (14): Avatar(), Badge(), BadgeSize, BadgeTone, btnBase, BtnVariant, Button(), FilterOption (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (24): BottomNavProps, ELENCO, NAV_LABEL, Slot, SLOTS, SPEED_DIAL, TONI, Tono (+16 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (15): Accessibilità — perché il contorno dei pin non è una rifinitura, Cablaggio al data layer, Come è nato il tracciato dell'Italia, Cosa resta fuori, Cosa è stato verificato (automatico), Decisioni e assunzioni, Difetti noti (preesistenti, ereditati e resi visibili), Due scelte da non disfare per sbaglio (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.09
Nodes (20): WrappedData, WrappedSlide, Chip(), WRAPPED_PALETTES, wrappedPalette, overlayStyle, pad2(), ancore (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (15): dialog(), velo(), accendi(), analiticiAttivi(), annuncia(), ascoltatori, avviaTracciamentoSeConsentito(), clarityCaricato() (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (7): Come far girare la suite, Cosa è stato verificato (automatico), ⚠️ Da applicare / verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up (fuori scope, come da piano), Limitazioni note, QA — "Chi c'è oggi?" (check-in + stanza reciproca)

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): Avvio, 🏐 Beach Volley Diary, Design tokens, Funzionalità, Struttura

### Community 46 - "Community 46"
Cohesion: 0.23
Nodes (13): deriveTorneoDetail(), deriveTorneoDetailServer(), formatLatLng(), mapUrl(), normalizeCity(), venueDisplay(), venueHistory, venueHistoryLabel() (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (8): PhotoLightboxProps, Shot, StatGrid(), StatTile(), KeyNumbers(), TorneoDetailData, TorneoDetailProps, VenueMap

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (11): Card del Diario raggiungibili da tastiera — come, e perché così, Come far girare la suite, Correzione: le query di restringimento (ruolo 2), Cosa è stato verificato (automatico), Da verificare a mano (resta fuori portata), Decisioni e assunzioni (documentate), Difetto trovato: due pulsanti di cancellazione nel campo, Follow-up (fuori scope, come da piano) (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (11): Automatico (`src/lib/derive.venues.server.test.ts`, 11 test), Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up, La decisione che cambia la forma dello schema, ⚠️ Limitazione nota: il merge di un luogo condiviso (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.26
Nodes (13): deriveCompagno(), deriveDashboard(), deriveStory(), deriveWrapped(), filteredMatches(), fmtDateFull(), matchesWithDates(), partnerName() (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (7): HarnessProps, renderTornei(), RIQUADRO_MAPPA, TorneiProps, TorneiVista, makeList(), makeTorneo()

### Community 52 - "Community 52"
Cohesion: 0.08
Nodes (29): BIAS, cercaCitta(), cercaLuoghi(), chiediAPhoton(), CittaTrovata, comuneDi(), contestoDi(), coordinateDi() (+21 more)

### Community 53 - "Community 53"
Cohesion: 0.24
Nodes (9): getDashboardStats(), ServerDashboard, ServerPartnerRow, ServerPhaseRow, ServerPlacement, ServerTrendPoint, dashServer(), svDash() (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.48
Nodes (5): FORMATS, deriveTorneiSections(), groupTorneiByFormat(), splitUpcoming(), torneiFormats()

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (15): SetsApi, noteStyle, setInput, Actions(), ActionsProps, inputStyle, Label(), selectStyle (+7 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (13): 5. Flussi, F0. Avvio e autenticazione, F10. Segnala un problema e bacheca admin, F11. Assistente guidato, F1. Primo avvio (account appena creato), F2. Creare un torneo (sheet unificato), F3. Aggiungere una partita, F4. Ritrovare un torneo (Tornei) (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (11): ProfileRow, Session, Plan, Role, BASE_LIMITS, entitlements, PermissionAction, PermissionCheck (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.32
Nodes (12): UseCheckInDeps, AnyForm, Option, SetField, Venue, CompagnoModalProps, FotoModalProps, PartitaModalProps (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (15): BugReport, Json, Match, MatchScore, MatchSet, Partner, Photo, Profile (+7 more)

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (5): Database, supabase, hintStyle, Msg, readOnlyStyle

### Community 65 - "Community 65"
Cohesion: 0.30
Nodes (9): bottone(), ConsensoCookie(), AuthContext, AuthContextValue, AuthProvider(), AuthResult, OAuthProvider, useScelta() (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (11): 0. In una frase, 12. Il livello dei token: come si usa, 13. Migrazione dal linguaggio vecchio, 14. Il test "admin Bootstrap", 15. Dove questo documento corregge UX.md e il piano, 16. Seam per i ruoli successivi, 1. Estendere o spingere: la decisione, 7. Elevazione e ombre (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (4): carica(), consent, init, Modulo

### Community 68 - "Community 68"
Cohesion: 0.21
Nodes (5): Props, renderScreen(), Props, expectNoA11yViolations(), makePresentUser()

### Community 69 - "Community 69"
Cohesion: 0.17
Nodes (12): 6.0 Stati trasversali (valgono per ogni schermata di dati), 6.10 Assistente `/crea`, 6.1 Home `/`, 6.2 Statistiche `/statistiche`, 6.3 Tornei `/tornei[/timeline|/mappa]`, 6.4 Dettaglio torneo `/tornei/:id`, 6.5 Visori: Storia, Wrapped, Foto, 6.6 Compagni `/compagni` e `/compagni/:id` (+4 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (12): 7.10 SegmentedControl e FilterChips, 7.11 Altri controlli, 7.1 TabBar (sotto i 900px), 7.2 Sidebar (dai 900px in su), 7.3 NavBar con large title, 7.4 Action sheet del ＋ e popover desktop, 7.5 Sheet (restyle di `Sheet.tsx`), 7.6 Card cliccabili e righe (difetti #4 e #5) (+4 more)

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (7): ConnectionSnackbar(), computeSlow(), getConnection(), NetworkInformation, subscribe(), useSlowConnection(), useIsWide()

### Community 72 - "Community 72"
Cohesion: 0.24
Nodes (10): DiarySearchFields, cervia, jesolo, renderMappa(), rimini, spiaMappa, DiaryEntryOver, makeMappaData() (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (11): 4.10 Primo caricamento fallito: come riconoscerlo senza toccare `useDiary`, 4.1 Tabella delle rotte, 4.2 Semantica della history, 4.3 Sheet, dialoghi e visori nella history, 4.4 Gestione del focus al cambio di rotta, 4.5 Autenticazione e deep link, 4.6 Gating funzionale, 4.7 Vercel e service worker (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.24
Nodes (7): EmptyCard(), InlineLink(), SectionTitle(), RecentTornei(), CompagnoDetailData, CompagnoDetailProps, searchInput

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (8): useAuth(), FEATURES, inputStyle, Login(), Mode, seg(), Profilo(), Root()

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (10): 8.1 Difetti accertati da chiudere, 8.2 Percorsi da tastiera, 8.3 Focus: regole, 8.4 Ruoli e attributi ARIA, 8.5 Contrasto: obiettivi e calcolo sul vetro, 8.6 Bersagli tattili, 8.7 Movimento e trasparenza, 8.8 Testo, zoom e lingua (+2 more)

### Community 77 - "Community 77"
Cohesion: 0.25
Nodes (5): dati, searchBox(), type(), makeDiaryEntry(), makeDiaryMatchHit()

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (8): 4.1 Principio, 4.2 Ruoli semantici: tema chiaro (attivo), 4.3 Le regole del colore, 4.4 Il testo sul vetro (fondo peggiore), 4.5 I colori dei dati, 4.6 Tema scuro: predisposto, non attivo, 4.7 Palette dei PNG esportati (Storia e Wrapped, `⟂ F4`), 4. Colore

### Community 79 - "Community 79"
Cohesion: 0.57
Nodes (5): isSubsequence(), matchesAllTokens(), normalizeText(), tokenize(), tokenMatchesField()

### Community 80 - "Community 80"
Cohesion: 0.60
Nodes (5): contrast(), luminance(), over(), parseColor(), RGB

### Community 81 - "Community 81"
Cohesion: 0.40
Nodes (5): 10.1 Il set di icone (estensione di `NavIcons.tsx`, `⟂ F2`), 10.2 Il marchio, 10.3 Immagini, 10.4 La tela dei PNG (Storia 1080×1920 e Wrapped, `⟂ F4`), 10. Iconografia e immagini

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (5): 2.1 Aggettivi (in ordine di priorità), 2.2 Riferimenti (cosa si prende da ognuno), 2.3 Anti-riferimenti (se ci somiglia, è sbagliato), 2.4 Le sei mosse firmate, 2. Direzione estetica

### Community 83 - "Community 83"
Cohesion: 0.40
Nodes (5): 9.1 Il principio: il vetro si guadagna, 9.2 I cinque materiali, 9.3 Come si applica, 9.4 Fallback (in `tokens.css` e `materials.css`), 9. Materiali: il vetro

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (4): 11.1 Vocabolario (allineato a `Motion.tsx`, verificato da `tokens.test.ts`), 11.2 Cosa si anima, 11.3 Cosa NON si anima, di proposito, 11. Movimento

### Community 85 - "Community 85"
Cohesion: 0.50
Nodes (4): 3.1 Famiglie, 3.2 Scala, 3.3 Regole, 3. Tipografia

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (4): 5.1 Scala (passi di 4), 5.2 Ritmo, 5.3 Costanti di layout, 5. Spazio e layout

### Community 87 - "Community 87"
Cohesion: 0.50
Nodes (4): 6.1 Scala, 6.2 Concentricità, 6.3 Grammatica, 6. Raggi e grammatica delle forme

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (4): 14.1 Contratti che cambiano, 14.2 Test nuovi richiesti dalla specifica, 14.3 Verifiche manuali (fuori dalla portata di jsdom), 14. Impatto sui test

### Community 89 - "Community 89"
Cohesion: 0.50
Nodes (4): 3.1 Mappa del sito, 3.2 Glossario dell'interfaccia, 3.3 Stato condiviso che attraversa le schermate, 3. Architettura dell'informazione

### Community 90 - "Community 90"
Cohesion: 0.50
Nodes (4): 9.1 Breakpoint, 9.2 Per schermata, 9.3 Aree sicure, tastiera e orientamento, 9. Comportamento responsive

## Knowledge Gaps
- **573 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+568 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnyForm` connect `Community 62` to `Community 2`, `Community 3`, `Community 9`, `Community 14`, `Community 16`, `Community 52`, `Community 56`, `Community 24`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `expectNoA11yViolations()` connect `Community 68` to `Community 72`, `Community 41`, `Community 40`, `Community 77`, `Community 51`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 75` to `Community 64`, `Community 65`, `Community 2`, `Community 38`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _573 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06545879602571596 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10276679841897234 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._