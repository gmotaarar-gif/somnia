import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../theme/tokens.dart';
import '../ui/mood_orb.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'controls.dart';

/// The check-in keeps its own dark surface in both themes, as on web.
const moodSheetSurface = Color(0xff19191c);

const moodEmotions = {
  'low': [
    'Тревога',
    'Усталость',
    'Напряжение',
    'Раздражение',
    'Грусть',
    'Апатия',
    'Одиночество',
  ],
  'mid': [
    'Спокойствие',
    'Рассеянность',
    'Задумчивость',
    'Скука',
    'Ровно',
    'Усталость',
  ],
  'high': [
    'Лёгкость',
    'Ясность',
    'Умиротворение',
    'Благодарность',
    'Вдохновение',
    'Уверенность',
    'Радость',
  ],
};

const moodFactors = [
  'Сон',
  'Работа',
  'Отдых',
  'Прогулка',
  'Спорт',
  'Семья',
  'Друзья',
  'Кофеин',
  'Еда',
  'Погода',
  'Здоровье',
];

const maxMoodEmotions = 3, maxMoodFactors = 5, maxMoodNote = 200;

const _steps = [
  ('state', 'Как вы себя чувствуете прямо сейчас?', null),
  (
    'feelings',
    'Что лучше всего описывает это чувство?',
    'Отпустите шар на чувстве, можно до трёх',
  ),
  ('causes', 'Что влияет на вас сильнее всего?', 'Можно выбрать до пяти'),
  ('note', 'Хотите добавить пару слов?', 'Необязательно'),
];

/// How long «Записано» stays before the sheet leaves by itself.
const moodDoneDelay = Duration(milliseconds: 1500);

List<String> emotionPool(double valence) =>
    moodEmotions[valence < -0.12
        ? 'low'
        : valence < 0.3
        ? 'mid'
        : 'high']!;

/// A chosen feeling stays on offer after the state moves away from it.
List<String> offeredEmotions(double valence, List<String> chosen) {
  final pool = emotionPool(valence);
  return [...pool, ...chosen.where((e) => !pool.contains(e))];
}

List<String> toggleChoice(List<String> chosen, String option, int max) =>
    chosen.contains(option)
    ? chosen.where((x) => x != option).toList()
    : chosen.length < max
    ? [...chosen, option]
    : chosen;

Color _rgb(RGB c) => Color.fromARGB(255, c[0], c[1], c[2]);

class MoodSheet extends StatefulWidget {
  const MoodSheet({super.key});
  @override
  State<MoodSheet> createState() => _MoodSheetState();
}

class _MoodSheetState extends State<MoodSheet> {
  final _note = TextEditingController();
  int _step = 0, _dir = 1;
  double _valence = 0.3;
  List<String> _emotions = const [], _factors = const [];
  bool _done = false;
  Timer? _leave;
  double? _dragFrom, _dragValence;

  @override
  void dispose() {
    _leave?.cancel();
    _note.dispose();
    super.dispose();
  }

  void _go(int to) => setState(() {
    _dir = to > _step ? 1 : -1;
    _step = to;
  });

  void _next() {
    if (_step < _steps.length - 1) return _go(_step + 1);
    final store = SomnaScope.of(context), note = _note.text.trim();
    FocusManager.instance.primaryFocus?.unfocus();
    store.addMood(
      MoodEntry(
        valence: _valence,
        emotions: _emotions,
        factors: _factors,
        note: note.isEmpty ? null : note,
      ),
    );
    setState(() {
      _dir = 1;
      _done = true;
    });
    _leave = Timer(moodDoneDelay, () {
      if (mounted && store.sheet == 'mood') store.openSheet(null);
    });
  }

