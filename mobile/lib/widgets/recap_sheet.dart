import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/recap.dart';
import '../logic/time.dart';
import '../ui/surfaces.dart';
import '../ui/charts/charts.dart';

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
        ),
        sum = buildWeeklyRecap(
          s.nights,
          s.moods,
          s.sessions,
          s.bedGoal,
          s.wakeGoal,
          now,
        ).summary;
    final goals = recapGoalOptions(recap.goals, s.weeklyGoal);
    final selected = goal ?? s.weeklyGoal?.id ?? goals.first.id;
    final hasSleep = sum.week.isNotEmpty;
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
                      Text(
                        hasSleep ? '${sum.index}' : '—',
                        style: const TextStyle(fontSize: 80),
                      ),
                      Text(hasSleep ? 'Индекс недели' : 'Пока нет данных'),
                      const SizedBox(height: 24),
                      Text(
                        '${sum.week.length} из 7 ночей · ${recap.moods.length} чек-инов',
                      ),
                      const Text(
                        'Ваша неделя — не оценка. Это возможность заметить свой ритм.',
                      ),
                    ],
                    if (page == 1) ...[
                      Text(
                        hasSleep ? '${hm(sum.avgDuration)} ч' : '—',
                        style: const TextStyle(fontSize: 52),
                      ),
                      const Text('в среднем за ночь'),
                      const SizedBox(height: 24),
                      DotRow(
                        values: recap.days
                            .map(
                              (d) => d.night == null
                                  ? 0.0
                                  : d.night!.durationMin / sum.target,
                            )
                            .toList(),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Сон не меньше ${durationRu(sum.target)}: ${hasSleep ? '${sum.goalNights} из 7' : '—'}',
                      ),
                      Text(
                        'Отбой ±30 мин: ${hasSleep ? '${sum.accuracy}%' : '—'}',
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
                        '${recap.moods.length} чек-инов · ${recap.moodDays} из 7 дней',
                      ),
                      ExpansionTile(
                        title: const Text('Состояние по дням'),
                        children: [
                          DotRow(
                            values: recap.days
                                .map((d) => (d.mood ?? 0) / 100)
                                .toList(),
                          ),
                          const Text('Любое состояние заслуживает внимания'),
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
                      const Text(
                        'Не нужно менять всё сразу. Начните с одной короткой практики, когда захотите сделать паузу',
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
}
