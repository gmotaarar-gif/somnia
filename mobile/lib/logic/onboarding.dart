import '../data/defaults.dart';
import '../data/models.dart';

List<SomnaWidget> onboardingWidgets(
  List<SomnaWidget> current,
  List<String> picked,
) {
  final builtIn = defaultWidgets.map((w) => w.id).toSet();
  return [
    for (final w in current)
      builtIn.contains(w.id) ? w.copyWith(visible: picked.contains(w.id)) : w,
    for (final w in defaultWidgets)
      if (!current.any((x) => x.id == w.id))
        w.copyWith(visible: picked.contains(w.id)),
  ];
}
