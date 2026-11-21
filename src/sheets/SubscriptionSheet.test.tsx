// @vitest-environment jsdom

import * as React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { SUBSCRIPTION_KEY, SubscriptionProvider } from "@/store/subscription"
import { SubscriptionCard } from "@/ui/SubscriptionCard"
import { BodyScanSheet, GroundingSheet } from "./PracticeSheets"
import { SubscriptionSheet } from "./SubscriptionSheet"

// Exercise subscription routing and state, independently of the shared portal/motion primitive.
vi.mock("@/ui/Sheet", () => ({
  Sheet: ({ open, title, children, onClose, bare }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; bare?: boolean }) => open ? <section role="dialog" aria-label={title}>{!bare && <button onClick={onClose}>Закрыть</button>}{children}</section> : null,
  Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function Triggers() {
  const { openSheet, sheet, nights } = useStore()
  return <><SubscriptionCard /><button onClick={() => openSheet("bodyscan")}>Открыть скан</button><button onClick={() => openSheet("grounding")}>Бесплатная практика</button><output data-testid="route">{sheet}</output><output data-testid="nights">{nights.length}</output></>
}

function Flow() {
  return <StoreProvider><SubscriptionProvider><Triggers /><SubscriptionSheet /><BodyScanSheet /><GroundingSheet /></SubscriptionProvider></StoreProvider>
}

describe("Plus flow", () => {
  it("lets a free user dismiss the paywall without opening the premium practice", () => {
    render(<Flow />)
    fireEvent.click(screen.getByText("Открыть скан"))
    expect(screen.getByRole("dialog", { name: "somna plus" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Начать" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Продолжить бесплатно" }))
    expect(screen.getByTestId("route").textContent).toBe("")
    expect(localStorage.getItem(SUBSCRIPTION_KEY)).toBeNull()
    fireEvent.click(screen.getByText("Бесплатная практика"))
    expect(screen.getByRole("dialog", { name: "Заземление 5-4-3-2-1" })).toBeTruthy()
  })

  it("activates the chosen plan, opens the practice, and cancels without deleting journal entries", () => {
    render(<Flow />)
    const nights = screen.getByTestId("nights").textContent
    fireEvent.click(screen.getByText("Открыть скан"))
    fireEvent.click(screen.getByRole("radio", { name: /На месяц/ }))
    fireEvent.click(screen.getByRole("button", { name: /Включить Plus бесплатно/ }))
    expect(JSON.parse(localStorage.getItem(SUBSCRIPTION_KEY)!).plan).toBe("monthly")
    expect(screen.getByText("0 ₽ · демо")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Сканирование тела/ }))
    expect(screen.getByRole("button", { name: "Начать" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }))
    fireEvent.click(screen.getByRole("button", { name: /Подписка активна/ }))
    fireEvent.click(screen.getByRole("button", { name: "Отключить демоподписку" }))
    fireEvent.click(screen.getByRole("button", { name: "Оставить Plus" }))
    expect(localStorage.getItem(SUBSCRIPTION_KEY)).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Отключить демоподписку" }))
    fireEvent.click(screen.getByRole("button", { name: "Отключить" }))
    expect(localStorage.getItem(SUBSCRIPTION_KEY)).toBeNull()
    expect(screen.getByTestId("nights").textContent).toBe(nights)
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }))
    expect(screen.getByTestId("route").textContent).toBe("profile")
    fireEvent.click(screen.getByText("Открыть скан"))
    expect(screen.getByRole("dialog", { name: "somna plus" })).toBeTruthy()
  })
})
