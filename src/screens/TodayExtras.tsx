import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { dayPlan, type PlanItem } from "@/lib/features"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useStore } from "@/store/store"
import { SectionHead } from "@/ui/controls"
import { WATER_GOAL_ML } from "@/widgets/catalog"

/** Today's small steps: finished ones fold into the progress bar, open ones stay as actions. */
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
  const open = plan.filter((p) => !p.done)
  const run = (id: PlanItem["id"]) => {
    if (id === "sleep") s.openSheet("sleep")
    else if (id === "mood") s.openSheet("mood")
    else if (id === "water") s.addWater(250)
    else s.setTab("practices")
  }
  return (
    <section aria-label="План дня">
      <SectionHead title="План дня" hint={open.length ? `${done} из ${plan.length} выполнено` : "Всё выполнено"} />
      <div className="glass mt-4 rounded-[30px] p-5">
        <div className="flex gap-1.5" role="img" aria-label={`Выполнено ${done} из ${plan.length}`}>
          {plan.map((p) => (
            <span key={p.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-350", p.done ? "bg-lime" : "bg-white/12")} />
          ))}
        </div>
        {open.length === 0 ? (
          <div className="mt-5 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <p className="text-[15px] leading-snug text-ink-2">Все шаги на сегодня сделаны. Хорошего вечера.</p>
          </div>
        ) : (
          <ul className="-mx-2 -mb-2 mt-3">
            <AnimatePresence initial={false}>
              {open.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <button type="button" onClick={() => run(p.id)} className="press flex w-full items-center gap-3 rounded-[18px] px-2 py-3 text-left hover:bg-white/5">
                    <span className="size-[22px] shrink-0 rounded-full ring-[1.5px] ring-inset ring-white/30" />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{p.label}</span>
                    <span className="shrink-0 text-[12px] text-ink-3">{p.hint}</span>
                    <ChevronRight className="size-4 shrink-0 text-ink-3" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  )
}
