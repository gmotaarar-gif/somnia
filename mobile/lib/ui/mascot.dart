import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:material_ui/material_ui.dart';

import '../data/store.dart';

enum MascotState { idle, working, sleeping }

/// Asleep through night mode and from 23:00 to 06:00, busy while a practice
/// runs, otherwise idle (Mascot.tsx).
MascotState mascotState(bool nightMode, bool active, int hour) {
  if (nightMode) return MascotState.sleeping;
  if (active) return MascotState.working;
  return hour >= 23 || hour < 6 ? MascotState.sleeping : MascotState.idle;
}

/// Somna's cloud. It follows the app: asleep at night, hopping while a
/// practice is on ([active], or the grounding sheet is open).
class Mascot extends StatefulWidget {
  final double size;
  final bool active;
  final DateTime Function() clock;
  const Mascot({
    super.key,
    this.size = 64,
    this.active = false,
    this.clock = DateTime.now,
  });
  @override
  State<Mascot> createState() => _MascotState();
}

class _MascotState extends State<Mascot> {
  late final Timer _minute = Timer.periodic(
    const Duration(minutes: 1),
    (_) => setState(() {}),
  );

  @override
  void initState() {
    super.initState();
    _minute;
  }

  @override
  void dispose() {
    _minute.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context);
    return CloudAvatar(
      size: widget.size,
      state: mascotState(
        store.nightMode,
        widget.active || store.sheet == 'grounding',
        widget.clock().hour,
      ),
    );
  }
}

const _deg = math.pi / 180;
const _turn = math.pi * 2;
const _ink = Color(0xff1e1a33);
const _hop = .68;

double _ease(double t) {
  final x = t.clamp(0.0, 1.0);
  return x * x * (3 - 2 * x);
}

/// A squash that peaks as a hop leaves and lands.
double _thump(double t) =>
    math.exp(-math.pow(math.min(t.abs(), (t - 1).abs()) / .11, 2));

double _toward(double from, double to, double rate, double dt) =>
    from + (to - from) * (1 - math.exp(-rate * dt));

class _Pose {
  double yaw = 0, pitch = 0, roll = 0, y = 0, sx = 1, sy = 1;
  double laugh = 0, blink = 0, lookX = 0, lookY = 0, breath = 0;

  /// How much of each state shows: idle, working, sleeping.
  final w = <double>[1, 0, 0];
}

const _rest =
    <MascotState, ({double pitch, double roll, double y, double lookY})>{
      MascotState.idle: (pitch: 0, roll: 0, y: 0, lookY: 0),
      MascotState.working: (pitch: 5 * _deg, roll: 0, y: 0, lookY: 0),
      MascotState.sleeping: (pitch: -16 * _deg, roll: 6 * _deg, y: 3, lookY: 1),
    };
const _blend = <MascotState, double>{
  MascotState.idle: 1.2,
  MascotState.working: .7,
  MascotState.sleeping: 1.4,
};

/// The cloud's life, a port of the bot-avatars motion the web runs: it looks
/// about and blinks when idle, hops and laughs when working, breathes slowly
/// and nods off when asleep.
class _Life {
  _Life(this.state, int seed) : _random = math.Random(seed) {
    pose.w.setAll(0, _weights(state));
    _settle();
  }
  MascotState state;
  final math.Random _random;
  final pose = _Pose();
  double _clock = 0, _breath = 0;
  List<double> _from = [1, 0, 0];
  double _blendTime = 0, _blendFor = 0;
  double _gazeAt = 1.2, _blinkAt = 1.6, _laughAt = 1, _nodAt = 3;
  double _yaw = 0, _pitch = 0, _roll = 0, _aimYaw = 0, _aimPitch = 0;
  double _aimRoll = 0;
  (int, int) _gaze = (0, 0);
  double _blink = -1, _laugh = -1, _laughFor = 1, _nod = -1;
  double _hopPhase = 0, _laughing = 0;
  int _hops = 0;

  static List<double> _weights(MascotState s) => [
    for (final v in MascotState.values) v == s ? 1.0 : 0.0,
  ];

  void to(MascotState next) {
    if (next == state) return;
    _from = List.of(pose.w);
    _blendFor = state == MascotState.sleeping ? 1 : _blend[next]!;
    _blendTime = 0;
    state = next;
    if (next != MascotState.idle) _aimYaw = _aimPitch = _aimRoll = 0;
  }

  /// The pose a still picture shows.
  void _settle() {
    final rest = _rest[state]!;
    pose
      ..pitch = rest.pitch
      ..roll = rest.roll
      ..y = rest.y
      ..lookY = rest.lookY;
  }

