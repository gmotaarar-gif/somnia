import 'package:material_ui/material_ui.dart';

import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'lucide.dart';

/// Section title with an optional hint under it and actions on the right.
class SectionHead extends StatelessWidget {
  final String title;
  final String? hint;
  final List<Widget> actions;
  const SectionHead({
    super.key,
    required this.title,
    this.hint,
    this.actions = const [],
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 20,
                      height: 1.25,
                      fontWeight: FontWeight.w500,
                      letterSpacing: -.5,
                      color: c.ink,
                    ),
                  ),
                ),
                if (hint != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      hint!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: c.ink3),
                    ),
                  ),
              ],
            ),
          ),
          for (final action in actions)
            Padding(padding: const EdgeInsets.only(left: 8), child: action),
        ],
      ),
    );
  }
}

/// White pill action; `glass` is the quiet variant.
class SomnaButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool glass, expand;
  final String? leading, trailing;
  final double horizontal;
  const SomnaButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.glass = false,
    this.expand = false,
    this.leading,
    this.trailing,
    this.horizontal = 24,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final onCard = DefaultTextStyle.of(context).style.color == Colors.white;
    // Outside a card the white action flips with the theme.
    final fill = glass
        ? (onCard ? const Color.fromRGBO(255, 255, 255, .08) : c.glass)
        : (onCard ? Colors.white : c.ink);
    final ink = glass
        ? (onCard ? Colors.white : c.ink)
        : (onCard ? Colors.black : c.bg);
    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (leading != null) ...[
          Lucide(leading!, size: 18, color: ink),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              letterSpacing: -.15,
              color: ink,
            ),
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 8),
          Lucide(trailing!, size: 18, color: ink),
        ],
      ],
    );
    return Opacity(
      opacity: onPressed == null ? .4 : 1,
      child: PressScale(
        onPressed: onPressed,
        label: label,
        child: Container(
          height: 48,
          padding: EdgeInsets.symmetric(horizontal: horizontal),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(24),
            border: glass ? Border.all(color: c.glassEdge) : null,
          ),
          alignment: expand ? Alignment.center : null,
          child: content,
        ),
      ),
    );
  }
}

/// Small pill; the active one is filled with ink.
class SomnaChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onPressed;
  final double height, horizontal;
  const SomnaChip({
    super.key,
    required this.label,
    required this.onPressed,
    this.active = false,
    this.height = 36,
    this.horizontal = 14,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return PressScale(
      onPressed: onPressed,
      label: label,
      selected: active,
      child: AnimatedContainer(
        duration: SomnaMotion.quick,
        height: height,
        padding: EdgeInsets.symmetric(horizontal: horizontal),
        decoration: BoxDecoration(
          color: active ? c.ink : c.glass,
          borderRadius: BorderRadius.circular(height / 2),
          border: Border.all(color: active ? c.ink : c.glassEdge),
        ),
        child: Center(
          widthFactor: 1,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: active ? c.bg : c.ink2,
            ),
          ),
        ),
      ),
    );
  }
}

/// Round glass (or solid white) button around one icon.
class RoundIconButton extends StatelessWidget {
  final String icon, label;
  final VoidCallback? onPressed;
  final double size, iconSize;
  final bool solid;
  const RoundIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.size = 44,
    this.iconSize = 18,
    this.solid = false,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final onCard = DefaultTextStyle.of(context).style.color == Colors.white;
    return PressScale(
      onPressed: onPressed,
      label: label,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: solid
              ? Colors.white
              : onCard
              ? const Color.fromRGBO(255, 255, 255, .08)
              : c.glass,
          border: solid ? null : Border.all(color: c.glassEdge),
        ),
        alignment: Alignment.center,
        child: Lucide(
          icon,
          size: iconSize,
          strokeWidth: 1.75,
          color: solid
              ? Colors.black
              : onCard
              ? Colors.white
              : c.ink,
        ),
      ),
    );
  }
}

