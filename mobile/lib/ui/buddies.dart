import 'dart:math' as math;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import 'ambient.dart';
import 'mascot.dart';

/// Somna's friends. The cloud is the lead; the moon looks after sleep, the
/// star after insights, the sprout after habits and the book after reading.
enum BuddyKind { cloud, moon, star, sprout, book }

/// An animated companion: bobs, blinks and, when [happy], bounces a little.
class Buddy extends StatefulWidget {
  final BuddyKind kind;
  final double size;
  final bool happy;
  const Buddy({
    super.key,
    this.kind = BuddyKind.cloud,
    this.size = 72,
    this.happy = false,
  });
  @override
  State<Buddy> createState() => _BuddyState();
}

class _BuddyState extends State<Buddy> with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(
    (e) => _t.value = e.inMicroseconds / 1e6,
  );
  final _t = ValueNotifier(0.0);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = !ambientMotion(context);
    if (still && _ticker.isActive) _ticker.stop();
    if (!still && !_ticker.isActive && widget.kind != BuddyKind.cloud) {
      _ticker.start();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.kind == BuddyKind.cloud) {
      final avatar = CloudAvatar(
        size: widget.size,
        state: widget.happy ? MascotState.working : MascotState.idle,
      );
      return ambientMotion(context)
          ? avatar
          : MediaQuery(
              data: MediaQuery.of(context).copyWith(disableAnimations: true),
              child: avatar,
            );
    }
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: widget.size,
        child: CustomPaint(
          painter: _BuddyPainter(widget.kind, _t, widget.happy),
        ),
      ),
    );
  }
}

class _BuddyPainter extends CustomPainter {
  final BuddyKind kind;
  final ValueNotifier<double> t;
  final bool happy;
  _BuddyPainter(this.kind, this.t, this.happy) : super(repaint: t);

  static const _ink = Color(0xff1e1a33);

