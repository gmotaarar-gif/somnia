import { BotAvatar } from "bot-avatars"
import { useNow } from "@/store/derived"
import { useStore } from "@/store/store"

export function mascotState(nightMode: boolean, active: boolean, hour: number) {
  if (nightMode) return "sleeping"
  if (active) return "working"
  return hour >= 23 || hour < 6 ? "sleeping" : "default"
}

export function Mascot({ size = 64, active = false }: { size?: number; active?: boolean }) {
  const { nightMode, sheet } = useStore()
  const now = useNow(60_000)
  return (
    <span className="pointer-events-none inline-flex shrink-0 align-middle" style={{ width: size, height: size }}>
      <BotAvatar type="cloud" state={mascotState(nightMode, active || sheet === "grounding", now.getHours())}
        size={size} face="eyes" color="#c4cafa" shading="smooth" theme="auto" interactive={false} />
    </span>
  )
}
