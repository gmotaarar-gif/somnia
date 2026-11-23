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
| 1 | Charts kit — done | `ui/SleepStages.tsx`, `ui/MoodTrend.tsx`, `ui/charts.tsx`, calendars in Sleep/Mind | `lib/ui/charts/` | Native CustomPainter charts, stage geometry, current-web empty states, dark/light, reduced-motion reveals and tests |
| 2 | Today + widgets — done | `screens/Today.tsx`, `TodayExtras.tsx`, `widgets/*`, `sheets/GallerySheet.tsx`, `sheets/RecapSheet.tsx` | `lib/screens/today.dart`, `lib/widgets/`, gallery + recap sheets | Nightfall hero with `NightLine`, nested tiles, day plan, article card, 13 widget kinds in 1x1/2x1, long-press edit with drag reorder, gallery with counter creator, 5 recap stories. Shared pieces for other screens: `lib/widgets/kit.dart` (section head, buttons, chips, toggle, segmented, sheet scaffold) and `lib/widgets/lucide.dart` (lucide stroke icons). |
| 3 | Sleep — done (night mode and sounds later removed, see DESIGN.md) | `screens/Sleep.tsx`, `sheets/SleepSheet.tsx`, `Extras.tsx` (Cycles, Night detail), `shell/NightMode.tsx`, `lib/audio.ts` | `lib/screens/sleep.dart`, `lib/sleep/` (sheets, night mode, controls, time scrubber, night line), `lib/native/audio.dart` | Sleep entry form (duration rule −8 min per awakening), cycle calculator, night detail + delete, full-screen night mode; pink/rain/drone rendered to looping PCM in Dart and played with `just_audio`, with sleep timer. The running night is kept across an app restart (`lib/sleep/night_session.dart`). Sound stops when Android suspends the app: there is no foreground media service yet |
| 4 | Mind — done | `screens/Mind.tsx`, mood sheet in `sheets/`, `Extras.tsx` (WellbeingSheet) | `lib/screens/mind.dart`, mood + WHO-5 sheets | Mood entry (valence slider + MoodOrb, max 3 emotions, 5 factors), 14-day trend/calendar, insights carousel, factors vs emotions, WHO-5 (sum×4, advice below 52) |
| 5 | Practices (grounding and body scan later removed, see DESIGN.md) | `screens/Practices.tsx`, `sheets/PracticeSheets.tsx`, `sheets/ArticleSheet.tsx`, `lib/articles.ts` | `lib/screens/practices.dart`, practice + article sheets, `lib/data/articles.dart` | 8 articles + reader, topic filters, evening ritual checklist, grounding 5-4-3-2-1, Plus body scan 5×36 s (replaces current placeholder), worry diary |
| 6 | Onboarding | `screens/Onboarding.tsx` | `lib/shell/onboarding.dart` | 9 stages (name, goals, sleep, chronotype/schedule, first mood, widgets, building animation, plan + reminder permission + registration offer) |
| 7 | Profile, account, Plus — done | `sheets/ProfileSheet.tsx`, `account/*`, `sheets/SubscriptionSheet.tsx`, `Extras.tsx` (AwardsSheet) | `lib/shell/profile_sheet.dart`, account/subscription/awards sheets | Stats, achievements (11), sleep target, chronotype, volume, restore widgets, restart onboarding, reset with confirm; local registration; demo Plus monthly 299 / yearly 1990 (not Play Billing) |
| 8 | Motion polish | `ui/ScreenTransition.tsx` (DistortionWave), `shell/Aurora.tsx` + `meshDrift.glsl.ts`, `shell/Island.tsx` | `shaders/`, `lib/shell/aurora.dart`, transitions | FragmentProgram ports of the mesh-drift aura and the wave tab transition (crossfade fallback, reduced motion), island toast; check on a real phone (Impeller) |

## Charts kit API (piece 1)

Pieces **2–8** branch from **`main` after the charts kit merges**. All use `import 'package:somna/ui/charts/charts.dart';`. Charts take plain inputs and never access a store; screen owners own data selection and navigation callbacks.

