// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { ARTICLES } from "@/lib/articles"
import { StoreProvider, useStore } from "@/store/store"
import { ArticleSheet } from "./ArticleSheet"

vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => true,
}))

function Opener() {
  const { openSheet } = useStore()
  return <button onClick={() => openSheet("article", ARTICLES[0].id)}>open</button>
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it("starts the next article from the top", () => {
  render(<StoreProvider><Opener /><ArticleSheet /></StoreProvider>)
  fireEvent.click(screen.getByText("open"))
  const scroller = screen.getByRole("article").parentElement!
  scroller.scrollTop = 900

  fireEvent.click(screen.getByRole("button", { name: new RegExp(ARTICLES[1].title) }))

  expect(screen.getByRole("heading", { name: ARTICLES[1].title })).toBeTruthy()
  expect(scroller.scrollTop).toBe(0)
})