  (int, int) _nextGaze() {
    final (x, y) = _gaze;
    if (x != 0 || y != 0) {
      final r = _random.nextDouble();
      return r < .66 ? (-x, -y) : (r < .85 ? (-x, y) : (0, 0));
    }
    const first = [(1, -1), (-1, 1), (1, 1), (-1, -1), (1, 0), (-1, 0)];
    return first[_random.nextInt(first.length)];
  }

  void update(double dt) {
    _clock += dt;
    final now = _clock, w = pose.w;
    if (_blendFor > 0) {
      _blendTime += dt;
      final k = _ease(_blendTime / _blendFor), target = _weights(state);
      for (var i = 0; i < 3; i++) {
        w[i] = _from[i] + (target[i] - _from[i]) * k;
      }
      if (_blendTime >= _blendFor) _blendFor = 0;
    }
    final working = w[1], asleep = w[2];
    var pitch = 0.0, roll = 0.0, y = 0.0, lookY = 0.0;
    for (final s in MascotState.values) {
      final rest = _rest[s]!, k = w[s.index];
      pitch += rest.pitch * k;
      roll += rest.roll * k;
      y += rest.y * k;
      lookY += rest.lookY * k;
    }

    if (state == MascotState.idle && now >= _gazeAt) {
      _gaze = _nextGaze();
      final reach = .84 + _random.nextDouble() * .16;
      _aimYaw = _gaze.$1 * 35 * _deg * reach;
      _aimPitch = _gaze.$2 * 14 * _deg * reach;
      _aimRoll = _gaze.$1 * 3.2 * _deg * reach;
      _gazeAt = now + 2.6 + _random.nextDouble() * 1.8;
    }
    _yaw = _toward(_yaw, _aimYaw, 4, dt);
    _pitch = _toward(_pitch, _aimPitch, 4, dt);
    _roll = _toward(_roll, _aimRoll, 4, dt);

    var blink = 0.0;
    if (now >= _blinkAt && _blink < 0 && w[0] + working > .5) {
      _blink = 0;
      _blinkAt = now + 2.2 + _random.nextDouble() * 2.6;
    }
    if (_blink >= 0) {
      _blink += dt / .17;
      if (_blink >= 1) {
        _blink = -1;
      } else {
        blink = math.sin(math.pi * _blink);
      }
    }

    var spin = 0.0, lift = 0.0, sx = 1.0, sy = 1.0, lean = 0.0, laugh = 0.0;
    if (state == MascotState.working || _hopPhase > 0) {
      _hopPhase += dt / _hop;
      if (_hopPhase >= 1) {
        if (state == MascotState.working) {
          _hopPhase -= 1;
          _hops++;
        } else {
          _hopPhase = 0;
        }
      }
      final gain = working, q = math.min(1.0, _hopPhase);
      final arc = math.sin(math.pi * q), high = _hops % 3 == 2;
      lift -= (high ? 26 : 18) * arc * gain;
      final thump = _thump(_hopPhase);
      sx += (.16 * thump - .06 * arc) * gain;
      sy += (-.18 * thump + .09 * arc) * gain;
      if (high) {
        spin = _turn * _ease(q) * gain;
        laugh = arc * gain;
      }
      lean = (_hops.isEven ? 1 : -1) * 6 * _deg * arc * gain;
    }
    if (state == MascotState.working && now >= _laughAt && _laugh < 0) {
      _laugh = 0;
      _laughFor = .6 + _random.nextDouble() * .5;
      _laughAt = now + 1.6 + _random.nextDouble() * 2.2;
    }
    if (_laugh >= 0) {
      _laugh += dt / _laughFor;
      if (_laugh >= 1) {
        _laugh = -1;
      } else {
        final p = _laugh;
        laugh = math.max(
          laugh,
          p < .18 ? p / .18 : (p > .78 ? (1 - p) / .22 : 1),
        );
      }
    }

    var nod = 0.0;
    if (state == MascotState.sleeping && now >= _nodAt && _nod < 0) {
      _nod = 0;
      _nodAt = now + 4 + _random.nextDouble() * 4;
    }
    if (_nod >= 0) {
      _nod += dt / 1.7;
      if (_nod >= 1) {
        _nod = -1;
      } else {
        final p = _nod;
        nod =
            -13 *
            _deg *
            asleep *
            (p < .72 ? _ease(p / .72) : 1 - _ease((p - .72) / .28));
      }
    }

    _breath += dt / (3.6 + 1.2 * asleep);
    final breath = math.sin(_breath * _turn);
    sx += breath * (.008 + .014 * asleep);
    sy += breath * (.012 + .02 * asleep);
    final bob = math.sin(now * _turn / 3.4) * 2 * (1 - asleep);
    _laughing = _toward(_laughing, laugh, 30, dt);
    pose
      ..yaw = _yaw + spin
      ..pitch = pitch + _pitch + nod
      ..roll = roll + _roll + lean
      ..y = y + lift + bob
      ..sx = sx
      ..sy = sy
      ..laugh = _laughing
      ..blink = blink
      ..lookX = 0
      ..lookY = lookY
      ..breath = breath;
  }
}

