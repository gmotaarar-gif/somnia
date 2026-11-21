import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, Check, ChevronRight, Eye, LockKeyhole, NotebookPen, ScanLine } from "lucide-react"
import { ARTICLES, TOPICS, type Article, type ArticleTopic } from "@/lib/articles"
import { cn } from "@/lib/cn"
import { DUR, EASE_OUT, riseIn } from "@/lib/motion"
import { pluralRu } from "@/lib/time"
import { useStore } from "@/store/store"
import { useSubscription } from "@/store/subscription"
import { TopBar } from "@/shell/TopBar"
import { Card } from "@/ui/Card"
import { Chip, SectionHead } from "@/ui/controls"

const PREVIEW = 3

export const RITUAL = [
  { id: "dim", label: "Приглушить свет", hint: "за час до сна" },
  { id: "screen", label: "Убрать экран", hint: "за 30 минут" },
  { id: "warm", label: "Тёплый душ или чай", hint: "телу проще остыть" },
  { id: "air", label: "Проветрить спальню", hint: "17–20 °C" },
  { id: "notes", label: "Выгрузить мысли", hint: "три строки на бумаге" },
]

const LIBRARY = [
  { id: "grounding", tone: "moss", icon: Eye, title: "Заземление", sub: "5-4-3-2-1 · 3 мин" },
  { id: "bodyscan", tone: "plum", icon: ScanLine, title: "Скан тела", sub: "Расслабление · 3 мин" },
] as const

function ArticleRow({ article, read, onOpen }: { article: Article; read: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="press glass flex w-full items-center gap-4 rounded-[26px] p-3 pr-4 text-left">
      <Card tone={article.tone} r="sm" className="size-[68px] shrink-0">
        <span className="grid size-full place-items-center text-[11px] font-semibold tabular-nums">{article.min} мин</span>
      </Card>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] text-ink-3">{article.tag}</span>
        <span className="mt-0.5 line-clamp-2 block text-[15px] font-medium leading-snug">{article.title}</span>
      </span>
      {read ? (
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-lime-ink" aria-label="Прочитано">
          <Check className="size-3.5" strokeWidth={3.5} />
        </span>
      ) : (
        <ChevronRight className="size-5 shrink-0 text-ink-3" />
      )}
    </button>
  )
}

