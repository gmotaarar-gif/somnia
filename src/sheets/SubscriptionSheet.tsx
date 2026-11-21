import * as React from "react"
import { ArrowRight, Check, CircleCheck, LockKeyhole, ScanLine, ShieldCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/cn"
import { useStore } from "@/store/store"
import { SUBSCRIPTION_PLANS, useSubscription, type SubscriptionPlan } from "@/store/subscription"
import { Button } from "@/ui/controls"
import { Sheet } from "@/ui/Sheet"

const rubles = (value: number) => `${value.toLocaleString("ru-RU")} ₽`
const dateLabel = (value: string) => new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
const saving = Math.round((1 - SUBSCRIPTION_PLANS.yearly.price / (SUBSCRIPTION_PLANS.monthly.price * 12)) * 100)

export function SubscriptionSheet() {
  const { sheet, sheetArg, openSheet } = useStore()
  const { isPlus } = useSubscription()
  const fromPractice = sheet === "bodyscan"
  const open = sheet === "subscription" || (fromPractice && !isPlus)
  const close = () => openSheet(sheetArg === "profile" && !fromPractice ? "profile" : null)
  return (
    <Sheet open={open} onClose={close} title="somna plus" description="Больше пространства для отдыха" form>
      <SubscriptionContent key={open ? "open" : "closed"} fromPractice={fromPractice} onClose={close} />
    </Sheet>
  )
}

function SubscriptionContent({ fromPractice, onClose }: { fromPractice: boolean; onClose: () => void }) {
  const { membership, isPlus, error, activate, deactivate, clearError } = useSubscription()
  const { openSheet, notify } = useStore()
  const [plan, setPlan] = React.useState<SubscriptionPlan>("yearly")
  const [confirm, setConfirm] = React.useState(false)

  React.useEffect(() => clearError(), [clearError])

  const enable = () => {
    if (!activate(plan)) return
    notify("Somna Plus включён · без списаний")
    // Transfer to an explicit sheet so activating from a locked practice doesn't dismiss the confirmation.
    if (fromPractice) openSheet("subscription", "bodyscan")
  }

  return (
    <>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5">
        <div className="on-dark relative isolate overflow-hidden rounded-[30px] border border-white/10 bg-[#1d1929] px-5 pb-6 pt-7 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,#7552ab80,transparent_75%)]" />
          <span className="mx-auto grid size-16 place-items-center rounded-[23px] border border-[#e1cfff]/30 bg-[#c4a3ff]/15 text-[#e1cfff] shadow-[0_0_45px_-8px_#b28ae870]">
            {isPlus ? <CircleCheck className="size-8" strokeWidth={1.5} /> : <Sparkles className="size-8" strokeWidth={1.5} />}
          </span>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.13em] text-[#dbc5ff]">
            <ShieldCheck className="size-3" /> Локальная демоверсия
          </span>
          <h3 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-[-0.04em]">{isPlus ? "Ваше время для себя" : <>Меньше напряжения.<br />Больше себя.</>}</h3>
          <p className="mx-auto mt-3 max-w-[270px] text-[13px] leading-relaxed text-[#d3c9e1]">
            {isPlus ? "Plus уже включён в этом браузере. Никаких списаний и автоматического продления." : "Откройте сканирование тела — мягкую практику, чтобы замедлиться и отпустить день."}
          </p>
        </div>

        {isPlus && membership ? (
          <>
            <div className="glass mt-4 rounded-[24px] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px] font-semibold">Plus · {membership.plan === "yearly" ? "на год" : "на месяц"}</span>
                <span className="rounded-full bg-lime/12 px-2.5 py-1 text-[11px] font-medium text-lime">Активен</span>
              </div>
              <dl className="mt-4 space-y-2 text-[13px]">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-ink-3">Доступ до</dt><dd>{dateLabel(membership.endsAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-3">Автопродление</dt><dd>Выключено</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-3">Оплачено</dt><dd>0 ₽ · демо</dd></div>
              </dl>
            </div>
            <button type="button" onClick={() => openSheet("bodyscan")} className="press glass mt-3 flex w-full items-center gap-3 rounded-[24px] p-4 text-left">
              <ScanLine className="size-5 text-[#d7bdff]" />
              <span className="flex-1"><span className="block text-[14px] font-medium">Сканирование тела</span><span className="mt-0.5 block text-[12px] text-ink-3">Ваша Plus-практика · 3 минуты</span></span>
              <ArrowRight className="size-4 text-ink-3" />
            </button>
            <p className="mt-4 text-[12px] leading-relaxed text-ink-3">Доступ сохранён только в этом браузере и не переносится на другие устройства. Очистка данных браузера удалит демоподписку.</p>
            {confirm ? (
              <div className="mt-5 rounded-[22px] border border-white/12 p-4">
                <h4 className="text-[14px] font-semibold">Отключить Plus сейчас?</h4>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">Сканирование тела снова станет недоступно. Журнал и история практик останутся с вами.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="glass" className="px-3 text-[13px]" onClick={() => setConfirm(false)}>Оставить Plus</Button>
                  <Button variant="danger" className="px-3 text-[13px]" onClick={() => {
                    if (!deactivate()) return
                    setConfirm(false)
                    notify("Plus отключён. Ваши записи сохранены")
                  }}>Отключить</Button>
                </div>
              </div>
            ) : <Button variant="ghost" className="mt-3 w-full text-[13px]" onClick={() => setConfirm(true)}>Отключить демоподписку</Button>}
          </>
        ) : (
          <>
            {fromPractice && <p className="mt-4 flex items-center gap-2 text-[13px] text-[#dac5ff]"><LockKeyhole className="size-4 shrink-0" /> Сканирование тела доступно с Plus</p>}
            <div className="mt-5 space-y-3">
              {[
                ["Сканирование тела", "3 минуты внимания от стоп до макушки"],
                ["В своём ритме", "Пауза и продолжение в любой момент"],
              ].map(([title, text]) => (
                <div key={title} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#d7bdff]" />
                  <div><p className="text-[14px] font-medium">{title}</p><p className="mt-0.5 text-[12px] text-ink-3">{text}</p></div>
                </div>
              ))}
            </div>
            <fieldset className="mt-6 space-y-2.5">
              <legend className="mb-3 text-[11px] font-medium uppercase tracking-[0.09em] text-ink-3">Выберите тариф · пример цен</legend>
              {(["yearly", "monthly"] as const).map((id) => {
                const option = SUBSCRIPTION_PLANS[id]
                return (
                  <label key={id} className={cn("relative flex cursor-pointer items-center gap-3 rounded-[23px] border p-4 transition-colors duration-150", plan === id ? "border-[#d6baff] bg-[#c4a3ff]/10" : "border-white/12 bg-white/3")}>
                    <input type="radio" name="subscription-plan" value={id} checked={plan === id} onChange={() => setPlan(id)} className="peer sr-only" />
                    <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-lime", plan === id ? "border-[#d6baff] bg-[#d6baff] text-[#251b35]" : "border-white/30")}>{plan === id && <Check className="size-3.5" strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold">{option.title}{id === "yearly" && <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-semibold text-lime-ink">−{saving}%</span>}</span><span className="mt-1 block text-[11px] text-ink-3">{id === "yearly" ? `≈ ${rubles(Math.round(option.price / 12))} в месяц` : "Для первого знакомства"}</span></span>
                    <span className="text-right"><span className="block text-[20px] font-semibold tracking-[-0.03em]">{rubles(option.price)}</span><span className="block text-[11px] text-ink-3">{id === "yearly" ? "за год" : "за месяц"}</span></span>
                  </label>
                )
              })}
            </fieldset>
            <p className="mt-4 text-[12px] leading-relaxed text-ink-3">Дневник сна, чек-ины, статьи, заземление и дневник тревог остаются бесплатными.</p>
          </>
        )}
        {error && <p role="alert" className="mt-4 rounded-[18px] bg-[#ff5d5d]/10 p-3 text-[12px] leading-relaxed text-[#ffabab]">{error}</p>}
      </div>
      <footer className="shrink-0 border-t border-hair bg-sheet px-6 pb-[max(var(--safe-bottom),20px)] pt-4">
        <Button className="w-full" onClick={isPlus ? onClose : enable}>{isPlus ? "Готово" : <>Включить Plus бесплатно <ArrowRight /></>}</Button>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-3">{isPlus ? "Демодоступ · без оплаты и автопродления" : "Это демо: деньги не списываются, карта не нужна. Цены выше — пример, не платёж."}</p>
        {!isPlus && <button type="button" onClick={onClose} className="press mt-2 min-h-9 w-full text-[12px] text-ink-2">Продолжить бесплатно</button>}
      </footer>
    </>
  )
}
