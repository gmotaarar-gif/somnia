import 'package:material_ui/material_ui.dart';

import '../theme/tokens.dart';
import '../ui/press_scale.dart';

/// Light, dark or system theme, each with a fixed-colour miniature preview.
class AppearancePicker extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const AppearancePicker({
    super.key,
    required this.value,
    required this.onChanged,
  });
  static const modes = [
    ('light', 'Светлое', Icons.light_mode_outlined),
    ('dark', 'Тёмное', Icons.dark_mode_outlined),
    ('system', 'Как в системе', Icons.desktop_windows_outlined),
  ];
  static const _light = Color(0xfff2f1f6), _night = Color(0xff080809);
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Semantics(
      container: true,
      label: 'Оформление',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, (mode, label, icon)) in modes.indexed) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: PressScale(
                    label: label,
                    selected: value == mode,
                    onPressed: () => onChanged(mode),
                    child: Column(
                      children: [
                        _preview(mode, value == mode, c),
                        const SizedBox(height: 8),
                        ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 32),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                icon,
                                size: 12,
                                color: value == mode ? c.ink : c.ink2,
                              ),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  label,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 11,
                                    height: 1.25,
                                    fontWeight: FontWeight.w500,
                                    color: value == mode ? c.ink : c.ink2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value == 'system'
                ? 'Оформление меняется вместе с настройками устройства.'
                : 'Ваш выбор сохранится. Быстро сменить тему можно значком вверху экрана.',
            style: TextStyle(fontSize: 12, height: 1.625, color: c.ink3),
          ),
        ],
      ),
    );
  }

  Widget _preview(String mode, bool selected, SomnaColors c) => Container(
    height: 106,
    clipBehavior: Clip.antiAlias,
    foregroundDecoration: BoxDecoration(
      borderRadius: BorderRadius.circular(18),
      border: Border.all(
        width: selected ? 2 : 1,
        color: selected ? c.accent : const Color.fromRGBO(85, 73, 120, .15),
      ),
    ),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(18),
      color: mode == 'dark' ? _night : _light,
      gradient: mode == 'system'
          ? const LinearGradient(
              colors: [_light, _light, _night, _night],
              stops: [0, .5, .5, 1],
            )
          : null,
    ),
    child: Stack(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 28,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xff9a91b4),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xff9a91b4),
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                height: 35,
                foregroundDecoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  gradient: const RadialGradient(
                    center: Alignment(0, -.1),
                    radius: 1.6,
                    colors: [Color(0xff06041a), Color(0x0006041a)],
                    stops: [.2, 1],
                  ),
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xffc2409a), Color(0xff3b2cd2)],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (var i = 0; i < 2; i++) ...[
                    if (i > 0) const SizedBox(width: 5),
                    Expanded(
                      child: Container(
                        height: 15,
                        decoration: BoxDecoration(
                          color: const Color(0xff25202f),
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        if (selected)
          Positioned(
            right: 6,
            bottom: 6,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: c.accent,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.check, size: 12, color: c.bg),
            ),
          ),
      ],
    ),
  );
}
