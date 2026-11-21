import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

class TopBar extends StatelessWidget {
  final String title;
  final String? sub;
  final Widget? action;
  const TopBar({super.key, required this.title, this.sub, this.action});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final name = store.userName.trim();
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 16, 4, 28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (sub != null)
                  Text(sub!, style: TextStyle(fontSize: 13, color: c.ink3)),
                const SizedBox(height: 6),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w600,
                    height: 1.08,
                    letterSpacing: -1.35,
                  ),
                ),
              ],
            ),
          ),
          ?action,
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: PressScale(
              label: 'Профиль',
              onPressed: () => store.openSheet('profile'),
              child: GlassSurface(
                radius: 24,
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: Center(
                    child: Text(
                      name.isEmpty ? 'S' : name.characters.first.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
