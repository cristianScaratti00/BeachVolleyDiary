# Graph Report - 66c99f24-3003-4f0b-9972-a7e02fa9cea1  (2026-07-24)

## Corpus Check
- 106 files · ~81,818 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 787 nodes · 1495 edges · 46 communities (42 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5db3cdfd`
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

## God Nodes (most connected - your core abstractions)
1. `App()` - 18 edges
2. `AnyForm` - 18 edges
3. `compilerOptions` - 18 edges
4. `compilerOptions` - 18 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `deriveMappa()` - 14 edges
8. `Option` - 14 edges
9. `Tournament` - 13 edges
10. `SetField` - 12 edges

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

## Communities (46 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (66): EMPTY, useDiary, CATEGORIES, Category, Format, MatchTyped, MatchWithSets, Phase (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (42): Sidebar(), AuthContext, AuthContextValue, AuthProvider(), useAuth(), AuthResult, checkNameAvailable(), fetchProfile() (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.22
Nodes (7): BottomNavProps, Slot, SLOTS, NAV, NavEntry, SidebarProps, Screen

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): dependencies, html-to-image, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights, devDependencies (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (32): dependencies, html-to-image, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights, devDependencies (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.28
Nodes (14): FULL_YEAR, kinds(), seasonRich(), seasonWith(), slideOf(), WrappedSlideKind, SetScore, lossSets() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (15): WrappedData, WrappedSlide, Chip(), WRAPPED_PALETTES, wrappedPalette, overlayStyle, pad2(), makeWrapped() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (10): Button(), EmptyCard(), InlineLink(), PageHeader(), SectionTitle(), StatFooter(), CompagnoCard, DiaryEntry (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (14): EmptyNote(), MeterRow(), PartnerCard(), PhaseCard(), PlacementCard(), PointsCard(), RecentTornei(), StyleWithVars (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (5): PhotoLightboxProps, Shot, Badge(), TorneoDetailData, TorneoDetailProps

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (18): CompagnoMatchRow, DashboardData, DatedMatch, DiaryPhotoThumb, makeWrappedRange(), PartnerRow, PhaseRow, PLACEMENT_LABELS (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (21): BrandLockup(), BrandMark(), byAgendaDate(), deriveCompagni(), deriveCompagniServer(), deriveCompagnoDetailServer(), deriveDiary(), deriveTorneiList() (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): Database, Json, Match, MatchScore, MatchSet, Partner, Photo, Profile (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (20): decorateTournament(), deriveCompagno(), deriveDashboard(), deriveDashboardServer(), deriveStory(), deriveTorneoDetail(), deriveWrapped(), dotFor() (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (15): getCompagniList(), getCompagnoDetail(), getTorneiList(), getTorneoDetail(), getWhoIsHere(), ok(), SvCompagno, SvCompagnoDetail (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (13): nelPeriodo(), esitoStyle, MatchResult, res(), ResultKey, setChips(), Stats, WithSets (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (17): Avatar(), BackLink(), BadgeSize, BadgeTone, btnBase, BtnVariant, FilterOption, MatchRow() (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (11): #1 — Il sottotitolo della pagina non segue il filtro · media, #2 — Un filtro scartato si riattiva da solo · bassa, #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione), #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente), #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media, Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom) (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (6): StoryData, Palette, PaletteKey, PALETTES, StoryModalProps, VARIANTS

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (10): 1) Supabase CLI (consigliato), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, Come applicare, Dati demo (opzionale), Prossimi passi, Struttura, Supabase — Beach Volley Diary (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.39
Nodes (6): FORMATS, deriveTorneiSections(), groupTorneiByFormat(), splitUpcoming(), torneiFormats(), Tornei()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (19): dotForRank(), cittaFuoriMappa(), deriveMappa(), formaDelPin(), grafiaPiuRecente(), Gruppo, MappaLegendaRow, mappaSubtitle() (+11 more)

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
Cohesion: 0.10
Nodes (17): fetchOwnCheckIn(), mapOwn(), OwnRow, useCheckIn, UseCheckInDeps, deriveWhoIsHere(), todayISO(), CheckIn (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (10): FilterChips(), MappaCitta, MappaData, MappaPin, MappaTier, MappaTorneoRow, TorneiListData, MappaProps (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (14): Props, renderScreen(), cervia, jesolo, renderMappa(), rimini, renderTornei(), expectNoA11yViolations() (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (14): normalizeCity(), ALIASES, CITTA_SUGGERITE, GAZETTEER, GeoPoint, PinSeed, PlacedPin, PREFISSI (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (14): Accessibilità — perché il contorno dei pin non è una rifinitura, Come è nato il tracciato dell'Italia, Cosa resta fuori, Cosa è stato verificato (automatico), Decisioni e assunzioni, Difetti noti (preesistenti, ereditati e resi visibili), Due scelte da non disfare per sbaglio, Il modo silenzioso in cui questa feature si rompe (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (7): ConnectionSnackbar(), computeSlow(), getConnection(), NetworkInformation, subscribe(), useSlowConnection(), useIsWide()

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (7): Come far girare la suite, Cosa è stato verificato (automatico), ⚠️ Da applicare / verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up (fuori scope, come da piano), Limitazioni note, QA — "Chi c'è oggi?" (check-in + stanza reciproca)

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (6): getDashboardStats(), ServerDashboard, ServerPartnerRow, ServerPhaseRow, ServerPlacement, ServerTrendPoint

## Knowledge Gaps
- **312 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+307 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Option` connect `Community 0` to `Community 8`, `Community 10`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `AnyForm` connect `Community 0` to `Community 12`, `Community 29`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 2`, `Community 12`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _312 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05083986562150056 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06516290726817042 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._