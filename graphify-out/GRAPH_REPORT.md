# Graph Report - 66c99f24-3003-4f0b-9972-a7e02fa9cea1  (2026-07-24)

## Corpus Check
<<<<<<< HEAD
- 106 files · ~83,501 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 793 nodes · 1505 edges · 48 communities (44 shown, 4 thin omitted)
=======
- 104 files · ~75,796 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 725 nodes · 1409 edges · 47 communities (42 shown, 5 thin omitted)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
<<<<<<< HEAD
- Built from commit: `f03c3edf`
=======
- Built from commit: `a8abd8b3`
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98
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
<<<<<<< HEAD
- [[_COMMUNITY_Community 47|Community 47]]

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
=======

## God Nodes (most connected - your core abstractions)
1. `AnyForm` - 20 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 18 edges
4. `App()` - 17 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `deriveTorneoDetail()` - 15 edges
8. `SetField` - 14 edges
9. `Option` - 14 edges
10. `Venue` - 13 edges
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `renderScreen()`  [INFERRED]
  src/App.tsx → src/screens/ChiCeOggi.test.tsx
<<<<<<< HEAD
- `Gruppo` --references--> `Tournament`  [EXTRACTED]
  src/lib/derive.mappa.ts → src/lib/models.ts
=======
- `Sidebar()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Sidebar.tsx → src/hooks/useAuth.tsx
- `Tornei()` --calls--> `deriveTorneiSections()`  [EXTRACTED]
  src/screens/Tornei.tsx → src/lib/derive.ts
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98
- `HomeFilters` --references--> `Option`  [EXTRACTED]
  src/screens/Home.tsx → src/lib/models.ts
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/hooks/useAuth.tsx
<<<<<<< HEAD
- `App()` --calls--> `useIsWide()`  [EXTRACTED]
  src/App.tsx → src/hooks/useMedia.ts
=======
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

## Import Cycles
- None detected.

<<<<<<< HEAD
## Communities (48 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (66): EMPTY, useDiary, CATEGORIES, Category, Format, MatchTyped, MatchWithSets, Phase (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (12): ProfileRow, Session, Plan, Role, BASE_LIMITS, entitlements, PermissionAction, PermissionCheck (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (9): BottomNavProps, Slot, SLOTS, BrandLockup(), BrandMark(), NAV, NavEntry, SidebarProps (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): dependencies, html-to-image, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights, devDependencies (+24 more)
=======
## Communities (47 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (44): EMPTY, ResolvedVenue, useDiary, CATEGORIES, Category, Format, MatchTyped, MatchWithSets (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (16): AuthContext, AuthContextValue, AuthProvider(), AuthResult, fetchProfile(), hasPasswordIdentity(), loginUser(), logoutUser() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (40): BottomNavProps, Slot, SLOTS, BrandLockup(), BrandMark(), NAV, NavEntry, Sidebar() (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (30): UseCheckInDeps, AnyForm, Option, SetField, SetsApi, Venue, CompagnoModalProps, FotoModalProps (+22 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): dependencies, html-to-image, leaflet, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights (+26 more)

### Community 5 - "Community 5"
<<<<<<< HEAD
Cohesion: 0.27
Nodes (11): checkNameAvailable(), fetchProfile(), hasPasswordIdentity(), loginUser(), NameCheck, registerUser(), sessionForUser(), signInWithProvider() (+3 more)
=======
Cohesion: 0.09
Nodes (27): FORMATS, deriveTorneiSections(), groupTorneiByFormat(), splitUpcoming(), torneiFormats(), FULL_YEAR, kinds(), seasonRich() (+19 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (15): WrappedData, WrappedSlide, Chip(), WRAPPED_PALETTES, wrappedPalette, overlayStyle, pad2(), makeWrapped() (+7 more)

### Community 7 - "Community 7"
<<<<<<< HEAD
Cohesion: 0.16
Nodes (10): Button(), EmptyCard(), InlineLink(), PageHeader(), SectionTitle(), StatFooter(), CompagnoCard, DiaryEntry (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (14): EmptyNote(), MeterRow(), PartnerCard(), PhaseCard(), PlacementCard(), PointsCard(), RecentTornei(), StyleWithVars (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (5): PhotoLightboxProps, Shot, Badge(), TorneoDetailData, TorneoDetailProps

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (21): CompagnoMatchRow, DashboardData, DatedMatch, deriveWhoIsHere(), DiaryPhotoThumb, makeWrappedRange(), normalizeCity(), PartnerRow (+13 more)
=======
Cohesion: 0.19
Nodes (8): Button(), EmptyCard(), PageHeader(), StatFooter(), CompagnoCard, DiaryEntry, CompagniProps, DiarioProps

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (13): EmptyNote(), MeterRow(), PartnerCard(), PhaseCard(), PlacementCard(), PointsCard(), StyleWithVars, TrendCard() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (6): PhotoLightboxProps, Shot, Badge(), TorneoDetailData, TorneoDetailProps, VenueMap

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (19): CompagnoMatchRow, DashboardData, DatedMatch, DiaryPhotoThumb, LatLng, makeWrappedRange(), PartnerRow, PhaseRow (+11 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.11
<<<<<<< HEAD
Nodes (24): getDashboardStats(), ServerDashboard, ServerPartnerRow, ServerPhaseRow, ServerPlacement, ServerTrendPoint, byAgendaDate(), deriveCompagni() (+16 more)
=======
Nodes (15): fetchOwnCheckIn(), mapOwn(), OwnRow, useCheckIn, todayISO(), CheckIn, CheckInInput, PresentUser (+7 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 14 - "Community 14"
<<<<<<< HEAD
Cohesion: 0.14
Nodes (13): Json, Match, MatchScore, MatchSet, Partner, Photo, Profile, PublicSchema (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (12): deriveCompagno(), deriveDashboard(), deriveStory(), deriveWrapped(), filteredMatches(), fmtDateFull(), matchesWithDates(), partnerObj() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (14): getCompagniList(), getCompagnoDetail(), getTorneiList(), getTorneoDetail(), getWhoIsHere(), ok(), SvCompagno, SvCompagnoDetail (+6 more)
=======
Cohesion: 0.12
Nodes (15): Database, Json, Match, MatchScore, MatchSet, Partner, Photo, Profile (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (12): ProfileRow, Session, Plan, Role, BASE_LIMITS, entitlements, PermissionAction, PermissionCheck (+4 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 18 - "Community 18"
<<<<<<< HEAD
Cohesion: 0.13
Nodes (17): Avatar(), BackLink(), BadgeSize, BadgeTone, btnBase, BtnVariant, FilterOption, MatchRow() (+9 more)
=======
Cohesion: 0.15
Nodes (14): BackLink(), BadgeSize, BadgeTone, btnBase, BtnVariant, FilterOption, MatchRow(), MatchRowProps (+6 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (11): #1 — Il sottotitolo della pagina non segue il filtro · media, #2 — Un filtro scartato si riattiva da solo · bassa, #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione), #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente), #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media, Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom) (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (6): StoryData, Palette, PaletteKey, PALETTES, StoryModalProps, VARIANTS

### Community 21 - "Community 21"
<<<<<<< HEAD
Cohesion: 0.17
Nodes (10): 1) Supabase CLI (consigliato), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, Come applicare, Dati demo (opzionale), Prossimi passi, Struttura, Supabase — Beach Volley Diary (+2 more)
=======
Cohesion: 0.14
Nodes (12): 1) Supabase CLI (consigliato), 1) Supabase CLI (solo per uno stack locale nuovo), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, Come applicare, Dati demo (opzionale), Prossimi passi, Struttura (+4 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

### Community 22 - "Community 22"
Cohesion: 0.23
Nodes (13): deriveDiary(), deriveTorneoDetail(), deriveTorneoDetailServer(), formatLatLng(), mapUrl(), venueDisplay(), venueHistory, venueHistoryLabel() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 24 - "Community 24"
<<<<<<< HEAD
Cohesion: 0.08
Nodes (32): cittaFuoriMappa(), deriveMappa(), formaDelPin(), grafiaPiuRecente(), Gruppo, MappaLegendaRow, mappaSubtitle(), nelPeriodo() (+24 more)
=======
Cohesion: 0.14
Nodes (12): esitoStyle, MatchResult, res(), ResultKey, setChips(), Stats, WithSets, yearOf() (+4 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98

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
<<<<<<< HEAD
Cohesion: 0.10
Nodes (16): fetchOwnCheckIn(), mapOwn(), OwnRow, useCheckIn, UseCheckInDeps, todayISO(), CheckIn, CheckInInput (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (10): FilterChips(), MappaCitta, MappaData, MappaPin, MappaTier, MappaTorneoRow, TorneiListData, MappaProps (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (32): mappa(), FULL_YEAR, kinds(), seasonRich(), seasonWith(), slideOf(), WrappedSlideKind, SetScore (+24 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (9): Sidebar(), useAuth(), FEATURES, inputStyle, Login(), Mode, seg(), Profilo() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (15): Accessibilità — perché il contorno dei pin non è una rifinitura, Cablaggio al data layer, Come è nato il tracciato dell'Italia, Cosa resta fuori, Cosa è stato verificato (automatico), Decisioni e assunzioni, Difetti noti (preesistenti, ereditati e resi visibili), Due scelte da non disfare per sbaglio (+7 more)

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
Nodes (10): decorateTournament(), deriveDashboardServer(), deriveTorneoDetail(), deriveTorneoDetailServer(), dotFor(), dotForRank(), torneoRow(), partnerName() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (5): Database, supabase, hintStyle, Msg, readOnlyStyle

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (6): AuthContext, AuthContextValue, AuthProvider(), AuthResult, logoutUser(), OAuthProvider

## Knowledge Gaps
- **315 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+310 more)
=======
Cohesion: 0.18
Nodes (8): resolveVenue(), deriveWhoIsHere(), normalizeCity(), parseLatLng(), venueLabel(), SvPresentUser, NewVenueFields(), SelectedVenueNote()

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (7): Come far girare la suite, Cosa è stato verificato (automatico), ⚠️ Da applicare / verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up (fuori scope, come da piano), Limitazioni note, QA — "Chi c'è oggi?" (check-in + stanza reciproca)

### Community 39 - "Community 39"
Cohesion: 0.23
Nodes (14): deriveCompagno(), deriveDashboard(), deriveDashboardServer(), deriveStory(), deriveWrapped(), filteredMatches(), fmtDateFull(), matchesWithDates() (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (7): FilterChips(), InlineLink(), SectionTitle(), RecentTornei(), TorneiListData, Tornei(), TorneiProps

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (11): Automatico (`src/lib/derive.venues.server.test.ts`, 11 test), Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up, La decisione che cambia la forma dello schema, ⚠️ Limitazione nota: il merge di un luogo condiviso (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (7): ConnectionSnackbar(), computeSlow(), getConnection(), NetworkInformation, subscribe(), useSlowConnection(), useIsWide()

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (8): useAuth(), FEATURES, inputStyle, Login(), Mode, seg(), Profilo(), Root()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (9): byAgendaDate(), deriveCompagni(), deriveCompagniServer(), deriveCompagnoDetailServer(), deriveTorneiList(), deriveTorneiListServer(), partnerOptions(), tournamentOptions() (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (5): checkNameAvailable(), updateDisplayName(), hintStyle, Msg, readOnlyStyle

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (5): decorateTournament(), dotFor(), dotForRank(), fmtDate(), placementRank()

## Knowledge Gaps
- **277 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+272 more)
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

<<<<<<< HEAD
- **Why does `Option` connect `Community 0` to `Community 8`, `Community 10`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `AnyForm` connect `Community 0` to `Community 12`, `Community 29`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 38` to `Community 2`, `Community 12`, `Community 46`, `Community 47`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _315 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
=======
- **Why does `Option` connect `Community 3` to `Community 0`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `AnyForm` connect `Community 3` to `Community 0`, `Community 2`, `Community 12`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 43` to `Community 1`, `Community 2`, `Community 44`, `Community 45`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05901639344262295 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05584415584415584 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11207729468599034 - nodes in this community are weakly interconnected._
>>>>>>> queuer/turn-the-free-text-city-into-a-real-venu-66f05c98
