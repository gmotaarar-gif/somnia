import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Touch feedback in one place, so every control speaks the same language.
/// Android gets the system click with the haptic; iOS only the haptic, since
/// its keyboard click is reserved for typing.
abstract final class Feel {
  static bool enabled = true;

  static bool get _android => defaultTargetPlatform == TargetPlatform.android;

  /// A plain tap on a button or tile.
  static void tap() {
    if (!enabled) return;
    HapticFeedback.lightImpact();
    if (_android) SystemSound.play(SystemSoundType.click);
  }

  /// A step on a slider, ruler or picker.
  static void tick() {
    if (!enabled) return;
    HapticFeedback.selectionClick();
  }

  /// Something was saved or finished.
  static void success() {
    if (!enabled) return;
    HapticFeedback.mediumImpact();
    if (_android) SystemSound.play(SystemSoundType.click);
  }

  /// A destructive or refused action.
  static void warn() {
    if (!enabled) return;
    HapticFeedback.heavyImpact();
    if (_android) SystemSound.play(SystemSoundType.alert);
  }
}
