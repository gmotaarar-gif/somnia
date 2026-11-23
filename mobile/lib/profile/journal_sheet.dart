import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../sleep/controls.dart' show Segmented, SomnaChip;
import '../theme/tokens.dart';
import '../ui/buddies.dart';
import '../ui/dots.dart';
import '../ui/feedback.dart';
import '../ui/glow.dart';
import '../ui/press_scale.dart';
import 'controls.dart' show SheetHeader;

const _monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

enum JournalKind { nights, moods }

enum JournalSpan { week, month, all }

String monthTitle(DateTime d) => '${_monthNames[d.month - 1]} ${d.year}';

/// Groups items by calendar month, newest month first, keeping order inside.
List<(String, List<T>)> groupByMonth<T>(
  List<T> items,
  DateTime Function(T) dateOf,
) {
  final out = <(String, List<T>)>[];
  for (final item in items) {
    final title = monthTitle(dateOf(item));
    if (out.isEmpty || out.last.$1 != title) {
      out.add((title, [item]));
    } else {
      out.last.$2.add(item);
    }
  }
  return out;
}

DateTime _moodDate(MoodEntry m) =>
    DateTime.tryParse(m.at)?.toLocal() ?? DateTime.now();

bool _inSpan(DateTime d, JournalSpan span, DateTime now) => switch (span) {
  JournalSpan.week => now.difference(d).inDays < 7,
  JournalSpan.month => now.difference(d).inDays < 31,
  JournalSpan.all => true,
};

/// Every night and check-in in one place. The Sleep and Mind screens only
/// show statistics; records are browsed, opened and removed here.
class JournalSheet extends StatefulWidget {
  final String? arg;
  const JournalSheet({super.key, this.arg});
  @override
  State<JournalSheet> createState() => _JournalSheetState();
}

class _JournalSheetState extends State<JournalSheet> {
  late JournalKind _kind = widget.arg == 'moods'
      ? JournalKind.moods
      : JournalKind.nights;
  JournalSpan _span = JournalSpan.all;
  String? _tag;
  ({SleepNight? night, MoodEntry? mood})? _undo;
  Timer? _undoTimer;

  void _deleted({SleepNight? night, MoodEntry? mood}) {
    final store = SomnaScope.of(context);
    Feel.warn();
    if (night != null) store.removeNight(night.id);
    if (mood != null) store.removeMood(mood.id);
    _undoTimer?.cancel();
    setState(() => _undo = (night: night, mood: mood));
    _undoTimer = Timer(const Duration(seconds: 4), () {
      if (mounted) setState(() => _undo = null);
    });
  }

  void _restore() {
    final store = SomnaScope.of(context), u = _undo;
    if (u == null) return;
    if (u.night != null) store.restoreNight(u.night!);
    if (u.mood != null) store.restoreMood(u.mood!);
    _undoTimer?.cancel();
    Feel.success();
    setState(() => _undo = null);
  }

