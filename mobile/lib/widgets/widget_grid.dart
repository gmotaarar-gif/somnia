import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import 'catalog.dart';
import 'widget_tile.dart';

class WidgetGrid extends StatefulWidget {
  const WidgetGrid({super.key});
  @override
  State<WidgetGrid> createState() => _WidgetGridState();
}

class _WidgetGridState extends State<WidgetGrid>
    with SingleTickerProviderStateMixin {
  late final _jiggle = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 240),
  );
  @override
  void dispose() {
    _jiggle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final editing = s.editing;
    if (editing && !MediaQuery.disableAnimationsOf(context)) {
      if (!_jiggle.isAnimating) _jiggle.repeat(reverse: true);
    } else {
      _jiggle.stop();
    }
    final visible = s.widgets.where((w) => w.visible).toList();
    return LayoutBuilder(
      builder: (context, box) {
        final half = (box.maxWidth - 12) / 2;
        final rows = <List<SomnaWidget>>[];
        for (final w in visible) {
          if (w.size == '2x1') {
            rows.add([w]);
          } else {
            final open = rows
                .where((r) => r.length == 1 && r.first.size == '1x1')
                .firstOrNull;
            if (open != null) {
              open.add(w);
            } else {
              rows.add([w]);
            }
          }
        }
        Widget tile(SomnaWidget w) {
          final width = w.size == '2x1' ? box.maxWidth : half;
          final content = SizedBox(
            width: width,
            height: 178,
            child: WidgetTile(widget: w, interactive: !editing),
          );
          return DragTarget<String>(
            onAcceptWithDetails: (details) {
              final list = [...s.widgets];
              final from = list.indexWhere((x) => x.id == details.data),
                  to = list.indexWhere((x) => x.id == w.id);
              if (from >= 0 && to >= 0) {
                final moved = list.removeAt(from);
                list.insert(to, moved);
                s.setWidgets(list);
              }
            },
            builder: (context, candidates, rejected) => GestureDetector(
              onLongPress: editing ? null : () => s.setEditing(true),
              child: AnimatedBuilder(
                animation: _jiggle,
                builder: (context, _) => Transform.rotate(
                  angle: editing && !MediaQuery.disableAnimationsOf(context)
                      ? (_jiggle.value - .5) * .025
                      : 0,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      if (editing)
                        LongPressDraggable<String>(
                          data: w.id,
                          delay: const Duration(milliseconds: 140),
                          feedback: Material(
                            color: Colors.transparent,
                            child: Opacity(opacity: .85, child: content),
                          ),
                          childWhenDragging: Opacity(
                            opacity: .25,
                            child: content,
                          ),
                          child: content,
                        )
                      else
                        content,
                      if (editing) ...[
                        Positioned(
                          top: -8,
                          left: -8,
                          child: _edit(
                            'Убрать виджет',
                            Icons.remove,
                            () => s.updateWidget(w.id, {'visible': false}),
                          ),
                        ),
                        Positioned(
                          top: -8,
                          right: -8,
                          child: _edit(
                            'Сменить цвет',
                            Icons.palette_outlined,
                            () => s.updateWidget(w.id, {
                              'tone':
                                  widgetTones[(widgetTones.indexOf(w.tone) +
                                          1) %
                                      widgetTones.length],
                            }),
                          ),
                        ),
                        Positioned(
                          bottom: -8,
                          right: -8,
                          child: _edit(
                            w.size == '2x1'
                                ? 'Сделать компактным'
                                : 'Сделать широким',
                            Icons.open_in_full,
                            () => s.updateWidget(w.id, {
                              'size': w.size == '2x1' ? '1x1' : '2x1',
                            }),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        return Column(
          children: [
            for (final row in rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    tile(row.first),
                    if (row.length > 1) ...[
                      const SizedBox(width: 12),
                      tile(row.last),
                    ],
                  ],
                ),
              ),
            if (editing || visible.isEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: SizedBox(
                  width: half,
                  height: 178,
                  child: OutlinedButton(
                    onPressed: () => s.openSheet('gallery'),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add),
                        SizedBox(height: 12),
                        Text('Добавить виджет'),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _edit(String label, IconData icon, VoidCallback run) =>
      SizedBox.square(
        dimension: 32,
        child: IconButton.filled(
          tooltip: label,
          padding: EdgeInsets.zero,
          style: IconButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
          ),
          iconSize: 16,
          onPressed: run,
          icon: Icon(icon),
        ),
      );
}
