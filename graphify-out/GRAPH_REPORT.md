# Graph Report - BeachVolleyDiary  (2026-07-24)

## Corpus Check
- 93 files · ~56,950 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 574 nodes · 1130 edges · 35 communities (31 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c18c18b`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `App()` - 16 edges
3. `AnyForm` - 16 edges
4. `compilerOptions` - 16 edges
5. `Option` - 14 edges
6. `SetField` - 12 edges
7. `useAuth()` - 11 edges
8. `DashboardStats` - 10 edges
9. `deriveWrapped()` - 10 edges
10. `Category` - 9 edges

## Surprising Connections (you probably didn't know these)
- `HomeFilters` --references--> `Option`  [EXTRACTED]
  src/screens/Home.tsx → src/lib/models.ts
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/hooks/useAuth.tsx
- `App()` --calls--> `useIsWide()`  [EXTRACTED]
  src/App.tsx → src/hooks/useMedia.ts
- `App()` --calls--> `deriveCompagno()`  [EXTRACTED]
  src/App.tsx → src/lib/derive.ts
- `App()` --calls--> `deriveStory()`  [EXTRACTED]
  src/App.tsx → src/lib/derive.ts

## Import Cycles
- None detected.

## Communities (35 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (41): EMPTY, useDiary, CATEGORIES, Category, Format, MatchTyped, MatchWithSets, Phase (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (39): AuthContext, AuthContextValue, AuthProvider(), AuthResult, checkNameAvailable(), fetchProfile(), hasPasswordIdentity(), loginUser() (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (25): BottomNavProps, Slot, SLOTS, ConnectionSnackbar(), BrandLockup(), BrandMark(), NAV, NavEntry (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (24): AnyForm, Option, SetField, SetsApi, CompagnoModalProps, FotoModalProps, noteStyle, PartitaModalProps (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (32): dependencies, html-to-image, react, react-dom, @supabase/supabase-js, @vercel/analytics, @vercel/speed-insights, devDependencies (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (18): FULL_YEAR, kinds(), seasonRich(), seasonWith(), slideOf(), wrappedRangeForYear(), WrappedSlideKind, SetScore (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): WrappedData, WrappedSlide, Chip(), expectNoA11yViolations(), WRAPPED_PALETTES, wrappedPalette, overlayStyle, pad2() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (12): Avatar(), Button(), FilterChips(), InlineLink(), PageHeader(), StatFooter(), CompagnoCard, DiaryEntry (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (14): Badge(), EmptyNote(), MeterRow(), PartnerCard(), PhaseCard(), PlacementCard(), PointsCard(), StyleWithVars (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (12): PhotoLightboxProps, Shot, BackLink(), EmptyCard(), MatchRow(), SectionTitle(), RecentTornei(), CompagnoDetailData (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (20): CompagnoMatchRow, DashboardData, DatedMatch, deriveDiary(), DiaryPhotoThumb, makeWrappedRange(), PartnerRow, PhaseRow (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (17): byAgendaDate(), deriveCompagni(), deriveCompagniServer(), deriveCompagnoDetailServer(), deriveTorneiList(), deriveTorneiListServer(), deriveTorneoDetailServer(), partnerOptions() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): compilerOptions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): Database, Json, Match, MatchScore, MatchSet, Partner, Photo, Profile (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (15): deriveCompagno(), deriveDashboard(), deriveDashboardServer(), deriveStory(), deriveWrapped(), filteredMatches(), fmtDateFull(), matchesWithDates() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (13): getCompagniList(), getCompagnoDetail(), getTorneiList(), getTorneoDetail(), ok(), SvCompagno, SvCompagnoDetail, SvCompagnoMatch (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (11): esitoStyle, MatchResult, res(), ResultKey, setChips(), Stats, WithSets, C (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (11): BadgeSize, BadgeTone, btnBase, BtnVariant, FilterOption, MatchRowProps, SetChip, StatGrid() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (11): #1 — Il sottotitolo della pagina non segue il filtro · media, #2 — Un filtro scartato si riattiva da solo · bassa, #3 — Contatori di sezione sotto AA · bassa (preesistente, non una regressione), #4 — Le azioni dell'header non sono raggiungibili da tastiera · media (preesistente), #5 — `role="button"` sulla card nasconde il contenuto agli screen reader · media, Come far girare la suite, Cosa è stato verificato, Da verificare a mano (fuori dalla portata di jsdom) (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (6): StoryData, Palette, PaletteKey, PALETTES, StoryModalProps, VARIANTS

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (10): 1) Supabase CLI (consigliato), 2) Dashboard → SQL Editor, 3) Claude + Supabase MCP, Come applicare, Dati demo (opzionale), Prossimi passi, Struttura, Supabase — Beach Volley Diary (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.39
Nodes (6): FORMATS, deriveTorneiSections(), groupTorneiByFormat(), splitUpcoming(), torneiFormats(), Tornei()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, noEmit, types, exclude, extends, include

### Community 24 - "Community 24"
Cohesion: 0.47
Nodes (6): decorateTournament(), deriveTorneoDetail(), dotFor(), dotForRank(), fmtDate(), placementRank()

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (5): Avvio, 🏐 Beach Volley Diary, Design tokens, Funzionalità, Struttura

### Community 26 - "Community 26"
Cohesion: 0.53
Nodes (5): contrast(), flatten(), luminance(), parse(), RGB

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (4): name, organization_id, organization_slug, ref

## Knowledge Gaps
- **203 isolated node(s):** `allow`, `name`, `private`, `version`, `type` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Option` connect `Community 3` to `Community 0`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `AnyForm` connect `Community 3` to `Community 0`, `Community 12`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 2` to `Community 1`, `Community 12`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `allow`, `name`, `private` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06641604010025062 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06531204644412192 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07948717948717948 - nodes in this community are weakly interconnected._