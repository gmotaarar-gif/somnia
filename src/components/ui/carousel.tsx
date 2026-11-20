import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import { cn } from "@/lib/utils"

export type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  opts?: CarouselOptions
  setApi?: (api: CarouselApi) => void
}

const CarouselContext = React.createContext<{
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: CarouselApi
} | null>(null)

export function Carousel({
  opts,
  setApi,
  className,
  children,
  ...props
}: CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel({
    ...opts,
    axis: "x",
  })

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  const contextValue = React.useMemo(
    () => ({ carouselRef, api }),
    [carouselRef, api]
  )

  return (
    <CarouselContext.Provider value={contextValue}>
      <div className={cn("relative", className)} role="region" {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

export const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(CarouselContext)
  if (!ctx) throw new Error("CarouselContent must be inside Carousel")
  return (
    <div ref={ctx.carouselRef} className="overflow-hidden">
      <div ref={ref} className={cn("-ml-3 flex", className)} {...props} />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

export const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    aria-roledescription="slide"
    className={cn("min-w-0 shrink-0 grow-0 basis-full pl-3", className)}
    {...props}
  />
))
CarouselItem.displayName = "CarouselItem"
