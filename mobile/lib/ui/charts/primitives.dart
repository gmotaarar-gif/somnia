import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../../theme/tokens.dart';
import 'chart_frame.dart';

class DotTrack extends StatelessWidget {
  final double value;
  final int count;
  final bool marker;
  const DotTrack({
    super.key,
    required this.value,
    this.count = 28,
    this.marker = true,
  });
  @override
  Widget build(BuildContext context) {
    final colors = SomnaColors.of(context);
    return ChartFrame(
      viewBox: const Size(320, 16),
      duration: Duration(milliseconds: 350 + math.max(0, count - 1) * 14),
      paint: (canvas, progress) {
        final at = (unit(value) * (count - 1)).round();
        for (var i = 0; i < count; i++) {
          final x = 2.5 + i / math.max(1, count - 1) * 315;
          if (i == at && marker) {
            final rect = RRect.fromRectAndRadius(
              Rect.fromLTWH(x - 2.5, 0, 5, 16),
              const Radius.circular(2),
            );
            canvas.drawRRect(
              rect,
              Paint()
                ..color = SomnaColors.lime.withValues(alpha: .5)
                ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5),
            );
            canvas.drawRRect(rect, Paint()..color = SomnaColors.lime);
          } else {
            final reveal = unit(
              (progress * (350 + math.max(0, count - 1) * 14) - i * 14) / 350,
            );
            canvas.drawCircle(
              Offset(x, 8),
              (i < at ? 2.5 : 1.25) * (.2 + .8 * reveal),
              Paint()
                ..color = colors.ink.withValues(
                  alpha: (i < at ? 1 : .35) * reveal,
                ),
            );
          }
        }
      },
    );
  }
}

class DotRow extends StatelessWidget {
  final List<double> values;
  final double size;
  const DotRow({super.key, required this.values, this.size = 6});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return SizedBox(
      height: size,
      child: ChartFrame(
        viewBox: Size(320, size),
        paint: (canvas, progress) {
          for (var i = 0; i < values.length; i++) {
            final on = unit(values[i]);
            final at = Offset(
              size / 2 + i / math.max(1, values.length - 1) * (320 - size),
              size / 2,
            );
            if (on > .6) {
              canvas.drawCircle(
                at,
                size / 2,
                Paint()
                  ..color = SomnaColors.lime.withValues(alpha: .55)
                  ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5),
              );
            }
            canvas.drawCircle(
              at,
              size / 2,
              Paint()
                ..color = on > 0
                    ? c.accent.withValues(alpha: .45 + on * .55)
                    : c.hair,
            );
          }
        },
      ),
    );
  }
}

class Arc extends StatelessWidget {
  final double value;
  final Color color;
  const Arc({
    super.key,
    required this.value,
    this.color = const Color(0xffb6f27a),
  });
  @override
  Widget build(BuildContext context) {
    final ink = SomnaColors.of(context).ink;
    return ChartFrame(
      viewBox: const Size(200, 52),
      paint: (canvas, progress) {
        const start = math.pi * 1.5 - .6;
        final bounds = Rect.fromCircle(
          center: const Offset(100, 196),
          radius: 180,
        );
        canvas.drawArc(
          bounds,
          start,
          1.2,
          false,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 5
            ..strokeCap = StrokeCap.round
            ..color = ink.withValues(alpha: .14),
        );
        if (unit(value) > .01) {
          canvas.drawArc(
            bounds,
            start,
            1.2 * unit(value),
            false,
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = 5
              ..strokeCap = StrokeCap.round
              ..shader = LinearGradient(
                colors: [color.withValues(alpha: .35), color],
              ).createShader(const Rect.fromLTWH(0, 0, 200, 52)),
          );
        }
        final a = start + 1.2 * unit(value),
            at = Offset(100 + math.cos(a) * 180, 196 + math.sin(a) * 180);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(at.dx - 9, at.dy - 4, 18, 30),
            const Radius.circular(9),
          ),
          Paint()..color = ink.withValues(alpha: .1),
        );
        canvas.drawCircle(at, 8, Paint()..color = ink);
        canvas.drawCircle(
          at,
          8,
          Paint()
            ..style = PaintingStyle.stroke
            ..color = const Color(0x2e000000),
        );
      },
    );
  }
}

class Wave extends StatelessWidget {
  final List<double> values;
  final Color? color;
  final bool fill, knob;
  final double height;
  const Wave({
    super.key,
    required this.values,
    this.color,
    this.fill = false,
    this.knob = true,
    this.height = 60,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context),
        clean = values.map((v) => v.isFinite ? v : 0.0).toList();
    final stroke = color ?? c.accent;
    return ChartFrame(
      viewBox: Size(200, height),
      duration: const Duration(milliseconds: 1250),
      paint: (canvas, progress) {
        if (clean.length < 2) return;
        final lo = clean.reduce(math.min),
            hi = clean.reduce(math.max),
            span = hi == lo ? 1 : hi - lo;
        final points = List.generate(
          clean.length,
          (i) => Offset(
            9 + i / (clean.length - 1) * 182,
            9 + (1 - (clean[i] - lo) / span) * (height - 18),
          ),
        );
        final path = smoothPath(points), last = points.last;
        if (fill) {
          final area = Path.from(path)
            ..lineTo(last.dx, height)
            ..lineTo(points.first.dx, height)
            ..close();
          canvas.drawPath(
            area,
            Paint()
              ..shader = LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  stroke.withValues(alpha: .22 * progress),
                  stroke.withValues(alpha: 0),
                ],
              ).createShader(Rect.fromLTWH(0, 0, 200, height)),
          );
        }
        final line = Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 4.5
          ..strokeCap = StrokeCap.round
          ..shader = LinearGradient(
            colors: [stroke.withValues(alpha: .25), stroke, stroke],
            stops: const [0, .7, 1],
          ).createShader(Rect.fromLTWH(0, 0, 200, height));
        for (final metric in path.computeMetrics()) {
          canvas.drawPath(
            metric.extractPath(0, metric.length * progress),
            line,
          );
        }
        if (knob && progress > .75) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(last.dx - 8, last.dy - 3, 16, 30),
              const Radius.circular(8),
            ),
            Paint()..color = c.ink.withValues(alpha: .1),
          );
          canvas.drawCircle(
            last,
            6.5 * ((progress - .75) * 4),
            Paint()..color = c.ink,
          );
        }
      },
    );
  }
}

