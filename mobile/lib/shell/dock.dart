import 'dart:ui' as ui;

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

const dockTabs = <(String, String, IconData)>[
  ('today', 'Сегодня', Icons.grid_view_rounded),
  ('sleep', 'Сон', Icons.bedtime_outlined),
  ('mind', 'Состояние', Icons.psychology_alt_outlined),
  ('practices', 'Практики', Icons.spa_outlined),
];

class Dock extends StatefulWidget {
  const Dock({super.key});
  @override
  State<Dock> createState() => _DockState();
}

class _DockState extends State<Dock> {
  bool _menu = false;
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    void pick(String sheet) {
      setState(() => _menu = false);
      store.openSheet(sheet);
    }

    return PopScope(
      canPop: !_menu,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _menu) setState(() => _menu = false);
      },
      child: Shortcuts(
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
        },
        child: Actions(
          actions: {
            DismissIntent: CallbackAction<DismissIntent>(
              onInvoke: (_) {
                setState(() => _menu = false);
                return null;
              },
            ),
          },
          child: Stack(
            children: [
              if (_menu)
                Positioned.fill(
                  child: Semantics(
                    label: 'Закрыть меню',
                    button: true,
                    child: GestureDetector(
                      onTap: () => setState(() => _menu = false),
                      child: BackdropFilter(
                        filter: ui.ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                        child: ColoredBox(
                          color: Colors.black.withValues(alpha: .4),
                        ),
                      ),
                    ),
                  ),
                ),
              Positioned(
                left: 12,
                right: 12,
                bottom: 0,
                child: SafeArea(
                  top: false,
                  minimum: const EdgeInsets.only(bottom: 16),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_menu)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: GlassSurface(
                                chrome: true,
                                radius: 28,
                                padding: const EdgeInsets.all(8),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _QuickAction(
                                      icon: Icons.sentiment_satisfied_alt,
                                      title: 'Чек-ин состояния',
                                      subtitle: 'Как вы сейчас?',
                                      onTap: () => pick('mood'),
                                    ),
                                    _QuickAction(
                                      icon: Icons.bed_outlined,
                                      title: 'Записать сон',
                                      subtitle: 'Отбой, подъём, бодрость',
                                      onTap: () => pick('sleep'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          GlassSurface(
                            chrome: true,
                            radius: 40,
                            padding: const EdgeInsets.all(6),
                            child: LayoutBuilder(
                              builder: (context, constraints) {
                                final labels = constraints.maxWidth >= 270;
                                Widget tab(int i) {
                                  final (id, label, icon) = dockTabs[i];
                                  final active = store.tab == id;
                                  return Expanded(
                                    flex: active && labels ? 2 : 1,
                                    child: PressScale(
                                      label: label,
                                      selected: active,
                                      onPressed: () {
                                        setState(() => _menu = false);
                                        store.setEditing(false);
                                        store.setTab(id);
                                      },
                                      child: AnimatedContainer(
                                        duration: SomnaMotion.fast,
                                        curve: SomnaMotion.smooth,
                                        height: 48,
                                        decoration: BoxDecoration(
                                          color: active
                                              ? SomnaColors.lime
                                              : Colors.transparent,
                                          borderRadius: BorderRadius.circular(
                                            28,
                                          ),
                                        ),
                                        child: ExcludeSemantics(
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                icon,
                                                size: 20,
                                                color: active
                                                    ? SomnaColors.limeInk
                                                    : c.ink2,
                                              ),
                                              if (active && labels) ...[
                                                const SizedBox(width: 6),
                                                Flexible(
                                                  child: Text(
                                                    label,
                                                    maxLines: 1,
                                                    style: const TextStyle(
                                                      fontSize: 13,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      color:
                                                          SomnaColors.limeInk,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }

                                return Row(
                                  children: [
                                    tab(0),
                                    tab(1),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 4,
                                      ),
                                      child: PressScale(
                                        label: 'Добавить запись',
                                        onPressed: () =>
                                            setState(() => _menu = !_menu),
                                        child: GlassSurface(
                                          inset: true,
                                          radius: 30,
                                          child: SizedBox(
                                            width: 52,
                                            height: 52,
                                            child: AnimatedRotation(
                                              turns: _menu ? .125 : 0,
                                              duration: SomnaMotion.fast,
                                              child: const Icon(
                                                Icons.add,
                                                size: 26,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    tab(2),
                                    tab(3),
                                  ],
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  const _QuickAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => PressScale(
    label: title,
    onPressed: onTap,
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          GlassSurface(
            inset: true,
            radius: 24,
            padding: const EdgeInsets.all(12),
            child: Icon(icon, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: SomnaColors.of(context).ink3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
