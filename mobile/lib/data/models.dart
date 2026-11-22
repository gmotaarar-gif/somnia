typedef JsonMap = Map<String, dynamic>;
typedef Clock = DateTime Function();
typedef TabId = String;
typedef SheetId = String;
typedef Tone = String;
typedef Chronotype = String;
typedef ThemeMode = String;
typedef WidgetKind = String;
typedef WidgetSize = String;
typedef PracticeKind = String;
typedef SubscriptionPlan = String;

List<String> strings(dynamic value) => (value as List).cast<String>();
double number(dynamic value) => (value as num).toDouble();

class SleepNight {
  final String id, dateKey, bedtime, wakeTime;
  final double durationMin, quality;
  final int awakenings;
  final List<String> tags;
  final String? note;
  const SleepNight({
    this.id = '',
    required this.dateKey,
    required this.bedtime,
    required this.wakeTime,
    required this.durationMin,
    required this.quality,
    required this.awakenings,
    this.tags = const [],
    this.note,
  });
  factory SleepNight.fromJson(JsonMap j) => SleepNight(
    id: j['id'] ?? '',
    dateKey: j['dateKey'],
    bedtime: j['bedtime'],
    wakeTime: j['wakeTime'],
    durationMin: number(j['durationMin']),
    quality: number(j['quality']),
    awakenings: (j['awakenings'] as num).toInt(),
    tags: strings(j['tags']),
    note: j['note'],
  );
  JsonMap toJson() => {
    'id': id,
    'dateKey': dateKey,
    'bedtime': bedtime,
    'wakeTime': wakeTime,
    'durationMin': durationMin,
    'quality': quality,
    'awakenings': awakenings,
    'tags': tags,
    if (note != null) 'note': note,
  };
  SleepNight copyWith({
    String? id,
    String? dateKey,
    String? bedtime,
    String? wakeTime,
    double? durationMin,
    double? quality,
    int? awakenings,
    List<String>? tags,
  }) => SleepNight.fromJson({
    ...toJson(),
    'id': ?id,
    'dateKey': ?dateKey,
    'bedtime': ?bedtime,
    'wakeTime': ?wakeTime,
    'durationMin': ?durationMin,
    'quality': ?quality,
    'awakenings': ?awakenings,
    'tags': ?tags,
  });
}

class MoodEntry {
  final String id, at;
  final double valence;
  final List<String> emotions, factors;
  final String? note;
  const MoodEntry({
    this.id = '',
    this.at = '',
    required this.valence,
    this.emotions = const [],
    this.factors = const [],
    this.note,
  });
  factory MoodEntry.fromJson(JsonMap j) => MoodEntry(
    id: j['id'] ?? '',
    at: j['at'] ?? '',
    valence: number(j['valence']),
    emotions: strings(j['emotions']),
    factors: strings(j['factors']),
    note: j['note'],
  );
  JsonMap toJson() => {
    'id': id,
    'at': at,
    'valence': valence,
    'emotions': emotions,
    'factors': factors,
    if (note != null) 'note': note,
  };
  MoodEntry stamped(String id, String at) =>
      MoodEntry.fromJson({...toJson(), 'id': id, 'at': at});
}

class PracticeSession {
  final String id, at;
  // Legacy "breath" sessions remain valid for earned minutes.
  final PracticeKind kind;
  final double min;
  const PracticeSession({
    required this.id,
    required this.at,
    required this.kind,
    required this.min,
  });
  factory PracticeSession.fromJson(JsonMap j) => PracticeSession(
    id: j['id'],
    at: j['at'],
    kind: j['kind'],
    min: number(j['min']),
  );
  JsonMap toJson() => {'id': id, 'at': at, 'kind': kind, 'min': min};
}

class Worry {
  final String id, at, text, plan;
  final bool done;
  const Worry({
    required this.id,
    required this.at,
    required this.text,
    required this.plan,
    this.done = false,
  });
  factory Worry.fromJson(JsonMap j) => Worry(
    id: j['id'],
    at: j['at'],
    text: j['text'],
    plan: j['plan'],
    done: j['done'],
  );
  JsonMap toJson() => {
    'id': id,
    'at': at,
    'text': text,
    'plan': plan,
    'done': done,
  };
  Worry copyWith({bool? done}) =>
      Worry(id: id, at: at, text: text, plan: plan, done: done ?? this.done);
}

class WellbeingResult {
  final String at;
  final double score;
  const WellbeingResult({required this.at, required this.score});
  factory WellbeingResult.fromJson(JsonMap j) =>
      WellbeingResult(at: j['at'], score: number(j['score']));
  JsonMap toJson() => {'at': at, 'score': score};
}

