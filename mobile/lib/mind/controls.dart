import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

/// Scores are stored as doubles; whole ones read as on web (`64`, not `64.0`).
String scoreText(num v) =>
    v == v.roundToDouble() ? v.round().toString() : v.toString();

enum MindButtonKind { primary, glass, ghost }

class MindButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final MindButtonKind kind;
  final double height;
  const MindButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.kind = MindButtonKind.primary,
    this.height = 48,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final color = switch (kind) {
      MindButtonKind.primary => dark ? Colors.black : Colors.white,
      MindButtonKind.glass => c.ink,
      MindButtonKind.ghost => c.ink2,
    };
    final content = SizedBox(
      height: height,
      width: double.infinity,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: color),
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
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
    return PressScale(
      onPressed: onPressed,
      child: switch (kind) {
        MindButtonKind.primary => DecoratedBox(
          decoration: BoxDecoration(
            color: c.ink,
            borderRadius: BorderRadius.circular(height / 2),
          ),
          child: content,
        ),
        MindButtonKind.glass => GlassSurface(
          radius: height / 2,
          child: content,
        ),
        MindButtonKind.ghost => content,
      },
    );
  }
}

class MindSegmented<T> extends StatelessWidget {
  final String label;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;
  const MindSegmented({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final index = options.indexWhere((o) => o.$1 == value);
    final reduce = MediaQuery.disableAnimationsOf(context);
    return Semantics(
      container: true,
      label: label,
      child: GlassSurface(
        radius: 22,
        padding: const EdgeInsets.all(4),
        child: IntrinsicWidth(
          child: Stack(
            children: [
              if (index >= 0)
                Positioned.fill(
                  child: AnimatedAlign(
                    alignment: Alignment(
                      options.length < 2
                          ? 0
                          : -1 + 2 * index / (options.length - 1),
                      0,
                    ),
                    duration: reduce ? Duration.zero : SomnaMotion.fast,
                    curve: SomnaMotion.smooth,
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
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: Text(
                                text,
                                maxLines: 1,
                                softWrap: false,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: v == value
                                      ? (dark ? Colors.black : Colors.white)
                                      : c.ink2,
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
          ),
        ),
      ),
    );
  }
}

class MindChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onPressed;
  const MindChip({
    super.key,
    required this.label,
    required this.active,
    required this.onPressed,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final text = SizedBox(
      height: 44,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18),
        child: Center(
          widthFactor: 1,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: active ? (dark ? Colors.black : Colors.white) : c.ink2,
            ),
          ),
        ),
      ),
    );
    return PressScale(
      selected: active,
      onPressed: onPressed,
      child: active
          ? DecoratedBox(
              decoration: BoxDecoration(
                color: c.ink,
                borderRadius: BorderRadius.circular(22),
              ),
              child: text,
            )
          : GlassSurface(radius: 22, child: text),
    );
  }
}

class MindSectionHead extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const MindSectionHead({super.key, required this.title, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w500,
                height: 1.25,
                letterSpacing: -.5,
              ),
            ),
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    ),
  );
}
