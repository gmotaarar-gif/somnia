import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/time.dart';
import 'package:somna/profile/journal_sheet.dart';
import 'package:somna/screens/sleep.dart';
import 'package:somna/sleep/mascot.dart';
import 'package:somna/sleep/night_line.dart';
import 'package:somna/sleep/sheets.dart';
import 'package:somna/sleep/sleep_sheet.dart';
import 'package:somna/sleep/time_scrubber.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/ui/dots.dart';
import 'package:somna/ui/sheets.dart';

SleepNight recorded(
  int daysBack, {
  String bedtime = '23:30',
  String wakeTime = '07:30',
  double duration = 480,
  int awakenings = 0,
  List<String> tags = const [],
  String? note,
}) => SleepNight(
  id: 'n$daysBack',
  dateKey: dateKey(daysAgo(daysBack)),
  bedtime: bedtime,
  wakeTime: wakeTime,
  durationMin: duration,
  quality: 80,
  awakenings: awakenings,
  tags: tags,
  note: note,
);

void main() {
  SomnaStore store({
    List<SleepNight> nights = const [],
    String theme = 'dark',
  }) {
    final s = SomnaStore(
      initialState: defaultState().patch({
        'onboarded': true,
        'theme': theme,
        'nights': nights.map((n) => n.toJson()).toList(),
      }),
      autoRefresh: false,
    );
    addTearDown(s.dispose);
    return s;
  }

  /// The Sleep tab with its sheets and night overlay, without the rest of the shell.
  Future<void> boot(WidgetTester tester, SomnaStore s) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final registry = SheetRegistry();
    addTearDown(registry.dispose);
    registerSleepSheets(registry);
    registry.register('journal', (context, arg) => JournalSheet(arg: arg));
    await tester.pumpWidget(
      SomnaScope(
        store: s,
        child: ListenableBuilder(
          listenable: s,
          builder: (context, _) => MaterialApp(
            theme: somnaTheme(Brightness.light),
            darkTheme: somnaTheme(Brightness.dark),
            themeMode: somnaThemeMode(s.theme),
            home: SheetHost(
              store: s,
              registry: registry,
              child: const Scaffold(body: SafeArea(child: SleepScreen())),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Finder dots(String value) =>
      find.byWidgetPredicate((w) => w is Dots && '${w.value}' == value);

  Future<void> scrollTo(
    WidgetTester tester,
    Finder target, [
    double delta = 300,
  ]) async {
    await tester.scrollUntilVisible(
      target,
      delta,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
  }

  Future<void> tapLabel(WidgetTester tester, String label) async {
    await tester.ensureVisible(find.bySemanticsLabel(label).first);
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel(label).first);
    await tester.pumpAndSettle();
  }

  Future<void> tapText(WidgetTester tester, String text) async {
    await tester.ensureVisible(find.text(text).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text(text).first);
    await tester.pumpAndSettle();
  }

  group('rules', () {
    test('each awakening takes eight minutes off the time in bed', () {
      expect(sleepDuration('23:30', '07:30', 0), 480);
      expect(sleepDuration('23:30', '07:30', 2), 464);
      expect(sleepDuration('07:30', '07:30', 0), 0);
      expect(sleepDuration('07:00', '07:30', 9), 0);
    });
    test('energy answers map back to their quality label', () {
      expect([for (final e in sleepEnergy) energyLevel(e.$1)], [0, 1, 2, 3, 4]);
      expect(energyLevel(75), 3);
      expect(energyLevel(100), 4);
    });
    test('night line lights half-hour slots from 18:00 and wraps', () {
      expect(nightLineRuns('23:30', '07:30'), [(11, 16)]);
      expect(nightLineRuns('10:00', '20:00'), [(32, 16), (0, 4)]);
      expect(nightLineRuns('07:30', '07:30'), isEmpty);
      expect(nightLineAlong('18:00'), 0);
      expect(nightLineAlong('06:00'), 720);
    });
    test('sleep window is measured from midnight of the wake date', () {
      expect(sleepWindow('23:30', '07:30'), (bed: -30, wake: 450));
      expect(sleepWindow('01:00', '09:00'), (bed: 60, wake: 540));
      expect(sleepWindow('07:30', '07:30'), (bed: 450, wake: 450));
    });
  });

  group('sleep screen', () {
    testWidgets('empty journal shows invitations, not zeros', (tester) async {
      final s = store();
      await boot(tester, s);
      expect(find.text('Сон'), findsOneWidget);
      expect(find.text('Цель 23:30 → 07:30 · 8 ч'), findsOneWidget);
      expect(find.text('Прошлая ночь'), findsOneWidget);
      expect(find.byType(CloudMascot), findsOneWidget);
      expect(
        find.text('Запишите первую ночь: это займёт минуту.'),
        findsOneWidget,
      );
      expect(
        find.text(
          'Лучший подъём в 07:14, если лечь в 23:30',
          skipOffstage: false,
        ),
        findsOneWidget,
      );
      await scrollTo(tester, find.text('История'), 300);
      expect(
        find.text(
          'Пока нет данных. Запишите первую ночь.',
          skipOffstage: false,
        ),
        findsOneWidget,
      );
      expect(find.text('—', skipOffstage: false), findsNWidgets(4));
      expect(
        find.text('Пока нет данных', skipOffstage: false),
        findsNWidgets(2),
      );
      expect(find.text('Здесь появятся ваши записи сна'), findsOneWidget);
      expect(find.text('Показать все ночи'), findsNothing);
      await scrollTo(tester, find.text('Записать сон'), -300);
      await tapText(tester, 'Записать сон');
      expect(s.sheet, 'sleep');
      expect(find.text('Запись сна'), findsOneWidget);
    });

    testWidgets('recorded nights fill the hero, dynamics and history', (
      tester,
    ) async {
      final s = store(
        nights: [
          for (var i = 5; i >= 1; i--) recorded(i),
          recorded(0, bedtime: '00:10', duration: 424, awakenings: 2),
        ],
      );
      await boot(tester, s);
      expect(dots('7:04'), findsOneWidget);
      expect(find.text('Хороший отдых'), findsOneWidget);
      expect(find.text('2 пробуждения за ночь'), findsOneWidget);
      expect(find.text('+40 мин'), findsOneWidget);
      expect(find.text('по плану'), findsOneWidget);
      expect(find.text('из 100'), findsOneWidget);
      expect(find.byType(NightLine), findsOneWidget);
      await scrollTo(tester, find.text('Спокойных'), 300);
      expect(find.text('5/6'), findsOneWidget);
      expect(find.text('в среднем · цель 8 ч'), findsOneWidget);
      await tapText(tester, 'Режим');
      expect(find.text('ночей в пределах ±30 мин'), findsOneWidget);
      expect(find.byType(SleepWindows), findsOneWidget);
      expect(dots('83%'), findsOneWidget);
      await tapText(tester, '30 дн');
      expect(find.byType(SleepWindows), findsOneWidget);
      await scrollTo(tester, find.text('Все ночи · 6'), 300);
      expect(find.byType(Dismissible), findsNothing);
      await tapText(tester, 'Все ночи · 6');
      expect(s.sheet, 'journal');
      expect(s.sheetArg, 'nights');
      expect(find.text('Сегодня'), findsOneWidget);
      expect(find.text('Вчера'), findsOneWidget);
      expect(find.byType(Dismissible, skipOffstage: false), findsNWidgets(6));
    });

    testWidgets('swiping a night left deletes it; tapping opens its details', (
      tester,
    ) async {
      final s = store(
        nights: [
          recorded(1),
          recorded(
            0,
            awakenings: 1,
            duration: 472,
            tags: ['Кофеин'],
            note: 'Снилось море',
          ),
        ],
      );
      await boot(tester, s);
      s.openSheet('journal', 'nights');
      await tester.pumpAndSettle();
      await tester.drag(find.text('Вчера'), const Offset(-320, 0));
      await tester.pumpAndSettle();
      expect(s.nights.map((n) => n.id), ['n0']);
      expect(find.text('Вчера'), findsNothing);
      await tapText(tester, 'Вернуть');
      expect(s.nights.map((n) => n.id), ['n1', 'n0']);
      expect(find.text('Вчера'), findsOneWidget);
      await tester.drag(find.text('Вчера'), const Offset(-320, 0));
      await tester.pumpAndSettle();
      expect(s.nights.map((n) => n.id), ['n0']);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      await tapText(tester, 'Сегодня');
      expect(s.sheet, 'night');
      expect(find.text('23:30 → 07:30 · 7 ч 52 мин'), findsOneWidget);
      expect(find.text('нет измерений'), findsOneWidget);
      expect(
        find.text(
          'Пока нет данных о фазах сна. Запись в дневнике не измеряет фазы.',
        ),
        findsOneWidget,
      );
      expect(find.text('Хороший отдых · 80'), findsOneWidget);
      expect(find.text('Пробуждений: 1'), findsOneWidget);
      expect(find.text('Кофеин'), findsOneWidget);
      expect(find.text('Снилось море'), findsOneWidget);
      await tapText(tester, 'Удалить запись');
      expect(s.nights, isEmpty);
      expect(s.toast?.text, 'Запись удалена');
      expect(s.sheet, null);
      expect(find.text('Удалить запись'), findsNothing);
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('light theme renders the same screen', (tester) async {
      final s = store(nights: [recorded(0)], theme: 'light');
      await boot(tester, s);
      expect(
        Theme.of(tester.element(find.byType(SleepScreen))).brightness,
        Brightness.light,
      );
      expect(dots('8:00'), findsOneWidget);
      s.openSheet('cycles');
      await tester.pumpAndSettle();
      expect(find.text('Лучше встать в'), findsOneWidget);
      expect(tester.takeException(), null);
    });
  });

  group('sleep entry', () {
    testWidgets('saves the usual hours, minus eight minutes per awakening', (
      tester,
    ) async {
      final s = store();
      await boot(tester, s);
      s.openSheet('sleep');
      await tester.pumpAndSettle();
      expect(
        find.text('Минута утром, остальное посчитаем сами'),
        findsOneWidget,
      );
      expect(find.text('Ровно в цель'), findsOneWidget);
      expect(dots('8:00'), findsOneWidget);
      expect(find.text('Хороший отдых'), findsOneWidget);
      await tapLabel(tester, 'Больше');
      await tapLabel(tester, 'Больше');
      expect(dots('7:44'), findsOneWidget);
      expect(find.text('16 мин до цели'), findsOneWidget);
      await tapLabel(tester, 'Полная бодрость');
      await tapText(tester, 'Кофеин');
      await tapText(tester, 'Шум');
      await tapText(tester, 'Шум');
      await tapText(tester, 'Добавить заметку');
      await tester.enterText(find.byType(TextField), '  Долго засыпал ');
      await tester.pumpAndSettle();
      await tapText(tester, 'Сохранить ночь');
      final night = s.nights.single;
      expect(night.dateKey, dateKey(DateTime.now()));
      expect((night.bedtime, night.wakeTime), ('23:30', '07:30'));
      expect(night.durationMin, 464);
      expect(night.awakenings, 2);
      expect(night.quality, 94);
      expect(night.tags, ['Кофеин']);
      expect(night.note, 'Долго засыпал');
      expect(s.toast?.text, 'Ночь записана');
      expect(s.sheet, null);
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets(
      'a morning that already has a night is corrected, not replaced',
      (tester) async {
        final s = store(
          nights: [
            recorded(1, bedtime: '01:00', wakeTime: '08:00', duration: 420),
          ],
        );
        await boot(tester, s);
        s.openSheet('sleep');
        await tester.pumpAndSettle();
        expect(find.text('Сохранить ночь'), findsOneWidget);
        await tapText(tester, 'Вчера');
        expect(
          find.text('За это утро уже есть запись: вы её исправляете.'),
          findsOneWidget,
        );
        expect(
          find.descendant(of: find.byType(SleepSheet), matching: dots('7:00')),
          findsOneWidget,
        );
        expect(find.text('1 ч до цели'), findsOneWidget);
        await tapLabel(tester, 'Больше');
        await tapText(tester, 'Обновить ночь');
        expect(s.nights.single.durationMin, 412);
        expect(s.nights.single.bedtime, '01:00');
        expect(s.toast?.text, 'Ночь обновлена');
        await tester.pump(const Duration(seconds: 3));
      },
    );

    testWidgets(
      'time scrubbers move bedtime by drag and by accessibility steps',
      (tester) async {
        final s = store();
        await boot(tester, s);
        s.openSheet('sleep');
        await tester.pumpAndSettle();
        final scrubbers = find.byType(TimeScrubber);
        expect(scrubbers, findsNWidgets(2));
        // Dragging the ruler right goes earlier: 60 px past the slop is half an hour.
        await tester.drag(
          find.descendant(
            of: scrubbers.first,
            matching: find.byType(CustomPaint),
          ),
          const Offset(80, 0),
        );
        await tester.pumpAndSettle();
        expect(find.text('23:00'), findsOneWidget);
        expect(dots('8:30'), findsOneWidget);
        expect(find.text('+30 мин к цели'), findsOneWidget);
        final semantics = tester.ensureSemantics();
        for (var i = 0; i < 6; i++) {
          tester.semantics.increase(find.semantics.byLabel('Отбой').last);
          await tester.pumpAndSettle();
        }
        expect(find.text('23:30'), findsOneWidget);
        semantics.dispose();
      },
    );
  });

  group('cycles', () {
    testWidgets('picking an option makes it the schedule', (tester) async {
      final s = store();
      await boot(tester, s);
      await scrollTo(tester, find.text('Циклы сна'), 300);
      await tapText(tester, 'Циклы сна');
      expect(s.sheet, 'cycles');
      expect(find.text('+14 мин на засыпание'), findsOneWidget);
      for (final (time, text) in [
        ('05:44', '4 циклов · 6 ч сна'),
        ('07:14', '5 циклов · 7 ч 30 мин сна'),
        ('08:44', '6 циклов · 9 ч сна'),
      ]) {
        expect(dots(time), findsOneWidget);
        expect(find.text(text), findsOneWidget);
      }
      await tapText(tester, 'Встану в…');
      expect(find.text('Лучше лечь в'), findsOneWidget);
      expect(dots('22:16'), findsOneWidget);
      expect(dots('23:46'), findsOneWidget);
      expect(dots('01:16'), findsOneWidget);
      await tapText(tester, '5 циклов · 7 ч 30 мин сна');
      expect((s.bedGoal, s.wakeGoal), ('23:46', '07:30'));
      expect(s.toast?.text, 'Режим: 23:46 → 07:30');
      expect(s.sheet, null);
      await tester.pump(const Duration(seconds: 3));
    });
  });
}
