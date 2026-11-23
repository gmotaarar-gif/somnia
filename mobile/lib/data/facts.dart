/// Short, sourced-in-spirit facts and tips shown across the app. Plain
/// wording, no medical claims beyond common sleep-hygiene guidance.
class SomnaFact {
  final String topic, title, text;
  final String? figure, unit;
  const SomnaFact({
    required this.topic,
    required this.title,
    required this.text,
    this.figure,
    this.unit,
  });
}

const somnaFacts = <SomnaFact>[
  SomnaFact(
    topic: 'sleep',
    title: 'Один цикл сна',
    text: 'Сон идёт волнами: лёгкая фаза, глубокая, затем быстрый сон. За ночь таких волн обычно четыре-шесть.',
    figure: '90',
    unit: 'мин',
  ),
  SomnaFact(
    topic: 'sleep',
    title: 'Норма для взрослых',
    text: 'Большинству взрослых нужно от семи до девяти часов. Важнее не рекорд, а одинаковое время подъёма.',
    figure: '7-9',
    unit: 'ч',
  ),
  SomnaFact(
    topic: 'sleep',
    title: 'Прохладная спальня',
    text: 'Телу проще уснуть, когда оно немного остывает. Комфортная температура для сна ниже, чем для дня.',
    figure: '17-20',
    unit: '°C',
  ),
  SomnaFact(
    topic: 'sleep',
    title: 'Кофеин держится долго',
    text: 'Половина выпитого кофеина остаётся в крови спустя несколько часов. Последняя чашка лучше до обеда.',
    figure: '5-6',
    unit: 'ч',
  ),
  SomnaFact(
    topic: 'mind',
    title: 'Настроение и сон связаны',
    text: 'После короткой ночи эмоции острее, а мелочи раздражают сильнее. Это не характер, это недосып.',
  ),
  SomnaFact(
    topic: 'mind',
    title: 'Назвать чувство',
    text: 'Когда мы называем эмоцию словами, её интенсивность заметно снижается. Поэтому чек-ин работает.',
  ),
  SomnaFact(
    topic: 'mind',
    title: 'Утренний свет',
    text: 'Десять минут дневного света утром сдвигают внутренние часы и помогают вечером уснуть вовремя.',
    figure: '10',
    unit: 'мин',
  ),
  SomnaFact(
    topic: 'habits',
    title: 'Экран перед сном',
    text: 'Дело не только в синем свете: лента держит мозг в режиме поиска. Отложите телефон за полчаса.',
    figure: '30',
    unit: 'мин',
  ),
  SomnaFact(
    topic: 'habits',
    title: 'Правило 20 минут',
    text: 'Не получается уснуть за 20 минут? Встаньте, займитесь чем-то спокойным при тусклом свете и вернитесь.',
    figure: '20',
    unit: 'мин',
  ),
  SomnaFact(
    topic: 'habits',
    title: 'Выходные без джетлага',
    text: 'Если в выходные вы встаёте на два часа позже, в понедельник тело живёт в другом часовом поясе.',
    figure: '±1',
    unit: 'ч',
  ),
];

/// The fact of the day: stable through the day, different tomorrow.
SomnaFact factOfDay(DateTime day, {String? topic}) {
  final pool = topic == null
      ? somnaFacts
      : somnaFacts.where((f) => f.topic == topic).toList();
  final n =
      DateTime.utc(day.year, day.month, day.day).millisecondsSinceEpoch ~/
      Duration.millisecondsPerDay;
  return pool[n % pool.length];
}

/// Recommended sleep by age group, hours (low, high).
const sleepByAge = <(String, double, double)>[
  ('Подростки', 8, 10),
  ('18-25', 7, 9),
  ('26-64', 7, 9),
  ('65+', 7, 8),
];

/// A typical night as a share of time in each stage, for the explainer.
const typicalStages = <(String, double)>[
  ('Лёгкий', .5),
  ('Глубокий', .2),
  ('Быстрый', .25),
  ('Бодрствование', .05),
];