class Ring extends StatelessWidget {
  final double value, size, stroke;
  final Color? color;
  final Widget? child;
  const Ring({
    super.key,
    required this.value,
    this.size = 120,
    this.stroke = 3,
    this.color,
    this.child,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Semantics(
      value: '${(unit(value) * 100).round()}%',
      child: SizedBox.square(
        dimension: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            ChartFrame(
              viewBox: const Size(100, 100),
              duration: const Duration(milliseconds: 1150),
              paint: (canvas, progress) {
                final bounds = Rect.fromCircle(
                  center: const Offset(50, 50),
                  radius: math.max(0, 50 - stroke),
                );
                canvas.drawOval(
                  bounds,
                  Paint()
                    ..style = PaintingStyle.stroke
                    ..strokeWidth = stroke * .5
                    ..color = c.ink.withValues(alpha: .16),
                );
                if (unit(value) > 0) {
                  canvas.drawArc(
                    bounds,
                    -math.pi / 2,
                    2 * math.pi * unit(value) * progress,
                    false,
                    Paint()
                      ..style = PaintingStyle.stroke
                      ..strokeWidth = stroke
                      ..strokeCap = StrokeCap.round
                      ..color = color ?? c.accent,
                  );
                }
              },
            ),
            ?child,
          ],
        ),
      ),
    );
  }
}

class Bars extends StatelessWidget {
  final List<double> values;
  final List<String>? labels;
  final double? max, goal;
  final int? highlight;
  final double height;
  final String Function(double)? format;
  const Bars({
    super.key,
    required this.values,
    this.labels,
    this.max,
    this.goal,
    this.highlight,
    this.height = 160,
    this.format,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return SizedBox(
      height: height,
      child: ChartFrame(
        viewBox: Size(320, height),
        label: format == null ? null : values.map(format!).join(', '),
        duration: const Duration(milliseconds: 1100),
        paint: (canvas, progress) {
          final top = max != null && max!.isFinite && max! > 0
              ? max!
              : [
                  1.0,
                  if (goal != null && goal!.isFinite) goal!,
                  ...values.where((v) => v.isFinite),
                ].reduce(math.max);
          final base = height - (labels == null ? 0 : 22),
              width = values.isEmpty
                  ? 0.0
                  : (320 - (values.length - 1) * 6) / values.length;
          if (goal != null && goal!.isFinite) {
            dashedPath(
              canvas,
              Path()
                ..moveTo(0, base * (1 - unit(goal! / top)))
                ..lineTo(320, base * (1 - unit(goal! / top))),
              Paint()
                ..color = c.ink.withValues(alpha: .3)
                ..style = PaintingStyle.stroke,
            );
          }
          for (var i = 0; i < values.length; i++) {
            final hot = i == (highlight ?? values.length - 1),
                barWidth = math.max(0.0, math.min(26.0, width)),
                x = i * (width + 6) + (width - barWidth) / 2;
            final amount =
                base *
                (.04 + (math.max(.06, unit(values[i] / top)) - .04) * progress);
            final rect = RRect.fromRectAndRadius(
              Rect.fromLTWH(x, base - amount, barWidth, amount),
              const Radius.circular(20),
            );
            if (hot) {
              canvas.drawRRect(
                rect,
                Paint()
                  ..color = SomnaColors.lime.withValues(alpha: .3)
                  ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 9),
              );
            }
            canvas.drawRRect(
              rect,
              Paint()
                ..color = hot ? SomnaColors.lime : c.ink.withValues(alpha: .22),
            );
            if (labels != null && i < labels!.length) {
              chartText(
                canvas,
                labels![i],
                Offset(x + barWidth / 2, height - 7),
                hot ? c.ink : c.ink3,
                align: TextAlign.center,
              );
            }
          }
        },
      ),
    );
  }
}

class Orbits extends StatelessWidget {
  final List<double> points;
  const Orbits({super.key, this.points = const [.18, .52, .8]});
  @override
  Widget build(BuildContext context) {
    final ink = SomnaColors.of(context).ink;
    return ChartFrame(
      viewBox: const Size(240, 110),
      paint: (canvas, progress) {
        for (var i = 0; i < 5; i++) {
          final path = Path()
            ..addOval(
              Rect.fromCenter(
                center: Offset(60 + i * 30, 110),
                width: 124,
                height: 116,
              ),
            );
          dashedPath(
            canvas,
            path,
            Paint()
              ..style = PaintingStyle.stroke
              ..strokeCap = StrokeCap.round
              ..strokeWidth = 1
              ..color = ink.withValues(alpha: .32),
            dash: .1,
            gap: 4.2,
          );
        }
        for (var i = 0; i < points.length; i++) {
          final angle = math.pi + unit(points[i]) * math.pi;
          canvas.drawCircle(
            Offset(
              60 + ((i * 2) % 5) * 30 + math.cos(angle) * 62,
              110 + math.sin(angle) * 58,
            ),
            3.2,
            Paint()..color = ink,
          );
        }
      },
    );
  }
}
