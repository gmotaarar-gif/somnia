// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { ARTICLES } from "@/lib/articles"
import { StoreProvider, useStore } from "@/store/store"
import { SubscriptionProvider } from "@/store/subscription"
import { PracticesScreen } from "./Practices"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

function Probe() {
  const { sheet, sheetArg, markArticleRead } = useStore()
  return (
    <>
      <span data-testid="sheet">{`${sheet ?? "none"}:${sheetArg ?? ""}`}</span>
      <button onClick={() => markArticleRead(ARTICLES[0].id)}>finish first</button>
    </>
  )
}

const renderScreen = () =>
  render(<StoreProvider><SubscriptionProvider><PracticesScreen /><Probe /></SubscriptionProvider></StoreProvider>)

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addListener() {},
    addEventListener() {},
    removeEventListener() {},
  }))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it("offers no breathing practice", () => {
  renderScreen()
  expect(screen.queryByText(/дыхан|подыш/i)).toBeNull()
})

it("features the first unread article and moves on once it is read", () => {
  renderScreen()
  fireEvent.click(screen.getByRole("button", { name: `Читать: ${ARTICLES[0].title}` }))
  expect(screen.getByTestId("sheet").textContent).toBe(`article:${ARTICLES[0].id}`)

  fireEvent.click(screen.getByText("finish first"))

  expect(screen.getByRole("button", { name: `Читать: ${ARTICLES[1].title}` })).toBeTruthy()
  expect(screen.getByText(`1 из ${ARTICLES.length} статей прочитано`)).toBeTruthy()
})

it("filters the article list by topic", () => {
  renderScreen()
  const articles = screen.getByRole("region", { name: "Статьи" })
  const titles = () => within(articles).getAllByRole("listitem").map((li) => li.textContent)

  fireEvent.click(within(articles).getByRole("button", { name: "Состояние" }))

  const mind = ARTICLES.filter((a) => a.topic === "mind")
  expect(titles()).toHaveLength(mind.length)
  for (const a of mind) expect(within(articles).getByText(a.title)).toBeTruthy()
})
