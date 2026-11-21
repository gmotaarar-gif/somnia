import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../mind/controls.dart';
import '../shell/top_bar.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/mood_orb.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

Color _rgb(RGB c) => Color.fromARGB(255, c[0], c[1], c[2]);

/// Mean valence of the check-ins made on [key]; null when there were none.
double? moodDayAverage(List<MoodEntry> moods, String key) {
  var sum = 0.0, count = 0;
  for (final m in moods) {
    final at = DateTime.tryParse(m.at);
    if (at == null || dateKey(at) != key) continue;
    sum += m.valence;
    count++;
  }
  return count == 0 ? null : sum / count;
}

class MindScreen extends StatefulWidget {
  /// Clock for the rolling windows; tests pin it.
  final DateTime Function()? now;
  const MindScreen({super.key, this.now});
  @override
  State<MindScreen> createState() => _MindScreenState();
}

class _MindScreenState extends State<MindScreen> {
  String _view = 'trend', _pattern = 'factors';
  int _insightAt = 0;
  bool _allEntries = false;

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final now = (widget.now ?? DateTime.now)();
    final moods = store.moods, nights = store.nights;
    final last = moods.lastOrNull;
    final who = store.wellbeing.lastOrNull;
    final whoPrev = store.wellbeing.length > 1
        ? store.wellbeing[store.wellbeing.length - 2]
        : null;
    final days = [
      for (var i = 13; i >= 0; i--)
        MoodDay(
          key: dateKey(daysAgo(i, now)),
          label: weekdayShort(daysAgo(i, now)),
          value: moodDayAverage(moods, dateKey(daysAgo(i, now))),
        ),
    ];
    final insights = buildInsights(
      nights,
      moods,
      store.bedGoal,
      store.wakeGoal,
      now: now,
    );
    final link = sleepMoodLink(nights, moods);
    final weekStart = dateKey(daysAgo(6, now));
    final weekCheckins = moods.where((m) {
      final at = DateTime.tryParse(m.at);
      return at != null && dateKey(at).compareTo(weekStart) >= 0;
    }).length;
    final insight = insights.isEmpty
        ? null
        : insights[_insightAt % insights.length];
    final diary = moods.reversed.take(_allEntries ? moods.length : 3).toList();
    String when(MoodEntry m) =>
        '${relativeDay(dateKey(DateTime.parse(m.at)), now)}, ${clockOf(m.at)}';

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
      children: [
        TopBar(
          title: 'Состояние',
          sub:
              '$weekCheckins ${pluralRu(weekCheckins, ['чек-ин', 'чек-ина', 'чек-инов'])} за неделю',
        ),
        _Rise(
          index: 0,
          child: SomnaCard(
            tone: 'mint',
            radius: SomnaRadii.large,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 268),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Expanded(child: Text('Сейчас', style: _title)),
                          const SizedBox(width: 12),
                          Text(
                            last == null ? 'нет записей' : when(last),
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color.fromRGBO(255, 255, 255, .7),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Transform.translate(
                            offset: const Offset(-10, 0),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              child: MoodOrb(
                                valence: last?.valence ?? 0,
                                size: 124,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  alignment: Alignment.centerLeft,
                                  child: Dots(
                                    value: last == null
                                        ? '--'
                                        : '${moodPct(last.valence)}%',
                                    size: 40,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  last == null
                                      ? 'Как вы сейчас?'
                                      : getValenceLabel(last.valence),
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w500,
                                    height: 1.25,
                                    letterSpacing: -.6,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  last == null
                                      ? 'Первый чек-ин займёт полминуты'
                                      : last.emotions.isEmpty
                                      ? 'без уточнений'
                                      : last.emotions.take(3).join(' · '),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    height: 1.375,
                                    color: Color.fromRGBO(255, 255, 255, .75),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: MindButton(
                      label: 'Чек-ин',
                      icon: Icons.add,
                      onPressed: () => store.openSheet('mood'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _Rise(
          index: 1,
          child: SomnaCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Настроение', style: _title),
                          const SizedBox(height: 4),
                          Text(
                            _view == 'trend'
                                ? 'последние 14 дней'
                                : 'последние 28 дней',
                            style: TextStyle(
                              fontSize: 13,
                              color: SomnaColors.dark.ink3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    MindSegmented<String>(
                      label: 'Вид графика настроения',
                      value: _view,
                      options: const [('trend', 'График'), ('month', 'Месяц')],
                      onChanged: (v) => setState(() => _view = v),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _Swap(
                  id: _view,
                  child: _view == 'trend'
                      ? MoodTrend(days: days)
                      : MoodCalendar(moods: moods, today: now),
                ),
                if (link > 3) ...[
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.only(top: 16),
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(
                          color: Color.fromRGBO(255, 255, 255, .08),
                        ),
                      ),
                    ),
                    child: Text.rich(
                      TextSpan(
                        text: 'После ночей от 7 часов настроение выше в среднем на ',
                        children: [
                          TextSpan(
                            text:
                                '$link ${pluralRu(link, ['пункт', 'пункта', 'пунктов'])}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: SomnaColors.lime,
                            ),
                          ),
                          const TextSpan(text: '.'),
                        ],
                      ),
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.625,
                        color: SomnaColors.dark.ink2,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 40),
        _Rise(
          index: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              MindSectionHead(
                title: 'Закономерности',
                trailing: MindSegmented<String>(
                  label: 'Вид закономерностей',
                  value: _pattern,
                  options: const [
                    ('factors', 'Влияние'),
                    ('emotions', 'Эмоции'),
                  ],
                  onChanged: (v) => setState(() => _pattern = v),
                ),
              ),
              const SizedBox(height: 16),
              SomnaCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _pattern == 'factors'
                          ? 'На сколько пунктов меняется баланс с отметкой'
                          : 'Чем крупнее, тем чаще отмечаете',
                      style: TextStyle(
                        fontSize: 13,
                        color: SomnaColors.dark.ink3,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _Swap(
                      id: _pattern,
                      child: _pattern == 'factors'
                          ? _Factors(moods: moods)
                          : _Emotions(moods: moods),
                    ),
                  ],
                ),
              ),
              if (insight != null) ...[
                const SizedBox(height: 12),
                SomnaCard(
                  tone: insight.tone,
                  padding: const EdgeInsets.all(20),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 136),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          height: 36,
                          child: Row(
                            children: [
                              const Expanded(
                                child: Text('Наблюдение', style: _title),
                              ),
                              if (insights.length > 1)
                                PressScale(
                                  label: 'Следующее наблюдение',
                                  onPressed: () => setState(
                                    () => _insightAt =
                                        (_insightAt + 1) % insights.length,
                                  ),
                                  child: Container(
                                    height: 36,
                                    padding: const EdgeInsets.only(
                                      left: 14,
                                      right: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color.fromRGBO(
                                        255,
                                        255,
                                        255,
                                        .14,
                                      ),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          '${_insightAt % insights.length + 1} / ${insights.length}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontFeatures: [
                                              FontFeature.tabularFigures(),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(
                                          Icons.chevron_right,
                                          size: 16,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        _Swap(
                          id: insight.id,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Dots(
                                  value: insight.metric,
                                  square: true,
                                  size: 26,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      insight.title,
                                      style: const TextStyle(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w500,
                                        height: 1.375,
                                        letterSpacing: -.34,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      insight.body,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        height: 1.625,
                                        color: Color.fromRGBO(
                                          255,
                                          255,
                                          255,
                                          .75,
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
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              PressScale(
                label: 'Пройти тест благополучия',
                onPressed: () => store.openSheet('wellbeing'),
                child: GlassSurface(
                  radius: 30,
                  padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
                  child: Row(
                    children: [
                      if (who != null)
                        Ring(
                          value: who.score / 100,
                          size: 44,
                          stroke: 3,
                          child: Text(
                            scoreText(who.score),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      else
                        const GlassSurface(
                          inset: true,
                          radius: 22,
                          child: SizedBox.square(
                            dimension: 44,
                            child: Icon(Icons.monitor_heart_outlined, size: 18),
                          ),
                        ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Индекс благополучия WHO-5',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              who == null
                                  ? '5 вопросов, одна минута'
                                  : '${who5Label(who.score)}${whoPrev == null ? '' : ' · ${who.score - whoPrev.score >= 0 ? '+' : ''}${scoreText(who.score - whoPrev.score)} к прошлому'}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 13, color: c.ink2),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Icon(Icons.chevron_right, size: 20, color: c.ink3),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 40),
        _Rise(
          index: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const MindSectionHead(title: 'Дневник'),
              const SizedBox(height: 16),
              if (diary.isEmpty)
                GlassSurface(
                  radius: 26,
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      const ExcludeSemantics(
                        child: CustomPaint(
                          size: Size.square(64),
                          painter: _MascotPainter(),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Здесь появятся ваши чек-ины.',
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.625,
                            color: c.ink2,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                for (final (i, m) in diary.indexed) ...[
                  if (i > 0) const SizedBox(height: 8),
                  _DiaryEntry(key: ValueKey(m.id), entry: m, when: when(m)),
                ],
              if (moods.length > 3) ...[
                const SizedBox(height: 8),
                MindButton(
                  kind: MindButtonKind.ghost,
                  label: _allEntries ? 'Свернуть' : 'Показать все записи',
                  onPressed: () => setState(() => _allEntries = !_allEntries),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

const _title = TextStyle(
  fontSize: 17,
  fontWeight: FontWeight.w500,
  height: 1.25,
  letterSpacing: -.34,
);

/// Staggered entrance of the screen's blocks.
class _Rise extends StatelessWidget {
  final int index;
  final Widget child;
  const _Rise({required this.index, required this.child});
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return child;
    final delay = index * 60;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 400 + delay),
      curve: Interval(delay / (400 + delay), 1, curve: SomnaMotion.smooth),
      builder: (context, t, child) => Opacity(
        opacity: t.clamp(0, 1),
        child: Transform.translate(
          offset: Offset(0, 12 * (1 - t)),
          child: child,
        ),
      ),
      child: child,
    );
  }
}

class _Swap extends StatelessWidget {
  final String id;
  final Widget child;
  const _Swap({required this.id, required this.child});
  @override
  Widget build(BuildContext context) => AnimatedSize(
    duration: MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : SomnaMotion.fast,
    curve: SomnaMotion.smooth,
    alignment: Alignment.topCenter,
    child: AnimatedSwitcher(
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero
          : SomnaMotion.quick,
      switchInCurve: SomnaMotion.smooth,
      switchOutCurve: SomnaMotion.smooth,
      layoutBuilder: (current, previous) => Stack(
        alignment: Alignment.topCenter,
        children: [...previous, ?current],
      ),
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, .04),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        ),
      ),
      child: KeyedSubtree(key: ValueKey(id), child: child),
    ),
  );
}

class _Factors extends StatelessWidget {
  final List<MoodEntry> moods;
  const _Factors({required this.moods});
  @override
  Widget build(BuildContext context) {
    final factors = factorImpacts(moods)
        .where((f) => f.count >= 2)
        .take(5)
        .toList();
    if (factors.isEmpty) {
      return Text(
        'Отмечайте в чек-инах, что повлияло на день. После нескольких записей здесь появится, что помогает, а что мешает.',
        style: TextStyle(
          fontSize: 14,
          height: 1.625,
          color: SomnaColors.dark.ink3,
        ),
      );
    }
    final maxDelta = factors.fold<int>(
      1,
      (m, f) => f.delta.abs() > m ? f.delta.abs() : m,
    );
    return Column(
      children: [
        for (final (i, f) in factors.indexed) ...[
          if (i > 0) const SizedBox(height: 16),
          MergeSemantics(
            child: Row(
              children: [
                SizedBox(
                  width: 84,
                  child: Text(
                    f.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 12,
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: f.delta.abs() / maxDelta),
                      duration: MediaQuery.disableAnimationsOf(context)
                          ? Duration.zero
                          : SomnaMotion.slow,
                      curve: SomnaMotion.smooth,
                      builder: (context, t, _) =>
                          CustomPaint(painter: _ImpactPainter(t, f.delta >= 0)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 36,
                  child: Text(
                    '${f.delta > 0 ? '+' : ''}${f.delta}',
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: f.delta >= 0
                          ? SomnaColors.lime
                          : const Color(0xffff9aa7),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _ImpactPainter extends CustomPainter {
  final double share;
  final bool positive;
  const _ImpactPainter(this.share, this.positive);
  @override
  void paint(Canvas canvas, Size size) {
    final mid = size.width / 2, y = size.height / 2;
    final track = Paint()
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round
      ..color = const Color.fromRGBO(255, 255, 255, .08);
    canvas.drawLine(Offset(3, y), Offset(size.width - 3, y), track);
    final length = share * mid;
    if (length > 0) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          positive
              ? Rect.fromLTWH(mid, y - 3, length, 6)
              : Rect.fromLTWH(mid - length, y - 3, length, 6),
          const Radius.circular(3),
        ),
        Paint()..color = positive ? SomnaColors.lime : const Color(0xffff7d8e),
      );
    }
    canvas.drawRect(
      Rect.fromLTWH(mid - .5, 0, 1, size.height),
      Paint()..color = const Color.fromRGBO(255, 255, 255, .25),
    );
  }

  @override
  bool shouldRepaint(_ImpactPainter old) =>
      old.share != share || old.positive != positive;
}

class _Emotions extends StatelessWidget {
  final List<MoodEntry> moods;
  const _Emotions({required this.moods});
  @override
  Widget build(BuildContext context) {
    final emotions = emotionCounts(moods).take(8).toList();
    if (emotions.isEmpty) {
      return Text(
        'Появятся после первых чек-инов.',
        style: TextStyle(
          fontSize: 14,
          height: 1.625,
          color: SomnaColors.dark.ink3,
        ),
      );
    }
    final top = emotions.first.count;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final e in emotions)
          GlassSurface(
            inset: true,
            radius: 30,
            padding: EdgeInsets.symmetric(
              horizontal: 13 + e.count / top * 6,
              vertical: 7 + e.count / top * 4,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    e.name,
                    style: TextStyle(fontSize: 13 + e.count / top * 4),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${e.count}',
                  style: TextStyle(fontSize: 11, color: SomnaColors.dark.ink3),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// One check-in: a compact row that opens to the full tags and note.
class _DiaryEntry extends StatefulWidget {
  final MoodEntry entry;
  final String when;
  const _DiaryEntry({super.key, required this.entry, required this.when});
  @override
  State<_DiaryEntry> createState() => _DiaryEntryState();
}

class _DiaryEntryState extends State<_DiaryEntry> {
  bool _open = false;
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), m = widget.entry;
    final pal = sampleValencePalette(m.valence);
    final tags = [...m.emotions, ...m.factors].join(' · ');
    final note = m.note?.trim() ?? '';
    final more = tags.isNotEmpty || note.isNotEmpty;
    final detail = TextStyle(fontSize: 13, height: 1.375, color: c.ink2);
    final row = GlassSurface(
      radius: 26,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                center: const Alignment(-.28, -.4),
                radius: .8,
                colors: [_rgb(pal.core), _rgb(pal.mid), _rgb(pal.outer)],
                stops: const [0, .48, 1],
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
                    Expanded(
                      child: Text(
                        getValenceLabel(m.valence),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          height: 1.375,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${moodPct(m.valence)}%',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        fontFeatures: const [FontFeature.tabularFigures()],
                        color: c.ink2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  widget.when,
                  style: TextStyle(fontSize: 12, color: c.ink3),
                ),
                if (tags.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    tags,
                    maxLines: _open ? null : 1,
                    overflow: _open ? null : TextOverflow.ellipsis,
                    style: detail,
                  ),
                ],
                if (note.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    '«$note»',
                    maxLines: _open ? null : 1,
                    overflow: _open ? null : TextOverflow.ellipsis,
                    style: detail,
                  ),
                ],
              ],
            ),
          ),
          if (more) ...[
            const SizedBox(width: 16),
            Padding(
              padding: const EdgeInsets.only(top: 14),
              child: AnimatedRotation(
                turns: _open ? .5 : 0,
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : SomnaMotion.fast,
                child: Icon(Icons.expand_more, size: 16, color: c.ink3),
              ),
            ),
          ],
        ],
      ),
    );
    if (!more) return row;
    return Semantics(
      expanded: _open,
      child: PressScale(
        onPressed: () => setState(() => _open = !_open),
        child: row,
      ),
    );
  }
}

/// The cloud that keeps empty lists company on web.
class _MascotPainter extends CustomPainter {
  const _MascotPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final u = size.width / 64;
    final body = Path()
      ..addOval(Rect.fromCircle(center: Offset(22 * u, 36 * u), radius: 13 * u))
      ..addOval(Rect.fromCircle(center: Offset(34 * u, 27 * u), radius: 16 * u))
      ..addOval(Rect.fromCircle(center: Offset(46 * u, 37 * u), radius: 11 * u))
      ..addRRect(
        RRect.fromLTRBR(12 * u, 34 * u, 54 * u, 50 * u, Radius.circular(8 * u)),
      );
    canvas.drawPath(body, Paint()..color = const Color(0xffc4cafa));
    final eye = Paint()..color = const Color(0xff23264a);
    canvas.drawRRect(
      RRect.fromLTRBR(26 * u, 33 * u, 29 * u, 40 * u, Radius.circular(2 * u)),
      eye,
    );
    canvas.drawRRect(
      RRect.fromLTRBR(37 * u, 33 * u, 40 * u, 40 * u, Radius.circular(2 * u)),
      eye,
    );
  }

  @override
  bool shouldRepaint(_MascotPainter old) => false;
}
