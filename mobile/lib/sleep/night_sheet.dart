import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/surfaces.dart';
import 'controls.dart';

/// One recorded night: score, phases, the morning's answers and delete.
class NightSheet extends StatelessWidget {
  final String? nightId;
  const NightSheet({super.key, required this.nightId});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final night = store.nights.where((n) => n.id == nightId).firstOrNull;
    if (night == null) {
      // The night was removed elsewhere: nothing left to show.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted && store.sheet == 'night') store.openSheet(null);
      });
      return const SizedBox(height: 1);
    }
    final stages = hypnogram(night), totals = stageTotals(stages);
    final score = nightScore(night, store.bedGoal, store.wakeGoal);
    Widget pill(String text) => GlassSurface(
      inset: true,
      radius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Text(text, style: const TextStyle(fontSize: 13)),
    );
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: relativeDay(night.dateKey),
          description:
              '${night.bedtime} → ${night.wakeTime} · ${durationRu(night.durationMin)}',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SomnaCard(
                tone: 'nightfall',
                padding: const EdgeInsets.all(20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Сон',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color.fromRGBO(255, 255, 255, .64),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Dots(
                            value: hm(night.durationMin),
                            size: 50,
                            square: true,
                          ),
                        ],
                      ),
                    ),
                    Ring(
                      value: score / 100,
                      size: 84,
                      stroke: 5,
                      child: Text(
                        '$score',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SheetField(
                label: 'Фазы сна',
                hint: 'нет измерений',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GlassSurface(
                      radius: 26,
                      padding: const EdgeInsets.all(16),
                      child: Hypnogram(
                        stages: stages,
                        bedtime: night.bedtime,
                        wakeTime: night.wakeTime,
                      ),
                    ),
                    if (totals.values.any((v) => v > 0))
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: StageLegend(stages: stages),
                      ),
                  ],
                ),
              ),
              SheetField(
                label: 'Утро',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        pill(
                          '${qualityLabel(night.quality)} · ${jsRound(night.quality)}',
                        ),
                        pill(
                          night.awakenings > 0
                              ? 'Пробуждений: ${night.awakenings}'
                              : 'Без пробуждений',
                        ),
                        for (final tag in night.tags) pill(tag),
                      ],
                    ),
                    if (night.note != null && night.note!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          night.note!,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.625,
                            color: c.ink2,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SomnaButton(
                label: 'Удалить запись',
                icon: Icons.delete_outline_rounded,
                variant: SomnaButtonVariant.danger,
                expand: true,
                onPressed: () {
                  store.removeNight(night.id);
                  store.notify('Запись удалена');
                  store.openSheet(null);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
