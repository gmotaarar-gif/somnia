import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/dots.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'sheet_kit.dart';

bool _still(BuildContext context) => MediaQuery.disableAnimationsOf(context);

/// Full-height practice body with the floating close button of web `bare`
/// sheets.
class _BareSheet extends StatelessWidget {
  final String title;
  final Widget child;
  const _BareSheet({required this.title, required this.child});
  @override
  Widget build(BuildContext context) => SizedBox(
    height: fullSheetHeight(context),
    child: Semantics(
      container: true,
      label: title,
      child: Stack(
        children: [
          Positioned.fill(
            child: Padding(padding: const EdgeInsets.all(24), child: child),
          ),
          Positioned(
            top: 0,
            right: 20,
            child: SheetIconButton(
              label: 'Закрыть',
              icon: Icons.close,
              size: 36,
              onPressed: () => SomnaScope.of(context).openSheet(null),
            ),
          ),
        ],
      ),
    ),
  );
}

/// The cloud companion of the practices; it bobs while a practice runs.
class _Mascot extends StatefulWidget {
  final double size;
  final bool active;
  const _Mascot({this.size = 64, this.active = false});
  @override
  State<_Mascot> createState() => _MascotState();
}

class _MascotState extends State<_Mascot> with SingleTickerProviderStateMixin {
  late final _bob = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(_Mascot old) {
    super.didUpdateWidget(old);
    _sync();
  }

  void _sync() {
    final run = widget.active && !_still(context);
    if (run && !_bob.isAnimating) _bob.repeat(reverse: true);
    if (!run && _bob.isAnimating) _bob.stop();
  }

  @override
  void dispose() {
    _bob.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: AnimatedBuilder(
      animation: _bob,
      builder: (context, child) => Transform.translate(
        offset: Offset(
          0,
          -widget.size * .05 * Curves.easeInOut.transform(_bob.value),
        ),
        child: child,
      ),
      child: CustomPaint(
        size: Size.square(widget.size),
        painter: const _MascotPainter(),
      ),
    ),
  );
}

class _MascotPainter extends CustomPainter {
  const _MascotPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final u = size.width / 64;
    final cloud = Path()
      ..addOval(Rect.fromCircle(center: Offset(22 * u, 34 * u), radius: 12 * u))
      ..addOval(Rect.fromCircle(center: Offset(35 * u, 26 * u), radius: 15 * u))
      ..addOval(Rect.fromCircle(center: Offset(46 * u, 36 * u), radius: 10 * u))
      ..addRRect(
        RRect.fromLTRBR(10 * u, 32 * u, 56 * u, 48 * u, Radius.circular(8 * u)),
      );
    canvas.drawPath(
      cloud,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xffe1e4ff), Color(0xffc4cafa), Color(0xffa3abec)],
        ).createShader(Offset.zero & size),
    );
    final eye = Paint()..color = const Color(0xff22243a);
    for (final x in [27.0, 39.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(x * u, 37 * u),
          width: 4 * u,
          height: 6 * u,
        ),
        eye,
      );
    }
  }

  @override
  bool shouldRepaint(_MascotPainter old) => false;
}

/* ── Grounding 5-4-3-2-1 ────────────────────────────────────────── */

const groundingSenses =
    <({int n, IconData icon, String title, String hint, Color color})>[
      (
        n: 5,
        icon: Icons.visibility_outlined,
        title: 'вещей, которые видите',
        hint: 'Назовите про себя цвет и форму каждой.',
        color: Color(0xffd9f24a),
      ),
      (
        n: 4,
        icon: Icons.back_hand_outlined,
        title: 'ощущения в теле',
        hint: 'Ткань одежды, опора под ногами, воздух на коже.',
        color: Color(0xff9fe8a0),
      ),
      (
        n: 3,
        icon: Icons.hearing,
        title: 'звука вокруг',
        hint: 'Дальние, ближние и совсем тихие.',
        color: Color(0xff8fb6ff),
      ),
      (
        n: 2,
        icon: Icons.eco_outlined,
        title: 'запаха',
        hint: 'Или два запаха, которые вам приятно вспомнить.',
        color: Color(0xffc4a3ff),
      ),
      (
        n: 1,
        icon: Icons.soup_kitchen_outlined,
        title: 'вкус',
        hint: 'Что чувствуете во рту прямо сейчас.',
        color: Color(0xffffb86b),
      ),
    ];

