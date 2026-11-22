import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';

import '../data/store.dart';

/// Port of the web `lib/audio.ts`: the same pink noise, rain and drone, but
/// rendered to a looping PCM buffer instead of a live Web Audio graph.
const soundModes = ['off', 'pink', 'rain', 'drone'];
const sampleRate = 44100;

class _Biquad {
  double b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  double _x1 = 0, _x2 = 0, _y1 = 0, _y2 = 0;

  /// Web Audio lowpass: Q is the resonance in dB (default 1).
  void lowpass(double frequency, [double q = 1]) {
    final w = 2 * math.pi * frequency / sampleRate;
    final alpha = math.sin(w) / (2 * math.pow(10, q / 20));
    final cos = math.cos(w), a0 = 1 + alpha;
    b0 = (1 - cos) / 2 / a0;
    b1 = (1 - cos) / a0;
    b2 = b0;
    a1 = -2 * cos / a0;
    a2 = (1 - alpha) / a0;
  }

  void bandpass(double frequency, double q) {
    final w = 2 * math.pi * frequency / sampleRate;
    final alpha = math.sin(w) / (2 * q), a0 = 1 + alpha;
    b0 = alpha / a0;
    b1 = 0;
    b2 = -alpha / a0;
    a1 = -2 * math.cos(w) / a0;
    a2 = (1 - alpha) / a0;
  }

  double process(double x) {
    final y = b0 * x + b1 * _x1 + b2 * _x2 - a1 * _y1 - a2 * _y2;
    _x2 = _x1;
    _x1 = x;
    _y2 = _y1;
    _y1 = y;
    return y;
  }
}

Float64List _pinkNoise(int length, math.Random random) {
  final out = Float64List(length);
  double b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (var i = 0; i < length; i++) {
    final white = random.nextDouble() * 2 - 1;
    b0 = .99886 * b0 + white * .0555179;
    b1 = .99332 * b1 + white * .0750759;
    b2 = .96900 * b2 + white * .1538520;
    b3 = .86650 * b3 + white * .3104856;
    b4 = .55000 * b4 + white * .5329522;
    b5 = -.7616 * b5 - white * .0168980;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * .5362) * .08;
    b6 = white * .115926;
  }
  return out;
}

/// Folds the tail of [samples] into its head so the first [length] samples
/// repeat without a click.
Float64List _seamless(Float64List samples, int length) {
  final overlap = samples.length - length, out = Float64List(length);
  for (var i = 0; i < length; i++) {
    if (i < overlap) {
      final t = i / overlap * math.pi / 2;
      out[i] = samples[i] * math.sin(t) + samples[length + i] * math.cos(t);
    } else {
      out[i] = samples[i];
    }
  }
  return out;
}

/// One loop of [mode] as mono samples in −1…1; empty for `off`.
Float64List renderSound(String mode, {math.Random? random}) {
  final rng = random ?? math.Random();
  const overlap = sampleRate ~/ 2;
  switch (mode) {
    case 'pink':
      const length = sampleRate * 6;
      final noise = _pinkNoise(length + overlap, rng);
      final filter = _Biquad()..lowpass(520);
      for (var i = 0; i < noise.length; i++) {
        noise[i] = filter.process(noise[i]);
      }
      return _seamless(noise, length);
    case 'rain':
      // One turn of the 0.14 Hz sweep, so the filter also loops.
      const length = sampleRate * 50 ~/ 7;
      final noise = _pinkNoise(length + overlap, rng);
      final filter = _Biquad();
      for (var i = 0; i < noise.length; i++) {
        if (i % 32 == 0) {
          filter.bandpass(
            880 + 260 * math.sin(2 * math.pi * .14 * i / sampleRate),
            .55,
          );
        }
        noise[i] = filter.process(noise[i]);
      }
      return _seamless(noise, length);
    case 'drone':
      // Warm 216 + 324 + 432.5 Hz pad; four seconds hold whole periods of all.
      const length = sampleRate * 4;
      final out = Float64List(length);
      const voices = [
        (216.0, .45, false),
        (324.0, .2, true),
        (432.5, .15, true),
      ];
      for (final (frequency, gain, triangle) in voices) {
        final filter = _Biquad()..lowpass(620);
        // The first pass only settles the filter.
        for (var i = -length; i < length; i++) {
          final phase = (frequency * i / sampleRate) % 1;
          final wave = triangle
              ? 1 - 4 * ((phase + .25) % 1 - .5).abs()
              : math.sin(2 * math.pi * phase);
          final y = filter.process(wave);
          if (i >= 0) out[i] += y * gain;
        }
      }
      return out;
    default:
      return Float64List(0);
  }
}

