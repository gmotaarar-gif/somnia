import 'models.dart';

String normalizeEmail(String email) =>
    email.trim().replaceAll('İ', 'i\u0307').toLowerCase();

bool _validEmail(String email) {
  final parts = email.split('@');
  if (parts.length != 2) return false;
  final local = parts[0], domain = parts[1];
  return domain.isNotEmpty &&
      local.length <= 64 &&
      RegExp(
        r"^[\p{L}\p{N}\p{M}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}\p{M}!#$%&'*+/=?^_`{|}~-]+)*$",
        unicode: true,
      ).hasMatch(local) &&
      domain.length <= 253 &&
      domain.contains('.') &&
      domain
          .split('.')
          .every(
            (label) =>
                label.length <= 63 &&
                RegExp(
                  r'^[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?$',
                  unicode: true,
                ).hasMatch(label),
          );
}

Map<String, String> validateRegistration(RegistrationInput input) {
  final errors = <String, String>{};
  final normalized = normalizeEmail(input.email);
  if (input.name.trim().isEmpty) {
    errors['name'] = 'Введите имя';
  } else if (input.name.trim().length > 20) {
    errors['name'] = 'Не больше 20 символов';
  }
  if (normalized.isEmpty) {
    errors['email'] = 'Введите почту';
  } else if (normalized.length > 254 || !_validEmail(normalized)) {
    errors['email'] = 'Проверьте адрес, например name@example.com';
  }
  return errors;
}

LocalAccount? normalizeLocalAccount(Object? saved) {
  if (saved is! Map ||
      saved['email'] is! String ||
      saved['createdAt'] is! String) {
    return null;
  }
  final email = saved['email'] as String,
      createdAt = saved['createdAt'] as String;
  if (validateRegistration(RegistrationInput(name: 'Somna', email: email))
          .containsKey('email') ||
      DateTime.tryParse(createdAt) == null) {
    return null;
  }
  return LocalAccount(email: normalizeEmail(email), createdAt: createdAt);
}
