import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import '../native/reminders.dart';
import '../native/export.dart';

class ProfileSheet extends StatelessWidget {
  final ReminderService? reminders;
  final DataExporter? exporter;
  const ProfileSheet({super.key, this.reminders, this.exporter});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Профиль',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -1,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Закрыть',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SomnaCard(
            tone: 'ink',
            radius: 24,
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: Color(0xff35333f),
                  foregroundColor: Colors.white,
                  child: Icon(Icons.person_outline),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        store.userName.isEmpty
                            ? 'Ваше пространство'
                            : store.userName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Somna · в своём ритме',
                        style: TextStyle(fontSize: 12, color: Colors.white60),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),
          const Text(
            'Оформление',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Как вам комфортнее',
            style: TextStyle(fontSize: 13, color: c.ink3),
          ),
          const SizedBox(height: 16),
          GlassSurface(
            radius: 24,
            padding: const EdgeInsets.all(5),
            child: Row(
              children: [
                for (final (id, label, icon) in const [
                  ('system', 'Системная', Icons.brightness_auto_outlined),
                  ('light', 'Светлая', Icons.light_mode_outlined),
                  ('dark', 'Тёмная', Icons.dark_mode_outlined),
                ])
                  Expanded(
                    child: PressScale(
                      label: label,
                      selected: store.theme == id,
                      onPressed: () => store.patch({'theme': id}),
                      child: AnimatedContainer(
                        duration: SomnaMotion.fast,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: store.theme == id
                              ? SomnaColors.lime
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              icon,
                              size: 21,
                              color: store.theme == id
                                  ? SomnaColors.limeInk
                                  : c.ink2,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              label,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: store.theme == id
                                    ? SomnaColors.limeInk
                                    : c.ink2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ReminderControls(reminders: reminders),
          const SizedBox(height: 24),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.ios_share),
            title: const Text('Экспорт данных'),
            subtitle: const Text('Файл JSON со всеми записями'),
            onTap: () =>
                (exporter ?? DataExporter(CacheShareTarget())).export(store),
          ),
          const SizedBox(height: 16),
          Text(
            'Настройки профиля скоро появятся здесь.\nВсё важное остаётся с вами.',
            style: TextStyle(fontSize: 13, height: 1.6, color: c.ink3),
          ),
        ],
      ),
    );
  }
}

class ReminderControls extends StatefulWidget {
  final ReminderService? reminders;
  const ReminderControls({super.key, this.reminders});
  @override
  State<ReminderControls> createState() => _ReminderControlsState();
}

class _ReminderControlsState extends State<ReminderControls> {
  bool _busy = false;
  Future<void> _toggle(bool morning, bool enabled) async {
    final store = SomnaScope.of(context);
    setState(() => _busy = true);
    try {
      if (widget.reminders != null) {
        await widget.reminders!.setEnabled(morning, enabled);
      } else {
        store.patch({morning ? 'morningReminder' : 'reminder': enabled});
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _time(bool morning) async {
    final store = SomnaScope.of(context),
        value = morning
            ? SomnaScope.of(context).morningReminderTime
            : SomnaScope.of(context).reminderTime;
    final valid = validReminderTime(value);
    final time = await showTimePicker(
      context: context,
      initialTime: valid
          ? TimeOfDay(
              hour: int.parse(value.substring(0, 2)),
              minute: int.parse(value.substring(3)),
            )
          : const TimeOfDay(hour: 22, minute: 30),
      helpText: morning ? 'Утреннее напоминание' : 'Вечернее напоминание',
      cancelText: 'Отмена',
      confirmText: 'Сохранить',
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (!mounted || time == null) return;
    store.patch({
      morning ? 'morningReminderTime' : 'reminderTime':
          '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Напоминания',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
        for (final morning in [false, true]) ...[
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(
              morning ? 'Утреннее напоминание' : 'Вечернее напоминание',
            ),
            value: morning ? s.morningReminder : s.reminder,
            onChanged: _busy ? null : (v) => _toggle(morning, v),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              morning ? Icons.wb_sunny_outlined : Icons.bedtime_outlined,
            ),
            title: Text(morning ? 'Время утром' : 'Время вечером'),
            trailing: Text(morning ? s.morningReminderTime : s.reminderTime),
            onTap: () => _time(morning),
          ),
        ],
      ],
    );
  }
}
