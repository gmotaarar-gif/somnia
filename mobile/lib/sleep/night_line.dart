import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../logic/time.dart';
import '../theme/tokens.dart';

const _start = 18 * 60, _dots = 48, _day = 1440;

/// Minutes after 18:00, where the line begins.
int nightLineAlong(String time) => (timeToMinutes(time) - _start + _day) % _day;

/// Half-hour slots asleep as runs of (first, length); a night still going at
/// 18:00 carries on from the start of the line.
List<(int, int)> nightLineRuns(String bedtime, String wakeTime) {
  final from = nightLineAlong(bedtime);
  final asleep = bedtime == wakeTime ? 0 : spanMinutes(bedtime, wakeTime);
  final first = (from / 30).ceil();
  final slots = math.min(
    _dots,
    math.max(0, ((from + asleep) / 30).ceil() - first),
  );
  final head = first % _dots;
  return [
    (head, math.min(slots, _dots - head)),
    (0, slots - (_dots - head)),
  ].where((run) => run.$2 > 0).toList();
}

/// A night drawn on a dotted day that starts at 18:00, with two lime marks
/// for the planned hours. Always sits on a dark card.
class NightLine extends StatelessWidget {
  final String bedtime, wakeTime;
  final String? bedGoal, wakeGoal;
  const NightLine({
    super.key,
    required this.bedtime,
    required this.wakeTime,
    this.bedGoal,
    this.wakeGoal,
  });
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 16,
          child: CustomPaint(
            painter: _NightLinePainter(nightLineRuns(bedtime, wakeTime), [
              if (bedGoal != null) nightLineAlong(bedGoal!) / _day,
              if (wakeGoal != null) nightLineAlong(wakeGoal!) / _day,
            ]),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            for (final label in const ['18:00', '00:00', '06:00', '12:00'])
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color.fromRGBO(255, 255, 255, .55),
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
          ],
        ),
      ],
    ),
  );
}

class _NightLinePainter extends CustomPainter {
  final List<(int, int)> runs;
  final List<double> goals;
  const _NightLinePainter(this.runs, this.goals);
  @override
  void paint(Canvas canvas, Size size) {
    final pitch = (size.width - 3) / (_dots - 1);
    final rest = Paint()..color = const Color.fromRGBO(255, 255, 255, .3);
    final lit = <int>{
      for (final (first, length) in runs)
        for (var i = first; i < first + length; i++) i,
    };
    final white = Paint()..color = Colors.white;
    for (var i = 0; i < _dots; i++) {
      final x = i * pitch;
      if (lit.contains(i)) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x, 0, 3, size.height),
            const Radius.circular(1.5),
          ),
          white,
        );
      } else {
        canvas.drawCircle(Offset(x + 1.5, size.height / 2), 1.25, rest);
      }
    }
    final lime = Paint()..color = SomnaColors.lime;
    for (final at in goals) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(at * size.width - 1, -10, 2, 8),
          const Radius.circular(1),
        ),
        lime,
      );
    }
  }

  @override
  bool shouldRepaint(_NightLinePainter old) =>
      old.runs.toString() != runs.toString() ||
      old.goals.toString() != goals.toString();
}
