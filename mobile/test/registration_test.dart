import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/registration.dart';
import 'package:somna/data/store.dart';

import 'helpers.dart';

class DelayedPersistence extends MemoryPersistence {
  Completer<void>? gate;
  @override
  Future<void> write(String serialized) async {
    await gate?.future;
    await super.write(serialized);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final now = DateTime(2030, 1, 2, 9, 5);
  SomnaStore create(MemoryPersistence p) {
    final s = SomnaStore(persistence: p, now: () => now, autoRefresh: false);
    addTearDown(s.dispose);
    return s;
  }

  for (final email in [
    'mira@example.com,',
    'mira@example..com',
    'mira@-example.com',
    'mira@example-.com',
    '.mira@example.com',
    'mi..ra@example.com',
  ]) {
    test(
      'rejects malformed email $email',
      () => expect(
        validateRegistration(
          RegistrationInput(name: 'Мира', email: email),
        )['email'],
        isNotEmpty,
      ),
    );
  }
  for (final email in [
    'mira+sleep@example.com',
    'mira.ivanova@my-domain.example',
    ' MIRA@Example.com ',
    'мира@example.com',
    'мира@почта.рф',
  ]) {
    test(
      'allows valid email $email',
      () => expect(
        validateRegistration(RegistrationInput(name: 'Мира', email: email)),
        isEmpty,
      ),
    );
  }
  test('Unicode normalization length is validated before saving', () async {
    expect(
      validateRegistration(
        RegistrationInput(name: 'Мира', email: '${'İ' * 64}@example.com'),
      )['email'],
      isNotEmpty,
    );
    final p = MemoryPersistence(), first = create(MemoryPersistence());
    final s = create(p);
    await s.registerLocalProfile(
      RegistrationInput(name: 'Мира', email: '${'İ' * 32}@example.com'),
    );
    final email = s.localAccount!.email;
    expect(email, '${'i\u0307' * 32}@example.com');
    expect(create(p).localAccount?.email, email);
    expect(first.localAccount, null);
  });
  test('normalized identity persists without replacing journal or settings; creation time stable', () async {
    final p = MemoryPersistence(), s = create(MemoryPersistence());
    final first = create(p);
    await first.finishOnboarding({'userName': 'Мира', 'bedGoal': '00:15'});
    first.addMood(const MoodEntry(valence: 0.4, emotions: ['Спокойствие']));
    final moods = first.moods.map((m) => m.toJson()).toList(),
        nights = first.nights.map((n) => n.toJson()).toList();
    await first.registerLocalProfile(
      const RegistrationInput(name: '  Мира  ', email: '  MIRA@Example.com  '),
    );
    expect(first.userName, 'Мира');
    final createdAt = first.localAccount!.createdAt;
    final restored = create(p);
    expect(restored.localAccount?.toJson(), {
      'email': 'mira@example.com',
      'createdAt': createdAt,
    });
    expect(restored.bedGoal, '00:15');
    expect(restored.onboarded, true);
    expect(restored.moods.map((m) => m.toJson()), moods);
    expect(restored.nights.map((n) => n.toJson()), nights);
    await restored.registerLocalProfile(
      const RegistrationInput(name: 'Мира', email: 'new@example.com'),
    );
    expect(restored.localAccount?.toJson(), {
      'email': 'new@example.com',
      'createdAt': createdAt,
    });
    expect(s.localAccount, null);
  });
  for (final saved in [
    null,
    [],
    {},
    {'email': 'not-an-email', 'createdAt': '2026-01-01'},
    {'email': 'mira@example.com', 'createdAt': 'invalid'},
  ]) {
    test(
      'ignores invalid registration $saved',
      () => expect(normalizeLocalAccount(saved), null),
    );
  }
  test('field errors for missing and long values', () {
    expect(validateRegistration(const RegistrationInput(name: '', email: '')), {
      'name': 'Введите имя',
      'email': 'Введите почту',
    });
    expect(
      validateRegistration(
        RegistrationInput(name: 'a' * 21, email: 'mira@example.com'),
      )['name'],
      'Не больше 20 символов',
    );
    expect(
      validateRegistration(
        RegistrationInput(name: 'Мира', email: '${'a' * 65}@example.com'),
      )['email'],
      isNotEmpty,
    );
  });
  test('invalid registration cannot create identity', () async {
    final p = MemoryPersistence(), s = create(MemoryPersistence());
    final persisted = create(p);
    await expectLater(
      persisted.registerLocalProfile(
        const RegistrationInput(name: '', email: 'wrong@'),
      ),
      throwsArgumentError,
    );
    expect(persisted.localAccount, null);
    expect(p.raw, null);
    expect(s.localAccount, null);
  });
  test('failed atomic registration preserves old profile and journal, then retries', () async {
    final p = MemoryPersistence.json({
      'userName': 'Old name',
      'localAccount': {
        'email': 'old@example.com',
        'createdAt': '2026-01-01T00:00:00.000Z',
      },
    });
    final s = create(p);
    await s.flush();
    final before = p.raw;
    p.fail = true;
    await expectLater(
      s.registerLocalProfile(
        const RegistrationInput(name: 'Мира', email: 'new@example.com'),
      ),
      throwsStateError,
    );
    expect(p.raw, before);
    expect(s.userName, 'Old name');
    expect(s.localAccount?.email, 'old@example.com');
    p.fail = false;
    await s.registerLocalProfile(
      const RegistrationInput(name: 'Мира', email: 'new@example.com'),
    );
    expect(p.json['userName'], 'Мира');
    expect(p.json['localAccount']['email'], 'new@example.com');
  });
  test(
    'reset to empty journal preserves registration and onboarding',
    () async {
      final s = create(MemoryPersistence());
      await s.finishOnboarding({});
      await s.registerLocalProfile(
        const RegistrationInput(name: 'Мира', email: 'mira@example.com'),
      );
      final identity = s.localAccount?.toJson();
      s.patch({'theme': 'dark'});
      s.addMood(const MoodEntry(valence: .4));
      expect(s.moods.length, 1);
      s.resetAll();
      expect(s.localAccount?.toJson(), identity);
      expect(s.userName, 'Мира');
      expect(s.onboarded, true);
      expect(s.nights, isEmpty);
      expect(s.moods, isEmpty);
      expect(s.theme, 'system');
    },
  );
  test(
    'older instance imports registration before next journal save',
    () async {
      final p = MemoryPersistence(), first = create(MemoryPersistence());
      final registered = create(p), older = create(p);
      await older.flush();
      await registered.registerLocalProfile(
        const RegistrationInput(name: 'Мира', email: 'mira@example.com'),
      );
      older.reloadFromStorage();
      expect(older.localAccount?.email, 'mira@example.com');
      older.addWater(250);
      await older.flush();
      expect(p.json['localAccount']['email'], 'mira@example.com');
      expect(p.json['userName'], 'Мира');
      expect(first.localAccount, null);
    },
  );
  test(
    'edits while registration is awaiting storage are not discarded',
    () async {
      final p = DelayedPersistence(), s = create(MemoryPersistence());
      final registered = create(p);
      await registered.flush();
      p.gate = Completer<void>();
      final registering = registered.registerLocalProfile(
        const RegistrationInput(name: 'Мира', email: 'mira@example.com'),
      );
      registered.addMood(const MoodEntry(valence: 0.7, emotions: ['Ясность']));
      p.gate!.complete();
      await registering;
      await registered.flush();
      expect(registered.moods.last.emotions, ['Ясность']);
      expect(p.json['moods'].last['emotions'], ['Ясность']);
      expect(p.json['localAccount']['email'], 'mira@example.com');
      expect(s.localAccount, null);
    },
  );
}
