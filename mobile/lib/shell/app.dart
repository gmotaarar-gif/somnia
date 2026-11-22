import 'dart:async';

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../theme/theme.dart';
import '../ui/sheets.dart';
import '../native/android_reminders.dart';
import '../native/reminders.dart';
import '../native/export.dart';
import 'island.dart';
import 'onboarding.dart';
import 'profile_sheet.dart';
import 'splash.dart';
import 'workspace.dart';

class SomnaApp extends StatefulWidget {
  final SomnaStore? store;
  final SheetRegistry? sheetRegistry;
  final ReminderService? reminders;
  final DataExporter? exporter;
  const SomnaApp({
    super.key,
    this.store,
    this.sheetRegistry,
    this.reminders,
    this.exporter,
  });
  @override
  State<SomnaApp> createState() => _SomnaAppState();
}

class _SomnaAppState extends State<SomnaApp> {
  SomnaStore? _store;
  late final SheetRegistry _registry;
  Object? _loadError;
  ReminderService? _reminders;
  late final DataExporter _exporter;
  @override
  void initState() {
    super.initState();
    _registry = widget.sheetRegistry ?? SheetRegistry();
    _reminders = widget.reminders;
    _exporter = widget.exporter ?? DataExporter(CacheShareTarget());
    if (!_registry.contains('profile')) {
      _registry.register(
        'profile',
        (context, arg) =>
            ProfileSheet(reminders: _reminders, exporter: _exporter),
      );
    }
    _store = widget.store;
    if (_store != null && _reminders != null) {
      unawaited(_reminders!.start(_store!));
    }
    if (_store == null) _load();
  }

  Future<void> _load() async {
    try {
      _reminders ??= ReminderService(AndroidReminderScheduler());
      final store = await SomnaStore.load(
        requestReminderPermission: _reminders!.requestPermission,
      );
      if (!mounted) {
        store.dispose();
        return;
      }
      setState(() {
        _store = store;
        _loadError = null;
      });
      unawaited(_reminders!.start(store));
    } catch (error) {
      if (mounted) setState(() => _loadError = error);
    }
  }

  @override
  void dispose() {
    _reminders?.dispose();
    if (widget.store == null) _store?.dispose();
    if (widget.sheetRegistry == null) _registry.dispose();
    super.dispose();
  }

  Widget _materialApp(SomnaStore? store) => MaterialApp(
    title: 'Somna',
    debugShowCheckedModeBanner: false,
    theme: somnaTheme(Brightness.light),
    darkTheme: somnaTheme(Brightness.dark),
    themeMode: somnaThemeMode(store?.theme ?? 'system'),
    builder: (context, child) {
      final dark = Theme.of(context).brightness == Brightness.dark;
      return AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: Colors.transparent,
          statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
          systemNavigationBarIconBrightness: dark
              ? Brightness.light
              : Brightness.dark,
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            child!,
            Island(toast: store?.toast),
          ],
        ),
      );
    },
    home: store == null
        ? (_loadError == null
              ? const SplashScreen()
              : Scaffold(
                  body: Center(
                    child: FilledButton(
                      onPressed: _load,
                      child: const Text('Повторить загрузку'),
                    ),
                  ),
                ))
        : SheetHost(
            store: store,
            registry: _registry,
            child: store.onboarded
                ? const Workspace()
                : const OnboardingScreen(),
          ),
  );
  @override
  Widget build(BuildContext context) {
    final store = _store;
    if (store == null) return _materialApp(null);
    return SomnaScope(
      store: store,
      child: ListenableBuilder(
        listenable: store,
        builder: (context, _) => _materialApp(store),
      ),
    );
  }
}
