import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'catalog.dart';
import 'kit.dart';
import 'lucide.dart';
import 'widget_tile.dart';

const _units = ['мин', 'раз', 'стр', 'шагов', 'мл', 'ч'];
const _groups = <(String, String, List<String>?)>[
  ('all', 'Все', null),
  (
    'sleep',
    'Сон',
    ['streak', 'sleep', 'evening', 'week', 'energy', 'rhythm', 'debt', 'cycle'],
  ),
  ('mind', 'Состояние', ['mood', 'wellbeing']),
  ('habits', 'Привычки', ['water', 'plan', 'custom']),
];

(String, String) _meta(SomnaWidget w) => w.kind == 'custom'
    ? (
        w.title == null || w.title!.isEmpty ? 'Мой виджет' : w.title!,
        'Своя привычка · ${displayNumber(w.target ?? 0)} ${w.unit ?? ''} в день',
      )
    : widgetMeta[w.kind]!;

class GallerySheet extends StatefulWidget {
  const GallerySheet({super.key});
  @override
  State<GallerySheet> createState() => _GallerySheetState();
}

class _GallerySheetState extends State<GallerySheet> {
  String mode = 'catalog', query = '', group = 'all';
  String tone = 'violet', size = '1x1', unit = 'мин';
  bool confirmReset = false;
  final title = TextEditingController(text: 'Медитация');
  final search = TextEditingController();
  final target = TextEditingController(text: '20');
  final step = TextEditingController(text: '5');
  @override
  void dispose() {
    title.dispose();
    search.dispose();
    target.dispose();
    step.dispose();
    super.dispose();
  }

