import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/store.dart';
import 'package:somna/native/export.dart';
import 'package:somna/native/reminders.dart';
import 'package:somna/shell/app.dart';

import 'export_test.dart' show FakeExportTarget;
import 'reminders_test.dart' show FakeScheduler;

void main() {
  testWidgets(
    'profile toggles both reminders, edits local times, and exports through sharing',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2340);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final store = SomnaStore(
        initialState: defaultState().patch({
          'onboarded': true,
          'reminder': false,
          'morningReminder': false,
        }),
        autoRefresh: false,
      );
      addTearDown(store.dispose);
      final scheduler = FakeScheduler(), target = FakeExportTarget();
      await tester.pumpWidget(
        SomnaApp(
          store: store,
          reminders: ReminderService(scheduler),
          exporter: DataExporter(target),
        ),
      );
      await tester.pumpAndSettle();
      store.openSheet('profile');
      await tester.pumpAndSettle();
      for (var i = 0; i < 2; i++) {
        final toggle = find.byType(SwitchListTile).at(i);
        await tester.ensureVisible(toggle);
        await tester.tap(toggle);
        await tester.pumpAndSettle();
      }
      expect(store.reminder, true);
      expect(store.morningReminder, true);
      final time = find.text('Время вечером');
      await tester.ensureVisible(time);
      await tester.tap(time);
      await tester.pumpAndSettle();
      expect(find.byType(TimePickerDialog), findsOneWidget);
      await tester.tap(find.text('Сохранить'));
      await tester.pumpAndSettle();
      expect(validReminderTime(store.reminderTime), true);
      final export = find.text('Экспорт данных');
      await tester.ensureVisible(export);
      await tester.tap(export);
      await tester.pump(const Duration(milliseconds: 200));
      expect(target.json, isNotNull);
      expect(find.text('Данные выгружены'), findsOneWidget);
      expect(tester.takeException(), null);
    },
  );
}
