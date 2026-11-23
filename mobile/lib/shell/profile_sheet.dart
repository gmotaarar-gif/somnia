import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/time.dart';
import '../native/export.dart';
import '../native/reminders.dart';
import '../profile/account.dart';
import '../profile/appearance_picker.dart';
import '../profile/journal_preview.dart';
import '../profile/controls.dart';
import '../profile/slide_to_confirm.dart';
import '../profile/subscription_sheet.dart';
import '../theme/tokens.dart';
import '../ui/surfaces.dart';

enum _Confirm { widgets, journal }

class ProfileSheet extends StatefulWidget {
  final ReminderService? reminders;
  final DataExporter? exporter;
  const ProfileSheet({super.key, this.reminders, this.exporter});
  @override
  State<ProfileSheet> createState() => _ProfileSheetState();
}

class _ProfileSheetState extends State<ProfileSheet> {
  final _name = TextEditingController(), _confirmKey = GlobalKey();
  _Confirm? _confirm;
  bool _wiped = false;
  Timer? _wipedTimer;

  void _ask(_Confirm value) {
    setState(() => _confirm = value);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final target = _confirmKey.currentContext;
      if (target == null) return;
      Scrollable.ensureVisible(
        target,
        alignment: 1,
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : SomnaMotion.fast,
      );
    });
  }

  void _reset(SomnaStore store) {
    store.resetAll();
    setState(() => _wiped = true);
    // The slider holds its done state for a moment before it folds away.
    _wipedTimer = Timer(const Duration(milliseconds: 1400), () {
      if (mounted) {
        setState(() {
          _wiped = false;
          _confirm = null;
        });
      }
    });
  }

  @override
  void dispose() {
    _wipedTimer?.cancel();
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context), c = SomnaColors.of(context);
    if (_name.text != s.userName) _name.text = s.userName;
    final practiceMin = s.sessions.fold<double>(0, (a, x) => a + x.min).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        SheetHeader(
          title: 'Профиль',
          description: 'Данные хранятся только на этом устройстве',
          onClose: () => s.openSheet(null),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _hero(s, practiceMin),
              const JournalPreview(),
              const SizedBox(height: 12),
              Field(
                label: 'Оформление',
                child: AppearancePicker(
                  value: s.theme,
                  onChanged: (theme) => s.patch({'theme': theme}),
                ),
              ),
              const SizedBox(height: 12),
              SettingsGroup(
                children: [
                  SettingsRow(
                    icon: Icons.workspace_premium_outlined,
                    title: 'Достижения',
                    sub: 'Серии, рекорды и первые шаги',
                    onPressed: () => s.openSheet('awards'),
                  ),
                  SettingsRow(
                    icon: Icons.insights_outlined,
                    title: 'Глубокая аналитика',
                    sub: s.isPlus
                        ? 'Сон против настроения, ритм недели'
                        : 'Доступно с Plus',
                    onPressed: () => s.openSheet('insights'),
                  ),
                  if (s.weeklyGoal != null)
                    SettingsRow(
                      icon: Icons.auto_awesome_outlined,
                      title: 'Цель недели',
                      sub: s.weeklyGoal!.text,
                      onPressed: () => s.openSheet('recap'),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              const LocalAccountCard(),
              const SizedBox(height: 12),
              const SubscriptionCard(),
              Field(
                label: 'Цель сна',
                hint: durationRu(spanMinutes(s.bedGoal, s.wakeGoal)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TimeField(
                            label: 'Отбой',
                            value: s.bedGoal,
                            onChanged: (v) => s.patch({'bedGoal': v}),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TimeField(
                            label: 'Подъём',
                            value: s.wakeGoal,
                            onChanged: (v) => s.patch({'wakeGoal': v}),
                          ),
                        ),
                      ],
                    ),
                    ReminderControls(reminders: widget.reminders),
                  ],
                ),
              ),
              Field(
                label: 'Хронотип',
                child: Segmented<String>(
                  label: 'Хронотип',
                  value: s.chronotype,
                  onChanged: (v) => s.patch({'chronotype': v}),
                  options: const [
                    ('early', 'Жаворонок'),
                    ('balanced', 'Голубь'),
                    ('night', 'Сова'),
                  ],
                ),
              ),
              Field(
                label: 'Данные',
                child: SettingsGroup(
                  children: [
                    SettingsRow(
                      icon: Icons.file_download_outlined,
                      title: 'Экспорт данных',
                      sub: 'Файл JSON со всеми записями',
                      onPressed: () =>
                          (widget.exporter ?? DataExporter(CacheShareTarget()))
                              .export(s),
                    ),
                    SettingsRow(
                      icon: Icons.grid_view_outlined,
                      title: 'Виджеты по умолчанию',
                      onPressed: () => _ask(_Confirm.widgets),
                    ),
                    SettingsRow(
                      icon: Icons.restart_alt,
                      title: 'Пройти знакомство заново',
                      onPressed: () {
                        s.patch({'onboarded': false});
                        s.openSheet(null);
                      },
                    ),
                    SettingsRow(
                      danger: true,
                      icon: Icons.delete_outline,
                      title: 'Сбросить журнал',
                      sub: 'Удалит записи и сбросит настройки',
                      onPressed: () => _ask(_Confirm.journal),
                    ),
                  ],
                ),
              ),
              if (_confirm != null) _confirmation(s, c),
            ],
          ),
        ),
      ],
    );
  }

  Widget _hero(SomnaStore s, int practiceMin) {
    const soft = Color.fromRGBO(255, 255, 255, .5);
    final name = s.userName.trim();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.6,
          colors: [
            Color.alphaBlend(
              const Color.fromRGBO(174, 159, 240, .18),
              const Color(0xff1a1921),
            ),
            const Color(0xff1a1921),
          ],
          stops: const [0, .7],
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              ExcludeSemantics(
                child: Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: Color.fromRGBO(201, 185, 239, .15),
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    name.isEmpty ? 'S' : name.characters.first.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w500,
                      color: Color(0xffded1fa),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Semantics(
                  label: 'Имя',
                  child: TextField(
                    key: const ValueKey('profile-name'),
                    controller: _name,
                    maxLength: 20,
                    textCapitalization: TextCapitalization.words,
                    autofillHints: const [AutofillHints.givenName],
                    cursorColor: SomnaColors.lime,
                    onChanged: (v) => s.patch({'userName': v}),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -.84,
                      color: Colors.white,
                    ),
                    decoration: const InputDecoration.collapsed(
                      hintText: 'Ваше имя',
                      hintStyle: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -.84,
                        color: soft,
                      ),
                    ).copyWith(counterText: '', semanticCounterText: ''),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.only(top: 16),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Color.fromRGBO(255, 255, 255, .08)),
              ),
            ),
            child: Row(
              children: [
                for (final (i, (value, label)) in [
                  (
                    s.nights.length,
                    pluralRu(s.nights.length, ['ночь', 'ночи', 'ночей']),
                  ),
                  (
                    s.moods.length,
                    pluralRu(s.moods.length, ['чек-ин', 'чек-ина', 'чек-инов']),
                  ),
                  (practiceMin, 'мин практик'),
                ].indexed) ...[
                  if (i > 0) const SizedBox(width: 12),
                  Expanded(
                    child: MergeSemantics(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$value',
                            style: const TextStyle(
                              fontSize: 22,
                              height: 1,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -.66,
                              color: Colors.white,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            label,
                            style: const TextStyle(fontSize: 12, color: soft),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _confirmation(SomnaStore s, SomnaColors c) {
    final widgets = _confirm == _Confirm.widgets;
    return Semantics(
      key: _confirmKey,
      container: true,
      label: widgets ? 'Восстановить виджеты?' : 'Сбросить журнал?',
      child: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                widgets
                    ? 'Порядок, размеры и оформление стандартных виджетов вернутся к начальным настройкам. Ваши привычки сохранятся.'
                    : 'Все записи будут удалены, а настройки сброшены. Имя и локальный профиль сохранятся. Это нельзя отменить — сначала экспортируйте журнал.',
                style: TextStyle(fontSize: 13, height: 1.625, color: c.ink2),
              ),
            ),
            if (widgets) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: SomnaButton(
                      label: 'Отмена',
                      variant: SomnaButtonVariant.glass,
                      onPressed: () => setState(() => _confirm = null),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: SomnaButton(
                      label: 'Да, восстановить',
                      onPressed: () {
                        s.resetWidgets();
                        setState(() => _confirm = null);
                      },
                    ),
                  ),
                ],
              ),
            ] else ...[
              const SizedBox(height: 16),
              SlideToConfirm(
                label: 'Сдвиньте, чтобы сбросить',
                doneLabel: 'Журнал сброшен',
                onConfirm: () => _reset(s),
              ),
              const SizedBox(height: 8),
              SomnaButton(
                label: 'Отмена',
                variant: SomnaButtonVariant.ghost,
                onPressed: _wiped
                    ? null
                    : () => setState(() => _confirm = null),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Bedtime and morning check-in reminders with their own times.
class ReminderControls extends StatefulWidget {
  final ReminderService? reminders;
  const ReminderControls({super.key, this.reminders});
  @override
  State<ReminderControls> createState() => _ReminderControlsState();
}

class _ReminderControlsState extends State<ReminderControls> {
  bool _busy = false;
  Future<void> _toggle(bool morning, bool enabled) async {
    if (_busy) return;
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

  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final morning in [false, true]) ...[
          const SizedBox(height: 12),
          GlassSurface(
            radius: 22,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: ExcludeSemantics(
                    child: Text(
                      morning ? 'Утренний чек-ин' : 'Напоминать об отбое',
                      style: const TextStyle(fontSize: 15),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                SomnaToggle(
                  label: morning ? 'Утренний чек-ин' : 'Напоминать об отбое',
                  value: morning ? s.morningReminder : s.reminder,
                  onChanged: _busy ? null : (v) => _toggle(morning, v),
                ),
              ],
            ),
          ),
          if (morning ? s.morningReminder : s.reminder) ...[
            const SizedBox(height: 12),
            TimeField(
              label: morning ? 'Время чек-ина' : 'Время',
              value: morning ? s.morningReminderTime : s.reminderTime,
              onChanged: (v) => s.patch({
                morning ? 'morningReminderTime' : 'reminderTime': v,
              }),
            ),
          ],
        ],
      ],
    );
  }
}
