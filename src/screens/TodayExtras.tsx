import { motion } from "framer-motion"
import { Award as AwardIcon, Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { dayPlan, type PlanItem } from "@/lib/features"
import { EASE_OUT } from "@/lib/motion"
import { useAwards } from "@/sheets/Extras"
import { useStore } from "@/store/store"
import { Ring } from "@/ui/charts"
import { SectionHead } from "@/ui/controls"
import { WATER_GOAL_ML } from "@/widgets/catalog"

/** Five small steps for today; tapping an open step takes the user to where it is done. */
export function DayPlan() {
  const s = useStore()
  const plan = dayPlan({
    nights: s.nights,
    moods: s.moods,
    breathMin: s.breath.min,
    waterMl: s.water.ml,
    waterGoal: WATER_GOAL_ML,
    ritualDone: s.ritual.done.length,
  })
  const done = plan.filter((p) => p.done).length
  const run = (id: PlanItem["id"]) => {
    if (id === "sleep") s.openSheet("sleep")
    else if (id === "mood") s.openSheet("mood")
    else if (id === "water") s.addWater(250)
    else s.setTab("practices")
  }
  return (
    <section aria-label="План дня">
      <SectionHead title="План дня" hint={done === plan.length ? "Всё выполнено" : `${done} из ${plan.length} шагов`}>
        <Ring value={done / plan.length} size={36} stroke={7}>
          <span className="text-[11px] font-semibold tabular-nums">{done}</span>
        </Ring>
      </SectionHead>
      <ul className="glass mt-4 divide-y divide-white/8 rounded-[30px] px-2">
        {plan.map((p, i) => (
          <motion.li key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 * i }}>
            <button type="button" disabled={p.done} onClick={() => run(p.id)} className="press flex w-full items-center gap-3 px-2 py-3 text-left">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-250", p.done ? "bg-lime text-lime-ink" : "text-transparent ring-1 ring-inset ring-white/30")}>
                <Check className="size-4" strokeWidth={3} />
              </span>
              <span className={cn("min-w-0 flex-1 text-[15px] transition-opacity duration-250", p.done && "text-ink-3 line-through")}>{p.label}</span>
              <span className="shrink-0 text-[12px] text-ink-3">{p.hint}</span>
              {!p.done && <ChevronRight className="size-4 shrink-0 text-ink-3" />}
            </button>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

export function AwardsStrip() {
  const { openSheet } = useStore()
  const awards = useAwards()
  const done = awards.filter((a) => a.done).length
  const next = awards.find((a) => !a.done)
  return (
    <button type="button" onClick={() => openSheet("awards")} className="press glass flex w-full items-center gap-4 rounded-[30px] p-3 pr-4 text-left">
      <Ring value={done / awards.length} size={48} stroke={7}>
        <AwardIcon className="size-[18px]" />
      </Ring>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-[-0.01em]">Достижения: {done} из {awards.length}</span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-2">
          {next ? `Дальше: ${next.title.toLowerCase()} · ${Math.round(next.progress * 100)}%` : "Все открыты"}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-3" />
    </button>
  )
}
