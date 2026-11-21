import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/metrics.dart';
import '../logic/recap.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/surfaces.dart';
import 'kit.dart';
import 'lucide.dart';

const _ink2 = Color.fromRGBO(255, 255, 255, .64);
const _inset = Color.fromRGBO(255, 255, 255, .14);
const _relaxed = 1.625;

/// (title, card tone, icon) of the five weekly stories.
const _stories = [
  ('Ваша неделя', 'night', 'sparkles'),
  ('Сон', 'violet', 'moon'),
  ('Состояние', 'mint', 'heart'),
  ('Забота о себе', 'sunset', 'leaf'),
  ('Следующая неделя', 'forest', 'target'),
];

class RecapSheet extends StatefulWidget {
  const RecapSheet({super.key});
  @override
  State<RecapSheet> createState() => _RecapSheetState();
}

class _RecapSheetState extends State<RecapSheet> {
  final now = DateTime.now();
  int index = 0, direction = 1;
  String? goal;
  bool daysOpen = false;

  void _go(int next) {
    if (next < 0 || next >= _stories.length || next == index) return;
    setState(() {
      direction = next > index ? 1 : -1;
      index = next;
    });
  }

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
    final goals = recapGoalOptions(recap.goals, s.weeklyGoal);
    final wanted = goal ?? s.weeklyGoal?.id;
    final selected = goals.any((g) => g.id == wanted)
        ? wanted
        : goals.firstOrNull?.id;
    final last = index == _stories.length - 1;
    final still = MediaQuery.disableAnimationsOf(context);
    final range =
        '${dayMonthShort(parseKey(recap.days.first.key))} – ${dayMonthShort(parseKey(recap.days.last.key))}';
    void close() => s.openSheet(null);
    void accept() {
      final g = goals.where((g) => g.id == selected).firstOrNull;
      if (g == null) return;
      s.patch({
        'weeklyGoal': {'id': g.id, 'text': g.text},
      });
      s.notify('Цель на неделю сохранена');
      close();
    }

