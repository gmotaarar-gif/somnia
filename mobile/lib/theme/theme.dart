
import 'package:material_ui/material_ui.dart';

import 'tokens.dart';

ThemeMode somnaThemeMode(String setting) => switch (setting) {
  'light' => ThemeMode.light,
  'dark' => ThemeMode.dark,
  _ => ThemeMode.system,
};

ThemeData somnaTheme(Brightness brightness) {
  final c = brightness == Brightness.dark
      ? SomnaColors.dark
      : SomnaColors.light;
  final theme = ThemeData(
    useMaterial3: true,
    brightness: brightness,
    fontFamily: 'Onest',
    scaffoldBackgroundColor: c.bg,
    colorScheme:
        ColorScheme.fromSeed(
          seedColor: SomnaColors.lime,
          brightness: brightness,
        ).copyWith(
          primary: c.accent,
          surface: c.sheet,
          onSurface: c.ink,
          error: c.danger,
        ),
    textSelectionTheme: TextSelectionThemeData(
      cursorColor: c.accent,
      selectionColor: SomnaColors.lime.withValues(alpha: .3),
    ),
    iconTheme: IconThemeData(color: c.ink),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SomnaColors.lime,
        foregroundColor: SomnaColors.limeInk,
        minimumSize: const Size(48, 56),
        textStyle: const TextStyle(
          fontFamily: 'Onest',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
    ),
    dividerColor: c.hair,
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
      ),
    ),
  );
  return theme.copyWith(
    textTheme: theme.textTheme
        .apply(bodyColor: c.ink, displayColor: c.ink)
        .merge(
          const TextTheme(
            bodyMedium: TextStyle(
              fontFeatures: [FontFeature('ss01'), FontFeature('cv11')],
            ),
          ),
        ),
  );
}
