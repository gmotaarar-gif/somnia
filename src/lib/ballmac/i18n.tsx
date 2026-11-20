import * as React from "react"

/** A flat dictionary: message key to translated text. */
export type Messages = Record<string, string>

type Values = Record<string, string | number>
export type I18nContextValue = { messages: Messages; locale: string | undefined }

export const EMPTY_MESSAGES: Messages = {}
export const I18nContext = React.createContext<I18nContextValue>({
  messages: EMPTY_MESSAGES,
  locale: undefined,
})

const subscribe = () => () => {}

const pluralRulesCache = new Map<string, Intl.PluralRules>()
function getPluralRules(locale: string): Intl.PluralRules {
  let pr = pluralRulesCache.get(locale)
  if (!pr) {
    pr = new Intl.PluralRules(locale)
    pluralRulesCache.set(locale, pr)
  }
  return pr
}

export function useLocale(fallback = "ru-RU"): string {
  const { locale } = React.useContext(I18nContext)
  const documentLang = React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.lang,
    () => ""
  )
  return locale ?? (documentLang || fallback)
}

function fill(template: string, values?: Values) {
  return values
    ? template.replace(/\{(\w+)\}/g, (all, name: string) =>
        name in values ? String(values[name]) : all
      )
    : template
}

export type Fallback =
  | string
  | ({ [K in Intl.LDMLPluralRule]?: string } & { other: string })

export type Message = { key: string; text: string }
export const defineMessage = (key: string, text: string): Message => ({ key, text })

export type Msg = {
  (key: string, fallback: Fallback, values?: Values): string
  of: (message: Message, values?: Values) => string
  rich: (
    key: string,
    fallback: string,
    nodes: Record<string, React.ReactNode>
  ) => React.ReactNode
}

export function useMessages(): Msg {
  const { messages } = React.useContext(I18nContext)
  const locale = useLocale()
  return React.useMemo(() => {
    const msg = ((key: string, fallback: Fallback, values?: Values) => {
      let template: string | undefined
      if (values && typeof values.count === "number") {
        try {
          const category = getPluralRules(locale).select(values.count)
          template =
            messages[`${key}_${category}`] ??
            (typeof fallback === "object" && !(key in messages)
              ? (fallback[category] ?? fallback.other)
              : undefined)
        } catch {
          // Invalid locale tag falls back to plain key.
        }
      }
      template ??=
        messages[key] ?? (typeof fallback === "string" ? fallback : fallback.other)
      return fill(template, values)
    }) as Msg
    msg.of = (message, values) => msg(message.key, message.text, values)
    msg.rich = (key, fallback, nodes) => {
      const template = messages[key] ?? fallback
      let offset = 0
      return React.createElement(
        React.Fragment,
        null,
        ...template.split(/(\{\w+\})/).map((part) => {
          const tokenKey = `${part}-${offset}`
          offset += part.length
          const name = /^\{(\w+)\}$/.exec(part)?.[1]
          return name && name in nodes
            ? React.createElement(React.Fragment, { key: tokenKey }, nodes[name])
            : part
        })
      )
    }
    return msg
  }, [messages, locale])
}
