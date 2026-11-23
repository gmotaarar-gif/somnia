import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/buddies.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/glow.dart';
import '../ui/surfaces.dart';
import 'controls.dart' show SheetHeader;

/// One point per night that has check-ins the same day: hours slept against
/// the mean mood of that day.
List<({double hours, double mood})> sleepMoodPoints(
  List<SleepNight> nights,
  List<MoodEntry> moods,
) {
  final byDay = <String, List<double>>{};
  for (final m in moods) {
    final at = DateTime.tryParse(m.at);
    if (at == null) continue;
    byDay.putIfAbsent(dateKey(at.toLocal()), () => []).add(m.valence);
  }
  return [
    for (final n in nights)
      if (byDay[n.dateKey] case final v?)
        (hours: n.durationMin / 60, mood: mean(v)),
  ];
}

/// Mean sleep minutes per weekday, Monday first; null for weekdays with no
/// nights.
List<double?> weekdayMeans(List<SleepNight> nights) {
  final buckets = List.generate(7, (_) => <double>[]);
  for (final n in nights) {
    buckets[parseKey(n.dateKey).weekday - 1].add(n.durationMin);
  }
  return [for (final b in buckets) b.isEmpty ? null : mean(b)];
}

/// Spread of bedtimes in minutes (standard deviation around midnight-safe
/// clock), lower is steadier.
double bedtimeSpread(List<SleepNight> nights) {
  if (nights.length < 2) return 0;
  final mins = [
    for (final n in nights)
      ((timeToMinutes(n.bedtime) + 12 * 60) % (24 * 60)).toDouble(),
  ];
  final m = mean(mins);
  return math.sqrt(mean(mins.map((x) => (x - m) * (x - m))));
}

/// Pearson correlation, 0 when there is not enough data.
double correlation(List<({double hours, double mood})> pts) {
  if (pts.length < 3) return 0;
  final mx = mean(pts.map((p) => p.hours)), my = mean(pts.map((p) => p.mood));
  var sxy = 0.0, sxx = 0.0, syy = 0.0;
  for (final p in pts) {
    sxy += (p.hours - mx) * (p.mood - my);
    sxx += (p.hours - mx) * (p.hours - mx);
    syy += (p.mood - my) * (p.mood - my);
  }
  if (sxx == 0 || syy == 0) return 0;
  return sxy / math.sqrt(sxx * syy);
}

String correlationLabel(double r) {
  if (r.abs() < .2) return 'Связи пока не видно';
  if (r > .5) return 'Сильная связь: высыпаетесь, и день лучше';
  if (r > 0) return 'Заметная связь сна и настроения';
  return 'Обратная связь: стоит присмотреться';
}

