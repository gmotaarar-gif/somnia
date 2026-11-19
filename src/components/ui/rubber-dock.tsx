import * as React from "react"
import {
  DB_SPRINGS,
  clamp,
  createSpring,
  getMotionTimeScale,
  isSlowMotion,
  setSlowMotion,
  stepSpring,
  subscribeSlowMotion,
  tuneSpring,
} from "@/lib/motion"
import { useSomna } from "@/store/useSomnaStore"
import { cn } from "@/lib/utils"

const TAB = 52
const GAP = 4
const N = 4
const TW = N * TAB + (N - 1) * GAP // 220px
const COL = { W: TW + 12, H: TAB + 12 } // 232 x 64
const PANEL_MAX_H = 292
const EXP_W = 336

const cx = (i: number) => TAB / 2 + i * (TAB + GAP)

const rubber = (x: number, min: number, max: number, d = 44) =>
  x < min
    ? min - (1 - 1 / (((min - x) * 0.55) / d + 1)) * d
    : x > max
      ? max + (1 - 1 / (((x - max) * 0.55) / d + 1)) * d
      : x

const DOCK_ICONS: { label: string; svg: React.ReactNode }[] = [
  {
    label: "Сводка",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[21px] w-[21px]"
      >
        <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    label: "Ритуалы",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[21px] w-[21px]"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4-4" />
      </svg>
    ),
  },
  {
    label: "Ритм",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[21px] w-[21px]"
      >
        <path d="M4 13.5 6.2 5.6A1 1 0 0 1 7.2 5h9.6a1 1 0 0 1 1 .6L20 13.5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
        <path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20" />
      </svg>
    ),
  },
  {
    label: "Настройки",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[21px] w-[21px]"
      >
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 19.5c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
      </svg>
    ),
  },
]

export interface RubberDockProps {
  /** Anchored bottom dock vs centered studio showcase */
  anchor?: "bottom" | "center"
  /** Optional callback when tab index changes (0..3) */
  onTabSelect?: (index: number) => void
  className?: string
}

/**
 * DesignBookmark "Rubber Dock" rebuilt in React for Somna.
 * Preserves exact stiffness & damping from `shared/tokens.css`:
 * - Leading edge: `640 38` | Trailing edge: `150 16` (stretches like rubber)
 * - Drag lead: `1100 56` | Drag trail: `320 26`
 * - Card morph openW: `340 21`, openH: `230 21`, close: `420 30`, icon pop: `520 16`
 */
