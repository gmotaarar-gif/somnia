export function Aurora({ tab }: { tab: string }) {
  return (
    <div className="aurora" data-tab={tab} aria-hidden>
      <div className="aurora-blob b1" />
      <div className="aurora-blob b2" />
      <div className="aurora-blob b3" />
      <div className="aurora-veil" />
      <div className="aurora-dots" />
      <div className="grain" />
    </div>
  )
}