class GroundingSheet extends StatefulWidget {
  const GroundingSheet({super.key});
  @override
  State<GroundingSheet> createState() => _GroundingSheetState();
}

class _GroundingSheetState extends State<GroundingSheet> {
  int _step = 0, _count = 0;

  void _tap() {
    final s = groundingSenses[_step];
    HapticFeedback.selectionClick();
    if (_count + 1 < s.n) return setState(() => _count++);
    if (_step + 1 < groundingSenses.length) {
      return setState(() {
        _step++;
        _count = 0;
      });
    }
    final store = SomnaScope.of(context);
    store.addSession('grounding', 3);
    store.notify('Заземление завершено');
    store.openSheet(null);
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final s = groundingSenses[_step];
    final still = _still(context);
    return _BareSheet(
      title: 'Заземление 5-4-3-2-1',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 48),
            child: Row(
              children: [
                for (final (i, _) in groundingSenses.indexed) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(
                    child: _StepBar(
                      value: i < _step
                          ? 1
                          : i == _step
                          ? _count / s.n
                          : 0,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: still ? Duration.zero : SomnaMotion.medium,
              reverseDuration: still ? Duration.zero : SomnaMotion.quick,
              switchInCurve: SomnaMotion.smooth,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween(
                    begin: const Offset(0, .04),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: FittedBox(
                key: ValueKey(_step),
                fit: BoxFit.scaleDown,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    PressScale(
                      label: 'Отметить: ${_count + 1} из ${s.n}',
                      onPressed: _tap,
                      child: SizedBox.square(
                        dimension: 246,
                        child: CustomPaint(
                          painter: _DashedRing(
                            Theme.of(context).brightness == Brightness.dark
                                ? const Color.fromRGBO(255, 255, 255, .2)
                                : const Color.fromRGBO(21, 21, 28, .2),
                          ),
                          child: Center(
                            child: Container(
                              width: 210,
                              height: 210,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: RadialGradient(
                                  center: const Alignment(-.3, -.4),
                                  radius: .955,
                                  colors: [
                                    const Color(0x88ffffff),
                                    s.color,
                                    s.color.withValues(alpha: 1 / 3),
                                    s.color.withValues(alpha: 0),
                                  ],
                                  stops: const [0, .38, .7, .72],
                                ),
                              ),
                              child: Dots(
                                value: s.n - _count,
                                size: 76,
                                color: const Color(0xff10130a),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(s.icon, size: 20, color: c.ink2),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            '${s.n} ${s.title}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 22,
                              letterSpacing: -.44,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 280),
                      child: Text(
                        s.hint,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          height: 1.625,
                          color: c.ink2,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const _Mascot(active: true),
          const SizedBox(height: 4),
          Text(
            'Нажимайте на шар каждый раз, когда нашли ещё одно',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: c.ink3),
          ),
        ],
      ),
    );
  }
}

class _StepBar extends StatelessWidget {
  final double value;
  const _StepBar({required this.value});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: SizedBox(
        height: 4,
        child: ColoredBox(
          color: c.ink.withValues(alpha: .15),
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: value),
            duration: _still(context) ? Duration.zero : SomnaMotion.verySlow,
            curve: SomnaMotion.smooth,
            builder: (context, v, _) => FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: v.clamp(0, 1),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: c.ink,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedRing extends CustomPainter {
  final Color color;
  const _DashedRing(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final rect = Offset.zero & size;
    const dashes = 96;
    const sweep = 2 * math.pi / dashes;
    for (var i = 0; i < dashes; i++) {
      canvas.drawArc(rect.deflate(.5), i * sweep, sweep * .55, false, paint);
    }
  }

  @override
  bool shouldRepaint(_DashedRing old) => old.color != color;
}

/* ── Body scan ──────────────────────────────────────────────────── */

const bodyScanParts = <({String part, String text, double y})>[
  (
    part: 'Стопы и голени',
    text: 'Почувствуйте вес ног. Отпустите пальцы, пятки, икры.',
    y: .88,
  ),
  (
    part: 'Бёдра и таз',
    text: 'Пусть опора держит вас. Ничего не нужно удерживать.',
    y: .66,
  ),
  (
    part: 'Живот и грудь',
    text: 'Живот мягко поднимается и опускается сам.',
    y: .46,
  ),
  (part: 'Плечи и руки', text: 'Плечи вниз, ладони тяжёлые и тёплые.', y: .32),
  (
    part: 'Шея и лицо',
    text: 'Разожмите челюсть, расслабьте лоб и глаза.',
    y: .12,
  ),
];
const bodyScanStepSeconds = 36;

/// Plus practice. Without Plus the sheet shows [locked] instead, the way the
/// web opens the subscription sheet for a locked practice.
class BodyScanSheet extends StatelessWidget {
  final WidgetBuilder locked;
  const BodyScanSheet({super.key, this.locked = _plusGate});
  static Widget _plusGate(BuildContext context) => const PlusGate();
  @override
  Widget build(BuildContext context) =>
      SomnaScope.of(context).isPlus ? const _BodyScan() : locked(context);
}

/// Shown for a locked practice until the Plus sheet is registered.
class PlusGate extends StatelessWidget {
  const PlusGate({super.key});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: 'somna plus',
          description: 'Больше пространства для отдыха',
          onClose: () => store.openSheet(null),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SomnaCard(
                tone: 'plum',
                child: Column(
                  children: [
                    const Icon(Icons.lock_outline, size: 28),
                    const SizedBox(height: 16),
                    const Text(
                      'Сканирование тела',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        letterSpacing: -.44,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Откройте сканирование тела — мягкую практику, чтобы замедлиться и отпустить день.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.625,
                        color: Color(0xffd3c9e1),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Практика входит в Somna Plus.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: c.ink3),
              ),
              const SizedBox(height: 16),
              SheetButton(
                label: 'Закрыть',
                ghost: true,
                onPressed: () => store.openSheet(null),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BodyScan extends StatefulWidget {
  const _BodyScan();
  @override
  State<_BodyScan> createState() => _BodyScanState();
}

class _BodyScanState extends State<_BodyScan>
    with SingleTickerProviderStateMixin {
  static const _total = 5 * bodyScanStepSeconds;
  late final _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2500),
  );
  Timer? _timer;
  int _sec = 0;
  bool _running = false;

  void _toggle() {
    setState(() => _running = !_running);
    _timer?.cancel();
    _timer = _running
        ? Timer.periodic(const Duration(seconds: 1), (_) => _tick())
        : null;
    _syncPulse();
  }

  void _tick() {
    if (!mounted) return;
    setState(() => _sec++);
    if (_sec < _total) return;
    _timer?.cancel();
    final store = SomnaScope.of(context);
    store.addSession('bodyscan', jsRound(_total / 60).toDouble());
    store.notify('Сканирование тела завершено');
    store.openSheet(null);
  }

  void _syncPulse() {
    final run = _running && !_still(context);
    if (run && !_pulse.isAnimating) _pulse.repeat(reverse: true);
    if (!run && _pulse.isAnimating) {
      _pulse.animateBack(0, duration: SomnaMotion.slow);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncPulse();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final still = _still(context);
    final step = math.min(
      bodyScanParts.length - 1,
      _sec ~/ bodyScanStepSeconds,
    );
    final part = bodyScanParts[step];
    final left = math.max(0, _total - _sec);
    return _BareSheet(
      title: 'Сканирование тела',
      child: Column(
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _Mascot(size: 40, active: _running),
              const SizedBox(width: 12),
              Text(
                'Шаг ${step + 1} из ${bodyScanParts.length}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: c.ink3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Flexible(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: AspectRatio(
                aspectRatio: .5,
                child: LayoutBuilder(
                  builder: (context, box) {
                    final glow = box.maxHeight * 130 / 300;
                    return Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Positioned.fill(
                          child: CustomPaint(painter: _FigurePainter(c.ink)),
                        ),
                        AnimatedPositioned(
                          duration: still
                              ? Duration.zero
                              : const Duration(milliseconds: 1200),
                          curve: SomnaMotion.smooth,
                          top: box.maxHeight * part.y - glow / 2,
                          left: (box.maxWidth - glow) / 2,
                          width: glow,
                          height: glow,
                          child: ScaleTransition(
                            scale: Tween(begin: 1.0, end: 1.18).animate(
                              CurvedAnimation(
                                parent: _pulse,
                                curve: Curves.easeInOut,
                              ),
                            ),
                            child: const DecoratedBox(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: RadialGradient(
                                  colors: [
                                    Color.fromRGBO(217, 242, 74, .75),
                                    Color.fromRGBO(217, 242, 74, 0),
                                  ],
                                  stops: [0, .68],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          AnimatedSwitcher(
            duration: still ? Duration.zero : SomnaMotion.medium,
            reverseDuration: still ? Duration.zero : SomnaMotion.quick,
            switchInCurve: SomnaMotion.smooth,
            child: Column(
              key: ValueKey(step),
              children: [
                Text(
                  part.part,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    letterSpacing: -.44,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: 280,
                    minHeight: 46,
                  ),
                  child: Text(
                    part.text,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.625,
                      color: c.ink2,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          const SizedBox(height: 16),
          Row(
            children: [
              Dots(
                value:
                    '${left ~/ 60}:${(left % 60).toString().padLeft(2, '0')}',
                size: 30,
                color: c.ink,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: SheetButton(
                  icon: _running ? Icons.pause : Icons.play_arrow,
                  label: _running
                      ? 'Пауза'
                      : _sec > 0
                      ? 'Продолжить'
                      : 'Начать',
                  onPressed: _toggle,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FigurePainter extends CustomPainter {
  final Color ink;
  const _FigurePainter(this.ink);
  @override
  void paint(Canvas canvas, Size size) {
    final u = size.width / 100;
    RRect bar(double x, double y, double w, double h, double r) =>
        RRect.fromLTRBR(
          x * u,
          y * u,
          (x + w) * u,
          (y + h) * u,
          Radius.circular(r * u),
        );
    final shapes = Path()
      ..addOval(Rect.fromCircle(center: Offset(50 * u, 20 * u), radius: 13 * u))
      ..addRRect(bar(30, 38, 40, 62, 14))
      ..addRRect(bar(14, 42, 12, 62, 6))
      ..addRRect(bar(74, 42, 12, 62, 6))
      ..addRRect(bar(32, 104, 15, 88, 7.5))
      ..addRRect(bar(53, 104, 15, 88, 7.5));
    canvas
      ..drawPath(shapes, Paint()..color = ink.withValues(alpha: .1))
      ..drawPath(
        shapes,
        Paint()
          ..color = ink.withValues(alpha: .22)
          ..style = PaintingStyle.stroke
          ..strokeWidth = .8 * u,
      );
  }

  @override
  bool shouldRepaint(_FigurePainter old) => old.ink != ink;
}

/* ── Worry journal ──────────────────────────────────────────────── */

class WorrySheet extends StatefulWidget {
  const WorrySheet({super.key});
  @override
  State<WorrySheet> createState() => _WorrySheetState();
}

class _WorrySheetState extends State<WorrySheet> {
  final _text = TextEditingController(), _plan = TextEditingController();

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    _plan.dispose();
    super.dispose();
  }

  void _save() {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    final store = SomnaScope.of(context);
    store.addWorry(text, _plan.text.trim());
    store.addSession('worry', 2);
    store.notify('Отложено до завтра');
    _text.clear();
    _plan.clear();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final worries = store.worries;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: 'Дневник тревог',
          description: 'Выгрузите мысль из головы и назначьте ей время: мозгу проще отпустить записанное',
          onClose: () => store.openSheet(null),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _FieldLabel('Что крутится в голове'),
              _GlassInput(
                controller: _text,
                label: 'Тревожная мысль',
                hint: 'Например: не успеваю с отчётом',
                maxLength: 240,
                lines: 3,
              ),
              const SizedBox(height: 24),
              const _FieldLabel('Первый маленький шаг завтра'),
              _GlassInput(
                controller: _plan,
                label: 'Шаг на завтра',
                hint: 'Например: в 10:00 написать план на 3 пункта',
                maxLength: 120,
                onSubmitted: _save,
              ),
              const SizedBox(height: 20),
              SheetButton(
                label: 'Отложить до завтра',
                onPressed: _text.text.trim().isEmpty ? null : _save,
              ),
              if (worries.isNotEmpty) ...[
                const SizedBox(height: 24),
                _FieldLabel(
                  'Отложенное',
                  hint: '${worries.where((w) => !w.done).length} открыто',
                ),
                for (final (i, w) in worries.indexed) ...[
                  if (i > 0) const SizedBox(height: 8),
                  GlassSurface(
                    key: ValueKey(w.id),
                    radius: 22,
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: PressScale(
                            label: w.done ? 'Вернуть' : 'Отметить решённым',
                            selected: w.done,
                            onPressed: () => store.toggleWorry(w.id),
                            child: AnimatedContainer(
                              duration: SomnaMotion.fast,
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: w.done
                                    ? SomnaColors.lime
                                    : Colors.transparent,
                                border: Border.all(
                                  color: w.done
                                      ? SomnaColors.lime
                                      : c.ink.withValues(alpha: .3),
                                ),
                              ),
                              child: w.done
                                  ? const Icon(
                                      Icons.check,
                                      size: 16,
                                      color: SomnaColors.limeInk,
                                    )
                                  : null,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AnimatedOpacity(
                            duration: SomnaMotion.fast,
                            opacity: w.done ? .45 : 1,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  w.text,
                                  style: TextStyle(
                                    fontSize: 15,
                                    height: 1.375,
                                    decoration: w.done
                                        ? TextDecoration.lineThrough
                                        : null,
                                  ),
                                ),
                                if (w.plan.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    '→ ${w.plan}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: c.ink2,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 4),
                                Text(
                                  _day(w.at),
                                  style: TextStyle(fontSize: 11, color: c.ink3),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        PressScale(
                          label: 'Удалить',
                          onPressed: () => store.removeWorry(w.id),
                          child: SizedBox.square(
                            dimension: 32,
                            child: Icon(
                              Icons.delete_outline,
                              size: 18,
                              color: c.ink3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

String _day(String at) {
  final date = DateTime.tryParse(at);
  return date == null ? '' : relativeDay(dateKey(date.toLocal()));
}

class _FieldLabel extends StatelessWidget {
  final String label;
  final String? hint;
  const _FieldLabel(this.label, {this.hint});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: c.ink3,
              ),
            ),
          ),
          if (hint != null)
            Text(hint!, style: TextStyle(fontSize: 13, color: c.ink2)),
        ],
      ),
    );
  }
}

class _GlassInput extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final int maxLength, lines;
  final VoidCallback? onSubmitted;
  const _GlassInput({
    required this.controller,
    required this.label,
    required this.hint,
    required this.maxLength,
    this.lines = 1,
    this.onSubmitted,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final multi = lines > 1;
    return Semantics(
      label: label,
      child: GlassSurface(
        radius: multi ? 22 : 24,
        child: TextField(
          controller: controller,
          minLines: lines,
          maxLines: lines,
          maxLength: maxLength,
          textCapitalization: TextCapitalization.sentences,
          textInputAction: multi
              ? TextInputAction.newline
              : TextInputAction.done,
          onSubmitted: onSubmitted == null ? null : (_) => onSubmitted!(),
          cursorColor: c.ink,
          style: TextStyle(
            fontSize: 16,
            height: multi ? 1.625 : 1.25,
            color: c.ink,
          ),
          decoration: InputDecoration(
            isDense: true,
            filled: false,
            counterText: '',
            hintText: hint,
            hintStyle: TextStyle(color: c.ink3),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(
              horizontal: multi ? 16 : 20,
              vertical: multi ? 12 : 13,
            ),
          ),
        ),
      ),
    );
  }
}