  void _setValence(double v) =>
      setState(() => _valence = jsRound(v.clamp(-1, 1) * 100) / 100);

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final safe = math.max(
      0.0,
      media.viewPadding.bottom - media.viewInsets.bottom,
    );
    final height = math.max(
      360.0,
      math.min(
            media.size.height * .93,
            media.size.height - media.viewPadding.top,
          ) -
          24 -
          safe -
          media.viewInsets.bottom,
    );
    final reduce = media.disableAnimations;
    final key = _done ? 'done' : _steps[_step].$1;
    return Semantics(
      scopesRoute: true,
      explicitChildNodes: true,
      label: 'Чек-ин состояния',
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: TweenAnimationBuilder<Color?>(
                  tween: ColorTween(
                    end: _rgb(sampleValencePalette(_valence).mid),
                  ),
                  duration: reduce ? Duration.zero : SomnaMotion.fast,
                  builder: (context, color, _) => CustomPaint(
                    painter: _GlowPainter(color ?? Colors.transparent),
                  ),
                ),
              ),
            ),
            Column(
              children: [
                SizedBox(
                  height: 68,
                  width: double.infinity,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      if (_step > 0 && !_done)
                        Positioned(
                          left: 20,
                          child: PressScale(
                            label: 'Назад',
                            onPressed: () => _go(_step - 1),
                            child: const GlassSurface(
                              radius: 18,
                              child: SizedBox.square(
                                dimension: 36,
                                child: Icon(Icons.chevron_left, size: 22),
                              ),
                            ),
                          ),
                        ),
                      _Progress(step: _step, done: _done),
                    ],
                  ),
                ),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: reduce ? Duration.zero : SomnaMotion.fast,
                    switchInCurve: SomnaMotion.smooth,
                    switchOutCurve: SomnaMotion.smooth,
                    transitionBuilder: (child, animation) => AnimatedBuilder(
                      animation: animation,
                      child: child,
                      builder: (context, child) => Opacity(
                        opacity: animation.value.clamp(0, 1),
                        child: Transform.translate(
                          offset: Offset(
                            (child!.key == ValueKey(key) ? 8 : -8) *
                                _dir *
                                (1 - animation.value),
                            0,
                          ),
                          child: child,
                        ),
                      ),
                    ),
                    child: KeyedSubtree(key: ValueKey(key), child: _view()),
                  ),
                ),
                if (!_done)
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                      20,
                      12,
                      20,
                      math.max(0, 20 - safe),
                    ),
                    child: MindButton(
                      height: 56,
                      label: _step == _steps.length - 1
                          ? 'Сохранить чек-ин'
                          : 'Далее',
                      onPressed: _next,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _view() {
    if (_done) return _Done(valence: _valence);
    if (_step == 0) {
      return Column(
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: _Question(step: 0),
          ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, box) => GestureDetector(
                behavior: HitTestBehavior.opaque,
                onHorizontalDragStart: (d) {
                  _dragFrom = d.globalPosition.dx;
                  _dragValence = _valence;
                },
                onHorizontalDragUpdate: (d) {
                  final from = _dragFrom, start = _dragValence;
                  if (from == null || start == null) return;
                  _setValence(
                    start +
                        (d.globalPosition.dx - from) /
                            math.max(1, box.maxWidth) *
                            2,
                  );
                },
                onHorizontalDragEnd: (_) => _dragFrom = null,
                onHorizontalDragCancel: () => _dragFrom = null,
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        MoodOrb(
                          valence: _valence,
                          size: 184,
                          onChanged: _setValence,
                        ),
                        const SizedBox(height: 28),
                        ExcludeSemantics(
                          child: Text(
                            getValenceLabel(_valence),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w500,
                              height: 1.25,
                              letterSpacing: -1.12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
            child: Column(
              children: [
                _ValenceSlider(value: _valence, onChanged: _setValence),
                const SizedBox(height: 4),
                const ExcludeSemantics(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('ОЧЕНЬ НЕПРИЯТНО', style: _caption),
                        ),
                      ),
                      SizedBox(width: 12),
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('ОЧЕНЬ ПРИЯТНО', style: _caption),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    final feelings = offeredEmotions(_valence, _emotions);
    return LayoutBuilder(
      builder: (context, box) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: math.max(0, box.maxHeight - 16),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_step == 1) ...[
                  const _Question(step: 1),
                  const SizedBox(height: 20),
                  EmotionField(
                    options: feelings,
                    chosen: _emotions,
                    onPick: (e) => setState(
                      () => _emotions =
                          _emotions.contains(e) ||
                              _emotions.length >= maxMoodEmotions
                          ? _emotions
                          : [..._emotions, e],
                    ),
                  ),
                  const SizedBox(height: 20),
                  _Choices(
                    label: 'Что чувствуете',
                    options: feelings,
                    chosen: _emotions,
                    onTap: (e) => setState(
                      () => _emotions = toggleChoice(
                        _emotions,
                        e,
                        maxMoodEmotions,
                      ),
                    ),
                  ),
                ] else ...[
                  Center(child: MoodOrb(valence: _valence, size: 92)),
                  const SizedBox(height: 4),
                  ExcludeSemantics(
                    child: Text(
                      getValenceLabel(_valence),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15,
                        color: Color.fromRGBO(255, 255, 255, .7),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _Question(step: _step),
                  const SizedBox(height: 28),
                  if (_step == 2)
                    _Choices(
                      label: 'Что повлияло',
                      options: moodFactors,
                      chosen: _factors,
                      onTap: (f) => setState(
                        () => _factors = toggleChoice(
                          _factors,
                          f,
                          maxMoodFactors,
                        ),
                      ),
                    )
                  else
                    GlassSurface(
                      radius: 24,
                      child: Semantics(
                        label: 'Заметка',
                        child: TextField(
                          controller: _note,
                          minLines: 4,
                          maxLines: 4,
                          maxLength: maxMoodNote,
                          textCapitalization: TextCapitalization.sentences,
                          style: const TextStyle(fontSize: 16, height: 1.5),
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            counterText: '',
                            hintText: 'Пара слов о моменте',
                            hintStyle: TextStyle(
                              color: SomnaColors.of(context).ink3,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

const _caption = TextStyle(
  fontSize: 11,
  letterSpacing: .66,
  color: Color.fromRGBO(255, 255, 255, .55),
);

class _Question extends StatelessWidget {
  final int step;
  const _Question({required this.step});
  @override
  Widget build(BuildContext context) {
    final (_, title, hint) = _steps[step];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w500,
                height: 1.2,
                letterSpacing: -.66,
              ),
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 8),
            Text(
              hint,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: Color.fromRGBO(255, 255, 255, .55),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Progress extends StatelessWidget {
  final int step;
  final bool done;
  const _Progress({required this.step, required this.done});
  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : SomnaMotion.fast;
    return Semantics(
      container: true,
      image: true,
      label: done ? 'Чек-ин записан' : 'Шаг ${step + 1} из ${_steps.length}',
      child: SizedBox(
        width: 6.0 * _steps.length + 14 * (_steps.length - 1),
        height: 6,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            for (var i = 0; i < _steps.length; i++)
              Positioned(
                left: i * 20,
                child: AnimatedContainer(
                  duration: duration,
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done || i < step
                        ? SomnaColors.lime
                        : const Color.fromRGBO(255, 255, 255, .25),
                  ),
                ),
              ),
            AnimatedPositioned(
              duration: duration,
              curve: SomnaMotion.smooth,
              left: step * 20 - 8,
              child: AnimatedOpacity(
                duration: duration,
                opacity: done ? 0 : 1,
                child: Container(
                  width: 22,
                  height: 6,
                  decoration: BoxDecoration(
                    color: SomnaColors.lime,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Choices extends StatelessWidget {
  final String label;
  final List<String> options, chosen;
  final ValueChanged<String> onTap;
  const _Choices({
    required this.label,
    required this.options,
    required this.chosen,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: label,
    child: Wrap(
      alignment: WrapAlignment.center,
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final option in options)
          MindChip(
            label: option,
            active: chosen.contains(option),
            onPressed: () => onTap(option),
          ),
      ],
    ),
  );
}

class _Done extends StatelessWidget {
  final double valence;
  const _Done({required this.valence});
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Center(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 64),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  ExcludeSemantics(child: MoodOrb(valence: valence, size: 168)),
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: MediaQuery.disableAnimationsOf(context)
                        ? Duration.zero
                        : const Duration(milliseconds: 300),
                    curve: SomnaMotion.smooth,
                    builder: (context, t, child) => Opacity(
                      opacity: t,
                      child: Transform.scale(
                        scale: .25 + .75 * t,
                        child: child,
                      ),
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 56,
                      color: Colors.white,
                      shadows: [
                        Shadow(
                          color: Color.fromRGBO(0, 0, 0, .35),
                          blurRadius: 8,
                          offset: Offset(0, 1),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              const Text(
                'Записано',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w500,
                  height: 1.25,
                  letterSpacing: -.78,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                getValenceLabel(valence),
                style: const TextStyle(
                  fontSize: 14,
                  color: Color.fromRGBO(255, 255, 255, .6),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _GlowPainter extends CustomPainter {
  final Color color;
  const _GlowPainter(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    void glow(double cx, double cy, double rx, double ry, double alpha) {
      canvas.save();
      canvas.translate(size.width * cx, size.height * cy);
      canvas.scale(size.width * rx, size.height * ry);
      canvas.drawCircle(
        Offset.zero,
        1,
        Paint()
          ..shader = RadialGradient(
            colors: [
              color.withValues(alpha: alpha),
              color.withValues(alpha: 0),
            ],
          ).createShader(const Rect.fromLTWH(-1, -1, 2, 2)),
      );
      canvas.restore();
    }

    canvas.clipRect(Offset.zero & size);
    glow(.5, .46, .7, .34, .24);
    // The sheet's handle strip sits above this box: fade out before its edge.
    glow(.5, .2, 1.2, .2, .12);
  }

  @override
  bool shouldRepaint(_GlowPainter old) => old.color != color;
}

class _ValenceSlider extends StatefulWidget {
  final double value;
  final ValueChanged<double> onChanged;
  const _ValenceSlider({required this.value, required this.onChanged});
  @override
  State<_ValenceSlider> createState() => _ValenceSliderState();
}

class _ValenceSliderState extends State<_ValenceSlider> {
  bool _ring = false;

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (event is KeyUpEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;
    final value = widget.value;
    final next = switch (key) {
      LogicalKeyboardKey.arrowRight ||
      LogicalKeyboardKey.arrowUp => value + .05,
      LogicalKeyboardKey.arrowLeft ||
      LogicalKeyboardKey.arrowDown => value - .05,
      LogicalKeyboardKey.home => -1.0,
      LogicalKeyboardKey.end => 1.0,
      _ => null,
    };
    if (next == null) return KeyEventResult.ignored;
    widget.onChanged(next.clamp(-1.0, 1.0));
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final value = widget.value;
    final onChanged = widget.onChanged;
    return Focus(
      onKeyEvent: _onKey,
      onFocusChange: (on) => setState(
        () => _ring =
            on &&
            FocusManager.instance.highlightMode ==
                FocusHighlightMode.traditional,
      ),
      child: Semantics(
        slider: true,
        label: 'Насколько приятно ваше состояние',
        value: '${jsRound(value * 100)}',
        increasedValue: '${jsRound((value + .05).clamp(-1, 1) * 100)}',
        decreasedValue: '${jsRound((value - .05).clamp(-1, 1) * 100)}',
        onIncrease: () => onChanged(value + .05),
        onDecrease: () => onChanged(value - .05),
        child: _track(value, onChanged),
      ),
    );
  }

  Widget _track(double value, ValueChanged<double> onChanged) => LayoutBuilder(
    builder: (context, box) {
      final span = math.max(1.0, box.maxWidth - 28);
      void place(double dx) =>
          onChanged(((dx - 14) / span).clamp(0, 1) * 2 - 1);
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (d) => place(d.localPosition.dx),
        onHorizontalDragStart: (d) => place(d.localPosition.dx),
        onHorizontalDragUpdate: (d) => place(d.localPosition.dx),
        child: Container(
          height: 44,
          foregroundDecoration: _ring
              ? BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: SomnaColors.lime, width: 2),
                )
              : null,
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              Container(
                height: 14,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(7),
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xff622ed7),
                      Color(0xff2563eb),
                      Color(0xff14948a),
                      Color(0xff5fa830),
                      Color(0xffea761c),
                    ],
                    stops: [0, .28, .5, .71, 1],
                  ),
                ),
              ),
              Positioned(
                left: span * (value + 1) / 2,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    border: Border.all(
                      color: const Color.fromRGBO(0, 0, 0, .12),
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color.fromRGBO(0, 0, 0, .5),
                        blurRadius: 14,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

/// A hue per feeling the check-in offers; unknown ones fall back to a quiet grey.
const emotionColors = <String, Color>{
  'Тревога': Color(0xffff7a59),
  'Усталость': Color(0xff8e8cf0),
  'Напряжение': Color(0xffff5470),
  'Раздражение': Color(0xffff4d3d),
  'Грусть': Color(0xff4f8cff),
  'Апатия': Color(0xff8a94b8),
  'Одиночество': Color(0xff7a6bf0),
  'Спокойствие': Color(0xff3ed1b8),
  'Рассеянность': Color(0xffc39bff),
  'Задумчивость': Color(0xff6aa8ff),
  'Скука': Color(0xffa7adbf),
  'Ровно': Color(0xff5fd08a),
  'Лёгкость': Color(0xff7be0ff),
  'Ясность': Color(0xffb6f27a),
  'Умиротворение': Color(0xff45d6a0),
  'Благодарность': Color(0xffffb36b),
  'Вдохновение': Color(0xffff7bd5),
  'Уверенность': Color(0xfff59e42),
  'Радость': Color(0xffffe14d),
};
Color emotionColor(String name) =>
    emotionColors[name] ?? const Color(0xffa7adbf);

const _cols = 11, _rows = 7;
const _ring = <(double, double)>[
  (.16, .22),
  (.5, .16),
  (.84, .22),
  (.84, .78),
  (.5, .84),
  (.16, .78),
  (.5, .5),
  (.3, .5),
  (.7, .5),
  (.5, .33),
];

/// Where each feeling sits on the field, in grid units.
List<(String, double, double)> emotionAnchors(List<String> options) {
  final n = math.min(options.length, _ring.length);
  final spots = n == 8 ? [..._ring.take(6), _ring[7], _ring[8]] : _ring.take(n);
  return [
    for (final (i, (x, y)) in spots.indexed) (options[i], x * _cols, y * _rows),
  ];
}

String? nearestEmotion(List<(String, double, double)> anchors, Offset at) {
  String? best;
  var bestD = double.infinity;
  for (final (name, x, y) in anchors) {
    final d = (x - at.dx) * (x - at.dx) + (y - at.dy) * (y - at.dy);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

/// The feelings laid out on a field of dots: carry the knob across it and the
/// dots near it swell in the colour of the feeling underneath; let go to add
/// that feeling. A pointer shortcut only: the chips under it are the same
/// choice for screen readers.
class EmotionField extends StatefulWidget {
  final List<String> options, chosen;
  final ValueChanged<String> onPick;
  const EmotionField({
    super.key,
    required this.options,
    required this.chosen,
    required this.onPick,
  });
  @override
  State<EmotionField> createState() => _EmotionFieldState();
}

class _EmotionFieldState extends State<EmotionField> {
  Offset? _knob;
  int? _pointer;

  Offset _place(Offset local, Size size) {
    // The dots fill the middle 88% of the field.
    final at = Offset(
      ((local.dx / size.width - .06) / .88 * _cols).clamp(0, _cols.toDouble()),
      ((local.dy / size.height - .06) / .88 * _rows).clamp(0, _rows.toDouble()),
    );
    setState(() => _knob = at);
    return at;
  }

  @override
  Widget build(BuildContext context) {
    final anchors = emotionAnchors(widget.options);
    final knob = _knob;
    final current = knob == null ? null : nearestEmotion(anchors, knob);
    return ExcludeSemantics(
      child: Column(
        children: [
          SizedBox(
            height: 36,
            child: Center(
              child: current == null
                  ? const Text(
                      'Проведите по полю',
                      style: TextStyle(
                        fontSize: 15,
                        color: Color.fromRGBO(255, 255, 255, .55),
                      ),
                    )
                  : Text(
                      current,
                      key: const ValueKey('emotion-field-current'),
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w500,
                        letterSpacing: -.72,
                        color: emotionColor(current),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          AspectRatio(
            aspectRatio: _cols / _rows,
            child: LayoutBuilder(
              builder: (context, box) {
                final size = box.biggest;
                return RawGestureDetector(
                  // Claims the touch at once so the sheet does not scroll under it.
                  gestures: {
                    EagerGestureRecognizer:
                        GestureRecognizerFactoryWithHandlers<
                          EagerGestureRecognizer
                        >(EagerGestureRecognizer.new, (_) {}),
                  },
                  child: Listener(
                    key: const ValueKey('emotion-field'),
                    behavior: HitTestBehavior.opaque,
                    onPointerDown: (e) {
                      if (_pointer != null) return;
                      _pointer = e.pointer;
                      _place(e.localPosition, size);
                    },
                    onPointerMove: (e) {
                      if (e.pointer == _pointer) _place(e.localPosition, size);
                    },
                    onPointerUp: (e) {
                      if (e.pointer != _pointer) return;
                      _pointer = null;
                      final name = nearestEmotion(
                        anchors,
                        _place(e.localPosition, size),
                      );
                      if (name != null) widget.onPick(name);
                    },
                    onPointerCancel: (e) {
                      if (e.pointer == _pointer) _pointer = null;
                    },
                    child: GlassSurface(
                      radius: 28,
                      child: CustomPaint(
                        size: size,
                        painter: _FieldPainter(
                          anchors: anchors,
                          chosen: widget.chosen,
                          knob: knob,
                          current: current,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldPainter extends CustomPainter {
  final List<(String, double, double)> anchors;
  final List<String> chosen;
  final Offset? knob;
  final String? current;
  const _FieldPainter({
    required this.anchors,
    required this.chosen,
    required this.knob,
    required this.current,
  });
  @override
  void paint(Canvas canvas, Size size) {
    final knob = this.knob;
    final ux = size.width * .88 / _cols, uy = size.height * .88 / _rows;
    Offset px(double x, double y) =>
        Offset(size.width * .06 + x * ux, size.height * .06 + y * uy);
    if (knob != null && current != null) {
      final center = px(knob.dx, knob.dy);
      canvas.drawRect(
        Offset.zero & size,
        Paint()
          ..shader =
              RadialGradient(
                colors: [
                  emotionColor(current!).withValues(alpha: .22),
                  emotionColor(current!).withValues(alpha: 0),
                ],
              ).createShader(
                Rect.fromCircle(center: center, radius: size.width * .6),
              ),
      );
    }
    for (var r = 0; r < _rows; r++) {
      for (var c = 0; c < _cols; c++) {
        final x = c + .5, y = r + .5;
        var home = anchors.first;
        var best = double.infinity;
        for (final a in anchors) {
          final d = (a.$2 - x) * (a.$2 - x) + (a.$3 - y) * (a.$3 - y);
          if (d < best) {
            best = d;
            home = a;
          }
        }
        final lit =
            chosen.contains(home.$1) &&
            (home.$2 - x).abs() < .6 &&
            (home.$3 - y).abs() < .6;
        final near = knob == null
            ? 0.0
            : math.exp(
                -((knob.dx - x) * (knob.dx - x) +
                        (knob.dy - y) * (knob.dy - y)) /
                    2.2,
              );
        canvas.drawCircle(
          px(x, y),
          math.max(lit ? .3 : 0, .07 + near * .27) * ux,
          Paint()
            ..color = emotionColor(home.$1)
                .withValues(alpha: math.max(lit ? 1 : 0, .32 + near * .68)),
        );
      }
    }
    if (knob != null) {
      final center = px(knob.dx, knob.dy);
      canvas.drawCircle(
        center,
        24,
        Paint()..color = const Color.fromRGBO(255, 255, 255, .14),
      );
      canvas.drawCircle(
        center,
        18,
        Paint()..color = const Color.fromRGBO(255, 255, 255, .85),
      );
    }
  }

  @override
  bool shouldRepaint(_FieldPainter old) =>
      old.knob != knob ||
      old.current != current ||
      old.chosen != chosen ||
      old.anchors != anchors;
}
