import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../logic/metrics.dart' show tail;
import '../logic/time.dart';
import 'defaults.dart';
import 'models.dart';
import 'registration.dart';
import 'subscription.dart';

const storageKey = 'somna-state-v6';

abstract interface class SomnaPersistence {
  String? read();
  Future<void> write(String serialized);
}

class PreferencesPersistence implements SomnaPersistence {
  final SharedPreferences preferences;
  PreferencesPersistence(this.preferences);
  @override
  String? read() => preferences.getString(storageKey);
  @override
  Future<void> write(String serialized) async {
    if (!await preferences.setString(storageKey, serialized)) {
      throw StateError('Unable to save Somna state');
    }
  }
}

List<SleepNight> normalizeNights(List<SleepNight> nights) {
  final byKey = <String, SleepNight>{};
  for (final n in nights) {
    if (n.dateKey.isNotEmpty) byKey[n.dateKey] = n;
  }
  final sorted = byKey.values.toList()
    ..sort((a, b) => a.dateKey.compareTo(b.dateKey));
  return tail(sorted, 90);
}

SomnaState rollDay(SomnaState state, String day) {
  if (state.water.day == day &&
      state.ritual.day == day &&
      !state.widgets.any((w) => w.kind == 'custom' && w.day != day)) {
    return state;
  }
  return state.patch({
    'water': (state.water.day == day ? state.water : Water(day: day, ml: 0))
        .toJson(),
    'ritual': (state.ritual.day == day ? state.ritual : Ritual(day: day))
        .toJson(),
    'widgets': state.widgets
        .map(
          (w) =>
              (w.kind == 'custom' && w.day != day
                      ? w.copyWith(value: 0, day: day)
                      : w)
                  .toJson(),
        )
        .toList(),
  });
}

List _withoutDemo(Object? entries, String kind) {
  final demoId = RegExp('^demo-$kind-\\d+\$');
  return (entries as List)
      .where(
        (e) => !(e is Map && e['id'] is String && demoId.hasMatch(e['id'])),
      )
      .toList();
}

SomnaState loadState(String? raw, {DateTime? now}) {
  final at = now ?? DateTime.now(), base = defaultState(now);
  if (raw == null || raw.isEmpty) return base;
  try {
    final parsed = jsonDecode(raw) as JsonMap;
    final merged = {...base.toJson(), ...parsed};
    merged['morningReminderTime'] =
        parsed['morningReminderTime'] ?? merged['wakeGoal'] ?? '08:00';
    merged['localAccount'] = normalizeLocalAccount(merged['localAccount'])
        ?.toJson();
    merged['membership'] = normalizeMembership(merged['membership'])?.toJson();
    if (!['system', 'light', 'dark'].contains(merged['theme'])) {
      merged['theme'] = base.theme;
    }
    // Old breathing records are retained only as completed practice sessions.
    merged.remove('breath');
    final widgets = (merged['widgets'] as List)
        .map((w) => Map<String, dynamic>.from(w as Map))
        .where((w) => w['kind'] != 'breath')
        .toList();
    if (parsed['layout'] != homeLayout) {
      if (parsed['widgets'] != null) {
        for (final w in widgets) {
          if (redundantWidgets.contains(w['kind'])) w['visible'] = false;
        }
      }
      merged['layout'] = homeLayout;
    }
    for (final w in defaultWidgets) {
      if (!widgets.any((x) => x['id'] == w.id)) {
        widgets.add(w.copyWith(visible: false).toJson());
      }
    }
    merged['widgets'] = widgets;
    final ritual = Map<String, dynamic>.from(merged['ritual'] as Map);
    ritual['done'] = (ritual['done'] as List)
        .where((id) => id != 'breath')
        .toList();
    merged['ritual'] = ritual;
    // Earlier builds seeded a demo journal; drop those entries from saved data.
    merged['moods'] = _withoutDemo(merged['moods'], 'm');
    merged['sessions'] = _withoutDemo(merged['sessions'], 's');
    merged['nights'] = normalizeNights(
      _withoutDemo(merged['nights'], 'n')
          .where(
            (n) =>
                n is Map &&
                n['dateKey'] is String &&
                (n['dateKey'] as String).isNotEmpty,
          )
          .map((n) => SleepNight.fromJson(Map<String, dynamic>.from(n as Map)))
          .toList(),
    ).map((n) => n.toJson()).toList();
    return rollDay(SomnaState.fromJson(merged), dateKey(at));
  } catch (_) {
    return base;
  }
}

