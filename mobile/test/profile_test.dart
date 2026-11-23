import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/time.dart';
import 'package:somna/native/export.dart';
import 'package:somna/profile/slide_to_confirm.dart';
import 'package:somna/profile/subscription_sheet.dart';
import 'package:somna/shell/app.dart';
import 'package:somna/shell/profile_sheet.dart';
import 'package:somna/ui/sheets.dart';

import 'export_test.dart' show FakeExportTarget;
import 'helpers.dart';

SomnaStore _store([
  JsonMap changes = const {},
  MemoryPersistence? persistence,
]) => SomnaStore(
  initialState: defaultState().patch({
    'onboarded': true,
    'nights': [],
    'moods': [],
    'sessions': [],
    'wellbeing': [],
    ...changes,
  }),
  persistence: persistence,
  autoRefresh: false,
);

Future<void> _boot(
  WidgetTester tester,
  SomnaStore store, {
  String? sheet,
  String? arg,
  SheetRegistry? registry,
}) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(store.dispose);
  await tester.pumpWidget(
    SomnaApp(
      store: store,
      sheetRegistry: registry,
      exporter: DataExporter(FakeExportTarget()),
    ),
  );
  await tester.pumpAndSettle();
  if (sheet != null) {
    store.openSheet(sheet, arg);
    await tester.pumpAndSettle();
  }
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

