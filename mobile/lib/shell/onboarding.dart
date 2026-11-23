import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/defaults.dart';
import '../data/models.dart';
import '../data/store.dart';
import '../logic/features.dart';
import '../logic/metrics.dart';
import '../logic/onboarding.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../theme/tokens.dart';
import '../ui/charts/charts.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import '../ui/buddies.dart';
import '../ui/glow.dart';
import '../ui/mood_orb.dart';
import 'aurora.dart';
import 'onboarding_story.dart';
import 'onboarding_controls.dart';
import 'onboarding_widgets.dart';

/// Sheet opened after "Создать профиль"; the account piece registers it.
const registrationSheetId = 'registration';

const _focus = <(String, IconData)>[
  ('Стабильный подъём', Icons.wb_twilight_outlined),
  ('Быстрее засыпать', Icons.bedtime_outlined),
  ('Снять вечерний стресс', Icons.spa_outlined),
  ('Больше энергии утром', Icons.bolt_outlined),
  ('Понять своё настроение', Icons.psychology_outlined),
  ('Меньше экрана ночью', Icons.smartphone_outlined),
];
const _chrono = <(Chronotype, String, String, String)>[
  ('early', 'Жаворонок', '22:30', '06:30'),
  ('balanced', 'Голубь', '23:30', '07:30'),
  ('night', 'Сова', '00:30', '08:30'),
];
const _tired = ['Редко', 'Иногда', 'Часто', 'Почти всегда'];
const _starter = [
  'w-streak',
  'w-evening',
  'w-water',
  'w-cycle',
  'w-rhythm',
  'w-debt',
  'w-wellbeing',
];
const _build = [
  'Считаем цель сна',
  'Подбираем окно отбоя',
  'Собираем главный экран',
  'Настраиваем напоминание',
];
const _steps = 9, _buildingStep = 7;
const _onCard = Color.fromRGBO(255, 255, 255, .64);

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  SomnaStore? _store;
  late final TextEditingController _name;
  late List<String> _goals, _picked;
  late Chronotype _chronotype;
  late String _bedGoal, _wakeGoal, _reminderTime;
  late bool _reminder;
  int _step = 0, _dir = 1, _tiredness = 1;
  double _hours = 6.5, _valence = .3;
  bool _moodAnswered = false, _finishing = false;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_store != null) return;
    final store = _store = SomnaScope.of(context);
    _name = TextEditingController(text: store.userName);
    _goals = [...store.focus];
    _chronotype = store.chronotype;
    _bedGoal = store.bedGoal;
    _wakeGoal = store.wakeGoal;
    _reminder = store.reminder;
    _reminderTime = store.reminderTime;
    _picked = [
      for (final id in _starter)
        if (store.widgets.any((w) => w.id == id && w.visible)) id,
    ];
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  String get _userName => _name.text.trim();
  int get _target => spanMinutes(_bedGoal, _wakeGoal);
  bool get _canNext => _step != 1 || _userName.isNotEmpty;
  bool get _registered => _store!.localAccount != null;

  void _go(int d) {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _dir = d;
      _step += d;
      _error = null;
    });
  }

  void _skip() {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _dir = 1;
      _step = _buildingStep;
    });
  }

  void _pickChronotype(Chronotype value) {
    final preset = _chrono.firstWhere((c) => c.$1 == value);
    setState(() {
      _chronotype = value;
      _bedGoal = preset.$3;
      _wakeGoal = preset.$4;
      _reminderTime = shiftTime(preset.$3, -60);
    });
  }

  Future<void> _finish({required bool register}) async {
    if (_finishing) return;
    setState(() {
      _finishing = true;
      _error = null;
    });
    final store = _store!, name = _userName;
    try {
      final granted = await store.finishOnboarding({
        'userName': name,
        'focus': _goals,
        'chronotype': _chronotype,
        'bedGoal': _bedGoal,
        'wakeGoal': _wakeGoal,
        'reminder': _reminder,
        'reminderTime': _reminderTime,
        'widgets': onboardingWidgets(
          store.widgets,
          _picked,
        ).map((w) => w.toJson()).toList(),
      });
      if (_moodAnswered) store.addMood(MoodEntry(valence: _valence));
      if (granted) {
        store.notify(
          name.isEmpty ? 'Добро пожаловать!' : 'Добро пожаловать, $name',
        );
      }
      if (register) store.openSheet(registrationSheetId);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _finishing = false;
        _error = 'Не удалось начать. Попробуйте ещё раз.';
      });
    }
  }

  void _next() {
    if (_step == _steps - 1) {
      _finish(register: !_registered);
      return;
    }
    if (_step == 5) _moodAnswered = true;
    _go(1);
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final building = _step == _buildingStep, last = _step == _steps - 1;
    return PopScope(
      canPop: _step == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !building && !_finishing) _go(-1);
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            const Positioned.fill(child: Aurora(tab: 'onboarding')),
            SafeArea(
              minimum: const EdgeInsets.only(top: 18, bottom: 24),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _header(c, building),
                    if (!building && _step > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: AnimatedSwitcher(
                          duration: MediaQuery.disableAnimationsOf(context)
                              ? Duration.zero
                              : SomnaMotion.medium,
                          switchInCurve: SomnaMotion.smooth,
                          transitionBuilder: (child, a) => FadeTransition(
                            opacity: a,
                            child: ScaleTransition(
                              scale: Tween(begin: .96, end: 1.0).animate(a),
                              alignment: Alignment.centerLeft,
                              child: child,
                            ),
                          ),
                          child: BuddyTip(
                            key: ValueKey(_step),
                            kind: stepBuddies[_step % stepBuddies.length],
                            size: 44,
                            text: stepLines[_step % stepLines.length],
                          ),
                        ),
                      ),
                    Expanded(
                      child: _StepSwitcher(
                        step: _step,
                        dir: _dir,
                        builder: _stepBody,
                      ),
                    ),
                    if (!building) ...[
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: c.danger),
                          ),
                        ),
                      SizedBox(height: _error == null ? 28 : 12),
                      ActionPill(
                        glow: stepGlows[_step % stepGlows.length],
                        label: _step == 0
                            ? 'Начать'
                            : !last
                            ? 'Далее'
                            : _registered
                            ? 'Открыть Somna'
                            : 'Создать профиль',
                        onPressed: _canNext && !_finishing ? _next : null,
                      ),
                      if (last && !_registered) ...[
                        const SizedBox(height: 8),
                        SomnaButton(
                          ghost: true,
                          label: 'Продолжить без регистрации',
                          onPressed: _finishing
                              ? null
                              : () => _finish(register: false),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header(SomnaColors c, bool building) {
    final reduce = MediaQuery.disableAnimationsOf(context);
    return AnimatedOpacity(
      opacity: building ? 0 : 1,
      duration: reduce ? Duration.zero : SomnaMotion.fast,
      child: IgnorePointer(
        ignoring: building,
        child: SizedBox(
          height: 44,
          child: Row(
            children: [
              Visibility(
                visible: _step > 0,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: PressScale(
                  label: 'Назад',
                  onPressed: () => _go(-1),
                  child: const GlassSurface(
                    radius: 22,
                    child: SizedBox.square(
                      dimension: 44,
                      child: Icon(Icons.arrow_back_rounded, size: 18),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Semantics(
                  container: true,
                  label: 'Шаг ${_step + 1} из $_steps',
                  child: StepLeds(step: _step, count: _steps),
                ),
              ),
              const SizedBox(width: 16),
              Visibility(
                visible: _step > 0 && _step < _buildingStep,
                maintainSize: true,
                maintainAnimation: true,
                maintainState: true,
                child: PressScale(
                  onPressed: _skip,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 44),
                    height: 44,
                    alignment: Alignment.centerRight,
                    child: Text(
                      'Позже',
                      style: TextStyle(fontSize: 13, color: c.ink3),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stepBody(BuildContext context, int step) => switch (step) {
    0 => _intro(context),
    1 => _nameStep(context),
    2 => _goalsStep(context),
    3 => _sleepStep(context),
    4 => _scheduleStep(context),
    5 => _moodStep(context),
    6 => _widgetsStep(context),
    7 => _Building(
      onDone: () {
        if (!mounted || _step != _buildingStep) return;
        setState(() {
          _dir = 1;
          _step = _buildingStep + 1;
        });
      },
    ),
    _ => _planStep(context),
  };

  Widget _intro(BuildContext context) => Column(
    children: [
      const IntroStory(),
      const SizedBox(height: 32),
      ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 270),
        child: const BlurWords(
          text: 'Сон и состояние в одном ритме',
          distance: 24,
          style: TextStyle(
            fontSize: 34,
            height: 1.05,
            fontWeight: FontWeight.w500,
            letterSpacing: -1.36,
          ),
        ),
      ),
      const SizedBox(height: 16),
      ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 300),
        child: Text(
          'Минута утром и 20 секунд вечером. '
          'Somna покажет, как ночи меняют ваши дни.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            height: 1.625,
            color: SomnaColors.of(context).ink2,
          ),
        ),
      ),
    ],
  );

  Widget _nameStep(BuildContext context) {
    final c = SomnaColors.of(context);
    final letter = _userName.isEmpty
        ? '?'
        : _userName.characters.first.toUpperCase();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Title(
          'Как к вам обращаться?',
          'Имя останется только на этом устройстве.',
        ),
        const SizedBox(height: 32),
        Row(
          children: [
            ExcludeSemantics(
              child: AnimatedSwitcher(
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : SomnaMotion.medium,
                switchInCurve: SomnaMotion.bounce,
                transitionBuilder: (child, animation) => FadeTransition(
                  opacity: animation,
                  child: ScaleTransition(
                    scale: Tween(begin: .7, end: 1.0).animate(animation),
                    child: child,
                  ),
                ),
                child: Container(
                  key: ValueKey(_userName.isEmpty ? '' : letter),
                  width: 64,
                  height: 64,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.ink,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    letter,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w500,
                      color: onInk(context),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: GlassSurface(
                radius: 32,
                child: SizedBox(
                  height: 64,
                  child: Center(
                    child: TextField(
                      controller: _name,
                      autofocus: true,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      inputFormatters: [LengthLimitingTextInputFormatter(20)],
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) {
                        if (_canNext) _go(1);
                      },
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -.44,
                        color: c.ink,
                      ),
                      decoration: InputDecoration(
                        isCollapsed: true,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 24,
                        ),
                        hintText: 'Ваше имя',
                        hintStyle: TextStyle(color: c.ink3),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _goalsStep(BuildContext context) {
    final c = SomnaColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Title(
          'Что хотите улучшить?',
          'Выберите до трёх целей: под них подберём советы.',
        ),
        const SizedBox(height: 28),
        GridView(
          shrinkWrap: true,
          padding: EdgeInsets.zero,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisExtent: 104,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
          ),
          children: [
            for (final (i, (id, icon)) in _focus.indexed)
              () {
                final on = _goals.contains(id);
                final fg = on ? onInk(context) : c.ink;
                return _Appear(
                  delay: Duration(milliseconds: 50 * i),
                  offset: const Offset(0, 14),
                  child: PressScale(
                    label: id,
                    selected: on,
                    onPressed: () => setState(() {
                      if (on) {
                        _goals.remove(id);
                      } else if (_goals.length < 3) {
                        _goals.add(id);
                      }
                    }),
                    child: AnimatedContainer(
                      duration: SomnaMotion.fast,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: on ? c.ink : c.glass,
                        borderRadius: BorderRadius.circular(26),
                        border: Border.all(color: on ? c.ink : c.glassEdge),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Icon(icon, size: 20, color: fg),
                              AnimatedOpacity(
                                opacity: on ? 1 : 0,
                                duration: SomnaMotion.fast,
                                child: Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    color: onInk(context),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.check_rounded,
                                    size: 13,
                                    color: c.ink,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Flexible(
                            child: Text(
                              id,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.25,
                                fontWeight: FontWeight.w500,
                                color: fg,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }(),
          ],
        ),
      ],
    );
  }

  Widget _sleepStep(BuildContext context) {
    final c = SomnaColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Title(
          'Как вы спите сейчас?',
          'Отсюда посчитаем, сколько сна можно вернуть.',
        ),
        const SizedBox(height: 28),
        SomnaCard(
          tone: 'night',
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'В среднем за ночь',
                style: TextStyle(fontSize: 12, color: _onCard),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Dots(value: hm(_hours * 60), size: 56, square: true),
                  const SizedBox(width: 8),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Text(
                      'ч',
                      style: TextStyle(fontSize: 13, color: _onCard),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              LensRuler(
                label: 'Сколько часов вы спите',
                min: 4,
                max: 10,
                step: .5,
                value: _hours,
                onChanged: (v) => setState(() => _hours = v),
                format: _hoursLabel,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Icon(Icons.battery_charging_full_rounded, size: 16, color: c.ink3),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                'Просыпаетесь разбитым',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: c.ink3,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, label) in _tired.indexed) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: PressScale(
                    label: label,
                    selected: _tiredness == i,
                    onPressed: () => setState(() => _tiredness = i),
                    child: AnimatedContainer(
                      duration: SomnaMotion.fast,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: _tiredness == i ? c.ink : c.glass,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: _tiredness == i ? c.ink : c.glassEdge,
                        ),
                      ),
                      child: Text(
                        label,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: _tiredness == i ? onInk(context) : c.ink2,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  static String _hoursLabel(double v) =>
      (v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString()).replaceAll(
        '.',
        ',',
      );

  Widget _scheduleStep(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const _Title(
        'Ваш режим',
        'Хронотип подставит время, его можно поправить вручную.',
      ),
      const SizedBox(height: 20),
      Center(
        child: SleepDial(bed: _bedGoal, wake: _wakeGoal),
      ),
      const SizedBox(height: 20),
      SomnaSegmented<Chronotype>(
        label: 'Хронотип',
        value: _chronotype,
        onChanged: _pickChronotype,
        options: [for (final c in _chrono) (c.$1, c.$2)],
      ),
      const SizedBox(height: 12),
      TimeScrubber(
        label: 'Отбой',
        value: _bedGoal,
        onChanged: (v) => setState(() => _bedGoal = v),
      ),
      const SizedBox(height: 12),
      TimeScrubber(
        label: 'Подъём',
        value: _wakeGoal,
        onChanged: (v) => setState(() => _wakeGoal = v),
      ),
      const SizedBox(height: 12),
      Text(
        _target < 420
            ? 'Меньше 7 часов: взрослым обычно нужно 7–9.'
            : 'Лучший подъём по циклам: '
                  '${wakeOptions(_bedGoal).firstWhere((o) => o.best).time}',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: SomnaColors.of(context).ink3),
      ),
    ],
  );

  Widget _moodStep(BuildContext context) {
    final c = SomnaColors.of(context);
    final hint = TextStyle(fontSize: 12, color: c.ink3);
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _Title(
          'Как вы сейчас?',
          'Первый чек-ин: дальше будем сравнивать с ним.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            children: [
              MoodOrb(
                valence: _valence,
                size: 144,
                onChanged: (v) => setState(() {
                  _valence = v;
                  _moodAnswered = true;
                }),
              ),
              const SizedBox(height: 16),
              Dots(value: '${moodPct(_valence)}%', size: 36, color: c.ink),
              const SizedBox(height: 12),
              Text(
                getValenceLabel(_valence),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        Column(
          children: [
            SomnaSlider(
              label: 'Состояние',
              min: -1,
              max: 1,
              step: .02,
              value: _valence,
              format: getValenceLabel,
              onChanged: (v) => setState(() {
                _valence = v;
                _moodAnswered = true;
              }),
              track: const LinearGradient(
                colors: [
                  Color(0xff5b3fd9),
                  Color(0xff3b82f6),
                  Color(0xff34d399),
                  Color(0xffd9f24a),
                  Color(0xfffb923c),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Неприятно', style: hint),
                Text('Приятно', style: hint),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _widgetsStep(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const _Title(
        'Соберите главный экран',
        'Выберите виджеты. Их можно менять в любой момент.',
      ),
      const SizedBox(height: 24),
      GridView(
        shrinkWrap: true,
        padding: EdgeInsets.zero,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisExtent: 150,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
        ),
        children: [
          for (final (i, id) in _starter.indexed)
            () {
              final widget = defaultWidgets.firstWhere((w) => w.id == id);
              final on = _picked.contains(id);
              return _Appear(
                delay: Duration(milliseconds: 40 * i),
                scale: .9,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AnimatedScale(
                      scale: on ? 1 : .96,
                      duration: SomnaMotion.fast,
                      child: AnimatedOpacity(
                        opacity: on ? 1 : .45,
                        duration: SomnaMotion.fast,
                        child: OnboardingWidgetPreview(widget: widget),
                      ),
                    ),
                    PressScale(
                      label: onboardingWidgetTitles[widget.kind],
                      selected: on,
                      onPressed: () => setState(
                        () => on ? _picked.remove(id) : _picked.add(id),
                      ),
                      child: Align(
                        alignment: Alignment.topRight,
                        child: AnimatedContainer(
                          duration: SomnaMotion.fast,
                          margin: const EdgeInsets.all(12),
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: on
                                ? SomnaColors.lime
                                : const Color.fromRGBO(255, 255, 255, .15),
                            border: Border.all(
                              color: on
                                  ? SomnaColors.lime
                                  : const Color.fromRGBO(255, 255, 255, .3),
                            ),
                          ),
                          child: Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: on
                                ? SomnaColors.limeInk
                                : Colors.transparent,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }(),
        ],
      ),
    ],
  );

  Widget _planStep(BuildContext context) {
    final c = SomnaColors.of(context);
    final gain = math.max(0, _target - _hours * 60);
    final facts = [
      ('Отбой', _bedGoal),
      ('Подъём', _wakeGoal),
      ('Сигнал', _reminder ? _reminderTime : 'выкл'),
    ];
    final promises = [
      gain >= 20
          ? 'Вернём до ${durationRu(gain)} сна за ночь'
          : 'Закрепим ваш текущий объём сна',
      _tiredness >= 2
          ? 'Сфокусируемся на утренней бодрости'
          : 'Будем держать стабильный подъём',
      _goals.isEmpty
          ? 'Цель можно выбрать позже'
          : 'Главная цель: ${_goals.first.toLowerCase()}',
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Title(
          _userName.isEmpty ? 'Ваш план готов' : '$_userName, ваш план готов',
          'Его можно изменить в профиле.',
        ),
        const SizedBox(height: 24),
        SomnaCard(
          tone: 'violet',
          radius: SomnaRadii.large,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Цель сна',
                    style: TextStyle(fontSize: 13, color: _onCard),
                  ),
                  Icon(Icons.nights_stay_outlined, size: 16, color: _onCard),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  DotsCount(
                    value: _target.toDouble(),
                    format: (v) => hm(v.round()),
                    size: 56,
                  ),
                  const SizedBox(width: 8),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Text(
                      'ч',
                      style: TextStyle(fontSize: 13, color: _onCard),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  for (final (i, (label, value)) in facts.indexed) ...[
                    if (i > 0) const SizedBox(width: 8),
                    Expanded(
                      child: GlassSurface(
                        inset: true,
                        radius: 18,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: MergeSemantics(
                          child: Column(
                            children: [
                              Text(
                                label,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: _onCard,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                value,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  fontFeatures: [FontFeature.tabularFigures()],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        GlassSurface(
          radius: 26,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
          child: Row(
            children: [
              Expanded(
                child: ExcludeSemantics(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Напоминать об отбое',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Вечерний режим за час до сна',
                        style: TextStyle(fontSize: 12, color: c.ink3),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              SomnaToggle(
                label: 'Напоминать об отбое',
                checked: _reminder,
                onChanged: (v) => setState(() => _reminder = v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        for (final (i, text) in promises.indexed)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 10),
            child: _Appear(
              key: ValueKey(text),
              delay: Duration(milliseconds: 250 + 100 * i),
              offset: const Offset(-10, 0),
              child: Row(
                children: [
                  Icon(Icons.auto_awesome_outlined, size: 16, color: c.accent),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      text,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.375,
                        color: c.ink2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Title extends StatelessWidget {
  final String title, text;
  const _Title(this.title, this.text);
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Semantics(
        header: true,
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 30,
            height: 1.08,
            fontWeight: FontWeight.w500,
            letterSpacing: -1.2,
          ),
        ),
      ),
      const SizedBox(height: 10),
      Text(
        text,
        style: TextStyle(
          fontSize: 15,
          height: 1.625,
          color: SomnaColors.of(context).ink2,
        ),
      ),
    ],
  );
}

/// One step at a time: the old one leaves before the new one slides in.
class _StepSwitcher extends StatefulWidget {
  final int step, dir;
  final Widget Function(BuildContext, int) builder;
  const _StepSwitcher({
    required this.step,
    required this.dir,
    required this.builder,
  });
  @override
  State<_StepSwitcher> createState() => _StepSwitcherState();
}

class _StepSwitcherState extends State<_StepSwitcher>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    value: 1,
  );
  late int _shown, _dir;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _shown = widget.step;
    _dir = widget.dir;
  }

  @override
  void didUpdateWidget(_StepSwitcher old) {
    super.didUpdateWidget(old);
    if (widget.step == _shown || _leaving) return;
    _dir = widget.dir;
    if (MediaQuery.disableAnimationsOf(context)) {
      _shown = widget.step;
      return;
    }
    _leaving = true;
    _swap();
  }

  Future<void> _swap() async {
    try {
      await _c
          .animateBack(0, duration: SomnaMotion.quick, curve: Curves.easeOut)
          .orCancel;
      if (!mounted) return;
      setState(() {
        _leaving = false;
        _shown = widget.step;
        _dir = widget.dir;
      });
      await _c
          .animateTo(1, duration: SomnaMotion.slow, curve: SomnaMotion.smooth)
          .orCancel;
    } on TickerCanceled {
      // Disposed or interrupted by the next step.
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => AnimatedBuilder(
      animation: _c,
      builder: (context, child) => Opacity(
        opacity: _c.value,
        child: Transform.translate(
          offset: Offset((_leaving ? -28 : 36) * _dir * (1 - _c.value), 0),
          child: child,
        ),
      ),
      child: SingleChildScrollView(
        key: ValueKey(_shown),
        padding: const EdgeInsets.only(top: 24),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: math.max(0, constraints.maxHeight - 24),
            minWidth: constraints.maxWidth,
          ),
          child: widget.builder(context, _shown),
        ),
      ),
    ),
  );
}

/// Fades and slides a child in after [delay].
class _Appear extends StatefulWidget {
  final Duration delay;
  final Offset offset;
  final double scale;
  final Widget child;
  const _Appear({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.offset = Offset.zero,
    this.scale = 1,
  });
  @override
  State<_Appear> createState() => _AppearState();
}

class _AppearState extends State<_Appear> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.delay + SomnaMotion.medium,
  );
  bool _started = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = _c.duration!.inMicroseconds;
    final begin = widget.delay.inMicroseconds / total;
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = SomnaMotion.smooth.transform(
          ((_c.value - begin) / (1 - begin)).clamp(0.0, 1.0),
        );
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: widget.offset * (1 - t),
            child: Transform.scale(
              scale: widget.scale + (1 - widget.scale) * t,
              child: child,
            ),
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// Intro: three cards fanned out, shuffling every few seconds.
class _Building extends StatefulWidget {
  final VoidCallback onDone;
  const _Building({required this.onDone});
  @override
  State<_Building> createState() => _BuildingState();
}

class _BuildingState extends State<_Building> {
  Timer? _timer;
  int _done = 0;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  void _schedule() {
    final finished = _done >= _build.length;
    _timer = Timer(Duration(milliseconds: finished ? 500 : 620), () {
      if (finished) return widget.onDone();
      setState(() => _done++);
      _schedule();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final share = _done / _build.length;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Ring(
          value: share,
          size: 170,
          stroke: 4,
          child: DotsCount(
            value: (share * 100).roundToDouble(),
            format: (v) => '${v.round()}%',
            size: 40,
          ),
        ),
        const SizedBox(height: 36),
        const BlurWords(
          text: 'Собираем ваш план',
          stagger: Duration(milliseconds: 80),
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w500,
            letterSpacing: -.84,
          ),
        ),
        const SizedBox(height: 24),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 280),
          child: Column(
            children: [
              for (final (i, label) in _build.indexed)
                Padding(
                  padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
                  child: _Appear(
                    delay: Duration(milliseconds: 60 * i),
                    offset: const Offset(-12, 0),
                    child: AnimatedOpacity(
                      opacity: i <= _done ? 1 : .3,
                      duration: SomnaMotion.medium,
                      child: Row(
                        children: [
                          AnimatedContainer(
                            duration: SomnaMotion.fast,
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: i < _done
                                  ? SomnaColors.lime
                                  : Colors.transparent,
                              border: Border.all(
                                color: i < _done
                                    ? SomnaColors.lime
                                    : c.ink.withValues(alpha: .25),
                              ),
                            ),
                            child: Icon(
                              Icons.check_rounded,
                              size: 14,
                              color: i < _done
                                  ? SomnaColors.limeInk
                                  : Colors.transparent,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              label,
                              style: const TextStyle(fontSize: 15),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
