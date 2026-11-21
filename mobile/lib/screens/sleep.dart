import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../shell/top_bar.dart';
import '../sleep/controls.dart';
import '../sleep/mascot.dart';
import '../sleep/night_line.dart';
import '../theme/tokens.dart';
import '../ui/charts/chart_frame.dart' show chartText, dashedPath;
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

const sleepSounds = [
  ('off', 'Тишина'),
  ('pink', 'Розовый шум'),
  ('rain', 'Дождь'),
  ('drone', 'Дрон'),
];

String _planNote(int minutes) => minutes == 0
    ? 'по плану'
    : '${minutes > 0 ? '+' : '−'}${minutes.abs()} мин';

class SleepScreen extends StatefulWidget {
  const SleepScreen({super.key});
  @override
  State<SleepScreen> createState() => _SleepScreenState();
}

class _SleepScreenState extends State<SleepScreen> {
  int _period = 7;
  bool _hours = true, _tune = false, _allNights = false;

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final nights = store.nights, bedGoal = store.bedGoal;
    final wakeGoal = store.wakeGoal;
    final sum = summarize(
      nights,
      store.moods,
      bedGoal,
      wakeGoal,
      span: _period,
    );
    final last = sum.last, shown = sum.week;
    final best = wakeOptions(bedGoal).where((o) => o.best).firstOrNull;
    final journal = nights.reversed.take(_allNights ? nights.length : 3);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
      children: [
        TopBar(
          title: 'Сон',
          sub: 'Цель $bedGoal → $wakeGoal · ${durationRu(sum.target)}',
        ),
        _RiseIn(index: 0, child: _hero(store, last)),
        const SizedBox(height: 12),
        _RiseIn(index: 1, child: _nightCard(store)),
        if (best != null) ...[
          const SizedBox(height: 12),
          _RiseIn(
            index: 2,
            child: PressScale(
              label: 'Калькулятор циклов сна',
              onPressed: () => store.openSheet('cycles'),
              child: GlassSurface(
                padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
                child: Row(
                  children: [
                    const GlassSurface(
                      inset: true,
                      radius: 22,
                      child: SizedBox.square(
                        dimension: 44,
                        child: Icon(Icons.alarm_rounded, size: 18),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Циклы сна',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Лучший подъём в ${best.time}, если лечь в $bedGoal',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 13, color: c.ink2),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, size: 20, color: c.ink3),
                  ],
                ),
              ),
            ),
          ),
        ],
        const SizedBox(height: 40),
        _RiseIn(
          index: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SectionHead(
                title: 'Динамика',
                trailing: Segmented<int>(
                  label: 'Период динамики сна',
                  value: _period,
                  onChanged: (v) => setState(() => _period = v),
                  options: const [(7, '7 дн'), (14, '14 дн'), (30, '30 дн')],
                ),
              ),
              const SizedBox(height: 16),
              SomnaCard(
                padding: const EdgeInsets.all(20),
                child: Builder(
                  builder: (context) => _dynamics(context, sum, shown),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 40),
        _RiseIn(
          index: 4,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionHead(
                title: 'История',
                hint: 'Чем ярче день, тем выше оценка ночи',
              ),
              const SizedBox(height: 16),
              SomnaCard(
                padding: const EdgeInsets.all(20),
                child: SleepCalendar(
                  nights: nights,
                  today: DateTime.now(),
                  bedGoal: bedGoal,
                  wakeGoal: wakeGoal,
                  onNightTap: (n) => store.openSheet('night', n.id),
                ),
              ),
              if (nights.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'Здесь появятся ваши записи сна.',
                    style: TextStyle(fontSize: 14, color: c.ink2),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 12, 4, 0),
                  child: Text(
                    'Смахните ночь влево, чтобы удалить её',
                    style: TextStyle(fontSize: 12, color: c.ink3),
                  ),
                ),
              const SizedBox(height: 12),
              for (final n in journal) _journalRow(store, n),
              if (nights.length > 3)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: SomnaButton(
                    label: _allNights ? 'Свернуть' : 'Показать все ночи',
                    variant: SomnaButtonVariant.ghost,
                    expand: true,
                    onPressed: () => setState(() => _allNights = !_allNights),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _hero(SomnaStore store, SleepNight? last) {
    const soft = Color.fromRGBO(255, 255, 255, .7);
    return SomnaCard(
      tone: 'nightfall',
      radius: SomnaRadii.large,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 244),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Прошлая ночь',
                              style: TextStyle(
                                fontSize: 17,
                                height: 1.25,
                                fontWeight: FontWeight.w500,
                                letterSpacing: -.34,
                              ),
                            ),
                          ),
                          if (last != null)
                            DecoratedBox(
                              decoration: BoxDecoration(
                                color: const Color.fromRGBO(255, 255, 255, .14),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                child: Text(
                                  qualityLabel(last.quality),
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      if (last == null)
                        const CloudMascot(size: 80)
                      else
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Dots(
                              value: hm(last.durationMin),
                              size: 64,
                              square: true,
                            ),
                            const SizedBox(width: 12),
                            const Padding(
                              padding: EdgeInsets.only(bottom: 2),
                              child: Text(
                                'ч',
                                style: TextStyle(
                                  fontSize: 17,
                                  height: 1,
                                  color: Color.fromRGBO(255, 255, 255, .65),
                                ),
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(height: 16),
                      Text(
                        last == null
                            ? 'Запишите первую ночь: это займёт минуту.'
                            : '${last.awakenings > 0 ? '${last.awakenings} ${pluralRu(last.awakenings, const ['пробуждение', 'пробуждения', 'пробуждений'])}' : 'Без пробуждений'} за ночь',
                        style: const TextStyle(fontSize: 13, color: soft),
                      ),
                    ],
                  ),
                  if (last == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 16),
                      child: SomnaButton(
                        label: 'Записать сон',
                        icon: Icons.add_rounded,
                        onPressed: () => store.openSheet('sleep'),
                      ),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.only(top: 32),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          PressScale(
                            label: 'Подробности ночи',
                            onPressed: () => store.openSheet('night', last.id),
                            child: Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: hypnogram(last).isNotEmpty
                                  ? Hypnogram(
                                      stages: hypnogram(last),
                                      bedtime: last.bedtime,
                                      wakeTime: last.wakeTime,
                                    )
                                  : NightLine(
                                      bedtime: last.bedtime,
                                      wakeTime: last.wakeTime,
                                      bedGoal: store.bedGoal,
                                      wakeGoal: store.wakeGoal,
                                    ),
                            ),
                          ),
                          StageLegend(stages: hypnogram(last)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (last != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Row(
                children: [
                  Expanded(
                    child: _HeroStat(
                      label: 'Отбой',
                      value: last.bedtime,
                      note: _planNote(
                        deviationMinutes(last.bedtime, store.bedGoal),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _HeroStat(
                      label: 'Подъём',
                      value: last.wakeTime,
                      note: _planNote(
                        deviationMinutes(last.wakeTime, store.wakeGoal),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _HeroStat(
                      label: 'Оценка',
                      value:
                          '${nightScore(last, store.bedGoal, store.wakeGoal)}',
                      note: 'из 100',
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _nightCard(SomnaStore store) {
    final sound = sleepSounds
        .firstWhere(
          (s) => s.$1 == store.nightSound,
          orElse: () => sleepSounds.first,
        )
        .$2;
    return SomnaCard(
      tone: 'cobalt',
      padding: const EdgeInsets.all(20),
      child: Builder(
        builder: (context) {
          final c = SomnaColors.of(context);
          final reduce = MediaQuery.disableAnimationsOf(context);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Ночной режим',
                          style: TextStyle(
                            fontSize: 17,
                            height: 1.25,
                            fontWeight: FontWeight.w500,
                            letterSpacing: -.34,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Semantics(
                          expanded: _tune,
                          child: PressScale(
                            onPressed: () => setState(() => _tune = !_tune),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Text(
                                    '$sound · ${store.soundTimer > 0 ? '${store.soundTimer} мин' : 'без таймера'}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: c.ink2,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                AnimatedRotation(
                                  turns: _tune ? .5 : 0,
                                  duration: reduce
                                      ? Duration.zero
                                      : SomnaMotion.fast,
                                  child: Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    size: 16,
                                    color: c.ink2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  SomnaButton(
                    label: 'Начать',
                    icon: Icons.nights_stay_outlined,
                    horizontal: 20,
                    onPressed: store.startNight,
                  ),
                ],
              ),
              AnimatedSize(
                duration: reduce ? Duration.zero : SomnaMotion.fast,
                curve: SomnaMotion.smooth,
                alignment: Alignment.topCenter,
                child: !_tune
                    ? const SizedBox(width: double.infinity)
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 20),
                          Wrap(
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
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  'Таймер звука, мин',
                                  style: TextStyle(fontSize: 13, color: c.ink2),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Segmented<int>(
                                label: 'Таймер звука',
                                value: store.soundTimer,
                                onChanged: (v) =>
                                    store.patch({'soundTimer': v}),
                                options: const [
                                  (15, '15'),
                                  (30, '30'),
                                  (60, '60'),
                                  (0, '∞'),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Утром нажмите «Я проснулся»: отбой и подъём подставятся в запись сами.',
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
          );
        },
      ),
    );
  }

  Widget _dynamics(BuildContext context, Summary sum, List<SleepNight> shown) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final labelEvery = shown.length > 14
        ? 5
        : shown.length > 7
        ? 2
        : 1;
    final empty = shown.isEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (empty)
                    const Text('—', style: TextStyle(fontSize: 28, height: 1))
                  else
                    Dots(
                      value: _hours ? hm(sum.avgDuration) : '${sum.accuracy}%',
                      size: 28,
                    ),
                  const SizedBox(height: 10),
                  Text(
                    _hours
                        ? 'в среднем · цель ${durationRu(sum.target)}'
                        : 'ночей в пределах ±30 мин',
                    style: TextStyle(fontSize: 12, color: c.ink2),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SomnaChip(
              label: 'Часы',
              active: _hours,
              onPressed: () => setState(() => _hours = true),
            ),
            const SizedBox(width: 6),
            SomnaChip(
              label: 'Режим',
              active: !_hours,
              onPressed: () => setState(() => _hours = false),
            ),
          ],
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 160,
          child: empty
              ? Text(
                  'Пока нет данных. Запишите первую ночь.',
                  style: TextStyle(fontSize: 14, color: c.ink2),
                )
              : _hours
              ? Bars(
                  values: [for (final n in shown) n.durationMin],
                  labels: [
                    for (var i = 0; i < shown.length; i++)
                      (shown.length - 1 - i) % labelEvery == 0
                          ? weekdayShort(parseKey(shown[i].dateKey))
                          : '',
                  ],
                  goal: sum.target.toDouble(),
                  max: shown.fold<double>(
                    sum.target * 1.15,
                    (m, n) => math.max(m, n.durationMin),
                  ),
                  format: durationRu,
                )
              : SleepWindows(
                  nights: shown,
                  bedGoal: store.bedGoal,
                  wakeGoal: store.wakeGoal,
                ),
        ),
        if (!empty) ...[
          const SizedBox(height: 24),
          Ruler(
            value: sum.index / 100,
            labels: const ['Режим сбит', 'Ровный режим', 'Отличный ритм'],
          ),
        ],
        const SizedBox(height: 24),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _Stat(
                label: 'Индекс',
                value: empty ? '—' : '${sum.index}',
                note: empty
                    ? 'Пока нет данных'
                    : sum.indexDelta != 0
                    ? '${sum.indexDelta > 0 ? '+' : ''}${sum.indexDelta} к прошлому'
                    : 'без изменений',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _Stat(
                label: 'Долг сна',
                value: empty ? '—' : hm(sum.debt),
                note: empty
                    ? 'Пока нет данных'
                    : sum.debt > 90
                    ? 'лягте раньше'
                    : 'в норме',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _Stat(
                label: 'Спокойных',
                value: empty ? '—' : '${sum.calmNights}/${shown.length}',
                note: 'без пробуждений',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _journalRow(SomnaStore store, SleepNight n) {
    final c = SomnaColors.of(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: Dismissible(
          key: ValueKey('night-${n.id}'),
          direction: DismissDirection.endToStart,
          dismissThresholds: const {DismissDirection.endToStart: .5},
          onDismissed: (_) => store.removeNight(n.id),
          background: ColoredBox(
            color: const Color(0xffff5d5d).withValues(alpha: .18),
            child: Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(right: 24),
                child: Icon(
                  Icons.delete_outline_rounded,
                  size: 20,
                  color: c.danger,
                ),
              ),
            ),
          ),
          child: PressScale(
            onPressed: () => store.openSheet('night', n.id),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Color.alphaBlend(c.glass, c.bg),
                borderRadius: BorderRadius.circular(26),
                border: Border(top: BorderSide(color: c.glassEdge)),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                child: Row(
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: (dark ? Colors.black : Colors.white).withValues(
                          alpha: .45,
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: SizedBox.square(
                        dimension: 44,
                        child: Center(
                          child: Dots(
                            value: nightScore(n, store.bedGoal, store.wakeGoal),
                            size: 14,
                            color: c.ink,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                relativeDay(n.dateKey),
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              if (n.dateKey.compareTo(dateKey(daysAgo(1))) >=
                                  0) ...[
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    dayMonthShort(parseKey(n.dateKey)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: c.ink3,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${n.bedtime} → ${n.wakeTime} · ${durationRu(n.durationMin)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 13, color: c.ink2),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: c.ink3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String label, value, note;
  const _HeroStat({
    required this.label,
    required this.value,
    required this.note,
  });
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: const Color.fromRGBO(255, 255, 255, .1),
      borderRadius: BorderRadius.circular(26),
      border: const Border(
        top: BorderSide(color: Color.fromRGBO(255, 255, 255, .14)),
      ),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Color.fromRGBO(255, 255, 255, .7),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              height: 1,
              fontWeight: FontWeight.w500,
              letterSpacing: -.4,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            note,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: Color.fromRGBO(255, 255, 255, .6),
            ),
          ),
        ],
      ),
    ),
  );
}

class _Stat extends StatelessWidget {
  final String label, value, note;
  const _Stat({required this.label, required this.value, required this.note});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: c.ink3)),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 22,
            height: 1,
            fontWeight: FontWeight.w500,
            letterSpacing: -.66,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 6),
        Text(note, style: TextStyle(fontSize: 11, height: 1.25, color: c.ink3)),
      ],
    );
  }
}

/// Endpoints in minutes relative to midnight on the wake date.
({int bed, int wake}) sleepWindow(String bedtime, String wakeTime) {
  final wake = timeToMinutes(wakeTime);
  return (
    bed: wake - (bedtime == wakeTime ? 0 : spanMinutes(bedtime, wakeTime)),
    wake: wake,
  );
}

/// «Режим»: each night as a bar from bedtime to waking against the goal.
class SleepWindows extends StatelessWidget {
  final List<SleepNight> nights;
  final String bedGoal, wakeGoal;
  const SleepWindows({
    super.key,
    required this.nights,
    required this.bedGoal,
    required this.wakeGoal,
  });
  @override
  Widget build(BuildContext context) => Semantics(
    label: [
      for (final n in nights)
        '${relativeDay(n.dateKey)}: ${n.bedtime} → ${n.wakeTime}',
    ].join(', '),
    child: CustomPaint(
      size: Size.infinite,
      painter: _WindowsPainter(
        [for (final n in nights) sleepWindow(n.bedtime, n.wakeTime)],
        sleepWindow(bedGoal, wakeGoal),
        bedGoal,
        wakeGoal,
        SomnaColors.of(context),
      ),
    ),
  );
}

class _WindowsPainter extends CustomPainter {
  static const axisStart = -3 * 60, axisEnd = 11 * 60, minBar = .04;
  final List<({int bed, int wake})> windows;
  final ({int bed, int wake}) goal;
  final String bedGoal, wakeGoal;
  final SomnaColors c;
  const _WindowsPainter(
    this.windows,
    this.goal,
    this.bedGoal,
    this.wakeGoal,
    this.c,
  );
  @override
  void paint(Canvas canvas, Size size) {
    final start = windows.fold(
      math.min(axisStart, goal.bed),
      (m, w) => math.min(m, w.bed),
    );
    final end = windows.fold(
      math.max(axisEnd, goal.wake),
      (m, w) => math.max(m, w.wake),
    );
    final latestBed = windows.fold(start, (m, w) => math.max(m, w.bed));
    final span = math.max(
      (end - start).toDouble(),
      (latestBed - start) / (1 - minBar),
    );
    double pos(int minutes) => (minutes - start) / span * size.height;
    const left = 36.0, gap = 5.0;
    for (final (label, at) in [(bedGoal, goal.bed), (wakeGoal, goal.wake)]) {
      final y = pos(at);
      chartText(canvas, label, Offset(0, y), c.ink3, size: 10);
      dashedPath(
        canvas,
        Path()
          ..moveTo(left, y)
          ..lineTo(size.width, y),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = c.ink.withValues(alpha: .25),
        dash: 3,
        gap: 3,
      );
    }
    if (windows.isEmpty) return;
    final column =
        (size.width - left - gap * (windows.length - 1)) / windows.length;
    for (var i = 0; i < windows.length; i++) {
      final top = pos(windows[i].bed);
      final height = math.max(size.height * minBar, pos(windows[i].wake) - top);
      final width = math.min(8.0, column);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(
          left + i * (column + gap) + (column - width) / 2,
          top,
          width,
          height,
        ),
        Radius.circular(width / 2),
      );
      if (i == windows.length - 1) {
        canvas.drawRRect(
          rect,
          Paint()
            ..color = SomnaColors.lime.withValues(alpha: .7)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
        );
        canvas.drawRRect(rect, Paint()..color = SomnaColors.lime);
      } else {
        canvas.drawRRect(rect, Paint()..color = c.ink.withValues(alpha: .85));
      }
    }
  }

  @override
  bool shouldRepaint(_WindowsPainter old) =>
      old.windows.toString() != windows.toString() ||
      old.goal != goal ||
      old.c != c;
}

/// Web `useRiseIn`: sections fade up one after another on first show.
class _RiseIn extends StatefulWidget {
  final int index;
  final Widget child;
  const _RiseIn({required this.index, required this.child});
  @override
  State<_RiseIn> createState() => _RiseInState();
}

class _RiseInState extends State<_RiseIn> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: SomnaMotion.slow + Duration(milliseconds: 60 * widget.index),
  );
  late final Animation<double> _curve = CurvedAnimation(
    parent: _controller,
    curve: Interval(
      60 * widget.index / (400 + 60 * widget.index),
      1,
      curve: SomnaMotion.smooth,
    ),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else if (_controller.status == AnimationStatus.dismissed) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _curve,
    child: widget.child,
    builder: (context, child) => Opacity(
      opacity: _curve.value,
      child: Transform.translate(
        offset: Offset(0, 14 * (1 - _curve.value)),
        child: child,
      ),
    ),
  );
}
