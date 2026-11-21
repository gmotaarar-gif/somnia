import 'package:flutter_test/flutter_test.dart';
import 'package:somna/logic/time.dart';

void main() {
  test(
    'converts clock time into minutes',
    () => expect(timeToMinutes('07:05'), 425),
  );
  for (final row in [('23:30', '07:15', 465), ('01:30', '08:15', 405)]) {
    test(
      'overnight duration ${row.$1}',
      () => expect(spanMinutes(row.$1, row.$2), row.$3),
    );
  }
  for (final row in [('00:15', '23:45', 30), ('23:45', '00:15', -30)]) {
    test(
      'signed deviation ${row.$1}',
      () => expect(deviationMinutes(row.$1, row.$2), row.$3),
    );
  }
  test('uses local calendar day and padding', () {
    expect(dateKey(DateTime(2027, 1, 2, 0, 5)), '2027-01-02');
    expect(dateKey(DateTime(2027, 1, 2, 23, 55)), '2027-01-02');
  });
  test('relative labels move after midnight', () {
    expect(relativeDay('2027-01-02', DateTime(2027, 1, 2, 23, 59)), 'Сегодня');
    expect(relativeDay('2027-01-02', DateTime(2027, 1, 3, 0, 1)), 'Вчера');
    expect(relativeDay('2027-01-02', DateTime(2027, 1, 4, 0, 1)), 'Сб, 2 янв');
  });
  test('wraps, rounds like JS, and formats durations', () {
    expect(timeToMinutes('-1:30'), 1410);
    expect(timeToMinutes(''), 0);
    expect(minutesToTime(-1), '23:59');
    expect(minutesToTime(-0.5), '00:00');
    expect(shiftTime('23:50', 30), '00:20');
    expect(spanMinutes('08:00', '08:00'), 1440);
    expect(hm(462), '7:42');
    expect(hm(-3), '0:00');
    expect(durationRu(462), '7 ч 42 мин');
    expect(durationRu(420), '7 ч');
    expect(durationRu(12), '12 мин');
    expect(durationRu(-1), '0 мин');
  });
  test('Russian calendar formatting matches Intl ru-RU', () {
    const months = [
      'янв',
      'февр',
      'мар',
      'апр',
      'мая',
      'июн',
      'июл',
      'авг',
      'сент',
      'окт',
      'нояб',
      'дек',
    ];
    for (var i = 0; i < 12; i++) {
      expect(dayMonthShort(DateTime(2027, i + 1, 2)), '2 ${months[i]}');
    }
    expect(dayMonth(DateTime(2027, 1, 2)), '2 января');
    expect(dateKey(parseKey('2027-01-02')), '2027-01-02');
    expect(daysAgo(1, DateTime(2027, 1, 1, 0, 1)), DateTime(2026, 12, 31, 12));
    expect(clockOf(DateTime(2027, 1, 2, 7, 5).toIso8601String()), '07:05');
  });
  test('Russian plurals and greeting boundaries', () {
    const forms = ['пункт', 'пункта', 'пунктов'];
    for (final n in [1, 21, -31]) {
      expect(pluralRu(n, forms), 'пункт');
    }
    for (final n in [2, 4, 22]) {
      expect(pluralRu(n, forms), 'пункта');
    }
    for (final n in [0, 5, 11, 12, 14, 20]) {
      expect(pluralRu(n, forms), 'пунктов');
    }
    expect(greeting(DateTime(2027, 1, 2, 5)), 'Доброе утро');
    expect(greeting(DateTime(2027, 1, 2, 12)), 'Добрый день');
    expect(greeting(DateTime(2027, 1, 2, 17)), 'Добрый вечер');
    expect(greeting(DateTime(2027, 1, 2, 23)), 'Доброй ночи');
  });
}
