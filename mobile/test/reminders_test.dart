import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/store.dart';
import 'package:somna/native/reminders.dart';
import 'package:somna/native/android_reminders.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

class FakeScheduler implements ReminderScheduler {
  @override
  bool supported = true;
  bool granted = true,
      failCancel = false,
      failRequest = false,
      failSchedule = false;
  final calls = <String>[];
  final scheduled = <DailyReminder>[];
  void Function(int)? tap;
  int? launchId;
  Completer<void>? cancelGate;
  @override
  Future<void> initialize(void Function(int) onTap) async {
    tap = onTap;
    if (launchId != null) onTap(launchId!);
  }

  @override
  Future<void> refreshTimezone() async {
    calls.add('timezone');
  }

  @override
  Future<void> cancel(int id) async {
    calls.add('cancel:$id');
    if (id == 1001 && cancelGate != null) {
      final gate = cancelGate!;
      cancelGate = null;
      await gate.future;
    }
    if (failCancel) {
      failCancel = false;
      throw StateError('cancel failed');
    }
  }

  @override
  Future<bool> hasPermission() async {
    calls.add('check');
    return granted;
  }

  @override
  Future<bool> requestPermission() async {
    calls.add('request');
    if (failRequest) throw StateError('permission failed');
    return granted;
  }

  @override
  Future<void> schedule(DailyReminder reminder) async {
    calls.add('schedule:${reminder.id}');
    if (failSchedule) throw StateError('schedule failed');
    scheduled.add(reminder);
  }
}

