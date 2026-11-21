import * as React from "react"
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronRight, Clock3, Wind } from "lucide-react"
import { useStore } from "@/store/store"
import { Card } from "@/ui/Card"
import { Button } from "@/ui/controls"
import { Sheet } from "@/ui/Sheet"

type Topic = "mind" | "sleep"
interface Article {
  id: string
  topic: Topic
  title: string
  summary: string
  minutes: number
  color: string
  intro: string
  sections: { title: string; body: string }[]
  source: { title: string; url: string }
}

const ARTICLES: Article[] = [
  {
    id: "breathing", topic: "mind", title: "Почему медленное дыхание успокаивает", summary: "Что меняется, когда вы замедляете выдох", minutes: 3, color: "#a2efda",
    intro: "Дыхание — один из немногих автоматических процессов, на которые можно мягко влиять. Спокойный ритм помогает переключить внимание с потока мыслей на ощущения тела.",
    sections: [
      { title: "Без усилия, а не поглубже", body: "Устройтесь удобно, опустите плечи. Вдыхайте через нос настолько глубоко, насколько комфортно, без напряжения. Выдыхайте плавно. Не нужно набирать как можно больше воздуха." },
      { title: "Попробуйте ровный ритм", body: "Начните с нескольких спокойных циклов. Можно считать до четырёх на вдохе и до шести на выдохе, если это удобно. Пропускайте задержки дыхания, если они вызывают напряжение. Точный счёт менее важен, чем комфорт." },
      { title: "Вернитесь к ощущениям", body: "Заметьте опору под ногами и движение живота. Если отвлеклись, спокойно вернитесь к следующему выдоху. Даже короткая пауза может стать полезной привычкой, но эффект у всех разный." },
      { title: "Когда остановиться", body: "При головокружении или нехватке воздуха вернитесь к обычному дыханию. Если симптомы повторяются, обсудите практику со специалистом. Упражнение не заменяет помощь при стойкой тревоге." },
    ],
    source: { title: "NHS · Breathing exercises for stress", url: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/" },
  },
  {
    id: "stages", topic: "sleep", title: "Что происходит, пока вы спите", summary: "Лёгкий, глубокий и быстрый сон — без загадок", minutes: 4, color: "#c4acfa",
    intro: "Сон неоднороден. За ночь мозг несколько раз проходит через медленный сон (NREM) и быстрый сон (REM). Циклы различаются по длине — это не точный таймер на 90 минут.",
    sections: [
      { title: "Лёгкий сон: переход и устойчивость", body: "На стадиях N1 и N2 вы переходите от бодрствования ко сну. Пульс и дыхание замедляются, температура тела снижается. Лёгкий сон занимает значительную часть ночи и тоже нужен для отдыха." },
      { title: "Глубокий сон: больше в начале ночи", body: "Стадия N3 связана с медленными мозговыми волнами. В это время человека труднее разбудить. Обычно глубокого сна больше в первой половине ночи, но его доля зависит от возраста и многих других факторов." },
      { title: "REM: активный мозг", body: "В быстром сне активность мозга возрастает, глаза быстро движутся, а большинство мышц временно расслаблено. Яркие сновидения часто приходятся на REM. К утру эпизоды REM обычно становятся длиннее." },
      { title: "Что может рассказать дневник", body: "Время отбоя, подъёма и утренняя самооценка помогают заметить привычки, но не измеряют стадии сна. Для определения фаз нужны физиологические сигналы; даже носимые устройства дают лишь оценку. Учебная схема выше — не ваша прошлая ночь." },
    ],
    source: { title: "NHLBI · Sleep phases and stages", url: "https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep" },
  },
  {
    id: "rhythm", topic: "sleep", title: "Почему утро настраивает ночь", summary: "Свет и время подъёма как опоры вашего ритма", minutes: 3, color: "#ffc494",
    intro: "Внутренние часы помогают телу отличать день от ночи. Регулярный подъём и смена освещения дают им понятные ориентиры, даже когда предыдущая ночь была неидеальной.",
    sections: [
      { title: "Начните с подъёма", body: "Выберите реалистичное время пробуждения и старайтесь придерживаться его, в том числе по выходным. Если нужен другой режим, двигайте его постепенно, а не пытайтесь сразу уснуть на несколько часов раньше." },
      { title: "Больше света днём", body: "После пробуждения откройте шторы и по возможности выйдите на улицу. Естественный дневной свет помогает поддерживать суточный ритм. Не нужно смотреть прямо на солнце." },
      { title: "Вечером — меньше стимулов", body: "Перед сном приглушите яркий свет и оставьте время на спокойные занятия. Отмечайте в дневнике поздний кофе, работу и экран, чтобы увидеть, с чем лично у вас совпадают трудные ночи." },
      { title: "Ищите тенденцию, не идеальную ночь", body: "Сравнивайте несколько дней, а не отдельный результат. Если трудности со сном сохраняются или заметно мешают днём, обсудите их с врачом: дневник будет полезен на приёме." },
    ],
    source: { title: "NHLBI · Healthy sleep habits", url: "https://www.nhlbi.nih.gov/health/sleep/healthy-sleep" },
  },
]

const STAGES = [
  { label: "Бодрствование", color: "#ffc276", body: "Короткие пробуждения могут встречаться в течение ночи и не всегда запоминаются." },
  { label: "REM", color: "#65dfe3", body: "Быстрый сон часто связан с яркими сновидениями; его эпизоды обычно удлиняются к утру." },
  { label: "Лёгкий", color: "#91a8ff", body: "Стадии N1 и N2 помогают перейти ко сну и составляют значительную часть ночи." },
  { label: "Глубокий", color: "#9775fa", body: "Стадия N3 обычно преобладает в начале ночи. Разбудить человека в ней труднее." },
]
// A fixed educational illustration, never derived from a user's diary or quality score.
const STAGE_SEQUENCE = [0, 2, 3, 2, 1, 2, 3, 2, 1, 0, 2, 3, 2, 1, 2, 1, 2, 1, 0]

function SleepArchitecture() {
  const [stage, setStage] = React.useState(3)
  const d = STAGE_SEQUENCE.map((v, i) => `${i ? "H" : "M"}${i * 15}${i ? `V${16 + v * 29}` : `,${16 + v * 29}`}`).join(" ")
  return <div className="my-6 rounded-[26px] bg-gradient-to-br from-[#4722b3] via-[#24163c] to-[#853a73] p-4">
    <div className="text-[11px] uppercase tracking-widest text-white/70">Учебная схема · не измерение</div>
    <svg viewBox="0 0 330 140" className="my-4 w-full" role="img" aria-label="Условная смена фаз сна: глубокий сон чаще в начале, REM ближе к утру">
      {STAGES.map((s, i) => <g key={s.label}><text x="0" y={20 + i * 29} fill="white" opacity="0.7" fontSize="9">{s.label}</text><line x1="74" x2="328" y1={16 + i * 29} y2={16 + i * 29} stroke="white" strokeOpacity="0.08" /></g>)}
      <path d={d} transform="translate(74) scale(.93 1)" fill="none" stroke="#94dcf3" strokeWidth="3" strokeLinejoin="round" />
      <text x="74" y="133" fill="white" opacity="0.7" fontSize="10">Начало ночи</text><text x="326" y="133" fill="white" opacity="0.7" fontSize="10" textAnchor="end">Утро</text>
    </svg>
    <div className="grid grid-cols-2 gap-2">{STAGES.map((s, i) => <button key={s.label} type="button" aria-pressed={stage === i} onClick={() => setStage(i)} className={`rounded-full px-3 py-2 text-left text-[11px] ${stage === i ? "bg-white text-black" : "bg-black/20 text-white/80"}`}><span style={{ color: stage === i ? "#43227f" : s.color }}>●</span> {s.label}</button>)}</div>
    <p aria-live="polite" className="mt-4 min-h-16 text-[12px] leading-relaxed text-white/80">{STAGES[stage].body}</p>
  </div>
}

function LibraryContent({ initialTopic, onPractice }: { initialTopic: Topic; onPractice: () => void }) {
  const [topic, setTopic] = React.useState<Topic>(initialTopic)
  const [articleId, setArticleId] = React.useState<string | null>(null)
  const { setTab } = useStore()
  const article = ARTICLES.find((a) => a.id === articleId)
  if (article) return <article>
    <button type="button" onClick={() => setArticleId(null)} className="mb-5 flex items-center gap-2 text-[13px] text-ink-2"><ArrowLeft className="size-4" /> Все материалы</button>
    <div className="rounded-[28px] px-5 pb-7 pt-10 text-[#10211f]" style={{ background: `radial-gradient(at 10% 0%, #f0fff5, transparent 70%), ${article.color}` }}>
      <div className="flex items-center gap-2 text-[12px] opacity-70"><Wind className="size-4" /> {article.topic === "sleep" ? "Сон" : "Разум"}<span>·</span><Clock3 className="size-3.5" /> {article.minutes} мин чтения</div>
      <h2 className="mt-4 text-[31px] font-semibold leading-[1.08] tracking-[-0.045em]">{article.title}</h2>
    </div>
    {article.id === "stages" && <SleepArchitecture />}
    <p className="mt-6 text-[18px] leading-relaxed tracking-tight">{article.intro}</p>
    {article.sections.map((s) => <section key={s.title} className="mt-7"><h3 className="text-[21px] font-semibold leading-tight tracking-tight">{s.title}</h3><p className="mt-3 text-[15px] leading-[1.75] text-ink-2">{s.body}</p></section>)}
    <div className="my-7 rounded-[22px] bg-white/5 p-4"><div className="text-[11px] uppercase tracking-widest text-ink-3">Подробнее у источника</div><a href={article.source.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-between gap-2 text-[13px] text-[#bce5d7] underline underline-offset-4">{article.source.title}<ArrowUpRight className="size-4 shrink-0" /></a></div>
    {article.id === "breathing" && <Button className="mb-3 w-full" onClick={() => { onPractice(); setTab("practices") }}>Перейти к дыханию</Button>}
  </article>
  return <div>
    <div className="mb-5 flex gap-2" aria-label="Темы материалов">{(["mind", "sleep"] as const).map((t) => <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)} className={`rounded-full px-5 py-2.5 text-[13px] ${topic === t ? "bg-white text-black" : "bg-white/5 text-ink-2"}`}>{t === "mind" ? "Разум" : "Сон"}</button>)}</div>
    <div className="space-y-3">{ARTICLES.filter((a) => a.topic === topic).map((a) => <button key={a.id} type="button" onClick={() => setArticleId(a.id)} className="press block w-full overflow-hidden rounded-[28px] text-left ring-1 ring-inset ring-white/10">
      <div className="px-5 pb-6 pt-10 text-[#10211f]" style={{ background: `radial-gradient(at 0% 0%, #f0fff5, transparent), ${a.color}` }}><div className="mb-4 text-[11px] uppercase tracking-widest opacity-65">{a.topic === "sleep" ? "Сон" : "Разум"} · {a.minutes} мин</div><h3 className="max-w-[18ch] text-[25px] font-semibold leading-[1.12] tracking-[-0.035em]">{a.title}</h3></div>
      <div className="flex items-center gap-3 bg-white/5 p-5"><p className="flex-1 text-[13px] leading-relaxed text-ink-2">{a.summary}</p><ChevronRight className="size-4 shrink-0 text-ink-2" /></div>
    </button>)}</div>
  </div>
}

export function KnowledgeLibrary({ topic = "mind" }: { topic?: Topic }) {
  const [open, setOpen] = React.useState(false)
  return <>
    <Card tone={topic === "sleep" ? "violet" : "mint"} className="my-4">
      <button type="button" onClick={() => setOpen(true)} className="press flex w-full items-center gap-4 p-5 text-left"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10"><BookOpen className="size-5" /></span><span className="flex-1"><span className="block text-[16px] font-semibold">{topic === "sleep" ? "Узнать свой сон" : "Понять своё состояние"}</span><span className="mt-1 block text-[12px] text-ink-2">{topic === "sleep" ? "Фазы сна и привычки, которые помогают" : "Короткие материалы о дыхании и отдыхе"}</span></span><ArrowUpRight className="size-5 shrink-0 text-ink-2" /></button>
    </Card>
    <Sheet open={open} onClose={() => setOpen(false)} title="Библиотека спокойствия" description="Меньше загадок, больше заботы о себе"><LibraryContent initialTopic={topic} onPractice={() => setOpen(false)} /></Sheet>
  </>
}