  @override
  void dispose() {
    _undoTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final now = DateTime.now();
    final nights = store.nights.reversed
        .where((n) => _inSpan(parseKey(n.dateKey), _span, now))
        .where((n) => _tag == null || n.tags.contains(_tag))
        .toList();
    final moods = store.moods.reversed
        .where((m) => _inSpan(_moodDate(m), _span, now))
        .where(
          (m) =>
              _tag == null ||
              m.emotions.contains(_tag) ||
              m.factors.contains(_tag),
        )
        .toList();
    final tags = _kind == JournalKind.nights
        ? {for (final n in store.nights) ...n.tags}
        : {
            for (final m in store.moods) ...[...m.emotions, ...m.factors],
          };
    final avgSleep = store.nights.isEmpty
        ? null
        : mean(store.nights.map((n) => n.durationMin));
    final avgMood = store.moods.isEmpty
        ? null
        : mean(store.moods.map((m) => m.valence));

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: 'Все записи',
          description: 'Ночи и чек-ины в одном журнале',
          onClose: () => store.openSheet('profile'),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _SummaryTile(
                      label: 'Ночей',
                      value: '${store.nights.length}',
                      note: avgSleep == null
                          ? 'пока пусто'
                          : 'в среднем ${hm(avgSleep)}',
                      glow: const Color(0xff7045ff),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SummaryTile(
                      label: 'Чек-инов',
                      value: '${store.moods.length}',
                      note: avgMood == null
                          ? 'пока пусто'
                          : 'в среднем ${moodPct(avgMood)}%',
                      glow: const Color(0xff3ee6a8),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SummaryTile(
                      label: 'Серия',
                      value: '${computeStreak(store.nights)}',
                      note: 'ночей подряд',
                      glow: const Color(0xffff7a1a),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Segmented<JournalKind>(
                label: 'Тип записей',
                expand: true,
                value: _kind,
                onChanged: (v) => setState(() {
                  _kind = v;
                  _tag = null;
                }),
                options: const [
                  (JournalKind.nights, 'Сон'),
                  (JournalKind.moods, 'Настроение'),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 36,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    for (final (span, label) in const [
                      (JournalSpan.all, 'Всё время'),
                      (JournalSpan.month, 'Месяц'),
                      (JournalSpan.week, 'Неделя'),
                    ]) ...[
                      SomnaChip(
                        label: label,
                        active: _span == span,
                        onPressed: () => setState(() => _span = span),
                      ),
                      const SizedBox(width: 6),
                    ],
                    if (tags.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: VerticalDivider(color: c.hair, width: 1),
                      ),
                    for (final t in tags) ...[
                      SomnaChip(
                        label: t,
                        active: _tag == t,
                        onPressed: () =>
                            setState(() => _tag = _tag == t ? null : t),
                      ),
                      const SizedBox(width: 6),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              AnimatedSwitcher(
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : SomnaMotion.fast,
                switchInCurve: SomnaMotion.smooth,
                transitionBuilder: (child, a) => FadeTransition(
                  opacity: a,
                  child: SlideTransition(
                    position: Tween(
                      begin: const Offset(0, .03),
                      end: Offset.zero,
                    ).animate(a),
                    child: child,
                  ),
                ),
                child: KeyedSubtree(
                  key: ValueKey('$_kind$_span$_tag'),
                  child: _kind == JournalKind.nights
                      ? _nightList(store, nights)
                      : _moodList(moods),
                ),
              ),
              AnimatedSize(
                duration: SomnaMotion.fast,
                curve: SomnaMotion.smooth,
                child: _undo == null
                    ? const SizedBox(width: double.infinity)
                    : Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: _UndoBar(onUndo: _restore),
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _empty(String text, BuddyKind kind) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Column(
      children: [
        Buddy(kind: kind, size: 88),
        const SizedBox(height: 12),
        Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            height: 1.5,
            color: SomnaColors.of(context).ink2,
          ),
        ),
      ],
    ),
  );

  Widget _nightList(SomnaStore store, List<SleepNight> nights) {
    if (nights.isEmpty) {
      return _empty(
        store.nights.isEmpty
            ? 'Здесь будут ваши ночи.\nЗапишите первую через «+» внизу.'
            : 'За этот период ночей нет.',
        BuddyKind.moon,
      );
    }
    final groups = groupByMonth(nights, (n) => parseKey(n.dateKey));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (title, items) in groups) ...[
          _MonthHead(title: title, count: items.length),
          for (final (i, n) in items.indexed)
            Reveal(
              index: i,
              distance: 8,
              child: _Swipe(
                id: 'night-${n.id}',
                onDelete: () => _deleted(night: n),
                child: _NightRow(
                  night: n,
                  score: nightScore(n, store.bedGoal, store.wakeGoal),
                  onOpen: () => store.openSheet('night', n.id),
                ),
              ),
            ),
        ],
        _hint(),
      ],
    );
  }

  Widget _moodList(List<MoodEntry> moods) {
    if (moods.isEmpty) {
      return _empty(
        SomnaScope.of(context).moods.isEmpty
            ? 'Здесь будут ваши чек-ины.\nОтметьте настроение через «+».'
            : 'За этот период чек-инов нет.',
        BuddyKind.star,
      );
    }
    final groups = groupByMonth(moods, _moodDate);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (title, items) in groups) ...[
          _MonthHead(title: title, count: items.length),
          for (final (i, m) in items.indexed)
            Reveal(
              index: i,
              distance: 8,
              child: _Swipe(
                id: 'mood-${m.id}',
                onDelete: () => _deleted(mood: m),
                child: _MoodRow(entry: m),
              ),
            ),
        ],
        _hint(),
      ],
    );
  }

  Widget _hint() => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Text(
      'Смахните запись влево, чтобы удалить',
      textAlign: TextAlign.center,
      style: TextStyle(fontSize: 12, color: SomnaColors.of(context).ink3),
    ),
  );
}

class _SummaryTile extends StatelessWidget {
  final String label, value, note;
  final Color glow;
  const _SummaryTile({
    required this.label,
    required this.value,
    required this.note,
    required this.glow,
  });
  @override
  Widget build(BuildContext context) => BevelGlass(
    glow: glow,
    intensity: .7,
    radius: 24,
    padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xa6ffffff)),
        ),
        const SizedBox(height: 10),
        Dots(value: value, size: 22, color: Colors.white),
        const SizedBox(height: 8),
        Text(
          note,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 11, color: Color(0xb3ffffff)),
        ),
      ],
    ),
  );
}

