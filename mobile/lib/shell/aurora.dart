import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

const auroraPalettes = <Brightness, Map<String, List<Color>>>{
  Brightness.dark: {
    'today': [
      Color(0xff080809),
      Color(0xff15143a),
      Color(0xff3a2063),
      Color(0xff5a3fa8),
    ],
    'sleep': [
      Color(0xff080809),
      Color(0xff0c1440),
      Color(0xff22318f),
      Color(0xff5a4fc0),
    ],
    'mind': [
      Color(0xff080809),
      Color(0xff0b2a14),
      Color(0xff2c6a24),
      Color(0xff8a9c36),
    ],
    'practices': [
      Color(0xff080809),
      Color(0xff30102a),
      Color(0xff8a3656),
      Color(0xffb05a2c),
    ],
    'onboarding': [
      Color(0xff0a0a24),
      Color(0xff2a1f78),
      Color(0xff7a3aa8),
      Color(0xff4a62e0),
    ],
  },
  Brightness.light: {
    'today': [
      Color(0xfff2f1f6),
      Color(0xffe2dcf7),
      Color(0xffcdbcf2),
      Color(0xfff4cfe6),
    ],
    'sleep': [
      Color(0xfff1f2f8),
      Color(0xffd9def8),
      Color(0xffb9c3f4),
      Color(0xffd6c8f5),
    ],
    'mind': [
      Color(0xfff2f4ee),
      Color(0xffdcedcf),
      Color(0xffbfe0a8),
      Color(0xffeef0b8),
    ],
    'practices': [
      Color(0xfff6f1f0),
      Color(0xfff6d9dc),
      Color(0xfff2bfc6),
      Color(0xfff7d7b4),
    ],
    'onboarding': [
      Color(0xffeef0fb),
      Color(0xffcfd4fa),
      Color(0xffd9bff3),
      Color(0xffb8c8fb),
    ],
  },
};

/// Native soft radial blobs; palettes come from Aurora.tsx, no WebView/shader.
class Aurora extends StatefulWidget {
  final String tab;
  const Aurora({super.key, required this.tab});
  @override
  State<Aurora> createState() => _AuroraState();
}

class _AuroraState extends State<Aurora> with SingleTickerProviderStateMixin {
  late final AnimationController _drift = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 18),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _animate();
  }

  @override
  void didUpdateWidget(Aurora old) {
    super.didUpdateWidget(old);
    _animate();
  }

  void _animate() {
    if (widget.tab == 'onboarding' &&
        !MediaQuery.disableAnimationsOf(context)) {
      _drift.repeat(reverse: true);
    } else {
      _drift.stop();
    }
  }

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final palette =
        auroraPalettes[brightness]![widget.tab] ??
        auroraPalettes[brightness]!['today']!;
    final phase = switch (widget.tab) {
      'sleep' => .8,
      'mind' => 1.8,
      'practices' => 2.6,
      _ => 0.0,
    };
    return IgnorePointer(
      child: RepaintBoundary(
        child: TweenAnimationBuilder<_AuroraScene>(
          tween: _SceneTween(end: _AuroraScene(palette, phase)),
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 2600),
          curve: Curves.easeOutCubic,
          builder: (context, scene, _) => AnimatedBuilder(
            animation: _drift,
            builder: (context, _) => CustomPaint(
              painter: _AuroraPainter(
                scene,
                widget.tab,
                _drift.value,
                brightness,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AuroraScene {
  final List<Color> colors;
  final double phase;
  const _AuroraScene(this.colors, this.phase);
}

class _SceneTween extends Tween<_AuroraScene> {
  _SceneTween({required _AuroraScene end}) : super(begin: end, end: end);
  @override
  _AuroraScene lerp(double t) => _AuroraScene(
    List.generate(4, (i) => Color.lerp(begin!.colors[i], end!.colors[i], t)!),
    begin!.phase + (end!.phase - begin!.phase) * t,
  );
}

class _AuroraPainter extends CustomPainter {
  final _AuroraScene scene;
  final String tab;
  final double drift;
  final Brightness brightness;
  const _AuroraPainter(this.scene, this.tab, this.drift, this.brightness);
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size, palette = scene.colors;
    canvas.drawRect(rect, Paint()..color = palette[0]);
    final phase = scene.phase;
    final move = math.sin(drift * math.pi);
    for (var i = 0; i < 3; i++) {
      final center = Offset(
        size.width * (.25 + i * .28 + math.sin(phase + i) * .12 + move * .06),
        size.height * (.12 + i * .28 + move * .05),
      );
      final radius = size.width * (i == 0 ? 1.3 : 1.1);
      final alpha = tab == 'onboarding'
          ? .8
          : brightness == Brightness.light
          ? .65
          : .32;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              palette[i + 1].withValues(alpha: alpha),
              palette[i + 1].withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            palette[0].withValues(alpha: .05),
            palette[0].withValues(alpha: .7),
          ],
        ).createShader(rect),
    );
    final dot = Paint()
      ..color =
          (brightness == Brightness.dark
                  ? Colors.white
                  : const Color(0xff15151c))
              .withValues(alpha: .035);
    for (var x = 0.0; x < size.width; x += 22) {
      for (var y = 0.0; y < size.height * .8; y += 22) {
        canvas.drawCircle(Offset(x, y), .7, dot);
      }
    }
  }

  @override
  bool shouldRepaint(_AuroraPainter old) =>
      old.scene != scene ||
      old.tab != tab ||
      old.drift != drift ||
      old.brightness != brightness;
}
