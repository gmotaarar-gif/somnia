import 'dart:convert';
import 'dart:math' as math;

import '../logic/time.dart';
import 'models.dart';

const subscriptionKey = 'somna-subscription-v1';
const subscriptionPlans = {
  'monthly': (title: 'На месяц', price: 299, months: 1),
  'yearly': (title: 'На год', price: 1990, months: 12),
};

Membership membershipFor(SubscriptionPlan plan, [DateTime? at]) {
  final start = (at ?? DateTime.now()).toUtc();
  final months = subscriptionPlans[plan]?.months;
  if (months == null) throw ArgumentError.value(plan, 'plan');
  final month = DateTime.utc(start.year, start.month + months);
  final lastDay = DateTime.utc(month.year, month.month + 1, 0).day;
  final end = DateTime.utc(
    month.year,
    month.month,
    math.min(start.day, lastDay),
    start.hour,
    start.minute,
    start.second,
    start.millisecond,
    start.microsecond,
  );
  return Membership(plan: plan, startedAt: isoUtc(start), endsAt: isoUtc(end));
}

Membership? normalizeMembership(Object? value) {
  if (value is! Map ||
      !subscriptionPlans.containsKey(value['plan']) ||
      value['startedAt'] is! String ||
      value['endsAt'] is! String) {
    return null;
  }
  final start = DateTime.tryParse(value['startedAt']),
      end = DateTime.tryParse(value['endsAt']);
  if (start == null || end == null || !end.isAfter(start)) return null;
  return Membership(
    plan: value['plan'],
    startedAt: value['startedAt'],
    endsAt: value['endsAt'],
  );
}

Membership? parseMembership(String? raw) {
  try {
    return normalizeMembership(jsonDecode(raw ?? 'null'));
  } catch (_) {
    return null;
  }
}

bool membershipIsActive(Membership? membership, [DateTime? now]) {
  final at = now ?? DateTime.now();
  return membership != null &&
      !DateTime.parse(membership.startedAt).isAfter(at) &&
      DateTime.parse(membership.endsAt).isAfter(at);
}
