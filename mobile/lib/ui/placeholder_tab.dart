import 'package:material_ui/material_ui.dart';

import '../shell/top_bar.dart';
import '../theme/tokens.dart';
import 'surfaces.dart';

class PlaceholderTab extends StatelessWidget {
  final String title, subtitle, message, tone;
  final IconData icon;
  final bool sleepHero;
  const PlaceholderTab({
    super.key,
    required this.title,
    required this.subtitle,
    required this.message,
    required this.icon,
    required this.tone,
    this.sleepHero = false,
  });
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
    children: [
      TopBar(title: title, sub: subtitle),
      SomnaCard(
        tone: tone,
        radius: SomnaRadii.large,
        sleepHero: sleepHero,
        child: SizedBox(
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GlassSurface(
                inset: true,
                radius: 28,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Icon(icon, size: 26),
                ),
              ),
              const SizedBox(height: 64),
              Text(
                message,
                style: const TextStyle(
                  fontSize: 27,
                  height: 1.15,
                  letterSpacing: -.8,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Маленькие шаги к спокойствию\nи хорошему самочувствию.',
                style: TextStyle(
                  fontSize: 14,
                  height: 1.6,
                  color: Color.fromRGBO(255, 255, 255, .64),
                ),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 24),
      Text(
        'ВАШЕ ПРОСТРАНСТВО',
        style: TextStyle(
          fontSize: 10,
          letterSpacing: 2.5,
          fontWeight: FontWeight.w600,
          color: SomnaColors.of(context).ink3,
        ),
      ),
      const SizedBox(height: 12),
      GlassSurface(
        padding: const EdgeInsets.all(20),
        radius: 24,
        child: Row(
          children: [
            Icon(
              Icons.auto_awesome_outlined,
              color: SomnaColors.of(context).accent,
              size: 20,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                'Здесь появится ваша история',
                style: TextStyle(
                  fontSize: 14,
                  color: SomnaColors.of(context).ink2,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
