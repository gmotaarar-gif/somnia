// @vitest-environment jsdom

import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { Segmented } from "./controls"

afterEach(cleanup)

it("does not reset dependent settings when a selected option is activated again", () => {
  const onChange = vi.fn()
  render(<Segmented id="chronotype" value="early" onChange={onChange} options={[
    { value: "early", label: "Жаворонок" }, { value: "late", label: "Сова" },
  ]} />)
  const selected = screen.getByRole("radio", { name: "Жаворонок" })
  fireEvent.keyDown(selected, { key: "Home" })
  fireEvent.click(selected)
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(selected, { key: "End" })
  expect(onChange).toHaveBeenCalledExactlyOnceWith("late")
})

it("lets keyboard users select, wrap and leave a segmented group with one tab stop", () => {
  function Picker() {
    const [value, setValue] = React.useState("7")
    return <Segmented id="period" label="Период" value={value} onChange={setValue} options={[
      { value: "7", label: "7 дней" }, { value: "14", label: "14 дней" }, { value: "30", label: "30 дней" },
    ]} />
  }
  render(<Picker />)
  const choices = screen.getAllByRole("radio")
  expect(screen.getByRole("radiogroup", { name: "Период" })).toBeTruthy()
  choices[0].focus()
  fireEvent.keyDown(choices[0], { key: "ArrowLeft" })
  expect(document.activeElement).toBe(choices[2])
  expect(choices[2].getAttribute("aria-checked")).toBe("true")
  expect(choices.map((choice) => choice.tabIndex)).toEqual([-1, -1, 0])
  fireEvent.keyDown(choices[2], { key: "ArrowRight" })
  expect(document.activeElement).toBe(choices[0])
  fireEvent.keyDown(choices[0], { key: "End" })
  expect(document.activeElement).toBe(choices[2])
  fireEvent.keyDown(choices[2], { key: "Home" })
  expect(document.activeElement).toBe(choices[0])
  fireEvent.click(choices[1])
  expect(choices[1].getAttribute("aria-checked")).toBe("true")
  expect(choices.map((choice) => choice.tabIndex)).toEqual([-1, 0, -1])
})
