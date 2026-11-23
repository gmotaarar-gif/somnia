import 'dart:math' as math;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import '../logic/valence.dart';
import 'ambient.dart';
import 'feedback.dart';

Color _rgb(RGB c, [double a = 1]) =>
    Color.fromARGB((a * 255).round(), c[0], c[1], c[2]);

/// The mood orb: a soft living blob with a face. It breathes, blinks, looks
/// at the finger, smiles or frowns with [valence], and wobbles more when the
/// mood is far from neutral. With [onChanged] it can be dragged up (better)
/// and down (worse) directly; a tap gives it a little boop.
class MoodOrb extends StatefulWidget {
  final double valence, size;
  final ValueChanged<double>? onChanged;
  final bool face;
  const MoodOrb({
    super.key,
    this.valence = 0,
    this.size = 160,
    this.onChanged,
    this.face = true,
  });
  @override
  State<MoodOrb> createState() => _MoodOrbState();
}

class OrbPose {
  double t = 0, valence = 0, squash = 0, boop = 0, blink = 0;
  Offset look = Offset.zero;
}

class _MoodOrbState extends State<MoodOrb> with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  final _pose = OrbPose();
  final _repaint = ValueNotifier(0);
  Duration _last = Duration.zero;
  double _nextBlink = 2.4, _dragStart = 0, _dragValence = 0;
  Offset _lookTarget = Offset.zero;
  bool _pressed = false;
  int _lastStep = 0;

  @override
  void initState() {
    super.initState();
    _pose.valence = widget.valence;
    _lastStep = (widget.valence * 10).round();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = !ambientMotion(context);
    if (still && _ticker.isActive) _ticker.stop();
    if (!still && !_ticker.isActive) _ticker.start();
    if (still) {
      _pose.valence = widget.valence;
      _repaint.value++;
    }
  }

  @override
  void didUpdateWidget(MoodOrb old) {
    super.didUpdateWidget(old);
    if (!_ticker.isActive) {
      _pose.valence = widget.valence;
      _repaint.value++;
    }
  }

  void _tick(Duration elapsed) {
    final dt = ((elapsed - _last).inMicroseconds / 1e6).clamp(0.0, .05);
    _last = elapsed;
    final p = _pose..t += dt;
    double toward(double from, double to, double rate) =>
        from + (to - from) * (1 - math.exp(-rate * dt));
    p.valence = toward(p.valence, widget.valence, 9);
    p.squash = toward(p.squash, _pressed ? 1 : 0, _pressed ? 18 : 7);
    p.boop = toward(p.boop, 0, 4);
    p.look = Offset.lerp(p.look, _lookTarget, 1 - math.exp(-6 * dt))!;
    if (!_pressed) _lookTarget = Offset.lerp(_lookTarget, Offset.zero, dt)!;
    _nextBlink -= dt;
    if (_nextBlink <= 0) {
      p.blink += dt / .16;
      if (p.blink >= 1) {
        p.blink = 0;
        _nextBlink = 2.2 + math.Random().nextDouble() * 3.4;
      }
    }
    _repaint.value++;
  }

  void _lookAt(Offset local) {
    final c = Offset(widget.size / 2, widget.size / 2);
    final d = (local - c) / (widget.size / 2);
    _lookTarget = d.distance > 1 ? d / d.distance : d;
  }

  void _setValence(double v) {
    final next = v.clamp(-1.0, 1.0);
    final step = (next * 10).round();
    if (step != _lastStep) {
      _lastStep = step;
      Feel.tick();
    }
    widget.onChanged?.call(next);
  }

  @override
  void dispose() {
    _ticker.dispose();
    _repaint.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final interactive = widget.onChanged != null;
    final paint = SizedBox.square(
      dimension: widget.size,
      child: CustomPaint(painter: _OrbPainter(_pose, _repaint, widget.face)),
    );
    return Semantics(
      label: interactive ? 'Настроение' : getValenceLabel(widget.valence),
      image: !interactive,
      slider: interactive,
      value: interactive ? getValenceLabel(widget.valence) : null,
      increasedValue: interactive
          ? getValenceLabel((widget.valence + .1).clamp(-1.0, 1.0))
          : null,
      decreasedValue: interactive
          ? getValenceLabel((widget.valence - .1).clamp(-1.0, 1.0))
          : null,
      onIncrease: interactive ? () => _setValence(widget.valence + .1) : null,
      onDecrease: interactive ? () => _setValence(widget.valence - .1) : null,
      child: Listener(
        onPointerDown: (e) {
          _pressed = true;
          _lookAt(e.localPosition);
        },
        onPointerMove: (e) => _lookAt(e.localPosition),
        onPointerUp: (_) => _pressed = false,
        onPointerCancel: (_) => _pressed = false,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            _pose.boop = 1;
            Feel.tap();
          },
          onVerticalDragStart: interactive
              ? (d) {
                  _dragStart = d.localPosition.dy;
                  _dragValence = widget.valence;
                }
              : null,
          onVerticalDragUpdate: interactive
              ? (d) => _setValence(
                  _dragValence -
                      (d.localPosition.dy - _dragStart) / (widget.size * .9),
                )
              : null,
          child: paint,
        ),
      ),
    );
  }
}

