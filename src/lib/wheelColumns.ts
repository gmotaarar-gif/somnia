export interface WheelOption {
  value: string
  label: string
}

export interface WheelColumn {
  id: string
  label: string
  options: WheelOption[]
  loop?: boolean
  className?: string
}

const range = (count: number, format: (i: number) => string) =>
  Array.from({ length: count }, (_, i) => ({
    value: format(i),
    label: format(i),
  }))

export const SOMNA_TIME_COLUMNS: WheelColumn[] = [
  {
    id: "hour",
    label: "Часы",
    loop: true,
    className: "w-15",
    options: range(24, (i) => String(i).padStart(2, "0")),
  },
  {
    id: "minute",
    label: "Минуты",
    loop: true,
    className: "w-15",
    options: Array.from({ length: 12 }, (_, i) => {
      const m = String(i * 5).padStart(2, "0")
      return { value: m, label: m }
    }),
  },
]
