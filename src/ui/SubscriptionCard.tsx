import { ArrowUpRight, Sparkles } from "lucide-react"
import { useStore } from "@/store/store"
import { useSubscription } from "@/store/subscription"
import { cn } from "@/lib/cn"

/** Self-contained entry point; safe to place anywhere inside the app providers. */
export function SubscriptionCard({ className }: { className?: string }) {
  const { openSheet } = useStore()
  const { isPlus } = useSubscription()
  return (
    <button
      type="button"
      onClick={() => openSheet("subscription", "profile")}
      className={cn("press relative flex w-full items-center gap-3 overflow-hidden rounded-[26px] border border-[#c4a3ff]/25 bg-gradient-to-br from-[#352b4d] via-[#211c31] to-[#16151f] p-4 text-left", className)}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#c4a3ff]/15 text-[#dbc5ff]">
        <Sparkles className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
          somna <span className="rounded-full bg-[#dac5ff] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#2b174c]">plus</span>
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-[#dbd0eb]">{isPlus ? "Подписка активна · управление" : "Больше заботы о себе · узнать о подписке"}</span>
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-[#dac5ff]" />
    </button>
  )
}