/// A tap whose toast is still on screen: settling would outlast it.
Future<void> _press(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

Finder _inProfile(String text) =>
    find.descendant(of: find.byType(ProfileSheet), matching: find.text(text));

void main() {
  test('prices and dates read as in ru-RU', () {
    expect(rubles(299), '299 ₽');
    expect(rubles(1990), '1\u00a0990 ₽');
    expect(yearlySaving, 45);
    expect(
      membershipDateLabel(isoUtc(DateTime(2027, 11, 22, 12))),
      '22 ноября 2027 г.',
    );
  });

  group('profile', () {
    testWidgets('an empty journal shows zero stats and no weekly goal', (
      tester,
    ) async {
      final store = _store();
      await _boot(tester, store, sheet: 'profile');
      expect(find.text('Профиль'), findsOneWidget);
      expect(find.text('Данные хранятся только на этом устройстве'), findsOne);
      expect(_inProfile('S'), findsOneWidget);
      expect(_inProfile('0'), findsNWidgets(3));
      for (final label in ['ночей', 'чек-инов', 'мин практик']) {
        expect(find.text(label), findsOneWidget);
      }
      expect(find.text('Цель недели'), findsNothing);
      expect(find.text('Создать профиль'), findsOneWidget);
      expect(find.text('Больше заботы о себе · узнать о подписке'), findsOne);
      expect(find.textContaining('скоро появятся'), findsNothing);
    });

    testWidgets('stats count records, the name edits in place', (tester) async {
      final store = _store({
        'userName': 'Аня',
        'nights': [night('2026-11-20').toJson(), night('2026-11-21').toJson()],
        'moods': [mood(21).toJson()],
        'sessions': [session(20).toJson(), session(21).toJson()],
        'weeklyGoal': {'id': 'calm', 'text': 'Ложиться до полуночи'},
      });
      await _boot(tester, store, sheet: 'profile');
      expect(_inProfile('А'), findsOneWidget);
      expect(_inProfile('2'), findsOneWidget);
      expect(find.text('ночи'), findsOneWidget);
      expect(_inProfile('1'), findsOneWidget);
      expect(find.text('чек-ин'), findsOneWidget);
      expect(_inProfile('10'), findsOneWidget);
      expect(find.text('Ложиться до полуночи'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('profile-name')),
        'Мира',
      );
      await tester.pumpAndSettle();
      expect(store.userName, 'Мира');
      expect(_inProfile('М'), findsOneWidget);
    });

    testWidgets('theme, chronotype and sleep goal are saved', (tester) async {
      final store = _store();
      await _boot(tester, store, sheet: 'profile');
      expect(
        find.text('Оформление меняется вместе с настройками устройства.'),
        findsOneWidget,
      );
      await _tap(tester, find.text('Тёмное'));
      expect(store.theme, 'dark');
      expect(find.textContaining('Ваш выбор сохранится'), findsOneWidget);
      await _tap(tester, find.text('Светлое'));
      expect(store.theme, 'light');

      await _tap(tester, find.text('Сова'));
      expect(store.chronotype, 'night');

      expect(
        find.text(durationRu(spanMinutes(store.bedGoal, store.wakeGoal))),
        findsOne,
      );
      await _tap(tester, find.text('Отбой'));
      expect(find.byType(TimePickerDialog), findsOneWidget);
      await tester.tap(find.text('Сохранить'));
      await tester.pumpAndSettle();
      expect(find.byType(TimePickerDialog), findsNothing);

      expect(tester.takeException(), null);
    });

    testWidgets('restoring widgets asks first and keeps custom widgets', (
      tester,
    ) async {
      final store = _store();
      store.setWidgets(store.widgets.take(2).toList());
      await _boot(tester, store, sheet: 'profile');
      await _tap(tester, find.text('Виджеты по умолчанию'));
      expect(find.textContaining('Ваши привычки сохранятся'), findsOneWidget);
      await _tap(tester, find.text('Отмена'));
      expect(store.widgets.length, 2);
      await _tap(tester, find.text('Виджеты по умолчанию'));
      await _tap(tester, find.text('Да, восстановить'));
      expect(store.widgets.length, defaultWidgets.length);
      expect(find.text('Да, восстановить'), findsNothing);
    });

    testWidgets('resetting the journal takes a full slide, not a tap', (
      tester,
    ) async {
      final store = _store({
        'userName': 'Аня',
        'nights': [night('2026-11-21').toJson()],
      });
      await _boot(tester, store, sheet: 'profile');
      await _tap(tester, find.text('Сбросить журнал'));
      expect(find.textContaining('Это нельзя отменить'), findsOneWidget);
      final slider = find.byType(SlideToConfirm);
      await tester.ensureVisible(slider);
      await tester.pumpAndSettle();
      final width = tester.getSize(slider).width;
      final from = tester.getTopLeft(slider) + const Offset(28, 28);
      await tester.tapAt(from);
      await tester.dragFrom(from, Offset(width * .4, 0));
      await tester.pumpAndSettle();
      expect(store.nights.length, 1, reason: 'a short slide springs back');
      await tester.dragFrom(from, Offset(width, 0));
      await tester.pump();
      expect(store.nights.any((n) => n.id == '2026-11-21'), false);
      expect(store.userName, 'Аня');
      expect(find.text('Журнал сброшен'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 1500));
      await tester.pumpAndSettle();
      expect(find.byType(SlideToConfirm), findsNothing);
    });

    testWidgets('toggle and reset slider work from a keyboard', (tester) async {
      final store = _store({
        'nights': [night('2026-11-21').toJson()],
      });
      await _boot(tester, store, sheet: 'profile');
      Future<void> focus(Finder control) async {
        await tester.ensureVisible(control);
        await tester.pumpAndSettle();
        Focus.of(
          tester.element(
            find.descendant(of: control, matching: find.byType(Listener)).last,
          ),
        ).requestFocus();
        await tester.pump();
      }

      final morning = store.morningReminder;
      await focus(find.bySemanticsLabel('Утренний чек-ин'));
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(store.morningReminder, !morning);

      await _tap(tester, find.text('Сбросить журнал'));
      await focus(find.byType(SlideToConfirm));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(store.nights.any((n) => n.id == '2026-11-21'), false);
      await tester.pump(const Duration(milliseconds: 1500));
      await tester.pumpAndSettle();
    });

    testWidgets('restarting onboarding closes the sheet', (tester) async {
      final store = _store();
      await _boot(tester, store, sheet: 'profile');
      final restart = find.text('Пройти знакомство заново');
      await tester.ensureVisible(restart);
      await tester.pumpAndSettle();
      await tester.tap(restart);
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(store.onboarded, false);
      expect(store.sheet, null);
      expect(find.text('Профиль'), findsNothing);
    });
  });

  group('local registration', () {
    testWidgets('validates, saves and returns to the profile', (tester) async {
      final store = _store({}, MemoryPersistence());
      await _boot(tester, store, sheet: 'profile');
      await _tap(tester, find.text('Создать профиль'));
      expect(find.text('Регистрация'), findsOneWidget);
      await _tap(tester, find.text('Создать локальный профиль'));
      expect(find.text('Введите имя'), findsOneWidget);
      expect(find.text('Введите почту'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('registration-name')),
        'Аня',
      );
      await tester.enterText(
        find.byKey(const ValueKey('registration-email')),
        'anya@',
      );
      await tester.pumpAndSettle();
      expect(find.text('Введите имя'), findsNothing);
      await _tap(tester, find.text('Создать локальный профиль'));
      expect(
        find.text('Проверьте адрес, например name@example.com'),
        findsOneWidget,
      );
      expect(store.localAccount, null);
      await tester.enterText(
        find.byKey(const ValueKey('registration-email')),
        ' Anya@Example.com ',
      );
      await _tap(tester, find.text('Создать локальный профиль'));
      expect(find.text('Профиль готов, Аня'), findsOneWidget);
      expect(store.localAccount?.email, 'anya@example.com');
      expect(store.userName, 'Аня');
      await _tap(tester, find.text('Продолжить'));
      expect(find.text('Локальный профиль'), findsOneWidget);
      expect(find.text('anya@example.com'), findsOneWidget);
      expect(store.sheet, 'profile');
    });

    testWidgets('editing keeps the creation date, a failed save says so', (
      tester,
    ) async {
      final persistence = MemoryPersistence();
      final store = _store({
        'userName': 'Аня',
        'localAccount': {
          'email': 'anya@example.com',
          'createdAt': '2026-01-02T03:04:05.000Z',
        },
      }, persistence);
      await _boot(tester, store, sheet: 'profile');
      await _tap(tester, find.text('Локальный профиль'));
      expect(find.text('Ваш профиль'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('registration-email')),
        'new@example.com',
      );
      persistence.fail = true;
      await _tap(tester, find.text('Сохранить изменения'));
      expect(find.textContaining('Не удалось сохранить профиль'), findsOne);
      expect(store.localAccount?.email, 'anya@example.com');
      persistence.fail = false;
      await _tap(tester, find.text('Сохранить изменения'));
      expect(store.localAccount?.email, 'new@example.com');
      expect(store.localAccount?.createdAt, '2026-01-02T03:04:05.000Z');
    });
  });

  group('plus', () {
    testWidgets('offers both demo plans and activates the chosen one', (
      tester,
    ) async {
      final store = _store({}, MemoryPersistence());
      await _boot(tester, store, sheet: 'profile');
      await _tap(tester, find.text('Больше заботы о себе · узнать о подписке'));
      expect(store.sheet, 'subscription');
      expect(find.text('Меньше напряжения.\nБольше себя.'), findsOneWidget);
      expect(find.text('1\u00a0990 ₽'), findsOneWidget);
      expect(find.text('299 ₽'), findsOneWidget);
      expect(find.text('−45%'), findsOneWidget);
      expect(find.text('≈ 166 ₽ в месяц'), findsOneWidget);
      expect(find.textContaining('деньги не списываются'), findsOneWidget);
      await _tap(tester, find.text('На месяц'));
      await _press(tester, find.text('Включить Plus бесплатно'));
      expect(store.isPlus, true);
      expect(store.membership?.plan, 'monthly');
      expect(find.text('Somna Plus включён · без списаний'), findsOneWidget);
      expect(find.text('Ваше время для себя'), findsOneWidget);
      expect(find.text('Plus · на месяц'), findsOneWidget);
      expect(
        find.text(membershipDateLabel(store.membership!.endsAt)),
        findsOneWidget,
      );
      expect(find.text('0 ₽ · демо'), findsOneWidget);
      await _tap(tester, find.text('Готово'));
      expect(store.sheet, 'profile');
      expect(find.text('Подписка активна · управление'), findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('turning Plus off asks first and keeps records', (
      tester,
    ) async {
      final store = _store({
        'nights': [night('2026-11-21').toJson()],
      }, MemoryPersistence());
      await store.activate('yearly');
      await _boot(tester, store, sheet: 'subscription');
      expect(find.text('Plus · на год'), findsOneWidget);
      await _tap(tester, find.text('Отключить демоподписку'));
      expect(find.text('Отключить Plus сейчас?'), findsOneWidget);
      await _tap(tester, find.text('Оставить Plus'));
      expect(store.isPlus, true);
      await _tap(tester, find.text('Отключить демоподписку'));
      await _press(tester, find.text('Отключить'));
      expect(store.isPlus, false);
      expect(store.nights.length, 1);
      expect(find.text('Plus отключён. Ваши записи сохранены'), findsOneWidget);
      expect(find.text('Включить Plus бесплатно'), findsOneWidget);
      await _tap(tester, find.text('Продолжить бесплатно'));
      expect(store.sheet, null);
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('a failed save keeps Plus off and explains', (tester) async {
      final persistence = MemoryPersistence()..fail = true;
      final store = _store({}, persistence);
      await _boot(tester, store, sheet: 'subscription');
      await _tap(tester, find.text('Включить Plus бесплатно'));
      expect(store.isPlus, false);
      expect(find.textContaining('Не удалось сохранить подписку'), findsOne);
    });

    testWidgets('dismissing by swipe returns to the profile it came from', (
      tester,
    ) async {
      final store = _store();
      await _boot(tester, store, sheet: 'subscription', arg: 'profile');
      await tester.fling(find.text('somna plus'), const Offset(0, 900), 2500);
      await tester.pumpAndSettle();
      expect(store.sheet, 'profile');
      expect(find.text('Профиль'), findsOneWidget);
    });

    testWidgets('locked analytics shows the offer, then keeps the receipt', (
      tester,
    ) async {
      final store = _store({}, MemoryPersistence());
      final registry = SheetRegistry()
        ..register(
          'insights',
          (context, arg) => const PlusGate(child: Text('Практика')),
        );
      addTearDown(registry.dispose);
      await _boot(tester, store, sheet: 'insights', registry: registry);
      expect(find.text('Глубокая аналитика доступна с Plus'), findsOneWidget);
      expect(find.text('Практика'), findsNothing);
      await _tap(tester, find.text('Включить Plus бесплатно'));
      expect(store.sheet, 'subscription');
      expect(store.sheetArg, 'insights');
      expect(find.text('Ваше время для себя'), findsOneWidget);
      await _tap(tester, find.text('Глубокая аналитика').first);
      expect(store.sheet, 'insights');
      expect(find.text('Практика'), findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
    });
  });

  group('awards', () {
    testWidgets('nothing is open on an empty journal', (tester) async {
      final store = _store();
      await _boot(tester, store, sheet: 'profile');
      await _tap(tester, find.text('Достижения'));
      expect(store.sheet, 'awards');
      expect(find.text('Открыто 0 из 11'), findsOneWidget);
      expect(find.text('Первая неделя'), findsOneWidget);
      expect(find.text('Свой экран'), findsOneWidget);
      expect(find.byIcon(Icons.check), findsNothing);
    });

    testWidgets('earned awards are counted and marked', (tester) async {
      final store = _store({
        'sessions': [for (var d = 1; d <= 6; d++) session(d).toJson()],
        'moods': [for (var d = 1; d <= 10; d++) mood(d).toJson()],
      });
      await _boot(tester, store, sheet: 'awards');
      expect(find.text('Открыто 2 из 11'), findsOneWidget);
      expect(find.byIcon(Icons.check), findsNWidgets(2));
    });
  });
}
