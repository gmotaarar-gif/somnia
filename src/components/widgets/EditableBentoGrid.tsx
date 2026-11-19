import * as React from "react"
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"
import { BentoWidgetCard } from "@/components/widgets/BentoWidgetCard"
import { SOMNA_TRANSITIONS } from "@/lib/motion"
import { useSomna } from "@/store/useSomnaStore"

export function EditableBentoGrid() {
  const { widgets, setWidgets, editWidgetsMode, setWidgetGalleryOpen } = useSomna()

  const visibleWidgets = React.useMemo(
    () => widgets.filter((w) => w.visible),
    [widgets]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setWidgets((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleWidgets.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 gap-3">
          {visibleWidgets.map((widget, index) => (
            <BentoWidgetCard key={widget.id} widget={widget} index={index} />
          ))}

          {/* Add new widget soft-glass tile shown in Edit Mode (07-panel-reveal timing) */}
          <AnimatePresence initial={false}>
            {editWidgetsMode ? (
              <motion.button
                key="add-widget-tile"
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: SOMNA_TRANSITIONS.panelOpen,
                }}
                exit={{
                  opacity: 0,
                  y: 8,
                  transition: SOMNA_TRANSITIONS.panelClose,
                }}
                onClick={() => setWidgetGalleryOpen(true)}
                className="col-span-2 flex min-h-[86px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[26px] border border-dashed border-[#e8ff1f]/38 bg-[#e8ff1f]/[0.07] p-4 text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md transition-[background-color,border-color,transform] duration-[var(--duration-quick)] ease-[var(--ease-smooth-out)] hover:bg-[#e8ff1f]/[0.13] active:scale-[0.985] motion-reduce:transition-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8ff1f]/32 bg-[#e8ff1f]/[0.16] text-[#f2ff78] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold">
                  Добавить или создать новый Bento-виджет
                </span>
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  )
}
