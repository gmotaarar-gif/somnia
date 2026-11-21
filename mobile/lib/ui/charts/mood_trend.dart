import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../../logic/valence.dart';
import '../../theme/tokens.dart';
import 'chart_frame.dart';

class MoodDay {
  final String key, label;
  final double? value;
  const MoodDay({required this.key, required this.label, this.value});
}

class MoodTrend extends StatelessWidget {
  final List<MoodDay> days;
  const MoodTrend({super.key, required this.days});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context),
        count = days.where((d) => d.value != null && d.value!.isFinite).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ChartFrame(
          viewBox: const Size(320, 184),
          label:
              'Настроение по дням: $count из ${days.length} дней с записями. Шкала от неприятного до приятного.',
          paint: (canvas, progress) {
            for (final (text, y) in [
              ('Приятно', 18.0),
              ('Нейтрально', 84.0),
              ('Неприятно', 150.0),
            ]) {
              chartText(
                canvas,
                text,
                Offset(0, y),
                c.ink.withValues(alpha: .55),
              );
              dashedPath(
                canvas,
                Path()
                  ..moveTo(78, y)
                  ..lineTo(308, y),
                Paint()
                  ..style = PaintingStyle.stroke
                  ..color = c.ink.withValues(alpha: .055),
              );
            }
            if (days.isEmpty) return;
            final colors = days
                .map(
                  (d) => valenceColor(
                    sampleValencePalette(
                      d.value != null && d.value!.isFinite ? d.value! : 0,
                    ).mid,
                  ),
                )
                .toList();
            final paint = Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = 2.5
              ..strokeCap = StrokeCap.round
              ..strokeJoin = StrokeJoin.round
              ..shader = LinearGradient(
                colors: colors.length == 1
                    ? [colors.first, colors.first]
                    : colors,
              ).createShader(const Rect.fromLTWH(78, 0, 230, 184));
            var run = <Offset>[];
            void drawRun() {
              if (run.length == 1) {
                canvas.drawCircle(
                  run.single,
                  3,
                  Paint()..shader = paint.shader,
                );
              } else if (run.length > 1) {
                canvas.drawPath(smoothPath(run, tension: .14), paint);
              }
              run = [];
            }

            for (var i = 0; i < days.length; i++) {
              final d = days[i],
                  x = 78 + i / math.max(1, days.length - 1) * 230;
              if (d.value == null || !d.value!.isFinite) {
                drawRun();
              } else {
                run.add(Offset(x, 18 + (1 - d.value!.clamp(-1, 1)) * 66));
              }
              if (i % 2 == (days.length - 1) % 2) {
                chartText(
                  canvas,
                  d.label,
                  Offset(x, 174),
                  c.ink.withValues(alpha: .5),
                  align: TextAlign.center,
                );
              }
            }
            drawRun();
          },
        ),
        if (count == 0)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'График появится после первого чек-ина.',
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
          ),
      ],
    );
  }
}
