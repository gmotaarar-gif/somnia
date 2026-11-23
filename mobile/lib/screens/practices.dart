import 'package:material_ui/material_ui.dart';

import '../data/articles.dart';
import '../data/store.dart';
import '../logic/time.dart';
import '../shell/top_bar.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import '../data/facts.dart';
import '../data/models.dart';
import '../ui/buddies.dart';
import '../ui/dots.dart';
import '../ui/feedback.dart';
import '../ui/glow.dart';
import '../ui/info_cards.dart';

const _preview = 3;

/// Evening ritual steps, as web `RITUAL`.
const ritualSteps = <({String id, String label, String hint})>[
  (id: 'dim', label: 'Приглушить свет', hint: 'за час до сна'),
  (id: 'screen', label: 'Убрать экран', hint: 'за 30 минут'),
  (id: 'warm', label: 'Тёплый душ или чай', hint: 'телу проще остыть'),
  (id: 'air', label: 'Проветрить спальню', hint: '17–20 °C'),
  (id: 'notes', label: 'Выгрузить мысли', hint: 'три строки на бумаге'),
];

const _white14 = Color.fromRGBO(255, 255, 255, .14);

/// Minutes of reading per topic: read articles only.
List<double> readMinutesByTopic(List<String> read) => [
  for (final t in articleTopics.skip(1))
    articles
        .where((a) => a.topic == t.id && read.contains(a.id))
        .fold<double>(0, (s, a) => s + a.min),
];

/// Practice minutes for each of the last seven days, oldest first.
List<double> practiceWeek(List<PracticeSession> sessions, DateTime now) => [
  for (var i = 6; i >= 0; i--)
    sessions
        .where((x) {
          final at = DateTime.tryParse(x.at)?.toLocal();
          return at != null && dateKey(at) == dateKey(daysAgo(i, now));
        })
        .fold<double>(0, (s, x) => s + x.min),
];

class PracticesScreen extends StatefulWidget {
  const PracticesScreen({super.key});
  @override
  State<PracticesScreen> createState() => _PracticesScreenState();
}

