import 'package:material_ui/material_ui.dart';

import '../ui/placeholder_tab.dart';

class MindScreen extends StatelessWidget {
  const MindScreen({super.key});
  @override
  Widget build(BuildContext context) => const PlaceholderTab(
    title: 'Состояние',
    subtitle: 'Ближе к себе',
    message: 'Как вы сейчас?\nПрислушайтесь к себе',
    icon: Icons.psychology_alt_outlined,
    tone: 'moss',
  );
}