Current web was rechecked with `git diff 2f6ef46 origin/main -- src/` (base `d8834c6`), including empty states, theme redesign, ink-relative chart contrast and semantic accent colors. Journal entries **do not infer sleep phases**: `logic/features.dart` now matches web and returns `[]`. Feed that list to `Hypnogram`/`StageLegend`; the empty hypnogram shows the web disclaimer and the empty legend is hidden. The stage-list API remains ready for real measurements. Gallery stage segments are explicitly synthetic test fixtures, not diary-derived estimates.

- `Hypnogram({required List<StageSegment> stages, String? bedtime, String? wakeTime, bool compact = false})`.
- `StageLegend({required List<StageSegment> stages})`.
- `MoodTrend({required List<MoodDay> days})`; `MoodDay({required String key, required String label, double? value})` uses null for a gap, zero for a neutral check-in; scale fixed at −1…1.
- `DotTrack({required double value, int count = 28, bool marker = true})`, value 0…1.
- `DotRow({required List<double> values, double size = 6})`, values 0…1 (booleans map to 0/1).
- `Arc({required double value, Color color = Color(0xffb6f27a)})`, value 0…1.
- `Wave({required List<double> values, Color? color, bool fill = false, bool knob = true, double height = 60})`, sparkline with optional area fill.
- `Ring({required double value, double size = 120, double stroke = 3, Color? color, Widget? child})`, value 0…1; stroke in the web's 100-unit coordinate system (WHO-5/night detail).
- `ScoreRing({required double? score, double size = 212, Widget? child, Color? color})`, score 0…100, null means no score (Recap).
- `Bars({required List<double> values, List<String>? labels, double? max, double? goal, int? highlight, double height = 160, String Function(double)? format})`.
- `Orbits({List<double> points = const [.18, .52, .8]})`, dotted orbit motif.
- `SleepCalendar({required List<SleepNight> nights, required DateTime today, required String bedGoal, required String wakeGoal, ValueChanged<SleepNight>? onNightTap})`, 35 cells Monday–Sunday; callback only for recorded nights.
- `MoodCalendar({required List<MoodEntry> moods, required DateTime today})`, web's rolling 28 days, daily mean valence; absent days stay untinted.

All widgets also accept `key`. `StageSegment`, `stageMinutes`, `stageDisplayMinutes`, `hypnogramPoints`, `smoothPath`, `sleepCalendarDays` and `moodCalendarDays` are exported by the barrel. Reveal animations honor `MediaQuery.disableAnimations`; chart colors derive from the current Somna theme. Place charts in a finite-width parent; `Wave.height` is its SVG/view-box height, while `Bars.height` is a logical layout height.

Debug-only gallery: `flutter run -t lib/dev/charts_gallery.dart`. Four tabs cover every chart; app-bar controls switch dark/light and populated/empty inputs. No production navigation changes are needed.

## Profile, account, Plus (piece 7)

- Sheets `profile`, `awards` and `subscription` are registered in `SomnaApp`. Open Plus with `store.openSheet('subscription')`; pass the arg `'profile'` to return to the profile on close.
- Registration stacks above the current sheet: `showRegistrationSheet(context)` from `lib/profile/account.dart`; `RegistrationForm(onClose: ...)` is the bare form for onboarding.
- Piece 5 gates the body scan with `PlusGate(child: ...)` from `lib/profile/subscription_sheet.dart`: non-members see the Plus offer in its place.
- `lib/profile/controls.dart` holds the sheet header, field, button, toggle, segmented control, time field and settings rows; `CometDial` and `SlideToConfirm` sit beside it.
- Copy that says "в этом браузере" on the web says "на этом устройстве" here.

## Remaining platform decisions

- Data from the old WebView app is not migrated (it is in WebView localStorage). Installing this APK over the old one keeps the package name but starts with empty data; uninstall first if Android refuses the update because of a different signature.
- Plus stays a local demo entitlement until Play Billing is decided.
- Web changes landing in parallel (empty states, theme redesign, DistortionWave, mascot) must be re-checked against main when each piece starts.
