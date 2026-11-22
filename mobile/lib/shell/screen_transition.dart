import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import 'shaders.dart';
import 'wave.dart';

/// How far the two blurred copies of a screen are softened, and how much
/// smaller than the screen they are kept.
const _blurScale = .25;

/// A wave frame that takes longer than this was dropped. Two in one run and
/// the device is too slow for the lens: the screen is shown at once, the next
/// [_plainRuns] changes crossfade, and then the wave is given another go.
/// The wait doubles each time it fails again.
const _frameBudget = Duration(milliseconds: 120);
const _plainRuns = 6;
const _longestWait = 48;

final List<List<double>> _palette = [
  for (final c in WaveStyle.colors) oklab(c),
  oklab(WaveStyle.ahead),
  oklab(WaveStyle.behind),
];

/// A screen as the wave samples it: sharp, lightly blurred, heavily blurred.
class _Pictures {
  _Pictures(this.sharp, Size size)
    : near = _blurred(sharp, size, WaveStyle.blurNear),
      far = _blurred(sharp, size, WaveStyle.blur);
  final ui.Image sharp, near, far;

  static ui.Image _blurred(ui.Image source, Size size, double sigma) {
    final w = math.max(1, (size.width * _blurScale).ceil());
    final h = math.max(1, (size.height * _blurScale).ceil());
    final density = source.width / size.width;
    final recorder = ui.PictureRecorder();
    Canvas(recorder)
      ..scale(w / source.width, h / source.height)
      ..drawImage(
        source,
        Offset.zero,
        Paint()
          ..filterQuality = FilterQuality.medium
          ..imageFilter = ui.ImageFilter.blur(
            sigmaX: sigma * density,
            sigmaY: sigma * density,
            tileMode: TileMode.clamp,
          ),
      );
    final picture = recorder.endRecording();
    final image = picture.toImageSync(w, h);
    picture.dispose();
    return image;
  }

  void dispose() {
    sharp.dispose();
    near.dispose();
    far.dispose();
  }
}

class _Run {
  _Run(this.leaving, this.source, this.focus);
  final _Pictures leaving;
  _Pictures? arriving;
  final Rect source;
  final Offset? focus;
  final front = WaveFront();
  final lumps = Float32List(21);

  void dispose() {
    leaving.dispose();
    arriving?.dispose();
  }
}

/// Changes screens the way the web's ScreenTransition does: a wave leaves the
/// control that was pressed, bends and splits the screen on show as it
/// passes, and uncovers the next one behind it. [overlay] (the dock) stays
/// live above the wave. Where the shader cannot run the screens crossfade,
/// and with animations off they simply change.
class ScreenTransition extends StatefulWidget {
  final Object screenKey;
  final Widget child;
  final Widget? overlay;
  const ScreenTransition({
    super.key,
    required this.screenKey,
    required this.child,
    this.overlay,
  });
  @override
  State<ScreenTransition> createState() => _ScreenTransitionState();
}

