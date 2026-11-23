import 'dart:async';

import 'package:flutter/widgets.dart';

import '../data/store.dart';

const permissionToast = 'Разрешите уведомления для Somna в настройках телефона';
const reminderFailureToast =
    'Не удалось обновить напоминания. Попробуйте ещё раз.';

class ReminderSettings {
  final bool bedtime, morning;
  final String bedtimeTime, morningTime;
  const ReminderSettings({
    required this.bedtime,
    required this.bedtimeTime,
    required this.morning,
    required this.morningTime,
  });
  factory ReminderSettings.fromStore(SomnaStore s) => ReminderSettings(
    bedtime: s.reminder,
    bedtimeTime: s.reminderTime,
    morning: s.morningReminder,
    morningTime: s.morningReminderTime,
  );
  String get fingerprint => '$bedtime/$bedtimeTime/$morning/$morningTime';
}

class DailyReminder {
  final int id, hour, minute;
  final String title, body;
  const DailyReminder(this.id, this.hour, this.minute, this.title, this.body);
}

bool validReminderTime(String value) =>
    RegExp(r'^([01]\d|2[0-3]):[0-5]\d$').hasMatch(value);
List<DailyReminder> dailyReminders(ReminderSettings s) => [
  for (final (id, enabled, time, title, body) in [
    (
      1001,
      s.bedtime,
      s.bedtimeTime,
      'Пора замедлиться 🌙',
      'Оставьте заботы дня. Начнём готовиться ко сну?',
    ),
    (
      1002,
      s.morning,
      s.morningTime,
      'Доброе утро ☀️',
      'Как вы себя чувствуете? Уделите минутку себе.',
    ),
  ])
    if (enabled && validReminderTime(time))
      DailyReminder(
        id,
        int.parse(time.substring(0, 2)),
        int.parse(time.substring(3)),
        title,
        body,
      ),
];

abstract interface class ReminderScheduler {
  bool get supported;
  Future<void> initialize(void Function(int) onTap);
  Future<void> refreshTimezone();
  Future<void> cancel(int id);
  Future<bool> hasPermission();
  Future<bool> requestPermission();
  Future<void> schedule(DailyReminder reminder);
}

class ReminderService with WidgetsBindingObserver {
  final ReminderScheduler scheduler;
  ReminderService(this.scheduler);
  Future<void> _pending = Future.value();
  SomnaStore? _store;
  String? _fingerprint;
  bool _updating = false, _disposed = false;
  Future<T> _enqueue<T>(Future<T> Function() action) {
    final result = _pending.then((_) => action());
    _pending = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }

  Future<void> start(SomnaStore store) async {
    _store = store;
    if (!scheduler.supported) return;
    store.addListener(_changed);
    WidgetsBinding.instance.addObserver(this);
    try {
      await scheduler.initialize(routeTap);
      if (!_disposed) await sync(ReminderSettings.fromStore(store));
    } catch (_) {
      if (!_disposed) store.notify(reminderFailureToast);
    }
  }

  void routeTap(int id) {
    if (_disposed) return;
    if (id == 1001) _store?.handleReminder('cycles');
    if (id == 1002) _store?.handleReminder('mood');
  }

  void _changed() {
    if (_updating || _disposed) return;
    final settings = ReminderSettings.fromStore(_store!);
    if (settings.fingerprint == _fingerprint) return;
    _fingerprint = settings.fingerprint;
    unawaited(
      sync(settings).catchError((Object _) {
        if (!_disposed) _store?.notify(reminderFailureToast);
      }),
    );
  }

  Future<void> _cancel() async {
    await scheduler.cancel(1001);
    await scheduler.cancel(1002);
  }

  Future<void> _schedule(ReminderSettings settings) async {
    await scheduler.refreshTimezone();
    if (!await scheduler.hasPermission()) return;
    for (final reminder in dailyReminders(settings)) {
      await scheduler.schedule(reminder);
    }
  }

  Future<void> sync(ReminderSettings settings) {
    if (!scheduler.supported) return Future.value();
    _fingerprint = settings.fingerprint;
    return _enqueue(() async {
      if (_disposed) return;
      await _cancel();
      await _schedule(settings);
    });
  }

  Future<bool> requestPermission() {
    if (!scheduler.supported) return Future.value(true);
    return _enqueue(() async {
      try {
        await _cancel();
        return await scheduler.requestPermission();
      } catch (_) {
        return false;
      } finally {
        if (!_disposed && _store != null) {
          try {
            await _schedule(ReminderSettings.fromStore(_store!));
          } catch (_) {
            if (!_disposed) _store?.notify(reminderFailureToast);
          }
        }
      }
    });
  }

  Future<void> setEnabled(bool morning, bool enabled) => _enqueue(() async {
    if (_disposed || _store == null) return;
    final store = _store!;
    try {
      if (scheduler.supported) await _cancel();
      var granted = true;
      if (enabled && scheduler.supported) {
        try {
          granted = await scheduler.requestPermission();
        } catch (_) {
          granted = false;
        }
      }
      if (_disposed) return;
      _updating = true;
      try {
        store.patch({
          morning ? 'morningReminder' : 'reminder': enabled && granted,
        });
      } finally {
        _updating = false;
      }
      final settings = ReminderSettings.fromStore(store);
      _fingerprint = settings.fingerprint;
      if (enabled && !granted) store.notify(permissionToast);
      if (scheduler.supported) await _schedule(settings);
    } catch (_) {
      if (!_disposed) store.notify(reminderFailureToast);
    }
  });
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _store != null && !_disposed) {
      unawaited(
        sync(ReminderSettings.fromStore(_store!)).catchError((Object _) {
          if (!_disposed) _store?.notify(reminderFailureToast);
        }),
      );
    }
  }

  void dispose() {
    _disposed = true;
    _store?.removeListener(_changed);
    WidgetsBinding.instance.removeObserver(this);
  }
}
