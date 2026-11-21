import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/features.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'controls.dart';

/// WHO-5: five questions scored 0–5; the index is the sum times four.
int who5Score(List<int> answers) => answers.fold(0, (a, b) => a + b) * 4;

String who5Advice(int score) => score < 52
    ? 'Если такое состояние держится больше двух недель, стоит обсудить его со специалистом.'
    : 'Повторяйте тест раз в неделю, чтобы видеть динамику.';

class WellbeingSheet extends StatefulWidget {
  const WellbeingSheet({super.key});
  @override
  State<WellbeingSheet> createState() => _WellbeingSheetState();
}

class _WellbeingSheetState extends State<WellbeingSheet> {
  List<int> _answers = const [];

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final q = _answers.length, done = q >= who5.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Индекс благополучия',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w500,
                        height: 1.25,
                        letterSpacing: -.72,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'WHO-5: пять вопросов, одна минута',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.375,
                        color: c.ink3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              IconButton(
                tooltip: 'Закрыть',
                onPressed: () => store.openSheet(null),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (done)
            _Result(
              score: who5Score(_answers),
              previous: store.wellbeing.lastOrNull?.score,
              onSave: () {
                store.addWellbeing(who5Score(_answers).toDouble());
                store.notify('Результат сохранён');
                store.openSheet(null);
              },
              onRestart: () => setState(() => _answers = const []),
            )
          else ...[
            Semantics(
              container: true,
              label: 'Вопрос ${q + 1} из ${who5.length}',
              child: Row(
                children: [
                  for (var i = 0; i < who5.length; i++) ...[
                    if (i > 0) const SizedBox(width: 6),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: ColoredBox(
                          color: c.ink.withValues(alpha: .15),
                          child: AnimatedFractionallySizedBox(
                            duration: MediaQuery.disableAnimationsOf(context)
                                ? Duration.zero
                                : SomnaMotion.verySlow,
                            curve: SomnaMotion.smooth,
                            alignment: Alignment.centerLeft,
                            widthFactor: i < q ? 1 : 0,
                            child: Container(height: 4, color: c.accent),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'За последние две недели',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: c.ink3,
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 84),
              child: Align(
                alignment: Alignment.topLeft,
                child: Text(
                  who5[q],
                  key: ValueKey(q),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    height: 1.15,
                    letterSpacing: -.72,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            for (var v = 0; v < who5Scale.length; v++) ...[
              if (v > 0) const SizedBox(height: 8),
              PressScale(
                onPressed: () => setState(() => _answers = [..._answers, v]),
                child: GlassSurface(
                  radius: 26,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          who5Scale[v],
                          style: const TextStyle(fontSize: 15, height: 1.4),
                        ),
                      ),
                      ExcludeSemantics(
                        child: Row(
                          children: [
                            for (var k = 0; k < 5; k++)
                              Container(
                                width: 6,
                                height: 6,
                                margin: EdgeInsets.only(left: k > 0 ? 4 : 0),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: k < v
                                      ? c.accent
                                      : c.ink.withValues(alpha: .2),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (q > 0) ...[
              const SizedBox(height: 16),
              MindButton(
                label: 'Назад',
                kind: MindButtonKind.glass,
                onPressed: () => setState(
                  () => _answers = _answers.sublist(0, _answers.length - 1),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _Result extends StatelessWidget {
  final int score;
  final double? previous;
  final VoidCallback onSave, onRestart;
  const _Result({
    required this.score,
    required this.previous,
    required this.onSave,
    required this.onRestart,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Column(
      children: [
        const SizedBox(height: 4),
        Ring(
          value: score / 100,
          size: 190,
          stroke: 4,
          child: Dots(value: score, square: true, size: 54),
        ),
        const SizedBox(height: 24),
        Text(
          who5Label(score),
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            letterSpacing: -.44,
          ),
        ),
        const SizedBox(height: 8),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 300),
          child: Text(
            '${previous == null ? '' : 'Прошлый результат: ${scoreText(previous!)}. '}${who5Advice(score)}',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.625, color: c.ink2),
          ),
        ),
        const SizedBox(height: 28),
        MindButton(label: 'Сохранить результат', onPressed: onSave),
        const SizedBox(height: 10),
        MindButton(
          label: 'Пройти заново',
          kind: MindButtonKind.glass,
          onPressed: onRestart,
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}
