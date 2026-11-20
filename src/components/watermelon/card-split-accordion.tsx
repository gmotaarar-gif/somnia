import * as React from "react"
import { m, useReducedMotion, type Transition } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { haptic } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface CardSplitItem {
  id: string
  title: string
  tag?: string
  badge?: string
  icon?: React.ReactNode
  content: string
}

export interface CardSplitAccordionProps {
  items: CardSplitItem[]
  defaultOpenId?: string | null
  className?: string
}

const SPLIT_SPRING: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.9,
}

/**
 * Adapted from `@watermelon/card-split-accordian` for Somna's dark OLED glass system:
 * - Unified `framer-motion` `m` + FLIP `layout` (no duplicate `motion/react` bundle)
 * - CSS Grid `grid-rows-[0fr]` -> `grid-rows-[1fr]` reveal (no layout-thrashing `animate={{ height }}`)
 * - Adaptive 20px seam corners & vertical card split on open
 */
export function CardSplitAccordion({
  items,
  defaultOpenId = null,
  className,
}: CardSplitAccordionProps) {
  const reduceMotion = useReducedMotion()
  const baseId = React.useId()
  const [openId, setOpenId] = React.useState<string | null>(defaultOpenId)

  const openIndex = items.findIndex((item) => item.id === openId)
  const transition: Transition = reduceMotion ? { duration: 0 } : SPLIT_SPRING

  return (
    <ul className={cn("w-full list-none p-0", className)}>
      {items.map((item, index) => {
        const isOpen = index === openIndex
        const isFirst = index === 0
        const isLast = index === items.length - 1
        const isBeforeOpen = openIndex !== -1 && index === openIndex - 1
        const isAfterOpen = openIndex !== -1 && index === openIndex + 1
        const isAlone = (isAfterOpen && isLast) || (isBeforeOpen && isFirst)

        const topRounded = isOpen || isAlone || isAfterOpen || isFirst
        const bottomRounded = isOpen || isAlone || isBeforeOpen || isLast
        const showTopBorder = isFirst || isAfterOpen || isOpen
        const showBottomBorder = isLast || isBeforeOpen || isOpen

        const panelId = `${baseId}-panel-${item.id}`

        return (
          <m.li
            key={item.id}
            layout={!reduceMotion}
            transition={transition}
            style={{
              marginTop: isOpen && !isFirst ? 10 : 0,
              marginBottom: isOpen && !isLast ? 10 : 0,
            }}
          >
            <div
              className={cn(
                "overflow-hidden border-x transition-[border-radius,background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                showTopBorder ? "border-t" : "border-t border-t-white/[0.06]",
                showBottomBorder ? "border-b" : "border-b-0",
                topRounded ? "rounded-t-[20px]" : "rounded-t-none",
                bottomRounded ? "rounded-b-[20px]" : "rounded-b-none",
                isOpen
                  ? "border-[#e8ff1f]/28 bg-[#0c0e17]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_32px_rgba(0,0,0,0.48)]"
                  : "border-white/[0.1] bg-[#080910]/82 hover:bg-[#0d101b]/90"
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  haptic(5)
                  setOpenId(isOpen ? null : item.id)
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2.5 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e8ff1f]/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {item.icon ? (
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-[var(--duration-quick)] motion-reduce:transition-none",
                        isOpen
                          ? "border-[#e8ff1f]/35 bg-[#e8ff1f]/[0.15] text-[#e8ff1f]"
                          : "border-white/10 bg-white/[0.05] text-white/65"
                      )}
                    >
                      {item.icon}
                    </span>
                  ) : null}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-white">
                        {item.title}
                      </span>
                      {item.badge ? (
                        <span className="shrink-0 rounded-full border border-[#e8ff1f]/32 bg-[#e8ff1f]/[0.13] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#f1ff78]">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    {item.tag ? (
                      <div className="truncate text-[10.5px] text-white/48">
                        {item.tag}
                      </div>
                    ) : null}
                  </div>
                </div>

                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0 text-white/55 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                    isOpen && "rotate-180 text-[#e8ff1f]"
                  )}
                />
              </button>

              <div
                id={panelId}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none",
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-3.5 pt-0.5 pb-3.5 text-[11.5px] leading-relaxed text-white/76">
                    {item.content}
                  </p>
                </div>
              </div>
            </div>
          </m.li>
        )
      })}
    </ul>
  )
}
