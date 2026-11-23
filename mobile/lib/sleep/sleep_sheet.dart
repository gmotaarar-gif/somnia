import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'controls.dart';
import 'night_line.dart';
import 'time_scrubber.dart';

const sleepTagGroups = [
  (
    'Помогло',
    ['Быстро уснул', 'Глубокий сон', 'Проснулся сам', 'Яркие сны', 'Прохладно'],
  ),
  (
    'Мешало',
    ['Поздний экран', 'Кофеин', 'Стресс', 'Шум', 'Алкоголь', 'Поздний ужин'],
  ),
];

/// Five answers to "how do you feel this morning", each the middle of the
/// range `qualityLabel` names.
const sleepEnergy = [
  (25.0, Color(0xff7c6cf0)),
  (46.0, Color(0xff4aa3ea)),
  (63.0, Color(0xff3ecf8e)),
  (79.0, Color(0xffa6e05a)),
  (94.0, Color(0xffd9f24a)),
];

int energyLevel(num quality) {
  final index = sleepEnergy.indexWhere(
    (level) => qualityLabel(level.$1) == qualityLabel(quality),
  );
  return index < 0 ? sleepEnergy.length - 1 : index;
}

/// The diary rule: every awakening takes eight minutes off the time in bed.
int sleepDuration(String bedtime, String wakeTime, int awakenings) => math.max(
  0,
  (bedtime == wakeTime ? 0 : spanMinutes(bedtime, wakeTime)) - awakenings * 8,
);

double sleepSheetHeight(BuildContext context) => math.max(
  320,
  MediaQuery.sizeOf(context).height * .93 -
      24 -
      MediaQuery.viewPaddingOf(context).vertical -
      MediaQuery.viewInsetsOf(context).bottom,
);

class SleepSheet extends StatefulWidget {
  const SleepSheet({super.key});
  @override
  State<SleepSheet> createState() => _SleepSheetState();
}

