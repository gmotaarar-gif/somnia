import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import 'catalog.dart';

class GallerySheet extends StatefulWidget {
  const GallerySheet({super.key});
  @override
  State<GallerySheet> createState() => _GallerySheetState();
}

class _GallerySheetState extends State<GallerySheet> {
  bool custom = false, confirm = false;
  String query = '', group = 'Все', tone = 'violet', size = '1x1', unit = 'мин';
  final title = TextEditingController(text: 'Медитация');
  final target = TextEditingController(text: '20'),
      step = TextEditingController(text: '5');
  @override
  void dispose() {
    title.dispose();
    target.dispose();
    step.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final valid =
        title.text.trim().isNotEmpty &&
        (double.tryParse(target.text) ?? 0) >= 1 &&
        (double.tryParse(step.text) ?? 0) >= 1;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Виджеты',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w600),
                ),
              ),
              IconButton(
                tooltip: 'Закрыть',
                onPressed: () => s.openSheet(null),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const Text('Оставьте то, что помогает именно вам'),
          const SizedBox(height: 20),
          if (!custom) ...[
            FilledButton.icon(
              onPressed: () => setState(() => custom = true),
              icon: const Icon(Icons.add),
              label: const Text('Свой счётчик'),
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Найти виджет',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => query = v),
            ),
            Wrap(
              spacing: 8,
              children: [
                for (final g in ['Все', 'Сон', 'Состояние', 'Привычки'])
                  ChoiceChip(
                    label: Text(g),
                    selected: group == g,
                    onSelected: (_) => setState(() => group = g),
                  ),
              ],
            ),
            for (final w in s.widgets.where((w) {
              final text =
                  '${w.title ?? widgetMeta[w.kind]?.$1} ${widgetMeta[w.kind]?.$2}'
                      .toLowerCase();
              final matches =
                  group == 'Все' ||
                  (group == 'Состояние'
                      ? ['mood', 'wellbeing'].contains(w.kind)
                      : group == 'Привычки'
                      ? ['water', 'plan', 'custom'].contains(w.kind)
                      : ![
                          'mood',
                          'wellbeing',
                          'water',
                          'plan',
                          'custom',
                        ].contains(w.kind));
              return matches && text.contains(query.trim().toLowerCase());
            }))
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(w.title ?? widgetMeta[w.kind]?.$1 ?? 'Мой виджет'),
                subtitle: Text(
                  widgetMeta[w.kind]?.$2 ??
                      'Своя привычка · ${w.target} ${w.unit} в день',
                ),
                trailing: IconButton(
                  tooltip: w.visible ? 'Убрать виджет' : 'Добавить виджет',
                  onPressed: () =>
                      s.updateWidget(w.id, {'visible': !w.visible}),
                  icon: Icon(
                    w.visible ? Icons.check_circle : Icons.add_circle_outline,
                  ),
                ),
              ),
            if (confirm) ...[
              const Text('Вернуть стандартный набор?'),
              const Text(
                'Цвета, размеры и порядок стандартных виджетов сбросятся. Свои привычки и их прогресс сохранятся.',
              ),
              Row(
                children: [
                  TextButton(
                    onPressed: () => setState(() => confirm = false),
                    child: const Text('Отмена'),
                  ),
                  FilledButton(
                    onPressed: () {
                      s.resetWidgets();
                      setState(() => confirm = false);
                      s.notify('Стандартные виджеты восстановлены');
                    },
                    child: const Text('Восстановить'),
                  ),
                ],
              ),
            ] else
              Row(
                children: [
                  IconButton(
                    tooltip: 'Вернуть стандартный набор',
                    onPressed: () => setState(() => confirm = true),
                    icon: const Icon(Icons.restore),
                  ),
                  Expanded(
                    child: Text(
                      'На главном: ${s.widgets.where((w) => w.visible).length}',
                    ),
                  ),
                  FilledButton(
                    onPressed: () => s.openSheet(null),
                    child: const Text('Готово'),
                  ),
                ],
              ),
          ] else ...[
            TextButton(
              onPressed: () => setState(() => custom = false),
              child: const Text('Назад к виджетам'),
            ),
            TextField(
              controller: title,
              maxLength: 28,
              decoration: const InputDecoration(labelText: 'Название'),
              onChanged: (_) => setState(() {}),
            ),
            const Text('Единица'),
            Wrap(
              spacing: 8,
              children: [
                for (final u in ['мин', 'раз', 'стр', 'шагов', 'мл', 'ч'])
                  ChoiceChip(
                    label: Text(u),
                    selected: unit == u,
                    onSelected: (_) => setState(() => unit = u),
                  ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: target,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Цель в день'),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    controller: step,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Шаг'),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ],
            ),
            const Text(
              'Шаг — сколько прибавится за одно нажатие. Цель и шаг должны быть больше нуля.',
            ),
            const SizedBox(height: 16),
            const Text('Цвет'),
            Wrap(
              spacing: 8,
              children: [
                for (final t in widgetTones)
                  ChoiceChip(
                    label: Text(toneNames[t]!),
                    selected: tone == t,
                    onSelected: (_) => setState(() => tone = t),
                  ),
              ],
            ),
            const Text('Размер'),
            Wrap(
              spacing: 8,
              children: [
                for (final entry in {
                  '1x1': 'Компактный',
                  '2x1': 'Широкий',
                }.entries)
                  ChoiceChip(
                    label: Text(entry.value),
                    selected: size == entry.key,
                    onSelected: (_) => setState(() => size = entry.key),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: !valid
                  ? null
                  : () {
                      s.addCustomWidget(
                        title: title.text.trim(),
                        unit: unit,
                        target: double.parse(target.text)
                            .round()
                            .clamp(1, 99999)
                            .toDouble(),
                        step: double.parse(step.text)
                            .round()
                            .clamp(1, 99999)
                            .toDouble(),
                        tone: tone,
                        size: size,
                      );
                      s.notify('Виджет добавлен на главный экран');
                      s.openSheet(null);
                    },
              child: const Text('Добавить на главный'),
            ),
          ],
        ],
      ),
    );
  }
}
