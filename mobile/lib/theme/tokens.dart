import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

abstract final class SomnaMotion {
  static const quick = Duration(milliseconds: 150);
  static const fast = Duration(milliseconds: 250);
  static const medium = Duration(milliseconds: 350);
  static const slow = Duration(milliseconds: 400);
  static const verySlow = Duration(milliseconds: 500);
  static const smooth = Cubic(0.22, 1, 0.36, 1);
  static const bounce = Cubic(0.34, 1.36, 0.64, 1);
  static const pressScale = 0.96;
}

abstract final class SomnaRadii {
  static const small = 24.0, medium = 30.0, large = 36.0, sheet = 40.0;
}

abstract final class SomnaGradients {
  static const sleepPurple = Color(0xff7045ff);
  static const sleepPink = Color(0xffff4db8);
  static const sleepHero = LinearGradient(
    begin: Alignment(-.5735764, -.8191520),
    end: Alignment(.5735764, .8191520),
    colors: [Color(0xff35208a), Color(0xff17112d), Color(0xff753b86)],
    stops: [0, .65, 1],
  );
}

class SomnaColors {
  final Color bg, ink, ink2, ink3, hair, accent, sheet, danger;
  final Color glass,
      glassEdge,
      glassInset,
      chrome,
      chromeEdge,
      chromeLine,
      chromeShadow;
  const SomnaColors({
    required this.bg,
    required this.ink,
    required this.ink2,
    required this.ink3,
    required this.hair,
    required this.accent,
    required this.sheet,
    required this.danger,
    required this.glass,
    required this.glassEdge,
    required this.glassInset,
    required this.chrome,
    required this.chromeEdge,
    required this.chromeLine,
    required this.chromeShadow,
  });
  static const lime = Color(0xffd9f24a), limeInk = Color(0xff151a02);
  static const dark = SomnaColors(
    bg: Color(0xff080809),
    ink: Color(0xffffffff),
    ink2: Color.fromRGBO(255, 255, 255, .64),
    ink3: Color.fromRGBO(255, 255, 255, .5),
    hair: Color.fromRGBO(255, 255, 255, .1),
    accent: lime,
    sheet: Color(0xff0d0d13),
    danger: Color(0xffff8f8f),
    glass: Color.fromRGBO(255, 255, 255, .055),
    glassEdge: Color.fromRGBO(255, 255, 255, .055),
    glassInset: Color.fromRGBO(255, 255, 255, .13),
    chrome: Color.fromRGBO(14, 14, 20, .62),
    chromeEdge: Color.fromRGBO(255, 255, 255, .2),
    chromeLine: Color.fromRGBO(255, 255, 255, .07),
    chromeShadow: Color.fromRGBO(0, 0, 0, .75),
  );
  static const light = SomnaColors(
    bg: Color(0xfff2f1f6),
    ink: Color(0xff15151c),
    ink2: Color.fromRGBO(21, 21, 28, .7),
    ink3: Color.fromRGBO(21, 21, 28, .56),
    hair: Color.fromRGBO(21, 21, 28, .1),
    accent: Color(0xff4f6a00),
    sheet: Color(0xfff7f6fa),
    danger: Color(0xffc62f3b),
    glass: Color.fromRGBO(255, 255, 255, .62),
    glassEdge: Color.fromRGBO(255, 255, 255, .9),
    glassInset: Color.fromRGBO(21, 21, 28, .07),
    chrome: Color.fromRGBO(255, 255, 255, .72),
    chromeEdge: Color.fromRGBO(255, 255, 255, .95),
    chromeLine: Color.fromRGBO(21, 21, 28, .06),
    chromeShadow: Color.fromRGBO(60, 50, 110, .28),
  );
  static SomnaColors of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;
}

class CardTone {
  final Color top, bottom, core;
  final double angle, x, y, width, height;
  CardTone(
    int top,
    int bottom, {
    int core = 0xff050506,
    this.angle = 180,
    this.x = .5,
    this.y = .5,
    this.width = 1.35,
    this.height = .60,
  }) : top = Color(top),
       bottom = Color(bottom),
       core = Color(core);
  Alignment get begin => Alignment(
    -math.sin(angle * math.pi / 180),
    math.cos(angle * math.pi / 180),
  );
  Alignment get end => Alignment(-begin.x, -begin.y);
}

final cardTones = <String, CardTone>{
  'plum': CardTone(0xffa3167d, 0xffb9a4da),
  'lime': CardTone(0xff1b7a12, 0xffc6cf6c),
  'ember': CardTone(0xff48130f, 0xffbb561a, y: .4),
  'forest': CardTone(0xff0f3a2a, 0xff03130c, y: .62, height: .7),
  'moss': CardTone(
    0xff8aa83c,
    0xff0a0f08,
    angle: 140,
    x: .68,
    y: .66,
    width: 1.2,
    height: .78,
  ),
  'rose': CardTone(
    0xffb93049,
    0xffcc3d88,
    angle: 215,
    core: 0xff14060c,
    width: 1.2,
    height: .52,
  ),
  'dusk': CardTone(
    0xff6b5db4,
    0xff3a1f3f,
    angle: 205,
    core: 0xff0b070f,
    y: .58,
    height: .7,
  ),
  'cobalt': CardTone(0xff2a3bb4, 0xff0b0f3a, core: 0xff05061a, y: .62),
  'coral': CardTone(0xff1a0806, 0xffee4a26, y: .32, height: .66),
  'ink': CardTone(0xff2c2c33, 0xff0c0c0f, y: .64, height: .8),
  'violet': CardTone(
    0xffc2489c,
    0xff4b2a8f,
    core: 0xff12041a,
    y: .56,
    height: .56,
  ),
  'mint': CardTone(
    0xffe2994f,
    0xff2f8a2a,
    core: 0xff0d2a10,
    y: .7,
    height: .4,
    width: .9,
  ),
  'night': CardTone(
    0xff3d4fd6,
    0xff120a3c,
    core: 0xff05061c,
    y: .58,
    height: .58,
  ),
  'sunset': CardTone(
    0xffd06a3c,
    0xff7a2a78,
    core: 0xff16060f,
    y: .54,
    height: .54,
  ),
  'nightfall': CardTone(
    0xffc2409a,
    0xff3b2cd2,
    core: 0xff06041a,
    y: .4,
    height: .56,
    width: 1.4,
  ),
};

const toneSwatches = <String, List<Color>>{
  'ink': [Color(0xff3a3a44), Color(0xff0c0c0f)],
  'plum': [Color(0xffa3167d), Color(0xffb9a4da)],
  'violet': [Color(0xffc2489c), Color(0xff4b2a8f)],
  'dusk': [Color(0xff6b5db4), Color(0xff3a1f3f)],
  'cobalt': [Color(0xff2a3bb4), Color(0xff0b0f3a)],
  'forest': [Color(0xff17553d), Color(0xff03130c)],
  'moss': [Color(0xff8aa83c), Color(0xff0a0f08)],
  'lime': [Color(0xff1b7a12), Color(0xffc6cf6c)],
  'ember': [Color(0xff48130f), Color(0xffbb561a)],
  'coral': [Color(0xff1a0806), Color(0xffee4a26)],
  'rose': [Color(0xffb93049), Color(0xffcc3d88)],
};
