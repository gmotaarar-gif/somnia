import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/store.dart';
import 'package:somna/screens/today.dart';
import 'package:somna/screens/sleep.dart';
import 'package:somna/screens/mind.dart';
import 'package:somna/screens/practices.dart';
import 'package:somna/shell/app.dart';
import 'package:somna/shell/onboarding.dart';
import 'package:somna/shell/splash.dart';
import 'package:somna/ui/sheets.dart';

void main() {
  SomnaStore store({bool onboarded = false}) {
    final s = SomnaStore(
      initialState: defaultState(DateTime(2030, 1, 2))
          .patch({'onboarded': onboarded, 'theme': 'dark'}),
      autoRefresh: false,
    );
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
  }

  testWidgets('async app boot shows splash then onboarding', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const SomnaApp());
    expect(find.byType(SplashScreen), findsOneWidget);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byType(OnboardingScreen), findsOneWidget);
    expect(find.text('Начать'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('finishing onboarding opens Today and commits defaults', (
    tester,
  ) async {
    final s = store();
    await boot(tester, s);
    await tester.ensureVisible(find.text('Начать'));
    await tester.tap(find.text('Начать'));
    await tester.pumpAndSettle();
    expect(s.onboarded, true);
    expect(s.bedGoal, '23:30');
    expect(s.wakeGoal, '07:30');
    expect(find.byType(TodayScreen).hitTestable(), findsOneWidget);
    expect(find.byType(OnboardingScreen), findsNothing);
  });
  testWidgets('dock opens all four screens and keeps each mounted', (
    tester,
  ) async {
    final s = store(onboarded: true);
    await boot(tester, s);
    for (final (label, type, id) in [
      ('Сон', SleepScreen, 'sleep'),
      ('Состояние', MindScreen, 'mind'),
      ('Практики', PracticesScreen, 'practices'),
      ('Сегодня', TodayScreen, 'today'),
    ]) {
      await tester.tap(find.bySemanticsLabel(label));
      await tester.pumpAndSettle();
      expect(s.tab, id);
      expect(find.byType(type).hitTestable(), findsOneWidget);
    }
    expect(find.byType(IndexedStack), findsOneWidget);
    for (final type in [
      TodayScreen,
      SleepScreen,
      MindScreen,
      PracticesScreen,
    ]) {
      expect(find.byType(type, skipOffstage: false), findsOneWidget);
    }
    expect(tester.takeException(), null);
  });
  testWidgets(
    'quick actions, scrim dismissal and sheet back dismissal sync store',
    (tester) async {
      final s = store(onboarded: true);
      await boot(tester, s);
      await tester.tap(find.bySemanticsLabel('Добавить запись'));
      await tester.pumpAndSettle();
      expect(find.text('Как вы сейчас?'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Закрыть меню'));
      await tester.pumpAndSettle();
      expect(find.text('Как вы сейчас?'), findsNothing);
      await tester.tap(find.bySemanticsLabel('Добавить запись'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Записать сон'));
      await tester.pumpAndSettle();
      expect(s.sheet, 'sleep');
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(s.sheet, null);
    },
  );
  testWidgets(
    'profile selector changes brightness and system live follows OS',
    (tester) async {
      final s = store(onboarded: true);
      await boot(tester, s);
      Brightness brightness() =>
          Theme.of(tester.element(find.byType(TodayScreen))).brightness;
      await tester.tap(find.bySemanticsLabel('Профиль'));
      await tester.pumpAndSettle();
      expect(find.text('Оформление'), findsOneWidget);
      expect(brightness(), Brightness.dark);
      await tester.tap(find.text('Светлое'));
      await tester.pumpAndSettle();
      expect(s.theme, 'light');
      expect(brightness(), Brightness.light);
      expect(s.sheet, 'profile');
      await tester.tap(find.text('Тёмное'));
      await tester.pumpAndSettle();
      expect(brightness(), Brightness.dark);
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      await tester.tap(find.text('Как в системе'));
      await tester.pumpAndSettle();
      expect(brightness(), Brightness.light);
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      await tester.pumpAndSettle();
      expect(brightness(), Brightness.dark);
      await tester.tap(find.bySemanticsLabel('Закрыть'));
      await tester.pumpAndSettle();
      expect(s.sheet, null);
    },
  );
  testWidgets(
    'sheet registry passes arg, replaces builders live, and supports swipe dismissal',
    (tester) async {
      final s = store(onboarded: true), registry = SheetRegistry();
      addTearDown(registry.dispose);
      registry.register(
        'mood',
        (context, arg) =>
            SizedBox(height: 280, child: Center(child: Text('Mood:$arg'))),
      );
      await boot(tester, s, registry: registry);
      s.openSheet('mood', 'record-1');
      await tester.pumpAndSettle();
      expect(find.text('Mood:record-1'), findsOneWidget);
      registry.register(
        'mood',
        (context, arg) => const SizedBox(height: 280, child: Text('Updated')),
      );
      await tester.pumpAndSettle();
      expect(find.text('Updated'), findsOneWidget);
      final sheet = find.byType(BottomSheet);
      await tester.dragFrom(
        tester.getTopLeft(sheet) + const Offset(180, 16),
        const Offset(0, 600),
      );
      await tester.pumpAndSettle();
      expect(s.sheet, null);
    },
  );
  testWidgets(
    'unknown sheet has a dismissible placeholder and sheet replacement works',
    (tester) async {
      final s = store(onboarded: true);
      await boot(tester, s);
      s.openSheet('gallery');
      await tester.pumpAndSettle();
      expect(find.text('Скоро здесь'), findsOneWidget);
      s.openSheet('profile');
      await tester.pumpAndSettle();
      expect(find.text('Оформление'), findsOneWidget);
      s.openSheet(null);
      await tester.pumpAndSettle();
      expect(find.byType(BottomSheet), findsNothing);
    },
  );
  testWidgets('small viewport and large text remain free of overflow', (
    tester,
  ) async {
    final s = store(onboarded: true);
    await boot(tester, s);
    tester.view.physicalSize = const Size(960, 1920);
    tester.platformDispatcher.textScaleFactorTestValue = 1.4;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpAndSettle();
    expect(tester.takeException(), null);
    await tester.tap(find.bySemanticsLabel('Профиль'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), null);
  });
  testWidgets('onboarding start stays visible on compact 320x640 display', (
    tester,
  ) async {
    final s = store();
    await boot(tester, s);
    tester.view.physicalSize = const Size(960, 1920);
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Начать').hitTestable(), findsOneWidget);
    expect(tester.getBottomLeft(find.text('Начать')).dy, lessThan(640));
    expect(tester.takeException(), null);
  });
  testWidgets('onboarding permission error is recoverable', (tester) async {
    var fails = true;
    final s = SomnaStore(
      initialState: defaultState().patch({'theme': 'dark', 'reminder': true}),
      autoRefresh: false,
      requestReminderPermission: () async {
        if (fails) throw StateError('denied');
        return true;
      },
    );
    addTearDown(s.dispose);
    await boot(tester, s);
    await tester.ensureVisible(find.text('Начать'));
    await tester.tap(find.text('Начать'));
    await tester.pump(const Duration(milliseconds: 500));
    expect(s.onboarded, false);
    expect(find.text('Не удалось начать. Попробуйте ещё раз.'), findsOneWidget);
    fails = false;
    await tester.ensureVisible(find.text('Начать'));
    await tester.tap(find.text('Начать'));
    await tester.pumpAndSettle();
    expect(s.onboarded, true);
    expect(find.byType(TodayScreen).hitTestable(), findsOneWidget);
  });
  testWidgets('oversized sheet is capped at 93 percent of viewport', (
    tester,
  ) async {
    final s = store(onboarded: true), registry = SheetRegistry();
    addTearDown(registry.dispose);
    registry.register(
      'awards',
      (context, arg) => const SizedBox(height: 2000, child: Text('Long sheet')),
    );
    await boot(tester, s, registry: registry);
    s.openSheet('awards');
    await tester.pumpAndSettle();
    expect(
      tester.getSize(find.byType(BottomSheet)).height,
      lessThanOrEqualTo(780 * .93),
    );
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
  });
  test('bundled OFL and font assets are available', () async {
    TestWidgetsFlutterBinding.ensureInitialized();
    expect(
      (await rootBundle.load('assets/fonts/Onest.ttf')).lengthInBytes,
      greaterThan(100000),
    );
    expect(
      await rootBundle.loadString('assets/fonts/OFL.txt'),
      contains('SIL OPEN FONT LICENSE'),
    );
  });
}
