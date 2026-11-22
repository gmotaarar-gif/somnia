import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import 'shaders.dart';

/// Mesh colours per screen, low → high (Aurora.tsx).
const auroraPalettes = <Brightness, Map<String, List<Color>>>{
  Brightness.dark: {
    'today': [
      Color(0xff18123f),
      Color(0xff261c63),
      Color(0xff40288c),
      Color(0xff6a47c2),
    ],
    'sleep': [
      Color(0xff0b1240),
      Color(0xff13226b),
      Color(0xff2639a6),
      Color(0xff6f7fe8),
    ],
    'mind': [
      Color(0xff0d2812),
      Color(0xff184c1d),
      Color(0xff2f7a28),
      Color(0xff8bb23d),
    ],
    'practices': [
      Color(0xff22152a),
      Color(0xff4c2143),
      Color(0xff8a3b5b),
      Color(0xffb86a3c),
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

/// The blobs that stand in for the mesh where the shader cannot run
/// (`--a1`…`--a3` in index.css).
const _blobColors = <String, List<Color>>{
  'today': [Color(0xff241a5e), Color(0xff6a47c2), Color(0xff3b2584)],
  'sleep': [Color(0xff111f63), Color(0xff2e44c0), Color(0xff6f7fe8)],
  'mind': [Color(0xff15431a), Color(0xff2f7c28), Color(0xff8bb23d)],
  'practices': [Color(0xff48203f), Color(0xff8f3d5e), Color(0xffb86a3c)],
  'onboarding': [Color(0xff141447), Color(0xff7a3aa8), Color(0xff3a52d8)],
};

const _veils = <String, Color>{
  'today': Color(0xff0c0926),
  'sleep': Color(0xff060a28),
  'mind': Color(0xff06160a),
  'practices': Color(0xff140b16),
};
const _darkVeil = Color(0xff07070c), _lightVeil = Color(0xfff2f1f6);

const _settle = Duration(milliseconds: 2600);
const _timeScale = .73;

final _grain = ValueNotifier<ui.Image?>(null);
bool _grainAsked = false;
void _loadGrain() {
  if (_grainAsked) return;
  _grainAsked = true;
  const AssetImage('assets/images/grain-160.png')
      .resolve(ImageConfiguration.empty)
      .addListener(
        ImageStreamListener(
          (info, _) => _grain.value = info.image,
          onError: (_, _) {},
        ),
      );
}

/// Backdrop behind every screen: the mesh-drift shader in the screen's
/// colours, under a veil, a dot grid and grain. Behind the tabs it rests on
/// one frame (the tab wave carries it, and a perpetual drift would re-blur
/// the glass above on every frame); onboarding drifts. Until the shader has
/// loaded, and wherever it cannot run, soft blobs carry the same job.
class Aurora extends StatefulWidget {
  final String tab;
  const Aurora({super.key, required this.tab});
  @override
  State<Aurora> createState() => _AuroraState();
}

class _AuroraState extends State<Aurora> with TickerProviderStateMixin {
  late final AnimationController _ease = AnimationController(
    vsync: this,
    duration: _settle,
    value: 1,
  );
  late final Ticker _ticker = createTicker(_tick);
  final _clock = ValueNotifier<double>(0);
  Duration _last = Duration.zero;
  List<Color>? _from, _to;
  ui.FragmentShader? _shader;

  @override
  void initState() {
    super.initState();
    _loadGrain();
    _useProgram(meshDriftShader.program);
    if (_shader == null) {
      meshDriftShader.load().then((program) {
        if (mounted && program != null) setState(() => _useProgram(program));
      });
    }
  }

  void _useProgram(ui.FragmentProgram? program) {
    try {
      _shader = program?.fragmentShader();
    } catch (_) {
      _shader = null;
    }
  }

  void _tick(Duration elapsed) {
    final dt = (elapsed - _last).inMicroseconds / 1e6;
    _last = elapsed;
    _clock.value += math.min(.05, dt);
  }

  List<Color> get _shown {
    final t = Curves.easeOutCubic.transform(_ease.value);
    return [for (var i = 0; i < 4; i++) Color.lerp(_from![i], _to![i], t)!];
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _retarget();
  }

  @override
  void didUpdateWidget(Aurora old) {
    super.didUpdateWidget(old);
    _retarget();
  }

  void _retarget() {
    final palettes = auroraPalettes[Theme.of(context).brightness]!;
    final target = palettes[widget.tab] ?? palettes['today']!;
    final live =
        widget.tab == 'onboarding' && !MediaQuery.disableAnimationsOf(context);
    if (!live || _to == null) {
      _from = _to = target;
      _ease.value = 1;
    } else if (!identical(target, _to)) {
      _from = _shown;
      _to = target;
      _ease.forward(from: 0);
    }
    if (live && !_ticker.isActive) {
      _last = Duration.zero;
      _ticker.start();
    } else if (!live && _ticker.isActive) {
      _ticker.stop();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    _ease.dispose();
    _clock.dispose();
    _shader?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: RepaintBoundary(
      child: CustomPaint(
        size: Size.infinite,
        painter: _AuroraPainter(
          this,
          widget.tab,
          Theme.of(context).brightness,
          _shader,
        ),
      ),
    ),
  );
}

class _AuroraPainter extends CustomPainter {
  final _AuroraState state;
  final String tab;
  final Brightness brightness;
  final ui.FragmentShader? shader;
  _AuroraPainter(this.state, this.tab, this.brightness, this.shader)
    : super(repaint: Listenable.merge([state._ease, state._clock, _grain]));

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final rect = Offset.zero & size, colors = state._shown;
    final dark = brightness == Brightness.dark;
    final shader = this.shader;
    canvas.drawRect(rect, Paint()..color = colors[0]);
    if (shader != null) {
      shader
        ..setFloat(0, size.width)
        ..setFloat(1, size.height)
        ..setFloat(2, state._clock.value * _timeScale);
      for (var i = 0; i < 4; i++) {
        shader
          ..setFloat(3 + i * 3, colors[i].r)
          ..setFloat(4 + i * 3, colors[i].g)
          ..setFloat(5 + i * 3, colors[i].b);
      }
      canvas.drawRect(rect, Paint()..shader = shader);
    } else {
      _blobs(canvas, size, dark);
    }
    _veil(canvas, size, dark, shader != null ? .32 : 1);
    _dots(canvas, size, dark);
    final grain = _grain.value;
    if (grain != null) {
      canvas.drawRect(
        rect,
        Paint()
          ..shader = ImageShader(
            grain,
            TileMode.repeated,
            TileMode.repeated,
            (Matrix4.identity()..scaleByDouble(1.125, 1.125, 1, 1)).storage,
          )
          ..blendMode = BlendMode.overlay
          ..color = Color.fromRGBO(
            255,
            255,
            255,
            tab == 'onboarding' ? .32 : .16,
          ),
      );
    }
  }

  void _blobs(Canvas canvas, Size size, bool dark) {
    final blobs = _blobColors[tab] ?? _blobColors['today']!;
    final w = size.width, h = size.height;
    // .b1, .b2, .b3: the rectangle each ellipse fills, its colour, opacity.
    final spec = [
      (Rect.fromLTRB(-.2 * w, -.3 * h, 1.2 * w, .8 * h), blobs[1], .75),
      (Rect.fromLTRB(.2 * w, .25 * h, 1.35 * w, 1.35 * h), blobs[2], .5),
      (Rect.fromLTRB(-.4 * w, .3 * h, .75 * w, 1.4 * h), blobs[0], .9),
    ];
    for (final (box, base, opacity) in spec) {
      final color = dark ? base : Color.lerp(base, Colors.white, .45)!;
      final alpha = dark || tab == 'onboarding' ? opacity : .18;
      canvas.save();
      canvas.translate(box.center.dx, box.center.dy);
      canvas.scale(box.width / 2, box.height / 2);
      canvas.drawCircle(
        Offset.zero,
        1,
        Paint()
          ..shader = ui.Gradient.radial(Offset.zero, 1, [
            color.withValues(alpha: alpha),
            color.withValues(alpha: 0),
          ]),
      );
      canvas.restore();
    }
  }

  void _veil(Canvas canvas, Size size, bool dark, double opacity) {
    final rect = Offset.zero & size;
    final veil = dark ? (_veils[tab] ?? _darkVeil) : _lightVeil;
    Color a(double alpha) => veil.withValues(alpha: alpha * opacity);
    canvas.drawRect(
      rect,
      Paint()
        ..shader = ui.Gradient.linear(Offset.zero, Offset(0, size.height), [
          a(.1),
          a(.55),
        ]),
    );
    // radial-gradient(120% 80% at 50% 0%, …)
    canvas.save();
    canvas.translate(size.width / 2, 0);
    canvas.scale(1.2 * size.width, .8 * size.height);
    canvas.drawRect(
      Rect.fromLTRB(-.5 / 1.2, 0, .5 / 1.2, 1 / .8),
      Paint()
        ..shader = ui.Gradient.radial(
          Offset.zero,
          1,
          [a(0), a(.35), a(.82)],
          [0, .6, 1],
        ),
    );
    canvas.restore();
  }

  void _dots(Canvas canvas, Size size, bool dark) {
    final base = dark ? Colors.white : const Color(0xff15151c);
    final strength = dark ? .035 : .05;
    final cx = size.width / 2, cy = size.height * .3;
    final rx = .9 * size.width, ry = .7 * size.height;
    final paint = Paint();
    for (var y = 11.0; y < size.height; y += 22) {
      for (var x = 11.0; x < size.width; x += 22) {
        // mask: radial-gradient(90% 70% at 50% 30%, black, transparent 85%)
        final d = math.sqrt(
          math.pow((x - cx) / rx, 2) + math.pow((y - cy) / ry, 2),
        );
        final mask = 1 - d / .85;
        if (mask <= 0) continue;
        paint.color = base.withValues(alpha: strength * mask);
        canvas.drawCircle(Offset(x, y), 1.2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_AuroraPainter old) =>
      old.tab != tab || old.brightness != brightness || old.shader != shader;
}
