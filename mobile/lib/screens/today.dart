import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../shell/top_bar.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import '../widgets/catalog.dart';
import '../widgets/kit.dart';
import '../widgets/lucide.dart';
import '../widgets/widget_grid.dart';

const _white65 = Color.fromRGBO(255, 255, 255, .65);
const _white70 = Color.fromRGBO(255, 255, 255, .7);

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key});
  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  Timer? clock;
  @override
  void initState() {
    super.initState();
    clock = Timer.periodic(const Duration(minutes: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context), now = DateTime.now();
    final sum = summarize(s.nights, s.moods, s.bedGoal, s.wakeGoal);
    final mood = sum.lastMood;
    final article =
        todayArticles
            .where((a) => !s.readArticles.contains(a.$1))
            .firstOrNull ??
        todayArticles.first;
    final shown = s.widgets.where((w) => w.visible).length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
      children: [
        TopBar(
          title:
              '${greeting(now)}${s.userName.isEmpty ? '' : ', ${s.userName}'}',
          sub: '${weekdayShort(now)}, ${dayMonth(now)}',
        ),
        SomnaCard(
          tone: 'nightfall',
          radius: SomnaRadii.large,
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _LastNight(sum: sum),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: _Tile(
                        title: 'Состояние',
                        label: 'Состояние. Сделать чек-ин',
                        icon: 'plus',
                        note: mood == null
                            ? 'Сделайте чек-ин'
                            : getValenceLabel(mood.valence),
                        value: mood == null
                            ? null
                            : Dots(
                                value: '${moodPct(mood.valence)}%',
                                size: 30,
                              ),
                        onPressed: () => s.openSheet('mood'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Tile(
                        title: 'Неделя',
                        label: 'Индекс недели. Открыть итоги',
                        icon: 'arrowUpRight',
                        note: sum.week.isEmpty
                            ? 'Пока нет данных'
                            : '${indexLabel(sum.index)}${sum.indexDelta == 0 ? '' : ', ${sum.indexDelta > 0 ? '+' : ''}${sum.indexDelta}'}',
                        value: sum.week.isEmpty
                            ? null
                            : Dots(value: sum.index, size: 30, square: true),
                        onPressed: () => s.openSheet('recap'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 40),
        const _DayPlan(),
        const SizedBox(height: 40),
        SectionHead(
          title: 'Почитать',
          hint: '${article.$2} · ${article.$4} мин',
        ),
        Semantics(
          button: true,
          label: 'Читать: ${article.$3}',
          excludeSemantics: true,
          child: SomnaCard(
            tone: article.$5,
            padding: const EdgeInsets.all(20),
            onTap: () => s.openSheet('article', article.$1),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 108),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Align(
                    alignment: Alignment.topRight,
                    child: _Badge('arrowUpRight', size: 36),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 12, right: 24),
                    child: Text(
                      article.$3,
                      style: const TextStyle(
                        fontSize: 22,
                        height: 1.12,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -.77,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 40),
        SectionHead(
          title: 'Виджеты',
          hint: s.editing ? 'Перетащите, смените размер или цвет' : null,
          actions: [
            if (shown > 0 || s.editing)
              SomnaChip(
                label: s.editing ? 'Готово' : 'Изменить',
                active: s.editing,
                onPressed: () => s.setEditing(!s.editing),
              ),
            RoundIconButton(
              icon: 'plus',
              label: 'Добавить виджет',
              size: 36,
              iconSize: 15,
              onPressed: () => s.openSheet('gallery'),
            ),
          ],
        ),
        const WidgetGrid(),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String icon;
  final double size;
  const _Badge(this.icon, {this.size = 32});
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      color: Color.fromRGBO(255, 255, 255, .14),
    ),
    alignment: Alignment.center,
    child: Lucide(icon, size: 16, color: Colors.white),
  );
}

/// Last night: duration in dots, quality, and the night on a 24-hour line.
class _LastNight extends StatelessWidget {
  final Summary sum;
  const _LastNight({required this.sum});
  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context), last = sum.last;
    return PressScale(
      label: 'Прошлая ночь. Открыть сон',
      onPressed: () => s.setTab('sleep'),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 278),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Expanded(
                    child: Text(
                      'Прошлая ночь',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -.34,
                      ),
                    ),
                  ),
                  _Badge('arrowUpRight', size: 36),
                ],
              ),
              const SizedBox(height: 28),
              if (last == null)
                const Text(
                  '—',
                  style: TextStyle(fontSize: 64, height: 1, color: _white65),
                )
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.bottomLeft,
                        child: Dots(
                          value: hm(last.durationMin),
                          size: 64,
                          square: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: Text(
                        'ч',
                        style: TextStyle(
                          fontSize: 17,
                          height: 1,
                          color: _white65,
                        ),
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 16),
              if (last == null) ...[
                const Text(
                  'Запишите первую ночь: это займёт минуту.',
                  style: TextStyle(fontSize: 13, color: _white70),
                ),
                const SizedBox(height: 32),
                SomnaButton(
                  label: 'Записать сон',
                  leading: 'plus',
                  onPressed: () => s.openSheet('sleep'),
                ),
              ] else ...[
                Text(
                  qualityLabel(last.quality),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${last.bedtime} → ${last.wakeTime}, ${last.awakenings == 0 ? 'без пробуждений' : '${last.awakenings} ${pluralRu(last.awakenings, ['пробуждение', 'пробуждения', 'пробуждений'])}'}',
                  style: const TextStyle(fontSize: 13, color: _white65),
                ),
                const SizedBox(height: 32),
                NightLine(
                  bedtime: last.bedtime,
                  wakeTime: last.wakeTime,
                  bedGoal: s.bedGoal,
                  wakeGoal: s.wakeGoal,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Tile nested inside the hero card.
class _Tile extends StatelessWidget {
  final String title, label, icon, note;
  final Widget? value;
  final VoidCallback onPressed;
  const _Tile({
    required this.title,
    required this.label,
    required this.icon,
    required this.note,
    required this.value,
    required this.onPressed,
  });
  @override
  Widget build(BuildContext context) => PressScale(
    label: label,
    onPressed: onPressed,
    child: Container(
      height: 138,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color.fromRGBO(255, 255, 255, .1),
        borderRadius: BorderRadius.circular(26),
        border: const Border(
          top: BorderSide(color: Color.fromRGBO(255, 255, 255, .14)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color.fromRGBO(255, 255, 255, .8),
                  ),
                ),
              ),
              _Badge(icon),
            ],
          ),
          const Spacer(),
          value ?? const Text('—', style: TextStyle(fontSize: 30, height: 1)),
          const SizedBox(height: 10),
          Text(
            note,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, height: 1, color: _white70),
          ),
        ],
      ),
    ),
  );
}

