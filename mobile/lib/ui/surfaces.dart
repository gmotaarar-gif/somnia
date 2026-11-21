import 'dart:ui' as ui;

import 'package:material_ui/material_ui.dart';

import '../theme/theme.dart';
import '../theme/tokens.dart';
import 'press_scale.dart';

class SomnaCard extends StatelessWidget {
  final Widget child;
  final String? tone;
  final double radius;
  final EdgeInsetsGeometry padding;
  final bool sleepHero;
  final VoidCallback? onTap;
  const SomnaCard({
    super.key,
    required this.child,
    this.tone,
    this.radius = SomnaRadii.medium,
    this.padding = const EdgeInsets.all(24),
    this.sleepHero = false,
    this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final surface = Theme(
      data: somnaTheme(Brightness.dark),
      child: DefaultTextStyle.merge(
        style: const TextStyle(color: Colors.white),
        child: IconTheme(
          data: const IconThemeData(color: Colors.white),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              boxShadow: const [
                BoxShadow(
                  color: Color.fromRGBO(0, 0, 0, .7),
                  blurRadius: 40,
                  offset: Offset(0, 18),
                  spreadRadius: -30,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: CustomPaint(
                painter: _CardPainter(
                  tone: cardTones[tone],
                  sleepHero: sleepHero,
                ),
                foregroundPainter: _HighlightPainter(radius),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: IgnorePointer(
                        child: Opacity(
                          opacity: .08,
                          child: Image.asset(
                            'assets/images/grain-160.png',
                            excludeFromSemantics: true,
                            repeat: ImageRepeat.repeat,
                            alignment: Alignment.topLeft,
                            scale: 1,
                            fit: BoxFit.none,
                            colorBlendMode: BlendMode.overlay,
                          ),
                        ),
                      ),
                    ),
                    Padding(padding: padding, child: child),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
    return onTap == null
        ? surface
        : PressScale(onPressed: onTap, child: surface);
  }
}

class _CardPainter extends CustomPainter {
  final CardTone? tone;
  final bool sleepHero;
  const _CardPainter({this.tone, required this.sleepHero});
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    if (sleepHero) {
      canvas.drawRect(
        rect,
        Paint()..shader = SomnaGradients.sleepHero.createShader(rect),
      );
      _ellipse(
        canvas,
        size,
        SomnaGradients.sleepPink,
        1.08,
        1,
        .9164104,
        .8485281,
        const [0, 1],
        const [1, 0],
      );
      _ellipse(
        canvas,
        size,
        SomnaGradients.sleepPurple,
        .08,
        .40,
        .7546244,
        .4921463,
        const [0, 1],
        const [1, 0],
      );
    } else if (tone case final t?) {
      canvas.drawRect(
        rect,
        Paint()
          ..shader = LinearGradient(
            begin: t.begin,
            end: t.end,
            colors: [t.top, t.bottom],
          ).createShader(rect),
      );
      _ellipse(
        canvas,
        size,
        t.core,
        t.x,
        t.y,
        t.width,
        t.height,
        const [0, .32, .66, 1],
        const [1, .88, .42, 0],
      );
    } else {
      canvas.drawRect(rect, Paint()..color = const Color(0xff171719));
    }
  }

  void _ellipse(
    Canvas canvas,
    Size size,
    Color color,
    double x,
    double y,
    double w,
    double h,
    List<double> stops,
    List<double> alphas,
  ) {
    canvas.save();
    canvas.translate(size.width * x, size.height * y);
    canvas.scale(size.width * w, size.height * h);
    canvas.drawCircle(
      Offset.zero,
      1,
      Paint()
        ..shader = RadialGradient(
          colors: alphas.map((a) => color.withValues(alpha: a)).toList(),
          stops: stops,
        ).createShader(const Rect.fromLTWH(-1, -1, 2, 2)),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CardPainter old) =>
      old.tone != tone || old.sleepHero != sleepHero;
}

class _HighlightPainter extends CustomPainter {
  final double radius;
  const _HighlightPainter(this.radius);
  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(.5);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(radius)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color.fromRGBO(255, 255, 255, .045), Colors.transparent],
          stops: [0, .25],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_HighlightPainter old) => old.radius != radius;
}

class GlassSurface extends StatelessWidget {
  final Widget child;
  final bool chrome, inset;
  final double radius;
  final EdgeInsetsGeometry padding;
  const GlassSurface({
    super.key,
    required this.child,
    this.chrome = false,
    this.inset = false,
    this.radius = 30,
    this.padding = EdgeInsets.zero,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    Widget surface = DecoratedBox(
      decoration: BoxDecoration(
        color: chrome
            ? c.chrome
            : inset
            ? c.glassInset
            : c.glass,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: chrome ? c.chromeLine : c.glassEdge),
        boxShadow: chrome
            ? [
                BoxShadow(
                  color: c.chromeShadow,
                  blurRadius: 50,
                  spreadRadius: -20,
                  offset: const Offset(0, 24),
                ),
              ]
            : null,
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(radius),
          border: Border(
            top: BorderSide(color: chrome ? c.chromeEdge : c.glassEdge),
          ),
        ),
        child: Padding(padding: padding, child: child),
      ),
    );
    if (chrome) {
      surface = BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 28, sigmaY: 28),
        child: surface,
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: surface,
    );
  }
}