const settings = ReminderSettings(
  bedtime: true,
  bedtimeTime: '22:30',
  morning: true,
  morningTime: '08:00',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late FakeScheduler fake;
  late ReminderService service;
  setUp(() {
    fake = FakeScheduler();
    service = ReminderService(fake);
  });
  tearDown(() => service.dispose());
  SomnaStore store() {
    final s = SomnaStore(
      initialState: defaultState().patch({
        'reminder': false,
        'morningReminder': false,
      }),
      autoRefresh: false,
    );
    addTearDown(s.dispose);
    return s;
  }

  test(
    'replaces stable ids with daily local-time reminders and exact web text',
    () async {
      await service.sync(settings);
      expect(fake.calls, [
        'cancel:1001',
        'cancel:1002',
        'timezone',
        'check',
        'schedule:1001',
        'schedule:1002',
      ]);
      final a = fake.scheduled[0], b = fake.scheduled[1];
      expect(
        [a.id, a.hour, a.minute, a.title, a.body],
        [
          1001,
          22,
          30,
          'Пора замедлиться 🌙',
          'Оставьте заботы дня. Начнём готовиться ко сну?',
        ],
      );
      expect(
        [b.id, b.hour, b.minute, b.title, b.body],
        [
          1002,
          8,
          0,
          'Доброе утро ☀️',
          'Как вы себя чувствуете? Уделите минутку себе.',
        ],
      );
    },
  );
  test('off or invalid times cancel without scheduling', () async {
    await service.sync(
      const ReminderSettings(
        bedtime: false,
        bedtimeTime: '22:30',
        morning: false,
        morningTime: '08:00',
      ),
    );
    await service.sync(
      const ReminderSettings(
        bedtime: true,
        bedtimeTime: '',
        morning: true,
        morningTime: '25:00',
      ),
    );
    expect(fake.scheduled, isEmpty);
    for (final bad in [
      '1:00',
      '24:00',
      '00:60',
      ' 08:00',
      '08:00\n',
      '08:00:00',
      'ab:cd',
    ]) {
      expect(validReminderTime(bad), false, reason: bad);
    }
    for (final good in ['00:00', '09:05', '23:59']) {
      expect(validReminderTime(good), true);
    }
  });
  test('onboarding reschedules unchanged enabled reminders after permission without a lifecycle resume', () async {
    final s = SomnaStore(
      initialState: defaultState().patch({
        'reminder': true,
        'morningReminder': false,
      }),
      autoRefresh: false,
      requestReminderPermission: service.requestPermission,
    );
    addTearDown(s.dispose);
    await service.start(s);
    fake.scheduled.clear();
    fake.calls.clear();
    expect(await s.finishOnboarding({'reminder': true}), true);
    await Future<void>.delayed(Duration.zero);
    expect(s.onboarded, true);
    expect(fake.calls, contains('request'));
    expect(fake.scheduled.map((r) => r.id), [1001]);
  });
  test('no scheduling without permission', () async {
    fake.granted = false;
    await service.sync(settings);
    expect(fake.scheduled, isEmpty);
  });
  test('unsupported platforms are no-ops', () async {
    fake.supported = false;
    await service.sync(settings);
    expect(await service.requestPermission(), true);
    await service.start(store());
    expect(fake.calls, isEmpty);
  });
  test(
    'permission exceptions return false and failed queue operations recover',
    () async {
      fake.failRequest = true;
      expect(await service.requestPermission(), false);
      fake.failCancel = true;
      await expectLater(service.sync(settings), throwsStateError);
      await service.sync(settings);
      expect(fake.scheduled.length, 2);
    },
  );
  test(
    'overlapping settings updates serialize cancel through scheduling',
    () async {
      final gate = Completer<void>();
      fake.cancelGate = gate;
      final first = service.sync(settings);
      final second = service.sync(settings);
      await Future<void>.delayed(Duration.zero);
      expect(fake.calls, ['cancel:1001']);
      gate.complete();
      await Future.wait([first, second]);
      expect(fake.calls, [
        'cancel:1001',
        'cancel:1002',
        'timezone',
        'check',
        'schedule:1001',
        'schedule:1002',
        'cancel:1001',
        'cancel:1002',
        'timezone',
        'check',
        'schedule:1001',
        'schedule:1002',
      ]);
    },
  );
  test(
    'taps route bedtime, morning, unknown, night-active and disposed callbacks',
    () async {
      final s = store();
      await service.start(s);
      fake.tap!(1001);
      expect(s.sheet, 'bodyscan');
      fake.tap!(1002);
      expect(s.sheet, 'mood');
      fake.tap!(9999);
      expect(s.sheet, 'mood');
      s.startNight();
      fake.tap!(1002);
      expect(s.nightMode, false);
      expect(s.sheet, 'sleep');
      service.dispose();
      s.openSheet(null);
      fake.tap!(1001);
      expect(s.sheet, null);
    },
  );
  test('cold notification launch routes after store attachment', () async {
    fake.launchId = 1001;
    final s = store();
    await service.start(s);
    expect(s.sheet, 'bodyscan');
  });
  test('toggle cancel permission reschedule is serialized and denied updates/toasts match web', () async {
    final s = store();
    await service.start(s);
    fake.calls.clear();
    await service.setEnabled(false, true);
    expect(s.reminder, true);
    expect(fake.calls, [
      'cancel:1001',
      'cancel:1002',
      'request',
      'timezone',
      'check',
      'schedule:1001',
    ]);
    fake.granted = false;
    await service.setEnabled(true, true);
    expect(s.morningReminder, false);
    expect(s.toast?.text, permissionToast);
  });
  test(
    'settings changes resync and scheduling failures show web failure toast',
    () async {
      final s = store();
      await service.start(s);
      fake.failSchedule = true;
      s.patch({'reminder': true});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(s.toast?.text, reminderFailureToast);
      fake.failSchedule = false;
      s.patch({'reminderTime': '23:59'});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(fake.scheduled.last.hour, 23);
      expect(fake.scheduled.last.minute, 59);
    },
  );
  test(
    'next occurrence is local time, advances calendar days and handles DST',
    () {
      tzdata.initializeTimeZones();
      final berlin = tz.getLocation('Europe/Berlin');
      var next = nextReminderTime(berlin, DateTime.utc(2026, 1, 2, 20), 22, 30);
      expect(next.hour, 22);
      expect(next.minute, 30);
      expect(next.day, 2);
      next = nextReminderTime(berlin, DateTime.utc(2026, 1, 2, 22), 22, 30);
      expect(next.day, 3);
      next = nextReminderTime(berlin, DateTime.utc(2026, 3, 28, 8), 8, 0);
      expect(next.day, 29);
      expect(next.hour, 8);
      expect(next.timeZoneOffset, const Duration(hours: 2));
    },
  );
}
