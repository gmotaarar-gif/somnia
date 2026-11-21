import 'package:material_ui/material_ui.dart';

import '../ui/placeholder_tab.dart';

class SleepScreen extends StatelessWidget {
  const SleepScreen({super.key});
  @override
  Widget build(BuildContext context) => const PlaceholderTab(
    title: 'Сон',
    subtitle: 'Ночь за ночью',
    message: 'Оставьте день позади.\nВремя восстановиться',
    icon: Icons.bedtime_outlined,
    tone: 'night',
    sleepHero: true,
  );
}
