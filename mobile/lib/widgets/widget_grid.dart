import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'catalog.dart';
import 'lucide.dart';
import 'widget_tile.dart';

const _rowHeight = 178.0, _gap = 12.0;

class WidgetGrid extends StatefulWidget {
  const WidgetGrid({super.key});
  @override
  State<WidgetGrid> createState() => _WidgetGridState();
}

class _WidgetGridState extends State<WidgetGrid>
    with SingleTickerProviderStateMixin {
  late final _jiggle = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 360),
  );
  @override
  void dispose() {
    _jiggle.dispose();
    super.dispose();
  }

  void _move(SomnaStore s, String fromId, String toId) {
    if (fromId == toId) return;
    final list = [...s.widgets];
    final from = list.indexWhere((x) => x.id == fromId),
        to = list.indexWhere((x) => x.id == toId);
    if (from < 0 || to < 0) return;
    list.insert(to, list.removeAt(from));
    s.setWidgets(list);
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final editing = s.editing;
    final still = MediaQuery.disableAnimationsOf(context);
    if (editing && !still) {
      if (!_jiggle.isAnimating) _jiggle.repeat(reverse: true);
    } else {
      _jiggle.stop();
    }
    final visible = s.widgets.where((w) => w.visible).toList();
    return LayoutBuilder(
      builder: (context, box) {
        final half = (box.maxWidth - _gap) / 2;
        // Two columns, dense: a compact widget fills the first open half row.
        final rows = <List<SomnaWidget?>>[];
        for (final w in visible) {
          if (w.size == '2x1') {
            rows.add([w]);
            continue;
          }
          final open = rows
              .where((r) => r.length == 1 && r.first?.size == '1x1')
              .firstOrNull;
          open == null ? rows.add([w]) : open.add(w);
        }
        if (editing || visible.isEmpty) {
          final open = rows
              .where((r) => r.length == 1 && r.first?.size == '1x1')
              .firstOrNull;
          open == null ? rows.add([null]) : open.add(null);
        }

        Widget tile(SomnaWidget w, int index) {
          final wide = w.size == '2x1';
          final content = SizedBox(
            width: wide ? box.maxWidth : half,
            height: _rowHeight,
            child: WidgetTile(widget: w, interactive: !editing),
          );
          if (!editing) {
            return GestureDetector(
              onLongPress: () => s.setEditing(true),
              child: content,
            );
          }
          return DragTarget<String>(
            onAcceptWithDetails: (details) => _move(s, details.data, w.id),
            builder: (context, candidates, rejected) => AnimatedBuilder(
              animation: _jiggle,
              builder: (context, child) => Transform.rotate(
                angle: still
                    ? 0
                    : ((index.isEven ? _jiggle.value : 1 - _jiggle.value) -
                              .5) *
                          2 *
                          .55 *
                          math.pi /
                          180,
                child: child,
              ),
              child: AnimatedScale(
                duration: SomnaMotion.quick,
                scale: candidates.isEmpty ? 1 : .96,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    LongPressDraggable<String>(
                      hitTestBehavior: HitTestBehavior.opaque,
                      data: w.id,
                      delay: const Duration(milliseconds: 140),
                      feedback: Transform.scale(
                        scale: 1.04,
                        child: Opacity(opacity: .92, child: content),
                      ),
                      childWhenDragging: Opacity(opacity: .25, child: content),
                      child: IgnorePointer(child: content),
                    ),
                    Positioned(
                      top: -6,
                      left: -6,
                      child: _EditButton(
                        label: 'Убрать виджет',
                        icon: 'minus',
                        onPressed: () =>
                            s.updateWidget(w.id, {'visible': false}),
                      ),
                    ),
                    Positioned(
                      top: -6,
                      right: -6,
                      child: _EditButton(
                        label: 'Сменить цвет',
                        icon: 'palette',
                        onPressed: () => s.updateWidget(w.id, {
                          'tone':
                              widgetTones[(widgetTones.indexOf(w.tone) + 1) %
                                  widgetTones.length],
                        }),
                      ),
                    ),
                    Positioned(
                      bottom: -6,
                      right: -6,
                      child: _EditButton(
                        label: wide ? 'Сделать компактным' : 'Сделать широким',
                        icon: wide ? 'minimize2' : 'maximize2',
                        onPressed: () => s.updateWidget(w.id, {
                          'size': wide ? '1x1' : '2x1',
                        }),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        var index = 0;
        return Column(
          children: [
            for (final (n, row) in rows.indexed)
              Padding(
                padding: EdgeInsets.only(
                  bottom: n == rows.length - 1 ? 0 : _gap,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final (i, w) in row.indexed) ...[
                      if (i > 0) const SizedBox(width: _gap),
                      if (w == null)
                        SizedBox(
                          width: half,
                          height: _rowHeight,
                          child: const _AddTile(),
                        )
                      else
                        tile(w, index++),
                    ],
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _EditButton extends StatelessWidget {
  final String label, icon;
  final VoidCallback onPressed;
  const _EditButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: .4, end: 1),
    duration: MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : SomnaMotion.fast,
    curve: SomnaMotion.smooth,
    builder: (context, t, child) => Opacity(
      opacity: ((t - .4) / .6).clamp(0, 1),
      child: Transform.scale(scale: t, child: child),
    ),
    child: Tooltip(
      message: label,
      excludeFromSemantics: true,
      child: PressScale(
        label: label,
        onPressed: onPressed,
        child: Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Color.fromRGBO(0, 0, 0, .5),
                blurRadius: 18,
                offset: Offset(0, 6),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Lucide(icon, size: 16, color: Colors.black),
        ),
      ),
    ),
  );
}

/// Dashed slot that opens the gallery.
class _AddTile extends StatelessWidget {
  const _AddTile();
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return PressScale(
      label: 'Добавить виджет',
      onPressed: () => SomnaScope.of(context).openSheet('gallery'),
      child: CustomPaint(
        painter: _DashedBorder(c.ink.withValues(alpha: .22), 34),
        child: Container(
          decoration: BoxDecoration(
            color: c.ink.withValues(alpha: .03),
            borderRadius: BorderRadius.circular(34),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              GlassSurface(
                radius: 24,
                child: SizedBox.square(
                  dimension: 48,
                  child: Center(child: Lucide('plus', size: 20, color: c.ink2)),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Добавить виджет',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: c.ink2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashedBorder extends CustomPainter {
  final Color color;
  final double radius;
  const _DashedBorder(this.color, this.radius);
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          (Offset.zero & size).deflate(.5),
          Radius.circular(radius),
        ),
      );
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 7) {
        canvas.drawPath(metric.extractPath(d, d + 4), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) =>
      old.color != color || old.radius != radius;
}
