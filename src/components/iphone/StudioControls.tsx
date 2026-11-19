import * as React from "react"
import { useGlimm } from "glimm/react"
import {
  LayoutGrid,
  Monitor,
  Moon,
  Play,
  PlusCircle,
  Smartphone,
  Sparkles,
  Wind,
} from "lucide-react"
import { RollLinks, type RollLinkItem } from "@/components/ui/roll-links"
import { SlidingTabs } from "@/components/ui/t-motion"
import { prefersReducedMotion } from "@/lib/motion"
import { useSomna, type TabId } from "@/store/useSomnaStore"

interface StudioControlsProps {
  viewMode: "iphone" | "wide"
  setViewMode: (m: "iphone" | "wide") => void
}

const STUDIO_LINKS: RollLinkItem[] = [
  { id: "home", label: "Главная", badge: "01" },
  { id: "sleep", label: "Сон", badge: "02" },
  { id: "analytics", label: "Аналитика", badge: "03" },
  { id: "practices", label: "Практики", badge: "04" },
]

const VIEW_MODE_ITEMS: {
  id: "iphone" | "wide"
  label: string
  icon: React.ReactNode
}[] = [
  { id: "iphone", label: "iPhone 16", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { id: "wide", label: "Wide Bento", icon: <Monitor className="h-3.5 w-3.5" /> },
]

export function StudioControls({ viewMode, setViewMode }: StudioControlsProps) {
  const {
    onboarded,
    setOnboarded,
    activeTab,
    setActiveTab,
    editWidgetsMode,
    setEditWidgetsMode,
    setMoodDrawerOpen,
    setWeeklyRecapOpen,
    setSleepLogOpen,
  } = useSomna()

  const { sweep } = useGlimm()

  const switchMode = (next: "iphone" | "wide") => {
    if (next === viewMode) return
    if (prefersReducedMotion()) {
      setViewMode(next)
      return
    }
    sweep(() => setViewMode(next), {
      direction: next === "wide" ? "ltr" : "rtl",
      sweepMs: 650,
      outroMs: 150,
      easing: "easeOutExpo",
    })
  }

  return (
    <>
      {/* Desktop Left Floating Studio Panel */}
      <aside className="hidden w-[276px] shrink-0 flex-col gap-3 rounded-[30px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md xl:flex">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.16] font-mono text-sm font-bold text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            S
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white">
              Somna Studio
            </div>
            <div className="text-[11px] text-white/45">
              Сон и баланс дня
            </div>
          </div>
        </div>

        {/* Mode Toggle with Glimm Sweep + SlidingTabs */}
        <SlidingTabs
          items={VIEW_MODE_ITEMS}
          value={viewMode}
          onValueChange={switchMode}
          ariaLabel="Режим просмотра"
          size="md"
          fullWidth
        />

        {/* DesignBookmark Roll Links Navigation Menu (instant navigation, no sweep) */}
        <div className="border-t border-white/10 px-1 pt-3 pb-1">
          <div className="mb-2 text-[10.5px] font-semibold tracking-wider text-white/40 uppercase">
            Экраны · Roll Links
          </div>
          <RollLinks
            items={STUDIO_LINKS}
            activeId={activeTab}
            onSelect={(id) => {
              setViewMode("iphone")
              setOnboarded(true)
              setActiveTab(id as TabId)
            }}
          />
        </div>

        {/* Quick Actions (Soft frosted pills only) */}
        <div className="space-y-1.5 border-t border-white/10 pt-3">
          <div className="px-1 text-[10.5px] font-semibold tracking-wider text-white/40 uppercase">
            Быстрые сценарии
          </div>

          <button
            type="button"
            onClick={() => {
              setViewMode("iphone")
              setOnboarded(!onboarded)
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.1] active:scale-[0.98] motion-reduce:transition-none"
          >
            <Play className="h-3.5 w-3.5 text-[#e8ff1f]" />
            <span>{onboarded ? "Онбординг (4 шага)" : "Пропустить онбординг"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("iphone")
              setOnboarded(true)
              setActiveTab("home")
              setEditWidgetsMode(!editWidgetsMode)
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.1] active:scale-[0.98] motion-reduce:transition-none"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-indigo-300" />
            <span>
              {editWidgetsMode ? "Завершить правку" : "Редактор Bento-сетки"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("iphone")
              setOnboarded(true)
              setMoodDrawerOpen(true)
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.1] active:scale-[0.98] motion-reduce:transition-none"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Чек-ин сферы эмоций</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("iphone")
              setOnboarded(true)
              setSleepLogOpen(true)
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.1] active:scale-[0.98] motion-reduce:transition-none"
          >
            <Moon className="h-3.5 w-3.5 text-sky-300" />
            <span>Записать ночь сна</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("iphone")
              setOnboarded(true)
              setWeeklyRecapOpen(true)
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.1] active:scale-[0.98] motion-reduce:transition-none"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
            <span>Итоги недели (glimm)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("iphone")
              setOnboarded(true)
              setActiveTab("practices")
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-left text-xs font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.1] active:scale-[0.98] motion-reduce:transition-none"
          >
            <Wind className="h-3.5 w-3.5 text-rose-400" />
            <span>Анти-стресс 04:00</span>
          </button>
        </div>
      </aside>

      {/* Compact Top Pill for Narrower Viewports */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full border border-white/12 bg-zinc-950/85 p-1 backdrop-blur-md xl:hidden">
        <button
          type="button"
          onClick={() => switchMode(viewMode === "iphone" ? "wide" : "iphone")}
          className="cursor-pointer rounded-full border border-white/15 bg-white/[0.11] px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.18] active:scale-95 motion-reduce:transition-none"
        >
          {viewMode === "iphone" ? "Wide Bento" : "iPhone 16"}
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode("iphone")
            setOnboarded(!onboarded)
          }}
          className="cursor-pointer rounded-full border border-[#e8ff1f]/28 bg-[#e8ff1f]/[0.15] px-3 py-1 text-[11px] font-semibold text-[#f2ff78] backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-[#e8ff1f]/[0.24] active:scale-95 motion-reduce:transition-none"
        >
          {onboarded ? "Онбординг" : "К экранам"}
        </button>
      </div>
    </>
  )
}
