import 'package:material_ui/material_ui.dart';

/// The cloud that stands in for a number while there is nothing to show.
class CloudMascot extends StatelessWidget {
  final double size;
  const CloudMascot({super.key, this.size = 64});
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox.square(
      dimension: size,
      child: const CustomPaint(painter: _CloudPainter()),
    ),
  );
}

class _CloudPainter extends CustomPainter {
  const _CloudPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final u = size.width / 64;
    canvas.scale(u);
    final cloud = Path()
      ..addOval(Rect.fromCircle(center: const Offset(22, 36), radius: 14))
      ..addOval(Rect.fromCircle(center: const Offset(35, 27), radius: 17))
      ..addOval(Rect.fromCircle(center: const Offset(46, 38), radius: 12))
      ..addRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(8, 34, 50, 18),
          const Radius.circular(9),
        ),
      );
    canvas.drawPath(
      cloud,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xffe2e5ff), Color(0xffc4cafa), Color(0xff9ea6e8)],
        ).createShader(const Rect.fromLTWH(8, 10, 50, 42)),
    );
    final eye = Paint()..color = const Color(0xff23264d);
    for (final x in const [27.0, 39.0]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset(x, 38), width: 4, height: 7),
          const Radius.circular(2),
        ),
        eye,
      );
    }
  }

  @override
  bool shouldRepaint(_CloudPainter old) => false;
}
