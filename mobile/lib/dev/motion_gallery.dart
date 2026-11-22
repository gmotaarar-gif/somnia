import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart' hide ThemeMode;
import '../data/store.dart';
import '../shell/aurora.dart';
import '../shell/island.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../ui/mascot.dart';

void main() {
  if (!kDebugMode) throw StateError('The motion gallery is debug-only');
  runApp(const MotionGallery());
}

const _tabs = ['today', 'sleep', 'mind', 'practices', 'onboarding'];

/// Every state of the motion pieces on one screen: the cloud, the aurora
/// palettes and the island. `flutter run -t lib/dev/motion_gallery.dart`.
class MotionGallery extends StatefulWidget {
  const MotionGallery({super.key});
  @override
  State<MotionGallery> createState() => _MotionGalleryState();
}

class _MotionGalleryState extends State<MotionGallery> {
  bool light = false;
  int tab = 0;
  SomnaToast? toast;

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: somnaTheme(light ? Brightness.light : Brightness.dark),
    home: Builder(
      builder: (context) {
        final c = SomnaColors.of(context);
        Widget cloud(String label, MascotState state) => Column(
          children: [
            CloudAvatar(state: state, size: 80),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(fontSize: 13, color: c.ink2)),
          ],
        );
        Widget action(String label, VoidCallback onTap) =>
            TextButton(onPressed: onTap, child: Text(label));
        return Scaffold(
          backgroundColor: c.bg,
          body: Stack(
            fit: StackFit.expand,
            children: [
              Aurora(tab: _tabs[tab]),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 84, 20, 20),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          cloud('default', MascotState.idle),
                          cloud('working', MascotState.working),
                          cloud('sleeping', MascotState.sleeping),
                        ],
                      ),
                      const SizedBox(height: 28),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          CloudAvatar(state: MascotState.idle, size: 40),
                          CloudAvatar(state: MascotState.idle, size: 48),
                          CloudAvatar(state: MascotState.idle),
                          CloudAvatar(state: MascotState.idle, size: 120),
                        ],
                      ),
                      const Spacer(),
                      Text(
                        'Aurora: ${_tabs[tab]}',
                        style: TextStyle(fontSize: 15, color: c.ink),
                      ),
                      Wrap(
                        alignment: WrapAlignment.center,
                        children: [
                          action(
                            'Палитра',
                            () =>
                                setState(() => tab = (tab + 1) % _tabs.length),
                          ),
                          action(
                            light ? 'Тёмная' : 'Светлая',
                            () => setState(() => light = !light),
                          ),
                          action(
                            'Тост',
                            () => setState(
                              () => toast = SomnaToast(
                                id: (toast?.id ?? 0) + 1,
                                text: 'Сон сохранён',
                              ),
                            ),
                          ),
                          action(
                            'Ошибка',
                            () => setState(
                              () => toast = SomnaToast(
                                id: (toast?.id ?? 0) + 1,
                                text: saveFailureToast,
                                variant: ToastVariant.error,
                              ),
                            ),
                          ),
                          action('Скрыть', () => setState(() => toast = null)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Island(toast: toast),
            ],
          ),
        );
      },
    ),
  );
}
