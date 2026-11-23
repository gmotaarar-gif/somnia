# Somna design: critique and redesign

## What was wrong

1. **Records lived in three places.** Sleep and Mind each kept their own
   swipe-to-delete list, while the profile had none. Statistics screens
   doubled as editors, which made both long and noisy.
2. **Flat surfaces.** Every block was the same smoked card. Nothing invited a
   tap, and the screen had no focal point beyond the hero.
3. **A static mood orb.** A gradient circle that changed colour. It did not
   react to touch and said nothing about the mood itself.
4. **Features nobody asked for.** Grounding 5-4-3-2-1, a 3 minute body scan,
   a full-screen night mode with dimming and generated noise. Heavy, hard to
   discover, and the night mode broke the "minute in the morning" promise.
5. **Little guidance.** Numbers without context: a user saw "7:04" and an
   index, but not what a cycle is or how much sleep is normal.
6. **Duplicated motion code.** Every screen had a private stagger widget
   (`_RiseIn`, `_Rise`, `_Appear`) with different timings.
7. **Onboarding felt like a form.** Thin progress bars, a white button, one
   cloud on step one and none afterwards.

## What changed

| Area | Change |
| --- | --- |
| Records | `JournalSheet` (Profile → Мои записи): nights and check-ins, month groups, period and tag filters, swipe-to-delete with undo. Sleep and Mind show statistics plus a link. |
| Surfaces | `GlowPlate` (blurred gradient plates with a drifting mesh and glossy rim), `BevelGlass` (dark glass with a coloured light from the bottom), `TiltPress` (press leans toward the finger and springs back), `LedMeter`, `ActionPill`. All in `lib/ui/glow.dart`. |
| Orb | `MoodOrb` is a living blob with a face: breathes, blinks, looks at the finger, smiles or frowns with valence, wobbles more far from neutral, boops on tap and can be dragged up or down to set the mood. |
| Mascots | `Buddy` adds a moon, star, sprout and book beside the cloud; `BuddyTip` gives them a speech bubble that types itself in. Each onboarding step and several screens have a companion. |
| Information | `lib/data/facts.dart`: fact of the day, sleep by age, typical stages. `SleepExplainer` (stage share, 90 min cycles wave, recommended hours against your goal), tips carousels on Mind and Practices. |
| Practices | Reading stats (ring, minutes, per-topic LEDs), practice minutes per day, LED ritual progress, fact plate. Grounding and body scan removed. |
| Plus | The Plus perk is now `InsightsSheet`: sleep vs mood scatter with trend and correlation, weekday rhythm, bedtime stability, tag impact, best nights. All computed on device. |
| Today | Companion line that follows the hour and what is logged, bento row (log a night, streak), fact of the day, staggered reveal. |
| Onboarding | Swipeable story intro, LED step indicator with a lime marker, a companion line per step, living orb on the first check-in, glowing action pill that changes colour by step. |
| Removed | Night mode, generated sounds and timer (`just_audio` dropped), grounding, body scan, the profile volume ring. |
| Feel | `Feel` (`lib/ui/feedback.dart`): one place for haptics, with the Android system click on taps and saves. |

## Rules kept

- Lime marks position and done state only; actions stay white or glowing.
- Every animation honours "remove animations"; ambient loops stop entirely.
- Paddings stay on the 4 px grid used across the app (12, 16, 20, 24, 40).
- Copy is Russian, sentence case, no em dashes in new text.

## Mockups

Figma: placeholder (no file was provided). The references used were the
gradient plates, the "69°" glass dial and the bento control grid.
