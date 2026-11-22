import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/articles.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/time.dart';
import 'package:somna/profile/subscription_sheet.dart' show SubscriptionSheet;
import 'package:somna/screens/practices.dart';
import 'package:somna/sheets/practice_sheets.dart';
import 'package:somna/shell/app.dart';
import 'package:somna/theme/tokens.dart';
import 'package:somna/ui/dots.dart';
import 'package:somna/ui/sheets.dart';

import 'helpers.dart';

void main() {
  SomnaStore store({
    String theme = 'dark',
    Map<String, Object?> patch = const {},
  }) {
    final s = SomnaStore(
      initialState: defaultState(DateTime(2030, 1, 2)).patch({
        'onboarded': true,
        'theme': theme,
        // The foundation default still seeds demo records; start empty.
        'sessions': const <Object?>[],
        'ritual': const {'day': '2030-01-02', 'done': <String>[]},
        ...patch,
      }),
      persistence: MemoryPersistence(),
      now: () => DateTime(2030, 1, 2, 21),
      autoRefresh: false,
    );
    s.setTab('practices');
    addTearDown(s.dispose);
    return s;
  }

  Future<void> boot(
    WidgetTester tester,
    SomnaStore s, {
    SheetRegistry? registry,
  }) async {
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(SomnaApp(store: s, sheetRegistry: registry));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pumpAndSettle();
  }

  /// Steps past sheet transitions without waiting for looping animations.
  Future<void> settle(WidgetTester tester) async {
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  Future<void> tapText(WidgetTester tester, String text) async {
    // Centre the target so it is never under the floating dock.
    await Scrollable.ensureVisible(
      tester.element(find.text(text).first),
      alignment: .5,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(text).first);
    await tester.pumpAndSettle();
  }

  group('articles', () {
    test('are the eight web articles with known topics and tones', () {
      expect(articles.map((a) => a.id), [
        'wake-anchor',
        'twenty-minutes',
        'morning-light',
        'caffeine',
        'worry-time',
        'name-it',
        'cool-room',
        'sleep-debt',
      ]);
      final topics = articleTopics.map((t) => t.id).toSet();
      for (final a in articles) {
        expect(topics, contains(a.topic));
        expect(cardTones, contains(a.tone));
        expect(a.min, greaterThan(0));
        expect(a.blocks, isNotEmpty);
        for (final text in [a.tag, a.title, a.lead, a.action]) {
          expect(text.trim(), isNotEmpty);
        }
      }
      expect(articleTopics.map((t) => t.label), [
        'Все',
        'Сон',
        'Состояние',
        'Привычки',
      ]);
    });
    test('articleById finds an article and rejects unknown ids', () {
      expect(articleById('caffeine')?.tag, 'Кофеин');
      expect(articleById('nope'), null);
      expect(articleById(null), null);
    });
  });

  testWidgets('fresh screen shows honest empty states', (tester) async {
    final s = store();
    await boot(tester, s);
    expect(find.byType(PracticesScreen).hitTestable(), findsOneWidget);
    expect(find.text('0 из 8 статей прочитано'), findsOneWidget);
    expect(find.text(articles.first.title), findsOneWidget);
    expect(
      find.text('${articles.first.tag} · ${articles.first.min} мин'),
      findsOneWidget,
    );
    for (final a in articles.skip(1).take(3)) {
      expect(find.text(a.title, skipOffstage: false), findsOneWidget);
    }
    expect(find.text(articles[4].title, skipOffstage: false), findsNothing);
    expect(find.text('Все статьи · 7', skipOffstage: false), findsOneWidget);
    expect(
      find.text('Выгрузить мысли перед сном', skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.text('0 из 5 шагов перед сном', skipOffstage: false),
      findsOneWidget,
    );
    expect(find.text('Plus', skipOffstage: false), findsOneWidget);
    expect(
      find.byIcon(Icons.lock_outline, skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.textContaining('мин практики всего', skipOffstage: false),
      findsNothing,
    );
    expect(
      find.bySemanticsLabel('Прочитано', skipOffstage: false),
      findsNothing,
    );
    expect(tester.takeException(), null);
  });

  testWidgets('topic chips filter and the list expands and collapses', (
    tester,
  ) async {
    final s = store();
    await boot(tester, s);
    await tapText(tester, 'Все статьи · 7');
    for (final a in articles.skip(1)) {
      expect(find.text(a.title, skipOffstage: false), findsOneWidget);
    }
    await tapText(tester, 'Свернуть');
    expect(find.text(articles[4].title, skipOffstage: false), findsNothing);

    await tapText(tester, 'Состояние');
    expect(find.text(articleById('worry-time')!.title), findsOneWidget);
    expect(find.text(articleById('name-it')!.title), findsOneWidget);
    expect(find.text(articleById('caffeine')!.title), findsNothing);
    expect(find.textContaining('Все статьи'), findsNothing);

    // The featured sleep article stays in the hero, so three remain.
    await tapText(tester, 'Сон');
    for (final id in ['twenty-minutes', 'cool-room', 'sleep-debt']) {
      expect(
        find.text(articleById(id)!.title, skipOffstage: false),
        findsOneWidget,
      );
    }
    expect(find.textContaining('Все статьи'), findsNothing);

    await tapText(tester, 'Привычки');
    expect(find.text(articleById('morning-light')!.title), findsOneWidget);
    expect(find.text(articleById('caffeine')!.title), findsOneWidget);
    expect(find.text(articleById('cool-room')!.title), findsNothing);
  });

  testWidgets('article reader marks read, moves the feature on and pages', (
    tester,
  ) async {
    final s = store();
    await boot(tester, s);
    final first = articles[0], second = articles[1], third = articles[2];
    await tester.tap(find.text(first.title));
    await tester.pumpAndSettle();
    expect(s.sheet, 'article');
    expect(s.sheetArg, first.id);
    expect(find.text('${first.min} мин чтения'), findsOneWidget);
    expect(find.text(first.lead, skipOffstage: false), findsWidgets);
    expect(find.text(first.action, skipOffstage: false), findsOneWidget);
    expect(
      find.text('Дальше · ${second.tag}', skipOffstage: false),
      findsOneWidget,
    );

    await tester.tap(find.text('Прочитано'));
    await settle(tester);
    expect(s.sheet, null);
    expect(s.readArticles, [first.id]);
    expect(find.text('Статья прочитана'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('1 из 8 статей прочитано'), findsOneWidget);
    expect(find.text('${second.tag} · ${second.min} мин'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.label == 'Прочитано',
        skipOffstage: false,
      ),
      findsOneWidget,
    );
    await tester.pump(const Duration(seconds: 3));

    // A read article only offers to close; "Дальше" swaps the article.
    s.openSheet('article', first.id);
    await tester.pumpAndSettle();
    expect(find.text('Закрыть'), findsOneWidget);
    expect(find.text('Прочитано'), findsNothing);
    await tester.ensureVisible(find.text('Дальше · ${second.tag}'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Дальше · ${second.tag}'));
    await tester.pumpAndSettle();
    expect(s.sheetArg, second.id);
    expect(find.text('${second.min} мин чтения'), findsOneWidget);
    expect(
      find.text('Дальше · ${third.tag}', skipOffstage: false),
      findsOneWidget,
    );
    await tester.tap(find.bySemanticsLabel('Закрыть'));
    await tester.pumpAndSettle();
    expect(s.sheet, null);
    expect(s.readArticles, [first.id]);

    // The last article pages back to the first; unknown ids close.
    s.openSheet('article', articles.last.id);
    await tester.pumpAndSettle();
    expect(
      find.text('Дальше · ${first.tag}', skipOffstage: false),
      findsOneWidget,
    );
    s.openSheet('article', 'missing');
    await tester.pumpAndSettle();
    expect(s.sheet, null);
    expect(tester.takeException(), null);
  });

  testWidgets('all read keeps the first article featured', (tester) async {
    final s = store(
      patch: {'readArticles': articles.map((a) => a.id).toList()},
    );
    await boot(tester, s);
    expect(find.text('8 из 8 статей прочитано'), findsOneWidget);
    expect(
      find.text('${articles.first.tag} · ${articles.first.min} мин'),
      findsOneWidget,
    );
  });

  testWidgets('evening ritual toggles steps and counts them', (tester) async {
    final s = store();
    await boot(tester, s);
    await tapText(tester, 'Приглушить свет');
    await tapText(tester, 'Проветрить спальню');
    expect(s.ritual.done, ['dim', 'air']);
    expect(find.text('2 из 5 шагов перед сном'), findsOneWidget);
    await tapText(tester, 'Приглушить свет');
    expect(s.ritual.done, ['air']);
    expect(find.text('1 из 5 шагов перед сном'), findsOneWidget);
    expect(ritualSteps.map((r) => r.id), [
      'dim',
      'screen',
      'warm',
      'air',
      'notes',
    ]);
  });

  testWidgets('session summary appears only with sessions', (tester) async {
    final s = store();
    await boot(tester, s);
    s.addSession('grounding', 3);
    s.addSession('worry', 2);
    await tester.pumpAndSettle();
    expect(
      find.text('2 сессии · 5 мин практики всего', skipOffstage: false),
      findsOneWidget,
    );
  });

  testWidgets('grounding counts 5-4-3-2-1 and records a session', (
    tester,
  ) async {
    final s = store();
    await boot(tester, s);
    await tester.ensureVisible(find.text('Заземление'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Заземление'));
    await settle(tester);
    expect(s.sheet, 'grounding');
    expect(find.text('5 вещей, которые видите'), findsOneWidget);
    var taps = 0;
    for (final sense in groundingSenses) {
      expect(find.text('${sense.n} ${sense.title}'), findsOneWidget);
      expect(find.text(sense.hint), findsOneWidget);
      for (var i = 0; i < sense.n; i++) {
        expect(s.sessions, isEmpty);
        await tester.tap(
          find.bySemanticsLabel('Отметить: ${i + 1} из ${sense.n}'),
        );
        taps++;
        await settle(tester);
      }
    }
    expect(taps, 15);
    expect(s.sheet, null);
    expect(s.sessions.single.kind, 'grounding');
    expect(s.sessions.single.min, 3);
    expect(find.text('Заземление завершено'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(
      find.text('1 сессия · 3 мин практики всего', skipOffstage: false),
      findsOneWidget,
    );
  });

  testWidgets('body scan is locked without Plus', (tester) async {
    final s = store();
    await boot(tester, s);
    await tester.ensureVisible(find.text('Скан тела'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Скан тела'));
    await tester.pumpAndSettle();
    expect(s.sheet, 'bodyscan');
    expect(find.byType(SubscriptionSheet), findsOneWidget);
    expect(find.text('Начать'), findsNothing);
    await tester.tap(find.text('Продолжить бесплатно'));
    await tester.pumpAndSettle();
    expect(s.sheet, null);
    expect(s.sessions, isEmpty);
  });

  testWidgets('locked body scan hands over to a registered Plus sheet', (
    tester,
  ) async {
    final s = store();
    final registry = SheetRegistry()
      ..register('subscription', (context, arg) => const Text('plus sheet'));
    await boot(tester, s, registry: registry);
    s.openSheet('bodyscan');
    await tester.pumpAndSettle();
    expect(find.text('plus sheet'), findsOneWidget);
    expect(find.byType(PlusGate), findsNothing);
  });

  testWidgets('Plus body scan runs 5 x 36 s, pauses and records 3 min', (
    tester,
  ) async {
    final s = store();
    expect(await s.activate('monthly'), true);
    await boot(tester, s);
    expect(find.byIcon(Icons.lock_outline, skipOffstage: false), findsNothing);
    s.openSheet('bodyscan');
    await settle(tester);
    expect(find.text('Шаг 1 из 5'), findsOneWidget);
    expect(find.text(bodyScanParts.first.part), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) => w is Dots && w.value == '3:00'),
      findsOneWidget,
    );

    await tester.tap(find.text('Начать'));
    await tester.pump();
    expect(find.text('Пауза'), findsOneWidget);
    await tester.pump(const Duration(seconds: 36));
    await settle(tester);
    expect(find.text('Шаг 2 из 5'), findsOneWidget);
    expect(find.text(bodyScanParts[1].part), findsOneWidget);
    expect(find.text(bodyScanParts[1].text), findsOneWidget);

    await tester.tap(find.text('Пауза'));
    await tester.pump();
    expect(find.text('Продолжить'), findsOneWidget);
    await tester.pump(const Duration(seconds: 60));
    await settle(tester);
    expect(find.text('Шаг 2 из 5'), findsOneWidget);

    await tester.tap(find.text('Продолжить'));
    await tester.pump();
    for (var i = 2; i < bodyScanParts.length; i++) {
      await tester.pump(const Duration(seconds: 36));
      await settle(tester);
      if (i < bodyScanParts.length - 1) {
        expect(find.text('Шаг ${i + 1} из 5'), findsOneWidget);
      }
    }
    for (var i = 0; i < 40 && s.sheet != null; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    await settle(tester);
    expect(s.sheet, null);
    expect(s.sessions.single.kind, 'bodyscan');
    expect(s.sessions.single.min, 3);
    expect(find.text('Сканирование тела завершено'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
    expect(tester.takeException(), null);
  });

  testWidgets('worry diary saves, resolves and deletes', (tester) async {
    final s = store();
    await boot(tester, s);
    await tapText(tester, 'Дневник тревог');
    expect(s.sheet, 'worry');
    expect(find.text('Отложенное'), findsNothing);

    // Nothing is saved from an empty or blank thought.
    await tester.tap(find.text('Отложить до завтра'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, '   ');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Отложить до завтра'));
    await tester.pumpAndSettle();
    expect(s.worries, isEmpty);
    expect(s.sessions, isEmpty);

    await tester.enterText(
      find.byType(TextField).first,
      ' не успеваю с отчётом ',
    );
    await tester.enterText(
      find.byType(TextField).last,
      'в 10:00 написать план',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Отложить до завтра'));
    await settle(tester);
    expect(s.worries.single.text, 'не успеваю с отчётом');
    expect(s.worries.single.plan, 'в 10:00 написать план');
    expect(s.sessions.single.kind, 'worry');
    expect(s.sessions.single.min, 2);
    expect(find.text('Отложено до завтра'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      '',
    );
    expect(find.text('Отложенное'), findsOneWidget);
    expect(find.text('1 открыто'), findsOneWidget);
    expect(find.text('→ в 10:00 написать план'), findsOneWidget);
    expect(find.text(relativeDay('2030-01-02')), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));

    await tester.tap(find.bySemanticsLabel('Отметить решённым'));
    await tester.pumpAndSettle();
    expect(s.worries.single.done, true);
    expect(find.text('0 открыто'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Вернуть'));
    await tester.pumpAndSettle();
    expect(s.worries.single.done, false);

    s.openSheet(null);
    await tester.pumpAndSettle();
    expect(
      find.text('1 отложено до завтра', skipOffstage: false),
      findsOneWidget,
    );

    s.openSheet('worry');
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('Удалить'));
    await tester.pumpAndSettle();
    expect(s.worries, isEmpty);
    expect(find.text('Отложенное'), findsNothing);
    expect(tester.takeException(), null);
  });

  testWidgets('light theme renders the screen and every sheet', (tester) async {
    final s = store(theme: 'light');
    expect(await s.activate('yearly'), true);
    await boot(tester, s);
    expect(find.text('Практики'), findsWidgets);
    for (final (id, arg) in [
      ('article', 'caffeine'),
      ('grounding', null),
      ('bodyscan', null),
      ('worry', null),
    ]) {
      s.openSheet(id, arg);
      await settle(tester);
      expect(tester.takeException(), null, reason: id);
    }
    s.openSheet(null);
    await settle(tester);
  });

  testWidgets('sheets fit a small phone without overflow', (tester) async {
    final s = store();
    expect(await s.activate('yearly'), true);
    tester.view.physicalSize = const Size(720, 1280);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(
          size: Size(360, 640),
          textScaler: TextScaler.linear(1.3),
        ),
        child: SomnaApp(store: s),
      ),
    );
    await tester.pump(const Duration(milliseconds: 600));
    for (final (id, arg) in [
      ('article', 'wake-anchor'),
      ('grounding', null),
      ('bodyscan', null),
      ('worry', null),
    ]) {
      s.openSheet(id, arg);
      await settle(tester);
      expect(tester.takeException(), null, reason: id);
    }
    s.openSheet(null);
    await settle(tester);
  });
}
