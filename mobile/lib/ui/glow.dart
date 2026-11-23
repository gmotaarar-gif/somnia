import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/theme.dart';
import '../theme/tokens.dart';
import 'ambient.dart';
import 'feedback.dart';

/// Soft gradient plates: a blurred colour mesh with a white bloom, the way
/// the reference "gradient plates" glow from inside.
const glowPalettes = <String, List<Color>>{
  'candy': [Color(0xffff0f83), Color(0xffffeaea), Color(0xffcee3ff)],
  'lime': [Color(0xffa6e22e), Color(0xfff6ff9e), Color(0xffd9f24a)],
  'sky': [Color(0xff36d7ff), Color(0xffcfe6ff), Color(0xff8f7bff)],
  'ember': [Color(0xffff6a00), Color(0xffffc46b), Color(0xffd4145a)],
  'dusk': [Color(0xff7045ff), Color(0xffffc2e6), Color(0xff3b2cd2)],
  'mint': [Color(0xff3ee6a8), Color(0xffe1fff2), Color(0xff2f8a2a)],
};

bool _still(BuildContext context) => MediaQuery.disableAnimationsOf(context);

/// A rounded plate filled with slowly drifting blurred blobs. Text on it is
/// dark: every palette has a pale middle colour.
class GlowPlate extends StatefulWidget {
  final Widget child;
  final List<Color> colors;
  final double radius;
  final EdgeInsetsGeometry padding;
  final bool drift;
  const GlowPlate({
    super.key,
    required this.child,
    this.colors = const [
      Color(0xffff0f83),
      Color(0xffffeaea),
      Color(0xffcee3ff),
    ],
    this.radius = SomnaRadii.medium,
    this.padding = const EdgeInsets.all(20),
    this.drift = true,
  });
  GlowPlate.named(
    String palette, {
    Key? key,
    required Widget child,
    double radius = SomnaRadii.medium,
    EdgeInsetsGeometry padding = const EdgeInsets.all(20),
    bool drift = true,
  }) : this(
         key: key,
         child: child,
         colors: glowPalettes[palette] ?? glowPalettes['candy']!,
         radius: radius,
         padding: padding,
         drift: drift,
       );
  @override
  State<GlowPlate> createState() => _GlowPlateState();
}

