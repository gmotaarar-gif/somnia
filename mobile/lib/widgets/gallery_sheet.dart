import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../data/models.dart';
import '../theme/tokens.dart';
import 'catalog.dart';
import 'widget_tile.dart';

class GallerySheet extends StatefulWidget {
  const GallerySheet({super.key});
  @override
  State<GallerySheet> createState() => _GallerySheetState();
}

class _GallerySheetState extends State<GallerySheet> {
  bool custom = false, confirm = false;
  String query = '', group = 'Все', tone = 'violet', size = '1x1', unit = 'мин';
  final title = TextEditingController(text: 'Медитация');
  final search = TextEditingController();
  final target = TextEditingController(text: '20'),
      step = TextEditingController(text: '5');
  @override
  void dispose() {
    title.dispose();
    search.dispose();
    target.dispose();
    step.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final valid =
        title.text.trim().isNotEmpty &&
        (double.tryParse(target.text) ?? 0).isFinite &&
        (double.tryParse(step.text) ?? 0).isFinite &&
        (double.tryParse(target.text) ?? 0) >= 1 &&
        (double.tryParse(step.text) ?? 0) >= 1;
    final filtered = s.widgets.where((w) {
      final text =
          '${w.title ?? widgetMeta[w.kind]?.$1} ${widgetMeta[w.kind]?.$2 ?? 'Своя привычка'}'
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
    }).toList();
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
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Каталог'),
                selected: !custom,
                onSelected: (_) => setState(() => custom = false),
              ),
              ChoiceChip(
                label: const Text('Свой виджет'),
                selected: custom,
                onSelected: (_) => setState(() => custom = true),
              ),
            ],
          ),
          if (!custom) ...[
            const SizedBox(height: 16),
            TextField(
              controller: search,
              decoration: InputDecoration(
                labelText: 'Найти виджет',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Очистить поиск',
                        onPressed: () {
                          search.clear();
                          setState(() => query = '');
                        },
                        icon: const Icon(Icons.close),
                      ),
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
            Text(
              'Найдено: ${filtered.length} · нажмите, чтобы добавить или убрать',
              style: const TextStyle(fontSize: 12),
            ),
            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Column(
                  children: [
                    const Icon(Icons.tune),
                    const Text(
                      'Ничего не нашлось',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Text(
                      'Попробуйте другое название или создайте свою привычку.',
                    ),
                    TextButton(
                      onPressed: () {
                        search.clear();
                        setState(() {
                          query = '';
                          group = 'Все';
                        });
                      },
                      child: const Text('Показать все'),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, box) => Wrap(
                spacing: 12,
                runSpacing: 20,
                children: [
                  for (final w in filtered)
                    SizedBox(
                      width: (box.maxWidth - 12) / 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            button: true,
                            label:
                                '${w.title ?? widgetMeta[w.kind]?.$1}: ${w.visible ? 'убрать с главного' : 'добавить на главный'}',
                            child: GestureDetector(
                              key: ValueKey('gallery-${w.id}'),
                              behavior: HitTestBehavior.opaque,
                              onTap: () =>
                                  s.updateWidget(w.id, {'visible': !w.visible}),
                              child: Stack(
                                children: [
                                  SizedBox(
                                    height: 178,
                                    child: IgnorePointer(
                                      child: WidgetTile(
                                        widget: w.copyWith(size: '1x1'),
                                        interactive: false,
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    top: 8,
                                    right: 8,
                                    child: CircleAvatar(
                                      radius: 15,
                                      backgroundColor: w.visible
                                          ? SomnaColors.lime
                                          : Colors.white,
                                      child: Icon(
                                        w.visible ? Icons.check : Icons.add,
                                        color: Colors.black,
                                        size: 18,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            w.title ?? widgetMeta[w.kind]?.$1 ?? 'Мой виджет',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            widgetMeta[w.kind]?.$2 ??
                                'Своя привычка · ${w.target} ${w.unit} в день',
                            style: const TextStyle(fontSize: 12),
                          ),
                          Text(
                            w.visible ? 'На главном' : 'Добавить на главный',
                            style: TextStyle(
                              fontSize: 11,
                              color: w.visible
                                  ? SomnaColors.of(context).accent
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
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
            const SizedBox(height: 20),
            const Center(
              child: Text(
                'Предпросмотр · пример прогресса',
                style: TextStyle(fontSize: 12),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: SizedBox(
                width: size == '2x1' ? double.infinity : 178,
                height: 178,
                child: WidgetTile(
                  interactive: false,
                  widget: SomnaWidget(
                    id: 'preview',
                    kind: 'custom',
                    visible: true,
                    title: title.text.trim().isEmpty
                        ? 'Мой виджет'
                        : title.text.trim(),
                    unit: unit,
                    target: valid ? double.parse(target.text) : 1,
                    step: valid ? double.parse(step.text) : 1,
                    tone: tone,
                    size: size,
                    value: valid
                        ? (double.parse(target.text) * .4).roundToDouble()
                        : 0,
                  ),
                ),
              ),
            ),
            TextField(
              controller: title,
              maxLength: 18,
              decoration: const InputDecoration(
                labelText: 'Название виджета',
                hintText: 'Например, чтение',
              ),
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
                  IconButton(
                    tooltip: 'Цвет: ${toneNames[t]}',
                    onPressed: () => setState(() => tone = t),
                    icon: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: toneSwatches[t]!,
                        ),
                        border: Border.all(
                          color: tone == t ? Colors.white : Colors.white24,
                          width: 2,
                        ),
                      ),
                      child: tone == t
                          ? const Icon(Icons.check, color: Colors.white)
                          : null,
                    ),
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