  int _number(TextEditingController c) =>
      (double.tryParse(c.text.replaceAll(',', '.')) ?? 0).round().clamp(
        0,
        99999,
      );

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context), c = SomnaColors.of(context);
    final targetValue = _number(target), stepValue = _number(step);
    final valid =
        title.text.trim().isNotEmpty && targetValue >= 1 && stepValue >= 1;
    void close() => s.openSheet(null);
    void create() {
      if (!valid) return;
      s.addCustomWidget(
        title: title.text.trim(),
        unit: unit,
        target: targetValue.toDouble(),
        step: stepValue.toDouble(),
        tone: tone,
        size: size,
      );
      s.notify('Виджет добавлен на главный экран');
      close();
    }

    final Widget footer;
    if (mode == 'custom') {
      footer = SomnaButton(
        label: 'Добавить на главный',
        leading: 'plus',
        expand: true,
        onPressed: valid ? create : null,
      );
    } else if (confirmReset) {
      footer = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Вернуть стандартный набор?',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: c.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Цвета, размеры и порядок стандартных виджетов сбросятся. Свои привычки и их прогресс сохранятся.',
            style: TextStyle(fontSize: 12, height: 1.625, color: c.ink2),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SomnaButton(
                  label: 'Отмена',
                  glass: true,
                  expand: true,
                  horizontal: 12,
                  onPressed: () => setState(() => confirmReset = false),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SomnaButton(
                  label: 'Восстановить',
                  expand: true,
                  horizontal: 12,
                  onPressed: () {
                    s.resetWidgets();
                    setState(() => confirmReset = false);
                    s.notify('Стандартные виджеты восстановлены');
                  },
                ),
              ),
            ],
          ),
        ],
      );
    } else {
      footer = Row(
        children: [
          RoundIconButton(
            icon: 'rotateCcw',
            label: 'Вернуть стандартный набор',
            onPressed: () => setState(() => confirmReset = true),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                text: 'На главном: ',
                children: [
                  TextSpan(
                    text: '${s.widgets.where((w) => w.visible).length}',
                    style: TextStyle(fontWeight: FontWeight.w600, color: c.ink),
                  ),
                ],
              ),
              style: TextStyle(fontSize: 12, color: c.ink2),
            ),
          ),
          const SizedBox(width: 12),
          SomnaButton(label: 'Готово', onPressed: close),
        ],
      );
    }

    return SheetScaffold(
      title: 'Виджеты',
      description: 'Оставьте то, что помогает именно вам',
      onClose: close,
      footer: footer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Segmented(
            label: 'Тип виджета',
            value: mode,
            onChanged: (v) => setState(() => mode = v),
            options: const [('catalog', 'Каталог'), ('custom', 'Свой виджет')],
          ),
          const SizedBox(height: 20),
          if (mode == 'catalog') ..._catalog(s, c) else ..._creator(c, valid),
        ],
      ),
    );
  }

  List<Widget> _catalog(SomnaStore s, SomnaColors c) {
    final kinds = _groups.firstWhere((g) => g.$1 == group).$3;
    final needle = query.trim().toLowerCase();
    final filtered = s.widgets.where((w) {
      final meta = _meta(w);
      return (kinds == null || kinds.contains(w.kind)) &&
          '${meta.$1} ${meta.$2}'.toLowerCase().contains(needle);
    }).toList();
    return [
      GlassSurface(
        radius: 24,
        child: SizedBox(
          height: 48,
          child: Row(
            children: [
              const SizedBox(width: 16),
              Lucide('search', size: 18, color: c.ink2),
              const SizedBox(width: 8),
              Expanded(
                child: Semantics(
                  label: 'Найти виджет',
                  child: TextField(
                    controller: search,
                    textInputAction: TextInputAction.search,
                    cursorColor: c.ink,
                    style: TextStyle(fontSize: 16, color: c.ink),
                    decoration: InputDecoration.collapsed(
                      hintText: 'Найти виджет',
                      hintStyle: TextStyle(fontSize: 16, color: c.ink2),
                    ),
                    onChanged: (v) => setState(() => query = v),
                  ),
                ),
              ),
              if (query.isNotEmpty)
                PressScale(
                  label: 'Очистить поиск',
                  onPressed: () {
                    search.clear();
                    setState(() => query = '');
                  },
                  child: SizedBox.square(
                    dimension: 32,
                    child: Center(child: Lucide('x', size: 16, color: c.ink2)),
                  ),
                ),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final g in _groups)
            SomnaChip(
              label: g.$2,
              active: group == g.$1,
              onPressed: () => setState(() => group = g.$1),
            ),
        ],
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(4, 16, 4, 0),
        child: Text(
          'Найдено: ${filtered.length} · нажмите, чтобы добавить или убрать',
          style: TextStyle(fontSize: 12, color: c.ink2),
        ),
      ),
      const SizedBox(height: 16),
      if (filtered.isEmpty)
        GlassSurface(
          radius: 28,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
          child: Column(
            children: [
              Lucide('slidersHorizontal', size: 28, color: c.ink2),
              const SizedBox(height: 16),
              Text(
                'Ничего не нашлось',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: c.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Попробуйте другое название или создайте свою привычку.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, height: 1.625, color: c.ink2),
              ),
              const SizedBox(height: 20),
              SomnaButton(
                label: 'Показать все',
                glass: true,
                onPressed: () {
                  search.clear();
                  setState(() {
                    query = '';
                    group = 'all';
                  });
                },
              ),
            ],
          ),
        )
      else
        LayoutBuilder(
          builder: (context, box) => Wrap(
            spacing: 12,
            runSpacing: 20,
            children: [
              for (final w in filtered)
                SizedBox(
                  width: (box.maxWidth - 12) / 2,
                  child: _CatalogItem(
                    widget: w,
                    meta: _meta(w),
                    onPressed: () =>
                        s.updateWidget(w.id, {'visible': !w.visible}),
                  ),
                ),
            ],
          ),
        ),
    ];
  }

  List<Widget> _creator(SomnaColors c, bool valid) {
    final targetValue = _number(target), stepValue = _number(step);
    final input = TextStyle(fontSize: 16, color: c.ink);
    Widget field(Widget child) => GlassSurface(
      radius: 24,
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        alignment: Alignment.centerLeft,
        child: child,
      ),
    );
    Widget number(TextEditingController controller, String label) => field(
      Semantics(
        label: label,
        child: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(5),
          ],
          cursorColor: c.ink,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: c.ink,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
          decoration: const InputDecoration.collapsed(hintText: ''),
          onChanged: (_) => setState(() {}),
        ),
      ),
    );
    return [
      Text(
        'Предпросмотр · пример прогресса',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: c.ink2),
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
              target: targetValue.toDouble(),
              step: stepValue.toDouble(),
              tone: tone,
              size: size,
              value: (targetValue * .4).roundToDouble(),
            ),
          ),
        ),
      ),
      SheetField(
        label: 'Название',
        child: field(
          Semantics(
            label: 'Название виджета',
            child: TextField(
              controller: title,
              inputFormatters: [LengthLimitingTextInputFormatter(18)],
              cursorColor: c.ink,
              style: input,
              decoration: InputDecoration.collapsed(
                hintText: 'Например, чтение',
                hintStyle: TextStyle(fontSize: 16, color: c.ink3),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
        ),
      ),
      SheetField(
        label: 'Единица',
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final u in _units)
              SomnaChip(
                label: u,
                height: 44,
                horizontal: 16,
                active: unit == u,
                onPressed: () => setState(() => unit = u),
              ),
          ],
        ),
      ),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: SheetField(
              label: 'Цель в день',
              child: number(target, 'Цель в день'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SheetField(label: 'Шаг', child: number(step, 'Шаг')),
          ),
        ],
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
        child: Text(
          'Шаг — сколько прибавится за одно нажатие. Цель и шаг должны быть больше нуля.',
          style: TextStyle(fontSize: 12, height: 1.625, color: c.ink2),
        ),
      ),
      SheetField(
        label: 'Цвет',
        child: Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final t in widgetTones)
              PressScale(
                label: 'Цвет: ${toneNames[t]}',
                selected: tone == t,
                onPressed: () => setState(() => tone = t),
                child: AnimatedContainer(
                  duration: SomnaMotion.quick,
                  width: 44,
                  height: 44,
                  padding: EdgeInsets.all(tone == t ? 4 : 0),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      width: tone == t ? 2 : 1,
                      color: tone == t ? c.ink : c.ink.withValues(alpha: .15),
                    ),
                  ),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: toneSwatches[t]!,
                      ),
                    ),
                    child: tone == t
                        ? const Center(
                            child: Lucide(
                              'check',
                              size: 20,
                              color: Colors.white,
                            ),
                          )
                        : null,
                  ),
                ),
              ),
          ],
        ),
      ),
      SheetField(
        label: 'Размер',
        child: Segmented(
          label: 'Размер виджета',
          value: size,
          onChanged: (v) => setState(() => size = v),
          options: const [('1x1', 'Компактный'), ('2x1', 'Широкий')],
        ),
      ),
    ];
  }
}

