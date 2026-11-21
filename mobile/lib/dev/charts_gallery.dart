import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart' hide ThemeMode;
import '../logic/time.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';

void main() {
  if (!kDebugMode) throw StateError('The chart gallery is debug-only');
  runApp(const ChartsGallery());
}

const galleryStages = [
  StageSegment(stage: 'awake', min: 10),
  StageSegment(stage: 'light', min: 35),
  StageSegment(stage: 'deep', min: 60),
  StageSegment(stage: 'light', min: 30),
  StageSegment(stage: 'rem', min: 25),
  StageSegment(stage: 'awake', min: 5),
  StageSegment(stage: 'light', min: 40),
  StageSegment(stage: 'deep', min: 25),
  StageSegment(stage: 'rem', min: 50),
];

class ChartsGallery extends StatefulWidget {
  const ChartsGallery({super.key});
  @override
  State<ChartsGallery> createState() => _ChartsGalleryState();
}

class _ChartsGalleryState extends State<ChartsGallery> {
  bool light = false, empty = false;
  int page = 0;
  final today = DateTime(2030, 1, 16);
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: somnaTheme(light ? Brightness.light : Brightness.dark),
    home: Builder(
      builder: (context) {
        final c = SomnaColors.of(context);
        Widget section(String title, Widget child) => Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: TextStyle(fontSize: 13, color: c.ink2)),
              const SizedBox(height: 12),
              child,
            ],
          ),
        );
        final nights = <SleepNight>[
          for (var i = 0; i < 25; i++)
            if (i % 4 != 0)
              SleepNight(
                id: '$i',
                dateKey: dateKey(DateTime(2030, 1, 16 - i)),
                bedtime: '23:30',
                wakeTime: '07:30',
                durationMin: 420 + (i % 4) * 15,
                quality: 40 + (i % 5) * 12,
                awakenings: i % 3,
              ),
        ];
        final moods = <MoodEntry>[
          for (var i = 0; i < 28; i++)
            if (i % 5 != 0)
              MoodEntry(
                at: DateTime(2030, 1, 16 - i, 12).toIso8601String(),
                valence: (i % 9 - 4) / 4,
              ),
        ];
        final days = <MoodDay>[
          for (var i = 0; i < 14; i++)
            MoodDay(
              key: '$i',
              label: '${i + 3}',
              value: empty || i == 4 || i == 8 ? null : (i % 7 - 3) / 3,
            ),
        ];
        final pages = <List<Widget>>[
          [
            section('Дневник не измеряет фазы', const Hypnogram(stages: [])),
            section(
              'Тестовые данные датчика — не оценка из дневника',
              Hypnogram(
                stages: empty ? [] : galleryStages,
                bedtime: '23:30',
                wakeTime: '04:10',
              ),
            ),
            StageLegend(stages: empty ? [] : galleryStages),
            const SizedBox(height: 24),
            section(
              'Компактный график',
              Hypnogram(stages: empty ? [] : galleryStages, compact: true),
            ),
          ],
          [
            section(
              'Настроение: фиксированная шкала, пропуски',
              MoodTrend(days: days),
            ),
            section(
              'Линия / заливка',
              Wave(values: empty ? [] : [4, 7, 5, 8, 6, 9], fill: true),
            ),
            section(
              'Столбцы / цель',
              Bars(
                values: empty ? [] : [6, 7, 5, 8, 6.5, 7.5, 8],
                labels: const ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                goal: 8,
                max: 9,
                height: 140,
              ),
            ),
          ],
          [
            section('Прогресс', DotTrack(value: empty ? 0 : .62)),
            section(
              'Дни с записями',
              DotRow(values: empty ? [] : [1, 1, .3, 0, 1, 0, 1]),
            ),
            section('Вода', Arc(value: empty ? 0 : .68)),
            section(
              'Кольцо / оценка',
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Ring(value: empty ? 0 : .72, child: Text(empty ? '—' : '72')),
                  ScoreRing(score: empty ? null : 83, size: 140),
                ],
              ),
            ),
            section(
              'Орбиты',
              Padding(
                padding: const EdgeInsets.only(bottom: 55),
                child: Center(
                  child: SizedBox(
                    width: 300,
                    child: Orbits(points: empty ? [] : const [.18, .52, .8]),
                  ),
                ),
              ),
            ),
          ],
          [
            section(
              'Сон — пять недель',
              SleepCalendar(
                nights: empty ? [] : nights,
                today: today,
                bedGoal: '23:30',
                wakeGoal: '07:30',
                onNightTap: (night) =>
                    ScaffoldMessenger.of(context)
                        .showSnackBar(SnackBar(content: Text(night.dateKey))),
              ),
            ),
            section(
              'Настроение — последние 28 дней',
              MoodCalendar(moods: empty ? [] : moods, today: today),
            ),
          ],
        ];
        return Scaffold(
          appBar: AppBar(
            title: Text(
              ['Фазы сна', 'Тренды', 'Индикаторы', 'Календари'][page],
            ),
            actions: [
              IconButton(
                tooltip: 'Пустые данные',
                onPressed: () => setState(() => empty = !empty),
                icon: Icon(empty ? Icons.data_array : Icons.clear_all),
              ),
              IconButton(
                tooltip: 'Сменить тему',
                onPressed: () => setState(() => light = !light),
                icon: Icon(light ? Icons.dark_mode : Icons.light_mode),
              ),
            ],
          ),
          body: SingleChildScrollView(
            key: ValueKey('$page/$empty'),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: pages[page],
            ),
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: page,
            onDestinationSelected: (value) => setState(() => page = value),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.bedtime_outlined),
                label: 'Фазы',
              ),
              NavigationDestination(
                icon: Icon(Icons.show_chart),
                label: 'Тренды',
              ),
              NavigationDestination(
                icon: Icon(Icons.donut_large),
                label: 'Прогресс',
              ),
              NavigationDestination(
                icon: Icon(Icons.calendar_month),
                label: 'Календари',
              ),
            ],
          ),
        );
      },
    ),
  );
}
