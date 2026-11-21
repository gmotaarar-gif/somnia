import 'dart:async';
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/store.dart';
import '../native/audio.dart';
import '../screens/sleep.dart' show sleepSounds;
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../ui/dots.dart';
import 'controls.dart';
import 'night_session.dart';

/// Keeps the night sound in step with the store and lays the dimmed clock
/// over the whole app while the user sleeps.
class NightModeHost extends StatefulWidget {
  final SoundOutput? output;
  final Future<SharedPreferences> Function() preferences;
  const NightModeHost({
    super.key,
    this.output,
    this.preferences = SharedPreferences.getInstance,
  });
  @override
  State<NightModeHost> createState() => _NightModeHostState();
}

class _NightModeHostState extends State<NightModeHost> {
  SleepAudio? _audio;
  NightSession? _session;
  SomnaStore? _store;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final store = SomnaScope.of(context);
    if (store == _store) return;
    _audio?.dispose();
    _session?.dispose();
    _session = null;
    _store = store;
    _audio = SleepAudio(store, output: widget.output);
    widget.preferences().then((preferences) {
      if (mounted && _store == store) {
        _session = NightSession(store, preferences);
      }
    }).ignore();
  }

  @override
  void dispose() {
    _audio?.dispose();
    _session?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context);
    final reduce = MediaQuery.disableAnimationsOf(context);
    return AnimatedSwitcher(
      duration: reduce ? Duration.zero : SomnaMotion.verySlow,
      reverseDuration: reduce ? Duration.zero : SomnaMotion.fast,
      switchInCurve: SomnaMotion.smooth,
      child: store.nightMode
          ? const NightMode(key: ValueKey('night'))
          : const SizedBox.shrink(key: ValueKey('day')),
    );
  }
}

/// Dimmed full-screen clock that runs while the user sleeps.
class NightMode extends StatefulWidget {
  const NightMode({super.key});
  @override
  State<NightMode> createState() => _NightModeState();
}

class _NightModeState extends State<NightMode> {
  late final Timer _timer = Timer.periodic(
    const Duration(seconds: 1),
    (_) => setState(() {}),
  );
  @override
  void initState() {
    super.initState();
    _timer;
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context);
    final now = DateTime.now(), padding = MediaQuery.viewPaddingOf(context);
    const c = SomnaColors.dark;
    return Theme(
      data: somnaTheme(Brightness.dark),
      child: Semantics(
        scopesRoute: true,
        namesRoute: true,
        explicitChildNodes: true,
        label: 'Ночной режим',
        child: Material(
          color: Colors.black,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              24,
              math.max(padding.top, 28),
              24,
              math.max(padding.bottom, 28),
            ),
            child: Column(
              children: [
                Text(
                  'Ночь началась в ${store.nightStart ?? ''}',
                  style: TextStyle(fontSize: 13, color: c.ink3),
                ),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Dots(
                          value:
                              '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
                          size: 84,
                          color: const Color.fromRGBO(255, 255, 255, .7),
                        ),
                      ),
                      const SizedBox(height: 32),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.wb_twilight_rounded,
                            size: 18,
                            color: c.ink2,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Подъём в ${store.wakeGoal}',
                            style: TextStyle(fontSize: 15, color: c.ink2),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final (id, label) in sleepSounds)
                      SomnaChip(
                        label: label,
                        active: store.nightSound == id,
                        onPressed: () => store.setNightSound(id),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Row(
                    children: [
                      Expanded(
                        child: SomnaButton(
                          label: 'Отменить',
                          variant: SomnaButtonVariant.glass,
                          expand: true,
                          horizontal: 12,
                          onPressed: () => store.endNight(false),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: SomnaButton(
                          label: 'Я проснулся',
                          expand: true,
                          onPressed: () => store.endNight(true),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
