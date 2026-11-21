import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/store.dart';
import 'package:somna/native/export.dart';

class FakeExportTarget implements ExportTarget {
  bool success = true, fails = false;
  String? json;
  @override
  Future<bool> share(String json) async {
    this.json = json;
    if (fails) throw StateError('disk/share error');
    return success;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late SomnaStore store;
  late FakeExportTarget target;
  late DataExporter exporter;
  setUp(() {
    store = SomnaStore(initialState: defaultState(), autoRefresh: false);
    target = FakeExportTarget();
    exporter = DataExporter(target, now: () => DateTime.utc(2030, 1, 2));
  });
  tearDown(() => store.dispose());
  test(
    'same web subset and timestamp, omits account/settings/membership',
    () async {
      expect(await exporter.export(store), true);
      final json = jsonDecode(target.json!) as Map;
      expect(json.keys.toSet(), {
        'exportedAt',
        'bedGoal',
        'wakeGoal',
        'nights',
        'moods',
        'sessions',
        'worries',
        'wellbeing',
      });
      expect(json['exportedAt'], '2030-01-02T00:00:00.000Z');
      expect(json['nights'], store.nights.map((n) => n.toJson()).toList());
      expect(store.toast?.text, 'Данные выгружены');
    },
  );
  test('empty journals serialize as arrays', () {
    store.patch({
      'nights': [],
      'moods': [],
      'sessions': [],
      'worries': [],
      'wellbeing': [],
    });
    final json = jsonDecode(exportJson(store, DateTime.utc(2030)));
    for (final key in ['nights', 'moods', 'sessions', 'worries', 'wellbeing']) {
      expect(json[key], isEmpty);
    }
  });
  test(
    'dismissed share and file/share failures show same web failure toast',
    () async {
      target.success = false;
      expect(await exporter.export(store), false);
      expect(store.toast?.text, 'Не удалось выгрузить данные');
      target.fails = true;
      expect(await exporter.export(store), false);
      expect(store.toast?.text, 'Не удалось выгрузить данные');
    },
  );
}
