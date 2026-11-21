import * as React from "react"
import { ArrowRight, Check, Clock } from "lucide-react"
import { ARTICLES, articleById } from "@/lib/articles"
import { useStore } from "@/store/store"
import { Card } from "@/ui/Card"
import { Button } from "@/ui/controls"
import { Sheet } from "@/ui/Sheet"

/** Article reader: a toned cover, the text, one thing to try, and the next article. */
export function ArticleSheet() {
  const { sheet, sheetArg, openSheet, readArticles, markArticleRead, notify } = useStore()
  const article = articleById(sheetArg)
  const read = !!article && readArticles.includes(article.id)
  const next = article ? ARTICLES[(ARTICLES.indexOf(article) + 1) % ARTICLES.length] : null
  const body = React.useRef<HTMLElement>(null)

  // "Дальше" swaps the article inside the same sheet, so start it from the top
  React.useEffect(() => {
    const scroller = body.current?.parentElement
    if (scroller) scroller.scrollTop = 0
  }, [article?.id])

  return (
    <Sheet
      open={sheet === "article" && !!article}
      onClose={() => openSheet(null)}
      title={article?.tag ?? "Статья"}
      description={article ? `${article.min} мин чтения` : undefined}
      footer={
        article && (
          <Button
            className="w-full"
            variant={read ? "ghost" : "primary"}
            onClick={() => {
              if (!read) {
                markArticleRead(article.id)
                notify("Статья прочитана")
              }
              openSheet(null)
            }}
          >
            {read ? "Закрыть" : <><Check className="size-4" strokeWidth={3} /> Прочитано</>}
          </Button>
        )
      }
    >
      {article && next && (
        <article ref={body}>
          <Card tone={article.tone} r="lg">
            <div className="flex min-h-[220px] flex-col p-6">
              <span className="flex items-center gap-1.5 self-start rounded-full bg-black/25 px-3 py-1.5 text-[12px] font-medium">
                <Clock className="size-3.5" /> {article.min} мин
              </span>
              <h2 className="mt-auto pt-8 text-[27px] font-semibold leading-[1.08] tracking-[-0.04em]">{article.title}</h2>
            </div>
          </Card>

          <p className="mt-6 px-1 text-[17px] leading-[1.5] text-ink">{article.lead}</p>

          <div className="mt-6 space-y-6 px-1">
            {article.blocks.map((b, i) => (
              <section key={i}>
                {b.heading && <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{b.heading}</h3>}
                <p className={b.heading ? "mt-2 text-[15px] leading-[1.6] text-ink-2" : "text-[15px] leading-[1.6] text-ink-2"}>{b.text}</p>
              </section>
            ))}
          </div>

          <div className="glass mt-7 rounded-[26px] p-5">
            <div className="text-[12px] font-medium text-lime">Попробуйте сегодня</div>
            <p className="mt-2 text-[16px] font-medium leading-snug">{article.action}</p>
          </div>

          <button
            type="button"
            onClick={() => openSheet("article", next.id)}
            className="press glass mt-3 flex w-full items-center gap-4 rounded-[26px] p-5 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-ink-3">Дальше · {next.tag}</span>
              <span className="mt-1 block text-[15px] font-medium leading-snug">{next.title}</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-ink-3" />
          </button>
        </article>
      )}
    </Sheet>
  )
}