    final slide = switch (index) {
      0 => _indexSlide(recap),
      1 => _sleepSlide(s, recap),
      2 => _moodSlide(recap),
      3 => _habitsSlide(recap),
      _ => _goalSlide(s, goals, selected),
    };
    final height = SheetScaffold.bodyHeight(context);
    // The card runs off the bottom edge, so only its top corners are round.
    return SizedBox(
      height: height,
      child: ClipRect(
        child: OverflowBox(
          alignment: Alignment.topCenter,
          minHeight: height + SomnaRadii.large,
          maxHeight: height + SomnaRadii.large,
          child: SomnaCard(
            tone: _stories[index].$2,
            radius: SomnaRadii.large,
            padding: EdgeInsets.zero,
            child: Stack(
              children: [
                if (index == 2)
                  const Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment(-.77, -.64),
                          end: Alignment(.77, .64),
                          colors: [
                            Color(0xffff9253),
                            Color(0xffed3d1c),
                            Color(0xffc52213),
                          ],
                          stops: [0, .72, 1],
                        ),
                      ),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: RadialGradient(
                            center: Alignment(-.76, -.04),
                            radius: .9,
                            colors: [Color(0xffffb47e), Color(0x00ffb47e)],
                            stops: [0, .68],
                          ),
                        ),
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(bottom: SomnaRadii.large),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Lucide(
                                  _stories[index].$3,
                                  size: 16,
                                  color: _ink2,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    range,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: _ink2,
                                    ),
                                  ),
                                ),
                                RoundIconButton(
                                  icon: 'x',
                                  label: 'Закрыть итоги',
                                  size: 40,
                                  iconSize: 15,
                                  onPressed: close,
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                for (final (n, story) in _stories.indexed) ...[
                                  if (n > 0) const SizedBox(width: 6),
                                  Expanded(
                                    child: Semantics(
                                      button: true,
                                      selected: n == index,
                                      label: '${n + 1}. ${story.$1}',
                                      excludeSemantics: true,
                                      child: GestureDetector(
                                        behavior: HitTestBehavior.opaque,
                                        onTap: () => _go(n),
                                        child: SizedBox(
                                          height: 44,
                                          child: Center(
                                            child: AnimatedContainer(
                                              duration: still
                                                  ? Duration.zero
                                                  : SomnaMotion.fast,
                                              height: 4,
                                              decoration: BoxDecoration(
                                                color: n <= index
                                                    ? Colors.white
                                                    : const Color.fromRGBO(
                                                        255,
                                                        255,
                                                        255,
                                                        .2,
                                                      ),
                                                borderRadius:
                                                    BorderRadius.circular(2),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: AnimatedSwitcher(
                          duration: still ? Duration.zero : SomnaMotion.fast,
                          switchInCurve: SomnaMotion.smooth,
                          switchOutCurve: SomnaMotion.smooth,
                          transitionBuilder: (child, animation) =>
                              FadeTransition(
                                opacity: animation,
                                child: SlideTransition(
                                  position: Tween(
                                    begin: Offset(
                                      still
                                          ? 0
                                          : (child.key == ValueKey(index)
                                                    ? .02
                                                    : -.02) *
                                                direction,
                                      0,
                                    ),
                                    end: Offset.zero,
                                  ).animate(animation),
                                  child: child,
                                ),
                              ),
                          layoutBuilder: (current, previous) => Stack(
                            fit: StackFit.expand,
                            children: [...previous, ?current],
                          ),
                          child: CustomScrollView(
                            key: ValueKey(index),
                            slivers: [
                              SliverFillRemaining(
                                hasScrollBody: false,
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(
                                    24,
                                    0,
                                    24,
                                    20,
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text(
                                        '${index + 1} / ${_stories.length} · Последние 7 дней',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          color: _ink2,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Semantics(
                                        header: true,
                                        child: Text(
                                          last
                                              ? 'Одна цель — уже начало'
                                              : _stories[index].$1,
                                          style: const TextStyle(
                                            fontSize: 30,
                                            height: 1.08,
                                            fontWeight: FontWeight.w600,
                                            letterSpacing: -1.05,
                                          ),
                                        ),
                                      ),
                                      ...slide,
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Container(
                        decoration: const BoxDecoration(
                          border: Border(
                            top: BorderSide(
                              color: Color.fromRGBO(255, 255, 255, .1),
                            ),
                          ),
                        ),
                        padding: const EdgeInsets.fromLTRB(24, 16, 24, 22),
                        child: Row(
                          children: [
                            if (index > 0) ...[
                              RoundIconButton(
                                icon: 'arrowLeft',
                                label: 'Предыдущий раздел',
                                size: 48,
                                onPressed: () => _go(index - 1),
                              ),
                              const SizedBox(width: 12),
                            ],
                            Expanded(
                              child: SomnaButton(
                                label: last
                                    ? 'Сохранить цель'
                                    : index == 0
                                    ? 'Посмотреть неделю'
                                    : 'Дальше',
                                trailing: last ? 'check' : 'arrowRight',
                                expand: true,
                                horizontal: 16,
                                onPressed: last
                                    ? (selected == null ? null : accept)
                                    : () => _go(index + 1),
                              ),
                            ),
                          ],
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

  List<Widget> _indexSlide(WeeklyRecap recap) {
    final sum = recap.summary, hasSleep = sum.week.isNotEmpty;
    final delta = recap.indexDelta;
    return [
      const SizedBox(height: 24),
      Center(
        child: ScoreRing(
          score: hasSleep ? sum.index.toDouble() : null,
          color: SomnaColors.lime,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Dots(value: hasSleep ? sum.index : '--', square: true, size: 76),
              const SizedBox(height: 12),
              Text(
                hasSleep ? 'индекс сна / 100' : 'пока без оценки',
                style: const TextStyle(fontSize: 12, color: _ink2),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
      Text(
        hasSleep ? indexLabel(sum.index) : 'Начнём с одной ночи',
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 23,
          fontWeight: FontWeight.w600,
          letterSpacing: -.58,
        ),
      ),
      const SizedBox(height: 12),
      if (delta != null)
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _inset,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (delta != 0) ...[
                  Lucide(
                    delta > 0 ? 'arrowUpRight' : 'arrowDownRight',
                    size: 16,
                    color: delta > 0 ? SomnaColors.lime : _ink2,
                  ),
                  const SizedBox(width: 6),
                ],
                Text(
                  delta == 0
                      ? 'На уровне прошлой недели'
                      : '${delta > 0 ? '+' : '−'}${delta.abs()} п. к прошлой неделе',
                  style: TextStyle(
                    fontSize: 12,
                    color: delta >= 0 ? SomnaColors.lime : _ink2,
                  ),
                ),
              ],
            ),
          ),
        )
      else
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              hasSleep
                  ? 'Сравнение появится, когда будут записи за обе недели'
                  : 'Запишите сон утром — здесь появится ваш ритм за неделю',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                height: _relaxed,
                color: _ink2,
              ),
            ),
          ),
        ),
      const Spacer(),
      const SizedBox(height: 24),
      _facts([
        ('Средний сон', hasSleep ? durationRu(sum.avgDuration) : 'Нет записей'),
        ('Дни с чек-ином', '${recap.moodDays} из 7'),
      ]),
      const SizedBox(height: 12),
      Text(
        '${hasSleep ? 'По ${sum.week.length} ${pluralRu(sum.week.length, ['записанной ночи', 'записанным ночам', 'записанным ночам'])}' : 'Без записей — без выводов'}${delta != null ? ' · ранее: ${recap.previousNights}' : ''}',
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 11, height: _relaxed, color: _ink2),
      ),
    ];
  }

  List<Widget> _sleepSlide(SomnaStore s, WeeklyRecap recap) {
    final sum = recap.summary, hasSleep = sum.week.isNotEmpty;
    SleepNight? best;
    for (final n in sum.week) {
      if (best == null ||
          nightScore(n, s.bedGoal, s.wakeGoal) >
              nightScore(best, s.bedGoal, s.wakeGoal)) {
        best = n;
      }
    }
    return [
      const SizedBox(height: 24),
      Wrap(
        crossAxisAlignment: WrapCrossAlignment.end,
        spacing: 12,
        runSpacing: 4,
        children: [
          Dots(value: hasSleep ? hm(sum.avgDuration) : '--', size: 54),
          Text(
            hasSleep ? 'в среднем за ночь' : 'ещё нет записей',
            style: const TextStyle(fontSize: 13, color: _ink2),
          ),
        ],
      ),
      _WeekChart(
        days: recap.days,
        sleep: true,
        target: sum.target.toDouble(),
        bestKey: best?.dateKey,
      ),
      const SizedBox(height: 12),
      Text(
        'Пунктир — цель ${durationRu(sum.target)}. Пропуски не считаем нулевым сном',
        style: const TextStyle(fontSize: 12, height: _relaxed, color: _ink2),
      ),
      const Spacer(),
      const SizedBox(height: 24),
      _facts([
        (
          'Сон не меньше ${durationRu(sum.target)}',
          hasSleep ? '${sum.goalNights} из ${sum.week.length}' : '—',
        ),
        ('Отбой ±30 мин', hasSleep ? '${sum.accuracy}%' : '—'),
      ]),
      const SizedBox(height: 12),
      _facts([
        (
          'Лучшая ночь',
          best == null ? '—' : dayMonthShort(parseKey(best.dateKey)),
        ),
        ('Недосып по записям', hasSleep ? durationRu(sum.debt) : '—'),
      ]),
    ];
  }

  List<Widget> _moodSlide(WeeklyRecap recap) {
    final sum = recap.summary;
    const white85 = Color.fromRGBO(255, 255, 255, .85);
    const white80 = Color.fromRGBO(255, 255, 255, .8);
    return [
      const Spacer(),
      const SizedBox(height: 24),
      Text(
        recap.emotions.isEmpty
            ? 'Неделя в ощущениях'
            : 'Чаще всего вы чувствовали',
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: white80,
        ),
      ),
      const SizedBox(height: 24),
      if (recap.emotions.isEmpty)
        const Text(
          'Каждое чувство\nимеет значение',
          style: TextStyle(
            fontSize: 36,
            height: 1.08,
            fontWeight: FontWeight.w600,
            letterSpacing: -1.62,
          ),
        )
      else
        Semantics(
          container: true,
          label: 'Частые эмоции недели',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (n, e) in recap.emotions.indexed)
                Padding(
                  padding: EdgeInsets.only(top: n == 0 ? 0 : 8),
                  child: Opacity(
                    opacity: (1 - n * .1).clamp(.1, 1),
                    child: Text.rich(
                      TextSpan(
                        text: e.name,
                        style: TextStyle(
                          fontSize: math.min(
                            42.0 - n * 5,
                            520 / (e.name.length + 1),
                          ),
                          height: 1.08,
                          fontWeight: FontWeight.w600,
                          letterSpacing:
                              -.055 *
                              math.min(42.0 - n * 5, 520 / (e.name.length + 1)),
                        ),
                        children: [
                          TextSpan(
                            text: '  ×${e.count}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              letterSpacing: 0,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      const SizedBox(height: 24),
      Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color.fromRGBO(0, 0, 0, .6),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                sum.moodAvg == null
                    ? 'ещё нет чек-инов'
                    : '${sum.moodAvg}% — настроение в среднем',
                style: const TextStyle(fontSize: 13, color: white85),
              ),
              const SizedBox(height: 8),
              Text(
                '${recap.moods.length} ${pluralRu(recap.moods.length, ['чек-ин', 'чек-ина', 'чек-инов'])} · ${recap.moodDays} из 7 дней',
                style: const TextStyle(fontSize: 12, color: white80),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
      const Spacer(),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color.fromRGBO(0, 0, 0, .15),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Semantics(
              button: true,
              expanded: daysOpen,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => setState(() => daysOpen = !daysOpen),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Состояние по дням',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    AnimatedRotation(
                      duration: SomnaMotion.fast,
                      turns: daysOpen ? .25 : 0,
                      child: const Lucide('chevronRight', size: 16),
                    ),
                  ],
                ),
              ),
            ),
            if (daysOpen) ...[
              _WeekChart(days: recap.days, sleep: false),
              const SizedBox(height: 16),
              Text(
                recap.moods.isNotEmpty
                    ? 'На графике — среднее за каждый день, выше — по всем чек-инам. Любое состояние заслуживает внимания'
                    : 'Один короткий чек-ин в день поможет заметить, что поддерживает вас. Пропущенные дни останутся пустыми',
                style: const TextStyle(
                  fontSize: 12,
                  height: _relaxed,
                  color: white85,
                ),
              ),
            ],
          ],
        ),
      ),
    ];
  }

  List<Widget> _habitsSlide(WeeklyRecap recap) {
    Widget activity(String icon, String label, Object value) => Expanded(
      child: Container(
        constraints: const BoxConstraints(minHeight: 140),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _inset,
          borderRadius: BorderRadius.circular(26),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Lucide(icon, size: 16, color: _ink2),
            const SizedBox(height: 16),
            Text(
              '$value',
              style: const TextStyle(
                fontSize: 34,
                height: 1,
                fontWeight: FontWeight.w600,
                letterSpacing: -1.36,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 12, height: 1.375, color: _ink2),
            ),
          ],
        ),
      ),
    );
    return [
      const SizedBox(height: 16),
      const Text(
        'Маленькие действия тоже считаются. Вот что вы успели за эти семь дней',
        style: TextStyle(fontSize: 14, height: _relaxed, color: _ink2),
      ),
      const SizedBox(height: 24),
      IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            activity('sparkles', 'дней с записями', '${recap.activeDays}/7'),
            const SizedBox(width: 12),
            activity('heart', 'чек-инов состояния', recap.moods.length),
          ],
        ),
      ),
      const SizedBox(height: 12),
      IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            activity('leaf', 'минут практик', recap.practiceMinutes),
            const SizedBox(width: 12),
            activity('check', 'практик завершено', recap.practiceCount),
          ],
        ),
      ),
      const SizedBox(height: 24),
      const Spacer(),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _inset,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(
          recap.practiceCount > 0
              ? 'Вы находили время для паузы. На следующей неделе не нужно делать больше — попробуйте сохранить то, что подходит вам'
              : 'Не нужно менять всё сразу. Начните с одной короткой практики, когда захотите сделать паузу',
          style: const TextStyle(fontSize: 14, height: _relaxed, color: _ink2),
        ),
      ),
    ];
  }

