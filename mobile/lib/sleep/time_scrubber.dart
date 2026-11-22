import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';

const _px = 2.0, _half = (300 - 36) / 2, _day = 1440;

double _wrap(double m) => ((m % _day) + _day) % _day;
int _toMin(String v) {
  final parts = v.split(':');
  return (int.tryParse(parts[0]) ?? 0) * 60 +
      (parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0);
}

String _toStr(double m) {
  final t = _wrap(m.roundToDouble()).toInt() % _day;
  return '${(t ~/ 60).toString().padLeft(2, '0')}:${(t % 60).toString().padLeft(2, '0')}';
}

/// A time over a ruler: drag the ruler under the centre mark, fling it and it
/// coasts, then settles on the nearest step. Port of the web `TimeScrubber`.
class TimeScrubber extends StatefulWidget {
  final String label, value;
  final ValueChanged<String> onChanged;
  final int step;

  /// Inside the night card the ruler has no surface of its own.
  final bool bare;
  const TimeScrubber({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.step = 5,
    this.bare = false,
  });
  @override
  State<TimeScrubber> createState() => _TimeScrubberState();
}

class _TimeScrubberState extends State<TimeScrubber>
    with SingleTickerProviderStateMixin {
  late double _x = _toMin(widget.value).toDouble(), _to = _x;
  double _v = 0;
  late String _reported = widget.value;
  bool _following = false;
  late final Ticker _ticker = createTicker(_tick);
  Duration? _last;

  bool get _still => MediaQuery.disableAnimationsOf(context);

  void _hear(double x) {
    if (_following) return;
    final next = _toStr((x / widget.step).roundToDouble() * widget.step);
    if (next == _reported) return;
    _reported = next;
    widget.onChanged(next);
  }

  void _set(double x) {
    _hear(x);
    setState(() => _x = x);
  }

  void _tick(Duration elapsed) {
    final dt = _last == null
        ? 1.0
        : ((elapsed - _last!).inMicroseconds / 16670).clamp(0.0, 2.5);
    _last = elapsed;
    _v += ((_to - _x) * .022 - _v * .26) * dt;
    final x = _x + _v * dt;
    if ((_to - x).abs() < .01 && _v.abs() < .01) {
      _v = 0;
      _halt();
      _set(_to);
      return;
    }
    _set(x);
  }

  void _halt() {
    _ticker.stop();
    _last = null;
  }

  void _goTo(double to, [double? v]) {
    _to = to;
    _v = v ?? _v;
    if (_still) {
      _v = 0;
      _halt();
      _set(to);
      return;
    }
    if (!_ticker.isActive) _ticker.start();
  }

  @override
  void didUpdateWidget(TimeScrubber old) {
    super.didUpdateWidget(old);
    if (widget.value == _reported) return;
    // A time set from outside turns the ruler the short way round to it.
    _reported = widget.value;
    _following = true;
    final d =
        ((_toMin(widget.value) - _wrap(_to) + _day * 1.5) % _day) - _day / 2;
    _goTo(_to + d, 0);
  }

  void _nudge(int direction) {
    _following = false;
    final s = widget.step;
    _goTo((_to / s).roundToDouble() * s + direction * s, 0);
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), time = _toStr(_x);
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                widget.label,
                style: TextStyle(
                  fontSize: widget.bare ? 13 : 12,
                  color: widget.bare
                      ? const Color.fromRGBO(255, 255, 255, .72)
                      : c.ink3,
                ),
              ),
            ),
            ExcludeSemantics(
              child: Text(
                time,
                style: TextStyle(
                  fontSize: 26,
                  height: 1,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -.78,
                  color: c.ink,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Semantics(
          slider: true,
          label: widget.label,
          value: time,
          increasedValue: _toStr(_x + widget.step),
          decreasedValue: _toStr(_x - widget.step),
          onIncrease: () => _nudge(1),
          onDecrease: () => _nudge(-1),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onHorizontalDragDown: (_) {
              _halt();
              _following = false;
              _v = 0;
            },
            // Left is later: the ruler moves under a fixed mark.
            onHorizontalDragUpdate: (d) => _set(_x - d.delta.dx / _px),
            onHorizontalDragEnd: (d) {
              final v = (-d.velocity.pixelsPerSecond.dx / _px / 60).clamp(
                -14.0,
                14.0,
              );
              final s = widget.step;
              _goTo(((_x + v * 21) / s).roundToDouble() * s, v * .6);
            },
            onHorizontalDragCancel: () {
              final s = widget.step;
              _goTo((_x / s).roundToDouble() * s, 0);
            },
            child: SizedBox(
              height: 58,
              child: ShaderMask(
                blendMode: BlendMode.dstIn,
                shaderCallback: (rect) => const LinearGradient(
                  colors: [
                    Colors.transparent,
                    Colors.black,
                    Colors.black,
                    Colors.transparent,
                  ],
                  stops: [0, .22, .78, 1],
                ).createShader(rect),
                child: CustomPaint(
                  painter: _RulerPainter(_x, c.ink, c.ink3),
                  size: Size.infinite,
                ),
              ),
            ),
          ),
        ),
      ],
    );
    if (widget.bare) {
      return Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 6),
        child: content,
      );
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.glass,
        borderRadius: BorderRadius.circular(22),
        border: Border(top: BorderSide(color: c.glassEdge)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
        child: content,
      ),
    );
  }
}

class _RulerPainter extends CustomPainter {
  final double pos;
  final Color ink, dim;
  const _RulerPainter(this.pos, this.ink, this.dim);
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2, span = size.width / 2 / _px + 10;
    for (var m = ((pos - span) / 5).ceil() * 5; m <= pos + span; m += 5) {
      final x = (m - pos) * _px;
      final f = (1 - (x.abs() / _half) * (x.abs() / _half)).clamp(0.0, 1.0);
      final w = _wrap(m.toDouble()).toInt();
      final hour = w % 60 == 0;
      final height =
          (hour
              ? 25.0
              : w % 15 == 0
              ? 17.0
              : 10.0) *
          (.55 + .45 * f);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(cx + x - 1, 8, 2, height),
          const Radius.circular(1),
        ),
        Paint()..color = ink.withValues(alpha: ink.a * (.18 + .82 * f)),
      );
      if (hour) {
        final painter = TextPainter(
          text: TextSpan(
            text: (w ~/ 60).toString().padLeft(2, '0'),
            style: TextStyle(
              fontFamily: 'Onest',
              fontSize: 11,
              color: dim.withValues(alpha: dim.a * (.15 + .85 * f)),
            ),
          ),
          textDirection: ui.TextDirection.ltr,
        )..layout();
        painter.paint(canvas, Offset(cx + x - painter.width / 2, 38));
      }
    }
    final mark = RRect.fromRectAndRadius(
      Rect.fromLTWH(cx - 1.5, 2, 3, 32),
      const Radius.circular(2),
    );
    canvas.drawRRect(
      mark.inflate(1),
      Paint()..color = const Color.fromRGBO(0, 0, 0, .25),
    );
    canvas.drawRRect(mark, Paint()..color = SomnaColors.lime);
  }

  @override
  bool shouldRepaint(_RulerPainter old) =>
      old.pos != pos || old.ink != ink || old.dim != dim;
}
