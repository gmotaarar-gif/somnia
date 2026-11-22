import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../screens/today.dart';
import '../screens/sleep.dart';
import '../screens/mind.dart';
import '../screens/practices.dart';
import 'aurora.dart';
import 'dock.dart';
import 'screen_transition.dart';

class Workspace extends StatelessWidget {
  const Workspace({super.key});
  static const _screens = [
    TodayScreen(),
    SleepScreen(),
    MindScreen(),
    PracticesScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final tab = SomnaScope.of(context).tab;
    final found = dockTabs.indexWhere((t) => t.$1 == tab);
    final index = found < 0 ? 0 : found;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ScreenTransition(
        screenKey: index,
        overlay: const Dock(),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Aurora(tab: dockTabs[index].$1),
            SafeArea(
              bottom: false,
              child: IndexedStack(
                index: index,
                sizing: StackFit.expand,
                children: [
                  for (var i = 0; i < _screens.length; i++)
                    TickerMode(enabled: i == index, child: _screens[i]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