  List<Widget> _goalSlide(
    SomnaStore s,
    List<GoalOption> goals,
    String? selected,
  ) => [
    const SizedBox(height: 16),
    const Text(
      'Не новый список дел — один посильный шаг. Цель можно изменить в следующих итогах',
      style: TextStyle(fontSize: 14, height: _relaxed, color: _ink2),
    ),
    const SizedBox(height: 12),
    for (final g in goals)
      Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Semantics(
          inMutuallyExclusiveGroup: true,
          checked: selected == g.id,
          child: GestureDetector(
            key: ValueKey('goal-${g.id}'),
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => goal = g.id),
            child: AnimatedContainer(
              duration: SomnaMotion.quick,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: selected == g.id ? Colors.white : _inset,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected == g.id ? Colors.black : null,
                      border: selected == g.id
                          ? null
                          : Border.all(
                              color: const Color.fromRGBO(255, 255, 255, .35),
                            ),
                    ),
                    alignment: Alignment.center,
                    child: selected == g.id
                        ? const Lucide(
                            'check',
                            size: 14,
                            strokeWidth: 3,
                            color: Colors.white,
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          g.text,
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.375,
                            fontWeight: FontWeight.w600,
                            color: selected == g.id
                                ? Colors.black
                                : Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          g.why,
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.375,
                            color: selected == g.id
                                ? const Color.fromRGBO(0, 0, 0, .65)
                                : _ink2,
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
      ),
    if (s.weeklyGoal != null) ...[
      const SizedBox(height: 20),
      Text(
        'Сейчас: ${s.weeklyGoal!.text}. Изменения сохранятся только после подтверждения',
        style: const TextStyle(fontSize: 12, height: _relaxed, color: _ink2),
      ),
    ],
  ];

  Widget _facts(List<(String, String)> facts) => IntrinsicHeight(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, fact) in facts.indexed) ...[
          if (i > 0) const SizedBox(width: 12),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: _inset,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    fact.$1,
                    style: const TextStyle(fontSize: 11, color: _ink2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    fact.$2,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -.16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    ),
  );
}

