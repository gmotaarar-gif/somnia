import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/features.dart';
import '../theme/tokens.dart';
import '../ui/charts/primitives.dart';
import '../ui/surfaces.dart';
import 'controls.dart';

List<Award> awardsOf(SomnaStore s) => buildAwards(
  nights: s.nights,
  moods: s.moods,
  sessions: s.sessions,
  wellbeing: s.wellbeing,
  bedGoal: s.bedGoal,
  wakeGoal: s.wakeGoal,
  customWidgets: s.widgets.where((w) => w.kind == 'custom').length,
);

class AwardsSheet extends StatelessWidget {
  const AwardsSheet({super.key});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), awards = awardsOf(store);
    final done = awards.where((a) => a.done).length;
    final still = MediaQuery.disableAnimationsOf(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        SheetHeader(
          title: 'Достижения',
          description: 'Открыто $done из ${awards.length}',
          onClose: () => store.openSheet(null),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            children: [
              for (var row = 0; row < awards.length; row += 2) ...[
                if (row > 0) const SizedBox(height: 12),
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (var i = row; i < row + 2; i++) ...[
                        if (i > row) const SizedBox(width: 12),
                        Expanded(
                          child: i < awards.length
                              ? _appear(awards[i], i, still)
                              : const SizedBox(),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

Widget _appear(Award award, int i, bool still) => TweenAnimationBuilder<double>(
  tween: Tween(begin: still ? 1 : 0, end: 1),
  duration: Duration(milliseconds: 400 + i * 35),
  curve: Interval(i * 35 / (400 + i * 35), 1, curve: SomnaMotion.smooth),
  builder: (context, t, child) => Opacity(
    opacity: t * (award.done ? 1 : .7),
    child: Transform.scale(scale: .92 + .08 * t, child: child),
  ),
  child: ConstrainedBox(
    constraints: const BoxConstraints(minHeight: 168),
    child: _AwardCard(award),
  ),
);

class _AwardCard extends StatelessWidget {
  final Award award;
  const _AwardCard(this.award);
  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label:
        '${award.title}. ${award.about}. ${award.done ? 'Открыто' : '${(award.progress * 100).round()}%'}',
    excludeSemantics: true,
    child: SomnaCard(
      tone: award.done ? award.tone : 'ink',
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Ring(
            value: award.progress,
            size: 46,
            stroke: 6,
            color: award.done ? Colors.white : SomnaColors.lime,
            child: Icon(
              award.done ? Icons.check : Icons.workspace_premium_outlined,
              size: 16,
              color: award.done ? Colors.white : SomnaColors.dark.ink3,
            ),
          ),
          const Spacer(),
          const SizedBox(height: 12),
          Text(
            award.title,
            style: const TextStyle(
              fontSize: 15,
              height: 1.25,
              fontWeight: FontWeight.w600,
              letterSpacing: -.15,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            award.about,
            style: TextStyle(
              fontSize: 12,
              height: 1.375,
              color: SomnaColors.dark.ink2,
            ),
          ),
        ],
      ),
    ),
  );
}
