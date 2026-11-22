import '../ui/sheets.dart';
import 'cycles_sheet.dart';
import 'night_sheet.dart';
import 'sleep_sheet.dart';

/// The Sleep piece's sheets: entry form, cycle calculator and night detail.
void registerSleepSheets(SheetRegistry registry) {
  void add(String id, SomnaSheetBuilder builder) {
    if (!registry.contains(id)) registry.register(id, builder);
  }

  add('sleep', (context, arg) => const SleepSheet());
  add('cycles', (context, arg) => const CyclesSheet());
  add('night', (context, arg) => NightSheet(nightId: arg));
}
