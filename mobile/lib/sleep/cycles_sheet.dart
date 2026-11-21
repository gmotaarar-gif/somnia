import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/features.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'controls.dart';
import 'time_scrubber.dart';

/// Sleep-cycle calculator: wake between 90-minute cycles.
class CyclesSheet extends StatefulWidget {
  const CyclesSheet({super.key});
  @override
  State<CyclesSheet> createState() => _CyclesSheetState();
}

class _CyclesSheetState extends State<CyclesSheet> {
  bool _byBed = true;
  String? _bed, _wake;

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final bed = _bed ?? store.bedGoal, wake = _wake ?? store.wakeGoal;
    final options = _byBed ? wakeOptions(bed) : bedOptions(wake);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SheetHeader(
          title: 'Циклы сна',
          description: 'Проснуться между циклами по 90 минут легче, чем посреди глубокого сна',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Segmented<bool>(
                label: 'Режим расчёта сна',
                expand: true,
                value: _byBed,
                onChanged: (v) => setState(() => _byBed = v),
                options: const [(true, 'Лягу в…'), (false, 'Встану в…')],
              ),
              const SizedBox(height: 12),
              if (_byBed) ...[
                TimeScrubber(
                  key: const ValueKey('bed'),
                  label: 'Отбой',
                  value: bed,
                  step: 1,
                  onChanged: (v) => setState(() => _bed = v),
                ),
                const SizedBox(height: 12),
                SomnaButton(
                  label: 'Лечь сейчас',
                  variant: SomnaButtonVariant.glass,
                  expand: true,
                  onPressed: () {
                    final now = DateTime.now();
                    setState(
                      () => _bed = minutesToTime(now.hour * 60 + now.minute),
                    );
                  },
                ),
              ] else
                TimeScrubber(
                  key: const ValueKey('wake'),
                  label: 'Подъём',
                  value: wake,
                  step: 1,
                  onChanged: (v) => setState(() => _wake = v),
                ),
              SheetField(
                label: _byBed ? 'Лучше встать в' : 'Лучше лечь в',
                hint: '+14 мин на засыпание',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final o in options)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _option(context, store, o, bed, wake),
                      ),
                    const SizedBox(height: 6),
                    Text(
                      'Нажмите на вариант, чтобы сделать его своим режимом.',
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.625,
                        color: c.ink3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _option(
    BuildContext context,
    SomnaStore store,
    CycleOption o,
    String bed,
    String wake,
  ) {
    final c = SomnaColors.of(context);
    final ink = o.best ? inverseInk(context) : c.ink;
    final row = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Dots(value: o.time, size: 34, color: ink),
                const SizedBox(height: 8),
                Text(
                  '${o.cycles} циклов · ${durationRu(o.sleepMin)} сна',
                  style: TextStyle(
                    fontSize: 12,
                    color: o.best ? ink.withValues(alpha: .7) : c.ink3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          ExcludeSemantics(
            child: Row(
              children: [
                for (var k = 0; k < 6; k++)
                  Container(
                    width: 8,
                    height: 28,
                    margin: EdgeInsets.only(left: k == 0 ? 0 : 4),
                    decoration: BoxDecoration(
                      color: ink.withValues(
                        alpha: k < o.cycles
                            ? 1
                            : o.best
                            ? .2
                            : .15,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
    return PressScale(
      onPressed: () {
        final from = _byBed ? bed : o.time, to = _byBed ? o.time : wake;
        store.patch({'bedGoal': from, 'wakeGoal': to});
        store.notify('Режим: $from → $to');
        store.openSheet(null);
      },
      child: o.best
          ? DecoratedBox(
              decoration: BoxDecoration(
                color: c.ink,
                borderRadius: BorderRadius.circular(26),
              ),
              child: row,
            )
          : GlassSurface(radius: 26, child: row),
    );
  }
}
