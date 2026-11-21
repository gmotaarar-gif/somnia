import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';

/// A deliberate slide for the one action that cannot be undone.
class SlideToConfirm extends StatefulWidget {
  final String label, doneLabel;
  final VoidCallback onConfirm;
  final double height, threshold;
  final Color color;
  const SlideToConfirm({
    super.key,
    required this.label,
    required this.doneLabel,
    required this.onConfirm,
    this.height = 56,
    this.threshold = .88,
    this.color = const Color.fromRGBO(229, 72, 77, 1),
  });
  @override
  State<SlideToConfirm> createState() => _SlideToConfirmState();
}

class _SlideToConfirmState extends State<SlideToConfirm>
    with SingleTickerProviderStateMixin {
  static const _pad = 5.0;
  late final AnimationController _slide = AnimationController(vsync: this)
    ..addListener(() => setState(() {}));
  bool _done = false;

  void _confirm() {
    if (_done) return;
    setState(() => _done = true);
    _slide.animateTo(1, duration: SomnaMotion.fast, curve: SomnaMotion.smooth);
    HapticFeedback.mediumImpact();
    widget.onConfirm();
  }

  void _drag(double delta, double travel) {
    if (_done || travel <= 0) return;
    _slide.value = (_slide.value + delta / travel).clamp(0.0, 1.0);
  }

  void _end() {
    if (_done) return;
    if (_slide.value >= widget.threshold) {
      _confirm();
    } else {
      _slide.animateTo(
        0,
        duration: SomnaMotion.medium,
        curve: SomnaMotion.smooth,
      );
    }
  }

  @override
  void dispose() {
    _slide.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context), knob = widget.height - _pad * 2;
    return Semantics(
      container: true,
      button: true,
      label: _done ? widget.doneLabel : widget.label,
      onTap: _done ? null : _confirm,
      excludeSemantics: true,
      child: LayoutBuilder(
        builder: (context, box) {
          final travel = box.maxWidth - knob - _pad * 2,
              x = travel * _slide.value;
          return RawGestureDetector(
            gestures: {
              HorizontalDragGestureRecognizer:
                  GestureRecognizerFactoryWithHandlers<
                    HorizontalDragGestureRecognizer
                  >(HorizontalDragGestureRecognizer.new, (r) {
                    r
                      ..onUpdate = ((d) => _drag(d.delta.dx, travel))
                      ..onEnd = ((_) => _end())
                      ..onCancel = _end;
                  }),
            },
            behavior: HitTestBehavior.opaque,
            child: Container(
              height: widget.height,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: c.glassInset,
                borderRadius: BorderRadius.circular(widget.height / 2),
              ),
              child: Stack(
                children: [
                  Positioned(
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: x + knob + _pad * 2,
                    child: Opacity(
                      opacity: _done ? 1 : (.15 + _slide.value).clamp(0.0, 1.0),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: widget.color,
                          borderRadius: BorderRadius.circular(
                            widget.height / 2,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Center(
                    child: _done
                        ? Text(
                            widget.doneLabel,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: Colors.white,
                            ),
                          )
                        : Opacity(
                            opacity: (1 - _slide.value * 1.6).clamp(0.0, 1.0),
                            child: Padding(
                              padding: EdgeInsets.only(left: knob),
                              child: Text(
                                widget.label,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w500,
                                  color: c.ink2,
                                ),
                              ),
                            ),
                          ),
                  ),
                  Positioned(
                    left: _pad + x,
                    top: _pad,
                    width: knob,
                    height: knob,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _done ? Colors.white : widget.color,
                        boxShadow: const [
                          BoxShadow(
                            color: Color.fromRGBO(0, 0, 0, .18),
                            blurRadius: 6,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Icon(
                        _done ? Icons.check : Icons.chevron_right,
                        size: 24,
                        color: _done ? widget.color : Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
