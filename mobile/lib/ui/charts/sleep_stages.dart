import 'package:material_ui/material_ui.dart';

import '../../data/models.dart';
import '../../logic/features.dart';
import '../../logic/time.dart';
import '../../theme/tokens.dart';
import 'chart_frame.dart';

const _order = ['deep', 'light', 'rem', 'awake'];
const _labels = {
  'deep': 'Глубокий',
  'light': 'Лёгкий',
  'rem': 'REM',
  'awake': 'Бодрств.',
};

List<StageSegment> _valid(List<StageSegment> stages) => stages
    .where((s) => stageMeta.containsKey(s.stage) && s.min.isFinite && s.min > 0)
    .toList();

Map<Stage, int> stageDisplayMinutes(List<StageSegment> stages) {
  final totals = stageTotals(_valid(stages));
  var elapsed = 0.0, rounded = 0;
  return {
    for (final stage in _order)
      stage: (() {
        elapsed += totals[stage]!;
        final next = jsRound(elapsed), value = next - rounded;
        rounded = next;
        return value;
      })(),
  };
}

Map<Stage, int> stageMinutes(SleepNight night) =>
    stageDisplayMinutes(hypnogram(night));

List<Offset> hypnogramPoints(
  List<StageSegment> stages, {
  bool compact = false,
}) {
  final valid = _valid(stages), points = <Offset>[];
  final total = valid.fold<double>(0, (sum, stage) => sum + stage.min);
  final left = compact ? 4.0 : 62.0;
  var x = left;
  for (final stage in valid) {
    final y = 12.0 + stageMeta[stage.stage]!.level * 27;
    points.add(Offset(x, y));
    x += stage.min / total * (312 - left);
    points.add(Offset(x, y));
  }
  return points;
}

class Hypnogram extends StatelessWidget {
  final List<StageSegment> stages;
  final String? bedtime, wakeTime;
  final bool compact;
  const Hypnogram({
    super.key,
    required this.stages,
    this.bedtime,
    this.wakeTime,
    this.compact = false,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context),
        points = hypnogramPoints(stages, compact: compact);
    if (points.isEmpty) {
      return Text(
        'Пока нет данных о фазах сна. Запись в дневнике не измеряет фазы.',
        style: TextStyle(fontSize: 13, color: c.ink2),
      );
    }
    return ChartFrame(
      viewBox: Size(320, compact ? 106 : 126),
      label:
          'Фазы сна${bedtime == null ? '' : ' с $bedtime'}${wakeTime == null ? '' : ' до $wakeTime'}.',
      paint: (canvas, progress) {
        if (!compact) {
          for (final stage in ['awake', 'rem', 'light', 'deep']) {
            final y = 12.0 + stageMeta[stage]!.level * 27;
            chartText(
              canvas,
              _labels[stage]!,
              Offset(0, y),
              c.ink.withValues(alpha: .58),
              size: 9,
            );
            dashedPath(
              canvas,
              Path()
                ..moveTo(62, y)
                ..lineTo(312, y),
              Paint()
                ..style = PaintingStyle.stroke
                ..color = c.ink.withValues(alpha: .07),
            );
          }
        }
        final path = Path()..moveTo(points.first.dx, points.first.dy);
        for (final point in points.skip(1)) {
          path.lineTo(point.dx, point.dy);
        }
        canvas.drawPath(
          path,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = compact ? 3 : 3.5
            ..strokeJoin = StrokeJoin.round
            ..strokeCap = StrokeCap.round
            ..shader = const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xffffd17a),
                Color(0xff6ce3e6),
                Color(0xff84a3ff),
                Color(0xffb5a0ff),
              ],
              stops: [0, .3, .65, 1],
            ).createShader(const Rect.fromLTWH(0, 12, 320, 81)),
        );
        if (!compact) {
          chartText(
            canvas,
            bedtime ?? '',
            const Offset(62, 116),
            c.ink.withValues(alpha: .65),
          );
          chartText(
            canvas,
            wakeTime ?? '',
            const Offset(312, 116),
            c.ink.withValues(alpha: .65),
            align: TextAlign.right,
          );
        }
      },
    );
  }
}

class StageLegend extends StatelessWidget {
  final List<StageSegment> stages;
  const StageLegend({super.key, required this.stages});
  @override
  Widget build(BuildContext context) {
    final totals = stageDisplayMinutes(stages), c = SomnaColors.of(context);
    if (!totals.values.any((v) => v > 0)) return const SizedBox.shrink();
    Color color(String stage) => Color(
      int.parse(stageMeta[stage]!.color.replaceFirst('#', 'ff'), radix: 16),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            height: 6,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final stage in _order)
                  if (totals[stage]! > 0)
                    Expanded(
                      flex: totals[stage]!,
                      child: ColoredBox(color: color(stage)),
                    ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final stage in _order)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: color(stage),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            _labels[stage]!,
                            style: TextStyle(fontSize: 10, color: c.ink2),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      durationRu(totals[stage]!),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}
