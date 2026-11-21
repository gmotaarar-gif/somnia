import '../logic/time.dart';
import 'models.dart';

const homeLayout = 2;
const redundantWidgets = {'sleep', 'mood', 'week', 'energy', 'plan'};
const defaultWidgets = [
  SomnaWidget(
    id: 'w-streak',
    kind: 'streak',
    size: '1x1',
    tone: 'ink',
    visible: true,
  ),
  SomnaWidget(
    id: 'w-sleep',
    kind: 'sleep',
    size: '1x1',
    tone: 'plum',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-evening',
    kind: 'evening',
    size: '2x1',
    tone: 'cobalt',
    visible: true,
  ),
  SomnaWidget(
    id: 'w-water',
    kind: 'water',
    size: '1x1',
    tone: 'lime',
    visible: true,
  ),
  SomnaWidget(
    id: 'w-week',
    kind: 'week',
    size: '2x1',
    tone: 'forest',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-mood',
    kind: 'mood',
    size: '1x1',
    tone: 'moss',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-energy',
    kind: 'energy',
    size: '1x1',
    tone: 'ember',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-rhythm',
    kind: 'rhythm',
    size: '2x1',
    tone: 'dusk',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-debt',
    kind: 'debt',
    size: '1x1',
    tone: 'rose',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-plan',
    kind: 'plan',
    size: '2x1',
    tone: 'ink',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-cycle',
    kind: 'cycle',
    size: '1x1',
    tone: 'cobalt',
    visible: false,
  ),
  SomnaWidget(
    id: 'w-wellbeing',
    kind: 'wellbeing',
    size: '1x1',
    tone: 'moss',
    visible: false,
  ),
];

const defaultSpectrum = [
  SpectrumAxis(id: 'calm', left: 'Тревога', right: 'Спокойствие', value: 0.74),
  SpectrumAxis(id: 'energy', left: 'Усталость', right: 'Бодрость', value: 0.82),
  SpectrumAxis(
    id: 'focus',
    left: 'Рассеянность',
    right: 'Ясность',
    value: 0.65,
  ),
  SpectrumAxis(id: 'balance', left: 'Перегруз', right: 'Баланс', value: 0.78),
];

List<SleepNight> demoNights(DateTime now) {
  const rows = <(String, String, double, int, List<String>, String?)>[
    ('00:25', '07:15', 66, 2, ['Поздний экран'], 'Поздний рабочий созвон'),
    ('23:55', '07:20', 76, 1, [], null),
    ('00:40', '07:10', 62, 2, ['Кофеин', 'Стресс'], null),
    ('23:40', '07:25', 81, 0, ['Быстро уснул'], null),
    ('23:20', '07:35', 87, 0, ['Глубокий сон'], 'Вечерняя прогулка перед сном'),
    ('00:10', '08:30', 88, 1, ['Проснулся сам'], null),
    ('23:45', '07:40', 83, 0, [], null),
    ('00:05', '07:20', 74, 1, ['Поздний экран'], null),
    ('23:45', '07:25', 82, 0, ['Прохладно'], null),
    ('00:50', '07:05', 58, 2, ['Стресс', 'Кофеин'], null),
    ('23:35', '07:30', 84, 0, ['Быстро уснул'], null),
    ('23:25', '07:30', 89, 0, ['Глубокий сон'], null),
    ('23:50', '08:10', 86, 1, ['Яркие сны'], null),
    (
      '23:38',
      '07:20',
      85,
      0,
      ['Проснулся сам'],
      'Лёгкое засыпание после вечернего ритуала',
    ),
  ];
  return [
    for (var i = 0; i < rows.length; i++)
      SleepNight(
        id: 'demo-n-$i',
        dateKey: dateKey(daysAgo(rows.length - 1 - i, now)),
        bedtime: rows[i].$1,
        wakeTime: rows[i].$2,
        durationMin: (spanMinutes(rows[i].$1, rows[i].$2) - rows[i].$4 * 8)
            .toDouble(),
        quality: rows[i].$3,
        awakenings: rows[i].$4,
        tags: rows[i].$5,
        note: rows[i].$6,
      ),
  ];
}

List<MoodEntry> demoMoods(DateTime now) {
  const rows = <(int, String, double, List<String>, List<String>)>[
    (11, '22:30', -0.22, ['Усталость', 'Напряжение'], ['Работа', 'Кофеин']),
    (9, '20:15', 0.44, ['Спокойствие', 'Лёгкость'], ['Прогулка', 'Отдых']),
    (7, '18:40', 0.52, ['Умиротворение'], ['Отдых', 'Семья']),
    (6, '21:20', 0.08, ['Рассеянность', 'Спокойствие'], ['Работа']),
    (5, '21:50', 0.36, ['Спокойствие'], ['Сон', 'Отдых']),
    (4, '22:10', -0.34, ['Усталость', 'Тревога'], ['Работа', 'Кофеин']),
    (3, '09:30', 0.56, ['Ясность', 'Уверенность'], ['Сон', 'Прогулка']),
    (
      2,
      '21:40',
      0.64,
      ['Умиротворение', 'Лёгкость', 'Благодарность'],
      ['Отдых', 'Спорт'],
    ),
    (1, '10:15', 0.72, ['Ясность', 'Вдохновение'], ['Сон', 'Прогулка']),
    (0, '08:40', 0.42, ['Спокойствие', 'Лёгкость'], ['Сон', 'Отдых']),
  ];
  return [
    for (var i = 0; i < rows.length; i++)
      MoodEntry(
        id: 'demo-m-$i',
        at: _atTime(daysAgo(rows[i].$1, now), rows[i].$2),
        valence: rows[i].$3,
        emotions: rows[i].$4,
        factors: rows[i].$5,
      ),
  ];
}

String _atTime(DateTime day, String time) {
  final min = timeToMinutes(time);
  return isoUtc(DateTime(day.year, day.month, day.day, min ~/ 60, min % 60));
}

List<PracticeSession> demoSessions(DateTime now) {
  const ago = [9, 6, 5, 3, 2, 1, 0];
  return [
    for (var i = 0; i < ago.length; i++)
      PracticeSession(
        id: 'demo-s-$i',
        at: _atTime(daysAgo(ago[i], now), '22:05'),
        kind: i % 3 == 2 ? 'bodyscan' : 'grounding',
        min: i % 3 == 2 ? 5 : (3 + (i % 2) * 2).toDouble(),
      ),
  ];
}

SomnaState defaultState([DateTime? at]) {
  final now = at ?? DateTime.now();
  return SomnaState(
    onboarded: false,
    userName: '',
    chronotype: 'balanced',
    theme: 'system',
    bedGoal: '23:30',
    wakeGoal: '07:30',
    reminder: true,
    reminderTime: '22:30',
    morningReminder: false,
    morningReminderTime: '07:30',
    focus: const ['Стабильный подъём', 'Снять вечерний стресс'],
    ritual: Ritual(day: dateKey(now), done: const ['dim']),
    water: Water(day: dateKey(now), ml: 1250),
    eveningMode: true,
    volume: 60,
    nights: demoNights(now),
    moods: demoMoods(now),
    spectrum: defaultSpectrum,
    widgets: defaultWidgets,
    sessions: demoSessions(now),
    worries: const [],
    readArticles: const [],
    wellbeing: [WellbeingResult(at: isoUtc(daysAgo(6, now)), score: 64)],
    soundTimer: 30,
    layout: homeLayout,
  );
}
