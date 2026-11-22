import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

/// Text colour on an ink-filled surface (web `text-black` on `bg-white`).
Color onInk(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? Colors.black
    : Colors.white;

const _edgeFade = [
  Color(0x00000000),
  Colors.black,
  Colors.black,
  Color(0x00000000),
];

Widget _fadeEdges(Widget child, double inset) => ShaderMask(
  blendMode: BlendMode.dstIn,
  shaderCallback: (rect) => LinearGradient(
    colors: _edgeFade,
    stops: [0, inset, 1 - inset, 1],
  ).createShader(rect),
  child: child,
);

class SomnaButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool ghost;
  final double height;
  const SomnaButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.ghost = false,
    this.height = 48,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final fg = ghost ? c.ink2 : onInk(context);
    return Opacity(
      opacity: onPressed == null ? .4 : 1,
      child: PressScale(
        onPressed: onPressed,
        child: Container(
          height: height,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          decoration: ghost
              ? null
              : BoxDecoration(
                  color: c.ink,
                  borderRadius: BorderRadius.circular(height / 2),
                  boxShadow: const [
                    BoxShadow(
                      color: Color.fromRGBO(0, 0, 0, .7),
                      blurRadius: 36,
                      spreadRadius: -18,
                      offset: Offset(0, 14),
                    ),
                  ],
                ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: fg,
                    fontSize: height >= 56 ? 16 : 15,
                    fontWeight: FontWeight.w500,
                    letterSpacing: -.15,
                  ),
                ),
              ),
              if (icon != null) ...[
                const SizedBox(width: 8),
                Icon(icon, size: 18, color: fg),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class SomnaToggle extends StatelessWidget {
  final bool checked;
  final ValueChanged<bool> onChanged;
  final String label;
  const SomnaToggle({
    super.key,
    required this.checked,
    required this.onChanged,
    required this.label,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : SomnaMotion.fast;
    return Semantics(
      container: true,
      toggled: checked,
      label: label,
      onTap: () => onChanged(!checked),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        excludeFromSemantics: true,
        onTap: () => onChanged(!checked),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 9),
          child: AnimatedContainer(
            duration: duration,
            width: 52,
            height: 30,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: checked ? c.ink : c.ink.withValues(alpha: .16),
              borderRadius: BorderRadius.circular(15),
            ),
            child: AnimatedAlign(
              duration: duration,
              curve: SomnaMotion.smooth,
              alignment: checked ? Alignment.centerRight : Alignment.centerLeft,
              child: AnimatedContainer(
                duration: duration,
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: checked ? onInk(context) : c.ink,
                  shape: BoxShape.circle,
                  boxShadow: const [
                    BoxShadow(
                      color: Color.fromRGBO(0, 0, 0, .4),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class SomnaSegmented<T> extends StatelessWidget {
  final List<(T, String)> options;
  final T value;
  final ValueChanged<T> onChanged;
  final String label;
  const SomnaSegmented({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.label = 'Выбор варианта',
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final index = options.indexWhere((o) => o.$1 == value);
    final n = options.length;
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : SomnaMotion.medium;
    return Semantics(
      container: true,
      label: label,
      child: GlassSurface(
        radius: 22,
        padding: const EdgeInsets.all(4),
        child: SizedBox(
          height: 36,
          child: Stack(
            children: [
              if (index >= 0)
                AnimatedAlign(
                  duration: duration,
                  curve: SomnaMotion.smooth,
                  alignment: Alignment(n < 2 ? 0 : -1 + 2 * index / (n - 1), 0),
                  child: FractionallySizedBox(
                    widthFactor: 1 / n,
                    heightFactor: 1,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: c.ink,
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                  ),
                ),
              Row(
                children: [
                  for (final (i, o) in options.indexed)
                    Expanded(
                      child: PressScale(
                        label: o.$2,
                        selected: i == index,
                        onPressed: () {
                          if (i != index) onChanged(o.$1);
                        },
                        child: Center(
                          child: AnimatedDefaultTextStyle(
                            duration: duration,
                            style: TextStyle(
                              fontFamily: 'Onest',
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: i == index ? onInk(context) : c.ink2,
                            ),
                            child: Text(o.$2, maxLines: 1),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SomnaSlider extends StatelessWidget {
  final double value, min, max, step;
  final ValueChanged<double> onChanged;
  final String label;
  final String Function(double)? format;
  final Gradient? track;
  const SomnaSlider({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.format,
    this.track,
  });
  double _snap(double v) => double.parse(
    ((v / step).round() * step).clamp(min, max).toStringAsFixed(6),
  );
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final pct = ((value - min) / (max - min)).clamp(0.0, 1.0);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        String say(double v) => format?.call(v) ?? v.toString();
        void pick(double dx) {
          final next = _snap(
            min + ((dx - 14) / (width - 28)).clamp(0.0, 1.0) * (max - min),
          );
          if (next != value) onChanged(next);
        }

        return Semantics(
          container: true,
          slider: true,
          label: label,
          value: say(value),
          increasedValue: say(_snap(value + step * 5)),
          decreasedValue: say(_snap(value - step * 5)),
          onIncrease: () => onChanged(_snap(value + step * 5)),
          onDecrease: () => onChanged(_snap(value - step * 5)),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            excludeFromSemantics: true,
            onTapDown: (d) => pick(d.localPosition.dx),
            onHorizontalDragStart: (d) => pick(d.localPosition.dx),
            onHorizontalDragUpdate: (d) => pick(d.localPosition.dx),
            child: SizedBox(
              height: 44,
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  Container(
                    height: 14,
                    width: double.infinity,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: c.ink.withValues(alpha: .12),
                      gradient: track,
                      borderRadius: BorderRadius.circular(7),
                    ),
                    alignment: Alignment.centerLeft,
                    child: track != null
                        ? null
                        : FractionallySizedBox(
                            widthFactor: pct,
                            heightFactor: 1,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: c.ink.withValues(alpha: .85),
                                borderRadius: BorderRadius.circular(7),
                              ),
                            ),
                          ),
                  ),
                  Positioned(
                    left: (width - 28) * pct,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color.fromRGBO(0, 0, 0, .12),
                        ),
                        boxShadow: const [
                          BoxShadow(
                            color: Color.fromRGBO(0, 0, 0, .5),
                            blurRadius: 14,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Counts up to [value] on mount and whenever it changes.
class DotsCount extends StatelessWidget {
  final double value, size;
  final String Function(double) format;
  final bool square;
  const DotsCount({
    super.key,
    required this.value,
    required this.format,
    this.size = 48,
    this.square = false,
  });
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: value),
    duration: MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 900),
    curve: Curves.easeOutQuart,
    builder: (context, shown, _) =>
        Dots(value: format(shown), size: size, square: square),
  );
}

/// Words that come into focus one by one (web `BlurText`).
class BlurWords extends StatefulWidget {
  final String text;
  final TextStyle style;
  final Duration startDelay, stagger;
  final double distance;
  const BlurWords({
    super.key,
    required this.text,
    required this.style,
    this.startDelay = Duration.zero,
    this.stagger = const Duration(milliseconds: 90),
    this.distance = 0,
  });
  @override
  State<BlurWords> createState() => _BlurWordsState();
}

class _BlurWordsState extends State<BlurWords>
    with SingleTickerProviderStateMixin {
  static const _word = Duration(milliseconds: 700);
  late final List<String> _words = widget.text.split(' ');
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.startDelay + widget.stagger * (_words.length - 1) + _word,
  );
  bool _started = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = _c.duration!.inMicroseconds;
    return Semantics(
      header: true,
      label: widget.text,
      excludeSemantics: true,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => Wrap(
          alignment: WrapAlignment.center,
          spacing: (widget.style.fontSize ?? 16) * .24,
          children: [
            for (final (i, word) in _words.indexed)
              () {
                final begin =
                    (widget.startDelay + widget.stagger * i).inMicroseconds /
                    total;
                final t = Curves.easeOutCubic.transform(
                  ((_c.value - begin) / (_word.inMicroseconds / total)).clamp(
                    0.0,
                    1.0,
                  ),
                );
                return Opacity(
                  opacity: t,
                  child: Transform.translate(
                    offset: Offset(0, -widget.distance * (1 - t)),
                    child: ImageFiltered(
                      enabled: t < 1,
                      imageFilter: ui.ImageFilter.blur(
                        sigmaX: 10 * (1 - t),
                        sigmaY: 10 * (1 - t),
                        tileMode: TileMode.decal,
                      ),
                      child: Text(word, style: widget.style),
                    ),
                  ),
                );
              }(),
          ],
        ),
      ),
    );
  }
}

/// A strip of values under a fixed pill: the value under it is magnified.
class LensRuler extends StatefulWidget {
  final double value, min, max, step;
  final ValueChanged<double> onChanged;
  final String label;
  final String Function(double) format;
  const LensRuler({
    super.key,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    required this.label,
    required this.format,
    this.step = 1,
  });
  @override
  State<LensRuler> createState() => _LensRulerState();
}

class _LensRulerState extends State<LensRuler>
    with SingleTickerProviderStateMixin {
  static const _dragPx = 52.0, _reach = 5;
  late final AnimationController _pos;
  late int _reported;
  bool _following = false;

  int get _last => ((widget.max - widget.min) / widget.step).round();
  int _toIndex(double v) =>
      ((v - widget.min) / widget.step).round().clamp(0, _last);
  double _toValue(int i) =>
      double.parse((widget.min + i * widget.step).toStringAsFixed(6));
  static double _mapX(double d) =>
      d.sign * (40 * d.abs() + 26 * (1 - math.exp(-d.abs() * 1.25)));
  static double _mapS(double d) => 1 + .7 * math.exp(-d * d / .42);

  @override
  void initState() {
    super.initState();
    _reported = _toIndex(widget.value);
    _pos = AnimationController.unbounded(
      vsync: this,
      value: _reported.toDouble(),
    )..addListener(_hear);
  }

  @override
  void didUpdateWidget(LensRuler old) {
    super.didUpdateWidget(old);
    final i = _toIndex(widget.value);
    if (i == _reported) return;
    _reported = i;
    _following = true;
    _go(i);
  }

  @override
  void dispose() {
    _pos.dispose();
    super.dispose();
  }

  void _hear() {
    setState(() {});
    if (_following) return;
    final i = _pos.value.round().clamp(0, _last);
    if (i == _reported) return;
    _reported = i;
    widget.onChanged(_toValue(i));
  }

  void _go(int index) {
    final to = index.clamp(0, _last).toDouble();
    if (MediaQuery.disableAnimationsOf(context)) {
      _pos.value = to;
      return;
    }
    _pos.animateTo(to, duration: SomnaMotion.medium, curve: SomnaMotion.smooth);
  }

  void _step(int delta) {
    _following = false;
    _go(_reported + delta);
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final pos = _pos.value;
    final from = math.max(0, (pos - _reach).floor());
    final to = math.min(_last, (pos + _reach).ceil());
    final shown = pos.round().clamp(0, _last);
    return Semantics(
      container: true,
      slider: true,
      label: widget.label,
      value: widget.format(_toValue(shown)),
      increasedValue: widget.format(_toValue(math.min(_last, shown + 1))),
      decreasedValue: widget.format(_toValue(math.max(0, shown - 1))),
      onIncrease: shown < _last ? () => _step(1) : null,
      onDecrease: shown > 0 ? () => _step(-1) : null,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        excludeFromSemantics: true,
        onHorizontalDragStart: (_) {
          _pos.stop();
          _following = false;
        },
        onHorizontalDragUpdate: (d) => _pos.value =
            (_pos.value - d.delta.dx / _dragPx).clamp(-.35, _last + .35),
        onHorizontalDragEnd: (d) {
          final thrown = -(d.primaryVelocity ?? 0) / _dragPx * .16;
          _go((_pos.value + thrown).round());
        },
        onHorizontalDragCancel: () => _go(_pos.value.round()),
        onTapUp: (d) {
          final box = context.findRenderObject()! as RenderBox;
          final dx = d.localPosition.dx - box.size.width / 2;
          int? best;
          var distance = 28.0;
          for (var i = from; i <= to; i++) {
            final gap = (_mapX(i - pos) - dx).abs();
            if (gap < distance) {
              distance = gap;
              best = i;
            }
          }
          if (best != null) {
            _following = false;
            _go(best);
          }
        },
        child: SizedBox(
          height: 56,
          child: _fadeEdges(
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 72,
                  height: 48,
                  decoration: BoxDecoration(
                    color: c.ink,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [
                      BoxShadow(
                        color: Color.fromRGBO(0, 0, 0, .22),
                        blurRadius: 18,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                ),
                for (var i = from; i <= to; i++)
                  () {
                    final d = i - pos;
                    final w = math.exp(-d * d / .3);
                    return Transform.translate(
                      offset: Offset(_mapX(d), 0),
                      child: Transform.scale(
                        scale: _mapS(d),
                        child: Opacity(
                          opacity:
                              (1 - d.abs() / (_reach + .5)).clamp(0.0, 1.0) *
                              (.55 + .45 * w),
                          child: Text(
                            widget.format(_toValue(i)),
                            maxLines: 1,
                            softWrap: false,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                              color: w > .5 ? onInk(context) : c.ink,
                            ),
                          ),
                        ),
                      ),
                    );
                  }(),
              ],
            ),
            .2,
          ),
        ),
      ),
    );
  }
}

/// A time over a ruler: drag the ruler under the centre mark, fling it and it
/// coasts, then settles on the nearest step.
class TimeScrubber extends StatefulWidget {
  final String value, label;
  final ValueChanged<String> onChanged;
  final int step;
  const TimeScrubber({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.step = 5,
  });
  @override
  State<TimeScrubber> createState() => _TimeScrubberState();
}

class _TimeScrubberState extends State<TimeScrubber>
    with SingleTickerProviderStateMixin {
  static const _px = 2.0, _day = 1440, _carry = 21.0;
  late final Ticker _ticker;
  late double _x, _to;
  late String _reported;
  double _v = 0;
  bool _following = false;
  Duration? _prev;

  static double _wrap(double m) => (m % _day + _day) % _day;
  static String _str(double m) => minutesToTime(_wrap(m.roundToDouble()));
  double _snap(double m) => (m / widget.step).round() * widget.step.toDouble();

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_tick);
    _x = _to = timeToMinutes(widget.value).toDouble();
    _reported = widget.value;
  }

  @override
  void didUpdateWidget(TimeScrubber old) {
    super.didUpdateWidget(old);
    if (widget.value == _reported) return;
    // A time set from outside turns the ruler the short way round to it.
    _reported = widget.value;
    _following = true;
    final d =
        (timeToMinutes(widget.value) - _wrap(_to) + _day * 1.5) % _day -
        _day / 2;
    _goTo(_to + d, 0, rebuild: false);
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _set(double x) {
    _x = x;
    if (!_following) {
      final next = _str(_snap(x));
      if (next != _reported) {
        _reported = next;
        widget.onChanged(next);
      }
    }
    if (mounted) setState(() {});
  }

  void _tick(Duration elapsed) {
    final dt = _prev == null
        ? 1.0
        : ((elapsed - _prev!).inMicroseconds / 16670).clamp(0.0, 2.5);
    _prev = elapsed;
    _v += ((_to - _x) * .022 - _v * .26) * dt;
    final x = _x + _v * dt;
    if ((_to - x).abs() < .01 && _v.abs() < .01) {
      _v = 0;
      _ticker.stop();
      _set(_to);
      return;
    }
    _set(x);
  }

  void _goTo(double to, double v, {bool rebuild = true}) {
    _to = to;
    _v = v;
    if (MediaQuery.disableAnimationsOf(context)) {
      _v = 0;
      _ticker.stop();
      rebuild ? _set(to) : _x = to;
      return;
    }
    if (!_ticker.isActive) {
      _prev = null;
      _ticker.start();
    }
  }

  void _release(double velocity) {
    final v = (-velocity / _px / 60).clamp(-14.0, 14.0);
    _goTo(_snap(_x + v * _carry), v * .6);
  }

  void _nudge(int direction) {
    _following = false;
    _goTo(_snap(_to) + direction * widget.step, 0);
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final time = _str(_x);
    const style = TextStyle(
      fontSize: 26,
      height: 1.2,
      fontWeight: FontWeight.w600,
      letterSpacing: -.78,
      fontFeatures: [FontFeature.tabularFigures()],
    );
    return GlassSurface(
      radius: 22,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Column(
        children: [
          ExcludeSemantics(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    widget.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: c.ink3),
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final (i, ch) in time.split('').indexed)
                      ch == ':'
                          ? Text(':', style: style.copyWith(color: c.ink))
                          : _Digit(
                              key: ValueKey(i),
                              digit: int.parse(ch),
                              style: style.copyWith(color: c.ink),
                            ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Semantics(
            container: true,
            slider: true,
            label: widget.label,
            value: time,
            increasedValue: _str(_snap(_to) + widget.step),
            decreasedValue: _str(_snap(_to) - widget.step),
            onIncrease: () => _nudge(1),
            onDecrease: () => _nudge(-1),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              excludeFromSemantics: true,
              onHorizontalDragStart: (_) {
                _ticker.stop();
                _following = false;
                _v = 0;
              },
              // Left is later: the ruler moves under a fixed mark.
              onHorizontalDragUpdate: (d) => _set(_x - d.delta.dx / _px),
              onHorizontalDragEnd: (d) => _release(d.primaryVelocity ?? 0),
              onHorizontalDragCancel: () => _release(0),
              child: SizedBox(
                height: 58,
                width: double.infinity,
                child: _fadeEdges(
                  CustomPaint(
                    painter: _RulerPainter(
                      pos: _x,
                      ink: c.ink,
                      dim: c.ink3,
                      textDirection: Directionality.of(context),
                    ),
                  ),
                  .22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A digit that rolls to its value on a strip of 0–9.
class _Digit extends StatelessWidget {
  final int digit;
  final TextStyle style;
  const _Digit({super.key, required this.digit, required this.style});
  @override
  Widget build(BuildContext context) {
    final height = style.fontSize! * style.height!;
    return Stack(
      children: [
        Opacity(opacity: 0, child: Text('0', style: style)),
        Positioned.fill(
          child: ClipRect(
            child: TweenAnimationBuilder<double>(
              tween: Tween(end: digit.toDouble()),
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 220),
              curve: const Cubic(.24, 1.34, .38, 1),
              builder: (context, v, child) => OverflowBox(
                alignment: Alignment.topCenter,
                minHeight: height * 10,
                maxHeight: height * 10,
                child: Transform.translate(
                  offset: Offset(0, -v * height),
                  child: child,
                ),
              ),
              child: Column(
                children: [
                  for (var n = 0; n < 10; n++)
                    SizedBox(
                      height: height,
                      child: Center(child: Text('$n', style: style)),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _RulerPainter extends CustomPainter {
  static const _px = 2.0, _half = 132.0;
  final double pos;
  final Color ink, dim;
  final TextDirection textDirection;
  const _RulerPainter({
    required this.pos,
    required this.ink,
    required this.dim,
    required this.textDirection,
  });
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final span = cx / _px + 10;
    for (var m = ((pos - span) / 5).ceil() * 5; m <= pos + span; m += 5) {
      final x = (m - pos) * _px;
      final f = (1 - math.pow(x.abs() / _half, 2)).clamp(0.0, 1.0);
      final w = (m % 1440 + 1440) % 1440;
      final height = w % 60 == 0
          ? 25.0
          : w % 15 == 0
          ? 17.0
          : 10.0;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(cx + x - 1, 8, 2, height * (.55 + .45 * f)),
          const Radius.circular(1),
        ),
        Paint()..color = ink.withValues(alpha: ink.a * (.18 + .82 * f)),
      );
      if (w % 60 == 0) {
        final label = TextPainter(
          text: TextSpan(
            text: (w ~/ 60).toString().padLeft(2, '0'),
            style: TextStyle(
              fontFamily: 'Onest',
              fontSize: 11,
              color: dim.withValues(alpha: dim.a * (.15 + .85 * f)),
            ),
          ),
          textDirection: textDirection,
        )..layout();
        label.paint(canvas, Offset(cx + x - label.width / 2, 38));
        label.dispose();
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

/// 24-hour dial with the sleep window drawn as an arc.
class SleepDial extends StatefulWidget {
  final String bed, wake;
  const SleepDial({super.key, required this.bed, required this.wake});
  @override
  State<SleepDial> createState() => _SleepDialState();
}

class _SleepDialState extends State<SleepDial>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
    value: 1,
  );
  late final Animation<double> _t = CurvedAnimation(
    parent: _c,
    curve: SomnaMotion.smooth,
  );
  late Tween<double> _start = _still(timeToMinutes(widget.bed) / 1440);
  late Tween<double> _len = _still(spanMinutes(widget.bed, widget.wake) / 1440);
  static Tween<double> _still(double v) => Tween(begin: v, end: v);

  @override
  void didUpdateWidget(SleepDial old) {
    super.didUpdateWidget(old);
    if (old.bed == widget.bed && old.wake == widget.wake) return;
    final from = _start.evaluate(_t);
    // The short way round, so 23:30 → 00:30 does not sweep the whole dial.
    final turn = (timeToMinutes(widget.bed) / 1440 - from % 1 + 1.5) % 1 - .5;
    _start = Tween(begin: from, end: from + turn);
    _len = Tween(
      begin: _len.evaluate(_t),
      end: spanMinutes(widget.bed, widget.wake) / 1440,
    );
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else {
      _c.forward(from: 0);
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
    final mark = TextStyle(fontSize: 10, height: 1, color: c.ink3);
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: 230,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _t,
                builder: (context, _) => CustomPaint(
                  painter: _DialPainter(
                    start: _start.evaluate(_t),
                    len: _len.evaluate(_t),
                    ink: c.ink,
                  ),
                ),
              ),
            ),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Dots(
                  value: hm(spanMinutes(widget.bed, widget.wake)),
                  size: 40,
                  square: true,
                  color: c.ink,
                ),
                const SizedBox(height: 8),
                Text(
                  'часов сна',
                  style: TextStyle(fontSize: 12, color: c.ink2),
                ),
              ],
            ),
            Positioned(top: 18, child: Text('00', style: mark)),
            Positioned(bottom: 18, child: Text('12', style: mark)),
          ],
        ),
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  static const _r = 82.0;
  final double start, len;
  final Color ink;
  const _DialPainter({
    required this.start,
    required this.len,
    required this.ink,
  });
  static Offset _at(double t, [double radius = _r]) {
    final a = t * 2 * math.pi - math.pi / 2;
    return Offset(math.cos(a) * radius, math.sin(a) * radius);
  }

  @override
  void paint(Canvas canvas, Size size) {
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(size.width / 200);
    for (var i = 0; i < 48; i++) {
      final hour = i % 12 == 0;
      canvas.drawCircle(
        _at(i / 48, 97),
        hour ? 1.8 : .9,
        Paint()..color = ink.withValues(alpha: hour ? .7 : .3),
      );
    }
    final ring = Rect.fromCircle(center: Offset.zero, radius: _r);
    canvas.drawCircle(
      Offset.zero,
      _r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 13
        ..color = ink.withValues(alpha: .1),
    );
    canvas.save();
    canvas.rotate(start * 2 * math.pi - math.pi / 2);
    canvas.drawArc(
      ring,
      0,
      len * 2 * math.pi,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 13
        ..strokeCap = StrokeCap.round
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xff7c8cff), SomnaColors.lime],
        ).createShader(ring),
    );
    canvas.restore();
    canvas.drawCircle(_at(start), 8, Paint()..color = ink);
    canvas.drawCircle(_at(start + len), 8, Paint()..color = SomnaColors.lime);
  }

  @override
  bool shouldRepaint(_DialPainter old) =>
      old.start != start || old.len != len || old.ink != ink;
}
