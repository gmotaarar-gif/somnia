import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

/// Height of a full-height sheet body under the host's 24 px drag handle
/// (web `Sheet` at `h-[93%]`).
double fullSheetHeight(BuildContext context) {
  final view = View.of(context);
  final inset = view.padding.bottom / view.devicePixelRatio;
  return (MediaQuery.sizeOf(context).height * .93 - 24 - inset).clamp(
    320.0,
    double.infinity,
  );
}

/// Round glass icon button (web `IconButton`).
class SheetIconButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final double size;
  final VoidCallback onPressed;
  const SheetIconButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.size = 44,
  });
  @override
  Widget build(BuildContext context) => Tooltip(
    message: label,
    excludeFromSemantics: true,
    child: PressScale(
      label: label,
      onPressed: onPressed,
      child: GlassSurface(
        radius: size / 2,
        child: SizedBox(
          width: size - 2,
          height: size - 2,
          child: Icon(icon, size: size < 40 ? 15 : 18),
        ),
      ),
    ),
  );
}

/// Title, optional description and the close button of a standard sheet.
class SheetHeader extends StatelessWidget {
  final String title;
  final String? description;
  final VoidCallback onClose;
  const SheetHeader({
    super.key,
    required this.title,
    required this.onClose,
    this.description,
  });
  @override
  Widget build(BuildContext context) => Padding(
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
                    height: 1.25,
                    letterSpacing: -.72,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (description != null) ...[
                const SizedBox(height: 6),
                Text(
                  description!,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.375,
                    color: SomnaColors.of(context).ink3,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 16),
        SheetIconButton(
          label: 'Закрыть',
          icon: Icons.close,
          onPressed: onClose,
        ),
      ],
    ),
  );
}

/// 48 px pill button (web `Button`): white action that flips in the light
/// theme, or a quiet ghost.
class SheetButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool ghost;
  final VoidCallback? onPressed;
  const SheetButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.ghost = false,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final fg = ghost ? c.ink2 : (dark ? Colors.black : Colors.white);
    return AnimatedOpacity(
      duration: SomnaMotion.quick,
      opacity: onPressed == null ? .4 : 1,
      child: PressScale(
        onPressed: onPressed,
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          decoration: BoxDecoration(
            color: ghost ? null : (dark ? Colors.white : c.ink),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
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
                    letterSpacing: -.15,
                    fontWeight: FontWeight.w500,
                    color: fg,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
