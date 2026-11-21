import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../../data/models.dart';
import '../../logic/metrics.dart';
import '../../logic/time.dart';
import '../../logic/valence.dart';
import '../../theme/tokens.dart';
import 'chart_frame.dart';

List<DateTime> sleepCalendarDays(DateTime today) {
  final sunday = DateTime(
    today.year,
    today.month,
    today.day + 7 - today.weekday,
  );
  return List.generate(
    35,
    (i) => DateTime(sunday.year, sunday.month, sunday.day - 34 + i),
  );
}

List<DateTime> moodCalendarDays(DateTime today) => List.generate(
  28,
  (i) => DateTime(today.year, today.month, today.day - 27 + i),
);

class SleepCalendar extends StatelessWidget {
  final List<SleepNight> nights;
  final DateTime today;
  final String bedGoal, wakeGoal;
  final ValueChanged<SleepNight>? onNightTap;
  const SleepCalendar({
    super.key,
    required this.nights,
    required this.today,
    required this.bedGoal,
    required this.wakeGoal,
    this.onNightTap,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context),
        byKey = {for (final n in nights) n.dateKey: n},
        days = sleepCalendarDays(today);
    return Column(
      children: [
        Row(
          children: [
            for (final label in ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'])
              Expanded(
                child: Center(
                  child: Text(
                    label,
                    style: TextStyle(fontSize: 10, color: c.ink3),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          crossAxisCount: 7,
          mainAxisSpacing: 6,
          crossAxisSpacing: 6,
          children: [
            for (var i = 0; i < days.length; i++)
              Builder(
                builder: (context) {
                  final day = days[i],
                      key = dateKey(day),
                      n = byKey[key],
                      future = key.compareTo(dateKey(today)) > 0;
                  final score = n == null
                      ? 0
                      : nightScore(n, bedGoal, wakeGoal);
                  return _CalendarCell(
                    label: n == null
                        ? dayMonthShort(day)
                        : '${relativeDay(key, today)}: оценка $score',
                    text: '${day.day}',
                    color: n == null
                        ? c.ink.withValues(alpha: .06)
                        : SomnaColors.lime.withValues(
                            alpha: .25 + unit(score / 100) * .75,
                          ),
                    ink: n == null ? c.ink3 : SomnaColors.limeInk,
                    today: key == dateKey(today),
                    future: future,
                    index: i,
                    onTap: n != null && onNightTap != null
                        ? () => onNightTap!(n)
                        : null,
                  );
                },
              ),
          ],
        ),
      ],
    );
  }
}

class MoodCalendar extends StatelessWidget {
  final List<MoodEntry> moods;
  final DateTime today;
  const MoodCalendar({super.key, required this.moods, required this.today});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), grouped = <String, List<double>>{};
    for (final mood in moods) {
      final at = DateTime.tryParse(mood.at);
      if (at == null || !mood.valence.isFinite) continue;
      grouped.putIfAbsent(dateKey(at.toLocal()), () => []).add(mood.valence);
    }
    final days = moodCalendarDays(today);
    return Column(
      children: [
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          crossAxisCount: 7,
          mainAxisSpacing: 6,
          crossAxisSpacing: 6,
          children: [
            for (var i = 0; i < days.length; i++)
              Builder(
                builder: (context) {
                  final key = dateKey(days[i]), values = grouped[key];
                  final value = values == null
                      ? null
                      : values.reduce((a, b) => a + b) / values.length;
                  return _CalendarCell(
                    label: value == null
                        ? relativeDay(key, today)
                        : '${relativeDay(key, today)}: ${jsRound((value.clamp(-1, 1) + 1) / 2 * 100)}%',
                    color: value == null
                        ? c.glassInset
                        : valenceColor(sampleValencePalette(value).mid),
                    ink: c.ink,
                    index: i,
                    radius: 10,
                  );
                },
              ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Text('Неприятно', style: TextStyle(fontSize: 11, color: c.ink3)),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                height: 6,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  gradient: LinearGradient(
                    colors: [
                      for (final v in [-1.0, -.5, 0.0, .5, 1.0])
                        valenceColor(sampleValencePalette(v).mid),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text('Приятно', style: TextStyle(fontSize: 11, color: c.ink3)),
          ],
        ),
      ],
    );
  }
}

class _CalendarCell extends StatelessWidget {
  final String label;
  final String? text;
  final Color color, ink;
  final bool today, future;
  final int index;
  final double radius;
  final VoidCallback? onTap;
  const _CalendarCell({
    required this.label,
    required this.color,
    required this.ink,
    required this.index,
    this.text,
    this.today = false,
    this.future = false,
    this.radius = 12,
    this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final outline = SomnaColors.of(context).ink;
    return Semantics(
      label: label,
      button: onTap != null,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: ChartFrame(
          viewBox: const Size(40, 40),
          duration: Duration(milliseconds: 350 + index * 12),
          paint: (canvas, progress) {
            final scale = .6 + .4 * progress;
            canvas.translate(20 * (1 - scale), 20 * (1 - scale));
            canvas.scale(scale);
            final alpha = progress * (future ? .25 : 1),
                rect = RRect.fromRectAndRadius(
                  const Rect.fromLTWH(.5, .5, 39, 39),
                  Radius.circular(radius),
                );
            canvas.drawRRect(
              rect,
              Paint()..color = color.withValues(alpha: color.a * alpha),
            );
            if (today) {
              canvas.drawRRect(
                rect,
                Paint()
                  ..style = PaintingStyle.stroke
                  ..color = outline.withValues(alpha: .7 * alpha),
              );
            }
            if (text != null) {
              chartText(
                canvas,
                text!,
                const Offset(20, 20),
                ink.withValues(alpha: ink.a * alpha),
                size: 11,
                align: TextAlign.center,
              );
            }
          },
        ),
      ),
    );
  }
}

class ScoreRing extends StatelessWidget {
  final double? score;
  final double size;
  final Widget? child;
  final Color? color;
  const ScoreRing({
    super.key,
    required this.score,
    this.size = 212,
    this.child,
    this.color,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final value = score != null && score!.isFinite ? score : null;
    return Semantics(
      label: value == null ? 'Нет данных' : 'Оценка ${value.round()}',
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            ChartFrame(
              viewBox: const Size(212, 212),
              duration: const Duration(milliseconds: 1000),
              paint: (canvas, progress) {
                final bounds = Rect.fromCircle(
                  center: const Offset(106, 106),
                  radius: 98,
                );
                canvas.drawCircle(
                  const Offset(106, 106),
                  98,
                  Paint()
                    ..style = PaintingStyle.stroke
                    ..strokeWidth = 3
                    ..color = c.ink.withValues(alpha: .1),
                );
                if (value != null && value > 0) {
                  canvas.drawArc(
                    bounds,
                    -math.pi / 2,
                    2 * math.pi * unit(value / 100) * progress,
                    false,
                    Paint()
                      ..style = PaintingStyle.stroke
                      ..strokeWidth = 4
                      ..strokeCap = StrokeCap.round
                      ..color = color ?? c.accent,
                  );
                }
              },
            ),
            child ??
                Text(
                  value == null ? '—' : '${value.round()}',
                  style: TextStyle(
                    fontSize: size * .25,
                    fontWeight: FontWeight.w600,
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
