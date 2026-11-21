// @vitest-environment jsdom

import { lazy, useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Deferred } from "./Deferred"

afterEach(cleanup)

it("does not load inactive content and preserves drafts after closing", async () => {
  const load = vi.fn(async () => ({ default: Draft }))
  const Content = lazy(load)
  function Draft() {
    const [text, setText] = useState("")
    return <input aria-label="Draft" value={text} onChange={(e) => setText(e.target.value)} />
  }
  const { rerender } = render(<Deferred active={false}><Content /></Deferred>)
  expect(load).not.toHaveBeenCalled()
  expect(screen.queryByLabelText("Draft")).toBeNull()

  rerender(<Deferred active><Content /></Deferred>)
  fireEvent.change(await screen.findByLabelText("Draft"), { target: { value: "Keep this" } })
  rerender(<Deferred active={false}><Content /></Deferred>)
  rerender(<Deferred active><Content /></Deferred>)
  expect((screen.getByLabelText("Draft") as HTMLInputElement).value).toBe("Keep this")
  expect(load).toHaveBeenCalledTimes(1)
})
