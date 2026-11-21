import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';

bool _dark(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark;

/// Title, description and close button shared by the account sheets.
class SheetHeader extends StatelessWidget {
  final String title;
  final String? description;
  final VoidCallback onClose;
  const SheetHeader({
    super.key,
    required this.title,
    this.description,
    required this.onClose,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
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
                      fontWeight: FontWeight.w500,
                      letterSpacing: -.72,
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
                      color: c.ink3,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 16),
          PressScale(
            label: 'Закрыть',
            onPressed: onClose,
            child: GlassSurface(
              radius: 22,
              child: SizedBox.square(
                dimension: 44,
                child: Icon(Icons.close, size: 20, color: c.ink),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class Field extends StatelessWidget {
  final String label;
  final String? hint;
  final Widget child;
  const Field({super.key, required this.label, this.hint, required this.child});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 12,
            runSpacing: 2,
            children: [
              Semantics(
                header: true,
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

enum SomnaButtonVariant { primary, glass, ghost, danger }

class SomnaButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final SomnaButtonVariant variant;
  final double height, fontSize;
  const SomnaButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.variant = SomnaButtonVariant.primary,
    this.height = 48,
    this.fontSize = 15,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), dark = _dark(context);
    final (Color? fill, Color ink, BoxBorder? border) = switch (variant) {
      SomnaButtonVariant.primary => (
        c.ink,
        dark ? Colors.black : Colors.white,
        null,
      ),
      SomnaButtonVariant.glass => (
        c.glass,
        c.ink,
        Border.all(color: c.glassEdge),
      ),
      SomnaButtonVariant.ghost => (null, c.ink2, null),
      SomnaButtonVariant.danger => (
        const Color.fromRGBO(255, 93, 93, .14),
        c.danger,
        Border.all(color: const Color.fromRGBO(255, 93, 93, .25)),
      ),
    };
    return PressScale(
      label: label,
      onPressed: onPressed,
      child: Opacity(
        opacity: onPressed == null ? .4 : 1,
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: fill,
            border: border,
            borderRadius: BorderRadius.circular(height / 2),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: fontSize,
                    fontWeight: FontWeight.w500,
                    letterSpacing: -.15,
                    color: ink,
                  ),
                ),
              ),
              if (icon != null) ...[
                const SizedBox(width: 8),
                Icon(icon, size: 18, color: ink),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Enter and Space activate a focused control, as on [PressScale].
const activateShortcuts = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
  SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
};

class SomnaToggle extends StatelessWidget {
  final bool value;
  final String label;
  final ValueChanged<bool>? onChanged;
  const SomnaToggle({
    super.key,
    required this.value,
    required this.label,
    this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), dark = _dark(context);
    return Semantics(
      container: true,
      toggled: value,
      label: label,
      enabled: onChanged != null,
      onTap: onChanged == null ? null : () => onChanged!(!value),
      excludeSemantics: true,
      child: FocusableActionDetector(
        enabled: onChanged != null,
        shortcuts: activateShortcuts,
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => onChanged?.call(!value),
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onChanged == null ? null : () => onChanged!(!value),
          child: AnimatedContainer(
            duration: SomnaMotion.fast,
            width: 52,
            height: 30,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: value ? c.ink : c.ink.withValues(alpha: .16),
              borderRadius: BorderRadius.circular(15),
            ),
            child: AnimatedAlign(
              duration: SomnaMotion.fast,
              curve: SomnaMotion.smooth,
              alignment: value ? Alignment.centerRight : Alignment.centerLeft,
              child: AnimatedContainer(
                duration: SomnaMotion.fast,
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: value && dark ? Colors.black : Colors.white,
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
      ),
    );
  }
}

class Segmented<T> extends StatelessWidget {
  final String label;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;
  const Segmented({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), dark = _dark(context);
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
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : SomnaMotion.medium,
                  curve: SomnaMotion.smooth,
                  alignment: Alignment(
                    options.length < 2
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
                  for (final (option, text) in options)
                    Expanded(
                      child: PressScale(
                        label: text,
                        selected: option == value,
                        onPressed: () {
                          if (option != value) onChanged(option);
                        },
                        child: Center(
                          child: AnimatedDefaultTextStyle(
                            duration: SomnaMotion.fast,
                            style: TextStyle(
                              fontFamily: 'Onest',
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: option == value
                                  ? (dark ? Colors.black : Colors.white)
                                  : c.ink2,
                            ),
                            child: Text(text, maxLines: 1),
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

/// 24-hour time value that opens the system time picker.
class TimeField extends StatelessWidget {
  final String label, value;
  final ValueChanged<String> onChanged;
  const TimeField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
  });
  static final _time = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');
  Future<void> _pick(BuildContext context) async {
    final valid = _time.hasMatch(value);
    final time = await showTimePicker(
      context: context,
      initialTime: valid
          ? TimeOfDay(
              hour: int.parse(value.substring(0, 2)),
              minute: int.parse(value.substring(3)),
            )
          : const TimeOfDay(hour: 22, minute: 30),
      helpText: label,
      cancelText: 'Отмена',
      confirmText: 'Сохранить',
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (time == null) return;
    onChanged(
      '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return PressScale(
      label: '$label, $value',
      onPressed: () => _pick(context),
      child: GlassSurface(
        radius: 22,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(label, style: TextStyle(fontSize: 12, color: c.ink3)),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text(
                    value,
                    style: const TextStyle(
                      fontSize: 26,
                      height: 1.2,
                      fontWeight: FontWeight.w500,
                      letterSpacing: -.52,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
                Icon(Icons.schedule, size: 18, color: c.ink3),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? sub;
  final bool danger;
  final VoidCallback onPressed;
  const SettingsRow({
    super.key,
    required this.icon,
    required this.title,
    this.sub,
    this.danger = false,
    required this.onPressed,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), ink = danger ? c.danger : c.ink;
    return PressScale(
      label: sub == null ? title : '$title. $sub',
      onPressed: onPressed,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 18, color: ink.withValues(alpha: ink.a * .7)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 15, color: ink)),
                  if (sub != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      sub!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: c.ink3),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 12),
            Icon(Icons.chevron_right, size: 18, color: c.ink3),
          ],
        ),
      ),
    );
  }
}

class SettingsGroup extends StatelessWidget {
  final List<Widget> children;
  const SettingsGroup({super.key, required this.children});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return GlassSurface(
      radius: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, child) in children.indexed) ...[
            if (i > 0)
              Container(height: 1, color: c.hair.withValues(alpha: .06)),
            child,
          ],
        ],
      ),
    );
  }
}