class InsightsSheet extends StatelessWidget {
  const InsightsSheet({super.key});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final nights = store.nights;
    final pts = sleepMoodPoints(nights, store.moods);
    final r = correlation(pts);
    final week = weekdayMeans(nights);
    final spread = bedtimeSpread(tail(nights, 14));
    final steady = (1 - spread / 120).clamp(0.0, 1.0);
    final ranked = [...nights]
      ..sort(
        (a, b) => nightScore(
          b,
          store.bedGoal,
          store.wakeGoal,
        ).compareTo(nightScore(a, store.bedGoal, store.wakeGoal)),
      );
    final tagImpact = _tagImpact(store);
    final best = week.indexed.where((e) => e.$2 != null).fold<(int, double?)>(
      (-1, null),
      (m, e) {
        return m.$2 == null || e.$2! > m.$2! ? (e.$1, e.$2) : m;
      },
    );
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: 'Глубокая аналитика',
          description: 'Считается на устройстве по вашему журналу',
          onClose: () => store.openSheet(null),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: nights.length < 3
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Column(
                    children: [
                      const Buddy(kind: BuddyKind.star, size: 96, happy: true),
                      const SizedBox(height: 16),
                      Text(
                        'Нужно хотя бы три ночи, чтобы увидеть закономерности. '
                        'Сейчас: ${nights.length}.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: c.ink2),
                      ),
                    ],
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Reveal(
                      child: BevelGlass(
                        glow: const Color(0xffff4db8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Сон и настроение',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              correlationLabel(r),
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xb3ffffff),
                              ),
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              height: 160,
                              child: pts.isEmpty
                                  ? const Center(
                                      child: Text(
                                        'Отмечайте настроение в дни после записанных ночей',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Color(0xb3ffffff),
                                        ),
                                      ),
                                    )
                                  : CustomPaint(
                                      size: Size.infinite,
                                      painter: ScatterPainter(pts),
                                    ),
                            ),
                            const SizedBox(height: 8),
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'меньше сна',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0x80ffffff),
                                  ),
                                ),
                                Text(
                                  'больше сна',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Color(0x80ffffff),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Reveal(
                      index: 1,
                      child: SomnaCard(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Ритм недели',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              best.$1 < 0
                                  ? 'Средний сон по дням недели'
                                  : 'Дольше всего спите в ${_dayAcc(best.$1)}',
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xb3ffffff),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Bars(
                              values: [for (final v in week) v ?? 0],
                              labels: days,
                              highlight: best.$1 < 0 ? null : best.$1,
                              goal: spanMinutes(
                                store.bedGoal,
                                store.wakeGoal,
                              ).toDouble(),
                              height: 140,
                              format: durationRu,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Reveal(
                      index: 2,
                      child: SomnaCard(
                        tone: 'cobalt',
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Expanded(
                                  child: Text(
                                    'Стабильность отбоя',
                                    style: TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Dots(
                                  value: '${(steady * 100).round()}%',
                                  size: 20,
                                  color: Colors.white,
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Разброс за две недели: ±${spread.round()} мин',
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xb3ffffff),
                              ),
                            ),
                            const SizedBox(height: 16),
                            LedMeter(value: steady, count: 24),
                          ],
                        ),
                      ),
                    ),
                    if (tagImpact.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Reveal(
                        index: 3,
                        child: GlassSurface(
                          radius: 30,
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                'Что влияет на ночь',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 12),
                              for (final (tag, delta) in tagImpact)
                                _ImpactRow(tag: tag, delta: delta),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Reveal(
                      index: 4,
                      child: GlassSurface(
                        radius: 30,
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Лучшие ночи',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            for (final (i, n) in ranked.take(3).indexed)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 28,
                                      child: Text(
                                        '${i + 1}',
                                        style: TextStyle(
                                          fontSize: 15,
                                          color: i == 0 ? c.accent : c.ink3,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        '${relativeDay(n.dateKey)} · ${n.bedtime} → ${n.wakeTime}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                    ),
                                    Text(
                                      '${nightScore(n, store.bedGoal, store.wakeGoal)}',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: c.ink2,
                                        fontFeatures: const [
                                          FontFeature.tabularFigures(),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  static String _dayAcc(int i) => const [
    'понедельник',
    'вторник',
    'среду',
    'четверг',
    'пятницу',
    'субботу',
    'воскресенье',
  ][i];

  /// Night-score difference with each tag vs without, top four by size.
  static List<(String, int)> _tagImpact(SomnaStore store) {
    final nights = store.nights;
    final tags = {for (final n in nights) ...n.tags};
    final out = <(String, int)>[];
    for (final t in tags) {
      final yes = nights.where((n) => n.tags.contains(t)).toList();
      final no = nights.where((n) => !n.tags.contains(t)).toList();
      if (yes.length < 2 || no.isEmpty) continue;
      double avg(List<SleepNight> xs) =>
          mean(xs.map((n) => nightScore(n, store.bedGoal, store.wakeGoal)));
      out.add((t, (avg(yes) - avg(no)).round()));
    }
    out.sort((a, b) => b.$2.abs().compareTo(a.$2.abs()));
    return out.take(4).toList();
  }
}

class _ImpactRow extends StatelessWidget {
  final String tag;
  final int delta;
  const _ImpactRow({required this.tag, required this.delta});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final good = delta >= 0;
    final share = (delta.abs() / 30).clamp(.05, 1.0);
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        children: [
          SizedBox(
            width: 110,
            child: Text(
              tag,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, box) => Align(
                alignment: Alignment.centerLeft,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: share),
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : SomnaMotion.verySlow,
                  curve: SomnaMotion.smooth,
                  builder: (context, v, _) => Container(
                    height: 8,
                    width: box.maxWidth * v,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: good ? c.accent : c.danger,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 36,
            child: Text(
              '${good ? '+' : '−'}${delta.abs()}',
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
          ),
        ],
      ),
    );
  }
}

/// Hours on x, mood on y (−1…1), with a least-squares line.
class ScatterPainter extends CustomPainter {
  final List<({double hours, double mood})> pts;
  const ScatterPainter(this.pts);
  @override
  void paint(Canvas canvas, Size size) {
    final lo = pts.map((p) => p.hours).reduce(math.min).floorToDouble() - .5;
    final hi = pts.map((p) => p.hours).reduce(math.max).ceilToDouble() + .5;
    Offset at(double h, double m) => Offset(
      (h - lo) / (hi - lo) * size.width,
      (1 - (m + 1) / 2) * size.height,
    );
    final grid = Paint()
      ..color = Colors.white.withValues(alpha: .08)
      ..strokeWidth = 1;
    for (var i = 0; i <= 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    if (pts.length >= 2) {
      final mx = mean(pts.map((p) => p.hours));
      final my = mean(pts.map((p) => p.mood));
      var num = 0.0, den = 0.0;
      for (final p in pts) {
        num += (p.hours - mx) * (p.mood - my);
        den += (p.hours - mx) * (p.hours - mx);
      }
      final k = den == 0 ? 0.0 : num / den;
      double f(double h) => (my + k * (h - mx)).clamp(-1.0, 1.0);
      canvas.drawLine(
        at(lo, f(lo)),
        at(hi, f(hi)),
        Paint()
          ..color = const Color(0xffd9f24a).withValues(alpha: .8)
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round,
      );
    }
    for (final p in pts) {
      final o = at(p.hours, p.mood);
      canvas.drawCircle(
        o,
        8,
        Paint()
          ..color = const Color(0xffff4db8).withValues(alpha: .25)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4),
      );
      canvas.drawCircle(o, 4, Paint()..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(ScatterPainter old) => old.pts != pts;
}
