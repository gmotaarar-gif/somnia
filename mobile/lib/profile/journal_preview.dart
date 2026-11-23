import 'package:material_ui/material_ui.dart';

import '../data/store.dart';
import '../logic/time.dart';
import '../logic/valence.dart';
import '../ui/dots.dart';
import '../ui/glow.dart';

/// The profile's door to the journal: counts and the last record of each
/// kind, with a button into each list.
class JournalPreview extends StatelessWidget {
  const JournalPreview({super.key});
  @override
  Widget build(BuildContext context) {
    final s = SomnaScope.of(context);
    final night = s.nights.lastOrNull, mood = s.moods.lastOrNull;
    return BevelGlass(
      glow: const Color(0xff7045ff),
      intensity: .85,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(4, 4, 4, 12),
            child: Text(
              'Мои записи',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: _Door(
                  label: 'Сон',
                  count: s.nights.length,
                  last: night == null
                      ? 'пока пусто'
                      : '${relativeDay(night.dateKey)} · ${hm(night.durationMin)}',
                  icon: Icons.bedtime_outlined,
                  onTap: () => s.openSheet('journal', 'nights'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _Door(
                  label: 'Настроение',
                  count: s.moods.length,
                  last: mood == null
                      ? 'пока пусто'
                      : getValenceLabel(mood.valence),
                  icon: Icons.blur_on_rounded,
                  onTap: () => s.openSheet('journal', 'moods'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Door extends StatelessWidget {
  final String label, last;
  final int count;
  final IconData icon;
  final VoidCallback onTap;
  const _Door({
    required this.label,
    required this.count,
    required this.last,
    required this.icon,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => TiltPress(
    label: '$label: $count',
    onPressed: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0x14ffffff),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0x1fffffff)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: Colors.white),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: Colors.white),
                ),
              ),
              const Icon(
                Icons.arrow_outward_rounded,
                size: 14,
                color: Color(0x99ffffff),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Dots(value: count, size: 24, color: Colors.white),
          const SizedBox(height: 8),
          Text(
            last,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: Color(0xb3ffffff)),
          ),
        ],
      ),
    ),
  );
}
