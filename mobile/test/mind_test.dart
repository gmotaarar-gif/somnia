import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/time.dart';
import 'package:somna/mind/mood_sheet.dart';
import 'package:somna/mind/wellbeing_sheet.dart';
import 'package:somna/screens/mind.dart';
import 'package:somna/shell/app.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/ui/charts/charts.dart';

import 'helpers.dart';

final _now = DateTime(2026, 11, 20, 12);

MoodEntry _entry(
  int day,
  double valence, {
  List<String> emotions = const [],
  List<String> factors = const [],
  String? note,
}) => MoodEntry(
  id: 'm$day-$valence',
  at: isoUtc(DateTime(2026, 11, day, 9, 5)),
  valence: valence,
  emotions: emotions,
  factors: factors,
  note: note,
);

void main() {
  SomnaStore store({
    List<MoodEntry> moods = const [],
    List<SleepNight> nights = const [],
    List<WellbeingResult> wellbeing = const [],
    String theme = 'dark',
  }) {
    final s = SomnaStore(
      initialState: defaultState(_now).patch({
        'onboarded': true,
        'theme': theme,
        'moods': [for (final m in moods) m.toJson()],
        'nights': [for (final n in nights) n.toJson()],
        'wellbeing': [for (final w in wellbeing) w.toJson()],
      }),
      now: () => _now,
      autoRefresh: false,
    );
    addTearDown(s.dispose);
    return s;
  }

  void view(WidgetTester tester, Size size) {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  Future<void> pumpMind(
    WidgetTester tester,
    SomnaStore s, {
    Brightness brightness = Brightness.dark,
  }) async {
    view(tester, const Size(1080, 7500));
    await tester.pumpWidget(
      SomnaScope(
        store: s,
        child: MaterialApp(
          theme: somnaTheme(brightness),
          home: Scaffold(body: MindScreen(now: () => _now)),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> bootApp(WidgetTester tester, SomnaStore s) async {
    view(tester, const Size(1080, 2340));
    await tester.pumpWidget(SomnaApp(store: s));
    await tester.pump(const Duration(milliseconds: 600));
  }

  test('day average is null without check-ins and zero for a neutral day', () {
    final moods = [_entry(18, 0), _entry(19, .5), _entry(19, -.1)];
    expect(moodDayAverage(moods, '2026-11-17'), isNull);
    expect(moodDayAverage(moods, '2026-11-18'), 0);
    expect(moodDayAverage(moods, '2026-11-19'), closeTo(.2, 1e-9));
  });

  test('check-in limits: three emotions, five factors, pools by valence', () {
    var chosen = <String>[];
    for (final e in moodEmotions['high']!) {
      chosen = toggleChoice(chosen, e, maxMoodEmotions);
    }
    expect(chosen, ['Лёгкость', 'Ясность', 'Умиротворение']);
    expect(toggleChoice(chosen, 'Ясность', maxMoodEmotions), [
      'Лёгкость',
      'Умиротворение',
    ]);
    var factors = <String>[];
    for (final f in moodFactors) {
      factors = toggleChoice(factors, f, maxMoodFactors);
    }
    expect(factors, moodFactors.take(5));
    expect(emotionPool(-.5), moodEmotions['low']);
    expect(emotionPool(0), moodEmotions['mid']);
    expect(emotionPool(.3), moodEmotions['high']);
    expect(offeredEmotions(.8, ['Грусть']).last, 'Грусть');
    expect(emotionAnchors(offeredEmotions(.8, ['Грусть'])).length, 8);
  });

  test('WHO-5 index is the sum times four with advice below 52', () {
    expect(who5Score([5, 5, 5, 5, 5]), 100);
    expect(who5Score([3, 2, 3, 2, 2]), 48);
    expect(who5Score([]), 0);
    expect(who5Advice(51), contains('со специалистом'));
    expect(
      who5Advice(52),
      'Повторяйте тест раз в неделю, чтобы видеть динамику.',
    );
  });

  for (final brightness in Brightness.values) {
    testWidgets('empty Mind shows web empty states (${brightness.name})', (
      tester,
    ) async {
      final s = store();
      await pumpMind(tester, s, brightness: brightness);
      for (final text in [
        'Состояние',
        '0 чек-инов за неделю',
        'нет записей',
        'Как вы сейчас?',
        'Первый чек-ин займёт полминуты',
        'Чек-ин',
        'последние 14 дней',
        'Закономерности',
        'Отмечайте в чек-инах, что повлияло на день. После нескольких записей здесь появится, что помогает, а что мешает.',
        'Индекс благополучия WHO-5',
        '5 вопросов, одна минута',
        'Дневник',
        'Здесь появятся ваши чек-ины',
      ]) {
        expect(find.text(text), findsOneWidget, reason: text);
      }
      expect(find.bySemanticsLabel('--'), findsOneWidget);
      expect(find.text('Показать все записи'), findsNothing);
      await tester.tap(find.text('Эмоции'));
      await tester.pumpAndSettle();
      expect(find.text('Появятся после первых чек-инов.'), findsOneWidget);
      await tester.tap(find.text('Месяц'));
      await tester.pumpAndSettle();
      expect(find.text('последние 28 дней'), findsOneWidget);
      expect(find.byType(MoodCalendar), findsOneWidget);
      expect(find.byType(MoodTrend), findsNothing);
      await tester.tap(find.text('Чек-ин'));
      expect(s.sheet, 'mood');
      await tester.tap(find.bySemanticsLabel('Пройти тест благополучия'));
      expect(s.sheet, 'wellbeing');
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('recorded check-ins fill hero, patterns, WHO-5 and diary', (
    tester,
  ) async {
    final s = store(
      moods: [
        _entry(14, -.6, emotions: ['Тревога'], factors: ['Работа']),
        _entry(15, -.4, emotions: ['Усталость'], factors: ['Работа']),
        _entry(17, .6, emotions: ['Радость'], factors: ['Прогулка']),
        _entry(18, .8, emotions: ['Радость'], factors: ['Прогулка']),
        _entry(19, 0),
        _entry(
          20,
          .5,
          emotions: ['Ясность', 'Радость', 'Лёгкость', 'Уверенность'],
          factors: ['Сон'],
          note: ' Хорошее утро ',
        ),
      ],
      wellbeing: [
        WellbeingResult(at: isoUtc(DateTime(2026, 11, 10)), score: 48),
        WellbeingResult(at: isoUtc(DateTime(2026, 11, 17)), score: 64),
      ],
    );
    await pumpMind(tester, s, brightness: Brightness.light);
    expect(find.text('6 чек-инов за неделю'), findsOneWidget);
    expect(find.text('Сегодня, 09:05'), findsOneWidget);
    expect(find.bySemanticsLabel('75%'), findsOneWidget);
    expect(find.text('Ясность · Радость · Лёгкость'), findsOneWidget);
    expect(find.text('Работа'), findsOneWidget);
    expect(find.text('Прогулка'), findsOneWidget);
    expect(find.text('Сон'), findsNothing);
    expect(find.text('Хорошее самочувствие · +16 к прошлому'), findsOneWidget);
    expect(find.text('64'), findsOneWidget);
    expect(find.text('Все чек-ины · 6', skipOffstage: false), findsOneWidget);
    await tester.tap(find.text('Эмоции'));
    await tester.pumpAndSettle();
    expect(find.text('Радость'), findsOneWidget);
    expect(find.text('Чем крупнее, тем чаще отмечаете'), findsOneWidget);
    s.addMood(const MoodEntry(valence: -1));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('0%'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('insights carousel steps through observations', (tester) async {
    final s = store(
      moods: [
        for (var d = 10; d <= 20; d++)
          _entry(
            d,
            d.isEven ? .7 : -.5,
            factors: [d.isEven ? 'Прогулка' : 'Работа'],
          ),
      ],
      nights: [for (var d = 10; d <= 20; d++) night('2026-11-$d')],
    );
    await pumpMind(tester, s);
    expect(find.text('Наблюдение'), findsOneWidget);
    final next = find.bySemanticsLabel('Следующее наблюдение');
    expect(next, findsOneWidget);
    final total = int.parse(
      tester
          .widget<Text>(find.textContaining(RegExp(r'^1 / \d+$')))
          .data!
          .split(' / ')[1],
    );
    expect(total, greaterThan(1));
    await tester.tap(next);
    await tester.pumpAndSettle();
    expect(find.text('2 / $total'), findsOneWidget);
    for (var i = 1; i < total; i++) {
      await tester.tap(next);
      await tester.pumpAndSettle();
    }
    expect(find.text('1 / $total'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('mood slider is reachable and adjustable from a keyboard', (
    tester,
  ) async {
    final s = store();
    await bootApp(tester, s);
    s.openSheet('mood');
    await tester.pumpAndSettle();
    expect(find.text('Слегка приятно'), findsOneWidget);
    var reached = false;
    for (var i = 0; i < 12 && !reached; i++) {
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      final focus = FocusManager.instance.primaryFocus?.context;
      reached =
          focus != null &&
          find
              .descendant(
                of: find.byWidget(focus.widget),
                matching: find.bySemanticsLabel(
                  'Насколько приятно ваше состояние',
                ),
              )
              .evaluate()
              .isNotEmpty &&
          find
              .ancestor(
                of: find.byWidget(focus.widget),
                matching: find.byType(MoodSheet),
              )
              .evaluate()
              .isNotEmpty;
    }
    expect(reached, isTrue);
    await tester.sendKeyEvent(LogicalKeyboardKey.home);
    await tester.pumpAndSettle();
    expect(find.text('Очень неприятно'), findsWidgets);
    await tester.sendKeyEvent(LogicalKeyboardKey.end);
    await tester.pumpAndSettle();
    expect(find.text('Очень приятно'), findsWidgets);
    for (var i = 0; i < 20; i++) {
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pump();
    }
    await tester.pumpAndSettle();
    expect(find.text('Нейтрально'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final theme in ['dark', 'light']) {
    testWidgets('mood check-in saves through the store ($theme)', (
      tester,
    ) async {
      final s = store(theme: theme);
      await bootApp(tester, s);
      s.openSheet('mood');
      await tester.pumpAndSettle();
      expect(find.text('Как вы себя чувствуете прямо сейчас?'), findsOneWidget);
      expect(find.text('Слегка приятно'), findsOneWidget);
      expect(find.bySemanticsLabel('Шаг 1 из 4'), findsOneWidget);
      expect(
        Theme.of(tester.element(find.byType(MoodSheet))).brightness,
        Brightness.dark,
      );
      final slider = find.bySemanticsLabel('Насколько приятно ваше состояние');
      await tester.tapAt(tester.getCenter(slider));
      await tester.pumpAndSettle();
      expect(find.text('Нейтрально'), findsOneWidget);
      await tester.tapAt(tester.getTopRight(slider) + const Offset(-4, 20));
      await tester.pumpAndSettle();
      expect(find.text('Очень приятно'), findsOneWidget);
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
      expect(find.text('Проведите по полю'), findsOneWidget);
      final field = find.byKey(const ValueKey('emotion-field'));
      await tester.tapAt(tester.getCenter(field));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('emotion-field-current')), findsOne);
      for (final e in ['Ясность', 'Благодарность', 'Вдохновение']) {
        await tester.ensureVisible(find.text(e).last);
        await tester.tap(find.text(e).last);
        await tester.pump();
      }
      await tester.pumpAndSettle();
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
      expect(find.text('Что влияет на вас сильнее всего?'), findsOneWidget);
      for (final f in moodFactors.take(6)) {
        await tester.ensureVisible(find.text(f));
        await tester.tap(find.text(f));
        await tester.pump();
      }
      await tester.tap(find.bySemanticsLabel('Назад'));
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('Шаг 2 из 4'), findsOneWidget);
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
      expect(find.text('Необязательно'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '  ${'я' * 250}  ');
      await tester.tap(find.text('Сохранить чек-ин'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('Записано'), findsOneWidget);
      expect(find.bySemanticsLabel('Чек-ин записан'), findsOneWidget);
      final saved = s.moods.single;
      expect(saved.valence, 1);
      expect(saved.emotions.length, 3);
      expect(saved.emotions, containsAll(['Ясность', 'Благодарность']));
      expect(saved.factors, moodFactors.take(5));
      expect(saved.note!.length, lessThanOrEqualTo(maxMoodNote));
      expect(saved.id, isNotEmpty);
      expect(s.sheet, 'mood');
      await tester.pump(moodDoneDelay);
      await tester.pumpAndSettle();
      expect(s.sheet, isNull);
      expect(find.byType(MoodSheet), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('dragging the stage carries the valence and skips empty note', (
    tester,
  ) async {
    final s = store();
    await bootApp(tester, s);
    s.openSheet('mood');
    await tester.pumpAndSettle();
    await tester.drag(find.byType(MoodSheet), const Offset(-400, 0));
    await tester.pumpAndSettle();
    expect(find.text('Очень неприятно'), findsOneWidget);
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text('Сохранить чек-ин'));
    await tester.pump(moodDoneDelay + const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(s.moods.single.valence, -1);
    expect(s.moods.single.note, isNull);
    expect(s.moods.single.emotions, isEmpty);
    expect(s.sheet, isNull);
  });

  testWidgets('WHO-5 collects five answers, scores and saves', (tester) async {
    final s = store(
      wellbeing: [
        WellbeingResult(at: isoUtc(DateTime(2026, 11, 10)), score: 64),
      ],
      theme: 'light',
    );
    await bootApp(tester, s);
    s.openSheet('wellbeing');
    await tester.pumpAndSettle();
    expect(find.text('Индекс благополучия'), findsOneWidget);
    expect(find.text('WHO-5: пять вопросов, одна минута'), findsOneWidget);
    expect(find.text('За последние две недели'), findsOneWidget);
    expect(find.text('Назад'), findsNothing);
    Future<void> answer(String label) async {
      await tester.ensureVisible(find.text(label));
      await tester.tap(find.text(label));
      await tester.pumpAndSettle();
    }

    await answer('Всё время');
    expect(find.text('Я чувствовал себя спокойным и расслабленным'), findsOne);
    await tester.ensureVisible(find.text('Назад'));
    await tester.tap(find.text('Назад'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Вопрос 1 из 5'), findsOneWidget);
    for (final label in [
      'Больше половины',
      'Меньше половины',
      'Больше половины',
      'Меньше половины',
      'Меньше половины',
    ]) {
      await answer(label);
    }
    expect(find.bySemanticsLabel('48'), findsOneWidget);
    expect(find.text('Сниженный ресурс'), findsOneWidget);
    expect(
      find.text(
        'Прошлый результат: 64. Если такое состояние держится больше двух недель, стоит обсудить его со специалистом.',
      ),
      findsOneWidget,
    );
    await tester.ensureVisible(find.text('Пройти заново'));
    await tester.tap(find.text('Пройти заново'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Вопрос 1 из 5'), findsOneWidget);
    for (var i = 0; i < 5; i++) {
      await answer('Почти всегда');
    }
    expect(find.bySemanticsLabel('80'), findsOneWidget);
    expect(find.text('Высокое благополучие'), findsOneWidget);
    expect(s.wellbeing.length, 1);
    await tester.ensureVisible(find.text('Сохранить результат'));
    await tester.tap(find.text('Сохранить результат'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(s.wellbeing.last.score, 80);
    expect(s.wellbeing.length, 2);
    expect(s.sheet, isNull);
    expect(find.text('Результат сохранён'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
    expect(tester.takeException(), isNull);
  });

  testWidgets('sheets fit a compact 320x640 display with large text', (
    tester,
  ) async {
    final s = store();
    view(tester, const Size(960, 1920));
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpWidget(SomnaApp(store: s));
    await tester.pump(const Duration(milliseconds: 600));
    s.setTab('mind');
    await tester.pumpAndSettle();
    expect(find.byType(MindScreen), findsOneWidget);
    s.openSheet('mood');
    await tester.pumpAndSettle();
    for (var i = 0; i < 3; i++) {
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Далее'));
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull);
    s.openSheet('wellbeing');
    await tester.pumpAndSettle();
    for (var i = 0; i < 5; i++) {
      await tester.ensureVisible(find.text('Никогда'));
      await tester.tap(find.text('Никогда'));
      await tester.pumpAndSettle();
    }
    expect(find.text('Низкий ресурс'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
