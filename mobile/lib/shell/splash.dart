import 'package:material_ui/material_ui.dart';

import '../ui/dots.dart';
import '../theme/tokens.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.nights_stay_outlined,
            color: SomnaColors.of(context).accent,
            size: 44,
          ),
          const SizedBox(height: 20),
          const Text(
            'somna',
            style: TextStyle(fontSize: 32, letterSpacing: -1),
          ),
          const SizedBox(height: 24),
          Dots(value: '...', size: 7, color: SomnaColors.of(context).ink3),
        ],
      ),
    ),
  );
}
