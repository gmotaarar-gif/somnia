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
    await t.pumpAndSettle();
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
    await t.tap(
      find.byType(ListTile).first,
    ); // Catalog body has no toggle action.
    await t.tap(
      find.descendant(
        of: find.byType(ListTile).first,
        matching: find.byType(IconButton),
      ),
    );
    await t.pumpAndSettle();
    expect(store.widgets.first.visible, !before);
    await t.tap(find.text('Свой счётчик'));
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
}