class WeeklyGoal {
  final String id, text;
  const WeeklyGoal({required this.id, required this.text});
  factory WeeklyGoal.fromJson(JsonMap j) =>
      WeeklyGoal(id: j['id'], text: j['text']);
  JsonMap toJson() => {'id': id, 'text': text};
}

class SomnaWidget {
  final String id;
  final WidgetKind kind;
  final WidgetSize size;
  final Tone tone;
  final bool visible;
  final String? title, unit, day;
  final double? target, step, value;
  const SomnaWidget({
    required this.id,
    required this.kind,
    required this.size,
    required this.tone,
    required this.visible,
    this.title,
    this.unit,
    this.day,
    this.target,
    this.step,
    this.value,
  });
  factory SomnaWidget.fromJson(JsonMap j) => SomnaWidget(
    id: j['id'],
    kind: j['kind'],
    size: j['size'],
    tone: j['tone'],
    visible: j['visible'],
    title: j['title'],
    unit: j['unit'],
    day: j['day'],
    target: (j['target'] as num?)?.toDouble(),
    step: (j['step'] as num?)?.toDouble(),
    value: (j['value'] as num?)?.toDouble(),
  );
  JsonMap toJson() => {
    'id': id,
    'kind': kind,
    'size': size,
    'tone': tone,
    'visible': visible,
    if (title != null) 'title': title,
    if (unit != null) 'unit': unit,
    if (day != null) 'day': day,
    if (target != null) 'target': target,
    if (step != null) 'step': step,
    if (value != null) 'value': value,
  };
  SomnaWidget copyWith({
    String? id,
    WidgetSize? size,
    Tone? tone,
    bool? visible,
    String? title,
    String? unit,
    String? day,
    double? target,
    double? step,
    double? value,
  }) => SomnaWidget.fromJson({
    ...toJson(),
    'id': ?id,
    'size': ?size,
    'tone': ?tone,
    'visible': ?visible,
    'title': ?title,
    'unit': ?unit,
    'day': ?day,
    'target': ?target,
    'step': ?step,
    'value': ?value,
  });
}

class SpectrumAxis {
  final String id, left, right;
  final double value;
  const SpectrumAxis({
    required this.id,
    required this.left,
    required this.right,
    required this.value,
  });
  factory SpectrumAxis.fromJson(JsonMap j) => SpectrumAxis(
    id: j['id'],
    left: j['left'],
    right: j['right'],
    value: number(j['value']),
  );
  JsonMap toJson() => {'id': id, 'left': left, 'right': right, 'value': value};
}

class Ritual {
  final String day;
  final List<String> done;
  const Ritual({required this.day, this.done = const []});
  factory Ritual.fromJson(JsonMap j) =>
      Ritual(day: j['day'], done: strings(j['done']));
  JsonMap toJson() => {'day': day, 'done': done};
}

class Water {
  final String day;
  final double ml;
  const Water({required this.day, required this.ml});
  factory Water.fromJson(JsonMap j) =>
      Water(day: j['day'], ml: number(j['ml']));
  JsonMap toJson() => {'day': day, 'ml': ml};
}

class LocalAccount {
  final String email, createdAt;
  const LocalAccount({required this.email, required this.createdAt});
  factory LocalAccount.fromJson(JsonMap j) =>
      LocalAccount(email: j['email'], createdAt: j['createdAt']);
  JsonMap toJson() => {'email': email, 'createdAt': createdAt};
}

class RegistrationInput {
  final String name, email;
  const RegistrationInput({required this.name, required this.email});
  factory RegistrationInput.fromJson(JsonMap j) =>
      RegistrationInput(name: j['name'], email: j['email']);
  JsonMap toJson() => {'name': name, 'email': email};
}

class Membership {
  final SubscriptionPlan plan;
  final String startedAt, endsAt;
  const Membership({
    required this.plan,
    required this.startedAt,
    required this.endsAt,
  });
  factory Membership.fromJson(JsonMap j) => Membership(
    plan: j['plan'],
    startedAt: j['startedAt'],
    endsAt: j['endsAt'],
  );
  JsonMap toJson() => {'plan': plan, 'startedAt': startedAt, 'endsAt': endsAt};
}

enum ToastVariant { success, error }

class SomnaToast {
  final int id;
  final String text;
  final ToastVariant variant;
  const SomnaToast({
    required this.id,
    required this.text,
    this.variant = ToastVariant.success,
  });
  factory SomnaToast.fromJson(JsonMap j) => SomnaToast(
    id: j['id'],
    text: j['text'],
    variant: j['variant'] == 'error'
        ? ToastVariant.error
        : ToastVariant.success,
  );
  JsonMap toJson() => {'id': id, 'text': text, 'variant': variant.name};
}

