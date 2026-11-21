# Somna Flutter port: screen map and work pieces

The Flutter app in `mobile/` replaces the Capacitor WebView wrapper on Android. The React app stays as the website and is the reference for every screen: port behavior and copy 1:1 from the files named below.

## Already in place (foundation)

- `lib/data/`: persisted models (same JSON fields as web `somna-state-v6` / `somna-subscription-v1`), `SomnaStore` (defaults, migration, caps, day rollover, all actions), `SomnaScope.of(context)`, registration and subscription logic.
- `lib/logic/`: ports of `time.ts`, `metrics.ts`, `recap.ts`, `features.ts`, `valence.ts`, `onboarding.ts`, with tests ported from web.
- `lib/theme/`: dark/light tokens, card tones, motion tokens, Onest font, system/light/dark switching.
- `lib/ui/`: `SomnaCard`, `GlassSurface`, `PressScale`, `Dots`, `MoodOrb`, `showSomnaSheet` and the sheet builder registry.
- `lib/shell/`: splash, onboarding gate, four kept-alive tabs, Dock with plus quick actions, TopBar, Aurora (radial blobs), profile sheet with theme, reminders and export.
- `lib/native/`: bedtime/morning notifications (ids 1001/1002, tap routing incl. cold start), JSON export via share sheet.
- Android: `app.somna`, icon from PR #25, dark splash, CI workflow building `somna-apk`.

## Rules for port sessions

- Each piece owns only its listed files. Do not change `lib/data/models.dart`, `store.dart`, `lib/theme/` or shell files; if a piece needs a new store action or token, add it in a small separate commit and say so in the PR.
- Register sheets through the sheet registry (`lib/ui/sheets.dart`), not by editing `SheetHost`.
- All UI copy in Russian, exactly as web. Keep empty-state vs zero distinctions (see web PR #24).
- Each PR: widget tests for its screens, `flutter analyze` + `flutter test` green, screenshots from the emulator in dark and light theme.

## Pieces

Order: piece 1 first (shared charts), then 2-8 in parallel.

| # | Piece | Web sources | Flutter files | Needs |
|---|---|---|---|---|
| 1 | Charts kit | `ui/SleepStages.tsx`, `ui/MoodTrend.tsx`, `ui/charts.tsx`, calendars in Sleep/Mind | `lib/ui/charts/` | CustomPainter hypnogram (estimated stages from `logic/features`), trend line, bars, rings, month/5-week calendar; port `SleepStages.test.ts` geometry |
| 2 | Today + widgets | `screens/Today.tsx`, `TodayExtras.tsx`, `widgets/*`, `sheets/GallerySheet.tsx`, `sheets/RecapSheet.tsx` | `lib/screens/today.dart`, `lib/widgets/`, gallery + recap sheets | 13 widget kinds, 1x1/2x1 grid, long-press edit with drag reorder and jiggle, water/counter taps, custom counter creator, 5-page weekly recap stories |
| 3 | Sleep | `screens/Sleep.tsx`, `sheets/SleepSheet.tsx`, `Extras.tsx` (Cycles, Night detail), `shell/NightMode.tsx`, `lib/audio.ts` | `lib/screens/sleep.dart`, sleep/cycles/night sheets, `lib/native/audio.dart` | Sleep entry form (duration rule −8 min per awakening), cycle calculator, night detail + delete, full-screen night mode; procedural pink/rain/drone sound (generate PCM in Dart, play with a native audio package) with sleep timer |
| 4 | Mind | `screens/Mind.tsx`, mood sheet in `sheets/`, `Extras.tsx` (WellbeingSheet) | `lib/screens/mind.dart`, mood + WHO-5 sheets | Mood entry (valence slider + MoodOrb, max 3 emotions, 5 factors), 14-day trend/calendar, insights carousel, factors vs emotions, WHO-5 (sum×4, advice below 52) |
| 5 | Practices | `screens/Practices.tsx`, `sheets/PracticeSheets.tsx`, `sheets/ArticleSheet.tsx`, `lib/articles.ts` | `lib/screens/practices.dart`, practice + article sheets, `lib/data/articles.dart` | 8 articles + reader, topic filters, evening ritual checklist, grounding 5-4-3-2-1, Plus body scan 5×36 s (replaces current placeholder), worry diary |
| 6 | Onboarding | `screens/Onboarding.tsx` | `lib/shell/onboarding.dart` | 9 stages (name, goals, sleep, chronotype/schedule, first mood, widgets, building animation, plan + reminder permission + registration offer) |
| 7 | Profile, account, Plus | `sheets/ProfileSheet.tsx`, `account/*`, `sheets/SubscriptionSheet.tsx`, `Extras.tsx` (AwardsSheet) | `lib/shell/profile_sheet.dart`, account/subscription/awards sheets | Stats, achievements (11), sleep target, chronotype, volume, restore widgets, restart onboarding, reset with confirm; local registration; demo Plus monthly 299 / yearly 1990 (not Play Billing) |
| 8 | Motion polish | `ui/ScreenTransition.tsx` (DistortionWave), `shell/Aurora.tsx` + `meshDrift.glsl.ts`, `shell/Island.tsx` | `shaders/`, `lib/shell/aurora.dart`, transitions | FragmentProgram ports of the mesh-drift aura and the wave tab transition (crossfade fallback, reduced motion), island toast; check on a real phone (Impeller) |

## Open decisions

- Data from the old WebView app is not migrated (it is in WebView localStorage). Installing this APK over the old one keeps the package name but starts with empty data; uninstall first if Android refuses the update because of a different signature.
- Plus stays a local demo entitlement until Play Billing is decided.
- Web changes landing in parallel (empty states, theme redesign, DistortionWave, mascot) must be re-checked against main when each piece starts.
