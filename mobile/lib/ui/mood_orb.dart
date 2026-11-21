import 'package:material_ui/material_ui.dart';

import '../logic/valence.dart';
import '../theme/tokens.dart';

class MoodOrb extends StatelessWidget {
  final double valence, size;
  const MoodOrb({super.key, this.valence = 0, this.size = 160});
  @override
  Widget build(BuildContext context) {
    final p = sampleValencePalette(valence);
    Color rgb(RGB c) => Color.fromARGB(255, c[0], c[1], c[2]);
    return Semantics(
      label: getValenceLabel(valence),
      image: true,
      child: AnimatedContainer(
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : SomnaMotion.verySlow,
        curve: SomnaMotion.smooth,
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            center: const Alignment(-.16, -.24),
            radius: .76,
            colors: [
              rgb(p.core),
              rgb(p.mid),
              rgb(p.outer),
              rgb(p.outer).withValues(alpha: .15),
            ],
            stops: const [0, .35, .75, 1],
          ),
          boxShadow: [
            BoxShadow(
              color: rgb(p.outer).withValues(alpha: .24),
              blurRadius: size * .35,
              spreadRadius: size * .03,
            ),
          ],
        ),
      ),
    );
  }
}