/// The bot-avatars "cloud" with the "eyes" face, smooth shading.
class CloudAvatar extends StatefulWidget {
  final MascotState state;
  final double size;
  final Color color;
  const CloudAvatar({
    super.key,
    required this.state,
    this.size = 64,
    this.color = const Color(0xffc4cafa),
  });
  @override
  State<CloudAvatar> createState() => _CloudAvatarState();
}

class _CloudAvatarState extends State<CloudAvatar>
    with SingleTickerProviderStateMixin {
  late final _life = _Life(widget.state, 7);
  late final Ticker _ticker = createTicker(_tick);
  final _frame = ValueNotifier(0);
  Duration _last = Duration.zero;

  void _tick(Duration elapsed) {
    final dt = (elapsed - _last).inMicroseconds / 1e6;
    _last = elapsed;
    _life.update(math.min(.05, dt));
    _frame.value++;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.disableAnimationsOf(context);
    if (still && _ticker.isActive) {
      _ticker.stop();
      _rest();
    } else if (!still && !_ticker.isActive) {
      _last = Duration.zero;
      _ticker.start();
    }
  }

  @override
  void didUpdateWidget(CloudAvatar old) {
    super.didUpdateWidget(old);
    if (_ticker.isActive) {
      _life.to(widget.state);
    } else {
      _rest();
    }
  }

  /// With animations off the cloud holds its state's pose.
  void _rest() {
    _life
      ..state = widget.state
      ..pose.w.setAll(0, _Life._weights(widget.state))
      .._settle();
    _frame.value++;
  }

  @override
  void dispose() {
    _ticker.dispose();
    _frame.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: IgnorePointer(
      child: RepaintBoundary(
        child: CustomPaint(
          size: Size.square(widget.size),
          painter: _CloudPainter(_life.pose, widget.color, _frame),
        ),
      ),
    ),
  );
}

final Path _cloud = Path()
  ..addOval(Rect.fromCircle(center: const Offset(44, 44), radius: 25))
  ..addOval(Rect.fromCircle(center: const Offset(68, 50), radius: 21))
  ..addOval(Rect.fromCircle(center: const Offset(24, 68), radius: 17))
  ..addOval(Rect.fromCircle(center: const Offset(50, 73), radius: 18))
  ..addOval(Rect.fromCircle(center: const Offset(76, 70), radius: 16));

const _layers = 17, _depth = 9.75, _rim = .95;
// Light from the upper left (300°).
const _lx = -.8660254, _ly = -.5;

double _upright(double v) => v.abs() < .22 ? (v < 0 ? -.22 : .22) : v;

class _CloudPainter extends CustomPainter {
  final _Pose pose;
  final Color color;
  _CloudPainter(this.pose, this.color, Listenable frame)
    : super(repaint: frame);

