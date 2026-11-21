import 'package:material_ui/material_ui.dart';

import '../ui/placeholder_tab.dart';

class TodayScreen extends StatelessWidget {
  const TodayScreen({super.key});
  @override
  Widget build(BuildContext context) => const PlaceholderTab(
    title: 'Сегодня',
    subtitle: 'В своём ритме',
    message: 'Хороший день\nначинается с заботы',
    icon: Icons.wb_twilight_outlined,
    tone: 'plum',
  );
}