  @override
  void paint(Canvas canvas, Size size) {
    final s = t.value;
    final u = size.width / 100;
    canvas.scale(u);
    final bob = math.sin(s * (happy ? 6 : 2)) * (happy ? 4 : 2.2);
    final tilt = math.sin(s * 1.3) * .05;
    canvas.translate(50, 52 + bob);
    canvas.rotate(tilt);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(0, 40 - bob), width: 46 - bob, height: 7),
      Paint()
        ..color = Colors.black.withValues(alpha: .18)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );
    switch (kind) {
      case BuddyKind.moon:
        _moon(canvas, s);
      case BuddyKind.star:
        _star(canvas, s);
      case BuddyKind.sprout:
        _sprout(canvas, s);
      case BuddyKind.book:
        _book(canvas, s);
      case BuddyKind.cloud:
        break;
    }
  }

  double _blink(double s) {
    final phase = s % 3.6;
    return phase < .14 ? .15 : 1;
  }

  void _face(Canvas canvas, Offset c, double s, {double spread = 10}) {
    final open = _blink(s);
    final eye = Paint()..color = _ink;
    for (final d in [-1.0, 1.0]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: c + Offset(d * spread, 0),
            width: 5,
            height: 8 * open,
          ),
          const Radius.circular(3),
        ),
        eye,
      );
      canvas.drawOval(
        Rect.fromCenter(
          center: c + Offset(d * (spread + 6), 7),
          width: 8,
          height: 4,
        ),
        Paint()..color = const Color(0x66ff6fa3),
      );
    }
    final smile = Path()
      ..moveTo(c.dx - 5, c.dy + 7)
      ..quadraticBezierTo(c.dx, c.dy + (happy ? 14 : 11), c.dx + 5, c.dy + 7);
    canvas.drawPath(
      smile,
      Paint()
        ..color = _ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.6
        ..strokeCap = StrokeCap.round,
    );
  }

  void _moon(Canvas canvas, double s) {
    final body = Path()
      ..addOval(Rect.fromCircle(center: Offset.zero, radius: 32));
    final bite = Path()
      ..addOval(Rect.fromCircle(center: const Offset(-20, -16), radius: 24));
    final shape = Path.combine(PathOperation.difference, body, bite);
    canvas.drawPath(
      shape,
      Paint()
        ..shader = const RadialGradient(
          center: Alignment(.3, .2),
          colors: [Color(0xfffff6c9), Color(0xffffd36b), Color(0xfff0a43a)],
        ).createShader(Rect.fromCircle(center: Offset.zero, radius: 34)),
    );
    final cap = Path()
      ..moveTo(4, -30)
      ..quadraticBezierTo(20, -48, 40, -40)
      ..quadraticBezierTo(30, -30, 26, -20)
      ..close();
    canvas.drawPath(cap, Paint()..color = const Color(0xff6b5db4));
    canvas.drawCircle(
      Offset(40 + math.sin(s * 2) * 1.5, -41),
      5,
      Paint()..color = Colors.white,
    );
    _sleepyFace(canvas, const Offset(12, 6), s);
    for (var i = 0; i < 3; i++) {
      final p = (s * .4 + i / 3) % 1;
      final tp = TextPainter(
        text: TextSpan(
          text: 'z',
          style: TextStyle(
            fontSize: 9 + 5 * p,
            fontWeight: FontWeight.w600,
            color: Colors.white.withValues(alpha: (1 - p) * .8),
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(-30 - p * 8, -24 - p * 26));
    }
  }

  void _sleepyFace(Canvas canvas, Offset c, double s) {
    final line = Paint()
      ..color = _ink
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round;
    for (final d in [-1.0, 1.0]) {
      final e = c + Offset(d * 8, 0);
      canvas.drawArc(
        Rect.fromCenter(center: e, width: 9, height: 6),
        0,
        math.pi,
        false,
        line,
      );
    }
    canvas.drawCircle(c + const Offset(0, 10), 2.4, Paint()..color = _ink);
  }

  void _star(Canvas canvas, double s) {
    final glow = .6 + .4 * math.sin(s * 3);
    canvas.drawCircle(
      Offset.zero,
      40,
      Paint()
        ..color = const Color(0xffffe066).withValues(alpha: .25 * glow)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
    );
    final star = Path();
    for (var i = 0; i < 10; i++) {
      final r = i.isEven ? 36.0 : 18.0;
      final a = -math.pi / 2 + i * math.pi / 5;
      final p = Offset(math.cos(a) * r, math.sin(a) * r);
      i == 0 ? star.moveTo(p.dx, p.dy) : star.lineTo(p.dx, p.dy);
    }
    star.close();
    canvas.drawPath(
      star,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xfffff3b0), Color(0xffffc233)],
        ).createShader(Rect.fromCircle(center: Offset.zero, radius: 36))
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(
      star,
      Paint()
        ..color = const Color(0xffffc233)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..strokeJoin = StrokeJoin.round,
    );
    _face(canvas, const Offset(0, 2), s, spread: 7);
  }

  void _sprout(Canvas canvas, double s) {
    final sway = math.sin(s * 1.6) * .12;
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        const Rect.fromLTRB(-26, 4, 26, 38),
        bottomLeft: const Radius.circular(12),
        bottomRight: const Radius.circular(12),
        topLeft: const Radius.circular(6),
        topRight: const Radius.circular(6),
      ),
      Paint()..color = const Color(0xffe2994f),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTRB(-30, -2, 30, 10),
        const Radius.circular(6),
      ),
      Paint()..color = const Color(0xffcc7f3a),
    );
    canvas.save();
    canvas.translate(0, -2);
    canvas.rotate(sway);
    final stem = Paint()
      ..color = const Color(0xff2f8a2a)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset.zero, const Offset(0, -24), stem);
    final leaf = Paint()..color = const Color(0xff7fd16b);
    canvas.save();
    canvas.translate(0, -22);
    canvas.rotate(-.6);
    canvas.drawOval(const Rect.fromLTWH(-24, -8, 24, 14), leaf);
    canvas.restore();
    canvas.save();
    canvas.translate(0, -26);
    canvas.rotate(.5);
    canvas.drawOval(const Rect.fromLTWH(0, -10, 26, 15), leaf);
    canvas.restore();
    canvas.restore();
    _face(canvas, const Offset(0, 18), s, spread: 9);
  }

  void _book(Canvas canvas, double s) {
    final flap = math.sin(s * 2.2) * .08;
    for (final d in [-1.0, 1.0]) {
      canvas.save();
      canvas.rotate(d * flap);
      final page = RRect.fromRectAndRadius(
        Rect.fromLTWH(d < 0 ? -34 : 0, -26, 34, 52),
        const Radius.circular(8),
      );
      canvas.drawRRect(
        page,
        Paint()
          ..color = d < 0 ? const Color(0xff8f7bff) : const Color(0xffb6a8ff),
      );
      canvas.drawRRect(
        page.deflate(5),
        Paint()..color = const Color(0xfff7f6fa),
      );
      canvas.restore();
    }
    canvas.drawLine(
      const Offset(0, -24),
      const Offset(0, 24),
      Paint()
        ..color = const Color(0xff6b5db4)
        ..strokeWidth = 2,
    );
    _face(canvas, const Offset(0, 0), s, spread: 14);
  }

  @override
  bool shouldRepaint(_BuddyPainter old) =>
      old.kind != kind || old.happy != happy;
}

/// A companion with a speech bubble. The text types itself in once.
class BuddyTip extends StatefulWidget {
  final BuddyKind kind;
  final String text;
  final double size;
  const BuddyTip({
    super.key,
    required this.text,
    this.kind = BuddyKind.cloud,
    this.size = 56,
  });
  @override
  State<BuddyTip> createState() => _BuddyTipState();
}

class _BuddyTipState extends State<BuddyTip>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: 18 * widget.text.length + 200),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else if (!_c.isAnimating && _c.value == 0) {
      _c.forward();
    }
  }

  @override
  void didUpdateWidget(BuddyTip old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text) {
      _c.duration = Duration(milliseconds: 18 * widget.text.length + 200);
      MediaQuery.disableAnimationsOf(context)
          ? _c.value = 1
          : _c.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Semantics(
      label: widget.text,
      excludeSemantics: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Buddy(kind: widget.kind, size: widget.size),
          const SizedBox(width: 8),
          Expanded(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: c.glass,
                border: Border.all(color: c.hair),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                  bottomLeft: Radius.circular(6),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                child: AnimatedBuilder(
                  animation: _c,
                  builder: (context, _) {
                    final n = (widget.text.length * _c.value).round();
                    return Stack(
                      children: [
                        Text(
                          widget.text,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.45,
                            color: Colors.transparent,
                          ),
                        ),
                        Text(
                          widget.text.substring(0, n),
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.45,
                            color: c.ink2,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