class _GlowPlateState extends State<GlowPlate>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(
    (e) => _t.value = e.inMilliseconds / 1000,
  );
  final _t = ValueNotifier(0.0);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final run = widget.drift && ambientMotion(context);
    if (run && !_ticker.isActive) _ticker.start();
    if (!run && _ticker.isActive) _ticker.stop();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(widget.radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        boxShadow: [
          BoxShadow(
            color: widget.colors.first.withValues(alpha: .35),
            blurRadius: 32,
            offset: const Offset(0, 14),
            spreadRadius: -18,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: r,
        child: RepaintBoundary(
          child: CustomPaint(
            painter: _PlatePainter(widget.colors, _t),
            foregroundPainter: _RimPainter(widget.radius),
            child: DefaultTextStyle.merge(
              style: const TextStyle(color: Color(0xff15151c)),
              child: IconTheme(
                data: const IconThemeData(color: Color(0xff15151c)),
                child: Padding(padding: widget.padding, child: widget.child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PlatePainter extends CustomPainter {
  final List<Color> colors;
  final ValueNotifier<double> t;
  _PlatePainter(this.colors, this.t) : super(repaint: t);
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(rect, Paint()..color = colors[1]);
    final s = t.value;
    final blobs = [
      (colors[0], .5 + .18 * math.sin(s * .5), .3 + .1 * math.cos(s * .4), .62),
      (
        colors[2],
        .2 + .12 * math.cos(s * .35),
        .92 + .06 * math.sin(s * .6),
        .58,
      ),
      (colors[0], .94 + .05 * math.sin(s * .3), .8, .34),
    ];
    final blur = size.shortestSide * .22;
    for (final (c, x, y, r) in blobs) {
      canvas.drawCircle(
        Offset(size.width * x, size.height * y),
        size.longestSide * r * .6,
        Paint()
          ..color = c.withValues(alpha: .92)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur),
      );
    }
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x66ffffff), Color(0x00ffffff), Color(0x33ffffff)],
          stops: [0, .45, 1],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_PlatePainter old) => old.colors != colors;
}

/// The glossy rim: bright on the top edge, fading on the sides.
class _RimPainter extends CustomPainter {
  final double radius;
  final Color color;
  const _RimPainter(this.radius, [this.color = const Color(0xccffffff)]);
  @override
  void paint(Canvas canvas, Size size) {
    final rr = RRect.fromRectAndRadius(
      (Offset.zero & size).deflate(.75),
      Radius.circular(radius),
    );
    canvas.drawRRect(
      rr,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            color,
            color.withValues(alpha: 0),
            color.withValues(alpha: .2),
          ],
          stops: const [0, .5, 1],
        ).createShader(Offset.zero & size),
    );
  }

  @override
  bool shouldRepaint(_RimPainter old) =>
      old.radius != radius || old.color != color;
}

/// Dark smoked glass with a coloured light rising from the bottom edge
/// (the "69°" reference). Content is always on dark.
class BevelGlass extends StatelessWidget {
  final Widget child;
  final Color glow;
  final double radius, intensity;
  final EdgeInsetsGeometry padding;
  const BevelGlass({
    super.key,
    required this.child,
    this.glow = const Color(0xffff7a1a),
    this.radius = SomnaRadii.large,
    this.intensity = 1,
    this.padding = const EdgeInsets.all(20),
  });
  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(radius);
    return Theme(
      data: somnaTheme(Brightness.dark),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: r,
          boxShadow: [
            BoxShadow(
              color: glow.withValues(alpha: .28 * intensity),
              blurRadius: 40,
              offset: const Offset(0, 22),
              spreadRadius: -16,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: r,
          child: CustomPaint(
            painter: _BevelPainter(glow, intensity.clamp(0.0, 1.0)),
            foregroundPainter: _RimPainter(radius, const Color(0x8cffffff)),
            child: DefaultTextStyle.merge(
              style: const TextStyle(color: Colors.white),
              child: IconTheme(
                data: const IconThemeData(color: Colors.white),
                child: Padding(padding: padding, child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BevelPainter extends CustomPainter {
  final Color glow;
  final double intensity;
  const _BevelPainter(this.glow, this.intensity);
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xff1c1c22), Color(0xff0a0a0d)],
        ).createShader(rect),
    );
    final center = Offset(size.width / 2, size.height * 1.08);
    canvas.drawOval(
      Rect.fromCenter(
        center: center,
        width: size.width * 1.3,
        height: size.height * .7,
      ),
      Paint()
        ..shader =
            RadialGradient(
              colors: [
                Color.lerp(
                  glow,
                  Colors.white,
                  .35,
                )!.withValues(alpha: intensity),
                glow.withValues(alpha: .75 * intensity),
                glow.withValues(alpha: 0),
              ],
              stops: const [0, .35, 1],
            ).createShader(
              Rect.fromCircle(center: center, radius: size.width * .65),
            ),
    );
  }

  @override
  bool shouldRepaint(_BevelPainter old) =>
      old.glow != glow || old.intensity != intensity;
}

/// Press feedback that leans the surface toward the finger, then springs
/// back with a small overshoot.
class TiltPress extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final String? label;
  final double maxTilt;
  const TiltPress({
    super.key,
    required this.child,
    this.onPressed,
    this.label,
    this.maxTilt = .06,
  });
  @override
  State<TiltPress> createState() => _TiltPressState();
}

class _TiltPressState extends State<TiltPress> {
  Offset _tilt = Offset.zero;
  bool _down = false;

  void _press(Offset local) {
    final box = context.size;
    if (box == null || box.isEmpty) return;
    setState(() {
      _down = true;
      _tilt = _still(context)
          ? Offset.zero
          : Offset(
              (local.dx / box.width - .5) * 2,
              (local.dy / box.height - .5) * 2,
            );
    });
  }

  void _release() {
    if (!_down) return;
    setState(() {
      _down = false;
      _tilt = Offset.zero;
    });
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    final still = _still(context);
    return Semantics(
      container: true,
      button: true,
      enabled: enabled,
      label: widget.label,
      excludeSemantics: widget.label != null,
      onTap: widget.onPressed,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (d) => _press(d.localPosition) : null,
        onTapCancel: _release,
        onTapUp: enabled
            ? (_) {
                _release();
                Feel.tap();
                widget.onPressed!();
              }
            : null,
        child: TweenAnimationBuilder<Offset>(
          tween: Tween(end: _tilt),
          duration: still ? Duration.zero : SomnaMotion.fast,
          curve: SomnaMotion.smooth,
          builder: (context, tilt, child) => TweenAnimationBuilder<double>(
            tween: Tween(end: _down ? SomnaMotion.pressScale : 1),
            duration: still
                ? Duration.zero
                : _down
                ? SomnaMotion.quick
                : SomnaMotion.medium,
            curve: _down ? Curves.easeOut : SomnaMotion.bounce,
            builder: (context, scale, child) => Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, .0012)
                ..rotateX(-tilt.dy * widget.maxTilt)
                ..rotateY(tilt.dx * widget.maxTilt)
                ..scaleByDouble(scale, scale, 1, 1),
              child: child,
            ),
            child: child,
          ),
          child: widget.child,
        ),
      ),
    );
  }
}

/// Staggered entrance: fade, a short rise and a blur that clears.
class Reveal extends StatefulWidget {
  final Widget child;
  final int index;
  final double distance;
  const Reveal({
    super.key,
    required this.child,
    this.index = 0,
    this.distance = 16,
  });
  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 560),
  );
  late Animation<double> _a = CurvedAnimation(
    parent: _c,
    curve: SomnaMotion.smooth,
  );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (_still(context)) {
      _c.value = 1;
      return;
    }
    final delay = 60 * widget.index.clamp(0, 8);
    _c.duration = Duration(milliseconds: 560 + delay);
    _a = CurvedAnimation(
      parent: _c,
      curve: Interval(delay / (560 + delay), 1, curve: SomnaMotion.smooth),
    );
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _a,
    child: widget.child,
    builder: (context, child) {
      final v = _a.value;
      final blur = (1 - v) * 6;
      Widget out = Opacity(
        opacity: v.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: Offset(0, (1 - v) * widget.distance),
          child: child,
        ),
      );
      if (blur > .3) {
        out = ImageFiltered(
          imageFilter: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: out,
        );
      }
      return out;
    },
  );
}

