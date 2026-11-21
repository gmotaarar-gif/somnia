import 'package:material_ui/material_ui.dart';

const dotGlyphs = <String, List<String>>{
  '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['01110', '10001', '00001', '00110', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '11110', '10001', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '00100', '00100', '00100'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ',': ['0', '0', '0', '0', '0', '0', '1'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '+': ['000', '000', '010', '111', '010', '000', '000'],
  '/': ['001', '001', '010', '010', '010', '100', '100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
};

class Dots extends StatelessWidget {
  final Object value;
  final double size;
  final Color? color;
  final bool square;
  const Dots({
    super.key,
    required this.value,
    this.size = 48,
    this.color,
    this.square = false,
  });
  @override
  Widget build(BuildContext context) {
    final text = value.toString();
    final columns =
        text
            .split('')
            .fold<int>(
              0,
              (n, c) => n + (dotGlyphs[c] ?? dotGlyphs[' ']!).first.length + 1,
            ) -
        1;
    return Semantics(
      label: text,
      image: true,
      child: SizedBox(
        width: (columns < 1 ? 1 : columns) / 7 * size,
        height: size,
        child: CustomPaint(
          painter: _DotsPainter(
            text,
            color ?? DefaultTextStyle.of(context).style.color ?? Colors.white,
            square,
          ),
        ),
      ),
    );
  }
}

class _DotsPainter extends CustomPainter {
  final String text;
  final Color color;
  final bool square;
  const _DotsPainter(this.text, this.color, this.square);
  @override
  void paint(Canvas canvas, Size size) {
    final unit = size.height / 7,
        dot = square ? .8 : .72,
        rx = square ? .16 : dot / 2;
    var cursor = 0;
    for (final ch in text.split('')) {
      final glyph = dotGlyphs[ch] ?? dotGlyphs[' ']!;
      for (var y = 0; y < 7; y++) {
        for (var x = 0; x < glyph[y].length; x++) {
          if (glyph[y][x] == '1') {
            canvas.drawRRect(
              RRect.fromRectAndRadius(
                Rect.fromLTWH(
                  (cursor + x + (1 - dot) / 2) * unit,
                  (y + (1 - dot) / 2) * unit,
                  dot * unit,
                  dot * unit,
                ),
                Radius.circular(rx * unit),
              ),
              Paint()..color = color,
            );
          }
        }
      }
      cursor += glyph.first.length + 1;
    }
  }

  @override
  bool shouldRepaint(_DotsPainter old) =>
      text != old.text || color != old.color || square != old.square;
}