class _CatalogItem extends StatelessWidget {
  final SomnaWidget widget;
  final (String, String) meta;
  final VoidCallback onPressed;
  const _CatalogItem({
    required this.widget,
    required this.meta,
    required this.onPressed,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), on = widget.visible;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PressScale(
          key: ValueKey('gallery-${widget.id}'),
          label:
              '${meta.$1}: ${on ? 'убрать с главного' : 'добавить на главный'}',
          selected: on,
          onPressed: onPressed,
          child: Stack(
            children: [
              SizedBox(
                height: 168,
                child: IgnorePointer(
                  child: WidgetTile(
                    widget: widget.copyWith(size: '1x1'),
                    interactive: false,
                    showAction: false,
                  ),
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: AnimatedContainer(
                  duration: SomnaMotion.fast,
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: on ? SomnaColors.lime : Colors.white,
                  ),
                  alignment: Alignment.center,
                  child: Lucide(
                    on ? 'check' : 'plus',
                    size: 16,
                    color: on ? SomnaColors.limeInk : Colors.black,
                  ),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
          child: Text(
            meta.$1,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: c.ink,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 2, 4, 0),
          child: Text(
            meta.$2,
            style: TextStyle(fontSize: 12, height: 1.375, color: c.ink2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 6, 4, 0),
          child: Text(
            on ? 'На главном' : 'Добавить на главный',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: on ? c.accent : c.ink2,
            ),
          ),
        ),
      ],
    );
  }
}
