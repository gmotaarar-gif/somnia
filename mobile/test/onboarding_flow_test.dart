import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/screens/today.dart';
import 'package:somna/shell/app.dart';
import 'package:somna/shell/onboarding.dart';
import 'package:somna/shell/onboarding_controls.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/ui/sheets.dart';

void main() {
  SomnaStore store({
    JsonMap changes = const {},
    Future<bool> Function()? permission,
  }) {
    final s = SomnaStore(
      initialState: defaultState(DateTime(2030, 1, 2)).patch({
        'theme': 'dark',
        // A first run: nothing has been recorded yet.
        'nights': <JsonMap>[],
        'moods': <JsonMap>[],
        'sessions': <JsonMap>[],
        'wellbeing': <JsonMap>[],
        'water': {'day': '2030-01-02', 'ml': 0},
        ...changes,
      }),
      now: () => DateTime(2030, 1, 2, 10),
      autoRefresh: false,
      requestReminderPermission: permission,
    );
    addTearDown(s.dispose);
    return s;
  }

  Future<void> boot(
    WidgetTester tester,
    SomnaStore s, {
    SheetRegistry? registry,
    Size size = const Size(360, 780),
  }) async {
    tester.view.physicalSize = size * 3;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(SomnaApp(store: s, sheetRegistry: registry));
    await tester.pump(const Duration(milliseconds: 600));
  }

  // The aurora never settles on onboarding, so steps are pumped by hand.
  Future<void> settle(WidgetTester tester) async {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump(const Duration(milliseconds: 900));
  }

  Future<void> press(WidgetTester tester, String text) async {
    await tester.ensureVisible(find.text(text));
    await tester.pump();
    await tester.tap(find.text(text));
    await settle(tester);
  }

  Future<void> build(WidgetTester tester) async {
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 620));
    }
    await settle(tester);
  }

  Future<void> skipToPlan(WidgetTester tester) async {
    await press(tester, 'Начать');
    await press(tester, 'Позже');
    await build(tester);
  }

  String step(WidgetTester tester) => tester
      .getSemantics(find.bySemanticsLabel(RegExp(r'^Шаг \d из 9$')))
      .label;

  testWidgets('nine stages collect answers and commit them', (tester) async {
    var asked = 0;
    final s = store(
      permission: () async {
        asked++;
        return true;
      },
    );
    await boot(tester, s);
    expect(step(tester), 'Шаг 1 из 9');
    expect(
      find.bySemanticsLabel('Сон и состояние в одном ритме'),
      findsOneWidget,
    );
    expect(find.text('Позже').hitTestable(), findsNothing);
    await press(tester, 'Начать');

    expect(find.text('Как к вам обращаться?'), findsOneWidget);
    await press(tester, 'Далее');
    expect(step(tester), 'Шаг 2 из 9', reason: 'a name is required');
    await tester.enterText(find.byType(TextField), '  Мира ');
    await press(tester, 'Далее');

    expect(find.text('Что хотите улучшить?'), findsOneWidget);
    await press(tester, 'Быстрее засыпать');
    await press(tester, 'Больше энергии утром');
    await press(tester, 'Далее');

    expect(find.text('Как вы спите сейчас?'), findsOneWidget);
    expect(find.bySemanticsLabel('6:30'), findsOneWidget);
    await press(tester, 'Часто');
    await press(tester, 'Далее');

    expect(find.text('Ваш режим'), findsOneWidget);
    expect(find.text('Лучший подъём по циклам: 07:14'), findsOneWidget);
    await press(tester, 'Сова');
    expect(find.text('Лучший подъём по циклам: 08:14'), findsOneWidget);
    await press(tester, 'Далее');

    expect(find.text('Как вы сейчас?'), findsOneWidget);
    expect(find.text('Слегка приятно'), findsOneWidget);
    await tester.tapAt(
      tester.getTopLeft(find.byType(SomnaSlider)) + const Offset(300, 22),
    );
    await settle(tester);
    expect(find.text('Очень приятно'), findsOneWidget);
    await press(tester, 'Далее');

    expect(find.text('Соберите главный экран'), findsOneWidget);
    for (final title in ['Вода', 'Циклы сна']) {
      await tester.ensureVisible(find.bySemanticsLabel(title));
      await tester.pump();
      await tester.tap(find.bySemanticsLabel(title));
      await settle(tester);
    }
    await press(tester, 'Далее');

    expect(find.bySemanticsLabel('Собираем ваш план'), findsOneWidget);
    expect(find.text('Настраиваем напоминание'), findsOneWidget);
    expect(find.text('Далее'), findsNothing);
    await build(tester);

    expect(find.text('Мира, ваш план готов'), findsOneWidget);
    expect(find.bySemanticsLabel('8:00'), findsOneWidget);
    expect(find.text('00:30'), findsOneWidget);
    expect(find.text('08:30'), findsOneWidget);
    expect(find.text('23:30'), findsOneWidget);
    expect(find.text('Вернём до 1 ч 30 мин сна за ночь'), findsOneWidget);
    expect(find.text('Сфокусируемся на утренней бодрости'), findsOneWidget);
    expect(find.text('Главная цель: стабильный подъём'), findsOneWidget);
    expect(find.text('Создать профиль'), findsOneWidget);
    expect(asked, 0);

    await tester.ensureVisible(find.text('Продолжить без регистрации'));
    await tester.tap(find.text('Продолжить без регистрации'));
    await tester.pumpAndSettle();
    expect(asked, 1);
    expect(s.onboarded, true);
    expect(s.userName, 'Мира');
    expect(s.focus, [
      'Стабильный подъём',
      'Снять вечерний стресс',
      'Быстрее засыпать',
    ]);
    expect(s.chronotype, 'night');
    expect(
      [s.bedGoal, s.wakeGoal, s.reminderTime],
      ['00:30', '08:30', '23:30'],
    );
    expect(s.reminder, true);
    expect(
      {for (final w in s.widgets.where((w) => w.visible)) w.id},
      {'w-streak', 'w-evening', 'w-cycle'},
    );
    expect(s.moods.single.valence, greaterThan(.78));
    expect(s.toast?.text, 'Добро пожаловать, Мира');
    expect(s.sheet, null);
    expect(find.byType(TodayScreen).hitTestable(), findsOneWidget);
  });

  testWidgets('skipping keeps defaults and offers registration', (
    tester,
  ) async {
    final s = store(), registry = SheetRegistry();
    addTearDown(registry.dispose);
    registry.register(registrationSheetId, (_, _) => const Text('Форма'));
    await boot(tester, s, registry: registry);
    await skipToPlan(tester);
    expect(find.text('Ваш план готов'), findsOneWidget);
    expect(find.text('Цель можно выбрать позже'), findsNothing);
    await press(tester, 'Создать профиль');
    await tester.pumpAndSettle();
    expect(s.onboarded, true);
    expect(s.userName, '');
    expect(s.moods, isEmpty, reason: 'the check-in was never answered');
    expect(s.toast?.text, 'Добро пожаловать!');
    expect(s.sheet, registrationSheetId);
    expect(find.text('Форма'), findsOneWidget);
  });

  testWidgets('registered profile opens the app directly', (tester) async {
    final s = store(
      changes: {
        'userName': 'Мира',
        'localAccount': const LocalAccount(
          email: 'mira@example.com',
          createdAt: '2030-01-01T00:00:00.000Z',
        ).toJson(),
      },
    );
    await boot(tester, s);
    await skipToPlan(tester);
    expect(find.text('Мира, ваш план готов'), findsOneWidget);
    expect(find.text('Продолжить без регистрации'), findsNothing);
    await press(tester, 'Открыть Somna');
    await tester.pumpAndSettle();
    expect(s.onboarded, true);
    expect(s.sheet, null);
  });

  testWidgets('back returns to the previous stage and keeps answers', (
    tester,
  ) async {
    final s = store();
    await boot(tester, s);
    await press(tester, 'Начать');
    await tester.enterText(find.byType(TextField), 'Мира');
    await press(tester, 'Далее');
    expect(step(tester), 'Шаг 3 из 9');
    await tester.tap(find.bySemanticsLabel('Назад'));
    await settle(tester);
    expect(step(tester), 'Шаг 2 из 9');
    expect(find.text('Мира'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await settle(tester);
    expect(step(tester), 'Шаг 1 из 9');
    expect(find.bySemanticsLabel('Назад').hitTestable(), findsNothing);
  });

  testWidgets('goals are capped at three', (tester) async {
    final s = store(changes: {'focus': <String>[]});
    await boot(tester, s);
    await press(tester, 'Начать');
    await tester.enterText(find.byType(TextField), 'Мира');
    await press(tester, 'Далее');
    for (final goal in [
      'Меньше экрана ночью',
      'Понять своё настроение',
      'Больше энергии утром',
      'Быстрее засыпать',
    ]) {
      await press(tester, goal);
    }
    await press(tester, 'Понять своё настроение');
    await press(tester, 'Позже');
    await build(tester);
    expect(find.text('Главная цель: меньше экрана ночью'), findsOneWidget);
    await press(tester, 'Продолжить без регистрации');
    await tester.pumpAndSettle();
    expect(s.focus, ['Меньше экрана ночью', 'Больше энергии утром']);
  });

  testWidgets('reminder can be declined without a permission prompt', (
    tester,
  ) async {
    var asked = 0;
    final s = store(
      permission: () async {
        asked++;
        return true;
      },
    );
    await boot(tester, s);
    await skipToPlan(tester);
    expect(find.text('22:30'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Напоминать об отбое'));
    await settle(tester);
    expect(find.text('выкл'), findsOneWidget);
    await press(tester, 'Продолжить без регистрации');
    await tester.pumpAndSettle();
    expect(asked, 0);
    expect(s.onboarded, true);
    expect(s.reminder, false);
  });

  testWidgets('permission error is recoverable', (tester) async {
    var fails = true;
    final s = store(
      permission: () async {
        if (fails) throw StateError('denied');
        return true;
      },
    );
    await boot(tester, s);
    await skipToPlan(tester);
    await press(tester, 'Продолжить без регистрации');
    expect(s.onboarded, false);
    expect(find.text('Не удалось начать. Попробуйте ещё раз.'), findsOneWidget);
    fails = false;
    await press(tester, 'Продолжить без регистрации');
    await tester.pumpAndSettle();
    expect(s.onboarded, true);
    expect(find.byType(TodayScreen).hitTestable(), findsOneWidget);
  });

  for (final theme in ['dark', 'light']) {
    testWidgets('every stage fits a compact display with large text: $theme', (
      tester,
    ) async {
      final s = store(changes: {'theme': theme});
      tester.platformDispatcher.textScaleFactorTestValue = 1.4;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await boot(tester, s, size: const Size(320, 640));
      await press(tester, 'Начать');
      await tester.enterText(find.byType(TextField), 'Александра-Виктория');
      for (var i = 2; i <= 7; i++) {
        expect(step(tester), 'Шаг $i из 9');
        expect(find.text('Далее').hitTestable(), findsOneWidget);
        expect(tester.takeException(), null, reason: 'stage $i');
        await press(tester, 'Далее');
      }
      await build(tester);
      expect(find.text('Создать профиль').hitTestable(), findsOneWidget);
      expect(
        find.text('Продолжить без регистрации').hitTestable(),
        findsOneWidget,
      );
      expect(tester.takeException(), null);
    });
  }

  group('controls', () {
    Future<void> host(
      WidgetTester tester,
      Widget child, {
      bool still = false,
    }) => tester.pumpWidget(
      MaterialApp(
        theme: somnaTheme(Brightness.dark),
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: still),
          child: Scaffold(
            body: Center(child: SizedBox(width: 320, child: child)),
          ),
        ),
      ),
    );

    testWidgets('time scrubber reports every step it crosses', (tester) async {
      final seen = <String>[];
      var value = '23:30';
      await host(
        tester,
        StatefulBuilder(
          builder: (context, setState) => TimeScrubber(
            label: 'Отбой',
            value: value,
            onChanged: (v) {
              seen.add(v);
              setState(() => value = v);
            },
          ),
        ),
      );
      final ruler = find.bySemanticsLabel('Отбой');
      final gesture = await tester.startGesture(tester.getCenter(ruler));
      for (var i = 0; i < 10; i++) {
        await gesture.moveBy(const Offset(-10, 0));
        await tester.pump(const Duration(milliseconds: 40));
      }
      await tester.pump(const Duration(milliseconds: 200));
      await gesture.up();
      await tester.pumpAndSettle();
      // 2 px a minute: left is later, past midnight.
      expect(seen.last, '00:20');
      expect(seen, containsAllInOrder(['23:55', '00:00', '00:05']));
      expect(seen.every((t) => int.parse(t.substring(3)) % 5 == 0), true);
      expect(tester.getSemantics(ruler).value, '00:20');
    });

    testWidgets('time scrubber follows a value set from outside', (
      tester,
    ) async {
      final seen = <String>[];
      Future<void> show(String value) => host(
        tester,
        TimeScrubber(label: 'Отбой', value: value, onChanged: seen.add),
      );
      await show('23:30');
      await show('00:30');
      await tester.pumpAndSettle();
      expect(
        tester.getSemantics(find.bySemanticsLabel('Отбой')).value,
        '00:30',
      );
      expect(seen, isEmpty, reason: 'following is not a user change');
    });

    testWidgets('lens ruler steps by drag, tap and without motion', (
      tester,
    ) async {
      for (final still in [false, true]) {
        final seen = <double>[];
        var value = 6.5;
        await host(
          tester,
          still: still,
          StatefulBuilder(
            key: ValueKey(still),
            builder: (context, setState) => LensRuler(
              label: 'Часы',
              min: 4,
              max: 10,
              step: .5,
              value: value,
              format: (v) => '$v',
              onChanged: (v) {
                seen.add(v);
                setState(() => value = v);
              },
            ),
          ),
        );
        final ruler = find.byType(LensRuler);
        expect(tester.getSemantics(ruler).value, '6.5');
        await tester.tapAt(tester.getCenter(ruler) + const Offset(66, 0));
        await tester.pumpAndSettle();
        expect(seen.last, 7.0);
        final gesture = await tester.startGesture(tester.getCenter(ruler));
        for (var i = 0; i < 6; i++) {
          await gesture.moveBy(const Offset(20, 0));
          await tester.pump(const Duration(milliseconds: 40));
        }
        await tester.pump(const Duration(milliseconds: 200));
        await gesture.up();
        await tester.pumpAndSettle();
        expect(seen.last, 6.0);
        await tester.drag(ruler, const Offset(2000, 0));
        await tester.pumpAndSettle();
        expect(seen.last, 4.0, reason: 'clamped to the range');
        expect(tester.getSemantics(ruler).value, '4.0');
      }
    });

    testWidgets('slider snaps to its step across the range', (tester) async {
      final seen = <double>[];
      await host(
        tester,
        SomnaSlider(
          label: 'Состояние',
          min: -1,
          max: 1,
          step: .02,
          value: .3,
          onChanged: seen.add,
        ),
      );
      final slider = find.byType(SomnaSlider);
      await tester.tapAt(tester.getTopLeft(slider) + const Offset(2, 22));
      await tester.tapAt(tester.getCenter(slider));
      await tester.tapAt(tester.getTopRight(slider) + const Offset(-2, 22));
      expect(seen, [-1.0, 0.0, 1.0]);
    });
  });
}
