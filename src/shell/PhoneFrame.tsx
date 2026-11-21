import * as React from "react"
import { Capacitor } from "@capacitor/core"
import { BatteryFull, Signal, Wifi } from "lucide-react"
import { clockOf } from "@/lib/time"
import { useNow } from "@/store/derived"

const ScreenContext = React.createContext<HTMLElement | null>(null)
const FramedContext = React.createContext(false)

/** True when the app is shown inside the phone mock-up rather than full-screen. */
export function useIsFramed() {
  return React.useContext(FramedContext)
}

/** Element of the phone screen: portals (sheets) mount into it so they stay inside the device. */
export function useScreenEl() {
  return React.useContext(ScreenContext)
}

function useFramed() {
  const native = Capacitor.isNativePlatform()
  const query = "(min-width: 520px) and (min-height: 560px)"
  const [framed, setFramed] = React.useState(() => !native && window.matchMedia(query).matches)
  React.useEffect(() => {
    if (native) return
    const mq = window.matchMedia(query)
    const on = () => setFramed(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [native])
  return !native && framed
}

function StatusBar() {
  const now = useNow(15_000)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[90] flex h-[52px] items-center justify-between px-9 pt-2 text-white" aria-hidden>
      <span className="w-14 text-[16px] font-semibold tracking-[-0.01em]">{clockOf(now.toISOString())}</span>
      <span className="flex w-[70px] items-center justify-end gap-[5px]">
        <Signal className="size-[16px]" strokeWidth={2.6} />
        <Wifi className="size-[16px]" strokeWidth={2.6} />
        <BatteryFull className="size-[23px]" strokeWidth={1.8} />
      </span>
    </div>
  )
}

/**
 * The app is mobile-only. On a real phone it fills the viewport;
 * on anything wider it is presented inside a phone mock-up.
 */
export function PhoneFrame({ tab, children }: { tab: string; children: React.ReactNode }) {
  const framed = useFramed()
  const [el, setEl] = React.useState<HTMLElement | null>(null)

  const screen = (
    <div ref={setEl} className="phone-screen" data-framed={framed ? "" : undefined}>
      <FramedContext.Provider value={framed}>
        <ScreenContext.Provider value={el}>{children}</ScreenContext.Provider>
      </FramedContext.Provider>
      <span className="top-scrim" data-framed={framed ? "" : undefined} aria-hidden />
      {framed && (
        <>
          <StatusBar />
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-[90] h-[5px] w-[136px] -translate-x-1/2 rounded-full bg-white/80" aria-hidden />
        </>
      )}
    </div>
  )

  if (!framed) return screen

  return (
    <div className="stage" data-tab={tab}>
      <div className="phone">
        <span className="phone-btn -left-[3px] top-[118px] h-[30px]" aria-hidden />
        <span className="phone-btn -left-[3px] top-[176px] h-[58px]" aria-hidden />
        <span className="phone-btn -left-[3px] top-[246px] h-[58px]" aria-hidden />
        <span className="phone-btn -right-[3px] top-[204px] h-[92px] -scale-x-100" aria-hidden />
        {screen}
      </div>
      <aside className="stage-note left-[max(40px,calc(50%-560px))]">
        <div className="text-[15px] font-semibold tracking-[-0.01em]">Somna</div>
        <p className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em]">
          Сон и состояние
          <br />в одном ритме
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-2">Мобильное приложение. Здесь оно показано в макете телефона: откройте с телефона, чтобы увидеть на весь экран.</p>
      </aside>
      <aside className="stage-note right-[max(40px,calc(50%-560px))]">
        <ul className="space-y-5 text-[14px] leading-relaxed text-ink-2">
          <li><b className="block text-[15px] font-semibold text-ink">Виджеты</b>Удерживайте карточку, чтобы перетащить, изменить размер или цвет.</li>
          <li><b className="block text-[15px] font-semibold text-ink">Плюс в доке</b>Чек-ин состояния и запись сна за минуту.</li>
          <li><b className="block text-[15px] font-semibold text-ink">Итоги недели</b>Истории с индексом сна и целью на следующую неделю.</li>
        </ul>
      </aside>
    </div>
  )
}
