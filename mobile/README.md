# Somna mobile foundation

Flutter Android/iOS app; the React website stays in the repository root.
Android uses `app.somna`, label `Somna`, version `1.0.0+2`.

## Shared interfaces

- `lib/data/models.dart`: persisted contracts with the web's JSON field names.
  `SomnaWidget` avoids Flutter's `Widget` name. String aliases retain web enum
  values (including legacy `breath` practice sessions).
- `lib/data/defaults.dart`: current web demo data and default widget gallery.
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

Platform notification scheduling/permission requests and sound playback are
not implemented here. Inject `requestReminderPermission` into store creation
when wiring notifications (the default permits the plain-Dart flow), and
dispatch reminder taps with `handleReminder`. Night sound selection/timer and
navigation are transient store state; screens and playback adapters come later.
There are no browser storage events on native: `reloadFromStorage()` explicitly
accepts external snapshots only when there are no unsaved local edits.

## Checks

```sh
flutter analyze
flutter test
flutter build apk --debug
```
