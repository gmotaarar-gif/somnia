import 'dart:ui' as ui;

import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../theme/tokens.dart';

typedef SomnaSheetBuilder = Widget Function(BuildContext context, String? arg);

class SheetRegistry extends ChangeNotifier {
  final Map<String, SomnaSheetBuilder> _builders = {};
  void register(String id, SomnaSheetBuilder builder) {
    _builders[id] = builder;
    notifyListeners();
  }

  void unregister(String id) {
    _builders.remove(id);
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
              'bodyscan' => 'Сканирование тела',
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
  WidgetBuilder builder,
) => _BlurSheetRoute<T>(
  builder: (context) => ClipRRect(
    borderRadius: const BorderRadius.vertical(
      top: Radius.circular(SomnaRadii.sheet),
    ),
    child: Material(
      color: SomnaColors.of(context).sheet,
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
                child: SingleChildScrollView(child: Builder(builder: builder)),
              ),
            ],
          ),
        ),
      ),
    ),
  ),
  constraints: BoxConstraints(
    maxHeight: MediaQuery.sizeOf(context).height * .93,
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