const saveFailureToast =
    'Не удалось сохранить данные. Проверьте свободное место.';

/// The web's flat state JSON, with its separately stored membership in one native
/// envelope. Transient navigation/night-session fields never enter persistence.
class SomnaStore extends ChangeNotifier with WidgetsBindingObserver {
  SomnaState _state;
  final Clock _now;
  final String Function() _uid;
  final SomnaPersistence? _persistence;
  final Duration saveDebounce;
  final Future<bool> Function() _requestReminderPermission;
  Timer? _saveTimer, _dayTimer, _toastTimer, _soundTimer, _membershipTimer;
  Future<void> _writes = Future.value();
  String? _lastSaved;
  bool _disposed = false;
  final bool _autoRefresh;

  SomnaStore({
    SomnaState? initialState,
    SomnaPersistence? persistence,
    Clock? now,
    String Function()? uid,
    this.saveDebounce = const Duration(milliseconds: 250),
    this._autoRefresh = true,
    Future<bool> Function()? requestReminderPermission,
  }) : _now = now ?? DateTime.now,
       _uid = uid ?? _randomId,
       _persistence = persistence,
       _requestReminderPermission =
           requestReminderPermission ?? (() async => true),
       _state = initialState ?? _read(persistence, now ?? DateTime.now) {
    if (_autoRefresh) {
      WidgetsBinding.instance.addObserver(this);
      _dayTimer = Timer.periodic(
        const Duration(minutes: 1),
        (_) => refreshDay(),
      );
    }
    _scheduleSave();
    _scheduleMembershipExpiry();
  }

  static SomnaState _read(SomnaPersistence? persistence, Clock now) {
    try {
      return loadState(persistence?.read(), now: now());
    } catch (_) {
      return defaultState(now());
    }
  }

  static String _randomId() =>
      math.Random().nextInt(1 << 32).toRadixString(36).padLeft(8, '0');
  static Future<SomnaStore> load({
    SharedPreferences? preferences,
    Clock? now,
    Future<bool> Function()? requestReminderPermission,
  }) async {
    final prefs = preferences ?? await SharedPreferences.getInstance();
    // Accept the web's separate subscription record on first native import.
    final raw = prefs.getString(storageKey);
    var initial = loadState(raw, now: now?.call());
    var hasNativeMembership = false;
    try {
      hasNativeMembership = (jsonDecode(raw ?? '{}') as Map).containsKey(
        'membership',
      );
    } catch (_) {
      /* Not a native snapshot. */
    }
    if (!hasNativeMembership) {
      final old = parseMembership(prefs.getString(subscriptionKey));
      if (old != null) initial = initial.patch({'membership': old.toJson()});
    }
    return SomnaStore(
      initialState: initial,
      persistence: PreferencesPersistence(prefs),
      now: now,
      requestReminderPermission: requestReminderPermission,
    );
  }

  SomnaState get state => _state;
  bool get onboarded => _state.onboarded;
  String get userName => _state.userName;
  LocalAccount? get localAccount => _state.localAccount;
  Membership? get membership => _state.membership;
  bool get active => membershipIsActive(membership, _now());
  bool get isPlus => active;
  String? _subscriptionError;
  String? get subscriptionError => _subscriptionError;
  void clearSubscriptionError() {
    _subscriptionError = null;
    notifyListeners();
  }

  Chronotype get chronotype => _state.chronotype;
  ThemeMode get theme => _state.theme;
  String get bedGoal => _state.bedGoal;
  String get wakeGoal => _state.wakeGoal;
  bool get reminder => _state.reminder;
  String get reminderTime => _state.reminderTime;
  bool get morningReminder => _state.morningReminder;
  String get morningReminderTime => _state.morningReminderTime;
  List<String> get focus => _state.focus;
  Ritual get ritual => _state.ritual;
  Water get water => _state.water;
  bool get eveningMode => _state.eveningMode;
  double get volume => _state.volume;
  List<SleepNight> get nights => _state.nights;
  List<MoodEntry> get moods => _state.moods;
  List<SpectrumAxis> get spectrum => _state.spectrum;
  List<SomnaWidget> get widgets => _state.widgets;
  WeeklyGoal? get weeklyGoal => _state.weeklyGoal;
  List<PracticeSession> get sessions => _state.sessions;
  List<Worry> get worries => _state.worries;
  List<String> get readArticles => _state.readArticles;
  List<WellbeingResult> get wellbeing => _state.wellbeing;
  int get soundTimer => _state.soundTimer;
  int get layout => _state.layout;

