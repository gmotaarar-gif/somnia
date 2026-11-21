// @vitest-environment jsdom

import * as React from "react"
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StoreProvider, useStore } from "@/store/store"
import { LocalAccountProvider, useLocalAccount } from "./LocalAccountProvider"
import { RegistrationForm, RegistrationSheet } from "./RegistrationSheet"
import { normalizeLocalAccount, validateRegistration } from "./registration"

const STORAGE_KEY = "somna-state-v6"
const savedAccount = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").localAccount ?? null

function Providers({ children }: { children: React.ReactNode }) {
  return <StoreProvider><LocalAccountProvider>{children}</LocalAccountProvider></StoreProvider>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("local registration", () => {
  it("keeps a mounted registration sheet closed until onboarding commits", async () => {
    function Flow() {
      const { openRegistration } = useLocalAccount()
      const { finishOnboarding } = useStore()
      return <>
        <button onClick={openRegistration}>Открыть регистрацию</button>
        <button onClick={() => finishOnboarding({})}>Завершить настройку</button>
        <RegistrationSheet />
      </>
    }
    render(<Flow />, { wrapper: Providers })
    fireEvent.click(screen.getByRole("button", { name: "Открыть регистрацию" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Завершить настройку" }))
    expect(await screen.findByRole("dialog", { name: "Регистрация" })).toBeTruthy()
  })

  it.each(["mira@example.com,", "mira@example..com", "mira@-example.com", "mira@example-.com", ".mira@example.com", "mi..ra@example.com"])("rejects malformed email %s", (email) => {
    expect(validateRegistration({ name: "Мира", email }).email).toBeTruthy()
  })

  it.each(["mira+sleep@example.com", "mira.ivanova@my-domain.example", " MIRA@Example.com ", "мира@example.com", "мира@почта.рф"])("allows a valid email %s", (email) => {
    expect(validateRegistration({ name: "Мира", email })).toEqual({})
  })

  it("validates the normalized Unicode length before saving", () => {
    expect(validateRegistration({ name: "Мира", email: `${"İ".repeat(64)}@example.com` }).email).toBeTruthy()
    const first = renderHook(useStore, { wrapper: Providers })
    act(() => first.result.current.registerLocalProfile({ name: "Мира", email: `${"İ".repeat(32)}@example.com` }))
    const email = first.result.current.localAccount!.email
    first.unmount()
    const restored = renderHook(useStore, { wrapper: Providers })
    expect(restored.result.current.localAccount?.email).toBe(email)
  })

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

  it.each([null, [], {}, { email: "not-an-email", createdAt: "2026-01-01" }, { email: "mira@example.com", createdAt: "invalid" }])("ignores invalid saved registration: %j", (saved) => {
    expect(normalizeLocalAccount(saved)).toBeNull()
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
    expect(savedAccount()).toBeNull()
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "mira@example.com" } })
    fireEvent.click(submit)
    expect(screen.getByRole("status").textContent).toContain("Профиль готов, Мира")
    expect(savedAccount()?.email).toBe("mira@example.com")
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
    expect(savedAccount()).toBeNull()
  })

  it("keeps the form and existing identity intact when browser storage rejects a save", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userName: "Old name", localAccount: { email: "old@example.com", createdAt: "2026-01-01T00:00:00.000Z" } }))
    render(<RegistrationForm />, { wrapper: Providers })
    fireEvent.change(screen.getByLabelText("Как к вам обращаться"), { target: { value: "Мира" } })
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "new@example.com" } })
    const before = localStorage.getItem(STORAGE_KEY)
    const originalWrite = Storage.prototype.setItem
    // Reproduce storage that accepts small metadata but rejects the full journal.
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (value.length > 200) throw new DOMException("Quota exceeded", "QuotaExceededError")
      originalWrite.call(this, key, value)
    })
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }))
    expect(screen.getByRole("alert").textContent).toContain("Не удалось сохранить профиль")
    expect(screen.queryByRole("status")).toBeNull()
    write.mockRestore()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }))
    expect(screen.getByRole("status").textContent).toContain("Профиль готов, Мира")
  })

  it("retains registration when resetting only the journal to empty data", () => {
    const { result } = renderHook(() => ({ account: useLocalAccount(), store: useStore() }), { wrapper: Providers })
    act(() => result.current.account.register({ name: "Мира", email: "mira@example.com" }))
    const identity = result.current.account.account
    act(() => result.current.store.resetAll())
    expect(result.current.account.account).toEqual(identity)
    expect(result.current.store.userName).toBe("Мира")
  })

  it("syncs registration to an older tab before its next journal save", () => {
    const first = renderHook(useStore, { wrapper: Providers })
    const olderTab = renderHook(useStore, { wrapper: Providers })
    expect(olderTab.result.current.localAccount).toBeNull()
    act(() => first.result.current.registerLocalProfile({ name: "Мира", email: "mira@example.com" }))
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY,
      storageArea: localStorage,
      newValue: localStorage.getItem(STORAGE_KEY),
    })))
    expect(olderTab.result.current.localAccount?.email).toBe("mira@example.com")
    act(() => olderTab.result.current.addWater(250))
    expect(savedAccount()?.email).toBe("mira@example.com")
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).userName).toBe("Мира")
  })

  it("does not autosave imported cross-tab snapshots", () => {
    const { result } = renderHook(useStore, { wrapper: Providers })
    const incoming = { ...JSON.parse(localStorage.getItem(STORAGE_KEY)!), volume: 12 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming))
    const write = vi.spyOn(Storage.prototype, "setItem")
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, storageArea: localStorage })))
    expect(result.current.volume).toBe(12)
    expect(write).not.toHaveBeenCalled()
  })

  it("keeps an unsaved check-in in memory when another tab changes settings", () => {
    const { result } = renderHook(useStore, { wrapper: Providers })
    const before = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    const originalWrite = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded", "QuotaExceededError") })
    act(() => result.current.addMood({ valence: 0.7, emotions: ["Ясность"], factors: [] }))
    expect(result.current.moods.length).toBe(before.moods.length + 1)
    originalWrite.call(localStorage, STORAGE_KEY, JSON.stringify({ ...before, volume: 12 }))
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, storageArea: localStorage })))
    expect(result.current.moods.length).toBe(before.moods.length + 1)
    expect(result.current.moods.at(-1)?.emotions).toEqual(["Ясность"])
  })
})
