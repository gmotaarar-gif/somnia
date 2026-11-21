import { ArrowUpRight, Check, Smartphone, UserRoundPlus } from "lucide-react"
import { useLocalAccount } from "./LocalAccountProvider"

/** Account section for ProfileSheet; keep registration separate from profile layout. */
export function LocalAccountCard() {
  const { account, openRegistration } = useLocalAccount()
  return (
    <button
      type="button"
      onClick={openRegistration}
      className="glass press flex w-full items-center gap-3.5 rounded-[26px] p-4 text-left"
      aria-label={account ? "Изменить локальный профиль" : "Создать локальный профиль"}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lime/12 text-lime">
        {account ? <Check className="size-5" /> : <UserRoundPlus className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{account ? "Локальный профиль" : "Создать профиль"}</span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-2">{account?.email ?? "Без пароля. В вашем ритме."}</span>
        <span className="mt-2 flex items-center gap-1 text-[11px] text-ink-3"><Smartphone className="size-3" /> Только этот браузер · без синхронизации</span>
      </span>
      <ArrowUpRight className="size-[18px] shrink-0 text-ink-3" />
    </button>
  )
}
