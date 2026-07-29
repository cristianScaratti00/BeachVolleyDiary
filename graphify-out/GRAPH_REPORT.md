# Graph Report - BeachVolleyDiary  (2026-07-29)

## Corpus Check
- 129 files · ~153,421 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1025 nodes · 1929 edges · 61 communities (53 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5df6a648`
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

## God Nodes (most connected - your core abstractions)
1. `AnyForm` - 21 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 18 edges
4. `App()` - 17 edges
5. `deriveMappa()` - 16 edges
6. `compilerOptions` - 16 edges
7. `compilerOptions` - 16 edges
8. `deriveTorneoDetail()` - 15 edges
9. `Venue` - 14 edges
10. `SetField` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `renderScreen()`  [INFERRED]
  src/App.tsx → src/screens/ChiCeOggi.test.tsx
- `Gruppo` --references--> `Tournament`  [EXTRACTED]
  src/lib/derive.mappa.ts → src/lib/models.ts
- `HomeFilters` --references--> `Option`  [EXTRACTED]
  src/screens/Home.tsx → src/lib/models.ts
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/hooks/useAuth.tsx
- `App()` --calls--> `useIsWide()`  [EXTRACTED]
  src/App.tsx → src/hooks/useMedia.ts

## Import Cycles
- None detected.

## Communities (61 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (45): ConquisteMapProps, ITALIA, dotForRank(), cittaFuoriMappa(), deriveMappa(), formaDelPin(), grafiaPiuRecente(), Gruppo (+37 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (21): AuthContext, AuthContextValue, AuthResult, checkNameAvailable(), fetchProfile(), hasPasswordIdentity(), loginUser(), logoutUser() (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (23): getDashboardStats(), ServerDashboard, ServerPartnerRow, ServerPhaseRow, ServerPlacement, ServerTrendPoint, byAgendaDate(), deriveCompagni() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (14): PHASES, SURFACES, CreaChat(), DockProps, fieldStyle, FINISHED_PLACEMENTS, fmtDate(), Handlers (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (37): dependencies, html-to-image, leaflet, leaflet.markercluster, motion, react, react-dom, @supabase/supabase-js (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (36): deriveDiary(), deriveDiarySearch(), diario, entries(), entry(), DiaryEntry, DiarySearchFields, FULL_YEAR (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): WrappedData, WrappedSlide, Props, renderScreen(), Chip(), cervia, jesolo, renderMappa() (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (34): dependencies, html-to-image, leaflet, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (13): EmptyNote(), MeterRow(), PartnerCard(), PhaseCard(), PlacementCard(), PointsCard(), StyleWithVars, TrendCard() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (16): citySnapshot(), cleanCity(), EMPTY, ResolvedVenue, useDiary, Phase, AppUser, CompagnoForm (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (24): CompagnoMatchRow, DashboardData, DatedMatch, DiaryMatchHit, DiaryPhotoThumb, DiarySearchData, DiarySearchResult, entryContextFields() (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (6): PhotoLightboxProps, Shot, Badge(), TorneoDetailData, TorneoDetailProps, VenueMap

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (6): btnBase, dangerBtn, darkBtn, fieldStyle, labelStyle, primaryBtn

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (15): dashServer(), svDash(), deriveCompagno(), deriveDashboard(), deriveDashboardServer(), deriveStory(), deriveWrapped(), filteredMatches() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (18): deriveWhoIsHere(), getCompagniList(), getCompagnoDetail(), getTorneiList(), getTorneoDetail(), getWhoIsHere(), ok(), SvCompagno (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (13): nelPeriodo(), esitoStyle, MatchResult, res(), ResultKey, setChips(), Stats, WithSets (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (10): ENTRATA, MOLLA, MotionRootProps, SVELTO, MappaCitta, MappaData, MappaTier, MappaTorneoRow (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (11): #1 — Il sottotitolo della pagina non segue il filtro · media, #2 — Un filtro scartato si riattiva da solo · bassa, #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione), #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente), #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media, Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom) (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (6): StoryData, Palette, PaletteKey, PALETTES, StoryModalProps, VARIANTS

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (12): 1) Supabase CLI (consigliato), 1) Supabase CLI (solo per uno stack locale nuovo), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, Come applicare, Dati demo (opzionale), Prossimi passi, Struttura (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (12): Button(), EmptyCard(), FilterChips(), InlineLink(), PageHeader(), SectionTitle(), StatFooter(), RecentTornei() (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (13): BrandLockup(), BrandMark(), MotionRoot(), Sidebar(), AuthProvider(), useAuth(), FEATURES, inputStyle (+5 more)

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
Cohesion: 0.06
Nodes (32): dependencies, html-to-image, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights, devDependencies (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (17): Avatar(), BackLink(), BadgeSize, BadgeTone, btnBase, BtnVariant, FilterOption, MatchRow() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (11): ProfileRow, Session, Plan, Role, BASE_LIMITS, entitlements, PermissionAction, PermissionCheck (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (15): Accessibilità — perché il contorno dei pin non è una rifinitura, Cablaggio al data layer, Come è nato il tracciato dell'Italia, Cosa resta fuori, Cosa è stato verificato (automatico), Decisioni e assunzioni, Difetti noti (preesistenti, ereditati e resi visibili), Due scelte da non disfare per sbaglio (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (14): Json, Match, MatchScore, MatchSet, Partner, Photo, Profile, PublicSchema (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.23
Nodes (13): CATEGORIES, Category, Format, MatchTyped, MatchWithSets, Placement, PLANS, ROLES (+5 more)

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
Cohesion: 0.17
Nodes (18): decorateTournament(), deriveTorneoDetail(), deriveTorneoDetailServer(), dotFor(), formatLatLng(), torneoRow(), mapUrl(), normalizeCity() (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (9): BottomNavProps, Slot, SLOTS, SPEED_DIAL, VOCE, NAV, NavEntry, SidebarProps (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (11): Card del Diario raggiungibili da tastiera — come, e perché così, Come far girare la suite, Correzione: le query di restringimento (ruolo 2), Cosa è stato verificato (automatico), Da verificare a mano (resta fuori portata), Decisioni e assunzioni (documentate), Difetto trovato: due pulsanti di cancellazione nel campo, Follow-up (fuori scope, come da piano) (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (11): Automatico (`src/lib/derive.venues.server.test.ts`, 11 test), Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up, La decisione che cambia la forma dello schema, ⚠️ Limitazione nota: il merge di un luogo condiviso (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.31
Nodes (12): UseCheckInDeps, AnyForm, Option, SetField, Venue, CompagnoModalProps, FotoModalProps, PartitaModalProps (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (7): ConnectionSnackbar(), computeSlow(), getConnection(), NetworkInformation, subscribe(), useSlowConnection(), useIsWide()

### Community 52 - "Community 52"
Cohesion: 0.06
Nodes (38): resolveVenue(), parseLatLng(), venueLabel(), BIAS, cercaCitta(), cercaLuoghi(), chiediAPhoton(), CittaTrovata (+30 more)

### Community 53 - "Community 53"
Cohesion: 0.31
Nodes (9): fetchOwnCheckIn(), mapOwn(), OwnRow, useCheckIn, todayISO(), CheckIn, CheckInInput, PresentUser (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (8): FORMATS, PLACEMENTS, deriveTorneiSections(), groupTorneiByFormat(), splitUpcoming(), torneiFormats(), Tornei(), makeTorneo()

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (15): SetsApi, noteStyle, setInput, Actions(), ActionsProps, inputStyle, Label(), selectStyle (+7 more)

## Knowledge Gaps
- **417 isolated node(s):** `allow`, `name`, `private`, `version`, `type` (+412 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnyForm` connect `Community 50` to `Community 2`, `Community 3`, `Community 9`, `Community 41`, `Community 52`, `Community 53`, `Community 56`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Option` connect `Community 50` to `Community 3`, `Community 8`, `Community 9`, `Community 10`, `Community 41`, `Community 56`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Screen` connect `Community 47` to `Community 9`, `Community 2`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `allow`, `name`, `private` to the rest of the system?**
  _417 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06440677966101695 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._