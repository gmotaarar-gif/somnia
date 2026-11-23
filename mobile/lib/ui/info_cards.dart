import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../data/facts.dart';
import '../data/store.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import 'buddies.dart';
import 'charts/charts.dart';
import 'glow.dart';
import 'surfaces.dart';

const _stageColors = [
  Color(0xff8f7bff),
  Color(0xff3b2cd2),
  Color(0xffff4db8),
  Color(0xffd9f24a),
];

TextStyle _title(BuildContext context) => const TextStyle(
  fontSize: 20,
  height: 1.25,
  letterSpacing: -.5,
  fontWeight: FontWeight.w500,
);

/// A section title with a short hint, used by the info blocks.
class InfoHead extends StatelessWidget {
  final String title, hint;
  const InfoHead({super.key, required this.title, required this.hint});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 0, 4, 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(title, style: _title(context))),
        const SizedBox(height: 4),
        Text(
          hint,
          style: TextStyle(fontSize: 13, color: SomnaColors.of(context).ink3),
        ),
      ],
    ),
  );
}

/// The fact of the day on a glowing plate, with its figure set large.
class FactPlate extends StatelessWidget {
  final SomnaFact fact;
  final String palette;
  const FactPlate({super.key, required this.fact, this.palette = 'candy'});
  @override
  Widget build(BuildContext context) => GlowPlate.named(
    palette,
    radius: SomnaRadii.medium,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const GlowTag(
                'Факт дня',
                icon: Icons.auto_awesome,
                onLight: true,
              ),
              const SizedBox(height: 14),
              Text(
                fact.title,
                style: const TextStyle(
                  fontSize: 19,
                  height: 1.2,
                  letterSpacing: -.4,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                fact.text,
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: Color(0xb315151c),
                ),
              ),
            ],
          ),
        ),
        if (fact.figure != null) ...[
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                fact.figure!,
                style: const TextStyle(
                  fontSize: 40,
                  height: 1,
                  letterSpacing: -2,
                  fontWeight: FontWeight.w300,
                  color: Colors.white,
                  shadows: [Shadow(color: Color(0x66000000), blurRadius: 16)],
                ),
              ),
              if (fact.unit != null)
                Text(
                  fact.unit!,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Color(0x9915151c),
                  ),
                ),
            ],
          ),
        ],
      ],
    ),
  );
}