class _MonthHead extends StatelessWidget {
  final String title;
  final int count;
  const _MonthHead({required this.title, required this.count});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 12, 4, 10),
      child: Row(
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
          ),
          const SizedBox(width: 8),
          Text('$count', style: TextStyle(fontSize: 13, color: c.ink3)),
          const SizedBox(width: 12),
          Expanded(child: Divider(color: c.hair, height: 1)),
        ],
      ),
    );
  }
}

class _Swipe extends StatelessWidget {
  final String id;
  final VoidCallback onDelete;
  final Widget child;
  const _Swipe({required this.id, required this.onDelete, required this.child});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Dismissible(
          key: ValueKey(id),
          direction: DismissDirection.endToStart,
          dismissThresholds: const {DismissDirection.endToStart: .4},
          onDismissed: (_) => onDelete(),
          background: ColoredBox(
            color: c.danger.withValues(alpha: .18),
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
          child: child,
        ),
      ),
    );
  }
}

class _NightRow extends StatelessWidget {
  final SleepNight night;
  final int score;
  final VoidCallback onOpen;
  const _NightRow({
    required this.night,
    required this.score,
    required this.onOpen,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), n = night;
    final hue = Color.lerp(
      const Color(0xff3b2cd2),
      const Color(0xffd9f24a),
      (score / 100).clamp(0.0, 1.0),
    )!;
    return PressScale(
      label: '${relativeDay(n.dateKey)}, ${durationRu(n.durationMin)}',
      onPressed: onOpen,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Color.alphaBlend(c.glass, c.bg),
          borderRadius: BorderRadius.circular(24),
          border: Border(top: BorderSide(color: c.glassEdge)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      hue.withValues(alpha: .55),
                      hue.withValues(alpha: .1),
                    ],
                  ),
                ),
                child: Dots(value: score, size: 14, color: c.ink),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      relativeDay(n.dateKey),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${n.bedtime} → ${n.wakeTime} · ${durationRu(n.durationMin)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: c.ink2),
                    ),
                    if (n.tags.isNotEmpty || n.awakenings > 0) ...[
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (n.awakenings > 0)
                            '${n.awakenings} ${pluralRu(n.awakenings, const ['пробуждение', 'пробуждения', 'пробуждений'])}',
                          ...n.tags,
                        ].join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: c.ink3),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, size: 20, color: c.ink3),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoodRow extends StatefulWidget {
  final MoodEntry entry;
  const _MoodRow({required this.entry});
  @override
  State<_MoodRow> createState() => _MoodRowState();
}

class _MoodRowState extends State<_MoodRow> {
  bool _open = false;
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), m = widget.entry;
    final pal = sampleValencePalette(m.valence);
    Color rgb(RGB x) => Color.fromARGB(255, x[0], x[1], x[2]);
    final tags = [...m.emotions, ...m.factors];
    final note = m.note?.trim() ?? '';
    final more = tags.isNotEmpty || note.isNotEmpty;
    final at = _moodDate(m);
    return PressScale(
      label: getValenceLabel(m.valence),
      onPressed: more ? () => setState(() => _open = !_open) : null,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Color.alphaBlend(c.glass, c.bg),
          borderRadius: BorderRadius.circular(24),
          border: Border(top: BorderSide(color: c.glassEdge)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        center: const Alignment(-.28, -.4),
                        radius: .8,
                        colors: [rgb(pal.core), rgb(pal.mid), rgb(pal.outer)],
                        stops: const [0, .48, 1],
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          getValenceLabel(m.valence),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${relativeDay(dateKey(at))} · ${clockOf(m.at)} · ${moodPct(m.valence)}%',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: c.ink2),
                        ),
                      ],
                    ),
                  ),
                  if (more)
                    AnimatedRotation(
                      turns: _open ? .5 : 0,
                      duration: SomnaMotion.fast,
                      child: Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: c.ink3,
                      ),
                    ),
                ],
              ),
              AnimatedSize(
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : SomnaMotion.fast,
                curve: SomnaMotion.smooth,
                alignment: Alignment.topCenter,
                child: !_open
                    ? const SizedBox(width: double.infinity)
                    : Padding(
                        padding: const EdgeInsets.fromLTRB(62, 10, 8, 4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (tags.isNotEmpty)
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  for (final t in tags)
                                    DecoratedBox(
                                      decoration: BoxDecoration(
                                        color: c.glassInset,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 4,
                                        ),
                                        child: Text(
                                          t,
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            if (note.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                note,
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.45,
                                  color: c.ink2,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _UndoBar extends StatelessWidget {
  final VoidCallback onUndo;
  const _UndoBar({required this.onUndo});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.ink,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 6, 6, 6),
        child: Row(
          children: [
            Expanded(
              child: Text(
                'Запись удалена',
                style: TextStyle(fontSize: 14, color: c.bg),
              ),
            ),
            PressScale(
              label: 'Вернуть',
              onPressed: onUndo,
              child: Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: SomnaColors.lime,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Text(
                  'Вернуть',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: SomnaColors.limeInk,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
