import 'dart:convert';

import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';
import 'package:somna/logic/time.dart';

SleepNight night(String key, [double duration = 480]) => SleepNight(
  id: key,
  dateKey: key,
  bedtime: '23:30',
  wakeTime: '07:30',
  durationMin: duration,
  quality: 80,
  awakenings: 0,
);
MoodEntry mood(
  int day, [
  double valence = 0,
  int hour = 10,
  List<String> emotions = const ['Спокойствие'],
]) => MoodEntry(
  id: '$day-$hour',
  at: isoUtc(DateTime(2026, 11, day, hour)),
  valence: valence,
  emotions: emotions,
);
PracticeSession session(int day) => PracticeSession(
  id: '$day',
  at: isoUtc(DateTime(2026, 11, day, 10)),
  kind: 'grounding',
  min: 5,
);

class MemoryPersistence implements SomnaPersistence {
  String? raw;
  bool fail = false;
  int writes = 0;
  MemoryPersistence([this.raw]);
  factory MemoryPersistence.json(JsonMap data) =>
      MemoryPersistence(jsonEncode(data));
  JsonMap get json => jsonDecode(raw!) as JsonMap;
  @override
  String? read() => raw;
  @override
  Future<void> write(String serialized) async {
    if (fail) throw StateError('Quota exceeded');
    writes++;
    raw = serialized;
  }
}
