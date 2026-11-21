import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/mood_orb.dart';
import 'aurora.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  bool _busy = false;
  String? _error;
  Future<void> _start() async {
    final store = SomnaScope.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await store.finishOnboarding({'reminder': store.reminder});
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = 'Не удалось начать. Попробуйте ещё раз.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.transparent,
    body: Stack(
      children: [
        const Positioned.fill(child: Aurora(tab: 'onboarding')),
        SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxHeight < 740;
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Padding(
                      padding: compact
                          ? const EdgeInsets.fromLTRB(24, 24, 24, 20)
                          : const EdgeInsets.fromLTRB(28, 32, 28, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.nights_stay_outlined, size: 22),
                              SizedBox(width: 10),
                              Text(
                                'somna',
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: -1,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          SizedBox(height: compact ? 20 : 48),
                          Center(
                            child: MoodOrb(
                              valence: .15,
                              size: compact ? 104 : 180,
                            ),
                          ),
                          SizedBox(height: compact ? 28 : 56),
                          Text(
                            'В своём\nритме.',
                            style: TextStyle(
                              fontSize: compact ? 44 : 58,
                              height: 1,
                              letterSpacing: -3,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(height: compact ? 16 : 24),
                          Text(
                            'Сон, состояние и маленькие практики.\nБольше заботы о себе — каждый день.',
                            style: TextStyle(
                              fontSize: compact ? 14 : 15,
                              height: compact ? 1.5 : 1.65,
                              color: SomnaColors.of(context).ink2,
                            ),
                          ),
                          SizedBox(height: compact ? 24 : 48),
                          const Spacer(),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Text(
                                _error!,
                                style: TextStyle(
                                  color: SomnaColors.of(context).danger,
                                ),
                              ),
                            ),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _busy ? null : _start,
                              child: Text(_busy ? 'Начинаем…' : 'Начать'),
                            ),
                          ),
                          SizedBox(height: compact ? 12 : 18),
                          Center(
                            child: Text(
                              'Мягко. Без спешки. Для себя.',
                              style: TextStyle(
                                fontSize: 11,
                                color: SomnaColors.of(context).ink3,
                              ),
                            ),
                          ),
                        ],
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
