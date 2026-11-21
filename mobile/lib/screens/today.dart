import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/metrics.dart';
import '../logic/time.dart';
import '../logic/features.dart';
import '../logic/valence.dart';
import '../shell/top_bar.dart';
import '../ui/surfaces.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../widgets/widget_grid.dart';
import '../widgets/catalog.dart';

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key});
  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  Timer? clock;
  @override
  void initState() {
    super.initState();
    clock = Timer.periodic(const Duration(minutes: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context), now = DateTime.now();
    final sum = summarize(s.nights, s.moods, s.bedGoal, s.wakeGoal);
    final last = sum.last, mood = sum.lastMood;
    final article =
        todayArticles
            .where((a) => !s.readArticles.contains(a.$1))
            .firstOrNull ??
        todayArticles.first;
    final plan = dayPlan(
      nights: s.nights,
      moods: s.moods,
      waterMl: s.water.ml,
      waterGoal: 2000,
      ritualDone: s.ritual.done.length,
    );
    final done = plan.where((p) => p.done).length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
      children: [
        TopBar(
          title:
              '${greeting(now)}${s.userName.isEmpty ? '' : ', ${s.userName}'}',
          sub: '${weekdayShort(now)}, ${dayMonth(now)}',
        ),
        SomnaCard(
          sleepHero: true,
          onTap: () => s.setTab('sleep'),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 268),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 12,
                  children: [
                    const Text('Прошлая ночь'),
                    if (last != null) Text(qualityLabel(last.quality)),
                  ],
                ),
                const SizedBox(height: 32),
                if (last == null)
                  const Text('—', style: TextStyle(fontSize: 64, height: 1))
                else
                  Dots(value: hm(last.durationMin), size: 64, square: true),
                const SizedBox(height: 16),
                Text(
                  last == null
                      ? 'Запишите первую ночь: это займёт минуту.'
                      : '${last.bedtime} → ${last.wakeTime} · ${last.awakenings == 0 ? 'без пробуждений' : '${last.awakenings} ${pluralRu(last.awakenings, ['пробуждение', 'пробуждения', 'пробуждений'])}'}',
                  style: const TextStyle(fontSize: 13, color: Colors.white70),
                ),
                const SizedBox(height: 28),
                if (last == null)
                  FilledButton(
                    onPressed: () => s.openSheet('sleep'),
                    child: const Text('+ Записать сон'),
                  )
                else
                  Hypnogram(stages: hypnogram(last), compact: true),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _tile(
                'Состояние',
                mood == null ? '—' : '${moodPct(mood.valence)}%',
                mood == null
                    ? 'Сделайте чек-ин'
                    : getValenceLabel(mood.valence),
                mood == null
                    ? 'ink'
                    : mood.valence < -.12
                    ? 'dusk'
                    : mood.valence < .3
                    ? 'cobalt'
                    : 'moss',
                () => s.openSheet('mood'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _tile(
                'Неделя',
                sum.week.isEmpty ? '—' : '${sum.index}',
                sum.week.isEmpty
                    ? 'Пока нет данных'
                    : '${indexLabel(sum.index)}${sum.indexDelta == 0 ? '' : ' · ${sum.indexDelta > 0 ? '+' : ''}${sum.indexDelta}'}',
                'ember',
                () => s.openSheet('recap'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 36),
        _heading(
          'План дня',
          done == plan.length
              ? 'Всё выполнено'
              : '$done из ${plan.length} выполнено',
        ),
        GlassSurface(
          radius: 30,
          padding: const EdgeInsets.all(20),
          child: Material(
            color: Colors.transparent,
            child: Column(
              children: [
                DotRow(values: plan.map((p) => p.done ? 1.0 : 0.0).toList()),
                if (done == plan.length)
                  const Text('Все шаги на сегодня сделаны. Хорошего вечера.'),
                for (final p in plan.where((p) => !p.done))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.circle_outlined, size: 22),
                    title: Text(p.label),
                    subtitle: Text(p.hint),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      if (p.id == 'water') {
                        s.addWater(250);
                      } else if (p.id == 'ritual') {
                        s.setTab('practices');
                      } else {
                        s.openSheet(p.id);
                      }
                    },
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 36),
        _heading('Почитать', '${article.$2} · ${article.$4} мин'),
        SomnaCard(
          tone: article.$5,
          onTap: () => s.openSheet('article', article.$1),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: Icon(Icons.north_east),
              ),
              SizedBox(height: 36),
              Text(
                article.$3,
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        const SizedBox(height: 36),
        Row(
          children: [
            const Expanded(
              child: Text(
                'Виджеты',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
              ),
            ),
            TextButton(
              onPressed: () => s.setEditing(!s.editing),
              child: Text(s.editing ? 'Готово' : 'Изменить'),
            ),
            IconButton(
              tooltip: 'Добавить виджет',
              onPressed: () => s.openSheet('gallery'),
              icon: const Icon(Icons.add),
            ),
          ],
        ),
        if (s.editing)
          const Text(
            'Перетащите, смените размер или цвет',
            style: TextStyle(fontSize: 12),
          ),
        const SizedBox(height: 16),
        const WidgetGrid(),
      ],
    );
  }

  Widget _heading(String title, String hint) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
        ),
        Text(hint, style: const TextStyle(fontSize: 12)),
      ],
    ),
  );
  Widget _tile(
    String title,
    String value,
    String note,
    String tone,
    VoidCallback run,
  ) => SomnaCard(
    tone: tone,
    padding: const EdgeInsets.all(20),
    onTap: run,
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 128),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title),
          const SizedBox(height: 36),
          Text(value, style: const TextStyle(fontSize: 34)),
          Text(
            note,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: Colors.white70),
          ),
        ],
      ),
    ),
  );
}
