import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../screens/today.dart';
import '../screens/sleep.dart';
import '../screens/mind.dart';
import '../screens/practices.dart';
import '../theme/tokens.dart';
import 'aurora.dart';
import 'dock.dart';

class Workspace extends StatefulWidget {
  const Workspace({super.key});
  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace>
    with SingleTickerProviderStateMixin {
  late final AnimationController _switch = AnimationController(
    vsync: this,
    duration: SomnaMotion.fast,
    value: 1,
  );
  int _index = 0;
  final _boundary = GlobalKey();
  ui.Image? _outgoing;
  int _direction = 1;
  final _screens = const [
    TodayScreen(),
    SleepScreen(),
    MindScreen(),
    PracticesScreen(),
  ];
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final store = SomnaScope.of(context);
    final next = dockTabs.indexWhere((t) => t.$1 == store.tab);
    if (next >= 0 && next != _index) {
      final boundary = _boundary.currentContext?.findRenderObject();
      final previous = _outgoing;
      _outgoing = null;
      if (previous != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => previous.dispose());
      }
      if (!MediaQuery.disableAnimationsOf(context) &&
          boundary is RenderRepaintBoundary &&
          !boundary.debugNeedsPaint) {
        _outgoing = boundary.toImageSync();
      }
      _index = next;
      _direction = store.tabDir;
      if (MediaQuery.disableAnimationsOf(context)) {
        _switch.value = 1;
      } else {
        _switch.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    _outgoing?.dispose();
    _switch.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.transparent,
    body: Stack(
      children: [
        Positioned.fill(child: Aurora(tab: dockTabs[_index].$1)),
        SafeArea(
          bottom: false,
          child: AnimatedBuilder(
            animation: _switch,
            builder: (context, _) {
              final t = SomnaMotion.smooth.transform(_switch.value);
              return RepaintBoundary(
                key: _boundary,
                child: IndexedStack(
                  index: _index,
                  sizing: StackFit.expand,
                  children: [
                    for (var i = 0; i < _screens.length; i++)
                      TickerMode(
                        enabled: i == _index,
                        child: Opacity(
                          opacity: i == _index ? t : 1,
                          child: Transform.translate(
                            offset: Offset(
                              i == _index ? 8 * _direction * (1 - t) : 0,
                              0,
                            ),
                            child: _screens[i],
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
        if (_outgoing != null)
          SafeArea(
            bottom: false,
            child: IgnorePointer(
              child: AnimatedBuilder(
                animation: _switch,
                builder: (context, _) {
                  if (_switch.isCompleted) return const SizedBox.shrink();
                  final t = SomnaMotion.smooth.transform(_switch.value);
                  return Opacity(
                    opacity: 1 - t,
                    child: Transform.translate(
                      offset: Offset(-8 * _direction * t, 0),
                      child: SizedBox.expand(
                        child: RawImage(image: _outgoing, fit: BoxFit.fill),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        const Dock(),
      ],
    ),
  );
}
