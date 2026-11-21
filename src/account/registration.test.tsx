// @vitest-environment jsdom

import * as React from "react"
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { LocalAccountProvider, useLocalAccount } from "./LocalAccountProvider"
import { RegistrationForm } from "./RegistrationSheet"
import { ACCOUNT_STORAGE_KEY, loadLocalAccount } from "./registration"

function Providers({ children }: { children: React.ReactNode }) {
  return <StoreProvider><LocalAccountProvider>{children}</LocalAccountProvider></StoreProvider>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("local registration", () => {
  it("persists a normalized identity without replacing the existing journal or settings", () => {
    const first = renderHook(() => ({ account: useLocalAccount(), store: useStore() }), { wrapper: Providers })
    act(() => {
      first.result.current.store.finishOnboarding({ userName: "Мира", bedGoal: "00:15" })
      first.result.current.store.addMood({ valence: 0.4, emotions: ["Спокойствие"], factors: [] })
    })
    const moods = JSON.parse(JSON.stringify(first.result.current.store.moods))
    const nights = JSON.parse(JSON.stringify(first.result.current.store.nights))
    act(() => first.result.current.account.register({ name: "  Мира  ", email: "  MIRA@Example.com  " }))
    expect(first.result.current.store.userName).toBe("Мира")
    const createdAt = first.result.current.account.account!.createdAt
    first.unmount()

    const restored = renderHook(() => ({ account: useLocalAccount(), store: useStore() }), { wrapper: Providers })
    expect(restored.result.current.account.account).toEqual({ email: "mira@example.com", createdAt })
    expect(restored.result.current.store).toMatchObject({ userName: "Мира", onboarded: true, bedGoal: "00:15", moods, nights })
    act(() => restored.result.current.account.register({ name: "Мира", email: "new@example.com" }))
    expect(restored.result.current.account.account).toEqual({ email: "new@example.com", createdAt })
  })

  it.each(["{bad json", "null", '[]', '{"email":"not-an-email","createdAt":"2026-01-01"}', '{"email":"mira@example.com","createdAt":"invalid"}'])("ignores invalid saved registration: %s", (raw) => {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, raw)
    expect(loadLocalAccount()).toBeNull()
  })

  it("shows field errors, then creates the local profile after correction", () => {
    render(<RegistrationForm />, { wrapper: Providers })
    const submit = screen.getByRole("button", { name: "Создать локальный профиль" })
    fireEvent.click(submit)
    expect(screen.getByText("Введите имя")).toBeTruthy()
    expect(screen.getByText("Введите почту")).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText("Как к вам обращаться"))
    fireEvent.change(screen.getByLabelText("Как к вам обращаться"), { target: { value: "Мира" } })
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "wrong@" } })
    fireEvent.click(submit)
    expect(screen.getByText("Проверьте адрес, например name@example.com")).toBeTruthy()
    expect(loadLocalAccount()).toBeNull()
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "mira@example.com" } })
    fireEvent.click(submit)
    expect(screen.getByRole("status").textContent).toContain("Профиль готов, Мира")
    expect(loadLocalAccount()?.email).toBe("mira@example.com")
  })

  it("does not create an identity when registration is skipped", () => {
    function Flow() {
      const account = useLocalAccount()
      return <><button onClick={account.openRegistration}>Открыть</button>{account.registrationOpen && <RegistrationForm />}</>
    }
    render(<Flow />, { wrapper: Providers })
    fireEvent.click(screen.getByRole("button", { name: "Открыть" }))
    fireEvent.click(screen.getByRole("button", { name: "Пока без регистрации" }))
    expect(screen.queryByLabelText("Почта")).toBeNull()
    expect(localStorage.getItem(ACCOUNT_STORAGE_KEY)).toBeNull()
  })

  it("keeps the form and existing identity intact when browser storage rejects a save", () => {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({ email: "old@example.com", createdAt: "2026-01-01T00:00:00.000Z" }))
    render(<RegistrationForm />, { wrapper: Providers })
    fireEvent.change(screen.getByLabelText("Как к вам обращаться"), { target: { value: "Мира" } })
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "new@example.com" } })
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded", "QuotaExceededError") })
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }))
    expect(screen.getByRole("alert").textContent).toContain("Не удалось сохранить профиль")
    expect(screen.queryByRole("status")).toBeNull()
    write.mockRestore()
    expect(loadLocalAccount()?.email).toBe("old@example.com")
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }))
    expect(screen.getByRole("status").textContent).toContain("Профиль готов, Мира")
  })
})
