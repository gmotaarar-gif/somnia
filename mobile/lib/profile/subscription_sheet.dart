import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../data/models.dart';
import '../data/store.dart';
import '../data/subscription.dart';
import '../theme/tokens.dart';
import '../ui/press_scale.dart';
import '../ui/surfaces.dart';
import 'controls.dart';

const _lilac = Color(0xffdac5ff), _violet = Color(0xffc4a3ff);
const _months = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/// `1990` → `1 990 ₽`, grouped as in ru-RU.
String rubles(int value) {
  final digits = value.toString(), out = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write('\u00a0');
    out.write(digits[i]);
  }
  return '$out ₽';
}

String membershipDateLabel(String iso) {
  final d = DateTime.parse(iso).toLocal();
  return '${d.day} ${_months[d.month - 1]} ${d.year} г.';
}

int get yearlySaving =>
    ((1 -
                subscriptionPlans['yearly']!.price /
                    (subscriptionPlans['monthly']!.price * 12)) *
            100)
        .round();

/// Plus entry in the profile.
class SubscriptionCard extends StatelessWidget {
  const SubscriptionCard({super.key});
  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context);
    final text = store.isPlus
        ? 'Подписка активна · управление'
        : 'Больше заботы о себе · узнать о подписке';
    return PressScale(
      label: 'somna plus. $text',
      onPressed: () => store.openSheet('subscription', 'profile'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: _violet.withValues(alpha: .25)),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xff352b4d), Color(0xff211c31), Color(0xff16151f)],
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _violet.withValues(alpha: .15),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.auto_awesome_outlined,
                size: 20,
                color: Color(0xffdbc5ff),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const Text(
                        'somna',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -.34,
                          color: Colors.white,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: _lilac,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'PLUS',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1,
                            color: Color(0xff2b174c),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    text,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.375,
                      color: Color(0xffdbd0eb),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            const Icon(Icons.arrow_outward, size: 20, color: _lilac),
          ],
        ),
      ),
    );
  }
}

/// Shows [child] to Plus members and the Plus offer to everyone else, so a
/// locked report can register `PlusGate(child: ...)` as its sheet.
class PlusGate extends StatelessWidget {
  final Widget child;
  const PlusGate({super.key, required this.child});
  @override
  Widget build(BuildContext context) => SomnaScope.of(context).isPlus
      ? child
      : const SubscriptionSheet(fromPractice: true);
}

/// Local demo entitlement: nothing is charged and nothing renews.
class SubscriptionSheet extends StatefulWidget {
  /// The sheet arg it was opened with: `profile` returns there on close.
  final String? arg;
  final bool fromPractice;
  const SubscriptionSheet({super.key, this.arg, this.fromPractice = false});
  @override
  State<SubscriptionSheet> createState() => _SubscriptionSheetState();
}

class _SubscriptionSheetState extends State<SubscriptionSheet> {
  SomnaStore? _store;
  SubscriptionPlan _plan = 'yearly';
  bool _confirm = false, _busy = false;

