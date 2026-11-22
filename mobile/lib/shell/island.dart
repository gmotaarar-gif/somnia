import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../theme/tokens.dart';

/// Dynamic Island: the black pill at the top of the screen that confirms a
/// save. It is there only while there is something to say.
class Island extends StatefulWidget {
  final SomnaToast? toast;
  const Island({super.key, required this.toast});
  @override
  State<Island> createState() => _IslandState();
}

class _IslandState extends State<Island> with SingleTickerProviderStateMixin {
  late final AnimationController _show = AnimationController(
    vsync: this,
    duration: SomnaMotion.fast,
    reverseDuration: SomnaMotion.quick,
    value: widget.toast == null ? 0 : 1,
  )..addStatusListener(_settled);
  late final CurvedAnimation _shown = CurvedAnimation(
    parent: _show,
    curve: SomnaMotion.smooth,
  );
  late final Animation<Offset> _slide = Tween(
    begin: const Offset(0, -8 / 50),
    end: Offset.zero,
  ).animate(_shown);
  late SomnaToast? _toast = widget.toast;

  void _settled(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && _toast != null) {
      setState(() => _toast = null);
    }
  }

  @override
  void didUpdateWidget(Island old) {
    super.didUpdateWidget(old);
    final toast = widget.toast;
    if (toast != null) {
      _toast = toast;
      _show.forward();
    } else if (old.toast != null) {
      _show.reverse();
    }
  }

  @override
  void dispose() {
    _shown.dispose();
    _show.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final toast = _toast;
    if (toast == null) return const SizedBox.shrink();
    final still = MediaQuery.disableAnimationsOf(context);
    final top = MediaQuery.paddingOf(context).top;
    return Align(
      alignment: Alignment.topCenter,
      child: Padding(
        padding: EdgeInsets.fromLTRB(12, top < 10 ? 10 : top, 12, 0),
        child: IgnorePointer(
          child: FadeTransition(
            opacity: _shown,
            child: SlideTransition(
              position: _slide,
              child: Semantics(
                container: true,
                liveRegion: true,
                child: Container(
                  width: 320,
                  height: 50,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0xcc000000),
                        offset: Offset(0, 10),
                        blurRadius: 30,
                        spreadRadius: -10,
                      ),
                    ],
                  ),
                  foregroundDecoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0x14ffffff)),
                  ),
                  child: Material(
                    type: MaterialType.transparency,
                    child: AnimatedSwitcher(
                      duration: still ? Duration.zero : SomnaMotion.fast,
                      reverseDuration: still
                          ? Duration.zero
                          : SomnaMotion.quick,
                      switchInCurve: SomnaMotion.smooth,
                      child: _Message(
                        key: ValueKey(toast.id),
                        toast: toast,
                        still: still,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  final SomnaToast toast;
  final bool still;
  const _Message({super.key, required this.toast, required this.still});

  @override
  Widget build(BuildContext context) {
    final error = toast.variant == ToastVariant.error;
    final badge = DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: error ? const Color(0xffef4444) : SomnaColors.lime,
      ),
      child: SizedBox.square(
        dimension: 28,
        child: Icon(
          error ? Icons.warning_amber_rounded : Icons.check_rounded,
          size: 18,
          color: error ? Colors.white : SomnaColors.limeInk,
        ),
      ),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          if (still)
            badge
          else
            // The badge pops in a beat after the pill.
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 560),
              curve: const Interval(.25, 1, curve: Curves.easeOutBack),
              builder: (context, scale, child) =>
                  Transform.scale(scale: scale, child: child),
              child: badge,
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              toast.text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                height: 20 / 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
