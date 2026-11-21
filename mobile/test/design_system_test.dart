import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/theme/theme.dart';
import 'package:somna/theme/tokens.dart';
import 'package:somna/ui/dots.dart';
import 'package:somna/ui/mood_orb.dart';
import 'package:somna/ui/press_scale.dart';
import 'package:somna/ui/surfaces.dart';

void main() {
  test('web token values and dot matrix geometry', () {
    expect(SomnaRadii.medium, 30);
    expect(SomnaRadii.large, 36);
    expect(SomnaRadii.small, 24);
    expect(SomnaRadii.sheet, 40);
    expect(SomnaMotion.pressScale, .96);
    expect(SomnaMotion.fast.inMilliseconds, 250);
    expect(cardTones['forest']!.top, const Color(0xff0f3a2a));
    expect(toneSwatches['forest']!.first, const Color(0xff17553d));
    expect(dotGlyphs['0'], [
      '01110',
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '01110',
    ]);
    expect(dotGlyphs[':'], ['0', '0', '1', '0', '1', '0', '0']);
    expect(somnaThemeMode('invalid'), ThemeMode.system);
  });
  testWidgets(
    'surfaces, dot numerals, empty numerals and orb render in light theme',
    (tester) async {
      Brightness? cardBrightness;
      await tester.pumpWidget(
        MaterialApp(
          theme: somnaTheme(Brightness.light),
          home: Scaffold(
            body: Column(
              children: [
                SomnaCard(
                  tone: 'cobalt',
                  child: Builder(
                    builder: (context) {
                      cardBrightness = Theme.of(context).brightness;
                      return const Dots(value: '7:42', size: 28);
                    },
                  ),
                ),
                const GlassSurface(chrome: true, child: Text('Glass')),
                const Dots(value: '', size: 28),
                const MoodOrb(valence: -.5, size: 60),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(cardBrightness, Brightness.dark);
      expect(find.bySemanticsLabel('7:42'), findsOneWidget);
      expect(find.bySemanticsLabel('Неприятно'), findsOneWidget);
      expect(tester.takeException(), null);
    },
  );
  testWidgets('press scale responds to pointer and activates once', (
    tester,
  ) async {
    var presses = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Center(
          child: PressScale(
            label: 'Test',
            onPressed: () => presses++,
            child: const SizedBox(width: 100, height: 60),
          ),
        ),
      ),
    );
    final gesture = await tester.startGesture(
      tester.getCenter(find.bySemanticsLabel('Test')),
    );
    await tester.pump(const Duration(milliseconds: 150));
    expect(tester.widget<AnimatedScale>(find.byType(AnimatedScale)).scale, .96);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(presses, 1);
    expect(tester.widget<AnimatedScale>(find.byType(AnimatedScale)).scale, 1);
  });
}
