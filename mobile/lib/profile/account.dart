import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/registration.dart';
import '../data/store.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/sheets.dart';
import '../ui/surfaces.dart';
import 'controls.dart';

/// Opens local registration above the current sheet.
Future<void> showRegistrationSheet(BuildContext context) =>
    showSomnaSheet<void>(context, builder: (_) => const RegistrationSheet());

/// Account entry in the profile: local identity only, no password or sync.
class LocalAccountCard extends StatelessWidget {
  const LocalAccountCard({super.key});
  @override
  Widget build(BuildContext context) {
    final account = SomnaScope.of(context).localAccount;
    final c = SomnaColors.of(context);
    return PressScale(
      label: account == null
          ? 'Создать локальный профиль'
          : 'Изменить локальный профиль',
      onPressed: () => showRegistrationSheet(context),
      child: GlassSurface(
        radius: 26,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: c.accent.withValues(alpha: .12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                account == null ? Icons.person_add_alt_1_outlined : Icons.check,
                size: 20,
                color: c.accent,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    account == null ? 'Создать профиль' : 'Локальный профиль',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    account?.email ?? 'Без пароля. В вашем ритме.',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: c.ink2),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.smartphone, size: 12, color: c.ink3),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          'Только это устройство · без синхронизации',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11, color: c.ink3),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            Icon(Icons.arrow_outward, size: 18, color: c.ink3),
          ],
        ),
      ),
    );
  }
}

class RegistrationSheet extends StatelessWidget {
  const RegistrationSheet({super.key});
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    mainAxisSize: MainAxisSize.min,
    children: [
      SheetHeader(
        title: SomnaScope.of(context).localAccount == null
            ? 'Регистрация'
            : 'Ваш профиль',
        description: 'Небольшой шаг к вашему ритму',
        onClose: () => Navigator.of(context).pop(),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: RegistrationForm(onClose: () => Navigator.of(context).pop()),
      ),
    ],
  );
}

class RegistrationForm extends StatefulWidget {
  final VoidCallback onClose;
  const RegistrationForm({super.key, required this.onClose});
  @override
  State<RegistrationForm> createState() => _RegistrationFormState();
}

