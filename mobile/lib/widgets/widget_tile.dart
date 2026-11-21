import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/surfaces.dart';
import 'catalog.dart';
import 'kit.dart';
import 'lucide.dart';

const _ink2 = Color.fromRGBO(255, 255, 255, .64);
const _sub = TextStyle(fontSize: 12, height: 1.375, color: _ink2);
const _milestones = [7, 14, 30, 60, 100, 200, 365];

/// What a tap on the widget does, and how it is announced.
({VoidCallback run, String label}) widgetAction(
  SomnaStore s,
  SomnaWidget widget,
) => switch (widget.kind) {
  'streak' ||
  'week' => (run: () => s.openSheet('recap'), label: 'Открыть итоги недели'),
  'water' => (run: () => s.addWater(250), label: 'Добавить 250 мл воды'),
  'mood' => (run: () => s.openSheet('mood'), label: 'Чек-ин состояния'),
  'evening' => (
    run: () => s.patch({'eveningMode': !s.eveningMode}),
    label: 'Переключить вечерний режим',
  ),
  'energy' => (run: () => s.openSheet('sleep'), label: 'Записать сон'),
  'plan' => (run: () => s.setTab('today'), label: 'План дня'),
  'cycle' => (
    run: () => s.openSheet('cycles'),
    label: 'Открыть калькулятор циклов',
  ),
  'wellbeing' => (
    run: () => s.openSheet('wellbeing'),
    label: 'Пройти тест благополучия',
  ),
  'custom' => (
    run: () => s.bumpWidget(widget.id),
    label: 'Добавить ${displayNumber(widget.step ?? 1)} ${widget.unit ?? ''}'
        .trim(),
  ),
  _ => (run: () => s.setTab('sleep'), label: 'Открыть сон'),
};

class WidgetTile extends StatelessWidget {
  final SomnaWidget widget;
  final bool interactive;

