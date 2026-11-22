import 'package:material_ui/material_ui.dart';

import 'lucide_data.dart';

/// A lucide icon drawn as strokes on its 24px grid, like the web app's icons.
class Lucide extends StatelessWidget {
  final String name;
  final double size, strokeWidth;
  final Color? color;
  const Lucide(
    this.name, {
    super.key,
    this.size = 16,
    this.strokeWidth = 2,
    this.color,
  });
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _LucidePainter(
          name,
          color ?? IconTheme.of(context).color ?? Colors.white,
          strokeWidth,
        ),
      ),
    ),
  );
}

class _LucidePainter extends CustomPainter {
  final String name;
  final Color color;
  final double strokeWidth;
  const _LucidePainter(this.name, this.color, this.strokeWidth);
  static final _cache = <String, List<Path>>{};
  @override
  void paint(Canvas canvas, Size size) {
    final paths = _cache[name] ??= [
      for (final d in lucideIcons[name] ?? const <String>[]) parseSvgPath(d),
    ];
    canvas.scale(size.width / 24);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final path in paths) {
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_LucidePainter old) =>
      old.name != name || old.color != color || old.strokeWidth != strokeWidth;
}

final _token = RegExp(r'[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e-?\d+)?');
final _flagArgs = RegExp(
  r'(-?(?:\d*\.\d+|\d+\.?))[\s,]*(-?(?:\d*\.\d+|\d+\.?))[\s,]*(-?(?:\d*\.\d+|\d+\.?))[\s,]*([01])[\s,]*([01])',
);

/// Parses SVG path data (M L H V C S Q T A Z, absolute and relative).
Path parseSvgPath(String d) {
  // Arc flags may be written without separators ("a2 2 0 012 2").
  d = d.replaceAllMapped(
    RegExp(r'([aA])([^a-zA-Z]*)'),
    (m) => '${m[1]}${_spreadArcFlags(m[2]!)}',
  );
  final tokens = _token.allMatches(d).map((m) => m[0]!).toList();
  final path = Path();
  var i = 0, cmd = '';
  var x = 0.0, y = 0.0, startX = 0.0, startY = 0.0;
  double? ctrlX, ctrlY;
  double next() => double.parse(tokens[i++]);
  bool isCommand(String t) => RegExp(r'^[a-zA-Z]$').hasMatch(t);
  while (i < tokens.length) {
    if (isCommand(tokens[i])) cmd = tokens[i++];
    final rel = cmd == cmd.toLowerCase();
    final dx = rel ? x : 0.0, dy = rel ? y : 0.0;
    var keepCtrl = false;
    switch (cmd.toLowerCase()) {
      case 'm':
        x = next() + dx;
        y = next() + dy;
        startX = x;
        startY = y;
        path.moveTo(x, y);
        cmd = rel ? 'l' : 'L';
      case 'l':
        x = next() + dx;
        y = next() + dy;
        path.lineTo(x, y);
      case 'h':
        x = next() + dx;
        path.lineTo(x, y);
      case 'v':
        y = next() + dy;
        path.lineTo(x, y);
      case 'c':
      case 's':
        double x1, y1;
        if (cmd.toLowerCase() == 'c') {
          x1 = next() + dx;
          y1 = next() + dy;
        } else {
          x1 = ctrlX == null ? x : 2 * x - ctrlX;
          y1 = ctrlY == null ? y : 2 * y - ctrlY;
        }
        final x2 = next() + dx, y2 = next() + dy;
        x = next() + dx;
        y = next() + dy;
        path.cubicTo(x1, y1, x2, y2, x, y);
        ctrlX = x2;
        ctrlY = y2;
        keepCtrl = true;
      case 'q':
      case 't':
        double x1, y1;
        if (cmd.toLowerCase() == 'q') {
          x1 = next() + dx;
          y1 = next() + dy;
        } else {
          x1 = ctrlX == null ? x : 2 * x - ctrlX;
          y1 = ctrlY == null ? y : 2 * y - ctrlY;
        }
        x = next() + dx;
        y = next() + dy;
        path.quadraticBezierTo(x1, y1, x, y);
        ctrlX = x1;
        ctrlY = y1;
        keepCtrl = true;
      case 'a':
        final rx = next(), ry = next(), rotation = next();
        final large = next() != 0, sweep = next() != 0;
        x = next() + dx;
        y = next() + dy;
        path.arcToPoint(
          Offset(x, y),
          radius: Radius.elliptical(rx, ry),
          rotation: rotation,
          largeArc: large,
          clockwise: sweep,
        );
      case 'z':
        path.close();
        x = startX;
        y = startY;
      default:
        i++;
    }
    if (!keepCtrl) ctrlX = ctrlY = null;
  }
  return path;
}

String _spreadArcFlags(String args) {
  final out = StringBuffer();
  var rest = args;
  while (true) {
    final m = _flagArgs.matchAsPrefix(rest.trimLeft());
    if (m == null) break;
    out.write(' ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ');
    rest = rest.trimLeft().substring(m.end);
    // The end point: two more numbers.
    final end = RegExp(
      r'[\s,]*(-?(?:\d*\.\d+|\d+\.?))[\s,]*(-?(?:\d*\.\d+|\d+\.?))[\s,]*',
    ).matchAsPrefix(rest);
    if (end == null) break;
    out.write('${end[1]} ${end[2]} ');
    rest = rest.substring(end.end);
  }
  out.write(rest);
  return out.toString();
}
