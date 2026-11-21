import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/recap.dart';
import '../logic/time.dart';
import '../logic/metrics.dart';
import '../ui/surfaces.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';

class RecapSheet extends StatefulWidget {
  const RecapSheet({super.key});
  @override
  State<RecapSheet> createState() => _RecapSheetState();
}

class _RecapSheetState extends State<RecapSheet> {
  int page = 0;
  String? goal;
  final now = DateTime.now();
  static const titles = [
    'Ваша неделя',
    'Сон',
    'Состояние',
    'Забота о себе',
    'Следующая неделя',
  ];
  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final recap = buildWeeklyRecap(
      s.nights,
      s.moods,
      s.sessions,
      s.bedGoal,
      s.wakeGoal,
      now,
    );
    final sum = recap.summary;
    final goals = recapGoalOptions(recap.goals, s.weeklyGoal);
    final selected = goal ?? s.weeklyGoal?.id ?? goals.first.id;
    final hasSleep = sum.week.isNotEmpty;
    final best = sum.week.fold<RecapDay?>(
      null,
      (best, n) =>
          best == null ||
              nightScore(n, s.bedGoal, s.wakeGoal) >
                  nightScore(best.night!, s.bedGoal, s.wakeGoal)
          ? recap.days.firstWhere((d) => d.key == n.dateKey)
          : best,
    );
    return SomnaCard(
      tone: ['night', 'violet', 'mint', 'sunset', 'forest'][page],
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .73,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${dayMonthShort(parseKey(recap.days.first.key))} – ${dayMonthShort(parseKey(recap.days.last.key))}',
                  ),
                ),
                IconButton(
                  tooltip: 'Закрыть итоги',
                  onPressed: () => s.openSheet(null),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            Row(
              children: [
                for (var i = 0; i < 5; i++)
                  Expanded(
                    child: IconButton(
                      tooltip: '${i + 1}. ${titles[i]}',
                      onPressed: () => setState(() => page = i),
                      icon: Container(
                        height: 4,
                        color: i <= page ? Colors.white : Colors.white24,
                      ),
                    ),
                  ),
              ],
            ),
            Text(
              '${page + 1} / 5 · Последние 7 дней',
              style: const TextStyle(fontSize: 11),
            ),
            const SizedBox(height: 8),
            Text(
              page == 4 ? 'Одна цель — уже начало' : titles[page],
              style: const TextStyle(
                fontSize: 30,
                height: 1.08,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (page == 0) ...[
                      Center(
                        child: ScoreRing(
                          score: hasSleep ? sum.index.toDouble() : null,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Dots(
                                value: hasSleep ? sum.index : '--',
                                square: true,
                                size: 76,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                hasSleep
                                    ? 'индекс сна / 100'
                                    : 'пока без оценки',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Center(
                        child: Text(
                          hasSleep
                              ? indexLabel(sum.index)
                              : 'Начнём с одной ночи',
                          style: const TextStyle(
                            fontSize: 23,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Center(
                        child: Text(
                          recap.indexDelta == null
                              ? hasSleep
                                    ? 'Сравнение появится, когда будут записи за обе недели'
                                    : 'Запишите сон утром — здесь появится ваш ритм за неделю'
                              : recap.indexDelta == 0
                              ? 'На уровне прошлой недели'
                              : '${recap.indexDelta! > 0 ? '+' : '−'}${recap.indexDelta!.abs()} п. к прошлой неделе',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: _fact(
                              'Средний сон',
                              hasSleep
                                  ? durationRu(sum.avgDuration)
                                  : 'Нет записей',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _fact(
                              'Дни с чек-ином',
                              '${recap.moodDays} из 7',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Center(
                        child: Text(
                          hasSleep
                              ? 'По ${sum.week.length} ${pluralRu(sum.week.length, ['записанной ночи', 'записанным ночам', 'записанным ночам'])}${recap.indexDelta != null ? ' · ранее: ${recap.previousNights}' : ''}'
                              : 'Без записей — без выводов',
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    ],
                    if (page == 1) ...[
                      Text(
                        hasSleep ? '${hm(sum.avgDuration)} ч' : '—',
                        style: const TextStyle(fontSize: 52),
                      ),
                      Text(hasSleep ? 'в среднем за ночь' : 'ещё нет записей'),
                      const SizedBox(height: 24),
                      _WeekChart(
                        days: recap.days,
                        sleep: true,
                        target: sum.target.toDouble(),
                        bestKey: best?.key,
                      ),
                      Text(
                        'Пунктир — цель ${durationRu(sum.target)}. Пропуски не считаем нулевым сном',
                        style: const TextStyle(fontSize: 12),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Сон не меньше ${durationRu(sum.target)}: ${hasSleep ? '${sum.goalNights} из ${sum.week.length}' : '—'}',
                      ),
                      Text(
                        'Отбой ±30 мин: ${hasSleep ? '${sum.accuracy}%' : '—'}',
                      ),
                      Text(
                        'Лучшая ночь: ${best == null ? '—' : dayMonthShort(parseKey(best.key))}',
                      ),
                      Text(
                        'Недосып по записям: ${hasSleep ? durationRu(sum.debt) : '—'}',
                      ),
                    ],
                    if (page == 2) ...[
                      Text(
                        recap.emotions.isEmpty
                            ? 'Каждое чувство\nимеет значение'
                            : 'Чаще всего вы чувствовали',
                        style: const TextStyle(fontSize: 30),
                      ),
                      for (final e in recap.emotions)
                        Text(
                          '${e.name} ×${e.count}',
                          style: const TextStyle(fontSize: 28),
                        ),
                      const SizedBox(height: 24),
                      Text(
                        sum.moodAvg == null
                            ? 'ещё нет чек-инов'
                            : '${sum.moodAvg}% — настроение в среднем',
                      ),
                      Text(
                        '${recap.moods.length} ${pluralRu(recap.moods.length, ['чек-ин', 'чек-ина', 'чек-инов'])} · ${recap.moodDays} из 7 дней',
                      ),
                      ExpansionTile(
                        title: const Text('Состояние по дням'),
                        children: [
                          _WeekChart(days: recap.days, sleep: false),
                          Text(
                            recap.moods.isNotEmpty
                                ? 'На графике — среднее за каждый день, выше — по всем чек-инам. Любое состояние заслуживает внимания'
                                : 'Один короткий чек-ин в день поможет заметить, что поддерживает вас. Пропущенные дни останутся пустыми',
                          ),
                        ],
                      ),
                    ],
                    if (page == 3) ...[
                      const Text(
                        'Маленькие действия тоже считаются. Вот что вы успели за эти семь дней',
                      ),
                      const SizedBox(height: 24),
                      Text(
                        '${recap.activeDays}/7 дней с записями\n${recap.moods.length} чек-инов состояния\n${recap.practiceMinutes} минут практик\n${recap.practiceCount} практик завершено',
                        style: const TextStyle(fontSize: 24, height: 1.8),
                      ),
                      Text(
                        recap.practiceCount > 0
                            ? 'Вы находили время для паузы. На следующей неделе не нужно делать больше — попробуйте сохранить то, что подходит вам'
                            : 'Не нужно менять всё сразу. Начните с одной короткой практики, когда захотите сделать паузу',
                      ),
                    ],
                    if (page == 4) ...[
                      const Text(
                        'Не новый список дел — один посильный шаг. Цель можно изменить в следующих итогах',
                      ),
                      const SizedBox(height: 16),
                      for (final g in goals)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(
                            selected == g.id
                                ? Icons.check_circle
                                : Icons.circle_outlined,
                          ),
                          title: Text(g.text),
                          subtitle: Text(g.why),
                          onTap: () => setState(() => goal = g.id),
                        ),
                      if (s.weeklyGoal != null)
                        Text(
                          'Сейчас: ${s.weeklyGoal!.text}. Изменения сохранятся только после подтверждения',
                        ),
                    ],
                  ],
                ),
              ),
            ),
            Row(
              children: [
                if (page > 0)
                  IconButton(
                    tooltip: 'Предыдущий раздел',
                    onPressed: () => setState(() => page--),
                    icon: const Icon(Icons.arrow_back),
                  ),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      if (page < 4) {
                        setState(() => page++);
                      } else {
                        final g = goals.firstWhere((g) => g.id == selected);
                        s.patch({
                          'weeklyGoal': {'id': g.id, 'text': g.text},
                        });
                        s.notify('Цель на неделю сохранена');
                        s.openSheet(null);
                      }
                    },
                    child: Text(
                      page == 4
                          ? 'Сохранить цель'
                          : page == 0
                          ? 'Посмотреть неделю'
                          : 'Дальше',
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _fact(String label, String value) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .13),
      borderRadius: BorderRadius.circular(22),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ],
    ),
  );
}

class _WeekChart extends StatelessWidget {
  final List<RecapDay> days;
  final bool sleep;
  final double target;
  final String? bestKey;
  const _WeekChart({
    required this.days,
    required this.sleep,
    this.target = 100,
    this.bestKey,
  });
  @override
  Widget build(BuildContext context) {
    final values = days
        .map((d) => sleep ? d.night?.durationMin : d.mood?.toDouble())
        .toList();
    final max = sleep
        ? values.whereType<double>().fold(
            target * 1.15,
            (a, b) => a > b ? a : b,
          )
        : 100.0;
    return Semantics(
      label: days.indexed
          .map(
            (entry) =>
                '${dayMonthShort(parseKey(entry.$2.key))}: ${values[entry.$1] == null
                    ? 'нет записи'
                    : sleep
                    ? durationRu(values[entry.$1]!)
                    : '${values[entry.$1]}%'}',
          )
          .join('; '),
      child: Column(
        children: [
          SizedBox(
            height: 140,
            child: Stack(
              children: [
                if (sleep)
                  Positioned(
                    left: 0,
                    right: 0,
                    top: 140 * (1 - target / max),
                    child: Row(
                      children: List.generate(
                        24,
                        (_) => Expanded(
                          child: Container(
                            height: 1,
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            color: Colors.white38,
                          ),
                        ),
                      ),
                    ),
                  ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (var i = 0; i < 7; i++)
                      Expanded(
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: Container(
                            width: values[i] == null ? 12 : 32,
                            height: values[i] == null
                                ? 2
                                : (140 * values[i]! / max).clamp(2, 140),
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              color: values[i] == null
                                  ? Colors.white24
                                  : !sleep || bestKey == days[i].key
                                  ? const Color(0xffd9f24a)
                                  : Colors.white70,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (var i = 0; i < 7; i++)
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        values[i] == null
                            ? '—'
                            : sleep
                            ? hm(values[i]!)
                            : '${values[i]!.round()}%',
                        style: const TextStyle(fontSize: 10),
                      ),
                      Text(
                        weekdayShort(parseKey(days[i].key)),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
