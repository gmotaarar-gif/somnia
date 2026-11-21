import 'dart:math' as math;

/// JavaScript Math.round rounds negative halves toward positive infinity.
int jsRound(num value) => (value + 0.5).floor();

int timeToMinutes(String hhmm) {
  final parts = hhmm.split(':');
  final h = int.parse(parts[0].isEmpty ? '0' : parts[0]);
  final m = parts.length > 1 ? int.parse(parts[1].isEmpty ? '0' : parts[1]) : 0;
  return (h.remainder(24) * 60 + m.remainder(60)) % 1440;
}

String minutesToTime(num min) {
  final t = jsRound(min) % 1440;
  return '${(t ~/ 60).toString().padLeft(2, '0')}:${(t % 60).toString().padLeft(2, '0')}';
}

String shiftTime(String hhmm, num deltaMin) =>
    minutesToTime(timeToMinutes(hhmm) + deltaMin);
int spanMinutes(String bed, String wake) {
  var d = timeToMinutes(wake) - timeToMinutes(bed);
  if (d <= 0) d += 1440;
  return d;
}

int deviationMinutes(String time, String goal) {
  var d = timeToMinutes(time) - timeToMinutes(goal);
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  return d;
}

String dateKey(DateTime date) {
  final d = date.toLocal();
  return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

DateTime daysAgo(int n, [DateTime? from]) {
  final d = (from ?? DateTime.now()).toLocal();
  return DateTime(d.year, d.month, d.day - n, 12);
}

DateTime parseKey(String key) {
  final parts = key.split('-').map(int.parse).toList();
  return DateTime(
    parts[0],
    parts.length > 1 ? parts[1] : 1,
    parts.length > 2 ? parts[2] : 1,
    12,
  );
}

const _weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const _months = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const _shortMonths = [
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
String weekdayShort(DateTime d) => _weekdays[d.toLocal().weekday - 1];
String dayMonth(DateTime date) {
  final d = date.toLocal();
  return '${d.day} ${_months[d.month - 1]}';
}

String dayMonthShort(DateTime date) {
  final d = date.toLocal();
  return '${d.day} ${_shortMonths[d.month - 1]}';
}

String relativeDay(String key, [DateTime? now]) {
  final at = now ?? DateTime.now();
  if (key == dateKey(at)) return 'Сегодня';
  if (key == dateKey(daysAgo(1, at))) return 'Вчера';
  final d = parseKey(key);
  return '${weekdayShort(d)}, ${dayMonthShort(d)}';
}

String clockOf(String iso) {
  final d = DateTime.parse(iso).toLocal();
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

String hm(num min) {
  final t = math.max(0, jsRound(min));
  return '${t ~/ 60}:${(t % 60).toString().padLeft(2, '0')}';
}

String durationRu(num min) {
  final t = math.max(0, jsRound(min));
  final h = t ~/ 60, m = t % 60;
  if (h == 0) return '$m мин';
  return m != 0 ? '$h ч $m мин' : '$h ч';
}

String pluralRu(num n, List<String> forms) {
  final a = n.abs() % 100, b = n.abs() % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b == 1) return forms[0];
  return forms[2];
}

String greeting([DateTime? date]) {
  final h = (date ?? DateTime.now()).toLocal().hour;
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 17) return 'Добрый день';
  if (h >= 17 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

String isoUtc(DateTime date) => date.toUtc().toIso8601String();