class _PracticesScreenState extends State<PracticesScreen> {
  String _topic = 'all';
  bool _all = false;

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final now = DateTime.now();
    final read = store.readArticles;
    final readCount = articles.where((a) => read.contains(a.id)).length;
    final readMin = articles
        .where((a) => read.contains(a.id))
        .fold<int>(0, (s, a) => s + a.min);
    final featured = articles.firstWhere(
      (a) => !read.contains(a.id),
      orElse: () => articles.first,
    );
    final list = articles
        .where(
          (a) => a.id != featured.id && (_topic == 'all' || a.topic == _topic),
        )
        .toList();
    final shown = _all ? list : list.take(_preview).toList();
    final sessions = store.sessions;
    final totalMin = jsRound(sessions.fold<double>(0, (s, x) => s + x.min));
    final openWorries = store.worries.where((w) => !w.done).length;
    final done = store.ritual.done;
    final byTopic = readMinutesByTopic(read);
    final week = practiceWeek(sessions, now);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TopBar(
            title: 'Практики',
            sub:
                '$readCount из ${articles.length} ${pluralRu(articles.length, const ['статьи', 'статей', 'статей'])} прочитано',
          ),
          Reveal(
            child: _ReadingStats(
              read: readCount,
              total: articles.length,
              minutes: readMin,
              byTopic: byTopic,
            ),
          ),
          const SizedBox(height: 12),
          Reveal(
            index: 1,
            child: _Featured(
              article: featured,
              onOpen: () => store.openSheet('article', featured.id),
            ),
          ),
          const SizedBox(height: 40),
          const _SectionHead(
            title: 'Статьи',
            hint: 'Коротко о сне и состоянии',
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 36,
            child: OverflowBox(
              maxWidth: MediaQuery.sizeOf(context).width,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: articleTopics.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final t = articleTopics[i];
                  return _TopicChip(
                    label: t.label,
                    active: _topic == t.id,
                    onTap: () => setState(() => _topic = t.id),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          AnimatedSwitcher(
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : SomnaMotion.fast,
            switchInCurve: SomnaMotion.smooth,
            layoutBuilder: (current, _) => current ?? const SizedBox.shrink(),
            child: Column(
              key: ValueKey(_topic),
              children: [
                for (final (i, a) in shown.indexed) ...[
                  if (i > 0) const SizedBox(height: 10),
                  Reveal(
                    index: i,
                    distance: 10,
                    child: _ArticleRow(
                      article: a,
                      read: read.contains(a.id),
                      onOpen: () => store.openSheet('article', a.id),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (list.length > _preview) ...[
            const SizedBox(height: 10),
            PressScale(
              onPressed: () => setState(() => _all = !_all),
              child: GlassSurface(
                radius: 24,
                child: SizedBox(
                  height: 48,
                  child: Center(
                    child: Text(
                      _all ? 'Свернуть' : 'Все статьи · ${list.length}',
                      style: TextStyle(fontSize: 14, color: c.ink2),
                    ),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          FactPlate(
            fact: factOfDay(now, topic: 'habits'),
            palette: 'lime',
          ),
          const SizedBox(height: 40),
          const _SectionHead(
            title: 'Ваша неделя',
            hint: 'Минуты практик за последние семь дней',
          ),
          const SizedBox(height: 16),
          SomnaCard(
            tone: 'forest',
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Dots(
                      value: jsRound(week.fold<double>(0, (s, x) => s + x)),
                      size: 32,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 2),
                      child: Text(
                        'мин за неделю',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xb3ffffff),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Bars(
                  values: week,
                  labels: [
                    for (var i = 6; i >= 0; i--) weekdayShort(daysAgo(i, now)),
                  ],
                  highlight: 6,
                  height: 120,
                  format: (v) => '${jsRound(v)} мин',
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          PressScale(
            label: 'Дневник тревог',
            onPressed: () => store.openSheet('worry'),
            child: GlassSurface(
              radius: 30,
              padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
              child: Row(
                children: [
                  const Buddy(kind: BuddyKind.sprout, size: 48),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Дневник тревог',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          openWorries > 0
                              ? '$openWorries отложено до завтра'
                              : 'Выгрузить мысли перед сном',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: c.ink2),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, size: 20, color: c.ink3),
                ],
              ),
            ),
          ),
          const SizedBox(height: 40),
          _SectionHead(
            title: 'Вечерний ритуал',
            hint: '${done.length} из ${ritualSteps.length} шагов перед сном',
          ),
          const SizedBox(height: 16),
          SomnaCard(
            padding: const EdgeInsets.fromLTRB(0, 20, 0, 12),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: LedMeter(
                    value: done.length / ritualSteps.length,
                    count: 25,
                    height: 28,
                    color: SomnaColors.lime,
                  ),
                ),
                const SizedBox(height: 12),
                for (final r in ritualSteps)
                  _RitualRow(
                    step: r,
                    done: done.contains(r.id),
                    onToggle: () {
                      Feel.tick();
                      store.toggleRitual(r.id);
                    },
                  ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const TipCarousel(topic: 'habits', buddy: BuddyKind.book),
          if (sessions.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              '${sessions.length} ${pluralRu(sessions.length, const ['сессия', 'сессии', 'сессий'])} · $totalMin мин практики всего',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: c.ink3),
            ),
          ],
        ],
      ),
    );
  }
}

/// Reading at a glance: a ring of read articles, minutes read and how the
/// reading splits by topic.
class _ReadingStats extends StatelessWidget {
  final int read, total, minutes;
  final List<double> byTopic;
  const _ReadingStats({
    required this.read,
    required this.total,
    required this.minutes,
    required this.byTopic,
  });
  @override
  Widget build(BuildContext context) => BevelGlass(
    glow: const Color(0xffa6e22e),
    intensity: .8,
    child: Row(
      children: [
        Ring(
          value: total == 0 ? 0 : read / total,
          size: 104,
          stroke: 5,
          color: SomnaColors.lime,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Dots(value: read, size: 26, color: Colors.white),
              const SizedBox(height: 4),
              Text(
                'из $total',
                style: const TextStyle(fontSize: 11, color: Color(0xb3ffffff)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 20),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ваше чтение',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 2),
              Text(
                minutes == 0
                    ? 'Начните с рекомендованной статьи'
                    : '≈ $minutes мин прочитано',
                style: const TextStyle(fontSize: 12, color: Color(0xb3ffffff)),
              ),
              const SizedBox(height: 12),
              for (final (i, t) in articleTopics.skip(1).indexed)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 76,
                        child: Text(
                          t.label,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xccffffff),
                          ),
                        ),
                      ),
                      Expanded(
                        child: LedMeter(
                          value: _share(i),
                          count: 12,
                          height: 10,
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
  );

  double _share(int i) {
    final topic = articleTopics[i + 1].id;
    final all = articles
        .where((a) => a.topic == topic)
        .fold<int>(0, (s, a) => s + a.min);
    return all == 0 ? 0 : byTopic[i] / all;
  }
}

class _SectionHead extends StatelessWidget {
  final String title, hint;
  const _SectionHead({required this.title, required this.hint});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 4),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          header: true,
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              height: 1.25,
              letterSpacing: -.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          hint,
          style: TextStyle(fontSize: 13, color: SomnaColors.of(context).ink3),
        ),
      ],
    ),
  );
}

class _Featured extends StatelessWidget {
  final Article article;
  final VoidCallback onOpen;
  const _Featured({required this.article, required this.onOpen});
  @override
  Widget build(BuildContext context) => PressScale(
    label: 'Читать: ${article.title}',
    onPressed: onOpen,
    child: SomnaCard(
      tone: article.tone,
      radius: SomnaRadii.large,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 252),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: _Pill('${article.tag} · ${article.min} мин'),
                  ),
                ),
                const SizedBox(width: 12),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    color: _white14,
                    shape: BoxShape.circle,
                  ),
                  child: SizedBox(
                    width: 40,
                    height: 40,
                    child: Icon(Icons.north_east, size: 18),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    style: const TextStyle(
                      fontSize: 28,
                      height: 1.08,
                      letterSpacing: -1.12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    article.lead,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.375,
                      color: Color.fromRGBO(255, 255, 255, .72),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _Pill extends StatelessWidget {
  final String text;
  const _Pill(this.text);
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: _white14,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Text(text, style: const TextStyle(fontSize: 12)),
    ),
  );
}

class _TopicChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _TopicChip({
    required this.label,
    required this.active,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final text = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Center(
        widthFactor: 1,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: active ? (dark ? Colors.black : Colors.white) : c.ink2,
          ),
        ),
      ),
    );
    return PressScale(
      selected: active,
      onPressed: onTap,
      child: active
          ? AnimatedContainer(
              duration: SomnaMotion.quick,
              height: 36,
              decoration: BoxDecoration(
                color: c.ink,
                borderRadius: BorderRadius.circular(18),
              ),
              child: text,
            )
          : GlassSurface(radius: 18, child: SizedBox(height: 34, child: text)),
    );
  }
}

class _ArticleRow extends StatelessWidget {
  final Article article;
  final bool read;
  final VoidCallback onOpen;
  const _ArticleRow({
    required this.article,
    required this.read,
    required this.onOpen,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return PressScale(
      onPressed: onOpen,
      child: GlassSurface(
        radius: 26,
        padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
        child: Row(
          children: [
            SizedBox(
              width: 68,
              height: 68,
              child: SomnaCard(
                tone: article.tone,
                radius: SomnaRadii.small,
                padding: EdgeInsets.zero,
                child: Center(
                  child: Text(
                    '${article.min} мин',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.tag,
                    style: TextStyle(fontSize: 12, color: c.ink3),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    article.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.375,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (read)
              Semantics(
                label: 'Прочитано',
                child: const DecoratedBox(
                  decoration: BoxDecoration(
                    color: SomnaColors.lime,
                    shape: BoxShape.circle,
                  ),
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: Icon(
                      Icons.check,
                      size: 15,
                      color: SomnaColors.limeInk,
                    ),
                  ),
                ),
              )
            else
              Icon(Icons.chevron_right, size: 20, color: c.ink3),
          ],
        ),
      ),
    );
  }
}

class _RitualRow extends StatelessWidget {
  final ({String id, String label, String hint}) step;
  final bool done;
  final VoidCallback onToggle;
  const _RitualRow({
    required this.step,
    required this.done,
    required this.onToggle,
  });
  @override
  Widget build(BuildContext context) {
    const ink3 = Color.fromRGBO(255, 255, 255, .5);
    return Semantics(
      container: true,
      checked: done,
      label: '${step.label}, ${step.hint}',
      excludeSemantics: true,
      onTap: onToggle,
      child: PressScale(
        onPressed: onToggle,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            children: [
              AnimatedContainer(
                duration: SomnaMotion.fast,
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done ? SomnaColors.lime : Colors.transparent,
                  border: Border.all(
                    width: 1.5,
                    color: done
                        ? SomnaColors.lime
                        : const Color.fromRGBO(255, 255, 255, .3),
                  ),
                ),
                child: done
                    ? const Icon(
                        Icons.check,
                        size: 14,
                        color: SomnaColors.limeInk,
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AnimatedDefaultTextStyle(
                      duration: SomnaMotion.fast,
                      style: DefaultTextStyle.of(context).style.copyWith(
                        fontSize: 15,
                        height: 1.375,
                        color: done ? ink3 : Colors.white,
                        decoration: done
                            ? TextDecoration.lineThrough
                            : TextDecoration.none,
                        decorationColor: const Color.fromRGBO(
                          255,
                          255,
                          255,
                          .25,
                        ),
                      ),
                      child: Text(step.label),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      step.hint,
                      style: const TextStyle(fontSize: 12, color: ink3),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
