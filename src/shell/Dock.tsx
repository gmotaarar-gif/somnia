import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BedDouble, Brain, LayoutGrid, MoonStar, Plus, Smile, Wind } from "lucide-react"
import { cn } from "@/lib/cn"
import { DUR, EASE_OUT, SPRING } from "@/lib/motion"
import { useStore, type TabId } from "@/store/store"

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "today", label: "Сегодня", icon: LayoutGrid },
  { id: "sleep", label: "Сон", icon: MoonStar },
  { id: "mind", label: "Состояние", icon: Brain },
  { id: "practices", label: "Практики", icon: Wind },
]

export function Dock() {
  const { tab, setTab, openSheet, setEditing } = useStore()
  const [menu, setMenu] = React.useState(false)

  React.useEffect(() => {
    if (!menu) return
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false)
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [menu])

  const pick = (sheet: "mood" | "sleep") => {
    setMenu(false)
    openSheet(sheet)
  }

  return (
    <>
      <AnimatePresence>
        {menu && (
          <motion.button
            type="button"
            aria-label="Закрыть меню"
            className="fixed inset-0 z-20 cursor-default bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast }}
            onClick={() => setMenu(false)}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(var(--safe-bottom),16px)]">
        <div className="pointer-events-auto relative flex items-center gap-2">
          <nav aria-label="Разделы" className="glass-dark flex items-center gap-0.5 rounded-full p-1.5">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  onClick={() => {
                    setEditing(false)
                    setTab(id)
                    document.getElementById("app-scroll")?.scrollTo({ top: 0 })
                  }}
                  className={cn(
                    "relative flex h-[52px] items-center justify-center gap-2 rounded-full px-3 transition-colors duration-250",
                    active ? "text-lime-ink" : "text-ink-2 hover:text-ink"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="dock-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-full bg-lime shadow-[0_8px_28px_-8px_rgb(217_242_74/0.75)]"
                    />
                  )}
                  <Icon className="relative size-[21px] shrink-0" />
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.span
                        key="label"
                        className="dock-label relative overflow-hidden whitespace-nowrap text-[14px] font-semibold tracking-[-0.01em] max-[380px]:hidden"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: DUR.fast, ease: EASE_OUT }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </nav>

          <div className="relative">
            <AnimatePresence>
              {menu && (
                <motion.div
                  role="menu"
                  className="glass-dark absolute bottom-[calc(100%+12px)] right-0 w-[236px] origin-bottom-right rounded-[28px] p-2"
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 6, transition: { duration: DUR.quick } }}
                  transition={SPRING}
                >
                  <MenuItem icon={<Smile />} title="Чек-ин состояния" sub="Как вы сейчас?" onClick={() => pick("mood")} />
                  <MenuItem icon={<BedDouble />} title="Записать сон" sub="Отбой, подъём, бодрость" onClick={() => pick("sleep")} />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              aria-label="Добавить запись"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
              className="press glass-dark grid size-16 place-items-center rounded-full text-ink"
            >
              <motion.span animate={{ rotate: menu ? 45 : 0 }} transition={SPRING}>
                <Plus className="size-6" />
              </motion.span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function MenuItem({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="press flex w-full items-center gap-3 rounded-[22px] p-2.5 text-left hover:bg-white/8"
    >
      <span className="glass-inset grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-[18px]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium leading-tight">{title}</span>
        <span className="mt-0.5 block text-[12px] text-ink-3">{sub}</span>
      </span>
    </button>
  )
}
