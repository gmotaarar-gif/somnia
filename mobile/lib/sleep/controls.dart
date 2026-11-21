import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

/// Web `bg-white text-black`: flips with the theme outside cards.
Color inverseInk(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
    ? Colors.black
    : Colors.white;

enum SomnaButtonVariant { primary, glass, ghost, danger }

class SomnaButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final SomnaButtonVariant variant;
  final bool expand;
  final double horizontal;
  const SomnaButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.variant = SomnaButtonVariant.primary,
    this.expand = false,
    this.horizontal = 24,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final fg = switch (variant) {
      SomnaButtonVariant.primary => inverseInk(context),
      SomnaButtonVariant.glass => c.ink,
      SomnaButtonVariant.ghost => c.ink2,
      SomnaButtonVariant.danger => c.danger,
    };
    final content = SizedBox(
      height: 48,
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: horizontal),
        child: Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18, color: fg),
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
                  color: fg,
                ),
              ),
            ),
          ],
        ),
      ),
    );
    final Widget surface = switch (variant) {
      SomnaButtonVariant.primary => DecoratedBox(
        decoration: BoxDecoration(
          color: c.ink,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color.fromRGBO(0, 0, 0, .7),
              blurRadius: 36,
              spreadRadius: -18,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: content,
      ),
      SomnaButtonVariant.glass => GlassSurface(radius: 24, child: content),
      SomnaButtonVariant.ghost => content,
      SomnaButtonVariant.danger => DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xffff5d5d).withValues(alpha: .14),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: const Color(0xffff5d5d).withValues(alpha: .25),
          ),
        ),
        child: content,
      ),
    };
    return Opacity(
      opacity: onPressed == null ? .4 : 1,
      child: PressScale(onPressed: onPressed, child: surface),
    );
  }
}

class SomnaChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback? onPressed;
  const SomnaChip({
    super.key,
    required this.label,
    this.active = false,
    this.onPressed,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final text = SizedBox(
      height: 36,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Center(
          widthFactor: 1,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: active ? inverseInk(context) : c.ink2,
            ),
          ),
        ),
      ),
    );
    return PressScale(
      onPressed: onPressed,
      selected: active,
      child: active
          ? DecoratedBox(
              decoration: BoxDecoration(
                color: c.ink,
                borderRadius: BorderRadius.circular(18),
              ),
              child: text,
            )
          : GlassSurface(radius: 18, child: text),
    );
  }
}

class Segmented<T> extends StatelessWidget {
  final String label;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;
  final bool expand;
  const Segmented({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.expand = false,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final index = options.indexWhere((o) => o.$1 == value);
    final reduce = MediaQuery.disableAnimationsOf(context);
    Widget row = Stack(
      children: [
        if (index >= 0)
          Positioned.fill(
            child: AnimatedAlign(
              duration: reduce ? Duration.zero : SomnaMotion.fast,
              curve: SomnaMotion.smooth,
              alignment: Alignment(
                options.length < 2 ? 0 : -1 + 2 * index / (options.length - 1),
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
          ),
        Row(
          children: [
            for (final (v, text) in options)
              Expanded(
                child: PressScale(
                  selected: v == value,
                  onPressed: () {
                    if (v != value) onChanged(v);
                  },
                  child: SizedBox(
                    height: 36,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Center(
                        child: Text(
                          text,
                          maxLines: 1,
                          softWrap: false,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: v == value ? inverseInk(context) : c.ink2,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
    if (!expand) row = IntrinsicWidth(child: row);
    return Semantics(
      container: true,
      label: label,
      child: GlassSurface(
        radius: 22,
        padding: const EdgeInsets.all(4),
        child: row,
      ),
    );
  }
}

class SomnaStepper extends StatelessWidget {
  final String label;
  final int value, min, max;
  final ValueChanged<int> onChanged;
  const SomnaStepper({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 99,
  });
  Widget _button(BuildContext context, String name, String sign, int next) {
    final enabled = next >= min && next <= max;
    return Opacity(
      opacity: enabled ? 1 : .3,
      child: PressScale(
        label: name,
        onPressed: enabled ? () => onChanged(next) : null,
        child: SizedBox.square(
          dimension: 36,
          child: Center(
            child: Text(
              sign,
              style: TextStyle(
                fontSize: 18,
                color: SomnaColors.of(context).ink,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: label,
    child: GlassSurface(
      radius: 22,
      padding: const EdgeInsets.all(4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _button(context, 'Меньше', '−', value - 1),
          SizedBox(
            width: 36,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ),
          _button(context, 'Больше', '+', value + 1),
        ],
      ),
    ),
  );
}

class SectionHead extends StatelessWidget {
  final String title;
  final String? hint;
  final Widget? trailing;
  const SectionHead({super.key, required this.title, this.hint, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w500,
                  height: 1.25,
                  letterSpacing: -.5,
                ),
              ),
              if (hint != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    hint!,
                    style: TextStyle(
                      fontSize: 13,
                      color: SomnaColors.of(context).ink3,
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    ),
  );
}

/// Title, description and close button of a web `Sheet`.
class SheetHeader extends StatelessWidget {
  final String title;
  final String? description;
  const SheetHeader({super.key, required this.title, this.description});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
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
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w500,
                      height: 1.25,
                      letterSpacing: -.72,
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
          PressScale(
            label: 'Закрыть',
            onPressed: () => Navigator.of(context).maybePop(),
            child: GlassSurface(
              radius: 22,
              child: SizedBox.square(
                dimension: 44,
                child: Icon(Icons.close_rounded, size: 18, color: c.ink),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SheetField extends StatelessWidget {
  final String label;
  final String? hint;
  final Widget child;
  const SheetField({
    super.key,
    required this.label,
    this.hint,
    required this.child,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: c.ink3,
                  ),
                ),
              ),
              if (hint != null)
                Text(hint!, style: TextStyle(fontSize: 13, color: c.ink2)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Web `Ruler`: a tick strip with one lime marker.
class Ruler extends StatelessWidget {
  final double value;
  final List<String>? labels;
  const Ruler({super.key, required this.value, this.labels});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return ExcludeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 28,
            child: CustomPaint(
              painter: _RulerPainter(
                value.isFinite ? value.clamp(0, 1).toDouble() : 0,
                c.ink.withValues(alpha: .3),
              ),
            ),
          ),
          if (labels != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  for (final l in labels!)
                    Flexible(
                      child: Text(
                        l,
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.fade,
                        style: TextStyle(
                          fontSize: 10,
                          height: 1,
                          color: c.ink3,
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _RulerPainter extends CustomPainter {
  final double value;
  final Color tick;
  const _RulerPainter(this.value, this.tick);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = tick;
    for (double x = 0; x < size.width; x += 4) {
      canvas.drawRect(Rect.fromLTWH(x, size.height - 18, 1, 18), paint);
    }
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(value * size.width - 1, 0, 2, size.height),
        const Radius.circular(1),
      ),
      Paint()..color = SomnaColors.lime,
    );
  }

  @override
  bool shouldRepaint(_RulerPainter old) =>
      old.value != value || old.tick != tick;
}
