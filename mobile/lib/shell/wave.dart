/// The numbers behind the tab wave: a port of the `distortion-waves` engine
/// the web's ScreenTransition drives (vertical type, "colorful" palette).
/// Lengths are logical pixels, times are seconds.
library;

import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter/animation.dart' show Cubic;

abstract final class WaveStyle {
  static const anticipation = .5;
  static const travel = 2.28;
  static const launchGap = 0.0;
  static const linger = -.35;
  static const rimFade = 3.03;
  static const pull = 24.0;
  static const inhale = 56.0;
  static const gatherGlow = .33;
  static const gatherDots = 1.0;
  static const amplitude = 34.0;
  static const lensWidth = 150.0;
  static const aberration = .78;
  static const swell = 22.0;
  static const blur = 18.0;
  static const blurNear = 7.0;
  static const blurAhead = 90.0;
  static const blurBehind = 240.0;
  static const lead = 130.0;
  static const tail = 300.0;
  static const strength = .92;
  static const rimWidth = 14.0;
  static const rimUnevenness = 1.0;
  static const rimStrength = .82;
  static const rimSoftness = 343.0;
  static const cornerRadius = 32.0;
  static const rimPulse = .6;
  static const hairlineWidth = 1.5;
  static const hairlineOpacity = .9;
  static const hairlineWhite = .95;
  static const hairlineLinger = .47;
  static const hairlineFade = 3.0;
  static const orientation = .5;
  static const particleCount = 64;
  static const particleSize = 1.8;
  static const particleReach = 150.0;
  static const particleFlight = 30.0;
  static const particleGap = 24.0;
  static const particleLife = 2.19;
  static const particleSpread = 1.0;

  /// The "colorful" palette, sRGB 0–255.
  static const colors = <List<double>>[
    [255, 201, 21],
    [126, 196, 255],
    [180, 40, 230],
    [235, 100, 160],
    [255, 176, 122],
    [154, 160, 255],
    [127, 217, 238],
  ];
  static const ahead = <double>[255, 122, 182];
  static const behind = <double>[90, 190, 255];

  /// How long one run lasts: the gathering, then whichever of the front, the
  /// rim, the hairline and the particles leaves last.
  static final double total =
      anticipation +
      [
        travel * .6,
        linger + rimFade,
        linger + hairlineLinger + hairlineFade,
        particleLife,
      ].reduce(math.max);
  static Duration get duration => Duration(microseconds: (total * 1e6).round());
}

const _easeOut = Cubic(.22, 1, .36, 1);
const _easeInOut = Cubic(.42, 0, .58, 1);