  Float64List _slice(
    double depth,
    double scale,
    double cy,
    double sy,
    double cp,
    double sp,
  ) {
    final a = cy * scale, b = sy * sp * scale, d = cp * scale;
    return Float64List.fromList([
      a,
      b,
      0,
      0,
      0,
      d,
      0,
      0,
      0,
      0,
      1,
      0,
      depth * sy * _depth - 50 * a,
      -depth * cy * sp * _depth - 50 * b - 50 * d,
      0,
      1,
    ]);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final p = pose, unit = size.shortestSide / 100;
    final cy = _upright(math.cos(p.yaw)), sy = math.sin(p.yaw);
    final cp = _upright(math.cos(p.pitch)), sp = math.sin(p.pitch);
    final facing = math.cos(p.yaw) * math.cos(p.pitch);
    final grounded = 50 * (1 - p.sy) * unit;
    canvas.save();
    canvas.translate(
      size.width / 2 - math.sin(p.roll) * grounded,
      size.height / 2 +
          .1 * size.shortestSide +
          p.y * unit +
          math.cos(p.roll) * grounded,
    );
    canvas.rotate(p.roll);
    canvas.scale(p.sx * unit, p.sy * unit);

    // The body: slices from back to front, the far ones in shade.
    final hsl = HSLColor.fromColor(color);
    final far = hsl
        .withSaturation((hsl.saturation + .04375).clamp(0, 1))
        .withLightness((hsl.lightness - .105).clamp(0, 1))
        .toColor();
    final body = Path(), fill = Paint();
    final toward = facing >= 0 ? 1 : -1;
    for (var i = 0; i < _layers; i++) {
      final along = i / (_layers - 1);
      final depth = -1 + 2 * (toward > 0 ? i : _layers - 1 - i) / (_layers - 1);
      final scale =
          _rim + (1 - _rim) * math.sqrt(math.max(0, 1 - depth * depth));
      final slice = _cloud.transform(_slice(depth, scale, cy, sy, cp, sp));
      fill.color = along >= .5 ? color : Color.lerp(far, color, along / .5)!;
      canvas.drawPath(slice, fill);
      body.addPath(slice, Offset.zero);
    }
    canvas.save();
    canvas.clipPath(body);
    const all = Rect.fromLTRB(-120, -120, 120, 120);
    canvas.drawRect(
      all,
      Paint()
        ..blendMode = BlendMode.multiply
        ..shader = ui.Gradient.radial(
          const Offset(-_lx * 45, -_ly * 45),
          130.2,
          const [Color(0x1e000000), Color(0x0b000000), Color(0x00000000)],
          const [.048, .524, 1],
        ),
    );
    canvas.drawRect(
      all,
      Paint()
        ..shader = ui.Gradient.radial(
          const Offset(_lx * 37, _ly * 37),
          96.1,
          const [Color(0x49ffffff), Color(0x11ffffff), Color(0x00ffffff)],
          const [0, .6, 1],
        ),
    );
    canvas.restore();

    if (facing > -.2) {
      canvas.clipPath(
        _cloud.transform(_slice(toward.toDouble(), _rim, cy, sy, cp, sp)),
      );
      canvas.translate(0, 8);
      canvas.scale(.95);
      _eyes(canvas);
    }
    canvas.restore();
  }

  void _eyes(Canvas canvas) {
    final p = pose, w = p.w;
    double dead(double v, double zone) =>
        v.abs() <= zone ? 0 : v.sign * (v.abs() - zone) / (1 - zone);
    final lift = dead((-p.pitch / .26 - p.lookY / 7).clamp(-1, 1), .34);
    final side = dead((p.lookX / 4.5).clamp(-1, 1), .4).abs();
    final tall = math.max(.3, 1 + .55 * lift - .1 * side);
    final wide = 1 - .05 * lift + .12 * side;
    final awake = w[0] + w[1] * (1 - p.laugh), laughing = w[1] * p.laugh;
    final asleep = w[2];
    final air = math.max(0, -p.y) / 26, breath = .5 + .5 * p.breath;
    final open = awake * (1 - p.blink), shut = awake * p.blink;
    final half = open * .01 + shut * 5.4 + laughing * 6.2 + asleep * 6;
    final ends =
        open * 1.1 * tall +
        shut * .6 +
        laughing * (2.2 - air * 1.5) +
        asleep * (-1.4 + breath);
    final middle =
        open * -3.3 * tall +
        shut * .6 +
        laughing * (-11.4 - 4 * air) +
        asleep * (5.4 + 2 * breath);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth =
          open * 12.6 * wide + shut * 2.8 + laughing * 4.4 + asleep * 4;
    final eye = Path()..moveTo(-half, ends);
    for (var i = 1; i <= 8; i++) {
      final f = i / 8, b = 1 - f;
      eye.lineTo(
        b * b * -half + f * f * half,
        (b * b + f * f) * ends + 2 * b * f * middle,
      );
    }
    final lookX = p.lookX * (open + .5 * (shut + laughing));
    final lookY = p.lookY * (open + .5 * shut);
    for (final s in const [-1, 1]) {
      // Each eye sits on a sphere of radius 30 that turns with the head.
      const r = 30.0;
      final x = s * 12.5 + lookX, y = 1 + lookY;
      final a = math.asin((x / r).clamp(-1, 1)) + p.yaw;
      final e = math.asin((-y / r).clamp(-1, 1)) + p.pitch;
      final z = math.cos(a) * math.cos(e);
      if (z <= .02) continue;
      canvas.save();
      canvas.translate(r * math.sin(a) * math.cos(e), -r * math.sin(e));
      canvas.scale(math.max(.02, math.cos(a)), math.max(.02, math.cos(e)));
      stroke.color = _ink.withValues(alpha: math.min(1, z * 5));
      canvas.drawPath(eye, stroke);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_CloudPainter old) =>
      old.pose != pose || old.color != color;
}