/// 16-bit mono WAV.
Uint8List encodeWav(Float64List samples) {
  final data = ByteData(44 + samples.length * 2);
  void tag(int at, String text) {
    for (var i = 0; i < 4; i++) {
      data.setUint8(at + i, text.codeUnitAt(i));
    }
  }

  tag(0, 'RIFF');
  data.setUint32(4, 36 + samples.length * 2, Endian.little);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  data.setUint32(16, 16, Endian.little);
  data.setUint16(20, 1, Endian.little);
  data.setUint16(22, 1, Endian.little);
  data.setUint32(24, sampleRate, Endian.little);
  data.setUint32(28, sampleRate * 2, Endian.little);
  data.setUint16(32, 2, Endian.little);
  data.setUint16(34, 16, Endian.little);
  tag(36, 'data');
  data.setUint32(40, samples.length * 2, Endian.little);
  for (var i = 0; i < samples.length; i++) {
    data.setInt16(
      44 + i * 2,
      (samples[i].clamp(-1.0, 1.0) * 32767).round(),
      Endian.little,
    );
  }
  return data.buffer.asUint8List();
}

/// What the engine needs from a native player.
abstract interface class SoundOutput {
  Future<void> loop(String mode, Uint8List wav);
  Future<void> setVolume(double volume);
  Future<void> stop();
  Future<void> dispose();
}

class JustAudioOutput implements SoundOutput {
  AudioPlayer? _player;
  double _volume = 1;
  @override
  Future<void> loop(String mode, Uint8List wav) async {
    final file = File(
      '${(await getTemporaryDirectory()).path}/somna-$mode.wav',
    );
    await file.writeAsBytes(wav, flush: true);
    final player = _player ??= AudioPlayer();
    await player.stop();
    await player.setFilePath(file.path);
    await player.setLoopMode(LoopMode.one);
    await player.setVolume(_volume);
    unawaited(player.play());
  }

  @override
  Future<void> setVolume(double volume) async {
    _volume = volume;
    await _player?.setVolume(volume);
  }

  @override
  Future<void> stop() async => _player?.stop();
  @override
  Future<void> dispose() async {
    final player = _player;
    _player = null;
    await player?.dispose();
  }
}

/// Plays the night sound the store asks for: on while night mode runs with a
/// sound picked, faded in over 0.8 s and out over 0.35 s like the web engine.
class SleepAudio {
  final SomnaStore store;
  final SoundOutput output;
  final Float64List Function(String mode) render;
  String _mode = 'off';
  double _gain = 0, _target = 0;
  Timer? _fade;
  Future<void> _queue = Future.value();
  bool _disposed = false;

  SleepAudio(this.store, {SoundOutput? output, this.render = renderSound})
    : output = output ?? JustAudioOutput() {
    store.addListener(_sync);
    _sync();
  }

  String get mode => _mode;

  /// The web's master gain: the profile volume, scaled to 0…0.45.
  double get volume => (store.volume / 100).clamp(0, 1) * .45;

  void _run(Future<void> Function() job) {
    _queue = _queue.then((_) async {
      if (_disposed) return;
      try {
        await job();
      } catch (_) {
        // No audio device or plugin: the night goes on in silence.
      }
    });
  }

  void _sync() {
    final want = store.nightMode ? store.nightSound : 'off';
    if (want != _mode) {
      _mode = want;
      if (want == 'off') {
        _fadeTo(0, const Duration(milliseconds: 350), then: output.stop);
      } else {
        _fade?.cancel();
        _gain = 0;
        _run(() async {
          await output.setVolume(0);
          await output.loop(want, encodeWav(render(want)));
        });
        _fadeTo(volume, const Duration(milliseconds: 800));
      }
    } else if (_mode != 'off' && _target != volume) {
      _fadeTo(volume, const Duration(milliseconds: 120));
    }
  }

  void _fadeTo(double target, Duration over, {Future<void> Function()? then}) {
    _fade?.cancel();
    _target = target;
    const tick = Duration(milliseconds: 40);
    final from = _gain, steps = math.max(1, over.inMilliseconds ~/ 40);
    var step = 0;
    _fade = Timer.periodic(tick, (timer) {
      step++;
      _gain = from + (target - from) * step / steps;
      final gain = _gain;
      _run(() => output.setVolume(gain));
      if (step >= steps) {
        timer.cancel();
        if (then != null) _run(then);
      }
    });
  }

  void dispose() {
    store.removeListener(_sync);
    _fade?.cancel();
    final last = _queue;
    _disposed = true;
    unawaited(
      last.then((_) async {
        try {
          await output.stop();
          await output.dispose();
        } catch (_) {
          // Nothing was playing.
        }
      }),
    );
  }
}
