import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:somna/data/defaults.dart';
import 'package:somna/data/models.dart';
import 'package:somna/data/store.dart';

import 'helpers.dart';

void main() {
  test(
    'web state JSON round-trips every persisted contract and optional field',
    () {
      final web = defaultState(DateTime(2030, 1, 2)).toJson()
        ..remove('membership');
      web.addAll({
        'onboarded': true,
        'userName': 'Мира',
        'theme': 'dark',
        'chronotype': 'night',
        'localAccount': {
          'email': 'mira@example.com',
          'createdAt': '2026-01-01T00:00:00.000Z',
        },
        'weeklyGoal': {'id': 'screen', 'text': 'Без экрана за 30 минут до сна'},
        'widgets': [
          {
            'id': 'custom',
            'kind': 'custom',
            'size': '2x1',
            'tone': 'rose',
            'visible': true,
            'title': 'Вода',
            'unit': 'мл',
            'day': '2030-01-02',
            'target': 2000,
            'step': 250,
            'value': 500,
          },
        ],
        'worries': [
          {
            'id': 'w',
            'at': '2030-01-02T07:00:00.000Z',
            'text': 'Задача',
            'plan': 'Завтра',
            'done': false,
          },
        ],
        'readArticles': ['article-1'],
        'nights': [night('2030-01-01').toJson()],
        'moods': [mood(1, 0.4).toJson()],
        'sessions': [session(1).toJson()],
        'spectrum': [
          {
            'id': 'calm',
            'left': 'Тревога',
            'right': 'Спокойствие',
            'value': 0.5,
          },
        ],
        'wellbeing': [
          {'at': '2030-01-01T07:00:00.000Z', 'score': 64},
        ],
        'ritual': {
          'day': '2030-01-02',
          'done': ['dim'],
        },
        'water': {'day': '2030-01-02', 'ml': 750},
        'morningReminder': true,
        'morningReminderTime': '08:00',
        'soundTimer': 45,
      });
      final snapshot = jsonDecode(jsonEncode(web)) as JsonMap;
      final restored = SomnaState.fromJson(snapshot);
      final roundTrip = restored.toJson()..remove('membership');
      expect(roundTrip, web);
      expect(
        SleepNight.fromJson({
          ...restored.nights.first.toJson(),
          'note': 'Запись',
        }).toJson()['note'],
        'Запись',
      );
      expect(
        MoodEntry.fromJson({
          ...restored.moods.first.toJson(),
          'note': 'Настроение',
        }).toJson()['note'],
        'Настроение',
      );
      expect(
        Worry.fromJson(restored.worries.first.toJson()).toJson(),
        restored.worries.first.toJson(),
      );
    },
  );
  test('normalization preserves a full current-layout state snapshot', () {
    final at = DateTime(2030, 1, 2, 23, 30),
        state = defaultState(DateTime(2030, 1, 2));
    expect(
      loadState(jsonEncode(state.toJson()), now: at).toJson(),
      state.toJson(),
    );
  });
  test('a fresh install has no journal entries, counters or results', () {
    final state = defaultState(DateTime(2030, 1, 2));
    expect(state.nights, isEmpty);
    expect(state.moods, isEmpty);
    expect(state.sessions, isEmpty);
    expect(state.worries, isEmpty);
    expect(state.wellbeing, isEmpty);
    expect(state.spectrum, isEmpty);
    expect(state.readArticles, isEmpty);
    expect(state.weeklyGoal, isNull);
    expect(state.ritual.toJson(), {'day': '2030-01-02', 'done': []});
    expect(state.water.toJson(), {'day': '2030-01-02', 'ml': 0});
    expect(state.onboarded, false);
  });
  test(
    'empty journal arrays remain empty rather than acquiring demo entries',
    () {
      final state = defaultState(DateTime(2030, 1, 2)).patch({
        'nights': [],
        'moods': [],
        'sessions': [],
        'worries': [],
        'wellbeing': [],
        'readArticles': [],
        'weeklyGoal': null,
      });
      expect(SomnaState.fromJson(state.toJson()).toJson(), state.toJson());
    },
  );
  test('strict model parsing rejects malformed required data', () {
    expect(
      () => SleepNight.fromJson({'dateKey': '2030-01-02'}),
      throwsA(isA<TypeError>()),
    );
    expect(() => SomnaState.fromJson({}), throwsA(isA<TypeError>()));
  });
}