/// A row that sends the user to the journal in the profile.
class JournalLink extends StatelessWidget {
  final String kind, title, sub;
  const JournalLink({
    super.key,
    required this.kind,
    required this.title,
    required this.sub,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return TiltPress(
      label: title,
      maxTilt: .03,
      onPressed: () => SomnaScope.of(context).openSheet('journal', kind),
      child: GlassSurface(
        radius: 26,
        padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
        child: Row(
          children: [
            GlassSurface(
              inset: true,
              radius: 22,
              child: SizedBox.square(
                dimension: 44,
                child: Icon(
                  kind == 'nights'
                      ? Icons.menu_book_outlined
                      : Icons.history_rounded,
                  size: 18,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    sub,
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
    );
  }
}

/// A stacked bar that fills segment by segment.
class StackBar extends StatelessWidget {
  final List<(String, double)> parts;
  final List<Color> colors;
  const StackBar({super.key, required this.parts, this.colors = _stageColors});
  @override
  Widget build(BuildContext context) {
    final still = MediaQuery.disableAnimationsOf(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: SizedBox(
            height: 20,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: still ? 1 : 0, end: 1),
              duration: still
                  ? Duration.zero
                  : const Duration(milliseconds: 900),
              curve: SomnaMotion.smooth,
              builder: (context, v, _) => Row(
                children: [
                  for (final (i, p) in parts.indexed)
                    Flexible(
                      flex: math.max(1, (p.$2 * 1000 * v).round()),
                      child: Container(
                        margin: EdgeInsets.only(left: i == 0 ? 0 : 2),
                        color: colors[i % colors.length],
                      ),
                    ),
                  Flexible(
                    flex: math.max(1, ((1 - v) * 1000).round()),
                    child: const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 14,
          runSpacing: 8,
          children: [
            for (final (i, p) in parts.indexed)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: colors[i % colors.length],
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${p.$1} ${(p.$2 * 100).round()}%',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xb3ffffff),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }
}

/// A horizontal range on a 0-12 h scale, with an optional marker.
class RangeRow extends StatelessWidget {
  final String label;
  final double low, high;
  final double? mark;
  const RangeRow({
    super.key,
    required this.label,
    required this.low,
    required this.high,
    this.mark,
  });
  static const _max = 12.0;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Row(
      children: [
        SizedBox(
          width: 84,
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: Color(0xccffffff)),
          ),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, box) {
              final w = box.maxWidth;
              return SizedBox(
                height: 18,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      top: 7,
                      bottom: 7,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: const Color(0x1fffffff),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    Positioned(
                      left: w * low / _max,
                      width: w * (high - low) / _max,
                      top: 3,
                      bottom: 3,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(6),
                          gradient: const LinearGradient(
                            colors: [Color(0xff8f7bff), Color(0xffff4db8)],
                          ),
                        ),
                      ),
                    ),
                    if (mark != null)
                      Positioned(
                        left: (w * mark!.clamp(0, _max) / _max) - 2,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        child: const DecoratedBox(
                          decoration: BoxDecoration(
                            color: SomnaColors.lime,
                            borderRadius: BorderRadius.all(Radius.circular(2)),
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 40,
          child: Text(
            '${low.round()}-${high.round()} ч',
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 12, color: Color(0x99ffffff)),
          ),
        ),
      ],
    ),
  );
}

/// "How a night works": stages share, sleep cycles as a wave, and the
/// recommended hours by age against the user's own target.
class SleepExplainer extends StatelessWidget {
  const SleepExplainer({super.key});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context);
    final target = spanMinutes(store.bedGoal, store.wakeGoal) / 60;
    final cycles = (target * 60 / 90).floor();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const InfoHead(
          title: 'Как устроена ночь',
          hint: 'Немного теории, чтобы цифры читались легче',
        ),
        SomnaCard(
          tone: 'night',
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Фазы за типичную ночь',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 14),
              const StackBar(parts: typicalStages),
              const SizedBox(height: 24),
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Циклы по 90 минут',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Text(
                    'в вашей цели: $cycles',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xb3ffffff),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Wave(
                values: [
                  for (var i = 0; i <= 48; i++)
                    .5 +
                        .42 *
                            math.cos(i / 48 * cycles * 2 * math.pi) *
                            (1 - i / 80),
                ],
                fill: true,
                knob: false,
                height: 56,
                color: const Color(0xff8f7bff),
              ),
              const SizedBox(height: 4),
              const Text(
                'Проснуться в конце цикла легче, чем посреди глубокого сна.',
                style: TextStyle(fontSize: 12, color: Color(0x99ffffff)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SomnaCard(
          tone: 'dusk',
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Сколько нужно сна',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: SomnaColors.lime,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'ваша цель ${durationRu(target * 60)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xb3ffffff),
                    ),
                  ),
                ],
              ),
              for (final (label, lo, hi) in sleepByAge)
                RangeRow(label: label, low: lo, high: hi, mark: target),
            ],
          ),
        ),
      ],
    );
  }
}

/// A row of tips with a companion, for the bottom of a screen.
class TipCarousel extends StatefulWidget {
  final String topic;
  final BuddyKind buddy;
  const TipCarousel({
    super.key,
    required this.topic,
    this.buddy = BuddyKind.cloud,
  });
  @override
  State<TipCarousel> createState() => _TipCarouselState();
}

class _TipCarouselState extends State<TipCarousel> {
  late final List<SomnaFact> _facts = somnaFacts
      .where((f) => f.topic == widget.topic)
      .toList();
  int _i = 0;
  @override
  Widget build(BuildContext context) {
    final f = _facts[_i % _facts.length];
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => setState(() => _i++),
      child: Semantics(
        button: true,
        hint: 'Следующий совет',
        child: BuddyTip(
          key: ValueKey(_i),
          kind: widget.buddy,
          text: '${f.title}. ${f.text}',
        ),
      ),
    );
  }
}