/// Today's small steps: a dotted progress line and what is left to do.
class _DayPlan extends StatelessWidget {
  const _DayPlan();
  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final plan = dayPlan(
      nights: s.nights,
      moods: s.moods,
      waterMl: s.water.ml,
      waterGoal: waterGoalMl,
      ritualDone: s.ritual.done.length,
    );
    final done = plan.where((p) => p.done).length;
    final all = done == plan.length;
    void run(String id) {
      switch (id) {
        case 'sleep' || 'mood':
          s.openSheet(id);
        case 'water':
          s.addWater(250);
        default:
          s.setTab('practices');
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHead(
          title: 'План дня',
          hint: all ? 'Всё выполнено' : '$done из ${plan.length} выполнено',
        ),
        SomnaCard(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                image: true,
                label: 'Выполнено $done из ${plan.length}',
                child: SizedBox(
                  height: 16,
                  child: DotTrack(value: done / plan.length, count: 44),
                ),
              ),
              if (all)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: SomnaColors.lime,
                        ),
                        alignment: Alignment.center,
                        child: const Lucide(
                          'check',
                          size: 16,
                          strokeWidth: 3,
                          color: SomnaColors.limeInk,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Все шаги на сегодня сделаны. Хорошего вечера.',
                          style: TextStyle(
                            fontSize: 15,
                            height: 1.375,
                            color: Color.fromRGBO(255, 255, 255, .64),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: Column(
                    children: [
                      for (final p in plan.where((p) => !p.done))
                        PressScale(
                          key: ValueKey('plan-${p.id}'),
                          label: '${p.label}. ${p.hint}',
                          onPressed: () => run(p.id),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 12,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      width: 1.5,
                                      color: const Color.fromRGBO(
                                        255,
                                        255,
                                        255,
                                        .3,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    p.label,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 15),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  p.hint,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color.fromRGBO(255, 255, 255, .5),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Lucide(
                                  'chevronRight',
                                  size: 16,
                                  color: Color.fromRGBO(255, 255, 255, .5),
                                ),
                              ],
                            ),
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
}