/// Seven bars, one per day; days without a record stay a short dash.
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
    final values = [
      for (final d in days)
        sleep ? d.night?.durationMin.toDouble() : d.mood?.toDouble(),
    ];
    final max = sleep
        ? values.whereType<double>().fold(target * 1.15, math.max)
        : 100.0;
    String text(double v) => sleep ? hm(v) : '${v.round()}%';
    return Semantics(
      container: true,
      image: true,
      label:
          '${sleep ? 'Продолжительность сна по дням' : 'Средний баланс состояния по дням'}. ${[for (final (i, d) in days.indexed) '${dayMonthShort(parseKey(d.key))}: ${values[i] == null
                ? 'нет записи'
                : sleep
                ? durationRu(values[i]!)
                : text(values[i]!)}'].join('; ')}',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 140,
              child: CustomPaint(
                painter: _WeekPainter(
                  values: values,
                  max: max,
                  target: sleep ? target : null,
                  best: sleep ? days.indexWhere((d) => d.key == bestKey) : null,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                for (final (i, d) in days.indexed) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      children: [
                        Text(
                          values[i] == null ? '—' : text(values[i]!),
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.visible,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          weekdayShort(parseKey(d.key)),
                          style: const TextStyle(fontSize: 10, color: _ink2),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WeekPainter extends CustomPainter {
  final List<double?> values;
  final double max;
  final double? target;
  final int? best;
  const _WeekPainter({
    required this.values,
    required this.max,
    this.target,
    this.best,
  });
  @override
  void paint(Canvas canvas, Size size) {
    const gap = 8.0;
    final column = (size.width - gap * (values.length - 1)) / values.length;
    final width = math.min(column, 32.0);
    for (var i = 0; i < values.length; i++) {
      final center = i * (column + gap) + column / 2, v = values[i];
      if (v == null) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(center - 6, size.height - 6, 12, 2),
            const Radius.circular(1),
          ),
          Paint()..color = const Color.fromRGBO(255, 255, 255, .25),
        );
        continue;
      }
      final h = math.max(size.height * .02, size.height * v / max);
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          Rect.fromLTWH(center - width / 2, size.height - h, width, h),
          topLeft: Radius.circular(math.min(12, h / 2)),
          topRight: Radius.circular(math.min(12, h / 2)),
          bottomLeft: Radius.circular(math.min(6, h / 2)),
          bottomRight: Radius.circular(math.min(6, h / 2)),
        ),
        Paint()
          ..color = best == null || best == i
              ? SomnaColors.lime
              : const Color.fromRGBO(255, 255, 255, .65),
      );
    }
    if (target case final t?) {
      final y = size.height * (1 - t / max);
      final dash = Paint()
        ..color = const Color.fromRGBO(255, 255, 255, .4)
        ..strokeWidth = 1;
      for (var x = 0.0; x < size.width; x += 6) {
        canvas.drawLine(
          Offset(x, y),
          Offset(math.min(x + 3, size.width), y),
          dash,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_WeekPainter old) =>
      old.values.join(',') != values.join(',') ||
      old.max != max ||
      old.target != target ||
      old.best != best;
}
