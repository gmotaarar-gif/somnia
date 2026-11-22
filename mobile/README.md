# Somna mobile foundation

Flutter Android/iOS app; the React website stays in the repository root.
Android uses `app.somna`, label `Somna`, version `1.0.0+2`.

## Shared interfaces

- `lib/data/models.dart`: persisted contracts with the web's JSON field names.
  `SomnaWidget` avoids Flutter's `Widget` name. String aliases retain web enum
  values (including legacy `breath` practice sessions).
- `lib/data/defaults.dart`: empty fresh-install state and default widget gallery.
- `lib/data/store.dart`: `SomnaStore`, normalization, actions and `SomnaScope`.
  Initialize with `await SomnaStore.load()`, then wrap the app in
  `SomnaScope(store: store, child: ...)`. Read with `SomnaScope.of(context)`.
  Fields are available through `store.state` and direct store getters.
  Dispose the store at its owner's shutdown; `await store.flush()` explicitly
  waits for persistence when needed.
- `lib/logic/`: pure ports of web time, metrics, recap, features, valence and
  onboarding calculations. Pass `now` for deterministic calendar behavior.

Partial updates (`patch`, `updateWidget`, `finishOnboarding`) take JSON maps;
pass model lists as `items.map((item) => item.toJson()).toList()`. Other actions
accept typed models/arguments. `setWidgets` accepts a list; `updateWidgets`
accepts a function for reordering based on the current list.

The whole state is debounced into one `shared_preferences` JSON string at
`somna-state-v6`. The web stores membership separately at
`somna-subscription-v1`; native JSON adds a nullable `membership` field containing
the identical membership object. `SomnaStore.load()` accepts that legacy key
once when no native membership field exists. A persisted null prevents an old
membership from being resurrected after cancellation. Other web field names
and optional model fields are unchanged.

`registerLocalProfile` is asynchronous and throws on validation/storage errors;
it commits identity only after a successful atomic journal write. `activate`
and `deactivate` return `Future<bool>` and expose failures via
`subscriptionError`. These are local demo identity/entitlement only, **not
authentication or payment authorization**. Journal reset preserves both.

Platform notification scheduling/permission requests are implemented for
Android by `lib/native/`; sound playback remains deferred.
Inject `requestReminderPermission` into store creation
when wiring notifications (the default permits the plain-Dart flow), and
dispatch reminder taps with `handleReminder`. Night sound selection/timer and
navigation are transient store state; screens and playback adapters come later.
There are no browser storage events on native: `reloadFromStorage()` explicitly
accepts external snapshots only when there are no unsaved local edits.

## Native shell / integration seams

`main.dart` runs `SomnaApp` (`lib/shell/app.dart`), which loads the store behind
the splash screen and gates onboarding/workspace. Theme mode is read from the
store; system mode follows live platform brightness changes. Onest variable
font (including Cyrillic) and its SIL OFL license are bundled from
`https://github.com/google/fonts/tree/main/ofl/onest`.

Replace one of `lib/screens/{today,sleep,mind,practices}.dart` with its native
screen. The workspace retains all four screen elements in an `IndexedStack`;
the outgoing visual is captured for a 250ms crossfade/slide, not remounted.
Theme tokens/motion live in `lib/theme/`; shared surfaces, dots, orb,
press targets and sheet infrastructure live in `lib/ui/`.

Inject a `SheetRegistry` into `SomnaApp(sheetRegistry: registry)` and register
builders in your feature's composition code (no shell edits needed):

```dart
final registry = SheetRegistry();
registry.register('article', (context, arg) => ArticleSheet(articleId: arg));
runApp(SomnaApp(sheetRegistry: registry));
```

Use `SomnaScope.of(context).openSheet('article', id)` to navigate. Registry
builders receive the store's sheet arg unchanged, can be replaced live, and
have a placeholder fallback. Profile's default builder is installed only if
not overridden. System back, swipe and barrier dismissal clear store state;
switching/clearing the store sheet updates the route. For independent sheets
use `showSomnaSheet(context, builder: ...)` and close with `Navigator.pop`.
The registry is owned/disposed by its creator when injected.

Aurora uses native soft radial blobs, **not a FragmentProgram or WebView**.
It interpolates all web palettes on tab/theme changes, with idle drift only
during onboarding (like the web). Reduced-motion settings stop the drift and
tab transitions. DistortionWave and real tab/sheet content remain deferred.

## Android tester builds

`flutter build apk --release` produces
`build/app/outputs/flutter-apk/app-release.apk`. Without `android/key.properties`
it uses the **debug signing key**, suitable only for testers, not store release.
To override signing, create the gitignored `mobile/android/key.properties` with
`storeFile` (relative to `mobile/android` or absolute), `storePassword`,
`keyAlias`, and `keyPassword`. Do not commit keys or signing properties.
Different signing keys require uninstalling the previous build.

Android reminders use ids 1001/1002, local IANA time zones and daily inexact
allow-while-idle alarms; no exact-alarm permission is declared. Android can
delay inexact delivery beyond the selected minute, especially during Doze.
The plugin restores alarms after reboot/package updates; app resume resyncs
settings and timezone. A force-stop suppresses alarms until the app is opened.
Tap handling covers running/background and cold launch; night-session state
is intentionally transient, as on web. Android 13+ permission is requested
when enabling a reminder, not automatically on app launch.
The notification plugin is constrained to 22.x for the scaffold's SDK 36;
23.x requires Android compile SDK 37.

Profile export shares `somna-export.json` from cache with exactly the web's
export subset; it is not a full settings/account backup. Share cancellation
and share/storage errors use the web's failure toast.

CI `.github/workflows/flutter-android.yml` pins Flutter 3.50.1 and publishes
the tester-signed release APK as artifact `somna-apk` for mobile changes.

## Checks

```sh
flutter analyze
flutter test
flutter build apk --debug
```
