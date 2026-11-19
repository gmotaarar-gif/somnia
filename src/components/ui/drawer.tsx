import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useIPhonePortal } from "@/context/IPhonePortalContext"
import { cn } from "@/lib/utils"

// ---------- Vaul iOS Drawer scoped inside #iphone-portal-root ----------
export function Drawer({
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const portal = useIPhonePortal()
  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      container={portal ?? undefined}
      {...props}
    />
  )
}

export const DrawerTrigger = DrawerPrimitive.Trigger
export const DrawerClose = DrawerPrimitive.Close

export const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const portal = useIPhonePortal()
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={cn(
        portal ? "absolute" : "fixed",
        "inset-0 z-40 bg-black/68 backdrop-blur-[2px] pointer-events-auto",
        className
      )}
      {...props}
    />
  )
})
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    hideHandle?: boolean
  }
>(({ className, children, hideHandle = false, ...props }, ref) => {
  const portal = useIPhonePortal()
  return (
    <DrawerPrimitive.Portal container={portal ?? undefined}>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          portal ? "absolute" : "fixed",
          "inset-x-0 bottom-0 z-50 mt-6 flex max-h-[93%] flex-col rounded-t-[34px] border-t border-white/15 bg-[#101118]/98 text-white shadow-2xl outline-none pointer-events-auto",
          className
        )}
        {...props}
      >
        {!hideHandle ? (
          <div className="mx-auto mt-3 mb-1 h-1.5 w-11 shrink-0 rounded-full bg-white/25" />
        ) : null}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  )
})
DrawerContent.displayName = "DrawerContent"

export function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-1 px-5 pt-2 pb-3 text-left", className)} {...props} />
  )
}

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold tracking-tight text-white", className)}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-xs text-white/55", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

// ---------- Scoped Radix Dialog inside #iphone-portal-root (transitions.dev 06-modal) ----------
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean
  }
>(({ className, children, hideClose = false, ...props }, ref) => {
  const portal = useIPhonePortal()
  return (
    <DialogPrimitive.Portal container={portal ?? undefined}>
      <DialogPrimitive.Overlay
        className={cn(
          portal ? "absolute" : "fixed",
          "t-radix-overlay inset-0 z-40 bg-black/82 backdrop-blur-xs pointer-events-auto"
        )}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          portal ? "absolute" : "fixed",
          "t-radix-modal inset-0 z-50 flex flex-col overflow-hidden bg-[#07070c] text-white outline-none pointer-events-auto",
          className
        )}
        {...props}
      >
        {children}
        {!hideClose ? (
          <DialogPrimitive.Close className="absolute top-12 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-white/[0.1] text-white/85 backdrop-blur-md transition-[background-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-white/[0.18] active:scale-95 motion-reduce:transition-none cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
