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
    ritual: Ritual(day: dateKey(now), done: const []),
    water: Water(day: dateKey(now), ml: 0),
    eveningMode: true,
    volume: 60,
    nights: const [],
    moods: const [],
    spectrum: const [],
    widgets: defaultWidgets,
    sessions: const [],
    worries: const [],
    readArticles: const [],
    wellbeing: const [],
    soundTimer: 30,
    layout: homeLayout,
  );
}
