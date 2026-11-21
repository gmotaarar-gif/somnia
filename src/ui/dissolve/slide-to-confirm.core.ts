/**
 * SlideToConfirm for the web, framework free, from dissolve (dissolve-ui). This file is yours.
 * The React component (slide-to-confirm.tsx) wraps it; it also runs on its own:
 *
 *   const s = createSlideToConfirm(el, { label: 'Slide to pay 42 €', doneLabel: 'Paid', onConfirm: pay });
 *
 * Slide to pay or confirm. A light shimmer runs across the label, the track fills behind the knob,
 * and past the threshold (or on a flick past halfway) it locks, shows a loader while onConfirm
 * runs, then confirms. Enter, Space or the right arrow slide it from the keyboard. Colors come from
 * the theme tokens: track surface, fill and knob primary, label muted, done state success.
 */
import { CALM, IN_OUT_CUBIC, QUAD, clamp, el, injectStyle, loop, propsOf, reducedMotion, scope, value, vibrate } from './kit';

export type SlideToConfirmProps = {
  label: string;
  /** Runs once the knob reaches the end. The knob shows a loader until the promise settles; a rejection goes back to idle. */
  onConfirm: () => Promise<unknown> | void;
  /** Label once confirmed. Default 'Done'. */
  doneLabel?: string;
  /** Track height in px. The knob is 10 px smaller. Default 60. */
  height?: number;
  /** Fraction of the track to reach before release confirms. Default 0.88. */
  threshold?: number;
  /** Time on the done state before the slider resets, ms. 0 stays done. Default 1600. */
  resetAfter?: number;
  /** A tick on lock and a success pattern when done, where the browser has it. Default true. */
  haptics?: boolean;
  /** Knob classes (shadow, extra layout). Its color comes from the primary token. */
  knobClassName?: string;
};

export type SlideToConfirmInstance = {
  update: (props: Partial<SlideToConfirmProps>) => void;
  destroy: () => void;
};

type Phase = 'idle' | 'loading' | 'done';

const DEFAULTS = { label: '', doneLabel: 'Done', height: 60, threshold: 0.88, resetAfter: 1600, haptics: true };

const PAD = 5;
/** Shimmer band width (px) and the time it takes to cross the label. */
const BAND = 80;
const SWEEP_MS = 2200;
const SPIN_MS = 900;

const CHEVRON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const CHECK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

const CSS = `
:where([data-dissolve="slide-to-confirm"]) {
  position: relative; overflow: hidden; isolation: isolate; border-radius: 999px;
  background: var(--dissolve-surface, rgb(242 242 247));
  cursor: grab; touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
}
:where([data-dissolve="slide-to-confirm"][data-dragging]) { cursor: grabbing; }
:where(.dissolve-slide-fill) { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; overflow: hidden; background: var(--dissolve-primary, rgb(28 28 30)); }
:where(.dissolve-slide-fill-done) { position: absolute; inset: 0; background: var(--dissolve-success, rgb(52 199 89)); opacity: 0; }
:where(.dissolve-slide-label) {
  position: absolute; inset: 0; margin: auto; width: fit-content; height: fit-content;
  font-size: 16px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; pointer-events: none;
}
:where(.dissolve-slide-shimmer) {
  background-color: var(--dissolve-muted, rgb(142 142 147));
  background-image: linear-gradient(90deg, var(--dissolve-muted, rgb(142 142 147)), var(--dissolve-primary-foreground, rgb(255 255 255)), var(--dissolve-muted, rgb(142 142 147)));
  background-repeat: no-repeat; background-size: ${BAND}px 100%; background-position: -${BAND}px 0;
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
:where(.dissolve-slide-done) { color: var(--dissolve-primary-foreground, rgb(255 255 255)); opacity: 0; }
:where(.dissolve-slide-knob) {
  position: absolute; display: grid; place-items: center; overflow: hidden; border-radius: 50%;
  background: var(--dissolve-primary, rgb(28 28 30)); color: var(--dissolve-primary-foreground, rgb(255 255 255));
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18); will-change: transform;
}
:where(.dissolve-slide-knob-done) { position: absolute; inset: 0; background: var(--dissolve-primary-foreground, rgb(255 255 255)); opacity: 0; }
:where(.dissolve-slide-icon) { position: relative; grid-area: 1 / 1; display: grid; place-items: center; }
:where(.dissolve-slide-icon) svg { display: block; }
:where(.dissolve-slide-check) { color: var(--dissolve-success, rgb(52 199 89)); }
:where(.dissolve-slide-spinner) { display: block; width: 20px; height: 20px; box-sizing: border-box; border-radius: 50%; border: 2.2px solid currentColor; border-top-color: transparent; }
`;

