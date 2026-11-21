import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';

class PressScale extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final String? label;
  final bool selected;
  const PressScale({
    super.key,
    required this.child,
    this.onPressed,
    this.label,
    this.selected = false,
  });
  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _pressed = false;
  void _setPressed(bool value) {
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    button: true,
    label: widget.label,
    excludeSemantics: widget.label != null,
    onTap: widget.onPressed,
    selected: widget.selected,
    enabled: widget.onPressed != null,
    child: FocusableActionDetector(
      enabled: widget.onPressed != null,
      mouseCursor: widget.onPressed == null
          ? SystemMouseCursors.basic
          : SystemMouseCursors.click,
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onPressed?.call();
            return null;
          },
        ),
      },
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onPressed,
        onTapDown: widget.onPressed == null ? null : (_) => _setPressed(true),
        onTapUp: (_) => _setPressed(false),
        onTapCancel: () => _setPressed(false),
        child: AnimatedScale(
          scale: _pressed && !MediaQuery.disableAnimationsOf(context)
              ? SomnaMotion.pressScale
              : 1,
          duration: SomnaMotion.quick,
          curve: SomnaMotion.smooth,
          child: widget.child,
        ),
      ),
    ),
  );
}
