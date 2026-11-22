import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/screens/today.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/widgets/widget_tile.dart';
import 'package:somna/widgets/widget_grid.dart';
import 'package:somna/widgets/gallery_sheet.dart';
import 'package:somna/widgets/recap_sheet.dart';
import 'package:somna/widgets/catalog.dart';
import 'package:somna/widgets/kit.dart';
import 'package:somna/widgets/lucide.dart';
import 'package:somna/widgets/lucide_data.dart';
import 'package:somna/logic/time.dart';
import 'package:somna/shell/app.dart';

void main() {
  late SomnaStore store;
  setUp(() {
    store = SomnaStore(
      initialState: defaultState().patch({
        'nights': [],
        'moods': [],
        'sessions': [],
        'wellbeing': [],
        'water': {'day': '2030-01-02', 'ml': 0},
      }),
      autoRefresh: false,
    );
  });
  tearDown(() => store.dispose());
  Future<void> boot(
    WidgetTester t,
    Widget child, {
    Brightness brightness = Brightness.dark,
  }) async {
    await t.pumpWidget(
      SomnaScope(
        store: store,
        child: MaterialApp(
          theme: somnaTheme(brightness),
          home: Scaffold(
            body: ListenableBuilder(
              listenable: store,
              builder: (_, _) => child,
            ),
          ),
        ),
      ),
    );
    await t.pump(const Duration(seconds: 2));
  }

  testWidgets('Today empty and populated distinguish missing records', (
    t,
  ) async {
    await boot(t, const TodayScreen());
    expect(
      find.text('Запишите первую ночь: это займёт минуту.'),
      findsOneWidget,
    );
    store.addNight(
      const SleepNight(
        dateKey: '2030-01-02',
        bedtime: '23:00',
        wakeTime: '07:00',
        durationMin: 480,
        quality: 80,
        awakenings: 0,
      ),
    );
    await t.pumpAndSettle();
    expect(find.text('Запишите первую ночь: это займёт минуту.'), findsNothing);
    expect(find.textContaining('без пробуждений'), findsOneWidget);
  });
  testWidgets('water and custom counter taps persist increments', (t) async {
    const water = SomnaWidget(
      id: 'water',
      kind: 'water',
      size: '1x1',
      tone: 'cobalt',
      visible: true,
    );
    store.setWidgets([water]);
    await boot(
      t,
      const SizedBox(height: 178, child: WidgetTile(widget: water)),
    );
    await t.tap(find.byType(WidgetTile));
    await t.pumpAndSettle();
    expect(store.water.ml, 250);
    store.addCustomWidget(title: 'Книги', target: 20, step: 5);
    await boot(
      t,
      SizedBox(height: 178, child: WidgetTile(widget: store.widgets.first)),
    );
    await t.tap(find.byType(WidgetTile));
    await t.pumpAndSettle();
    expect(store.widgets.first.value, 5);
  });
  testWidgets('long press editing supports resize, color and removal', (
    t,
  ) async {
    store.setWidgets([
      const SomnaWidget(
        id: 'a',
        kind: 'streak',
        size: '1x1',
        tone: 'plum',
        visible: true,
      ),
    ]);
    await boot(t, const WidgetGrid());
    await t.longPress(find.byType(WidgetTile));
    await t.pump();
    expect(store.editing, isTrue);
    await t.tap(find.byTooltip('Сделать широким'));
    await t.pump();
    expect(store.widgets.first.size, '2x1');
    await t.tap(find.byTooltip('Сменить цвет'));
    await t.pump();
    expect(store.widgets.first.tone, 'violet');
    await t.tap(find.byTooltip('Убрать виджет'));
    await t.pump();
    expect(store.widgets.first.visible, isFalse);
    await t.pumpWidget(const SizedBox());
  });
  testWidgets('gallery toggles visibility and creator validates empty title', (
    t,
  ) async {
    await boot(t, const SingleChildScrollView(child: GallerySheet()));
    final before = store.widgets.first.visible;
    final firstTile = find.byKey(ValueKey('gallery-${store.widgets.first.id}'));
    await t.ensureVisible(firstTile);
    await t.tap(firstTile);
    await t.pumpAndSettle();
    expect(store.widgets.first.visible, !before);
    await t.ensureVisible(find.text('Свой виджет'));
    await t.tap(find.text('Свой виджет'));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField).first, '');
    await t.pumpAndSettle();
    expect(
      t
          .widget<SomnaButton>(
            find.widgetWithText(SomnaButton, 'Добавить на главный'),
          )
          .onPressed,
      isNull,
    );
    await t.enterText(find.byType(TextField).first, 'Чтение');
    await t.ensureVisible(find.text('Добавить на главный'));
    await t.pumpAndSettle();
    await t.tap(find.text('Добавить на главный'));
    await t.pumpAndSettle();
    expect(store.widgets.first.title, 'Чтение');
    expect(store.widgets.first.value, 0);
    await t.pump(const Duration(seconds: 3));
  });
  testWidgets('recap pages five stories and saves goal', (t) async {
    await boot(t, const SingleChildScrollView(child: RecapSheet()));
    expect(find.text('Ваша неделя'), findsOneWidget);
    await t.tap(find.text('Посмотреть неделю'));
    await t.pumpAndSettle();
    for (var i = 0; i < 3; i++) {
      await t.tap(find.text('Дальше'));
      await t.pumpAndSettle();
    }
    expect(find.text('Одна цель — уже начало'), findsOneWidget);
    await t.tap(find.text('Сохранить цель'));
    await t.pumpAndSettle();
    expect(store.weeklyGoal, isNotNull);
    await t.pump(const Duration(seconds: 3));
  });
  for (final wide in [false, true]) {
    for (final backwards in [false, true]) {
      testWidgets(
        'drag reorders ${wide ? 'mixed' : 'compact'} widgets ${backwards ? 'backwards' : 'forwards'} without dropping hidden entries',
        (t) async {
          store.setWidgets([
            SomnaWidget(
              id: 'a',
              kind: 'streak',
              size: wide ? '2x1' : '1x1',
              tone: 'ink',
              visible: true,
            ),
            const SomnaWidget(
              id: 'hidden',
              kind: 'mood',
              size: '1x1',
              tone: 'moss',
              visible: false,
            ),
            const SomnaWidget(
              id: 'b',
              kind: 'water',
              size: '1x1',
              tone: 'lime',
              visible: true,
            ),
          ]);
          store.setEditing(true);
          await boot(t, const WidgetGrid());
          final tiles = find.byType(WidgetTile);
          final source = backwards ? tiles.last : tiles.first;
          final destination = t.getCenter(backwards ? tiles.first : tiles.last);
          final gesture = await t.startGesture(t.getCenter(source));
          await t.pump(const Duration(milliseconds: 200));
          expect(tiles, findsNWidgets(3));
          await gesture.moveTo(destination);
          await t.pump(const Duration(milliseconds: 200));
          await gesture.up();
          await t.pump();
          expect(
            store.widgets.map((w) => w.id),
            backwards ? ['b', 'a', 'hidden'] : ['hidden', 'b', 'a'],
          );
          expect(
            store.widgets.singleWhere((w) => w.id == 'hidden').visible,
            isFalse,
          );
          expect(store.water.ml, 0);
          await t.pumpWidget(const SizedBox());
        },
      );
    }
  }
  testWidgets(
    'Today app supports long-press edit and drag inside its scroll view',
    (t) async {
      store.patch({'onboarded': true});
      store.setWidgets([
        const SomnaWidget(
          id: 'a',
          kind: 'streak',
          size: '1x1',
          tone: 'ink',
          visible: true,
        ),
        const SomnaWidget(
          id: 'hidden',
          kind: 'mood',
          size: '1x1',
          tone: 'moss',
          visible: false,
        ),
        const SomnaWidget(
          id: 'b',
          kind: 'water',
          size: '1x1',
          tone: 'lime',
          visible: true,
        ),
      ]);
      await t.pumpWidget(SomnaApp(store: store));
      await t.pump(const Duration(seconds: 2));
      await t.scrollUntilVisible(
        find.byType(WidgetGrid),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      await t.pump(const Duration(milliseconds: 200));
      final source = find.byWidgetPredicate(
        (w) => w is WidgetTile && w.widget.id == 'a',
      );
      final target = find.byWidgetPredicate(
        (w) => w is WidgetTile && w.widget.id == 'b',
      );
      await t.longPress(source);
      await t.pump(const Duration(milliseconds: 200));
      expect(store.editing, isTrue);
      final destination = t.getCenter(target);
      final gesture = await t.startGesture(t.getCenter(source));
      await t.pump(const Duration(milliseconds: 200));
      expect(source, findsNWidgets(2));
      await gesture.moveTo(destination);
      await t.pump(const Duration(milliseconds: 200));
      await gesture.up();
      await t.pump(const Duration(milliseconds: 200));
      expect(store.widgets.map((w) => w.id), ['hidden', 'b', 'a']);
      expect(store.water.ml, 0);
      expect(
        t
            .widgetList<WidgetTile>(find.byType(WidgetTile))
            .map((w) => w.widget.id),
        ['b', 'a'],
      );
      await t.pumpWidget(const SizedBox());
    },
  );
  void seedWeek() {
    final now = DateTime.now();
    for (var i = 6; i >= 0; i--) {
      store.addNight(
        SleepNight(
          dateKey: dateKey(now.subtract(Duration(days: i))),
          bedtime: i.isEven ? '23:10' : '00:40',
          wakeTime: '07:20',
          durationMin: i.isEven ? 490 : 400,
          quality: 60.0 + i * 5,
          awakenings: i % 3,
        ),
      );
    }
    store.addMood(
      const MoodEntry(valence: .4, emotions: ['Спокойствие', 'Радость']),
    );
  }

  test('every lucide icon parses into a drawable path', () {
    for (final entry in lucideIcons.entries) {
      for (final d in entry.value) {
        final bounds = parseSvgPath(d).getBounds();
        expect(bounds.isEmpty && bounds.longestSide == 0, isFalse);
        expect(
          const Rect.fromLTWH(
            0,
            0,
            24,
            24,
          ).inflate(.01).contains(bounds.center),
          isTrue,
          reason: entry.key,
        );
      }
    }
  });
  test('night line lights half-hour slots and wraps past 18:00', () {
    List<int> lit(String bed, String wake) => [
      for (final (i, on) in NightLine.litSlots(bed, wake).indexed)
        if (on) i,
    ];
    expect(lit('23:00', '07:00'), [for (var i = 10; i < 26; i++) i]);
    expect(lit('17:00', '01:00'), [for (var i = 0; i < 14; i++) i, 46, 47]);
    expect(lit('23:10', '07:15'), [for (var i = 11; i < 27; i++) i]);
    expect(lit('22:00', '22:00'), isEmpty);
  });
  testWidgets('Today hero shows the night line and opens sleep, mood, recap', (
    t,
  ) async {
    seedWeek();
    await boot(t, const TodayScreen());
    expect(find.byType(NightLine), findsOneWidget);
    expect(find.text('Прошлая ночь'), findsOneWidget);
    expect(find.bySemanticsLabel('Прошлая ночь. Открыть сон'), findsOneWidget);
    await t.tap(find.text('Прошлая ночь'));
    await t.pump();
    expect(store.tab, 'sleep');
    await t.tap(find.text('Состояние').first);
    await t.pump();
    expect(store.sheet, 'mood');
    await t.tap(find.text('Неделя'));
    await t.pump();
    expect(store.sheet, 'recap');
    expect(t.takeException(), isNull);
  });
  testWidgets('empty Today offers to record sleep and a check-in', (t) async {
    await boot(t, const TodayScreen());
    expect(find.byType(NightLine), findsNothing);
    expect(find.text('Сделайте чек-ин'), findsOneWidget);
    expect(find.text('Пока нет данных'), findsOneWidget);
    await t.tap(find.text('Записать сон').first);
    await t.pump();
    expect(store.sheet, 'sleep');
  });
  testWidgets('day plan steps act and collapse when everything is done', (
    t,
  ) async {
    await boot(t, const TodayScreen());
    expect(find.textContaining('из 4 выполнено'), findsOneWidget);
    final water = find.byKey(const ValueKey('plan-water'));
    await t.ensureVisible(water);
    await t.pump();
    await t.tap(water);
    await t.pump();
    expect(store.water.ml, 250);
    store.addWater(2000);
    await t.pump();
    expect(find.byKey(const ValueKey('plan-water')), findsNothing);
  });
  testWidgets('widgets header toggles editing and opens the gallery', (
    t,
  ) async {
    await boot(t, const TodayScreen());
    await t.scrollUntilVisible(
      find.text('Изменить'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await t.ensureVisible(find.text('Изменить'));
    await t.pump();
    await t.tap(find.text('Изменить'));
    await t.pump();
    expect(store.editing, isTrue);
    expect(find.text('Перетащите, смените размер или цвет'), findsOneWidget);
    await t.tap(find.text('Готово'));
    await t.pump();
    expect(store.editing, isFalse);
    await t.tap(find.bySemanticsLabel('Добавить виджет').first);
    await t.pump();
    expect(store.sheet, 'gallery');
    await t.pumpWidget(const SizedBox());
  });
  testWidgets('Today renders in the light theme on a narrow phone', (t) async {
    t.view.physicalSize = const Size(360, 780);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    seedWeek();
    store.setWidgets([
      for (final w in store.widgets) w.copyWith(visible: true),
    ]);
    await boot(t, const TodayScreen(), brightness: Brightness.light);
    await t.drag(find.byType(ListView), const Offset(0, -900));
    await t.pump(const Duration(seconds: 1));
    await t.drag(find.byType(ListView), const Offset(0, -1500));
    await t.pump(const Duration(seconds: 1));
    expect(t.takeException(), isNull);
  });
  testWidgets('gallery search, empty state and restore prompt', (t) async {
    await boot(t, const SingleChildScrollView(child: GallerySheet()));
    await t.enterText(find.byType(TextField).first, 'вода');
    await t.pump();
    expect(find.textContaining('Найдено: 1'), findsOneWidget);
    await t.enterText(find.byType(TextField).first, 'ъъъ');
    await t.pump();
    expect(find.text('Ничего не нашлось'), findsOneWidget);
    await t.ensureVisible(find.text('Показать все'));
    await t.tap(find.text('Показать все'));
    await t.pump();
    expect(find.text('Ничего не нашлось'), findsNothing);
    await t.tap(find.text('Привычки'));
    await t.pump();
    expect(find.textContaining('Найдено: 2'), findsOneWidget);
    store.updateWidget(store.widgets.first.id, {'tone': 'rose'});
    await t.tap(find.bySemanticsLabel('Вернуть стандартный набор'));
    await t.pump();
    expect(find.text('Вернуть стандартный набор?'), findsOneWidget);
    await t.tap(find.text('Восстановить'));
    await t.pump();
    expect(store.widgets.first.tone, isNot('rose'));
    await t.pump(const Duration(seconds: 3));
  });
  testWidgets('recap is honest when empty and steps back and forth', (t) async {
    await boot(t, const SingleChildScrollView(child: RecapSheet()));
    expect(find.text('Начнём с одной ночи'), findsOneWidget);
    expect(find.text('Без записей — без выводов'), findsOneWidget);
    await t.tap(find.text('Посмотреть неделю'));
    await t.pumpAndSettle();
    expect(find.text('ещё нет записей'), findsOneWidget);
    await t.tap(find.bySemanticsLabel('Предыдущий раздел'));
    await t.pumpAndSettle();
    expect(find.text('Ваша неделя'), findsOneWidget);
    await t.tap(find.bySemanticsLabel('3. Состояние'));
    await t.pumpAndSettle();
    expect(find.text('Каждое чувство\nимеет значение'), findsOneWidget);
    await t.tap(find.text('Состояние по дням'));
    await t.pumpAndSettle();
    expect(find.textContaining('Один короткий чек-ин'), findsOneWidget);
    expect(t.takeException(), isNull);
    await t.pump(const Duration(seconds: 3));
  });
  testWidgets('recap stories fit a phone with a full week of records', (
    t,
  ) async {
    t.view.physicalSize = const Size(360, 780);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    seedWeek();
    await boot(t, const SingleChildScrollView(child: RecapSheet()));
    for (var i = 0; i < 4; i++) {
      expect(t.takeException(), isNull);
      await t.tap(find.text(i == 0 ? 'Посмотреть неделю' : 'Дальше'));
      await t.pumpAndSettle();
    }
    expect(t.takeException(), isNull);
    await t.pump(const Duration(seconds: 3));
  });
  for (final kind in [...widgetMeta.keys, 'custom']) {
    testWidgets('$kind fits a narrow phone with records', (t) async {
      seedWeek();
      for (final size in ['1x1', '2x1']) {
        await boot(
          t,
          Center(
            child: SizedBox(
              width: size == '1x1' ? 154 : 320,
              height: 178,
              child: WidgetTile(
                widget: SomnaWidget(
                  id: kind,
                  kind: kind,
                  size: size,
                  tone: 'cobalt',
                  visible: true,
                  title: 'Медитация вечером',
                  unit: 'шагов',
                  target: 12000,
                  step: 500,
                  value: 4500,
                ),
              ),
            ),
          ),
        );
        expect(t.takeException(), isNull, reason: '$kind $size');
      }
    });
  }
  for (final kind in [...widgetMeta.keys, 'custom']) {
    testWidgets('$kind supports absent and zero records', (t) async {
      for (final size in ['1x1', '2x1']) {
        await boot(
          t,
          SizedBox(
            width: size == '1x1' ? 178 : 360,
            height: 178,
            child: WidgetTile(
              widget: SomnaWidget(
                id: kind,
                kind: kind,
                size: size,
                tone: 'plum',
                visible: true,
                target: 0,
              ),
            ),
          ),
        );
        expect(t.takeException(), isNull);
      }
    });
  }
}
