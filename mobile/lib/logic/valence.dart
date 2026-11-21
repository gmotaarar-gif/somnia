import 'time.dart';

typedef RGB = List<int>;

class ValencePalette {
  final RGB outer, mid, core;
  const ValencePalette({
    required this.outer,
    required this.mid,
    required this.core,
  });
}

const _stops = <(double, RGB, RGB, RGB)>[
  (-1.0, [98, 46, 215], [139, 92, 246], [224, 204, 255]),
  (-0.45, [37, 99, 235], [56, 189, 248], [224, 242, 254]),
  (0.0, [20, 148, 138], [52, 211, 153], [236, 253, 245]),
  (0.42, [95, 168, 48], [154, 230, 82], [252, 255, 240]),
  (1.0, [234, 118, 28], [251, 191, 36], [255, 253, 235]),
];
ValencePalette sampleValencePalette(num valence) {
  final v = valence.clamp(-1, 1).toDouble();
  var i = 0;
  while (i < _stops.length - 2 && _stops[i + 1].$1 < v) {
    i++;
  }
  final s0 = _stops[i], s1 = _stops[i + 1];
  final t = (v - s0.$1) / (s1.$1 - s0.$1).clamp(0.0001, double.infinity);
  RGB mix(RGB a, RGB b) =>
      List.generate(3, (i) => jsRound(a[i] + (b[i] - a[i]) * t));
  return ValencePalette(
    outer: mix(s0.$2, s1.$2),
    mid: mix(s0.$3, s1.$3),
    core: mix(s0.$4, s1.$4),
  );
}

String getValenceLabel(num v) {
  if (v <= -0.72) return 'Очень неприятно';
  if (v <= -0.38) return 'Неприятно';
  if (v <= -0.12) return 'Слегка неприятно';
  if (v < 0.14) return 'Нейтрально';
  if (v < 0.48) return 'Слегка приятно';
  if (v < 0.78) return 'Приятно';
  return 'Очень приятно';
}