/// LED column meter: lit segments up to [value], dim after it. Segments
/// light one after another when the value grows.
class LedMeter extends StatelessWidget {
  final double value;
  final int count;
  final double height;
  final Color? color;
  const LedMeter({
    super.key,
    required this.value,
    this.count = 20,
    this.height = 36,
    this.color,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final v = value.clamp(0.0, 1.0);
    final lit = (v * count).round();
    final top = color ?? const Color(0xff9fe8ff);
    final bottom = color ?? const Color(0xff3ee6a8);
    return Semantics(
      value: '${(v * 100).round()}%',
      child: SizedBox(
        height: height,
        child: Row(
          children: [
            for (var i = 0; i < count; i++) ...[
              if (i > 0) const SizedBox(width: 3),
              Expanded(
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: i < lit ? 1 : 0),
                  duration: _still(context)
                      ? Duration.zero
                      : Duration(milliseconds: 220 + i * 18),
                  curve: SomnaMotion.smooth,
                  builder: (context, on, _) => DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(3),
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color.lerp(c.ink.withValues(alpha: .12), top, on)!,
                          Color.lerp(
                            c.ink.withValues(alpha: .06),
                            bottom.withValues(alpha: .8),
                            on,
                          )!,
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Start tracking ->" pill: dark glass melting into a colour glow behind a
/// white round arrow.
class ActionPill extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Color glow;
  final IconData icon;
  const ActionPill({
    super.key,
    required this.label,
    this.onPressed,
    this.glow = const Color(0xffa6e22e),
    this.icon = Icons.arrow_forward_rounded,
  });
  @override
  Widget build(BuildContext context) => TiltPress(
    label: label,
    onPressed: onPressed,
    maxTilt: .03,
    child: AnimatedOpacity(
      opacity: onPressed == null ? .45 : 1,
      duration: SomnaMotion.fast,
      child: Container(
        height: 64,
        padding: const EdgeInsets.fromLTRB(24, 8, 8, 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(32),
          gradient: LinearGradient(
            colors: [
              const Color(0xff15151b),
              const Color(0xff1d1d24),
              glow.withValues(alpha: .85),
              Color.lerp(glow, Colors.white, .8)!,
            ],
            stops: const [0, .45, .82, 1],
          ),
          border: Border.all(color: const Color(0x33ffffff)),
          boxShadow: [
            BoxShadow(
              color: glow.withValues(alpha: .3),
              blurRadius: 28,
              offset: const Offset(0, 10),
              spreadRadius: -12,
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            DecoratedBox(
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
              child: SizedBox.square(
                dimension: 48,
                child: Icon(icon, color: Colors.black, size: 22),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Small rounded label for plates and cards.
class GlowTag extends StatelessWidget {
  final String text;
  final IconData? icon;
  final bool onLight;
  const GlowTag(this.text, {super.key, this.icon, this.onLight = false});
  @override
  Widget build(BuildContext context) {
    final ink = onLight ? const Color(0xff15151c) : Colors.white;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: ink.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: ink.withValues(alpha: .12)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 13, color: ink),
              const SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: ink,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
