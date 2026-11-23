import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Endless decorative loops (drifting plates, a breathing orb, bobbing
/// buddies) run only when the user allows motion. Widget tests turn them
/// off so `pumpAndSettle` can settle; set [ambientOverride] to test them.
bool? ambientOverride;

final bool _underTest =
    !kIsWeb && Platform.environment.containsKey('FLUTTER_TEST');

bool ambientMotion(BuildContext context) =>
    !MediaQuery.disableAnimationsOf(context) &&
    (ambientOverride ?? !_underTest);
