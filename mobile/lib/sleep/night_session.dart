import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../data/store.dart';
import '../native/audio.dart' show soundModes;

const activeNightKey = 'somna-active-night-v1';

/// Keeps a running night across an app restart, as the web keeps it across a
/// reload: Android may close the app while the phone lies locked overnight.
class NightSession {
  final SomnaStore store;
  final SharedPreferences preferences;
  final DateTime Function() now;
  int? _startedAt, _soundStartedAt;
  String? _saved;

  NightSession(this.store, this.preferences, {DateTime Function()? now})
    : now = now ?? DateTime.now {
    _restore();
    store.addListener(_save);
    _save();
  }

  void _restore() {
    if (store.nightMode) return;
    try {
      final night = jsonDecode(preferences.getString(activeNightKey) ?? 'null');
      if (night is! Map) return;
      final start = night['start'], sound = night['sound'];
      final startedAt = night['startedAt'], soundAt = night['soundStartedAt'];
      final at = now().millisecondsSinceEpoch;
      if (start is! String ||
          !RegExp(r'^([01]\d|2[0-3]):[0-5]\d$').hasMatch(start) ||
          !soundModes.contains(sound) ||
          startedAt is! int ||
          soundAt is! int ||
          at - startedAt > const Duration(hours: 24).inMilliseconds ||
          at < startedAt) {
        return;
      }
      final left = store.soundTimer == 0
          ? null
          : Duration(milliseconds: soundAt + store.soundTimer * 60000 - at);
      final expired = left != null && left <= Duration.zero;
      _startedAt = startedAt;
      _soundStartedAt = soundAt;
      _saved = '$start|$sound';
      store.resumeNight(
        start,
        expired ? 'off' : sound as String,
        soundLeft: expired ? null : left,
      );
    } catch (_) {
      // A damaged record is not a night.
    }
  }

  void _save() {
    final next = store.nightMode
        ? '${store.nightStart}|${store.nightSound}'
        : null;
    if (next == _saved) return;
    final at = now().millisecondsSinceEpoch;
    if (next == null) {
      _startedAt = null;
      _saved = null;
      preferences.remove(activeNightKey).ignore();
      return;
    }
    _startedAt ??= at;
    // A changed sound starts its timer again.
    if (_saved?.split('|').last != store.nightSound) _soundStartedAt = at;
    _saved = next;
    preferences
        .setString(
          activeNightKey,
          jsonEncode({
            'start': store.nightStart,
            'sound': store.nightSound,
            'startedAt': _startedAt,
            'soundStartedAt': _soundStartedAt ?? at,
          }),
        )
        .ignore();
  }

  void dispose() => store.removeListener(_save);
}