  /// Hides the corner action (badge, switch), as the gallery preview does.
  final bool showAction;
  const WidgetTile({
    super.key,
    required this.widget,
    this.interactive = true,
    this.showAction = true,
  });
  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final action = widgetAction(s, widget);
    final title = widget.kind == 'custom'
        ? (widget.title ?? 'Мой виджет')
        : widgetMeta[widget.kind]?.$1 ?? '';
    final body = SizedBox.expand(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: _body(context, s),
        ),
      ),
    );
    return Semantics(
      container: true,
      button: interactive,
      label: interactive ? '$title. ${action.label}' : title,
      child: SomnaCard(
        tone: widget.tone,
        radius: SomnaRadii.medium,
        padding: EdgeInsets.zero,
        onTap: interactive ? action.run : null,
        child: body,
      ),
    );
  }

  Widget _head(String title, {String? sub, Widget? right}) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(child: _CardTitle(title, sub: sub)),
      if (right != null && showAction) ...[const SizedBox(width: 8), right],
    ],
  );

  Widget _badge(String icon) => Container(
    width: 36,
    height: 36,
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      color: Color.fromRGBO(255, 255, 255, .14),
    ),
    alignment: Alignment.center,
    child: Lucide(icon, size: 16, color: Colors.white),
  );

  Widget _note(String text, {double top = 8}) => Padding(
    padding: EdgeInsets.only(top: top),
    child: Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: _sub,
    ),
  );

  /// Instruments that run edge to edge under the 18px card padding.
  Widget _track(double value, bool wide, {bool marker = true}) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: SizedBox(
      height: 16,
      child: LayoutBuilder(
        builder: (context, box) => OverflowBox(
          minWidth: box.maxWidth + 36,
          maxWidth: box.maxWidth + 36,
          child: DotTrack(value: value, count: wide ? 44 : 22, marker: marker),
        ),
      ),
    ),
  );

  List<Widget> _body(BuildContext context, SomnaStore s) {
    final sum = summarize(s.nights, s.moods, s.bedGoal, s.wakeGoal);
    final wide = widget.size == '2x1';
    final kind = widget.kind;
    const spacer = Spacer();
    if (const ['sleep', 'week', 'energy', 'rhythm', 'debt'].contains(kind) &&
        sum.week.isEmpty) {
      return [
        _head(widgetMeta[kind]!.$1),
        spacer,
        const Text(
          'Пока нет данных. Запишите сон.',
          style: TextStyle(fontSize: 14, height: 1.4, color: _ink2),
        ),
      ];
    }
    final big = wide ? 44.0 : 32.0;
    switch (kind) {
      case 'streak':
        final next =
            _milestones.where((m) => m > sum.streak).firstOrNull ??
            sum.streak + 100;
        return [
          _head(
            'Серия',
            sub: wide ? 'До отметки $next' : null,
            right: wide ? _badge('flame') : null,
          ),
          spacer,
          _Figure(
            sum.streak,
            unit: pluralRu(sum.streak, ['день', 'дня', 'дней']),
          ),
          _track(sum.streak / next, wide),
        ];
      case 'sleep':
        final last = sum.last;
        final values = sum.week.map((n) => n.durationMin.toDouble()).toList();
        final figure = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _Figure(
              last == null ? '0:00' : hm(last.durationMin),
              square: true,
              size: big,
            ),
            _note(last == null ? 'нет записей' : 'часов прошлой ночью'),
          ],
        );
        return [
          _head(
            'Сон',
            sub: wide && last != null
                ? '${last.bedtime} → ${last.wakeTime}'
                : null,
            right: _badge('arrowUpRight'),
          ),
          spacer,
          if (wide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                figure,
                const SizedBox(width: 24),
                Expanded(
                  child: Wave(
                    values: values,
                    color: const Color(0xfff0a8dc),
                    height: 70,
                  ),
                ),
              ],
            )
          else ...[
            Wave(values: values, color: const Color(0xfff0a8dc), height: 44),
            const SizedBox(height: 8),
            figure,
          ],
        ];
      case 'water':
        final ml = s.water.ml;
        final figure = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _Figure(displayNumber(ml), unit: 'мл', square: true, size: big),
            if (wide)
              _note(
                'осталось ${displayNumber((waterGoalMl - ml).clamp(0, waterGoalMl))} мл',
              ),
          ],
        );
        return [
          _head(
            'Вода',
            sub: wide ? 'Цель $waterGoalMl мл' : null,
            right: _badge('plus'),
          ),
          spacer,
          if (wide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                figure,
                const SizedBox(width: 24),
                Expanded(child: Arc(value: ml / waterGoalMl)),
              ],
            )
          else ...[
            SizedBox(height: 40, child: Arc(value: ml / waterGoalMl)),
            const SizedBox(height: 12),
            figure,
          ],
        ];
      case 'mood':
        final m = sum.lastMood;
        final pct = m == null ? 0 : moodPct(m.valence);
        final ring = Ring(
          value: pct / 100,
          size: wide ? 118 : 88,
          stroke: 2.4,
          color: const Color(0xffc9ec5a),
          child: m == null
              ? Text('—', style: TextStyle(fontSize: wide ? 30 : 24, height: 1))
              : Dots(value: pct, square: true, size: wide ? 30 : 24),
        );
        if (wide) {
          return [
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const _CardTitle('Состояние', sub: 'Последний чек-ин'),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              m == null
                                  ? 'Нет записей'
                                  : getValenceLabel(m.valence),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 20,
                                height: 1.25,
                                fontWeight: FontWeight.w500,
                                letterSpacing: -.4,
                              ),
                            ),
                            _note(
                              m == null || m.emotions.isEmpty
                                  ? 'Отметьте, как вы'
                                  : m.emotions.take(3).join(' · '),
                              top: 6,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 20),
                  ring,
                ],
              ),
            ),
          ];
        }
        return [
          _head('Состояние'),
          spacer,
          Center(child: ring),
          const SizedBox(height: 6),
          Center(
            child: Text(
              m == null ? 'Отметьте, как вы' : getValenceLabel(m.valence),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: _ink2),
            ),
          ),
        ];
      case 'evening':
        final c = bedtimeCountdown(s.bedGoal, s.wakeGoal);
        final on = s.eveningMode;
        final state = c.past ? 'пора спать' : 'до отбоя';
        return [
          _head(
            wide ? 'Вечерний режим' : 'Вечер',
            sub: wide
                ? 'Отбой в ${s.bedGoal} · напоминание ${s.reminderTime}'
                : null,
            right: SomnaToggle(
              checked: on,
              label: 'Вечерний режим',
              onChanged: interactive
                  ? (v) => s.patch({'eveningMode': v})
                  : null,
            ),
          ),
          spacer,
          AnimatedOpacity(
            duration: SomnaMotion.fast,
            opacity: on ? 1 : .4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                _Figure(
                  c.past ? '0:00' : hm(c.minutes),
                  unit: wide ? state : null,
                  size: wide ? 40 : 32,
                ),
                if (!wide) _note(state),
                _track(c.dayProgress, wide),
              ],
            ),
          ),
        ];
      case 'week':
        final span = tail(s.nights, wide ? 28 : 14);
        return [
          _head(
            'Неделя сна',
            sub: 'Среднее за 7 ночей',
            right: wide ? _badge('sparkles') : null,
          ),
          spacer,
          _Figure(
            hm(sum.avgDuration),
            unit: 'ч',
            square: true,
            size: wide ? 46 : 32,
          ),
          const SizedBox(height: 16),
          DotRow(
            values: [
              for (final n in span)
                n.durationMin >= sum.target * .93 ? 1.0 : 0.0,
            ],
            size: wide ? 6 : 5,
          ),
        ];
      case 'energy':
        final q = sum.last?.quality ?? 0;
        final figure = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _Figure(displayNumber(q), unit: '/ 100', square: true, size: big),
            if (!wide) _note(qualityLabel(q)),
          ],
        );
        return [
          _head(
            'Бодрость',
            sub: wide ? qualityLabel(q) : null,
            right: _badge('zap'),
          ),
          spacer,
          if (wide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                figure,
                const SizedBox(width: 24),
                Expanded(
                  child: Wave(
                    values: sum.week.map((n) => n.quality.toDouble()).toList(),
                    color: const Color(0xffffb070),
                    height: 70,
                  ),
                ),
              ],
            )
          else
            figure,
        ];
      case 'rhythm':
        final devs = [
          for (final n in sum.week) deviationMinutes(n.bedtime, s.bedGoal),
        ];
        return [
          _head('Режим', sub: 'План отбоя ${s.bedGoal}'),
          spacer,
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _Figure('${sum.accuracy}%', size: wide ? 40 : 32),
                  _note('ночей вовремя'),
                ],
              ),
              if (wide) ...[
                const SizedBox(width: 20),
                Expanded(
                  child: SizedBox(
                    height: 76,
                    child: CustomPaint(painter: _RhythmPainter(devs)),
                  ),
                ),
              ],
            ],
          ),
        ];
      case 'debt':
        return [
          _head('Долг сна', sub: wide ? 'Недосып за 7 ночей' : null),
          spacer,
          _Figure(hm(sum.debt), unit: 'ч', square: true, size: big),
          _note(sum.debt > 90 ? 'верните +20 мин к отбою' : 'в пределах нормы'),
        ];
      case 'plan':
        final plan = dayPlan(
          nights: s.nights,
          moods: s.moods,
          waterMl: s.water.ml,
          waterGoal: waterGoalMl,
          ritualDone: s.ritual.done.length,
        );
        final done = plan.where((p) => p.done).length;
        return [
          _head(
            'План дня',
            sub: wide
                ? plan.where((p) => !p.done).firstOrNull?.label ??
                      'Всё выполнено'
                : null,
            right: _badge('listChecks'),
          ),
          spacer,
          _Figure(
            '$done/${plan.length}',
            unit: wide ? 'шагов сделано' : null,
            square: true,
            size: big,
          ),
          const SizedBox(height: 16),
          DotRow(
            values: [for (final p in plan) p.done ? 1.0 : 0.0],
            size: wide ? 7 : 6,
          ),
        ];
      case 'cycle':
        final best = wakeOptions(s.bedGoal).firstWhere((o) => o.best);
        return [
          _head(
            'Циклы сна',
            sub: wide ? 'Если лечь в ${s.bedGoal}' : null,
            right: _badge('alarmClock'),
          ),
          spacer,
          _Figure(best.time, unit: wide ? 'лучший подъём' : null, size: big),
          _note('${best.cycles} циклов · ${hm(best.sleepMin)} ч'),
        ];
      case 'wellbeing':
        final last = s.wellbeing.lastOrNull;
        return [
          _head(
            wide ? 'Благополучие' : 'WHO-5',
            sub: wide ? 'Индекс WHO-5' : null,
            right: _badge('heartPulse'),
          ),
          spacer,
          _Figure(
            last == null ? null : displayNumber(last.score),
            unit: '/ 100',
            square: true,
            size: big,
          ),
          _note(last == null ? 'пройдите тест' : who5Label(last.score)),
        ];
      default:
        final value = widget.value ?? 0;
        final target = (widget.target ?? 0) > 0 ? widget.target! : 1;
        final unit = widget.unit ?? '';
        return [
          _head(
            widget.title == null || widget.title!.isEmpty
                ? 'Мой виджет'
                : widget.title!,
            sub: wide ? 'Цель ${displayNumber(target)} $unit' : null,
            right: _badge('plus'),
          ),
          spacer,
          _Figure(
            displayNumber(value),
            unit: '/ ${displayNumber(target)} $unit',
            size: wide ? 40 : 32,
          ),
          _track(value / target, wide, marker: value < target),
        ];
    }
  }
}

