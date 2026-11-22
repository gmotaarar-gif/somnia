import 'dart:ui' as ui;

import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../mind/mood_sheet.dart';
import '../mind/wellbeing_sheet.dart';
import '../sheets/article_sheet.dart';
import '../sheets/practice_sheets.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';

typedef SomnaSheetBuilder = Widget Function(BuildContext context, String? arg);

class SheetRegistry extends ChangeNotifier {
  SheetRegistry() {
    register(
      'mood',
      (context, arg) => const MoodSheet(),
      darkSurface: moodSheetSurface,
    );
    register('wellbeing', (context, arg) => const WellbeingSheet());
    register('article', (context, arg) => ArticleSheet(id: arg));
    register('grounding', (context, arg) => const GroundingSheet());
    register('worry', (context, arg) => const WorrySheet());
    // Without Plus the body scan hands over to the Plus sheet once that is
    // registered (web: SubscriptionSheet opens for a locked practice).
    register(
      'bodyscan',
      (context, arg) => BodyScanSheet(
        locked: (context) => contains('subscription')
            ? build(context, 'subscription', arg)
            : const PlusGate(),
      ),
    );
  }
  final Map<String, SomnaSheetBuilder> _builders = {};
  final Map<String, Color> _darkSurfaces = {};

  /// [darkSurface] keeps the sheet dark in both themes, on that colour.
  void register(String id, SomnaSheetBuilder builder, {Color? darkSurface}) {
    _builders[id] = builder;
    if (darkSurface == null) {
      _darkSurfaces.remove(id);
    } else {
      _darkSurfaces[id] = darkSurface;
    }
    notifyListeners();
  }

  Color? darkSurfaceOf(String id) => _darkSurfaces[id];

  void unregister(String id) {
    _builders.remove(id);
    _darkSurfaces.remove(id);
    notifyListeners();
  }

  bool contains(String id) => _builders.containsKey(id);
  Widget build(BuildContext context, String id, String? arg) =>
      _builders[id]?.call(context, arg) ??
      Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(switch (id) {
              'sleep' => 'Записать сон',
              'mood' => 'Чек-ин состояния',
              _ => 'Скоро здесь',
            }, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            Text(
              'Этот раздел готовится. Ваши записи сохраняются на устройстве.',
              style: TextStyle(color: SomnaColors.of(context).ink2),
            ),
            const SizedBox(height: 24),
          ],
        ),
      );
}

Future<T?> showSomnaSheet<T>(
  BuildContext context, {
  required WidgetBuilder builder,
}) => Navigator.of(context).push<T>(_sheetRoute<T>(context, builder));

ModalBottomSheetRoute<T> _sheetRoute<T>(
  BuildContext context,
  WidgetBuilder builder, {
  Color? darkSurface,
}) => _BlurSheetRoute<T>(
  builder: (context) => darkSurface == null
      ? _sheetBody(context, builder, SomnaColors.of(context).sheet)
      : Theme(
          data: somnaTheme(Brightness.dark),
          child: Builder(
            builder: (context) => _sheetBody(context, builder, darkSurface),
          ),
        ),
  constraints: BoxConstraints(
    maxHeight: MediaQuery.sizeOf(context).height * .93,
  ),
);

Widget _sheetBody(BuildContext context, WidgetBuilder builder, Color color) =>
    ClipRRect(
      borderRadius: const BorderRadius.vertical(
        top: Radius.circular(SomnaRadii.sheet),
      ),
      child: Material(
        color: color,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: SomnaColors.of(context).ink3.withValues(alpha: .3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: SingleChildScrollView(
                    child: Builder(builder: builder),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

class _BlurSheetRoute<T> extends ModalBottomSheetRoute<T> {
  _BlurSheetRoute({required super.builder, required super.constraints})
    : super(
        isScrollControlled: true,
        useSafeArea: true,
        enableDrag: true,
        backgroundColor: Colors.transparent,
        modalBarrierColor: const Color.fromRGBO(0, 0, 0, .55),
        barrierLabel: 'Закрыть окно',
        sheetAnimationStyle: const AnimationStyle(
          duration: SomnaMotion.slow,
          reverseDuration: SomnaMotion.fast,
        ),
      );
  @override
  Widget buildModalBarrier() => AnimatedBuilder(
    animation: animation!,
    builder: (context, _) {
      final sigma = MediaQuery.disableAnimationsOf(context)
          ? 6.0
          : 8 * animation!.value;
      return BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
        child: super.buildModalBarrier(),
      );
    },
  );
}

class SheetHost extends StatefulWidget {
  final SomnaStore store;
  final SheetRegistry registry;
  final Widget child;
  const SheetHost({
    super.key,
    required this.store,
    required this.registry,
    required this.child,
  });
  @override
  State<SheetHost> createState() => _SheetHostState();
}

class _SheetHostState extends State<SheetHost> {
  ModalBottomSheetRoute<void>? _route;
  String? _id, _arg;
  bool _queued = false;
  @override
  void initState() {
    super.initState();
    widget.store.addListener(_schedule);
    _schedule();
  }

  @override
  void didUpdateWidget(SheetHost old) {
    super.didUpdateWidget(old);
    if (old.store != widget.store) {
      old.store.removeListener(_schedule);
      widget.store.addListener(_schedule);
    }
    _schedule();
  }

  void _schedule() {
    if (_queued) return;
    _queued = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _queued = false;
      if (mounted) _sync();
    });
  }

  void _sync() {
    final id = widget.store.sheet, arg = widget.store.sheetArg;
    if (_id == id && _arg == arg && _route != null) return;
    final previous = _route;
    _route = null;
    if (previous != null && previous.isActive) {
      Navigator.of(context).removeRoute(previous);
    }
    _id = id;
    _arg = arg;
    if (id == null) return;
    final store = widget.store;
    final route = _sheetRoute<void>(
      context,
      (context) => ListenableBuilder(
        listenable: widget.registry,
        builder: (context, _) => widget.registry.build(context, id, arg),
      ),
      darkSurface: widget.registry.darkSurfaceOf(id),
    );
    _route = route;
    Navigator.of(context).push(route).then((_) {
      if (!mounted || _route != route) return;
      _route = null;
      _id = null;
      _arg = null;
      if (store.sheet == id && store.sheetArg == arg) store.openSheet(null);
    });
  }

  @override
  void dispose() {
    widget.store.removeListener(_schedule);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
