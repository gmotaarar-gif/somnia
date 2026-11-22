import 'package:flutter/rendering.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/surfaces.dart';

const onboardingWidgetTitles = <WidgetKind, String>{
  'streak': 'Серия',
  'evening': 'Вечерний режим',
  'water': 'Вода',
  'rhythm': 'Режим',
  'debt': 'Долг сна',
  'cycle': 'Циклы сна',
  'wellbeing': 'Благополучие',
};

const _waterGoalMl = 2000;
const _milestones = [7, 14, 30, 60, 100, 200, 365];
const _sub = TextStyle(fontSize: 12, color: Color.fromRGBO(255, 255, 255, .64));

/// Inert 1x1 preview of a starter widget, drawn from the user's own data.
class OnboardingWidgetPreview extends StatelessWidget {
  final SomnaWidget widget;
  const OnboardingWidgetPreview({super.key, required this.widget});
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: MediaQuery.withNoTextScaling(
      child: SomnaCard(
        tone: widget.tone,
        padding: const EdgeInsets.all(18),
        child: SizedBox.expand(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: _body(SomnaScope.of(context)),
          ),
        ),
      ),
    ),
  );

  List<Widget> _body(SomnaStore store) {
    final sum = summarize(
      store.nights,
      store.moods,
      store.bedGoal,
      store.wakeGoal,
    );
    if (const ['rhythm', 'debt'].contains(widget.kind) && sum.week.isEmpty) {
      return [
        _head(onboardingWidgetTitles[widget.kind]!),
        const Spacer(),
        const Text(
          'Пока нет данных. Запишите сон.',
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            color: Color.fromRGBO(255, 255, 255, .64),
          ),
        ),
      ];
    }
    switch (widget.kind) {
      case 'streak':
        final next =
            _milestones.where((m) => m > sum.streak).firstOrNull ??
            sum.streak + 100;
        return [
          _head('Серия'),
          const Spacer(),
          _figure(
            sum.streak,
            unit: pluralRu(sum.streak, const ['день', 'дня', 'дней']),
          ),
          const SizedBox(height: 12),
          _bleed(DotTrack(value: sum.streak / next, count: 22)),
        ];
      case 'evening':
        final c = bedtimeCountdown(store.bedGoal, store.wakeGoal);
        return [
          _head('Вечер'),
          const Spacer(),
          Opacity(
            opacity: store.eveningMode ? 1 : .4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _figure(c.past ? '0:00' : hm(c.minutes)),
                const SizedBox(height: 8),
                _note(c.past ? 'пора спать' : 'до отбоя'),
                const SizedBox(height: 12),
                _bleed(DotTrack(value: c.dayProgress, count: 22)),
              ],
            ),
          ),
        ];
      case 'water':
        return [
          _head('Вода'),
          const Spacer(),
          _bleed(Arc(value: store.water.ml / _waterGoalMl)),
          const SizedBox(height: 12),
          _figure(store.water.ml.round(), unit: 'мл', square: true),
        ];
      case 'rhythm':
        return [
          _head('Режим', sub: 'План отбоя ${store.bedGoal}'),
          const Spacer(),
          _figure('${sum.accuracy}%'),
          const SizedBox(height: 8),
          _note('ночей вовремя'),
        ];
      case 'debt':
        return [
          _head('Долг сна'),
          const Spacer(),
          _figure(hm(sum.debt), unit: 'ч', square: true),
          const SizedBox(height: 8),
          _note(sum.debt > 90 ? 'верните +20 мин к отбою' : 'в пределах нормы'),
        ];
      case 'cycle':
        final best = wakeOptions(store.bedGoal).firstWhere((o) => o.best);
        return [
          _head('Циклы сна'),
          const Spacer(),
          _figure(best.time),
          const SizedBox(height: 8),
          _note('${best.cycles} циклов · ${hm(best.sleepMin)} ч'),
        ];
      default:
        final last = store.wellbeing.lastOrNull;
        return [
          _head('WHO-5'),
          const Spacer(),
          _figure(last?.score.round(), unit: '/ 100', square: true),
          const SizedBox(height: 8),
          _note(last == null ? 'пройдите тест' : who5Label(last.score)),
        ];
    }
  }

  static Widget _head(String title, {String? sub}) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
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
      if (sub != null) ...[
        const SizedBox(height: 6),
        Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: _sub),
      ],
    ],
  );

  static Widget _note(String text) =>
      Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: _sub);

  static Widget _figure(Object? value, {String? unit, bool square = false}) =>
      value == null
      ? const Text('—', style: TextStyle(fontSize: 32, height: 1))
      : FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.bottomLeft,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Dots(value: value, size: 32, square: square),
              if (unit != null) ...[
                const SizedBox(width: 8),
                Text(unit, style: _sub.copyWith(height: 1)),
              ],
            ],
          ),
        );

  /// Runs an instrument to the card's edges, past its padding.
  static Widget _bleed(Widget child) => LayoutBuilder(
    builder: (context, constraints) => OverflowBox(
      maxWidth: constraints.maxWidth + 36,
      minWidth: constraints.maxWidth + 36,
      fit: OverflowBoxFit.deferToChild,
      child: child,
    ),
  );
}