class _SleepSheetState extends State<SleepSheet> {
  late final List<String> _days = [
    for (final n in [0, 1, 2]) dateKey(daysAgo(n)),
  ];
  late String _day = _days.first;
  late String _bedtime, _wakeTime;
  double _quality = 75;
  int _awakenings = 0;
  List<String> _tags = const [];
  final _note = TextEditingController();
  final _noteFocus = FocusNode();
  bool _noteOpen = false, _ready = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) return;
    _ready = true;
    _load(_days.first, null);
  }

  /// A morning that already has a night opens that night, to be corrected
  /// rather than silently replaced by the usual hours.
  void _load(String key, String? tracked) {
    final store = SomnaScope.of(context);
    final saved = tracked != null
        ? null
        : store.nights.where((n) => n.dateKey == key).firstOrNull;
    final now = DateTime.now();
    _day = key;
    _bedtime = saved?.bedtime ?? tracked ?? store.bedGoal;
    _wakeTime =
        saved?.wakeTime ??
        (tracked != null
            ? minutesToTime(now.hour * 60 + now.minute)
            : store.wakeGoal);
    _quality = saved?.quality ?? 75;
    _awakenings = saved?.awakenings ?? 0;
    _tags = saved?.tags ?? const [];
    _note.text = saved?.note ?? '';
    _noteOpen = _note.text.isNotEmpty;
  }

  @override
  void dispose() {
    _note.dispose();
    _noteFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final duration = sleepDuration(_bedtime, _wakeTime, _awakenings);
    final diff = duration - spanMinutes(store.bedGoal, store.wakeGoal);
    final exists = store.nights.any((n) => n.dateKey == _day);
    final level = energyLevel(_quality);
    void save() {
      final note = _note.text.trim();
      store.addNight(
        SleepNight(
          dateKey: _day,
          bedtime: _bedtime,
          wakeTime: _wakeTime,
          durationMin: duration.toDouble(),
          quality: _quality,
          awakenings: _awakenings,
          tags: _tags,
          note: note.isEmpty ? null : note,
        ),
      );
      store.notify(exists ? 'Ночь обновлена' : 'Ночь записана');
      store.openSheet(null);
    }

    return PopScope(
      child: SizedBox(
        height: sleepSheetHeight(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SheetHeader(
              title: 'Запись сна',
              description: 'Минута утром, остальное посчитаем сами',
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Segmented<String>(
                      label: 'Утро',
                      expand: true,
                      value: _day,
                      onChanged: (key) => setState(() => _load(key, null)),
                      options: [
                        for (final key in _days) (key, relativeDay(key)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SomnaCard(
                      tone: 'night',
                      radius: SomnaRadii.large,
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'Вы спали',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Color.fromRGBO(255, 255, 255, .72),
                                  ),
                                ),
                              ),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  color: diff >= 0
                                      ? SomnaColors.lime
                                      : const Color.fromRGBO(0, 0, 0, .3),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  child: Text(
                                    diff == 0
                                        ? 'Ровно в цель'
                                        : diff > 0
                                        ? '+${durationRu(diff)} к цели'
                                        : '${durationRu(-diff)} до цели',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: diff >= 0
                                          ? SomnaColors.limeInk
                                          : const Color.fromRGBO(
                                              255,
                                              255,
                                              255,
                                              .8,
                                            ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Dots(
                              value: hm(duration),
                              size: 60,
                              square: true,
                            ),
                          ),
                          const SizedBox(height: 42),
                          NightLine(
                            bedtime: _bedtime,
                            wakeTime: _wakeTime,
                            bedGoal: store.bedGoal,
                            wakeGoal: store.wakeGoal,
                          ),
                          const SizedBox(height: 20),
                          const Divider(
                            height: 1,
                            color: Color.fromRGBO(255, 255, 255, .1),
                          ),
                          TimeScrubber(
                            key: ValueKey('bed-$_day'),
                            label: 'Отбой',
                            value: _bedtime,
                            bare: true,
                            onChanged: (v) => setState(() => _bedtime = v),
                          ),
                          const Divider(
                            height: 1,
                            color: Color.fromRGBO(255, 255, 255, .1),
                          ),
                          TimeScrubber(
                            key: ValueKey('wake-$_day'),
                            label: 'Подъём',
                            value: _wakeTime,
                            bare: true,
                            onChanged: (v) => setState(() => _wakeTime = v),
                          ),
                        ],
                      ),
                    ),
                    if (exists)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(4, 10, 4, 0),
                        child: Text(
                          'За это утро уже есть запись: вы её исправляете.',
                          style: TextStyle(fontSize: 12, color: c.ink3),
                        ),
                      ),
                    const SizedBox(height: 12),
                    GlassSurface(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Expanded(
                                child: Text(
                                  'Бодрость утром',
                                  style: TextStyle(fontSize: 13, color: c.ink3),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Text(
                                qualityLabel(_quality),
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: -.15,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          EnergyRating(
                            level: level,
                            onChanged: (i) =>
                                setState(() => _quality = sleepEnergy[i].$1),
                          ),
                          const SizedBox(height: 16),
                          Divider(height: 1, color: c.hair),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'Просыпались ночью',
                                  style: TextStyle(fontSize: 15),
                                ),
                              ),
                              SomnaStepper(
                                label: 'Пробуждения',
                                value: _awakenings,
                                max: 9,
                                onChanged: (v) =>
                                    setState(() => _awakenings = v),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Что повлияло',
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -.57,
                            ),
                          ),
                          for (final (group, tags) in sleepTagGroups) ...[
                            const SizedBox(height: 16),
                            Text(
                              group,
                              style: TextStyle(fontSize: 12, color: c.ink3),
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final tag in tags)
                                  SomnaChip(
                                    label: tag,
                                    active: _tags.contains(tag),
                                    onPressed: () => setState(
                                      () => _tags = _tags.contains(tag)
                                          ? _tags
                                                .where((t) => t != tag)
                                                .toList()
                                          : [..._tags, tag],
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (_noteOpen)
                      GlassSurface(
                        radius: 24,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 4,
                        ),
                        child: Semantics(
                          label: 'Заметка',
                          child: TextField(
                            controller: _note,
                            focusNode: _noteFocus,
                            minLines: 3,
                            maxLines: 3,
                            maxLength: 160,
                            style: TextStyle(fontSize: 16, color: c.ink),
                            decoration: InputDecoration(
                              border: InputBorder.none,
                              counterText: '',
                              hintText: 'Что запомнилось об этой ночи',
                              hintStyle: TextStyle(fontSize: 16, color: c.ink3),
                            ),
                          ),
                        ),
                      )
                    else
                      PressScale(
                        onPressed: () {
                          setState(() => _noteOpen = true);
                          _noteFocus.requestFocus();
                        },
                        child: GlassSurface(
                          radius: 24,
                          child: SizedBox(
                            height: 48,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.edit_outlined,
                                  size: 16,
                                  color: c.ink2,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Добавить заметку',
                                  style: TextStyle(fontSize: 14, color: c.ink2),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: c.hair)),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: SomnaButton(
                  label: exists ? 'Обновить ночь' : 'Сохранить ночь',
                  expand: true,
                  onPressed: duration == 0 ? null : save,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Five bolts for the morning's energy; the picked one lifts.
class EnergyRating extends StatelessWidget {
  final int level;
  final ValueChanged<int> onChanged;
  const EnergyRating({super.key, required this.level, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final reduce = MediaQuery.disableAnimationsOf(context);
    return SizedBox(
      height: 52,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < sleepEnergy.length; i++)
            PressScale(
              label: qualityLabel(sleepEnergy[i].$1),
              selected: i == level,
              onPressed: () => onChanged(i),
              child: AnimatedPadding(
                duration: reduce ? Duration.zero : SomnaMotion.fast,
                curve: SomnaMotion.bounce,
                padding: EdgeInsets.fromLTRB(5, 0, 5, i == level ? 8 : 0),
                child: Icon(
                  Icons.bolt_rounded,
                  size: 40,
                  color: i <= level
                      ? sleepEnergy[level].$2
                      : c.ink.withValues(alpha: .16),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
