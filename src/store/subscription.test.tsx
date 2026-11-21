// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { membershipFor, SUBSCRIPTION_KEY, SubscriptionProvider, useSubscription } from "./subscription"

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("local Plus membership", () => {
  it.each(["monthly", "yearly"] as const)("persists %s access and removes it on cancellation", (plan) => {
    const first = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    expect(first.result.current.isPlus).toBe(false)
    act(() => { expect(first.result.current.activate(plan)).toBe(true) })
    first.unmount()
    const second = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    expect(second.result.current.isPlus).toBe(true)
    expect(second.result.current.membership?.plan).toBe(plan)
    act(() => { expect(second.result.current.deactivate()).toBe(true) })
    second.unmount()
    const third = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    expect(third.result.current.isPlus).toBe(false)
  })

  it.each(["{broken", "null", '"plus"', '{"plan":"lifetime"}', '{"plan":"monthly","startedAt":"x","endsAt":"y"}'])("does not grant access from malformed storage: %s", (raw) => {
    localStorage.setItem(SUBSCRIPTION_KEY, raw)
    const { result } = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    expect(result.current.isPlus).toBe(false)
  })

  it("expires access without reloading and does not auto-renew", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2030-01-31T08:00:00Z"))
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify({ plan: "monthly", startedAt: "2030-01-01T08:00:00Z", endsAt: "2030-01-31T08:00:01Z" }))
    const { result } = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    expect(result.current.isPlus).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.isPlus).toBe(false)
    expect(result.current.membership?.endsAt).toBe("2030-01-31T08:00:01Z")
  })

  it("handles month ends and leap years as calendar periods", () => {
    expect(membershipFor("monthly", new Date("2030-01-31T10:00:00Z")).endsAt).toBe("2030-02-28T10:00:00.000Z")
    expect(membershipFor("yearly", new Date("2032-02-29T10:00:00Z")).endsAt).toBe("2033-02-28T10:00:00.000Z")
  })

  it("keeps entitlement in sync when another tab cancels or clears storage", () => {
    const { result } = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    act(() => { result.current.activate("monthly") })
    act(() => {
      localStorage.removeItem(SUBSCRIPTION_KEY)
      window.dispatchEvent(new StorageEvent("storage", { key: SUBSCRIPTION_KEY }))
    })
    expect(result.current.isPlus).toBe(false)
    act(() => { result.current.activate("yearly") })
    act(() => {
      localStorage.clear()
      window.dispatchEvent(new StorageEvent("storage", { key: null }))
    })
    expect(result.current.isPlus).toBe(false)
  })

  it("reports storage failures rather than claiming activation or cancellation succeeded", () => {
    const { result } = renderHook(useSubscription, { wrapper: SubscriptionProvider })
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota") })
    act(() => { expect(result.current.activate("monthly")).toBe(false) })
    expect(result.current.isPlus).toBe(false)
    expect(result.current.error).toBeTruthy()
    write.mockRestore()
    act(() => { result.current.activate("monthly") })
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked") })
    act(() => { expect(result.current.deactivate()).toBe(false) })
    expect(result.current.isPlus).toBe(true)
    expect(result.current.error).toBeTruthy()
  })
})