  TabId _tab = 'today';
  int _tabDir = 1;
  SheetId? _sheet;
  String? _sheetArg;
  SomnaToast? _toast;
  bool _editing = false, _nightMode = false;
  String? _nightStart;
  String _nightSound = 'pink';
  TabId get tab => _tab;
  int get tabDir => _tabDir;
  SheetId? get sheet => _sheet;
  String? get sheetArg => _sheetArg;
  SomnaToast? get toast => _toast;
  bool get editing => _editing;
  bool get nightMode => _nightMode;
  String? get nightStart => _nightStart;
  String get nightSound => _nightSound;

  void _setState(SomnaState value) {
    _state = value;
    _scheduleSave();
    notifyListeners();
  }

  void patch(JsonMap changes) {
    final previousTimer = soundTimer;
    _setState(_state.patch(changes));
    if (previousTimer != soundTimer) _scheduleSoundTimer();
    if (changes.containsKey('membership')) _scheduleMembershipExpiry();
  }

  void _scheduleSave() {
    _saveTimer?.cancel();
    if (_persistence == null) return;
    _saveTimer = Timer(saveDebounce, () => unawaited(flush()));
  }

  Future<void> _write([JsonMap? changes]) {
    final write = _writes.then((_) async {
      final next = changes == null ? _state : _state.patch(changes);
      final raw = jsonEncode(next.toJson());
      await _persistence?.write(raw);
      _lastSaved = raw;
      if (changes != null) _state = _state.patch(changes);
    });
    _writes = write.catchError((Object _) {});
    return write;
  }

  /// Autosaves tolerate full/disabled storage; explicit account/payment writes do not.
  Future<void> flush() async {
    _saveTimer?.cancel();
    if (_persistence == null) return;
    try {
      await _write();
    } catch (_) {
      // The live journal stays usable; say that it is not on disk.
      if (!_disposed) notify(saveFailureToast, variant: ToastVariant.error);
    }
  }

  /// Call after external preference changes; never overwrite an unsaved journal.
  void reloadFromStorage() {
    if (_persistence == null || jsonEncode(_state.toJson()) != _lastSaved) {
      return;
    }
    final next = _read(_persistence, _now);
    _saveTimer?.cancel();
    _lastSaved = jsonEncode(next.toJson());
    _state = next;
    _scheduleMembershipExpiry();
    notifyListeners();
  }