class _ScreenTransitionState extends State<ScreenTransition>
    with TickerProviderStateMixin {
  late final AnimationController _wave =
      AnimationController(vsync: this, duration: WaveStyle.duration)
        ..addListener(_paced)
        ..addStatusListener(_finished);
  late final AnimationController _fade = AnimationController(
    vsync: this,
    duration: SomnaMotion.fast,
  )..addStatusListener(_finished);
  final _boundary = GlobalKey(), _chrome = GlobalKey();
  ui.FragmentShader? _shader;
  _Run? _run;
  ui.Image? _faded;
  ({Rect rect, Offset at})? _pressed;
  int _trip = 0;
  Duration? _lastFrame;
  int _frames = 0, _late = 0, _rest = 0, _wait = _plainRuns;

  @override
  void initState() {
    super.initState();
    waveShader.load();
  }

  void _finished(AnimationStatus status) {
    if (status != AnimationStatus.completed) return;
    if (_run != null && _late < 2) _wait = _plainRuns;
    setState(_clear);
  }

  void _paced() {
    final now = _wave.lastElapsedDuration;
    if (_run == null || now == null) return;
    final last = _lastFrame;
    _lastFrame = now;
    // The first frames also picture both screens: not the wave's own pace.
    if (last == null || ++_frames < 2 || now - last <= _frameBudget) return;
    if (++_late < 2) return;
    _rest = _wait;
    _wait = math.min(_wait * 2, _longestWait);
    setState(_clear);
  }

  void _clear() {
    _run?.dispose();
    _run = null;
    _faded?.dispose();
    _faded = null;
    _wave.stop();
    _fade.stop();
  }

  /// The view's size. Read from the render object: asking the element is not
  /// allowed while widgets build, which is when a screen changes.
  Size? get _size {
    final box = context.findRenderObject();
    return box is RenderBox && box.hasSize ? box.size : null;
  }

  ui.Image? _capture() {
    final boundary = _boundary.currentContext?.findRenderObject();
    if (boundary is! RenderRepaintBoundary ||
        !boundary.hasSize ||
        boundary.size.isEmpty) {
      return null;
    }
    var pending = false;
    assert(() {
      pending = boundary.debugNeedsPaint;
      return true;
    }());
    if (pending) return null;
    try {
      return boundary.toImageSync(
        pixelRatio: MediaQuery.devicePixelRatioOf(context),
      );
    } catch (_) {
      return null;
    }
  }

  @override
  void didUpdateWidget(ScreenTransition old) {
    super.didUpdateWidget(old);
    if (old.screenKey == widget.screenKey) return;
    final pressed = _pressed;
    _pressed = null;
    final run = _run;
    if (run != null &&
        !MediaQuery.disableAnimationsOf(context) &&
        _wave.value * WaveStyle.total < WaveStyle.anticipation) {
      // The wave is still gathering: the screen on show is the one leaving,
      // and it now leaves for this screen instead.
      _arrive(run);
      return;
    }
    final size = _size;
    final leaving = _capture();
    _clear();
    if (leaving == null ||
        size == null ||
        MediaQuery.disableAnimationsOf(context)) {
      leaving?.dispose();
      return;
    }
    final plain = _rest > 0;
    if (plain) _rest--;
    _shader ??= _newShader();
    if (_shader == null || plain) {
      _faded = leaving;
      _fade.forward(from: 0);
      return;
    }
    final next = _run = _Run(
      _Pictures(leaving, size),
      pressed?.rect ?? defaultWaveSource(size),
      pressed?.at,
    );
    _arrive(next);
    _lastFrame = null;
    _frames = _late = 0;
    _wave.forward(from: 0);
  }

  ui.FragmentShader? _newShader() {
    try {
      return waveShader.program?.fragmentShader();
    } catch (_) {
      return null;
    }
  }

  /// Pictures the arriving screen once it has been drawn.
  void _arrive(_Run run) {
    final trip = ++_trip;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _run != run || trip != _trip) return;
      final size = _size, arriving = _capture();
      if (arriving == null || size == null) return;
      run.arriving?.dispose();
      run.arriving = _Pictures(arriving, size);
    });
  }

  /// The control under the finger, if it is part of [ScreenTransition.overlay]:
  /// the wave leaves from it.
  void _remember(PointerDownEvent event) {
    _pressed = null;
    final own = context.findRenderObject();
    final chrome = _chrome.currentContext?.findRenderObject();
    if (own is! RenderBox || chrome == null) return;
    final result = HitTestResult();
    WidgetsBinding.instance.hitTestInView(result, event.position, event.viewId);
    for (final entry in result.path) {
      final target = entry.target;
      if (target is! RenderPointerListener || target == own) continue;
      RenderObject? up = target;
      while (up != null && up != chrome) {
        up = up.parent;
      }
      if (up == null || !target.hasSize) return;
      _pressed = (
        rect: MatrixUtils.transformRect(
          target.getTransformTo(own),
          Offset.zero & target.size,
        ),
        at: own.globalToLocal(event.position),
      );
      return;
    }
  }

  @override
  void dispose() {
    _clear();
    _wave.dispose();
    _fade.dispose();
    _shader?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final run = _run, shader = _shader, faded = _faded;
    return Listener(
      onPointerDown: _remember,
      child: Stack(
        fit: StackFit.expand,
        children: [
          RepaintBoundary(key: _boundary, child: widget.child),
          if (run != null && shader != null)
            IgnorePointer(
              child: RepaintBoundary(
                child: CustomPaint(painter: _WavePainter(run, shader, _wave)),
              ),
            ),
          if (faded != null)
            IgnorePointer(
              child: FadeTransition(
                opacity: Tween<double>(begin: 1, end: 0).animate(
                  CurvedAnimation(parent: _fade, curve: SomnaMotion.smooth),
                ),
                child: RawImage(image: faded, fit: BoxFit.fill),
              ),
            ),
          if (widget.overlay != null)
            KeyedSubtree(key: _chrome, child: widget.overlay!),
        ],
      ),
    );
  }
}

class _WavePainter extends CustomPainter {
  final _Run run;
  final ui.FragmentShader shader;
  final Animation<double> progress;
  _WavePainter(this.run, this.shader, this.progress) : super(repaint: progress);

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final t = waveFront(
      progress.value,
      run.source,
      size,
      focus: run.focus,
      into: run.front,
    );
    final leaving = run.leaving, arriving = run.arriving;
    final values = <double>[
      size.width,
      size.height,
      t.ox,
      t.oy,
      t.spine,
      t.radius,
      t.squash,
      t.time,
      t.energy,
      t.swell,
      t.gravity,
      t.glow,
      t.clearRadius,
      t.rim,
      t.tilt,
      t.launched ? 1 : 0,
      t.hairClearRadius,
      1,
      WaveStyle.amplitude,
      WaveStyle.lensWidth,
      WaveStyle.aberration,
      WaveStyle.blur,
      WaveStyle.blurAhead,
      WaveStyle.blurBehind,
      WaveStyle.blurNear,
      WaveStyle.strength,
      WaveStyle.lead,
      WaveStyle.tail,
      WaveStyle.rimWidth,
      WaveStyle.rimSoftness,
      WaveStyle.cornerRadius,
      WaveStyle.rimUnevenness,
      WaveStyle.rimPulse,
      WaveStyle.hairlineWidth,
      WaveStyle.hairlineOpacity,
      WaveStyle.hairlineWhite,
      arriving != null ? 1 : 0,
      0,
      for (final c in _palette) ...c,
      ...rimLumps(t.time, size, run.lumps),
    ];
    for (var i = 0; i < values.length; i++) {
      shader.setFloat(i, values[i]);
    }
    shader
      ..setImageSampler(0, leaving.sharp)
      ..setImageSampler(1, leaving.near)
      ..setImageSampler(2, leaving.far)
      ..setImageSampler(3, (arriving ?? leaving).sharp)
      ..setImageSampler(4, (arriving ?? leaving).near)
      ..setImageSampler(5, (arriving ?? leaving).far);
    canvas.drawRect(Offset.zero & size, Paint()..shader = shader);

    final dot = Paint();
    for (final particle in waveParticles) {
      final at = particleAt(particle, t, run.source);
      if (at.alpha <= .004) continue;
      dot.color = Color.fromRGBO(255, 255, 255, at.alpha.clamp(0, 1));
      canvas.drawCircle(Offset(at.x, at.y), particle.size / 2, dot);
    }
  }

  @override
  bool shouldRepaint(_WavePainter old) =>
      old.run != run || old.shader != shader;
}
