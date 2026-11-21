import type { Tone, WidgetKind } from "@/store/store"

export interface WidgetMeta {
  title: string
  about: string
}

export const WIDGET_META: Record<Exclude<WidgetKind, "custom">, WidgetMeta> = {
  streak: { title: "Серия", about: "Сколько дней подряд вы отмечаете сон" },
  sleep: { title: "Сон", about: "Прошлая ночь и динамика за неделю" },
  evening: { title: "Вечерний режим", about: "Обратный отсчёт до отбоя" },
  water: { title: "Вода", about: "Дневной баланс, +250 мл по нажатию" },
  breath: { title: "Дыхание", about: "Минуты практики за сегодня" },
  week: { title: "Неделя сна", about: "Среднее и ночи, когда цель выполнена" },
  mood: { title: "Состояние", about: "Последний чек-ин настроения" },
  energy: { title: "Бодрость", about: "Утренняя оценка по дням" },
  rhythm: { title: "Режим", about: "Насколько точно вы ложитесь по плану" },
  debt: { title: "Долг сна", about: "Недосып, накопленный за 7 ночей" },
}

export const TONES: Tone[] = [
  "ink",
  "plum",
  "violet",
  "dusk",
  "cobalt",
  "forest",
  "moss",
  "lime",
  "ember",
  "coral",
  "rose",
]

/** Swatch colour for the tone picker. */
export const TONE_SWATCH: Record<Tone, string> = {
  ink: "linear-gradient(180deg,#3a3a44,#0c0c0f)",
  plum: "linear-gradient(180deg,#a3167d,#b9a4da)",
  violet: "linear-gradient(180deg,#c2489c,#4b2a8f)",
  dusk: "linear-gradient(205deg,#6b5db4,#3a1f3f)",
  cobalt: "linear-gradient(180deg,#2a3bb4,#0b0f3a)",
  forest: "linear-gradient(180deg,#17553d,#03130c)",
  moss: "linear-gradient(140deg,#8aa83c,#0a0f08)",
  lime: "linear-gradient(180deg,#1b7a12,#c6cf6c)",
  ember: "linear-gradient(180deg,#48130f,#bb561a)",
  coral: "linear-gradient(180deg,#1a0806,#ee4a26)",
  rose: "linear-gradient(215deg,#b93049,#cc3d88)",
}

export const WATER_GOAL_ML = 2000
