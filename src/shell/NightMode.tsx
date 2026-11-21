import { AnimatePresence, motion } from "framer-motion"
import { Sunrise } from "lucide-react"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useNow } from "@/store/derived"
import { useStore } from "@/store/store"
import { SOUNDS } from "@/screens/Sleep"
import { Button, Chip } from "@/ui/controls"
import { Dots } from "@/ui/Dots"

function Clock() {
  const now = useNow(1000)
  const text = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  return <Dots value={text} still className="text-[84px] text-white/70" />
}

/** Dimmed full-screen clock that runs while the user sleeps. */
export function NightMode() {
  const { nightMode, endNight, wakeGoal, nightStart, nightSound, setNightSound } = useStore()
  return (
    <AnimatePresence>
      {nightMode && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Ночной режим"
          className="night-mode on-dark fixed inset-0 z-[70] flex flex-col items-center bg-black px-6 pb-[max(var(--safe-bottom),28px)] pt-[max(var(--safe-top),28px)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: DUR.verySlow, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: DUR.fast } }}
        >
          <div className="text-[13px] text-ink-3">Ночь началась в {nightStart}</div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <Clock />
            <div className="mt-8 flex items-center gap-2 text-[15px] text-ink-2">
              <Sunrise className="size-[18px]" /> Подъём в {wakeGoal}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SOUNDS.map((s) => (
              <Chip key={s.id} active={nightSound === s.id} onClick={() => setNightSound(s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
          <div className="mt-6 flex w-full max-w-[420px] gap-3">
            <Button variant="glass" className="flex-1" onClick={() => endNight(false)}>
              Отменить
            </Button>
            <Button className="flex-[2]" onClick={() => endNight(true)}>
              Я проснулся
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
