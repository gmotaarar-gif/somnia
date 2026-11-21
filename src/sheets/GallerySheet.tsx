import * as React from "react"
import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/cn"
import { useStore, type Tone, type Widget, type WidgetSize } from "@/store/store"
import { Button, Segmented } from "@/ui/controls"
import { Field, Sheet } from "@/ui/Sheet"
import { TONES, TONE_SWATCH, WIDGET_META } from "@/widgets/catalog"
import { WidgetTile } from "@/widgets/Widget"

const UNITS = ["мин", "раз", "стр", "шагов", "мл", "ч"]

export function GallerySheet() {
  const { sheet, openSheet, widgets, updateWidget, addCustomWidget, resetWidgets } = useStore()
  const [mode, setMode] = React.useState<"catalog" | "custom">("catalog")
  const [title, setTitle] = React.useState("Медитация")
  const [unit, setUnit] = React.useState("мин")
  const [target, setTarget] = React.useState(20)
  const [step, setStep] = React.useState(5)
  const [tone, setTone] = React.useState<Tone>("violet")
  const [size, setSize] = React.useState<WidgetSize>("1x1")
  const open = sheet === "gallery"
  const close = () => openSheet(null)
  const builtIn = widgets.filter((w) => w.kind !== "custom")

  const preview: Widget = {
    id: "preview",
    kind: "custom",
    visible: true,
    title: title.trim() || "Мой виджет",
    unit,
    target,
    step,
    tone,
    size,
    value: Math.round(target * 0.4),
  }

  const create = () => {
    addCustomWidget({ title: title.trim() || "Мой виджет", unit, target: Math.max(1, target), step: Math.max(1, step), tone, size })
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Виджеты"
      description="Соберите главный экран под себя"
      footer={
        mode === "custom" ? (
          <Button className="w-full" onClick={create}>
            <Plus /> Добавить на главный
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="glass" className="flex-1" onClick={resetWidgets}>
              Сбросить
            </Button>
            <Button className="flex-1" onClick={close}>
              Готово
            </Button>
          </div>
        )
      }
    >
      <Segmented
        id="gallery"
        className="flex w-full"
        value={mode}
        onChange={setMode}
        options={[
          { value: "catalog", label: "Каталог" },
          { value: "custom", label: "Свой виджет" },
        ]}
      />

      {mode === "catalog" ? (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {builtIn.map((w) => {
            const meta = WIDGET_META[w.kind as keyof typeof WIDGET_META]
            return (
              <li key={w.id}>
                <div className="relative">
                  <div className={cn("pointer-events-none h-[168px] transition-opacity duration-250 [&_[data-widget-action]]:hidden", !w.visible && "opacity-55")} inert>
                    <WidgetTile widget={{ ...w, size: "1x1" }} interactive={false} />
                  </div>
                  <button
                    type="button"
                    aria-pressed={w.visible}
                    aria-label={`${meta.title}: ${w.visible ? "убрать с главного" : "добавить на главный"}`}
                    onClick={() => updateWidget(w.id, { visible: !w.visible })}
                    className="squircle absolute inset-0 rounded-[34px]"
                  >
                    <span
                      className={cn(
                        "absolute right-3 top-3 grid size-8 place-items-center rounded-full transition-colors duration-250 [&_svg]:size-4",
                        w.visible ? "bg-lime text-lime-ink" : "bg-white text-black"
                      )}
                    >
                      {w.visible ? <Check /> : <Plus />}
                    </span>
                  </button>
                </div>
                <div className="mt-2 px-1 text-[13px] font-medium">{meta.title}</div>
                <div className="mt-0.5 px-1 text-[12px] leading-snug text-ink-3">{meta.about}</div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-5">
          <div className={cn("mx-auto h-[178px]", size === "2x1" ? "w-full" : "w-[178px]")}>
            <WidgetTile widget={preview} interactive={false} />
          </div>

          <Field label="Название">
            <input
              value={title}
              maxLength={18}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, чтение"
              className="glass h-12 w-full rounded-full px-5 text-[15px] outline-none placeholder:text-ink-3"
            />
          </Field>

          <Field label="Единица">
            <div className="flex flex-wrap gap-2">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={unit === u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "press h-9 rounded-full px-4 text-[13px] font-medium transition-colors duration-150",
                    unit === u ? "bg-white text-black" : "glass text-ink-2"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-6 grid grid-cols-2 gap-3 [&>section]:mt-0">
            <Field label="Цель в день">
              <NumberInput value={target} onChange={setTarget} label="Цель в день" />
            </Field>
            <Field label="Шаг">
              <NumberInput value={step} onChange={setStep} label="Шаг" />
            </Field>
          </div>

          <Field label="Цвет">
            <div className="flex flex-wrap gap-2.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={`Цвет ${t}`}
                  aria-pressed={tone === t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "press size-10 rounded-full ring-offset-2 ring-offset-[#0d0d13] transition-shadow duration-150",
                    tone === t ? "ring-2 ring-white" : "ring-1 ring-white/15"
                  )}
                  style={{ background: TONE_SWATCH[t] }}
                />
              ))}
            </div>
          </Field>

          <Field label="Размер">
            <Segmented
              id="gallery-size"
              className="flex w-full"
              value={size}
              onChange={setSize}
              options={[
                { value: "1x1", label: "Компактный" },
                { value: "2x1", label: "Широкий" },
              ]}
            />
          </Field>
        </div>
      )}
    </Sheet>
  )
}

function NumberInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={1}
      max={99999}
      value={value || ""}
      onChange={(e) => onChange(Math.max(0, Math.min(99999, Math.round(Number(e.target.value) || 0))))}
      className="glass h-12 w-full rounded-full px-5 text-[17px] font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  )
}