class _OrbPainter extends CustomPainter {
  final OrbPose p;
  final bool face;
  _OrbPainter(this.p, Listenable repaint, this.face) : super(repaint: repaint);

  @override
  void paint(Canvas canvas, Size size) {
    final pal = sampleValencePalette(p.valence);
    final c = size.center(Offset.zero);
    final base = size.shortestSide * .38;
    final energy = p.valence.abs();
    final breathe = 1 + .03 * math.sin(p.t * 1.7);
    final sx =
        breathe *
        (1 + .06 * p.squash) *
        (1 + .05 * p.boop * math.sin(p.t * 22));
    final sy =
        breathe *
        (1 - .08 * p.squash) *
        (1 - .05 * p.boop * math.sin(p.t * 22));
    final wobble = .02 + .035 * energy + .05 * p.boop;
    final speed = .9 + 1.6 * energy;

    final blob = Path();
    const n = 72;
    for (var i = 0; i <= n; i++) {
      final a = i / n * math.pi * 2;
      final r =
          base *
          (1 +
              wobble * math.sin(3 * a + p.t * speed) +
              wobble * .6 * math.sin(5 * a - p.t * speed * 1.3) +
              (p.valence < 0 ? .015 * energy * math.sin(9 * a + p.t * 4) : 0));
      final pt = c + Offset(math.cos(a) * r * sx, math.sin(a) * r * sy);
      i == 0 ? blob.moveTo(pt.dx, pt.dy) : blob.lineTo(pt.dx, pt.dy);
    }
    blob.close();

    canvas.drawCircle(
      c,
      base * 1.35,
      Paint()
        ..color = _rgb(pal.outer, .32)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, base * .45),
    );

    final bounds = Rect.fromCircle(center: c, radius: base * 1.1);
    canvas.drawPath(
      blob,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-.25, -.35),
          radius: .9,
          colors: [_rgb(pal.core), _rgb(pal.mid), _rgb(pal.outer)],
          stops: const [0, .45, 1],
        ).createShader(bounds),
    );
    canvas.save();
    canvas.clipPath(blob);
    canvas.drawCircle(
      c + Offset(base * .5, base * .65),
      base * .7,
      Paint()
        ..color = _rgb(pal.outer, .55)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, base * .3),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: c + Offset(-base * .32, -base * .5),
        width: base * .7,
        height: base * .34,
      ),
      Paint()
        ..color = Colors.white.withValues(alpha: .55)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, base * .08),
    );
    canvas.restore();

    if (!face) return;
    final ink = Color.lerp(_rgb(pal.outer), Colors.black, .72)!;
    final look = p.look * base * .08;
    final eyeY = c.dy - base * .08 + look.dy;
    final eyeDx = base * .3;
    final open = 1 - math.sin(p.blink.clamp(0.0, 1.0) * math.pi);
    final eyeH = base * .2 * (.12 + .88 * open) * (p.squash > .5 ? .5 : 1);
    for (final dir in [-1.0, 1.0]) {
      final ec = Offset(c.dx + dir * eyeDx + look.dx, eyeY);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: ec, width: base * .13, height: eyeH),
          Radius.circular(base * .07),
        ),
        Paint()..color = ink,
      );
      if (open > .6) {
        canvas.drawCircle(
          ec + Offset(base * .025, -eyeH * .22),
          base * .022,
          Paint()..color = Colors.white.withValues(alpha: .9),
        );
      }
      if (p.valence > .25) {
        canvas.drawOval(
          Rect.fromCenter(
            center: ec + Offset(dir * base * .12, base * .2),
            width: base * .2,
            height: base * .1,
          ),
          Paint()
            ..color = const Color(
              0xffff6fa3,
            ).withValues(alpha: (.45 * (p.valence - .25) / .75).clamp(0.0, .45))
            ..maskFilter = MaskFilter.blur(BlurStyle.normal, base * .03),
        );
      }
    }

    final mouthY = c.dy + base * .2 + look.dy * .6;
    final mw = base * (.22 + .08 * energy);
    final curve = base * .2 * p.valence;
    final mouth = Path()
      ..moveTo(c.dx - mw + look.dx, mouthY)
      ..quadraticBezierTo(
        c.dx + look.dx,
        mouthY + curve + (p.boop * base * .06),
        c.dx + mw + look.dx,
        mouthY,
      );
    canvas.drawPath(
      mouth,
      Paint()
        ..color = ink
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = base * .065,
    );
  }

  @override
  bool shouldRepaint(_OrbPainter old) => old.face != face;
}
