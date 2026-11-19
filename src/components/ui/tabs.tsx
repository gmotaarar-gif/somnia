import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { prefersReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

// ---------- shadcn Tabs with transitions.dev 16-tabs-sliding pill ----------
export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const pillRef = React.useRef<HTMLSpanElement | null>(null)
  const mountedRef = React.useRef(false)

  const assignRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )

  const syncPill = React.useCallback((animate: boolean) => {
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill) return
    const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
    if (!active) return
    const left = active.offsetLeft
    const width = active.offsetWidth
    if (!animate || prefersReducedMotion()) {
      const prev = pill.style.transition
      pill.style.transition = "none"
      pill.style.transform = `translateX(${left}px)`
      pill.style.width = `${width}px`
      void pill.offsetWidth
      pill.style.transition = prev
    } else {
      pill.style.transform = `translateX(${left}px)`
      pill.style.width = `${width}px`
    }
  }, [])

  React.useLayoutEffect(() => {
    syncPill(mountedRef.current)
    mountedRef.current = true
  }, [syncPill])

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return

    const mo = new MutationObserver(() => syncPill(true))
    mo.observe(list, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state"],
    })

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncPill(false))
        : null
    ro?.observe(list)

    return () => {
      mo.disconnect()
      ro?.disconnect()
    }
  }, [syncPill])

  return (
    <TabsPrimitive.List
      ref={assignRef}
      className={cn(
        "relative inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] p-1 text-white/60 backdrop-blur-md",
        className
      )}
      {...props}
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="t-tabs-pill top-1 h-[calc(100%-8px)] rounded-full border border-white/18 bg-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
      />
      {children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-[1] inline-flex h-full items-center justify-center whitespace-nowrap rounded-full border border-transparent px-3.5 py-1.5 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] cursor-pointer focus-visible:outline-none data-[state=active]:text-white motion-reduce:transition-none",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-3 focus-visible:outline-none", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// ---------- shadcn ToggleGroup (Soft Frosted Pills) ----------
export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
))
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 cursor-pointer hover:bg-white/[0.11] data-[state=on]:border-[#e8ff1f]/42 data-[state=on]:bg-[#e8ff1f]/[0.16] data-[state=on]:text-[#f2ff78] data-[state=on]:shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
      className
    )}
    {...props}
  >
    {children}
  </ToggleGroupPrimitive.Item>
))
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

// ---------- shadcn Input & Textarea ----------
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-white/35 transition-[border-color,background-color,box-shadow] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none focus-visible:border-white/32 focus-visible:bg-white/[0.08] focus-visible:outline-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[76px] w-full rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-white/35 transition-[border-color,background-color] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] motion-reduce:transition-none focus-visible:border-white/32 focus-visible:bg-white/[0.08] focus-visible:outline-none resize-none",
      className
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = "Textarea"