/// The white switch used on dark cards.
class SomnaToggle extends StatelessWidget {
  final bool checked;
  final ValueChanged<bool>? onChanged;
  final String label;
  const SomnaToggle({
    super.key,
    required this.checked,
    required this.onChanged,
    required this.label,
  });
  @override
  Widget build(BuildContext context) => Semantics(
    label: label,
    toggled: checked,
    button: true,
    onTap: onChanged == null ? null : () => onChanged!(!checked),
    excludeSemantics: true,
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onChanged == null ? null : () => onChanged!(!checked),
      child: AnimatedContainer(
        duration: SomnaMotion.fast,
        width: 52,
        height: 30,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: checked
              ? Colors.white
              : const Color.fromRGBO(255, 255, 255, .16),
          borderRadius: BorderRadius.circular(15),
        ),
        child: AnimatedAlign(
          duration: SomnaMotion.fast,
          curve: SomnaMotion.bounce,
          alignment: checked ? Alignment.centerRight : Alignment.centerLeft,
          child: AnimatedContainer(
            duration: SomnaMotion.fast,
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: checked ? Colors.black : Colors.white,
              boxShadow: const [
                BoxShadow(
                  color: Color.fromRGBO(0, 0, 0, .4),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

/// Glass pill with a sliding white thumb.
class Segmented extends StatelessWidget {
  final List<(String, String)> options;
  final String value, label;
  final ValueChanged<String> onChanged;
  const Segmented({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.label = 'Выбор варианта',
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final index = options.indexWhere((o) => o.$1 == value);
    return Semantics(
      container: true,
      label: label,
      child: GlassSurface(
        radius: 22,
        padding: const EdgeInsets.all(4),
        child: SizedBox(
          height: 36,
          child: Stack(
            children: [
              if (index >= 0)
                AnimatedAlign(
                  duration: SomnaMotion.fast,
                  curve: SomnaMotion.smooth,
                  alignment: Alignment(
                    options.length == 1
                        ? 0
                        : -1 + 2 * index / (options.length - 1),
                    0,
                  ),
                  child: FractionallySizedBox(
                    widthFactor: 1 / options.length,
                    heightFactor: 1,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: c.ink,
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                  ),
                ),
              Row(
                children: [
                  for (final o in options)
                    Expanded(
                      child: Semantics(
                        button: true,
                        selected: o.$1 == value,
                        inMutuallyExclusiveGroup: true,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: o.$1 == value ? null : () => onChanged(o.$1),
                          child: Center(
                            child: AnimatedDefaultTextStyle(
                              duration: SomnaMotion.fast,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: o.$1 == value ? c.bg : c.ink2,
                              ),
                              child: Text(o.$2, maxLines: 1),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The night as a lit run on a 24-hour dotted line that starts at 18:00.
class NightLine extends StatelessWidget {
  final String bedtime, wakeTime;
  final String? bedGoal, wakeGoal;
  const NightLine({
    super.key,
    required this.bedtime,
    required this.wakeTime,
    this.bedGoal,
    this.wakeGoal,
  });
  static const _start = 18 * 60, _day = 24 * 60;
  static int _along(String time) =>
      ((timeToMinutes(time) - _start) % _day + _day) % _day;
  @override
  Widget build(BuildContext context) {
    final from = _along(bedtime), span = spanMinutes(bedtime, wakeTime);
    return Semantics(
      image: true,
      label: 'Сон с $bedtime до $wakeTime',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 26,
            child: CustomPaint(
              painter: _NightLinePainter(
                from: from,
                span: span,
                goals: [
                  if (bedGoal != null) _along(bedGoal!),
                  if (wakeGoal != null) _along(wakeGoal!),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              for (final t in const ['18:00', '00:00', '06:00', '12:00'])
                Expanded(
                  child: Text(
                    t,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color.fromRGBO(255, 255, 255, .55),
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NightLinePainter extends CustomPainter {
  final int from, span;
  final List<int> goals;
  const _NightLinePainter({
    required this.from,
    required this.span,
    required this.goals,
  });
  @override
  void paint(Canvas canvas, Size size) {
    const slots = 48, top = 10.0, h = 16.0;
    final pitch = (size.width - 3) / (slots - 1);
    final first = (from / 30).ceil(), last = ((from + span) / 30).floor();
    final rest = Paint()..color = const Color.fromRGBO(255, 255, 255, .3);
    final lit = Paint()..color = Colors.white;
    for (var i = 0; i < slots; i++) {
      final x = 1.5 + i * pitch;
      final on = i >= first && i <= last && span > 0;
      if (on) {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x - 1.5, top, 3, h),
            const Radius.circular(1.5),
          ),
          lit,
        );
      } else {
        canvas.drawCircle(Offset(x, top + h / 2), 1.25, rest);
      }
    }
    final mark = Paint()..color = SomnaColors.lime;
    for (final g in goals) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(size.width * g / (24 * 60) - 1, 0, 2, 8),
          const Radius.circular(1),
        ),
        mark,
      );
    }
  }

  @override
  bool shouldRepaint(_NightLinePainter old) =>
      old.from != from || old.span != span || old.goals.join() != goals.join();
}

/// Sheet body with the web sheet's header, a scrolling middle and a pinned footer.
class SheetScaffold extends StatelessWidget {
  final String title;
  final String? description;
  final VoidCallback onClose;
  final Widget child;
  final Widget? footer;
  const SheetScaffold({
    super.key,
    required this.title,
    this.description,
    required this.onClose,
    required this.child,
    this.footer,
  });

  /// Height left for a sheet's content under the host's drag handle.
  static double bodyHeight(BuildContext context) {
    final mq = MediaQuery.of(context);
    return ((mq.size.height - mq.padding.top) * .93 -
            24 -
            mq.padding.bottom -
            mq.viewInsets.bottom)
        .clamp(240.0, double.infinity);
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return SizedBox(
      height: bodyHeight(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 24,
                            height: 1.25,
                            fontWeight: FontWeight.w500,
                            letterSpacing: -.72,
                            color: c.ink,
                          ),
                        ),
                      ),
                      if (description != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            description!,
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.375,
                              color: c.ink3,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                RoundIconButton(
                  icon: 'x',
                  label: 'Закрыть',
                  onPressed: onClose,
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: child,
            ),
          ),
          if (footer != null)
            Container(
              decoration: BoxDecoration(
                color: c.sheet,
                border: Border(top: BorderSide(color: c.hair)),
              ),
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
              child: footer,
            ),
        ],
      ),
    );
  }
}

/// A labelled block inside a sheet form.
class SheetField extends StatelessWidget {
  final String label;
  final Widget child;
  const SheetField({super.key, required this.label, required this.child});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: SomnaColors.of(context).ink3,
          ),
        ),
        const SizedBox(height: 12),
        child,
      ],
    ),
  );
}