export function RubberDock({
  anchor = "bottom",
  onTabSelect,
  className,
}: RubberDockProps) {
  const {
    userName,
    sleepHistory,
    streakDays,
    eveningDetox,
    setEveningDetox,
    sleepModeActive,
    setSleepModeActive,
    setActiveTab,
    setMoodDrawerOpen,
    setWeeklyRecapOpen,
  } = useSomna()

  const latestSleep = sleepHistory[sleepHistory.length - 1]
  const barValues = React.useMemo(() => {
    const base = [42, 56, 48, 72, 62, 84, 68, 91, 76, 100, 88, 82]
    if (sleepHistory.length >= 7) {
      const recent = sleepHistory.slice(-7).map((n) => n.quality)
      return [...base.slice(0, 5), ...recent]
    }
    return base
  }, [sleepHistory])

  const dockRef = React.useRef<HTMLDivElement>(null)
  const groundRef = React.useRef<HTMLDivElement>(null)
  const tabsRef = React.useRef<HTMLDivElement>(null)
  const indRef = React.useRef<HTMLDivElement>(null)
  const topIconsRef = React.useRef<HTMLDivElement>(null)
  const baseIconSpansRef = React.useRef<(HTMLSpanElement | null)[]>([])
  const topIconSpansRef = React.useRef<(HTMLSpanElement | null)[]>([])
  const panelRefs = React.useRef<(HTMLElement | null)[]>([])

  const [active, setActive] = React.useState(0)
  const [expanded, setExpanded] = React.useState(false)
  const [typedText, setTypedText] = React.useState("дыхание 4-7-8")
  const [slowMo, setSlowMo] = React.useState(() => isSlowMotion())

  const activeRef = React.useRef(0)
  const expandedRef = React.useRef(false)
  const suppressClickRef = React.useRef(false)

  // Spring physics state (exact DesignBookmark values)
  const springsRef = React.useRef({
    L: createSpring(cx(0) - TAB / 2, ...DB_SPRINGS.dockLead),
    R: createSpring(cx(0) + TAB / 2, ...DB_SPRINGS.dockLead),
    W: createSpring(TAB + 12, 260, 20),
    H: createSpring(COL.H, 400, 34),
    nudge: createSpring(0, 300, 18),
    pops: [0, 1, 2, 3].map(() => createSpring(1, ...DB_SPRINGS.dockPop)),
  })

  React.useEffect(() => subscribeSlowMotion(setSlowMo), [])

  const measurePanelH = React.useCallback((idx: number) => {
    const el = panelRefs.current[idx]
    if (!el) return 248
    return Math.min(PANEL_MAX_H, el.scrollHeight || el.offsetHeight || 248)
  }, [])

  const moveTo = React.useCallback((center: number, dir: number, isDrag = false) => {
    const { L, R } = springsRef.current
    const lead = isDrag ? DB_SPRINGS.dockDragLead : DB_SPRINGS.dockLead
    const trail = isDrag ? DB_SPRINGS.dockDragTrail : DB_SPRINGS.dockTrail
    if (dir === 0) {
      tuneSpring(L, 600, 44)
      tuneSpring(R, 600, 44)
    } else {
      const [lTune, rTune] = dir > 0 ? [trail, lead] : [lead, trail]
      tuneSpring(L, lTune[0], lTune[1])
      tuneSpring(R, rTune[0], rTune[1])
    }
    L.t = center - TAB / 2
    R.t = center + TAB / 2
  }, [])

  const toggleExpanded = React.useCallback(
    (next: boolean) => {
      if (next === expandedRef.current) return
      expandedRef.current = next
      setExpanded(next)
      const { W, H, pops } = springsRef.current
      const curIdx = activeRef.current
      if (next) {
        const targetW = Math.min(EXP_W, (typeof window !== "undefined" ? window.innerWidth : 400) - 28)
        W.t = targetW
        H.t = COL.H + measurePanelH(curIdx)
        tuneSpring(W, ...DB_SPRINGS.dockOpenW)
        tuneSpring(H, ...DB_SPRINGS.dockOpenH)
      } else {
        W.t = COL.W
        H.t = COL.H
        tuneSpring(W, DB_SPRINGS.dockClose[0] * 0.72, DB_SPRINGS.dockClose[1] * 0.66)
        tuneSpring(H, ...DB_SPRINGS.dockClose)
      }
      pops[curIdx].v -= 2.4
    },
    [measurePanelH]
  )

  const selectTab = React.useCallback(
    (idx: number, dirHint?: number) => {
      const clamped = clamp(idx, 0, N - 1)
      const { L, R, H, pops } = springsRef.current
      const dir = dirHint ?? Math.sign(cx(clamped) - (L.x + R.x) / 2)
      moveTo(cx(clamped), dir)
      const prev = activeRef.current
      activeRef.current = clamped
      setActive(clamped)
      pops[clamped].v -= 3.2
      onTabSelect?.(clamped)

      if (expandedRef.current && prev !== clamped) {
        tuneSpring(H, 260, 20)
        H.t = COL.H + measurePanelH(clamped)
      }
    },
    [measurePanelH, moveTo, onTabSelect]
  )

  // Typewriter animation when Rituals search panel (index 1) opens
  React.useEffect(() => {
    if (!expanded || active !== 1) return
    const targetWord = "дыхание 4-7-8"
    setTypedText("")
    let idx = 0
    let timer: number
    const stepType = () => {
      idx += 1
      setTypedText(targetWord.slice(0, idx))
      if (idx < targetWord.length) {
        timer = window.setTimeout(stepType, 65 / getMotionTimeScale())
      }
    }
    timer = window.setTimeout(stepType, 220 / getMotionTimeScale())
    return () => window.clearTimeout(timer)
  }, [expanded, active])

  // Close when clicking outside
  React.useEffect(() => {
    if (!expanded) return
    const onDocClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        toggleExpanded(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleExpanded(false)
    }
    document.addEventListener("mousedown", onDocClick)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [expanded, toggleExpanded])

  // Intro expand from single pill -> 4-tab dock + continuous 4-substep spring loop
  React.useEffect(() => {
    const introTimer = window.setTimeout(() => {
      const { W } = springsRef.current
      W.t = COL.W
      tuneSpring(W, 220, 15)
    }, 280)

    let rafId = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30) * getMotionTimeScale()
      last = now

      const { L, R, W, H, nudge, pops } = springsRef.current
      const all = [L, R, W, H, nudge, ...pops]
      const sub = 4
      for (let k = 0; k < sub; k++) {
        for (let s = 0; s < all.length; s++) {
          stepSpring(all[s], dt / sub)
        }
      }

      const dock = dockRef.current
      const ground = groundRef.current
      const ind = indRef.current
      const topIcons = topIconsRef.current

      if (dock && ind && topIcons) {
        const w = W.x
        const h = Math.max(H.x, 44)
        const openRatio = clamp((h - COL.H) / PANEL_MAX_H, 0, 1)
        const give = clamp(-H.v / 9000, -0.04, 0.04)

        dock.style.width = `${(w * (1 + give)).toFixed(2)}px`
        dock.style.height = `${h.toFixed(2)}px`
        dock.style.borderRadius = `${Math.min(h / 2, 32 - 6 * openRatio).toFixed(2)}px`

        if (anchor === "center") {
          dock.style.transform = `translate(calc(-50% + ${nudge.x.toFixed(2)}px), ${(h / 2).toFixed(2)}px)`
        } else {
          dock.style.transform = `translate3d(calc(-50% + ${nudge.x.toFixed(2)}px), 0, 0)`
        }

        if (ground) {
          ground.style.width = `${(w * 0.86).toFixed(1)}px`
          ground.style.transform = `translate3d(calc(-50% + ${(nudge.x * 0.6).toFixed(1)}px), 0, 0) scaleY(${(1 + openRatio * 0.45).toFixed(2)})`
        }

        let l = L.x
        let r = R.x
        if (r < l) [l, r] = [r, l]
        const iw = Math.max(r - l, 24)
        const ih = TAB * clamp(1 / Math.sqrt(iw / TAB), 0.66, 1.1) // area-preserving rubber squeeze
        const top = (TAB - ih) / 2

        ind.style.width = `${iw.toFixed(2)}px`
        ind.style.height = `${ih.toFixed(2)}px`
        ind.style.borderRadius = `${(ih / 2).toFixed(2)}px`
        ind.style.transform = `translate3d(${l.toFixed(2)}px, ${top.toFixed(2)}px, 0)`

        topIcons.style.clipPath = `inset(${top.toFixed(1)}px ${(TW - l - iw).toFixed(1)}px ${(TAB - top - ih).toFixed(1)}px ${l.toFixed(1)}px round ${(ih / 2).toFixed(1)}px)`

        for (let i = 0; i < pops.length; i++) {
          const sc = `scale(${pops[i].x.toFixed(3)})`
          const bSpan = baseIconSpansRef.current[i]
          const tSpan = topIconSpansRef.current[i]
          if (bSpan) bSpan.style.transform = sc
          if (tSpan) tSpan.style.transform = sc
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      window.clearTimeout(introTimer)
      cancelAnimationFrame(rafId)
    }
  }, [anchor])

  // Pointer drag state on tabs
  const dragRef = React.useRef<{
    id: number
    x0: number
    last: number
    live: boolean
    dir: number
  } | null>(null)

  const getLocalX = (clientX: number) => {
    const dock = dockRef.current
    if (!dock) return 0
    const r = dock.getBoundingClientRect()
    return clientX - (r.left + r.width / 2 - springsRef.current.nudge.x) + TW / 2
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      id: e.pointerId,
      x0: e.clientX,
      last: getLocalX(e.clientX),
      live: false,
      dir: 0,
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.id) return
    if (!drag.live && Math.abs(e.clientX - drag.x0) > 4) {
      drag.live = true
      tabsRef.current?.setPointerCapture(e.pointerId)
    }
    if (!drag.live) return
    const raw = getLocalX(e.clientX)
    const d = raw - drag.last
    drag.last = raw
    if (Math.abs(d) > 0.5) drag.dir = Math.sign(d)
    const c = rubber(raw, cx(0), cx(N - 1))
    moveTo(c, drag.dir, true)
    springsRef.current.nudge.t = (c - clamp(c, cx(0), cx(N - 1))) * 0.35
  }

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.id) return
    if (drag.live) {
      const { L, R, nudge } = springsRef.current
      const c = (L.t + R.t) / 2
      nudge.t = 0
      const targetIdx = Math.round((c - cx(0)) / (TAB + GAP) + drag.dir * 0.18)
      selectTab(targetIdx, drag.dir || 0)
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    dragRef.current = null
  }

  const hrs = (latestSleep.durationMin / 60).toFixed(1)

  return (
    <div className={cn("relative select-none", className)}>
      {/* Ambient Ground Shadow */}
      <div
        ref={groundRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 h-5 rounded-full bg-black/75 blur-md",
          anchor === "center" ? "bottom-1/2" : "-bottom-1"
        )}
      />

      {/* Elastic Morphing Surface */}
      <div
        ref={dockRef}
        style={{
          width: COL.W,
          height: COL.H,
          borderRadius: 32,
        }}
        className={cn(
          "absolute left-1/2 overflow-hidden bg-[#181922]/96 text-white backdrop-blur-2xl will-change-[width,height,transform]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_0_1px_rgba(255,255,255,0.09),0_22px_50px_-14px_rgba(0,0,0,0.85)]",
          anchor === "center" ? "bottom-1/2" : "bottom-0"
        )}
      >
        {/* Morphing Card Panels */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{ width: EXP_W, height: PANEL_MAX_H }}
        >
          {/* PANEL 0: Сводка биоритмов */}
          <section
            ref={(el) => {
              panelRefs.current[0] = el
            }}
            className={cn(
              "absolute inset-x-0 top-0 px-4.5 pt-4.5 pb-2 transition-[opacity,transform,filter] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]",
              expanded && active === 0
                ? "pointer-events-auto translate-y-0 opacity-100 blur-none"
                : "pointer-events-none translate-y-2.5 opacity-0 blur-[4px]"
            )}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold tracking-tight text-white">
                Сводка Somna
              </h3>
              <small className="font-mono text-[11px] text-white/45">
                За 7 ночей · клик для свёртывания
              </small>
            </div>

            <div className="mb-2.5 grid grid-cols-3 gap-2">
              <div className="rounded-[14px] bg-white/[0.055] p-2.5">
                <small className="block text-[10.5px] text-white/45">Сон</small>
                <div className="mt-1 flex items-baseline gap-1">
                  <b className="font-mono text-[15px] font-semibold text-white">
                    {hrs}ч
                  </b>
                </div>
              </div>
              <div className="rounded-[14px] bg-white/[0.055] p-2.5">
                <small className="block text-[10.5px] text-white/45">Бодрость</small>
                <div className="mt-1 flex items-baseline gap-1">
                  <b className="font-mono text-[15px] font-semibold text-white">
                    {latestSleep.quality}
                  </b>
                  <em className="font-mono text-[10px] not-italic text-emerald-400">
                    %
                  </em>
                </div>
              </div>
              <div className="rounded-[14px] bg-white/[0.055] p-2.5">
                <small className="block text-[10.5px] text-white/45">Ночей</small>
                <div className="mt-1 flex items-baseline gap-1">
                  <b className="font-mono text-[15px] font-semibold text-white">
                    {streakDays}
                  </b>
                  <em className="text-[10px] not-italic text-white/45">дн</em>
                </div>
              </div>
            </div>

            {/* Staggered Spring Bars */}
            <div className="flex h-[96px] items-end gap-1.5 rounded-[14px] bg-white/[0.05] px-3 pt-3 pb-2.5">
              {barValues.map((v, idx) => {
                const hi = idx === barValues.length - 1 || idx === 9
                return (
                  <div
                    key={idx}
                    style={{
                      height: `${v}%`,
                      transform: expanded && active === 0 ? "scaleY(1)" : "scaleY(0)",
                      transformOrigin: "bottom",
                      transition:
                        expanded && active === 0
                          ? `transform 750ms cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 32 + 150}ms`
                          : "transform 160ms ease",
                    }}
                    className={cn(
                      "flex-1 rounded-[4px]",
                      hi ? "bg-[#e8ff1f]" : "bg-white/18"
                    )}
                  />
                )
              })}
            </div>
          </section>

          {/* PANEL 1: Быстрый поиск и запуск ритуалов */}
          <section
            ref={(el) => {
              panelRefs.current[1] = el
            }}
            className={cn(
              "absolute inset-x-0 top-0 px-4.5 pt-4.5 pb-2 transition-[opacity,transform,filter] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]",
              expanded && active === 1
                ? "pointer-events-auto translate-y-0 opacity-100 blur-none"
                : "pointer-events-none translate-y-2.5 opacity-0 blur-[4px]"
            )}
          >
            <div className="mb-2.5 flex h-10 items-center gap-2.5 rounded-[14px] bg-white/[0.06] px-3 text-[13px] text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-4 w-4 shrink-0 text-white/45"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="font-medium">{typedText}</span>
              <span className="inline-block h-4 w-[1.5px] animate-pulse bg-[#e8ff1f]" />
            </div>

            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {["Схема 4-7-8", "Чек-ин сферы", "Детокс", "Розовый шум"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-white/[0.09] px-2.5 py-1 text-[11px] font-medium text-white/75"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("practices")
                  toggleExpanded(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-full px-2.5 py-1.5 text-left transition-colors duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none hover:bg-white/[0.06] cursor-pointer"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-500/20 font-mono text-[11px] font-bold text-rose-300">
                  04
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[12.5px] font-medium text-white">
                    Дыхание Анти-стресс 04:00
                  </b>
                  <span className="block truncate text-[11px] text-white/45">
                    Таймер медленного дыхания и фоновый шум
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoodDrawerOpen(true)
                  toggleExpanded(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-full px-2.5 py-1.5 text-left transition-colors duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none hover:bg-white/[0.06] cursor-pointer"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-400/20 font-mono text-[11px] font-bold text-[#e8ff1f]">
                  +
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[12.5px] font-medium text-white">
                    Отметить состояние ума
                  </b>
                  <span className="block truncate text-[11px] text-white/45">
                    3D-сфера эмоций и контекст вечера
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* PANEL 2: Ритм и уведомления */}
          <section
            ref={(el) => {
              panelRefs.current[2] = el
            }}
            className={cn(
              "absolute inset-x-0 top-0 px-4.5 pt-4.5 pb-2 transition-[opacity,transform,filter] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]",
              expanded && active === 2
                ? "pointer-events-auto translate-y-0 opacity-100 blur-none"
                : "pointer-events-none translate-y-2.5 opacity-0 blur-[4px]"
            )}
          >
            <div className="mb-2.5 flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold tracking-tight text-white">
                Сводка записей
              </h3>
              <small className="font-mono text-[11px] text-[#e8ff1f]">журнал</small>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  av: "🌙",
                  title: "Целевой график сна",
                  sub: `Последняя ночь: ${latestSleep.bedtime} – ${latestSleep.wakeTime}`,
                  t: "ночь",
                  unread: true,
                  onClick: () => {
                    setActiveTab("sleep")
                    toggleExpanded(false)
                  },
                },
                {
                  av: "⚡",
                  title: "Итоги недели готовы",
                  sub: "Графики сна, целей и утренней бодрости",
                  t: "обзор",
                  unread: true,
                  onClick: () => {
                    setWeeklyRecapOpen(true)
                    toggleExpanded(false)
                  },
                },
                {
                  av: "☀️",
                  title: `Утренняя бодрость: ${latestSleep.quality}%`,
                  sub: `Пробуждений отмечено: ${latestSleep.awakenings}`,
                  t: "утро",
                  unread: false,
                  onClick: () => {
                    setActiveTab("analytics")
                    toggleExpanded(false)
                  },
                },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-center gap-2.5 rounded-full px-2.5 py-1.5 text-left transition-colors duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none hover:bg-white/[0.06] cursor-pointer"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.1] text-xs">
                    {item.av}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[12.5px] font-medium text-white">
                      {item.title}
                    </b>
                    <span className="block truncate text-[11px] text-white/50">
                      {item.sub}
                    </span>
                  </div>
                  <time className="font-mono text-[10px] text-white/40">{item.t}</time>
                  {item.unread ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e8ff1f]" />
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          {/* PANEL 3: Профиль и тактильные переключатели (вкл. Slow-mo 0.25x!) */}
          <section
            ref={(el) => {
              panelRefs.current[3] = el
            }}
            className={cn(
              "absolute inset-x-0 top-0 px-4.5 pt-4.5 pb-2 transition-[opacity,transform,filter] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]",
              expanded && active === 3
                ? "pointer-events-auto translate-y-0 opacity-100 blur-none"
                : "pointer-events-none translate-y-2.5 opacity-0 blur-[4px]"
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full border border-[#e8ff1f]/32 bg-[#e8ff1f]/20 font-mono text-sm font-bold text-[#f2ff78] backdrop-blur-md">
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <b className="block text-[15px] font-semibold text-white">
                  {userName}
                </b>
                <span className="text-[11px] text-white/45">
                  Somna Bio-OS · Rubber Dock
                </span>
              </div>
            </div>

            {[
              {
                label: "Замедление пружин (0.25×)",
                checked: slowMo,
                toggle: () => setSlowMotion(!slowMo),
              },
              {
                label: "Вечерний детокс с 22:30",
                checked: eveningDetox,
                toggle: () => setEveningDetox(!eveningDetox),
              },
              {
                label: "Ночной розовый шум",
                checked: sleepModeActive,
                toggle: () => setSleepModeActive(!sleepModeActive),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex h-10 items-center justify-between text-[13px] text-white/85"
              >
                <span>{row.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.checked}
                  onClick={row.toggle}
                  className={cn(
                    "relative h-6 w-10.5 cursor-pointer rounded-full border transition-colors duration-200",
                    row.checked
                      ? "border-[#e8ff1f]/35 bg-[#e8ff1f]/24"
                      : "border-white/12 bg-white/12"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full shadow transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
                      row.checked
                        ? "translate-x-[18px] bg-[#f2ff78]"
                        : "translate-x-0 bg-white"
                    )}
                  />
                </button>
              </div>
            ))}
          </section>
        </div>

        {/* Elastic Tab Bar Track */}
        <div
          ref={tabsRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          style={{ width: TW, height: TAB }}
          className="absolute bottom-[6px] left-1/2 -translate-x-1/2 cursor-grab touch-none active:cursor-grabbing"
        >
          {/* Base Muted Icons */}
          <div role="tablist" aria-label="Разделы Rubber Dock" className="absolute inset-0 flex gap-1">
            {DOCK_ICONS.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                role="tab"
                aria-label={item.label}
                aria-selected={active === idx}
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClickRef.current) return
                  if (idx === activeRef.current) {
                    toggleExpanded(!expandedRef.current)
                  } else {
                    selectTab(idx)
                  }
                }}
                style={{ width: TAB, height: TAB }}
                className="grid shrink-0 place-items-center rounded-full text-white/55 outline-none hover:text-white/80 cursor-pointer"
              >
                <span
                  ref={(el) => {
                    baseIconSpansRef.current[idx] = el
                  }}
                  className="inline-flex"
                >
                  {item.svg}
                </span>
              </button>
            ))}
          </div>

          {/* Stretchy Frosted Lime-Glass Rubber Indicator Pill */}
          <div
            ref={indRef}
            aria-hidden
            style={{ width: TAB, height: TAB }}
            className="pointer-events-none absolute top-0 left-0 rounded-full border border-[#e8ff1f]/35 bg-[#e8ff1f]/24 backdrop-blur-md shadow-[0_6px_18px_-4px_rgba(232,255,31,0.3)]"
          />

          {/* Highlighted Icons Clipped Strictly to the Rubber Pill */}
          <div
            ref={topIconsRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 flex gap-1 text-[#f2ff78]"
          >
            {DOCK_ICONS.map((item, idx) => (
              <div
                key={item.label}
                style={{ width: TAB, height: TAB }}
                className="grid shrink-0 place-items-center"
              >
                <span
                  ref={(el) => {
                    topIconSpansRef.current[idx] = el
                  }}
                  className="inline-flex"
                >
                  {item.svg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RubberDock
