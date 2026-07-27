# Graph Report - BeachVolleyDiary  (2026-07-27)

## Corpus Check
- 113 files · ~96,140 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 763 nodes · 1550 edges · 44 communities (39 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cde7390e`
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
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `AnyForm` - 20 edges
2. `compilerOptions` - 18 edges
3. `App()` - 17 edges
4. `compilerOptions` - 16 edges
5. `deriveTorneoDetail()` - 15 edges
6. `SetField` - 14 edges
7. `Option` - 14 edges
8. `deriveMappa()` - 13 edges
9. `Venue` - 13 edges
10. `Tournament` - 13 edges

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

## Communities (44 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (49): PhotoLightboxProps, Shot, Avatar(), BackLink(), BadgeSize, BadgeTone, btnBase, BtnVariant (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (56): UseCheckInDeps, citySnapshot(), cleanCity(), EMPTY, ResolvedVenue, resolveVenue(), useDiary, Category (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): cittaFuoriMappa(), deriveMappa(), formaDelPin(), grafiaPiuRecente(), Gruppo, MappaCitta, MappaData, MappaLegendaRow (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (32): mappa(), FULL_YEAR, kinds(), seasonRich(), seasonWith(), slideOf(), WrappedSlideKind, SetScore (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): dependencies, html-to-image, leaflet, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (24): CompagnoMatchRow, DashboardData, DatedMatch, deriveWhoIsHere(), DiaryPhotoThumb, LatLng, makeWrappedRange(), normalizeCity() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (15): fetchOwnCheckIn(), mapOwn(), OwnRow, useCheckIn, todayISO(), CheckIn, CheckInInput, PresentUser (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (12): CreaChat(), DockProps, fieldStyle, FINISHED_PLACEMENTS, fmtDate(), Handlers, initialDraft(), LABEL_COLORS (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (15): WrappedData, WrappedSlide, Chip(), WRAPPED_PALETTES, wrappedPalette, overlayStyle, pad2(), makeWrapped() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (20): byAgendaDate(), deriveCompagni(), deriveCompagniServer(), deriveCompagnoDetailServer(), deriveDashboardServer(), deriveDiary(), deriveTorneiList(), deriveTorneiListServer() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (16): getCompagniList(), getCompagnoDetail(), getTorneiList(), getTorneoDetail(), getWhoIsHere(), ok(), SvCompagno, SvCompagnoDetail (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (17): decorateTournament(), deriveTorneoDetail(), deriveTorneoDetailServer(), dotFor(), dotForRank(), formatLatLng(), torneoRow(), mapUrl() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (12): BrandLockup(), BrandMark(), Sidebar(), AuthProvider(), useAuth(), FEATURES, inputStyle, Login() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (12): ProfileRow, Session, Plan, Role, BASE_LIMITS, entitlements, PermissionAction, PermissionCheck (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (15): Accessibilità — perché il contorno dei pin non è una rifinitura, Cablaggio al data layer, Come è nato il tracciato dell'Italia, Cosa resta fuori, Cosa è stato verificato (automatico), Decisioni e assunzioni, Difetti noti (preesistenti, ereditati e resi visibili), Due scelte da non disfare per sbaglio (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (14): AuthContext, AuthContextValue, AuthResult, fetchProfile(), hasPasswordIdentity(), loginUser(), logoutUser(), NameCheck (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (14): Database, Json, Match, MatchScore, MatchSet, Partner, Photo, Profile (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (11): esitoStyle, MatchResult, res(), ResultKey, setChips(), Stats, WithSets, C (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (7): BottomNavProps, Slot, SLOTS, NAV, NavEntry, SidebarProps, Screen

### Community 21 - "Community 21"
Cohesion: 0.26
Nodes (13): deriveCompagno(), deriveDashboard(), deriveStory(), deriveWrapped(), filteredMatches(), fmtDateFull(), matchesWithDates(), partnerName() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (11): #1 — Il sottotitolo della pagina non segue il filtro · media, #2 — Un filtro scartato si riattiva da solo · bassa, #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione), #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente), #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media, Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom) (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (11): Automatico (`src/lib/derive.venues.server.test.ts`, 11 test), Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up, La decisione che cambia la forma dello schema, ⚠️ Limitazione nota: il merge di un luogo condiviso (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (11): 1) Supabase CLI (solo per uno stack locale nuovo), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, Come applicare, Dati demo (opzionale), Prossimi passi, Struttura, Supabase — Beach Volley Diary (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (7): ConnectionSnackbar(), computeSlow(), getConnection(), NetworkInformation, subscribe(), useSlowConnection(), useIsWide()

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (10): Tables, CATEGORIES, MatchTyped, MatchWithSets, PHASES, PLACEMENTS, PLANS, ROLES (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (6): StoryData, Palette, PaletteKey, PALETTES, StoryModalProps, VARIANTS

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (6): Badge(), checkNameAvailable(), updateDisplayName(), hintStyle, Msg, readOnlyStyle

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): getDashboardStats(), ServerDashboard, ServerPartnerRow, ServerPhaseRow, ServerPlacement, ServerTrendPoint, supabase

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): Come far girare la suite, Cosa è stato verificato (automatico), ⚠️ Da applicare / verificare a mano (fuori dalla portata di jsdom), Decisioni e assunzioni (documentate), Follow-up (fuori scope, come da piano), Limitazioni note, QA — "Chi c'è oggi?" (check-in + stanza reciproca)

### Community 31 - "Community 31"
Cohesion: 0.39
Nodes (6): FORMATS, deriveTorneiSections(), groupTorneiByFormat(), splitUpcoming(), torneiFormats(), Tornei()

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (6): Avvio, 🏐 Beach Volley Diary, Design tokens, Funzionalità, Struttura, Test

### Community 34 - "Community 34"
Cohesion: 0.53
Nodes (5): contrast(), flatten(), luminance(), parse(), RGB

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (4): name, organization_id, organization_slug, ref

## Knowledge Gaps
- **268 isolated node(s):** `allow`, `name`, `private`, `version`, `type` (+263 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Option` connect `Community 1` to `Community 0`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `AnyForm` connect `Community 1` to `Community 9`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 13` to `Community 17`, `Community 20`, `Community 28`, `Community 9`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `allow`, `name`, `private` to the rest of the system?**
  _268 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05031645569620253 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06971975393028025 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._