/// Flat web state fields; membership is the native envelope's only extra field.
class SomnaState {
  final bool onboarded, reminder, morningReminder, eveningMode;
  final String userName, bedGoal, wakeGoal, reminderTime, morningReminderTime;
  final ThemeMode theme;
  final Chronotype chronotype;
  final LocalAccount? localAccount;
  final Membership? membership;
  final double volume;
  final int soundTimer, layout;
  final List<String> focus, readArticles;
  final Ritual ritual;
  final Water water;
  final List<SleepNight> nights;
  final List<MoodEntry> moods;
  final List<SpectrumAxis> spectrum;
  final List<SomnaWidget> widgets;
  final WeeklyGoal? weeklyGoal;
  final List<PracticeSession> sessions;
  final List<Worry> worries;
  final List<WellbeingResult> wellbeing;
  const SomnaState({
    required this.onboarded,
    required this.userName,
    this.localAccount,
    this.membership,
    required this.chronotype,
    required this.theme,
    required this.bedGoal,
    required this.wakeGoal,
    required this.reminder,
    required this.reminderTime,
    required this.morningReminder,
    required this.morningReminderTime,
    required this.focus,
    required this.ritual,
    required this.water,
    required this.eveningMode,
    required this.volume,
    required this.nights,
    required this.moods,
    required this.spectrum,
    required this.widgets,
    this.weeklyGoal,
    required this.sessions,
    required this.worries,
    required this.readArticles,
    required this.wellbeing,
    required this.soundTimer,
    required this.layout,
  });
  factory SomnaState.fromJson(JsonMap j) => SomnaState(
    onboarded: j['onboarded'],
    userName: j['userName'],
    localAccount: j['localAccount'] == null
        ? null
        : LocalAccount.fromJson(j['localAccount']),
    membership: j['membership'] == null
        ? null
        : Membership.fromJson(j['membership']),
    chronotype: j['chronotype'],
    theme: j['theme'],
    bedGoal: j['bedGoal'],
    wakeGoal: j['wakeGoal'],
    reminder: j['reminder'],
    reminderTime: j['reminderTime'],
    morningReminder: j['morningReminder'],
    morningReminderTime: j['morningReminderTime'],
    focus: strings(j['focus']),
    ritual: Ritual.fromJson(j['ritual']),
    water: Water.fromJson(j['water']),
    eveningMode: j['eveningMode'],
    volume: number(j['volume']),
    nights: (j['nights'] as List).map((v) => SleepNight.fromJson(v)).toList(),
    moods: (j['moods'] as List).map((v) => MoodEntry.fromJson(v)).toList(),
    spectrum: (j['spectrum'] as List)
        .map((v) => SpectrumAxis.fromJson(v))
        .toList(),
    widgets: (j['widgets'] as List)
        .map((v) => SomnaWidget.fromJson(v))
        .toList(),
    weeklyGoal: j['weeklyGoal'] == null
        ? null
        : WeeklyGoal.fromJson(j['weeklyGoal']),
    sessions: (j['sessions'] as List)
        .map((v) => PracticeSession.fromJson(v))
        .toList(),
    worries: (j['worries'] as List).map((v) => Worry.fromJson(v)).toList(),
    readArticles: strings(j['readArticles']),
    wellbeing: (j['wellbeing'] as List)
        .map((v) => WellbeingResult.fromJson(v))
        .toList(),
    soundTimer: (j['soundTimer'] as num).toInt(),
    layout: (j['layout'] as num).toInt(),
  );
  JsonMap toJson() => {
    'onboarded': onboarded,
    'userName': userName,
    'localAccount': localAccount?.toJson(),
    'membership': membership?.toJson(),
    'chronotype': chronotype,
    'theme': theme,
    'bedGoal': bedGoal,
    'wakeGoal': wakeGoal,
    'reminder': reminder,
    'reminderTime': reminderTime,
    'morningReminder': morningReminder,
    'morningReminderTime': morningReminderTime,
    'focus': focus,
    'ritual': ritual.toJson(),
    'water': water.toJson(),
    'eveningMode': eveningMode,
    'volume': volume,
    'nights': nights.map((v) => v.toJson()).toList(),
    'moods': moods.map((v) => v.toJson()).toList(),
    'spectrum': spectrum.map((v) => v.toJson()).toList(),
    'widgets': widgets.map((v) => v.toJson()).toList(),
    'weeklyGoal': weeklyGoal?.toJson(),
    'sessions': sessions.map((v) => v.toJson()).toList(),
    'worries': worries.map((v) => v.toJson()).toList(),
    'readArticles': readArticles,
    'wellbeing': wellbeing.map((v) => v.toJson()).toList(),
    'soundTimer': soundTimer,
    'layout': layout,
  };
  SomnaState patch(JsonMap changes) =>
      SomnaState.fromJson({...toJson(), ...changes});
}
