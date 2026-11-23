import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import '../ui/ambient.dart';
import '../ui/buddies.dart';
import '../ui/feedback.dart';
import '../ui/glow.dart';

/// Who speaks on each onboarding step, and what they say.
const stepBuddies = <BuddyKind>[
  BuddyKind.cloud,
  BuddyKind.cloud,
  BuddyKind.sprout,
  BuddyKind.moon,
  BuddyKind.moon,
  BuddyKind.star,
  BuddyKind.book,
  BuddyKind.cloud,
  BuddyKind.star,
];

const stepLines = <String>[
  'Привет! Я Облачко, помогу настроиться.',
  'Давайте познакомимся. Имя видно только вам.',
  'Выберите, что важно. Можно несколько.',
  'Честно, без оценок: так советы будут точнее.',
  'Подберём окно сна под ваш ритм.',
  'Потяните шарик вверх или вниз, он покажет настроение.',
  'Соберите главный экран из виджетов.',
  'Секунду, собираю всё вместе.',
  'Готово! Вот ваш план на первую неделю.',
];

const stepGlows = <Color>[
  Color(0xffa6e22e),
  Color(0xff36d7ff),
  Color(0xff3ee6a8),
  Color(0xff8f7bff),
  Color(0xff7045ff),
  Color(0xffff4db8),
  Color(0xffff7a1a),
  Color(0xffa6e22e),
  Color(0xffd9f24a),
];

/// Step progress as a row of LEDs: past steps lit, the current one a wider
/// lime marker, the rest dim.
class StepLeds extends StatelessWidget {
  final int step, count;
  const StepLeds({super.key, required this.step, required this.count});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final still = MediaQuery.disableAnimationsOf(context);
    return Row(
      children: [
        for (var i = 0; i < count; i++)
          Expanded(
            flex: i == step ? 3 : 1,
            child: AnimatedContainer(
              duration: still ? Duration.zero : SomnaMotion.medium,
              curve: SomnaMotion.smooth,
              height: 6,
              margin: EdgeInsets.only(left: i == 0 ? 0 : 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                color: i == step
                    ? SomnaColors.lime
                    : i < step
                    ? c.ink.withValues(alpha: .7)
                    : c.ink.withValues(alpha: .14),
                boxShadow: i == step
                    ? [
                        BoxShadow(
                          color: SomnaColors.lime.withValues(alpha: .5),
                          blurRadius: 8,
                        ),
                      ]
                    : null,
              ),
            ),
          ),
      ],
    );
  }
}

class _Slide {
  final String palette, title, text;
  final BuddyKind buddy;
  final IconData icon;
  const _Slide(this.palette, this.buddy, this.icon, this.title, this.text);
}

const _slides = [
  _Slide(
    'dusk',
    BuddyKind.moon,
    Icons.bedtime_outlined,
    'Сон',
    'Минута утром: отбой, подъём и как спалось.',
  ),
  _Slide(
    'candy',
    BuddyKind.star,
    Icons.blur_on_rounded,
    'Настроение',
    'Двадцать секунд вечером: шарик настроения и пара слов.',
  ),
  _Slide(
    'lime',
    BuddyKind.sprout,
    Icons.insights_outlined,
    'Закономерности',
    'Somna свяжет ночи и дни и подскажет, что помогает.',
  ),
];

/// Three swipeable plates that introduce the app. They advance on their own
/// while ambient motion is allowed; a swipe takes over.
class IntroStory extends StatefulWidget {
  const IntroStory({super.key});
  @override
  State<IntroStory> createState() => _IntroStoryState();
}

class _IntroStoryState extends State<IntroStory> {
  final _pages = PageController(viewportFraction: .82);
  Timer? _auto;
  int _page = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _auto?.cancel();
    if (ambientMotion(context)) {
      _auto = Timer.periodic(const Duration(milliseconds: 3200), (_) {
        if (!_pages.hasClients) return;
        _pages.animateToPage(
          (_page + 1) % _slides.length,
          duration: SomnaMotion.verySlow,
          curve: SomnaMotion.smooth,
        );
      });
    }
  }

  @override
  void dispose() {
    _auto?.cancel();
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Column(
      children: [
        SizedBox(
          height: 220,
          child: NotificationListener<ScrollStartNotification>(
            onNotification: (n) {
              if (n.dragDetails != null) _auto?.cancel();
              return false;
            },
            child: PageView.builder(
              controller: _pages,
              itemCount: _slides.length,
              onPageChanged: (i) {
                Feel.tick();
                setState(() => _page = i);
              },
              itemBuilder: (context, i) {
                final s = _slides[i];
                return AnimatedBuilder(
                  animation: _pages,
                  builder: (context, child) {
                    final pos =
                        _pages.hasClients && _pages.position.haveDimensions
                        ? (_pages.page ?? 0) - i
                        : (_page - i).toDouble();
                    final k = (1 - pos.abs() * .12).clamp(.85, 1.0);
                    return Transform.scale(
                      scale: k,
                      child: Opacity(
                        opacity: (1 - pos.abs() * .4).clamp(.4, 1.0),
                        child: child,
                      ),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: GlowPlate.named(
                      s.palette,
                      radius: SomnaRadii.large,
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Flexible(
                                child: GlowTag(
                                  s.title,
                                  icon: s.icon,
                                  onLight: true,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Buddy(kind: s.buddy, size: 64),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Expanded(
                            child: Align(
                              alignment: Alignment.bottomLeft,
                              child: Text(
                                s.text,
                                maxLines: 4,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 19,
                                  height: 1.25,
                                  letterSpacing: -.4,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < _slides.length; i++)
              AnimatedContainer(
                duration: SomnaMotion.fast,
                curve: SomnaMotion.smooth,
                width: i == _page ? 18 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(3),
                  color: i == _page
                      ? SomnaColors.lime
                      : c.ink.withValues(alpha: .2),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