/** A slide to confirm track in host. Drag the knob to the end, or focus it and press Enter. */
export function createSlideToConfirm(host: HTMLElement, initial: SlideToConfirmProps): SlideToConfirmInstance {
  injectStyle('dissolve-slide-to-confirm', CSS);
  const props = propsOf(DEFAULTS, initial);
  const p = () => props.current;
  const sc = scope();

  host.dataset.dissolve = 'slide-to-confirm';
  host.tabIndex = 0;
  host.setAttribute('role', 'button');
  const fill = el('div', 'dissolve-slide-fill');
  const fillDone = el('div', 'dissolve-slide-fill-done');
  fill.append(fillDone);
  const text = el('span', 'dissolve-slide-label dissolve-slide-shimmer');
  const doneText = el('span', 'dissolve-slide-label dissolve-slide-done');
  const knob = el('div');
  const knobDone = el('div', 'dissolve-slide-knob-done');
  const chev = el('span', 'dissolve-slide-icon', CHEVRON);
  const spin = el('span', 'dissolve-slide-icon', '<i class="dissolve-slide-spinner"></i>');
  const check = el('span', 'dissolve-slide-icon dissolve-slide-check', CHECK);
  knob.append(knobDone, chev, spin, check);
  host.append(fill, text, doneText, knob);

  let phase: Phase = 'idle', angle = 0, sweep = 0, textW = 0;
  /** The running lock or keyboard slide, so a second one never starts. */
  let busy: Promise<unknown> | null = null;
  const knobSize = () => p().height - PAD * 2;
  const max = () => Math.max(1, host.clientWidth - knobSize() - PAD * 2);

  function render() {
    const k = x.v / max(), t = tone.v;
    fill.style.width = (x.v + knobSize() + PAD * 2).toFixed(2) + 'px';
    fill.style.opacity = (phase === 'idle' ? Math.min(1, 0.15 + k) : 1).toFixed(3);
    fillDone.style.opacity = knobDone.style.opacity = check.style.opacity = doneText.style.opacity = t.toFixed(3);
    knob.style.transform = `translate3d(${x.v.toFixed(2)}px,0,0)`;
    text.style.opacity = ((1 - Math.min(1, k * 1.6)) * (1 - t)).toFixed(3);
    chev.style.opacity = phase === 'idle' ? '1' : '0';
    spin.style.opacity = phase === 'loading' ? '1' : '0';
    spin.style.transform = `rotate(${angle.toFixed(1)}deg)`;
  }
  const x = value(sc, 0, render);
  const tone = value(sc, 0, render);

  // The shimmer runs while the label shows (not under reduced motion), the spinner while loading.
  // Both sleep while the track is off screen.
  let last = 0;
  const shimmering = () => phase === 'idle' && !reducedMotion();
  const { kick } = loop(sc, host, (now) => {
    const dt = last ? Math.min(64, now - last) : 0;
    last = now;
    if (shimmering()) {
      sweep = (sweep + dt / SWEEP_MS) % 1;
      if (!textW) textW = text.offsetWidth;
      text.style.backgroundPosition = `${(-BAND + (textW + BAND * 2) * sweep).toFixed(1)}px 0`;
    }
    if (phase === 'loading') { angle = (angle + (dt / SPIN_MS) * 360) % 360; render(); }
  }, () => {
    const on = shimmering() || phase === 'loading';
    if (!on) last = 0;
    return on;
  });

  function setPhase(next: Phase) {
    phase = next;
    host.setAttribute('aria-busy', String(next === 'loading'));
    host.setAttribute('aria-label', next === 'done' ? p().doneLabel : p().label);
    tone.to(next === 'done' ? 1 : 0, 320, QUAD);
    if (next === 'idle') {
      x.to(0, 420, CALM);
      sweep = 0;
      text.style.backgroundPosition = '';
    }
    render();
    kick();
  }

  async function confirm() {
    if (p().haptics) vibrate(10);
    setPhase('loading');
    try {
      await p().onConfirm?.();
    } catch {
      if (sc.alive) setPhase('idle');
      return;
    }
    if (!sc.alive) return;
    if (p().haptics) vibrate([10, 40, 18]);
    setPhase('done');
    const after = p().resetAfter;
    if (after) sc.wait(after).then(() => setPhase('idle'));
  }

  /** Runs one slide to the end (lock, then confirm) unless one is already running. */
  function lockWith(motion: () => Promise<boolean>) {
    busy = motion()
      .then((ok) => (ok ? confirm() : null))
      .finally(() => { busy = null; });
  }

  // Drag: deltas in layout px, so a track scaled down by a transform still follows the pointer.
  let drag: { id: number; last: number; samples: [number, number][] } | null = null;
  const scale = () => host.getBoundingClientRect().width / host.offsetWidth || 1;
  const onDown = (e: PointerEvent) => {
    if (phase !== 'idle' || busy || e.button > 0) return;
    const s = scale();
    drag = { id: e.pointerId, last: e.clientX / s, samples: [[performance.now(), e.clientX / s]] };
    try { host.setPointerCapture(e.pointerId); } catch { /* synthetic pointers cannot be captured */ }
    host.dataset.dragging = '';
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const cx = e.clientX / scale(), now = performance.now();
    x.set(clamp(x.v + cx - drag.last, 0, max()));
    drag.last = cx;
    drag.samples.push([now, cx]);
    while (drag.samples.length > 2 && now - drag.samples[0][0] > 80) drag.samples.shift();
  };
  const onEnd = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const s = drag.samples;
    drag = null;
    delete host.dataset.dragging;
    const [t0, x0] = s[0], [t1, x1] = s[s.length - 1];
    const vx = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
    if (x.v > max() * p().threshold || (vx > 1200 && x.v > max() * 0.5)) lockWith(() => x.to(max(), 160, CALM));
    else x.to(0, 380, CALM);
  };
  // From the keyboard: a calm slide to the end, the same lock, load and confirm.
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    if (phase !== 'idle' || busy || drag) return;
    lockWith(async () => {
      if (!(await x.to(max() * 0.94, 820, IN_OUT_CUBIC))) return false;
      await sc.wait(60);
      return x.to(max(), 160, CALM);
    });
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onEnd);
  host.addEventListener('pointercancel', onEnd);
  host.addEventListener('keydown', onKey);

  function layout() {
    const h = p().height, k = knobSize();
    host.style.height = h + 'px';
    Object.assign(knob.style, { left: PAD + 'px', top: PAD + 'px', width: k + 'px', height: k + 'px' });
  }

  function decorate() {
    const { label, doneLabel, knobClassName } = p();
    knob.className = 'dissolve-slide-knob' + (knobClassName ? ' ' + knobClassName : '');
    text.textContent = label;
    doneText.textContent = doneLabel;
    host.setAttribute('aria-label', phase === 'done' ? doneLabel : label);
    textW = 0;
  }

  layout();
  decorate();
  setPhase('idle');

  return {
    update(next) {
      const changed = props.update(next);
      if (changed.has('height')) layout();
      if (changed.has('label') || changed.has('doneLabel') || changed.has('knobClassName')) decorate();
      if (changed.size) render();
    },
    destroy() {
      sc.dispose();
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onEnd);
      host.removeEventListener('pointercancel', onEnd);
      host.removeEventListener('keydown', onKey);
      fill.remove();
      text.remove();
      doneText.remove();
      knob.remove();
      for (const a of ['data-dissolve', 'data-dragging', 'tabindex', 'role', 'aria-label', 'aria-busy']) host.removeAttribute(a);
      host.style.removeProperty('height');
    },
  };
}
