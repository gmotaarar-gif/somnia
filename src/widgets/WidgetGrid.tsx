import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "framer-motion"
import { Maximize2, Minimize2, Minus, Palette, Plus } from "lucide-react"
import { cn } from "@/lib/cn"
import { DUR, EASE_OUT } from "@/lib/motion"
import { useStore, type Widget } from "@/store/store"
import { TONES } from "@/widgets/catalog"
import { WidgetTile } from "@/widgets/Widget"

function EditButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={{ duration: DUR.fast, ease: EASE_OUT }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "absolute z-20 grid size-8 place-items-center rounded-full bg-white text-black shadow-[0_6px_18px_rgb(0_0_0/0.5)] [&_svg]:size-4",
        className
      )}
    >
      {children}
    </motion.button>
  )
}

function SortableWidget({ widget, editing }: { widget: Widget; editing: boolean }) {
  const { updateWidget, setEditing } = useStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !editing,
  })
  const press = React.useRef<number | null>(null)
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current)
    press.current = null
  }
  const wide = widget.size === "2x1"

  const remove = () => updateWidget(widget.id, { visible: false })
  const nextTone = () =>
    updateWidget(widget.id, { tone: TONES[(TONES.indexOf(widget.tone) + 1) % TONES.length] })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", wide ? "col-span-2" : "col-span-1", isDragging && "z-30")}
      onPointerDown={() => {
        if (editing) return
        press.current = window.setTimeout(() => setEditing(true), 520)
      }}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        {...(editing ? { ...attributes, ...listeners } : {})}
        className={cn(
          "h-full rounded-[34px] outline-offset-4",
          editing && "cursor-grab touch-manipulation select-none active:cursor-grabbing",
          editing && !isDragging && "jiggle",
          isDragging && "scale-[1.04] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.9)] transition-transform"
        )}
      >
        <WidgetTile widget={widget} interactive={!editing} className={editing ? "pointer-events-none" : undefined} />
      </div>
      <AnimatePresence>
        {editing && !isDragging && (
          <>
            <EditButton key="rm" label="Убрать виджет" onClick={remove} className="-left-1.5 -top-1.5">
              <Minus />
            </EditButton>
            <EditButton key="tone" label="Сменить цвет" onClick={nextTone} className="-right-1.5 -top-1.5">
              <Palette />
            </EditButton>
            <EditButton
              key="size"
              label={wide ? "Сделать компактным" : "Сделать широким"}
              onClick={() => updateWidget(widget.id, { size: wide ? "1x1" : "2x1" })}
              className="-bottom-1.5 -right-1.5"
            >
              {wide ? <Minimize2 /> : <Maximize2 />}
            </EditButton>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function WidgetGrid() {
  const { widgets, setWidgets, editing, openSheet } = useStore()
  const visible = React.useMemo(() => widgets.filter((w) => w.visible), [widgets])
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setWidgets((ws) => {
      const from = ws.findIndex((w) => w.id === active.id)
      const to = ws.findIndex((w) => w.id === over.id)
      return from < 0 || to < 0 ? ws : arrayMove(ws, from, to)
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visible.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-flow-dense auto-rows-[178px] grid-cols-2 gap-3">
          {visible.map((w) => (
            <SortableWidget key={w.id} widget={w} editing={editing} />
          ))}
          <button
            type="button"
            onClick={() => openSheet("gallery")}
            className="press squircle group col-span-1 flex flex-col items-center justify-center gap-3 rounded-[34px] border border-dashed border-white/22 bg-white/[0.03] text-ink-2 transition-colors duration-250 hover:border-white/40 hover:text-ink"
            style={{ "--r": "34px" } as React.CSSProperties}
          >
            <span className="glass grid size-12 place-items-center rounded-full">
              <Plus className="size-5" />
            </span>
            <span className="text-[13px] font-medium">Добавить виджет</span>
          </button>
        </div>
      </SortableContext>
    </DndContext>
  )
}
