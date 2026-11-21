import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../../theme/tokens.dart';

typedef ChartPaint = void Function(Canvas canvas, double progress);

double unit(num value) => value.isFinite ? value.clamp(0, 1).toDouble() : 0;

Color valenceColor(List<int> rgb) =>
    Color.fromARGB(255, rgb[0], rgb[1], rgb[2]);

void chartText(
  Canvas canvas,
  String text,
  Offset at,
  Color color, {
  double size = 10,
  TextAlign align = TextAlign.left,
}) {
  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: TextStyle(fontFamily: 'Onest', fontSize: size, color: color),
    ),
    textDirection: TextDirection.ltr,
  )..layout();
  final dx = align == TextAlign.right
      ? painter.width
      : align == TextAlign.center
      ? painter.width / 2
      : 0.0;
  painter.paint(canvas, Offset(at.dx - dx, at.dy - painter.height / 2));
}

void dashedPath(
  Canvas canvas,
  Path path,
  Paint paint, {
  double dash = 2,
  double gap = 5,
}) {
  for (final metric in path.computeMetrics()) {
    for (double start = 0; start < metric.length; start += dash + gap) {
      canvas.drawPath(
        metric.extractPath(start, math.min(start + dash, metric.length)),
        paint,
      );
    }
  }
}

Path smoothPath(List<Offset> points, {double tension = .2}) {
  final path = Path();
  if (points.length < 2) return path;
  path.moveTo(points.first.dx, points.first.dy);
  for (var i = 0; i < points.length - 1; i++) {
    final p0 = points[math.max(0, i - 1)],
        p1 = points[i],
        p2 = points[i + 1],
        p3 = points[math.min(points.length - 1, i + 2)];
    final c1 = p1 + (p2 - p0) * tension, c2 = p2 - (p3 - p1) * tension;
    path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, p2.dx, p2.dy);
  }
  return path;
}

class ChartFrame extends StatelessWidget {
  final Size viewBox;
  final ChartPaint paint;
  final String? label;
  final Duration duration;
  const ChartFrame({
    super.key,
    required this.viewBox,
    required this.paint,
    this.label,
    this.duration = Duration.zero,
  });

  @override
  Widget build(BuildContext context) => Semantics(
    image: label != null,
    label: label,
    child: AspectRatio(
      aspectRatio: viewBox.width / viewBox.height,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : duration,
        curve: SomnaMotion.smooth,
        builder: (context, progress, child) =>
            CustomPaint(painter: _Painter(viewBox, paint, progress)),
      ),
    ),
  );
}

class _Painter extends CustomPainter {
  final Size viewBox;
  final ChartPaint draw;
  final double progress;
  _Painter(this.viewBox, this.draw, this.progress);
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / viewBox.width, size.height / viewBox.height);
    draw(canvas, progress);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _Painter oldDelegate) => true;
}
