import * as React from "react"
import { Check, Plus, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/cn"
import { useStore, type Tone, type Widget, type WidgetSize } from "@/store/store"
import { Button, Chip, IconButton, Segmented } from "@/ui/controls"
import { Field, Sheet } from "@/ui/Sheet"
import { TONES, TONE_SWATCH, WIDGET_META } from "@/widgets/catalog"
import { WidgetTile } from "@/widgets/Widget"

const UNITS = ["мин", "раз", "стр", "шагов", "мл", "ч"]
const GROUPS = [
  { id: "all", label: "Все" },
  { id: "sleep", label: "Сон", kinds: ["streak", "sleep", "evening", "week", "energy", "rhythm", "debt", "cycle"] },
  { id: "mind", label: "Состояние", kinds: ["mood", "wellbeing"] },
  { id: "habits", label: "Привычки", kinds: ["water", "plan", "custom"] },
] as const

const TONE_NAMES: Record<Tone, string> = {
  ink: "Графит", plum: "Слива", violet: "Фиолетовый", dusk: "Сумерки", cobalt: "Кобальт",
  forest: "Лес", moss: "Мох", lime: "Лайм", ember: "Янтарь", coral: "Коралл", rose: "Роза",
}

function widgetMeta(widget: Widget) {
  return widget.kind === "custom"
    ? { title: widget.title || "Мой виджет", about: `Своя привычка · ${widget.target} ${widget.unit} в день` }
    : WIDGET_META[widget.kind]
}

export function GallerySheet() {
  const { sheet, openSheet, widgets, updateWidget, addCustomWidget, resetWidgets, notify } = useStore()
  const [mode, setMode] = React.useState<"catalog" | "custom">("catalog")
  const [query, setQuery] = React.useState("")
  const [group, setGroup] = React.useState<string>("all")
  const [confirmReset, setConfirmReset] = React.useState(false)
  const resetPrompt = React.useRef<HTMLDivElement>(null)
  const restoreTrigger = React.useRef<HTMLButtonElement>(null)
  const wasConfirming = React.useRef(false)
  const [title, setTitle] = React.useState("Медитация")
  const [unit, setUnit] = React.useState("мин")
  const [target, setTarget] = React.useState(20)
  const [step, setStep] = React.useState(5)
  const [tone, setTone] = React.useState<Tone>("violet")
  const [size, setSize] = React.useState<WidgetSize>("1x1")
  const open = sheet === "gallery"
  const close = () => openSheet(null)
  React.useLayoutEffect(() => {
    if (open && confirmReset) resetPrompt.current?.querySelector<HTMLButtonElement>("button")?.focus()
    else if (open && wasConfirming.current) restoreTrigger.current?.focus()
    wasConfirming.current = confirmReset
  }, [open, confirmReset])
  React.useEffect(() => {
    if (open) {
      setMode("catalog")
      setQuery("")
      setGroup("all")
      setConfirmReset(false)
    }
  }, [open])

  const selected = widgets.filter((widget) => widget.visible).length
  const category = GROUPS.find((item) => item.id === group) ?? GROUPS[0]
  const filtered = widgets.filter((widget) => {
    const meta = widgetMeta(widget)
    const matchesGroup = !("kinds" in category) || (category.kinds as readonly string[]).includes(widget.kind)
    return matchesGroup && `${meta.title} ${meta.about}`.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"))
  })
  const valid = title.trim().length > 0 && target >= 1 && step >= 1

  const restore = () => {
    resetWidgets()
    setConfirmReset(false)
    notify("Стандартные виджеты восстановлены")
  }

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
    if (!valid) return
    addCustomWidget({ title: title.trim(), unit, target, step, tone, size })
    notify("Виджет добавлен на главный экран")
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Виджеты"
      description="Оставьте то, что помогает именно вам"
      footer={
        mode === "custom" ? (
          <Button className="w-full" onClick={create} disabled={!valid}>
            <Plus /> Добавить на главный
          </Button>
        ) : (
          <div>
            {confirmReset ? (
              <div ref={resetPrompt} role="group" aria-label="Восстановление виджетов">
                <p className="text-[14px] font-medium">Вернуть стандартный набор?</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">Цвета, размеры и порядок стандартных виджетов сбросятся. Свои привычки и их прогресс сохранятся.</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="glass" className="flex-1 px-3" onClick={() => setConfirmReset(false)}>Отмена</Button>
                  <Button className="flex-1 px-3" onClick={restore}>Восстановить</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <IconButton ref={restoreTrigger} label="Вернуть стандартный набор" onClick={() => setConfirmReset(true)}><RotateCcw /></IconButton>
                <p role="status" className="min-w-0 flex-1 text-[12px] text-ink-2">На главном: <span className="font-semibold text-ink">{selected}</span></p>
                <Button onClick={close}>Готово</Button>
              </div>
            )}
          </div>
        )
      }
    >
      <Segmented
        id="gallery"
        label="Тип виджета"
        className="flex w-full"
        value={mode}
        onChange={setMode}
        options={[
          { value: "catalog", label: "Каталог" },
          { value: "custom", label: "Свой виджет" },
        ]}
      />

      {mode === "catalog" ? (
        <div className="mt-5">
          <div className="glass flex h-12 items-center gap-2 rounded-full px-4 focus-within:ring-2 focus-within:ring-lime">
            <Search aria-hidden className="size-[18px] shrink-0 text-ink-2" />
            <input type="search" aria-label="Найти виджет" placeholder="Найти виджет" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-2 [&::-webkit-search-cancel-button]:appearance-none" />
            {query && <button type="button" aria-label="Очистить поиск" onClick={() => setQuery("")} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-2"><X className="size-4" /></button>}
          </div>
          <div role="group" aria-label="Категория виджетов" className="mt-3 flex flex-wrap gap-2">
            {GROUPS.map((item) => <Chip key={item.id} active={group === item.id} onClick={() => setGroup(item.id)}>{item.label}</Chip>)}
          </div>
          <p role="status" className="mt-4 px-1 text-[12px] text-ink-2">Найдено: {filtered.length} · нажмите, чтобы добавить или убрать</p>
          {filtered.length === 0 ? (
            <div className="glass mt-4 rounded-[28px] px-5 py-8 text-center">
              <SlidersHorizontal aria-hidden className="mx-auto size-7 text-ink-2" />
              <h3 className="mt-4 text-[17px] font-semibold">Ничего не нашлось</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Попробуйте другое название или создайте свою привычку.</p>
              <Button variant="glass" className="mt-5" onClick={() => { setQuery(""); setGroup("all") }}>Показать все</Button>
            </div>
          ) : <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
          {filtered.map((w) => {
            const meta = widgetMeta(w)
            return (
              <li key={w.id}>
                <div className="relative">
                  <div className="pointer-events-none h-[168px] [&_[data-widget-action]]:hidden" inert>
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
                <div className="mt-0.5 px-1 text-[12px] leading-snug text-ink-2">{meta.about}</div>
                <div className={cn("mt-1.5 px-1 text-[11px] font-medium", w.visible ? "text-lime" : "text-ink-2")}>{w.visible ? "На главном" : "Добавить на главный"}</div>
              </li>
            )
          })}
        </ul>}
        </div>
      ) : (
        <div className="mt-5">
          <p className="mb-4 text-center text-[12px] text-ink-2">Предпросмотр · пример прогресса</p>
          <div className={cn("mx-auto h-[178px]", size === "2x1" ? "w-full" : "w-[178px]")}>
            <WidgetTile widget={preview} interactive={false} />
          </div>

          <Field label="Название">
            <input
              value={title}
              aria-label="Название виджета"
              maxLength={18}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, чтение"
              className="glass h-12 w-full rounded-full px-5 text-[15px] placeholder:text-ink-3"
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
                    "press h-11 rounded-full px-4 text-[13px] font-medium transition-colors duration-150",
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
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-ink-2">Шаг — сколько прибавится за одно нажатие. Цель и шаг должны быть больше нуля.</p>

          <Field label="Цвет">
            <div className="flex flex-wrap gap-2.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={`Цвет: ${TONE_NAMES[t]}`}
                  title={TONE_NAMES[t]}
                  aria-pressed={tone === t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "press grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-[#0d0d13] transition-shadow duration-150",
                    tone === t ? "ring-2 ring-white" : "ring-1 ring-white/15"
                  )}
                  style={{ background: TONE_SWATCH[t] }}
                >
                  {tone === t && <Check aria-hidden className="size-5 text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Размер">
            <Segmented
              id="gallery-size"
              label="Размер виджета"
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
      className="glass h-12 w-full rounded-full px-5 text-[17px] font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  )
}