  bool get _backToProfile => widget.arg == 'profile' && !widget.fromPractice;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final store = SomnaScope.of(context);
    if (store == _store) return;
    _store?.removeListener(_returnToProfile);
    _store = store..addListener(_returnToProfile);
    if (store.subscriptionError != null) {
      scheduleMicrotask(() {
        if (mounted) store.clearSubscriptionError();
      });
    }
  }

  // A swipe or the back gesture clears the sheet; from the profile that
  // leads back to the profile, as the close button does.
  void _returnToProfile() {
    final store = _store!;
    if (!_backToProfile || store.sheet != null) return;
    scheduleMicrotask(() {
      if (mounted && store.sheet == null) store.openSheet('profile');
    });
  }

  void _close() => _store!.openSheet(_backToProfile ? 'profile' : null);

  Future<void> _enable() async {
    if (_busy) return;
    final store = _store!, fromPractice = widget.fromPractice;
    setState(() => _busy = true);
    final ok = await store.activate(_plan);
    if (ok) {
      store.notify('Somna Plus включён · без списаний');
      // Move to the explicit sheet so the confirmation survives the unlock.
      if (fromPractice) store.openSheet('subscription', 'insights');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _disable() async {
    final store = _store!;
    if (!await store.deactivate()) return;
    store.notify('Plus отключён. Ваши записи сохранены');
    if (mounted) setState(() => _confirm = false);
  }

  @override
  void dispose() {
    _store?.removeListener(_returnToProfile);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = SomnaScope.of(context), c = SomnaColors.of(context);
    final media = MediaQuery.of(context);
    final isPlus = store.isPlus, membership = store.membership;
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight:
            media.size.height * .93 -
            24 -
            media.padding.bottom -
            media.viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SheetHeader(
            title: 'somna plus',
            description: 'Больше пространства для отдыха',
            onClose: _close,
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _hero(isPlus),
                  if (isPlus && membership != null)
                    ..._active(membership, c)
                  else
                    ..._offer(c),
                  if (store.subscriptionError != null) ...[
                    const SizedBox(height: 16),
                    Semantics(
                      liveRegion: true,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color.fromRGBO(255, 93, 93, .1),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Text(
                          'Не удалось сохранить подписку. Освободите место на устройстве и попробуйте ещё раз.',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.625,
                            color: c.danger,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
            decoration: BoxDecoration(
              color: c.sheet,
              border: Border(top: BorderSide(color: c.hair)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SomnaButton(
                  label: isPlus ? 'Готово' : 'Включить Plus бесплатно',
                  icon: isPlus ? null : Icons.arrow_forward,
                  onPressed: isPlus
                      ? _close
                      : _busy
                      ? null
                      : _enable,
                ),
                const SizedBox(height: 10),
                Text(
                  isPlus ? 'Демодоступ · без оплаты и автопродления' : 'Это демо: деньги не списываются, карта не нужна. Цены выше — пример, не платёж.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, height: 1.625, color: c.ink3),
                ),
                if (!isPlus) ...[
                  const SizedBox(height: 8),
                  SomnaButton(
                    label: 'Продолжить бесплатно',
                    variant: SomnaButtonVariant.ghost,
                    height: 36,
                    fontSize: 12,
                    onPressed: _close,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _hero(bool isPlus) => Container(
    padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
    clipBehavior: Clip.antiAlias,
    foregroundDecoration: BoxDecoration(
      borderRadius: BorderRadius.circular(30),
      border: Border.all(color: Colors.white.withValues(alpha: .1)),
    ),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(30),
      gradient: RadialGradient(
        center: Alignment.topCenter,
        radius: 1.1,
        colors: [
          Color.alphaBlend(const Color(0x807552ab), const Color(0xff1d1929)),
          const Color(0xff1d1929),
        ],
        stops: const [0, .75],
      ),
    ),
    child: Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: _violet.withValues(alpha: .15),
            borderRadius: BorderRadius.circular(23),
            border: Border.all(
              color: const Color(0xffe1cfff).withValues(alpha: .3),
            ),
          ),
          child: Icon(
            isPlus ? Icons.check_circle_outline : Icons.auto_awesome_outlined,
            size: 32,
            color: const Color(0xffe1cfff),
          ),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.verified_user_outlined,
                size: 12,
                color: Color(0xffdbc5ff),
              ),
              SizedBox(width: 6),
              Text(
                'ЛОКАЛЬНАЯ ДЕМОВЕРСИЯ',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 1.3,
                  color: Color(0xffdbc5ff),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          isPlus ? 'Ваше время для себя' : 'Меньше напряжения.\nБольше себя.',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 28,
            height: 1.1,
            fontWeight: FontWeight.w600,
            letterSpacing: -1.12,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 270),
          child: Text(
            isPlus
                ? 'Plus уже включён на этом устройстве. Никаких списаний и автоматического продления.'
                : 'Откройте глубокую аналитику: связь сна и настроения, ритм по дням недели и лучшие ночи.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.625,
              color: Color(0xffd3c9e1),
            ),
          ),
        ),
      ],
    ),
  );

  List<Widget> _active(Membership membership, SomnaColors c) => [
    const SizedBox(height: 16),
    GlassSurface(
      radius: 24,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Plus · ${membership.plan == 'yearly' ? 'на год' : 'на месяц'}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: c.accent.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Активен',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: c.accent,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final (label, value) in [
            ('Доступ до', membershipDateLabel(membership.endsAt)),
            ('Автопродление', 'Выключено'),
            ('Оплачено', '0 ₽ · демо'),
          ])
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: MergeSemantics(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(fontSize: 13, color: c.ink3),
                      ),
                    ),
                    Text(value, style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
    const SizedBox(height: 12),
    PressScale(
      label: 'Глубокая аналитика. Ваш Plus-отчёт',
      onPressed: () => _store!.openSheet('insights'),
      child: GlassSurface(
        radius: 24,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(
              Icons.insights_outlined,
              size: 20,
              color: Color(0xffb794f0),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Глубокая аналитика',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Ваш Plus-отчёт · обновляется каждый день',
                    style: TextStyle(fontSize: 12, color: c.ink3),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward, size: 16, color: c.ink3),
          ],
        ),
      ),
    ),
    const SizedBox(height: 16),
    Text(
      'Доступ сохранён только на этом устройстве и не переносится на другие. Удаление данных приложения удалит демоподписку.',
      style: TextStyle(fontSize: 12, height: 1.625, color: c.ink3),
    ),
    if (_confirm) ...[
      const SizedBox(height: 20),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: c.ink.withValues(alpha: .12)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Отключить Plus сейчас?',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              'Глубокая аналитика снова станет недоступна. Журнал и все записи останутся с вами.',
              style: TextStyle(fontSize: 12, height: 1.625, color: c.ink2),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: SomnaButton(
                    label: 'Оставить Plus',
                    variant: SomnaButtonVariant.glass,
                    fontSize: 13,
                    onPressed: () => setState(() => _confirm = false),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SomnaButton(
                    label: 'Отключить',
                    variant: SomnaButtonVariant.danger,
                    fontSize: 13,
                    onPressed: _disable,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ] else ...[
      const SizedBox(height: 12),
      SomnaButton(
        label: 'Отключить демоподписку',
        variant: SomnaButtonVariant.ghost,
        fontSize: 13,
        onPressed: () => setState(() => _confirm = true),
      ),
    ],
  ];

  List<Widget> _offer(SomnaColors c) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final mark = dark ? const Color(0xffd7bdff) : const Color(0xff7a4fc4);
    return [
      if (widget.fromPractice) ...[
        const SizedBox(height: 16),
        Row(
          children: [
            Icon(Icons.lock_outline, size: 16, color: mark),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Глубокая аналитика доступна с Plus',
                style: TextStyle(fontSize: 13, color: mark),
              ),
            ),
          ],
        ),
      ],
      const SizedBox(height: 8),
      for (final (title, text) in const [
        ('Глубокая аналитика', 'Сон против настроения, ритм недели, рекорды'),
        ('Только на устройстве', 'Расчёты идут локально, без сервера'),
      ])
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(Icons.check, size: 16, color: mark),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(text, style: TextStyle(fontSize: 12, color: c.ink3)),
                  ],
                ),
              ),
            ],
          ),
        ),
      const SizedBox(height: 24),
      Text(
        'Выберите тариф · пример цен',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: c.ink3,
        ),
      ),
      const SizedBox(height: 2),
      for (final id in const ['yearly', 'monthly']) _planTile(id, c, mark),
      const SizedBox(height: 16),
      Text(
        'Дневник сна, чек-ины, статьи, заземление и дневник тревог остаются бесплатными.',
        style: TextStyle(fontSize: 12, height: 1.625, color: c.ink3),
      ),
    ];
  }

  Widget _planTile(SubscriptionPlan id, SomnaColors c, Color mark) {
    final option = subscriptionPlans[id]!, selected = _plan == id;
    final yearly = id == 'yearly';
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: PressScale(
        label:
            '${option.title}, ${rubles(option.price)} ${yearly ? 'за год' : 'за месяц'}',
        selected: selected,
        onPressed: () => setState(() => _plan = id),
        child: AnimatedContainer(
          duration: SomnaMotion.quick,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: selected
                ? _violet.withValues(alpha: .1)
                : c.ink.withValues(alpha: .03),
            borderRadius: BorderRadius.circular(23),
            border: Border.all(
              color: selected ? mark : c.ink.withValues(alpha: .12),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? mark : null,
                  border: Border.all(
                    color: selected ? mark : c.ink.withValues(alpha: .3),
                  ),
                ),
                child: selected
                    ? Icon(
                        Icons.check,
                        size: 14,
                        color: c == SomnaColors.dark
                            ? const Color(0xff251b35)
                            : Colors.white,
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          option.title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (yearly)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: SomnaColors.lime,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '−$yearlySaving%',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: SomnaColors.limeInk,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      yearly
                          ? '≈ ${rubles((option.price / 12).round())} в месяц'
                          : 'Для первого знакомства',
                      style: TextStyle(fontSize: 11, color: c.ink3),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    rubles(option.price),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -.6,
                    ),
                  ),
                  Text(
                    yearly ? 'за год' : 'за месяц',
                    style: TextStyle(fontSize: 11, color: c.ink3),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
