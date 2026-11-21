import 'package:material_ui/material_ui.dart';

import '../ui/placeholder_tab.dart';

class PracticesScreen extends StatelessWidget {
  const PracticesScreen({super.key});
  @override
  Widget build(BuildContext context) => const PlaceholderTab(
    title: 'Практики',
    subtitle: 'Пауза для себя',
    message: 'Немного тишины.\nНемного больше вас',
    icon: Icons.spa_outlined,
    tone: 'ember',
  );
}
