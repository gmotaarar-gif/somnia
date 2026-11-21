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
  Future<void> boot(WidgetTester t, Widget child) async {
    await t.pumpWidget(
      SomnaScope(
        store: store,
        child: MaterialApp(
          theme: somnaTheme(Brightness.dark),
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
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Добавить на главный'),
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
