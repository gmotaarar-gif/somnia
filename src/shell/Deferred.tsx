import { Suspense, useState, type ReactNode } from "react"

export function Deferred({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active)
  if (active && !visited) setVisited(true)
  return active || visited ? <Suspense fallback={null}>{children}</Suspense> : null
}
