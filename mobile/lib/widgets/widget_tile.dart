import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../ui/charts/charts.dart';
import '../ui/surfaces.dart';
import 'catalog.dart';

class WidgetTile extends StatelessWidget {
  final SomnaWidget widget;
  final bool interactive;
  const WidgetTile({super.key, required this.widget, this.interactive = true});
  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final sum = summarize(s.nights, s.moods, s.bedGoal, s.wakeGoal);
    final wide = widget.size == '2x1';
    final kind = widget.kind;
    var title = widget.title ?? widgetMeta[kind]?.$1 ?? 'Мой виджет';
    String value = '—', note = '';
    Widget? chart;
    final emptySleep =
        ['sleep', 'week', 'energy', 'rhythm', 'debt'].contains(kind) &&
        sum.week.isEmpty;
    if (emptySleep) {
      note = 'Пока нет данных. Запишите сон.';
    } else {
      switch (kind) {
        case 'streak':
          final next =
              [
                7,
                14,
                30,
                60,
                100,
                200,
                365,
              ].where((n) => n > sum.streak).firstOrNull ??
              sum.streak + 100;
          value = '${sum.streak}';
          note = pluralRu(sum.streak, ['день', 'дня', 'дней']);
          chart = DotTrack(value: sum.streak / next);
        case 'sleep':
          value = hm(sum.last!.durationMin);
          note = 'часов прошлой ночью';
          chart = Wave(
            values: sum.week.map((n) => n.durationMin).toList(),
            height: 42,
          );
        case 'water':
          value = '${displayNumber(s.water.ml)} мл';
          note = wide
              ? 'осталось ${displayNumber((waterGoalMl - s.water.ml).clamp(0, waterGoalMl))} мл'
              : '';
          chart = Arc(value: s.water.ml / waterGoalMl);
        case 'mood':
          value = sum.lastMood == null
              ? '—'
              : '${moodPct(sum.lastMood!.valence)}';
          note = sum.lastMood == null
              ? 'Отметьте, как вы'
              : getValenceLabel(sum.lastMood!.valence);
          chart = Ring(
            value: sum.lastMood == null
                ? 0
                : moodPct(sum.lastMood!.valence) / 100,
            size: 70,
            child: Text(value, style: const TextStyle(fontSize: 24)),
          );
          value = '';
        case 'evening':
          final c = bedtimeCountdown(s.bedGoal, s.wakeGoal);
          title = wide ? title : 'Вечер';
          value = c.past ? '0:00' : hm(c.minutes);
          note = c.past ? 'пора спать' : 'до отбоя';
          chart = DotTrack(value: c.dayProgress);
        case 'week':
          value = '${hm(sum.avgDuration)} ч';
          note = 'Среднее за 7 ночей';
          chart = DotRow(
            values: s.nights
                .skip(
                  (s.nights.length - (wide ? 28 : 14)).clamp(
                    0,
                    s.nights.length,
                  ),
                )
                .map((n) => n.durationMin >= sum.target * .93 ? 1.0 : 0.0)
                .toList(),
          );
        case 'energy':
          value = '${displayNumber(sum.last!.quality)} / 100';
          note = qualityLabel(sum.last!.quality);
          if (wide) {
            chart = Wave(
              values: sum.week.map((n) => n.quality).toList(),
              height: 42,
            );
          }
        case 'rhythm':
          value = '${sum.accuracy}%';
          note = 'ночей вовремя';
        case 'debt':
          value = '${hm(sum.debt)} ч';
          note = sum.debt > 90 ? 'верните +20 мин к отбою' : 'в пределах нормы';
        case 'plan':
          final plan = dayPlan(
            nights: s.nights,
            moods: s.moods,
            waterMl: s.water.ml,
            waterGoal: waterGoalMl,
            ritualDone: s.ritual.done.length,
          );
          value = '${plan.where((p) => p.done).length}/${plan.length}';
          if (wide) {
            note =
                plan.where((p) => !p.done).firstOrNull?.label ??
                'Всё выполнено';
          }
          chart = DotRow(values: plan.map((p) => p.done ? 1.0 : 0.0).toList());
        case 'cycle':
          final best = wakeOptions(s.bedGoal).firstWhere((o) => o.best);
          value = best.time;
          note = '${best.cycles} циклов · ${hm(best.sleepMin)} ч';
        case 'wellbeing':
          final last = s.wellbeing.lastOrNull;
          if (!wide) title = 'WHO-5';
          value = last == null ? '—' : '${displayNumber(last.score)} / 100';
          note = last == null ? 'пройдите тест' : who5Label(last.score);
        case 'custom':
          value = displayNumber(widget.value ?? 0);
          note = '/ ${displayNumber(widget.target ?? 1)} ${widget.unit ?? ''}';
          chart = DotTrack(value: (widget.value ?? 0) / (widget.target ?? 1));
      }
    }
    void run() {
      switch (kind) {
        case 'water':
          s.addWater(250);
        case 'custom':
          s.bumpWidget(widget.id);
        case 'evening':
          s.patch({'eveningMode': !s.eveningMode});
        case 'streak':
        case 'week':
          s.openSheet('recap');
        case 'mood':
          s.openSheet('mood');
        case 'energy':
          s.openSheet('sleep');
        case 'plan':
          s.setTab('today');
        case 'cycle':
          s.openSheet('cycles');
        case 'wellbeing':
          s.openSheet('wellbeing');
        default:
          s.setTab('sleep');
      }
    }

    return Semantics(
      label: title,
      button: interactive,
      child: SomnaCard(
        tone: widget.tone,
        padding: const EdgeInsets.all(18),
        onTap: interactive ? run : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (kind == 'evening')
                  SizedBox(
                    height: 24,
                    child: Switch(
                      value: s.eveningMode,
                      onChanged: interactive
                          ? (v) => s.patch({'eveningMode': v})
                          : null,
                    ),
                  ),
                if (kind == 'water' || kind == 'custom')
                  const Icon(Icons.add, size: 18),
              ],
            ),
            const Spacer(),
            if (chart != null &&
                (kind == 'water' || kind == 'mood' || kind == 'sleep'))
              SizedBox(
                height: kind == 'mood' ? 70 : 42,
                child: Center(child: chart),
              ),
            if (value.isNotEmpty)
              Text(
                value,
                maxLines: 1,
                style: TextStyle(fontSize: wide ? 38 : 28, height: 1.1),
              ),
            if (note.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  note,
                  maxLines: 2,
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
              ),
            if (chart != null && !['water', 'mood', 'sleep'].contains(kind))
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: SizedBox(height: 16, child: chart),
              ),
          ],
        ),
      ),
    );
  }
}