export function PracticesScreen() {
  const { isPlus } = useSubscription()
  const { ritual, toggleRitual, sessions, worries, readArticles, openSheet } = useStore()
  const [topic, setTopic] = React.useState<ArticleTopic | "all">("all")
  const totalMin = Math.round(sessions.reduce((s, x) => s + x.min, 0))
  const openWorries = worries.filter((w) => !w.done).length
  const readCount = ARTICLES.filter((a) => readArticles.includes(a.id)).length
  const featured = ARTICLES.find((a) => !readArticles.includes(a.id)) ?? ARTICLES[0]
  const [all, setAll] = React.useState(false)
  const list = ARTICLES.filter((a) => a.id !== featured.id && (topic === "all" || a.topic === topic))
  const shown = all ? list : list.slice(0, PREVIEW)
  const open = (id: "grounding" | "bodyscan") => (e?: React.KeyboardEvent) => {
    if (e && e.key !== "Enter" && e.key !== " ") return
    e?.preventDefault()
    openSheet(id)
  }

  return (
    <>
      <TopBar title="Практики" sub={`${readCount} из ${ARTICLES.length} ${pluralRu(ARTICLES.length, ["статьи", "статей", "статей"])} прочитано`} />

      <motion.div {...riseIn(0)}>
        <Card tone={featured.tone} r="lg">
          <button
            type="button"
            aria-label={`Читать: ${featured.title}`}
            onClick={() => openSheet("article", featured.id)}
            className="press flex min-h-[300px] w-full flex-col p-6 text-left"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="rounded-full bg-black/25 px-3 py-1.5 text-[12px] font-medium">{featured.tag} · {featured.min} мин</span>
              <span className="grid size-10 place-items-center rounded-full bg-white/16">
                <ArrowUpRight className="size-[18px]" />
              </span>
            </span>
            <span className="mt-auto block pt-10 text-[28px] font-semibold leading-[1.06] tracking-[-0.045em]">{featured.title}</span>
            <span className="mt-3 line-clamp-2 block text-[14px] leading-snug text-white/72">{featured.lead}</span>
          </button>
        </Card>
      </motion.div>

      <motion.section {...riseIn(1)} className="mt-10" aria-label="Статьи">
        <SectionHead title="Статьи" hint="Коротко о сне и состоянии" />
        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          {TOPICS.map((t) => (
            <Chip key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <motion.ul
          key={topic}
          className="mt-4 space-y-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.fast, ease: EASE_OUT }}
        >
          {shown.map((a) => (
            <li key={a.id}>
              <ArticleRow article={a} read={readArticles.includes(a.id)} onOpen={() => openSheet("article", a.id)} />
            </li>
          ))}
        </motion.ul>
        {list.length > PREVIEW && (
          <button type="button" onClick={() => setAll(!all)} className="press glass mt-2.5 h-12 w-full rounded-full text-[14px] text-ink-2">
            {all ? "Свернуть" : `Все статьи · ${list.length}`}
          </button>
        )}
      </motion.section>
      <motion.section {...riseIn(2)} className="mt-10" aria-label="Короткие практики">
        <SectionHead title="Короткие практики" hint="Три минуты, чтобы замедлиться" />
      </motion.section>
      <motion.div {...riseIn(2)} className="mt-4 grid grid-cols-2 gap-3">
        {LIBRARY.map((x) => (
          <Card
            key={x.id}
            tone={x.tone}
            role="button"
            tabIndex={0}
            aria-label={x.id === "bodyscan" && !isPlus ? `${x.title} · Plus` : x.title}
            onClick={() => openSheet(x.id)}
            onKeyDown={open(x.id)}
            className="cursor-pointer"
          >
            <div className="flex min-h-[156px] flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/14">
                  <x.icon className="size-[18px]" />
                </span>
                {x.id === "bodyscan" && (
                  <span className="flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {!isPlus && <LockKeyhole className="size-3" />} Plus
                  </span>
                )}
              </div>
              <div className="mt-auto min-w-0">
                <div className="text-[17px] font-semibold tracking-[-0.02em]">{x.title}</div>
                <div className="mt-1 text-[12px] leading-snug text-white/65">{x.sub}</div>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      <motion.button
        {...riseIn(2)}
        type="button"
        aria-label="Дневник тревог"
        onClick={() => openSheet("worry")}
        className="press glass mt-3 flex w-full items-center gap-4 rounded-[30px] p-3 pr-4 text-left"
      >
        <span className="glass-inset grid size-11 shrink-0 place-items-center rounded-full">
          <NotebookPen className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium">Дневник тревог</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-2">{openWorries ? `${openWorries} отложено до завтра` : "Выгрузить мысли перед сном"}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-3" />
      </motion.button>

      <motion.section {...riseIn(3)} className="mt-10" aria-label="Вечерний ритуал">
        <SectionHead title="Вечерний ритуал" hint={`${ritual.done.length} из ${RITUAL.length} шагов перед сном`} />
        <div className="glass mt-4 rounded-[30px] p-5">
          <div className="flex gap-1.5" aria-hidden>
            {RITUAL.map((r) => (
              <span key={r.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-350", ritual.done.includes(r.id) ? "bg-lime" : "bg-white/12")} />
            ))}
          </div>
          <ul className="-mx-2 -mb-2 mt-3">
            {RITUAL.map((r) => {
              const done = ritual.done.includes(r.id)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => toggleRitual(r.id)}
                    className="press flex w-full items-center gap-3 rounded-[18px] px-2 py-2.5 text-left hover:bg-white/5"
                  >
                    <span
                      className={cn(
                        "grid size-[22px] shrink-0 place-items-center rounded-full transition-colors duration-250",
                        done ? "bg-lime text-lime-ink" : "text-transparent ring-[1.5px] ring-inset ring-white/30"
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3.5} />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[15px] transition-opacity duration-250", done && "text-ink-3 line-through decoration-white/25")}>{r.label}</span>
                    <span className="shrink-0 text-[12px] text-ink-3">{r.hint}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        {sessions.length > 0 && (
          <p className="mt-6 text-center text-[12px] text-ink-3">
            {sessions.length} {pluralRu(sessions.length, ["сессия", "сессии", "сессий"])} · {totalMin} мин практики всего
          </p>
        )}
      </motion.section>

    </>
  )
}