  void refreshDay() {
    final next = rollDay(_state, dateKey(_now()));
    if (!identical(next, _state)) {
      _setState(next);
    } else {
      notifyListeners();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) refreshDay();
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      unawaited(flush());
    }
  }

  void setTab(TabId value) {
    const order = ['today', 'sleep', 'mind', 'practices'];
    _tabDir = order.indexOf(value) >= order.indexOf(_tab) ? 1 : -1;
    _tab = value;
    notifyListeners();
  }

  void openSheet(SheetId? value, [String? arg]) {
    _sheet = value;
    if (value != null) _sheetArg = arg;
    notifyListeners();
  }

  void notify(String text, {ToastVariant variant = ToastVariant.success}) {
    _toastTimer?.cancel();
    _toast = SomnaToast(
      id: _now().millisecondsSinceEpoch,
      text: text,
      variant: variant,
    );
    _toastTimer = Timer(const Duration(milliseconds: 2600), () {
      _toast = null;
      notifyListeners();
    });
    notifyListeners();
  }

  void setEditing(bool value) {
    _editing = value;
    notifyListeners();
  }

  void startNight() {
    final at = _now().toLocal();
    _nightStart = minutesToTime(at.hour * 60 + at.minute);
    _nightMode = true;
    _scheduleSoundTimer();
    notifyListeners();
  }

  /// Puts back a night that was running when the app was closed.
  void resumeNight(String start, String sound, {Duration? soundLeft}) {
    _nightStart = start;
    _nightSound = sound;
    _nightMode = true;
    _scheduleSoundTimer(soundLeft);
    notifyListeners();
  }

  void clearNightStart() {
    _nightStart = null;
    notifyListeners();
  }

  void endNight(bool log) {
    _nightMode = false;
    _soundTimer?.cancel();
    if (log) {
      openSheet('sleep');
    } else {
      _nightStart = null;
      notifyListeners();
    }
  }

  void handleReminder(SheetId target) {
    if (target == 'mood' && (nightMode || nightStart != null)) {
      endNight(true);
    } else {
      openSheet(target);
    }
  }

  void setNightSound(String sound) {
    if (sound == _nightSound) return;
    _nightSound = sound;
    _scheduleSoundTimer();
    notifyListeners();
  }

  void _scheduleSoundTimer([Duration? left]) {
    _soundTimer?.cancel();
    if (!_nightMode || _nightSound == 'off' || soundTimer == 0) return;
    _soundTimer = Timer(
      left ?? Duration(minutes: soundTimer),
      () => setNightSound('off'),
    );
  }

  Future<bool> finishOnboarding(JsonMap changes) async {
    final granted =
        changes['reminder'] != true || await _requestReminderPermission();
    patch({
      ...changes,
      if (changes['reminder'] == true) 'reminder': granted,
      'onboarded': true,
    });
    if (!granted) {
      notify('Разрешите уведомления для Somna в настройках телефона');
    }
    return granted;
  }

  void addNight(SleepNight night) => patch({
    'nights': normalizeNights([...nights, night.copyWith(id: _uid())])
        .map((n) => n.toJson())
        .toList(),
  });
  void removeNight(String id) => patch({
    'nights': nights.where((n) => n.id != id).map((n) => n.toJson()).toList(),
  });
  void addMood(MoodEntry mood) => patch({
    'moods': tail([
      ...moods,
      mood.stamped(_uid(), isoUtc(_now())),
    ], 200).map((m) => m.toJson()).toList(),
  });
  void addSession(PracticeKind kind, double min) => patch({
    'sessions': tail([
      ...sessions,
      PracticeSession(id: _uid(), at: isoUtc(_now()), kind: kind, min: min),
    ], 300).map((s) => s.toJson()).toList(),
  });
  void addWorry(String text, String plan) => patch({
    'worries': [
      Worry(id: _uid(), at: isoUtc(_now()), text: text, plan: plan),
      ...worries,
    ].take(60).map((w) => w.toJson()).toList(),
  });
  void toggleWorry(String id) => patch({
    'worries': worries
        .map((w) => (w.id == id ? w.copyWith(done: !w.done) : w).toJson())
        .toList(),
  });
  void removeWorry(String id) => patch({
    'worries': worries.where((w) => w.id != id).map((w) => w.toJson()).toList(),
  });
  void addWellbeing(double score) => patch({
    'wellbeing': tail([
      ...wellbeing,
      WellbeingResult(at: isoUtc(_now()), score: score),
    ], 52).map((w) => w.toJson()).toList(),
  });
  void addWater(double ml) => patch({
    'water': Water(
      day: dateKey(_now()),
      ml: (water.ml + ml).clamp(0, 4000).toDouble(),
    ).toJson(),
  });
  void toggleRitual(String id) => patch({
    'ritual': Ritual(
      day: dateKey(_now()),
      done: ritual.done.contains(id)
          ? ritual.done.where((x) => x != id).toList()
          : [...ritual.done, id],
    ).toJson(),
  });
  void markArticleRead(String id) {
    if (!readArticles.contains(id)) {
      patch({
        'readArticles': [...readArticles, id],
      });
    }
  }

  void setSpectrum(String id, double value) => patch({
    'spectrum': spectrum
        .map(
          (a) => a.id == id
              ? {...a.toJson(), 'value': value.clamp(0, 1)}
              : a.toJson(),
        )
        .toList(),
  });
  void setWidgets(List<SomnaWidget> value) =>
      patch({'widgets': value.map((w) => w.toJson()).toList()});
  void updateWidgets(List<SomnaWidget> Function(List<SomnaWidget>) update) =>
      setWidgets(update(widgets));
  void updateWidget(String id, JsonMap changes) => setWidgets(
    widgets
        .map(
          (w) => w.id == id
              ? SomnaWidget.fromJson({...w.toJson(), ...changes})
              : w,
        )
        .toList(),
  );
  void addCustomWidget({
    String? title,
    String? unit,
    double? target,
    double? step,
    Tone tone = 'lime',
    WidgetSize size = '1x1',
  }) => setWidgets([
    SomnaWidget(
      id: 'w-${_uid()}',
      kind: 'custom',
      size: size,
      tone: tone,
      visible: true,
      title: title,
      unit: unit,
      target: target,
      step: step,
      value: 0,
      day: dateKey(_now()),
    ),
    ...widgets,
  ]);
  void deleteWidget(String id) =>
      setWidgets(widgets.where((w) => w.id != id).toList());
  void bumpWidget(String id) => setWidgets(
    widgets
        .map(
          (w) => w.id == id
              ? w.copyWith(
                  value: (w.value ?? 0) + (w.step ?? 1),
                  day: dateKey(_now()),
                )
              : w,
        )
        .toList(),
  );
  void resetWidgets() => setWidgets([
    ...widgets.where((w) => w.kind == 'custom'),
    ...defaultWidgets,
  ]);
  void resetAll() {
    _setState(
      defaultState(_now()).patch({
        'onboarded': onboarded,
        'userName': userName,
        'localAccount': localAccount?.toJson(),
        'membership': membership?.toJson(),
      }),
    );
    _scheduleSoundTimer();
  }

  Future<void> registerLocalProfile(RegistrationInput input) async {
    if (validateRegistration(input).isNotEmpty) {
      throw ArgumentError('Invalid local registration');
    }
    final account = LocalAccount(
      email: normalizeEmail(input.email),
      createdAt: localAccount?.createdAt ?? isoUtc(_now()),
    );
    final identity = {
      'userName': input.name.trim(),
      'localAccount': account.toJson(),
    };
    _saveTimer?.cancel();
    await _write(identity);
    if (_disposed) return;
    _setState(_state);
  }

  Future<bool> activate(SubscriptionPlan plan) async =>
      _saveMembership(membershipFor(plan, _now()));
  Future<bool> deactivate() async => _saveMembership(null);
  Future<bool> cancelMembership() => deactivate();
  Future<bool> _saveMembership(Membership? value) async {
    final change = {'membership': value?.toJson()};
    _saveTimer?.cancel();
    try {
      await _write(change);
    } catch (_) {
      _subscriptionError = 'Не удалось сохранить подписку. Разрешите хранение данных в браузере и попробуйте ещё раз.';
      if (!_disposed) notifyListeners();
      return false;
    }
    if (_disposed) return true;
    _subscriptionError = null;
    _setState(_state);
    _scheduleMembershipExpiry();
    return true;
  }

  void _scheduleMembershipExpiry() {
    _membershipTimer?.cancel();
    if (membership == null) return;
    final remaining = DateTime.parse(membership!.endsAt)
        .difference(_now())
        .inMilliseconds;
    if (remaining <= 0) return;
    _membershipTimer = Timer(
      Duration(milliseconds: math.min(remaining, 2147483647)),
      () {
        _scheduleMembershipExpiry();
        notifyListeners();
      },
    );
  }

  @override
  void dispose() {
    if (_autoRefresh) WidgetsBinding.instance.removeObserver(this);
    unawaited(flush());
    _disposed = true;
    for (final timer in [
      _saveTimer,
      _dayTimer,
      _toastTimer,
      _soundTimer,
      _membershipTimer,
    ]) {
      timer?.cancel();
    }
    super.dispose();
  }
}

class SomnaScope extends InheritedNotifier<SomnaStore> {
  const SomnaScope({super.key, required SomnaStore store, required super.child})
    : super(notifier: store);
  static SomnaStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SomnaScope>();
    if (scope == null) {
      throw FlutterError('SomnaScope.of() requires a SomnaScope ancestor');
    }
    return scope.notifier!;
  }
}