double _clamp01(double v) => v < 0 ? 0 : (v > 1 ? 1 : v);
double smooth(double a, double b, double x) {
  final t = _clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

double _fract(double v) => v - v.floorToDouble();

/// The wave front at one moment of a run.
class WaveFront {
  double ox = 0, oy = 0, tilt = 0, spine = 0, radius = 0, moved = 0;
  double squash = 1, time = 0, energy = 0, swell = 0, gravity = 0, glow = 0;
  double clearRadius = 0, hairClearRadius = 0, rim = 0, sparkle = 0, flying = 0;
  bool launched = false, hasCleared = false;
}

/// Where the front is at [progress] (0–1 of [WaveStyle.total]) for a wave
/// leaving [source] across a [size] view; [focus] is the finger, which leans
/// the front toward the side it pressed.
WaveFront waveFront(
  double progress,
  Rect source,
  Size size, {
  Offset? focus,
  WaveFront? into,
}) {
  final total = WaveStyle.total;
  final r = _clamp01(progress) * total;
  final c = r - WaveStyle.anticipation;
  final u = smooth(0, WaveStyle.anticipation, r);
  final h = _clamp01(c / WaveStyle.travel);
  final f = _easeOut.transform(h);
  const stretch = 1.4;
  final cx = source.center.dx, cy = source.center.dy;
  final half = math.min(source.width, source.height) / 2;
  final span = source.width;
  final spine = math.max(0.0, span / 2 - half);
  var lean = 0.0;
  if (focus != null) {
    lean = ((focus.dx - cx) / math.max(span / 2, 1)).clamp(-1.0, 1.0);
  }
  final shift = lean * span / 2 * WaveStyle.orientation;
  final turn = lean * WaveStyle.orientation * .45;
  final cs = math.cos(turn), sn = math.sin(turn);
  var reach = 0.0;
  for (var q = 0; q < 4; q++) {
    final x = (q & 1 != 0 ? size.width : 0) - cx - shift;
    final y = (q & 2 != 0 ? size.height : 0) - cy;
    final along = (cs * x + sn * y) * stretch, across = -sn * x + cs * y;
    reach = math.max(reach, math.sqrt(along * along + across * across));
  }
  final clear = reach + (WaveStyle.swell + 60) * stretch;
  final fade = 1 - smooth(.2, .55, h);
  final rest = half + math.max(WaveStyle.launchGap, 0);
  final radius = c < 0
      ? rest + WaveStyle.inhale * (1 - u)
      : rest + (clear + 100 - rest) * f;
  final gather = math.min(.5 * math.max(WaveStyle.gatherGlow, 0), 1.0);
  final inner = half - WaveStyle.rimSoftness;
  final outer = reach + (WaveStyle.rimSoftness + WaveStyle.swell) * stretch;
  final settle = smooth(0, .1, f);
  double fadeOut(double at, double over) =>
      _easeInOut.transform(_clamp01((c - at) / math.max(over, .01)));
  return (into ?? WaveFront())
    ..ox = cx + shift * settle
    ..oy = cy
    ..tilt = turn * settle
    ..spine = spine * (1 - smooth(0, .45, f))
    ..radius = radius
    ..moved = f
    ..squash = 1 + (stretch - 1) * smooth(0, .5, f)
    ..time = r
    ..energy = smooth(0, .05, h) * fade
    ..swell = WaveStyle.swell * smooth(0, .3, f)
    ..gravity = WaveStyle.pull * u * (1 - smooth(0, .22, c))
    ..glow = c < 0
        ? gather * u
        : (gather + (1 - gather) * smooth(0, .07, h)) * fade
    ..clearRadius =
        inner + (outer - inner) * fadeOut(WaveStyle.linger, WaveStyle.rimFade)
    ..hairClearRadius =
        inner +
        (outer - inner) *
            fadeOut(
              WaveStyle.linger + WaveStyle.hairlineLinger,
              WaveStyle.hairlineFade,
            )
    ..rim =
        WaveStyle.rimStrength *
        smooth(0, .1, h) *
        (1 - smooth(.9, 1, r / total))
    ..sparkle = smooth(0, WaveStyle.anticipation * .35, r)
    ..flying = math.max(c, 0)
    ..launched = c > 0
    ..hasCleared = radius > clear;
}

double _lumpHash(int i, double a, double b) =>
    _fract(math.sin(i * a + b) * 43758.5453);

/// Seven thick spots drifting round the screen's rim: for each, where along
/// the outline it sits, how wide it is and how much it adds.
Float32List rimLumps(double time, Size size, [Float32List? into]) {
  const count = 7, pulse = WaveStyle.rimPulse, corner = WaveStyle.cornerRadius;
  final ex = math.max(size.width / 2 - corner, 0.0);
  final ey = math.max(size.height / 2 - corner, 0.0);
  final outline = 4 * (ex + ey + .5 * math.pi * corner);
  final out = into ?? Float32List(count * 3);
  for (var i = 0; i < count; i++) {
    final u = _lumpHash(i, 12.9898, 1.3);
    final h = _lumpHash(i, 78.233, 4.1);
    final f = _lumpHash(i, 39.425, 2.7);
    final beat =
        (.25 + .3 * pulse) *
        math.sin(time * (1.1 + 1.2 * u) * (1 + pulse) + i * 2.4);
    out[i * 3] =
        outline * (i + .35 * u) / count +
        time * (-22 + 44 * h) * (1 + 2 * pulse);
    out[i * 3 + 1] = outline / count * (.2 + .25 * f);
    out[i * 3 + 2] = (.2 + 2.6 * h) * (1 + beat);
  }
  return out;
}

class WaveParticle {
  final int index;
  final double column, pace, drift, sway, swayRate, twinkleRate, phase;
  final double life, size, brightness, hop, hopOffset;
  const WaveParticle({
    required this.index,
    required this.column,
    required this.pace,
    required this.drift,
    required this.sway,
    required this.swayRate,
    required this.twinkleRate,
    required this.phase,
    required this.life,
    required this.size,
    required this.brightness,
    required this.hop,
    required this.hopOffset,
  });
}

final List<WaveParticle> waveParticles = List.generate(
  WaveStyle.particleCount,
  (e) {
    final i = e + 1;
    double n(double a) => (i * a) % 1;
    final o = n(.5497004779);
    return WaveParticle(
      index: i,
      column: (n(.7548776662) * 2 - 1) * .92,
      pace: .35 + .72 * math.sqrt(n(.8191725134)),
      drift: 15 + 50 * n(.6710436067),
      sway: 3 + 11 * n(.4142135624),
      swayRate: 2.5 + 3.5 * n(.7320508076),
      twinkleRate: 8 + 12 * n(.2360679775),
      phase: n(.6180339887) * 2 * math.pi,
      life: WaveStyle.particleLife * (.4 + .6 * n(.6457513111)),
      size: WaveStyle.particleSize * (.55 + .45 * o * o),
      brightness: .3 + .7 * n(.6055512755),
      hop: .16 + .14 * n(.1231056256),
      hopOffset: n(.472135955),
    );
  },
  growable: false,
);

double _dotHash(int a, double b, double c) =>
    _fract(math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453);

/// One particle's place and opacity: hopping toward the source while the wave
/// gathers, then carried up the screen with the front.
({double x, double y, double alpha}) particleAt(
  WaveParticle s,
  WaveFront t,
  Rect source,
) {
  final twinkle = .5 + .5 * math.sin(t.time * s.twinkleRate + s.phase);
  final lit = s.brightness * (.7 + .3 * twinkle);
  const spread = WaveStyle.particleSpread;
  final cx = source.center.dx, cy = source.center.dy;
  final halfW = source.width / 2, halfH = source.height / 2;
  final half = math.min(halfW, halfH);
  if (!t.launched) {
    final beat = t.time / s.hop + s.hopOffset;
    final hop = beat.floorToDouble(), y = beat - hop;
    final blink = smooth(0, .25, y) * (1 - smooth(.55, 1, y));
    final leaving =
        1 -
        smooth(WaveStyle.anticipation * .75, WaveStyle.anticipation, t.time);
    final z = (_dotHash(s.index, hop, 1) * 2 - 1) * (halfW + 24);
    const near = WaveStyle.particleGap + WaveStyle.particleFlight;
    final above =
        halfH +
        near +
        math.max(WaveStyle.particleReach - near, 0) * _dotHash(s.index, hop, 2);
    final landing = z.clamp(-halfW + half, halfW - half);
    final px = cx + z, py = cy - above;
    final dx = (cx + landing) - px, dy = (cy - halfH) - py;
    final len = math.max(math.sqrt(dx * dx + dy * dy), 1.0);
    final flown = WaveStyle.particleFlight * y * y;
    return (
      x: px + dx / len * flown,
      y: py + dy / len * flown,
      alpha: t.sparkle * blink * leaving * lit * WaveStyle.gatherDots,
    );
  }
  final alpha = (1 - smooth(s.life * .55, s.life, t.flying)) * lit;
  final sway =
      s.sway *
      math.sin(s.swayRate * t.flying + s.phase) *
      math.min(t.flying / .25, 1);
  final widen = 1 + .22 * t.moved * s.pace * spread;
  final across = s.column * halfW * widen + sway;
  final up =
      (half + (t.radius - half) * s.pace * spread) *
          (1 - .3 * s.column * s.column) +
      s.drift * t.flying * spread;
  final g = math.cos(t.tilt), a = math.sin(t.tilt);
  return (
    x: t.ox + g * across + a * up,
    y: t.oy + a * across - g * up,
    alpha: alpha,
  );
}

/// sRGB 0–255 to OKLab, the space the shader mixes the band's colours in.
List<double> oklab(List<double> rgb) {
  double lin(double v) {
    final c = v / 255;
    return c <= .04045
        ? c / 12.92
        : math.pow((c + .055) / 1.055, 2.4) as double;
  }

  double cbrt(double v) => math.pow(v, 1 / 3) as double;
  final r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
  final l = cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  final m = cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  final s = cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [
    .2104542553 * l + .793617785 * m - .0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .808675766 * s,
  ];
}

/// Where the wave leaves from when no control was pressed: the dock's bar.
Rect defaultWaveSource(Size size) {
  final w = math.min(size.width - 48, 345.0);
  return Rect.fromLTWH((size.width - w) / 2, size.height - 82, w, 58);
}