class _RegistrationFormState extends State<RegistrationForm> {
  final _name = TextEditingController(), _email = TextEditingController();
  final _nameFocus = FocusNode(), _emailFocus = FocusNode();
  Map<String, String> _errors = const {};
  bool _ready = false,
      _editing = false,
      _saving = false,
      _saved = false,
      _storageError = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) return;
    _ready = true;
    final store = SomnaScope.of(context);
    _name.text = store.userName;
    _email.text = store.localAccount?.email ?? '';
    _editing = store.localAccount != null;
  }

  Future<void> _submit() async {
    if (_saving) return;
    final input = RegistrationInput(name: _name.text, email: _email.text);
    final errors = validateRegistration(input);
    setState(() {
      _errors = errors;
      _storageError = false;
    });
    if (errors.isNotEmpty) {
      (errors.containsKey('name') ? _nameFocus : _emailFocus).requestFocus();
      return;
    }
    final store = SomnaScope.of(context);
    setState(() => _saving = true);
    try {
      await store.registerLocalProfile(input);
      if (!mounted) return;
      FocusManager.instance.primaryFocus?.unfocus();
      setState(() => _saved = true);
    } catch (_) {
      if (mounted) setState(() => _storageError = true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _nameFocus.dispose();
    _emailFocus.dispose();
    super.dispose();
  }

  Widget _input({
    required String id,
    required String label,
    required String hint,
    required IconData icon,
    required TextEditingController controller,
    required FocusNode focus,
    required int maxLength,
    bool email = false,
  }) {
    final c = SomnaColors.of(context), error = _errors[id];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: c.ink2,
          ),
        ),
        const SizedBox(height: 8),
        ListenableBuilder(
          listenable: focus,
          builder: (context, child) => DecoratedBox(
            position: DecorationPosition.foreground,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: focus.hasFocus
                  ? Border.all(color: SomnaColors.lime, width: 2)
                  : error != null
                  ? Border.all(color: const Color(0xffff8f8f))
                  : null,
            ),
            child: child,
          ),
          child: GlassSurface(
            radius: 20,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(icon, size: 18, color: c.ink3),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: Center(
                      child: TextField(
                        key: ValueKey('registration-$id'),
                        controller: controller,
                        focusNode: focus,
                        maxLength: maxLength,
                        keyboardType: email
                            ? TextInputType.emailAddress
                            : TextInputType.name,
                        textCapitalization: email
                            ? TextCapitalization.none
                            : TextCapitalization.words,
                        autocorrect: false,
                        enableSuggestions: !email,
                        autofillHints: [
                          email ? AutofillHints.email : AutofillHints.givenName,
                        ],
                        textInputAction: email
                            ? TextInputAction.done
                            : TextInputAction.next,
                        onSubmitted: (_) =>
                            email ? _submit() : _emailFocus.requestFocus(),
                        onChanged: (_) {
                          if (error != null) {
                            setState(() => _errors = {..._errors}..remove(id));
                          }
                        },
                        style: const TextStyle(fontSize: 16),
                        decoration: InputDecoration.collapsed(
                          hintText: hint,
                          hintStyle: TextStyle(fontSize: 16, color: c.ink3),
                        ).copyWith(counterText: '', semanticCounterText: ''),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (error != null) ...[
          const SizedBox(height: 8),
          Semantics(
            liveRegion: true,
            child: Text(error, style: TextStyle(fontSize: 12, color: c.danger)),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = SomnaColors.of(context);
    if (_saved) {
      return Semantics(
        container: true,
        liveRegion: true,
        child: Column(
          children: [
            const SizedBox(height: 16),
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: SomnaColors.lime,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check,
                size: 36,
                color: SomnaColors.limeInk,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Профиль готов, ${_name.text.trim()}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 28,
                height: 1.2,
                fontWeight: FontWeight.w600,
                letterSpacing: -1.12,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Имя и почта сохранены на этом устройстве. Ваш журнал и настройки остались на месте.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, height: 1.625, color: c.ink2),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: SomnaButton(
                label: 'Продолжить',
                icon: Icons.arrow_forward,
                onPressed: widget.onClose,
              ),
            ),
          ],
        ),
      );
    }
    return AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color.fromRGBO(167, 139, 250, .1),
              borderRadius: BorderRadius.circular(26),
              border: Border.all(
                color: const Color.fromRGBO(196, 181, 253, .15),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.smartphone, size: 16, color: c.accent),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Ваше пространство, на этом устройстве',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Профиль хранится только на этом устройстве. Почту не проверяем и писем не отправляем. Синхронизации и входа с другого устройства пока нет.',
                  style: TextStyle(fontSize: 13, height: 1.625, color: c.ink2),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          _input(
            id: 'name',
            label: 'Как к вам обращаться',
            hint: 'Ваше имя',
            icon: Icons.person_outline,
            controller: _name,
            focus: _nameFocus,
            maxLength: 20,
          ),
          const SizedBox(height: 20),
          _input(
            id: 'email',
            label: 'Почта',
            hint: 'name@example.com',
            icon: Icons.mail_outline,
            controller: _email,
            focus: _emailFocus,
            maxLength: 254,
            email: true,
          ),
          if (_storageError) ...[
            const SizedBox(height: 16),
            Semantics(
              liveRegion: true,
              child: Text(
                'Не удалось сохранить профиль. Освободите место на устройстве и попробуйте ещё раз.',
                style: TextStyle(fontSize: 13, height: 1.625, color: c.danger),
              ),
            ),
          ],
          const SizedBox(height: 28),
          SomnaButton(
            label: _editing
                ? 'Сохранить изменения'
                : 'Создать локальный профиль',
            icon: Icons.arrow_forward,
            height: 56,
            onPressed: _saving ? null : _submit,
          ),
          const SizedBox(height: 8),
          SomnaButton(
            label: _editing ? 'Отмена' : 'Пока без регистрации',
            variant: SomnaButtonVariant.ghost,
            onPressed: widget.onClose,
          ),
          const SizedBox(height: 8),
          Text(
            'Удаление данных приложения удалит локальный профиль. Журнал можно выгрузить в настройках профиля.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, height: 1.625, color: c.ink3),
          ),
        ],
      ),
    );
  }
}
