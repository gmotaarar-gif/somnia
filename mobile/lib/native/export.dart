import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../data/store.dart';
import '../logic/time.dart';

String exportJson(SomnaStore store, DateTime now) =>
    const JsonEncoder.withIndent('  ').convert({
      'exportedAt': isoUtc(now),
      'bedGoal': store.bedGoal,
      'wakeGoal': store.wakeGoal,
      'nights': store.nights.map((v) => v.toJson()).toList(),
      'moods': store.moods.map((v) => v.toJson()).toList(),
      'sessions': store.sessions.map((v) => v.toJson()).toList(),
      'worries': store.worries.map((v) => v.toJson()).toList(),
      'wellbeing': store.wellbeing.map((v) => v.toJson()).toList(),
    });

abstract interface class ExportTarget {
  Future<bool> share(String json);
}

class CacheShareTarget implements ExportTarget {
  @override
  Future<bool> share(String json) async {
    final directory = await getTemporaryDirectory();
    final file = await File('${directory.path}/somna-export.json')
        .writeAsString(json, flush: true);
    final result = await SharePlus.instance.share(
      ShareParams(
        title: 'Somna',
        subject: 'Экспорт данных',
        files: [XFile(file.path, mimeType: 'application/json')],
        fileNameOverrides: ['somna-export.json'],
      ),
    );
    return result.status == ShareResultStatus.success;
  }
}

class DataExporter {
  final ExportTarget target;
  final DateTime Function() now;
  DataExporter(this.target, {DateTime Function()? now})
    : now = now ?? DateTime.now;
  Future<bool> export(SomnaStore store) async {
    try {
      if (!await target.share(exportJson(store, now()))) {
        throw StateError('Share cancelled');
      }
      store.notify('Данные выгружены');
      return true;
    } catch (_) {
      store.notify('Не удалось выгрузить данные');
      return false;
    }
  }
}
