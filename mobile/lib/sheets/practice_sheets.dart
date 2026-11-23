import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/time.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'sheet_kit.dart';

class WorrySheet extends StatefulWidget {
  const WorrySheet({super.key});
  @override
  State<WorrySheet> createState() => _WorrySheetState();
}

class _WorrySheetState extends State<WorrySheet> {
  final _text = TextEditingController(), _plan = TextEditingController();

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    _plan.dispose();
    super.dispose();
  }

  void _save() {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    final store = SomnaScope.of(context);
    store.addWorry(text, _plan.text.trim());
    store.addSession('worry', 2);
    store.notify('Отложено до завтра');
    _text.clear();
    _plan.clear();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final worries = store.worries;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SheetHeader(
          title: 'Дневник тревог',
          description: 'Выгрузите мысль из головы и назначьте ей время: мозгу проще отпустить записанное',
          onClose: () => store.openSheet(null),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _FieldLabel('Что крутится в голове'),
              _GlassInput(
                controller: _text,
                label: 'Тревожная мысль',
                hint: 'Например: не успеваю с отчётом',
                maxLength: 240,
                lines: 3,
              ),
              const SizedBox(height: 24),
              const _FieldLabel('Первый маленький шаг завтра'),
              _GlassInput(
                controller: _plan,
                label: 'Шаг на завтра',
                hint: 'Например: в 10:00 написать план на 3 пункта',
                maxLength: 120,
                onSubmitted: _save,
              ),
              const SizedBox(height: 20),
              SheetButton(
                label: 'Отложить до завтра',
                onPressed: _text.text.trim().isEmpty ? null : _save,
              ),
              if (worries.isNotEmpty) ...[
                const SizedBox(height: 24),
                _FieldLabel(
                  'Отложенное',
                  hint: '${worries.where((w) => !w.done).length} открыто',
                ),
                for (final (i, w) in worries.indexed) ...[
                  if (i > 0) const SizedBox(height: 8),
                  GlassSurface(
                    key: ValueKey(w.id),
                    radius: 22,
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: PressScale(
                            label: w.done ? 'Вернуть' : 'Отметить решённым',
                            selected: w.done,
                            onPressed: () => store.toggleWorry(w.id),
                            child: AnimatedContainer(
                              duration: SomnaMotion.fast,
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: w.done
                                    ? SomnaColors.lime
                                    : Colors.transparent,
                                border: Border.all(
                                  color: w.done
                                      ? SomnaColors.lime
                                      : c.ink.withValues(alpha: .3),
                                ),
                              ),
                              child: w.done
                                  ? const Icon(
                                      Icons.check,
                                      size: 16,
                                      color: SomnaColors.limeInk,
                                    )
                                  : null,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AnimatedOpacity(
                            duration: SomnaMotion.fast,
                            opacity: w.done ? .45 : 1,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  w.text,
                                  style: TextStyle(
                                    fontSize: 15,
                                    height: 1.375,
                                    decoration: w.done
                                        ? TextDecoration.lineThrough
                                        : null,
                                  ),
                                ),
                                if (w.plan.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    '→ ${w.plan}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: c.ink2,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 4),
                                Text(
                                  _day(w.at),
                                  style: TextStyle(fontSize: 11, color: c.ink3),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        PressScale(
                          label: 'Удалить',
                          onPressed: () => store.removeWorry(w.id),
                          child: SizedBox.square(
                            dimension: 32,
                            child: Icon(
                              Icons.delete_outline,
                              size: 18,
                              color: c.ink3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

String _day(String at) {
  final date = DateTime.tryParse(at);
  return date == null ? '' : relativeDay(dateKey(date.toLocal()));
}

class _FieldLabel extends StatelessWidget {
  final String label;
  final String? hint;
  const _FieldLabel(this.label, {this.hint});
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: c.ink3,
              ),
            ),
          ),
          if (hint != null)
            Text(hint!, style: TextStyle(fontSize: 13, color: c.ink2)),
        ],
      ),
    );
  }
}

class _GlassInput extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final int maxLength, lines;
  final VoidCallback? onSubmitted;
  const _GlassInput({
    required this.controller,
    required this.label,
    required this.hint,
    required this.maxLength,
    this.lines = 1,
    this.onSubmitted,
  });
  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    final multi = lines > 1;
    return Semantics(
      label: label,
      child: GlassSurface(
        radius: multi ? 22 : 24,
        child: TextField(
          controller: controller,
          minLines: lines,
          maxLines: lines,
          maxLength: maxLength,
          textCapitalization: TextCapitalization.sentences,
          textInputAction: multi
              ? TextInputAction.newline
              : TextInputAction.done,
          onSubmitted: onSubmitted == null ? null : (_) => onSubmitted!(),
          cursorColor: c.ink,
          style: TextStyle(
            fontSize: 16,
            height: multi ? 1.625 : 1.25,
            color: c.ink,
          ),
          decoration: InputDecoration(
            isDense: true,
            filled: false,
            counterText: '',
            hintText: hint,
            hintStyle: TextStyle(color: c.ink3),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(
              horizontal: multi ? 16 : 20,
              vertical: multi ? 12 : 13,
            ),
          ),
        ),
      ),
    );
  }
}
