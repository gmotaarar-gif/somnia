import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart' hide ThemeMode;
import 'package:somna/data/store.dart';
import 'package:somna/shell/aurora.dart';
import 'package:somna/shell/island.dart';
import 'package:somna/shell/screen_transition.dart';
import 'package:somna/shell/shaders.dart';
import 'package:somna/shell/wave.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/ui/mascot.dart';

import 'helpers.dart';

Widget app(Widget child, {bool still = false, bool light = false}) =>
    MaterialApp(
      theme: somnaTheme(light ? Brightness.light : Brightness.dark),
      builder: (context, page) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: still),
        child: page!,
      ),
      home: Scaffold(body: child),
    );

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 400 && tester.binding.hasScheduledFrame; i++) {
    await tester.pump(const Duration(milliseconds: 16));
  }
  expect(tester.binding.hasScheduledFrame, false);
}

void main() {
  group('mascot', () {
    test('sleeps at night, works during a practice, otherwise rests', () {
      expect(mascotState(true, 2), MascotState.working);
      expect(mascotState(false, 23), MascotState.sleeping);
      expect(mascotState(false, 0), MascotState.sleeping);
      expect(mascotState(false, 5), MascotState.sleeping);
      expect(mascotState(false, 6), MascotState.idle);
      expect(mascotState(false, 22), MascotState.idle);
    });

    testWidgets('follows the worry diary and the hour', (tester) async {
      final s = SomnaStore(
        initialState: defaultState(DateTime(2030, 1, 2)),
        autoRefresh: false,
      );
      addTearDown(s.dispose);
      var hour = 12;
      await tester.pumpWidget(
        app(
          SomnaScope(
            store: s,
            child: Mascot(clock: () => DateTime(2030, 1, 2, hour)),
          ),
        ),
      );
      MascotState shown() =>
          tester.widget<CloudAvatar>(find.byType(CloudAvatar)).state;
      expect(shown(), MascotState.idle);
      expect(tester.getSize(find.byType(CloudAvatar)), const Size(64, 64));

      s.openSheet('worry');
      await tester.pump();
      expect(shown(), MascotState.working);
      s.openSheet(null);
      await tester.pump();
      expect(shown(), MascotState.idle);

      hour = 23;
      await tester.pump(const Duration(minutes: 1));
      expect(shown(), MascotState.sleeping);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('every state animates and paints at every size', (
      tester,
    ) async {
      for (final state in MascotState.values) {
        await tester.pumpWidget(
          app(
            Row(
              children: [
                for (final size in [40.0, 48.0, 64.0, 80.0])
                  CloudAvatar(state: state, size: size),
              ],
            ),
          ),
        );
        for (var i = 0; i < 120; i++) {
          await tester.pump(const Duration(milliseconds: 50));
        }
        expect(tester.takeException(), null);
        expect(tester.binding.transientCallbackCount, 4);
      }
      // Changing state mid-hop blends without a jump or an error.
      await tester.pumpWidget(
        app(const CloudAvatar(state: MascotState.working)),
      );
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pumpWidget(
        app(const CloudAvatar(state: MascotState.sleeping)),
      );
      for (var i = 0; i < 60; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(tester.takeException(), null);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('holds still with animations off', (tester) async {
      await tester.pumpWidget(
        app(const CloudAvatar(state: MascotState.working), still: true),
      );
      await tester.pump();
      expect(tester.binding.transientCallbackCount, 0);
      await tester.pumpWidget(
        app(const CloudAvatar(state: MascotState.sleeping), still: true),
      );
      await tester.pump();
      expect(tester.binding.transientCallbackCount, 0);
      expect(tester.takeException(), null);
    });
  });

  group('island', () {
    testWidgets('is a 320x50 pill under the status bar, gone when quiet', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      Widget island(SomnaToast? toast) => app(
        MediaQuery(
          data: const MediaQueryData(padding: EdgeInsets.only(top: 32)),
          child: Stack(children: [Island(toast: toast)]),
        ),
      );
      await tester.pumpWidget(island(null));
      expect(find.byType(Text), findsNothing);

      await tester.pumpWidget(
        island(const SomnaToast(id: 1, text: 'Сон сохранён')),
      );
      await tester.pumpAndSettle();
      final pill = find.ancestor(
        of: find.text('Сон сохранён'),
        matching: find.byType(Container),
      );
      expect(tester.getSize(pill.first), const Size(320, 50));
      expect(tester.getTopLeft(pill.first).dy, 32);
      expect(find.byIcon(Icons.check_rounded), findsOneWidget);
      expect(
        tester.getSemantics(pill.first).flagsCollection.isLiveRegion,
        true,
      );

      await tester.pumpWidget(
        island(
          const SomnaToast(
            id: 2,
            text: saveFailureToast,
            variant: ToastVariant.error,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Сон сохранён'), findsNothing);
      expect(find.text(saveFailureToast), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);

      await tester.pumpWidget(island(null));
      await tester.pumpAndSettle();
      expect(find.byType(Text), findsNothing);
      handle.dispose();
    });

    testWidgets('keeps at least 10px above it without a status bar', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          const Stack(
            children: [Island(toast: SomnaToast(id: 1, text: 'Готово'))],
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(find.byType(Container).first).dy, 10);
    });

    test('toasts default to success and survive old JSON', () {
      expect(
        SomnaToast.fromJson({'id': 1, 'text': 'a'}).variant,
        ToastVariant.success,
      );
      const toast = SomnaToast(id: 2, text: 'b', variant: ToastVariant.error);
      expect(SomnaToast.fromJson(toast.toJson()).variant, ToastVariant.error);
    });

    test('a failed save says so with an error toast', () async {
      final p = MemoryPersistence()..fail = true;
      final s = SomnaStore(
        initialState: defaultState(DateTime(2030, 1, 2)),
        persistence: p,
        autoRefresh: false,
      );
      addTearDown(s.dispose);
      s.notify('Готово');
      expect(s.toast?.variant, ToastVariant.success);
      s.addMood(const MoodEntry(valence: .7, emotions: ['Ясность']));
      await s.flush();
      expect(s.toast?.text, saveFailureToast);
      expect(s.toast?.variant, ToastVariant.error);
    });
  });

  group('aurora', () {
    test('every screen has four colours in both themes', () {
      for (final brightness in Brightness.values) {
        final palettes = auroraPalettes[brightness]!;
        expect(palettes.keys, [
          'today',
          'sleep',
          'mind',
          'practices',
          'onboarding',
        ]);
        for (final palette in palettes.values) {
          expect(palette.length, 4);
        }
      }
      expect(
        auroraPalettes[Brightness.dark]!['sleep']!.first,
        const Color(0xff0b1240),
      );
      expect(
        auroraPalettes[Brightness.light]!['mind']!.last,
        const Color(0xffeef0b8),
      );
    });

    testWidgets('rests behind the tabs and drifts behind onboarding', (
      tester,
    ) async {
      for (final light in [false, true]) {
        for (final tab in ['today', 'sleep', 'mind', 'practices', 'nope']) {
          await tester.pumpWidget(app(Aurora(tab: tab), light: light));
          await tester.pump(const Duration(seconds: 1));
          await tester.pump(const Duration(seconds: 1));
          expect(tester.binding.transientCallbackCount, 0, reason: tab);
        }
      }
      await tester.pumpWidget(app(const Aurora(tab: 'onboarding')));
      await tester.pump(const Duration(seconds: 1));
      expect(tester.binding.transientCallbackCount, greaterThan(0));
      await tester.pumpWidget(
        app(const Aurora(tab: 'onboarding'), still: true),
      );
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(seconds: 1));
      expect(tester.binding.transientCallbackCount, 0);
      expect(tester.takeException(), null);
    });
  });

  group('screen wave', () {
    // Loaded here: a load begun inside a widget test never completes.
    setUpAll(() async {
      TestWidgetsFlutterBinding.ensureInitialized();
      await waveShader.load();
    });

    test('the front gathers, launches and clears the whole view', () {
      const size = Size(360, 780);
      final source = defaultWaveSource(size);
      expect(source, const Rect.fromLTWH(24, 698, 312, 58));
      final start = waveFront(0, source, size, into: WaveFront());
      expect(start.launched, false);
      expect(start.clearRadius <= 0, true);
      var last = double.negativeInfinity;
      for (var i = 0; i <= 100; i++) {
        final t = waveFront(i / 100, source, size, into: WaveFront());
        expect(t.radius.isFinite && t.clearRadius.isFinite, true);
        expect(t.clearRadius >= last - 1e-6, true, reason: 'at $i');
        last = t.clearRadius;
      }
      final end = waveFront(1, source, size, into: WaveFront());
      expect(end.launched, true);
      // Far enough to uncover the corner furthest from the dock.
      expect(
        end.clearRadius > (Offset(size.width, 0) - source.center).distance,
        true,
      );
    });

    test('particles and rim lumps are deterministic and finite', () {
      const size = Size(360, 780);
      final source = defaultWaveSource(size);
      expect(waveParticles.length, WaveStyle.particleCount);
      final t = waveFront(.5, source, size, into: WaveFront());
      for (final p in waveParticles) {
        final a = particleAt(p, t, source), b = particleAt(p, t, source);
        expect(a, b);
        expect(a.x.isFinite && a.y.isFinite, true);
        expect(a.alpha >= 0 && a.alpha <= 1, true);
      }
      expect(rimLumps(.4, size), rimLumps(.4, size));
      expect(rimLumps(.4, size).every((v) => v.isFinite), true);
    });

    test('OKLab matches the reference values', () {
      final white = oklab([255, 255, 255]);
      expect(white[0], closeTo(1, 1e-3));
      expect(white[1], closeTo(0, 1e-3));
      expect(white[2], closeTo(0, 1e-3));
      final red = oklab([255, 0, 0]);
      expect(red[0], closeTo(.628, 1e-3));
      expect(red[1], closeTo(.225, 1e-3));
      expect(red[2], closeTo(.126, 1e-3));
    });

    Widget screens(int index, {bool still = false}) => app(
      ScreenTransition(
        screenKey: index,
        overlay: const Align(
          alignment: Alignment.bottomCenter,
          child: Text('dock'),
        ),
        child: ColoredBox(
          color: index.isEven ? Colors.indigo : Colors.teal,
          child: Center(child: Text('screen $index')),
        ),
      ),
      still: still,
    );

    testWidgets('changes screens, keeps the overlay live and settles', (
      tester,
    ) async {
      await tester.pumpWidget(screens(0));
      await tester.pump();
      await tester.pumpWidget(screens(1));
      await tester.pump(const Duration(milliseconds: 60));
      expect(find.text('screen 1'), findsOneWidget);
      expect(find.text('dock').hitTestable(), findsOneWidget);
      // A second change while the first is still running takes over.
      await tester.pumpWidget(screens(2));
      await tester.pump(const Duration(milliseconds: 60));
      await tester.pumpWidget(screens(3));
      await tester.pumpAndSettle();
      expect(find.text('screen 3').hitTestable(), findsOneWidget);
      expect(find.byType(RawImage), findsNothing);
      expect(
        find
            .byType(CustomPaint, skipOffstage: false)
            .evaluate()
            .where(
              (e) =>
                  (e.widget as CustomPaint).painter.runtimeType.toString() ==
                  '_WavePainter',
            ),
        isEmpty,
      );
      expect(tester.takeException(), null);
    });

    testWidgets('a device too slow for the wave crossfades for a while', (
      tester,
    ) async {
      expect(waveShader.program, isNotNull);
      Iterable<Element> waves() => find
          .byType(CustomPaint, skipOffstage: false)
          .evaluate()
          .where(
            (e) =>
                (e.widget as CustomPaint).painter.runtimeType.toString() ==
                '_WavePainter',
          );
      await tester.pumpWidget(screens(0));
      await tester.pump();
      // At speed the wave runs to its end.
      await tester.pumpWidget(screens(1));
      for (var i = 0; i < 12; i++) {
        await tester.pump(const Duration(milliseconds: 16));
      }
      expect(waves(), isNotEmpty);
      await settle(tester);
      expect(waves(), isEmpty);
      // Dropped frames end it early: the screen is simply shown.
      await tester.pumpWidget(screens(2));
      await tester.pump(const Duration(milliseconds: 16));
      await tester.pump(const Duration(milliseconds: 16));
      expect(waves(), isNotEmpty);
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump(const Duration(milliseconds: 400));
      expect(waves(), isEmpty);
      expect(find.text('screen 2').hitTestable(), findsOneWidget);
      // The next six changes crossfade, then the wave is tried again.
      for (var i = 3; i < 9; i++) {
        await tester.pumpWidget(screens(i));
        await tester.pump(const Duration(milliseconds: 16));
        expect(waves(), isEmpty, reason: 'change $i');
        expect(find.byType(RawImage), findsOneWidget);
        await settle(tester);
        expect(find.byType(RawImage), findsNothing);
      }
      await tester.pumpWidget(screens(9));
      await tester.pump(const Duration(milliseconds: 16));
      expect(waves(), isNotEmpty);
      await settle(tester);
      expect(find.text('screen 9').hitTestable(), findsOneWidget);
      expect(tester.takeException(), null);
    });

    testWidgets('changes at once with animations off', (tester) async {
      await tester.pumpWidget(screens(0, still: true));
      await tester.pump();
      await tester.pumpWidget(screens(1, still: true));
      await tester.pump();
      expect(find.text('screen 1').hitTestable(), findsOneWidget);
      expect(find.byType(RawImage), findsNothing);
      expect(tester.binding.transientCallbackCount, 0);
    });
  });
}