class _CardTitle extends StatelessWidget {
  final String title;
  final String? sub;
  const _CardTitle(this.title, {this.sub});
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontSize: 17,
          height: 1.25,
          fontWeight: FontWeight.w500,
          letterSpacing: -.34,
        ),
      ),
      if (sub != null)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            sub!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: _sub,
          ),
        ),
    ],
  );
}

/// Headline number in dot-matrix with a small unit beside it.
class _Figure extends StatelessWidget {
  final Object? value;
  final String? unit;
  final bool square;
  final double size;
  const _Figure(this.value, {this.unit, this.square = false, this.size = 32});
  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      if (value == null)
        Text('—', style: TextStyle(fontSize: size, height: 1))
      else
        Flexible(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.bottomLeft,
            child: Dots(value: value!, size: size, square: square),
          ),
        ),
      if (value != null && unit != null) ...[
        const SizedBox(width: 8),
        Text(
          unit!,
          maxLines: 1,
          style: const TextStyle(fontSize: 12, height: 1, color: _ink2),
        ),
      ],
    ],
  );
}

/// Bedtime deviation per night around the planned time (dashed line).
class _RhythmPainter extends CustomPainter {
  final List<int> devs;
  const _RhythmPainter(this.devs);
  @override
  void paint(Canvas canvas, Size size) {
    final mid = size.height / 2;
    final dash = Paint()
      ..color = const Color.fromRGBO(255, 255, 255, .25)
      ..strokeWidth = 1;
    for (var x = 0.0; x < size.width; x += 6) {
      canvas.drawLine(Offset(x, mid), Offset(x + 3, mid), dash);
    }
    for (var i = 0; i < devs.length; i++) {
      final x = devs.length == 1
          ? size.width / 2
          : 4.5 + (size.width - 9) * i / (devs.length - 1);
      final at = Offset(x, mid + (devs[i] / 90 * 32).clamp(-32, 32));
      final onTime = devs[i].abs() <= 30;
      if (onTime) {
        canvas.drawCircle(
          at,
          4.5,
          Paint()
            ..color = SomnaColors.lime.withValues(alpha: .6)
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5),
        );
      }
      canvas.drawCircle(
        at,
        4.5,
        Paint()
          ..color = onTime
              ? SomnaColors.lime
              : const Color.fromRGBO(255, 255, 255, .7),
      );
    }
  }

  @override
  bool shouldRepaint(_RhythmPainter old) =>
      old.devs.join(',') != devs.join(',');
}
