import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';

/// Ring slider with a 320° sweep: drag or tap the ring to set the value.
class CometDial extends StatefulWidget {
  final String label, unit;
  final double value, min, max, step, size, thickness;
  final ValueChanged<double> onChanged;
  const CometDial({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.unit = '%',
    this.size = 196,
    this.thickness = 5,
  });
  static const sweep = 320.0, start = 110.0;
  @override
  State<CometDial> createState() => _CometDialState();
}

class _CometDialState extends State<CometDial>
    with SingleTickerProviderStateMixin {
  late final AnimationController _glide = AnimationController(
    vsync: this,
    duration: SomnaMotion.verySlow,
  )..addListener(() => setState(() {}));
  late double _from = _snap(widget.value), _to = _from;
  bool _dragging = false;
  bool? _high;

  double get _range => math.max(1e-9, widget.max - widget.min);
  double _snap(double v) => widget.step > 0
      ? (((v - widget.min) / widget.step).round() * widget.step + widget.min)
            .clamp(widget.min, widget.max)
      : v.clamp(widget.min, widget.max);
  double get _nudge => math.max(widget.step, 1);
  String _label(double v) =>
      v == v.roundToDouble() ? v.round().toString() : v.toString();
  double get _shown => _glide.isAnimating
      ? _from + (_to - _from) * SomnaMotion.smooth.transform(_glide.value)
      : _to;

  @override
  void didUpdateWidget(CometDial old) {
    super.didUpdateWidget(old);
    final next = _snap(widget.value);
    if (next == _to) return;
    if (_dragging || MediaQuery.disableAnimationsOf(context)) {
      _glide.stop();
      _from = _to = next;
    } else {
      _from = _shown;
      _to = next;
      _glide.forward(from: 0);
    }
  }

  void _commit(double value) {
    final next = _snap(value);
    if (next == _snap(widget.value)) return;
    widget.onChanged(next);
  }

  void _point(Offset local, {required bool begin}) {
    final center = Offset(widget.size / 2, widget.size / 2);
    final delta = local - center;
    if (begin && delta.distance < widget.size * .22) return;
    if (begin) {
      _dragging = true;
      _high = null;
      HapticFeedback.selectionClick();
    }
    if (!_dragging) return;
    var rel =
        (math.atan2(delta.dy, delta.dx) * 180 / math.pi - CometDial.start) %
        360;
    if (rel < 0) rel += 360;
    const sweep = CometDial.sweep, gap = 360 - sweep;
    if (rel > sweep) {
      rel = (_high ?? rel < sweep + gap / 2) ? sweep : 0;
    } else {
      _high = rel > sweep / 2;
    }
    _commit(widget.min + rel / sweep * _range);
  }

  void _release() {
    if (_dragging) setState(() => _dragging = false);
  }

  @override
  void dispose() {
    _glide.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), value = _snap(widget.value);
    final figure = (widget.size * .16).roundToDouble();
    final text = _label(value);
    return Semantics(
      container: true,
      slider: true,
      label: widget.label,
      value: '$text${widget.unit}',
      increasedValue: '${_label(_snap(value + _nudge))}${widget.unit}',
      decreasedValue: '${_label(_snap(value - _nudge))}${widget.unit}',
      onIncrease: () => _commit(value + _nudge),
      onDecrease: () => _commit(value - _nudge),
      excludeSemantics: true,
      child: FocusableActionDetector(
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.arrowRight): _Turn(1),
          SingleActivator(LogicalKeyboardKey.arrowUp): _Turn(1),
          SingleActivator(LogicalKeyboardKey.arrowLeft): _Turn(-1),
          SingleActivator(LogicalKeyboardKey.arrowDown): _Turn(-1),
        },
        actions: {
          _Turn: CallbackAction<_Turn>(
            onInvoke: (turn) => _commit(value + _nudge * turn.steps),
          ),
        },
        // Only the disc takes touches: its corners still scroll the sheet.
        child: ClipOval(
          clipBehavior: Clip.none,
          child: RawGestureDetector(
            // Claims the pointer so turning the ring never scrolls the sheet.
            gestures: {
              EagerGestureRecognizer:
                  GestureRecognizerFactoryWithHandlers<EagerGestureRecognizer>(
                    EagerGestureRecognizer.new,
                    (_) {},
                  ),
            },
            child: Listener(
              onPointerDown: (e) => _point(e.localPosition, begin: true),
              onPointerMove: (e) => _point(e.localPosition, begin: false),
              onPointerUp: (_) => _release(),
              onPointerCancel: (_) => _release(),
              child: SizedBox.square(
                dimension: widget.size,
                child: CustomPaint(
                  painter: _DialPainter(
                    fraction: (_shown - widget.min) / _range,
                    tail: _glide.isAnimating
                        ? math.sin(math.pi * _glide.value) *
                              ((_to - _from) / _range * CometDial.sweep).clamp(
                                -180.0,
                                180.0,
                              )
                        : 0,
                    thickness: widget.thickness,
                    ink: c.ink,
                    accent: c.accent,
                  ),
                  child: Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          text,
                          style: TextStyle(
                            fontSize: figure,
                            height: 1,
                            fontWeight: FontWeight.w500,
                            letterSpacing: -figure * .04,
                            color: c.ink,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        SizedBox(width: figure * .06),
                        Text(
                          widget.unit,
                          style: TextStyle(
                            fontSize: figure * .5,
                            height: 1,
                            fontWeight: FontWeight.w500,
                            color: c.ink.withValues(alpha: .5),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  final double fraction, tail, thickness;
  final Color ink, accent;
  const _DialPainter({
    required this.fraction,
    required this.tail,
    required this.thickness,
    required this.ink,
    required this.accent,
  });
  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 200;
    final bounds = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: 80 * k,
    );
    double rad(double deg) => deg * math.pi / 180;
    Paint stroke(Color color, [double width = 1]) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = thickness * width * k
      ..color = color;
    canvas.drawArc(
      bounds,
      rad(CometDial.start),
      rad(CometDial.sweep),
      false,
      stroke(ink.withValues(alpha: .24)),
    );
    final lit = CometDial.sweep * fraction.clamp(0.0, 1.0);
    if (lit > 0) {
      canvas.drawArc(
        bounds,
        rad(CometDial.start),
        rad(lit),
        false,
        stroke(accent.withValues(alpha: .7)),
      );
    }
    const pieces = 12;
    for (var i = 0; i < pieces && tail.abs() > 1; i++) {
      final near = 1 - i / pieces, piece = tail / pieces;
      final from = (lit - piece * (i + 1)).clamp(0.0, CometDial.sweep),
          to = (lit - piece * i).clamp(0.0, CometDial.sweep);
      if (from == to) continue;
      canvas.drawArc(
        bounds,
        rad(CometDial.start + from),
        rad(to - from),
        false,
        stroke(accent.withValues(alpha: near * near), 1 + near),
      );
    }
    final head = rad(CometDial.start + lit);
    canvas.drawCircle(
      bounds.center + Offset(math.cos(head), math.sin(head)) * bounds.width / 2,
      thickness * 1.8 * k,
      Paint()..color = accent,
    );
  }

  @override
  bool shouldRepaint(_DialPainter old) =>
      old.fraction != fraction ||
      old.tail != tail ||
      old.thickness != thickness ||
      old.ink != ink ||
      old.accent != accent;
}

class _Turn extends Intent {
  final int steps;
  const _Turn(this.steps);
}
