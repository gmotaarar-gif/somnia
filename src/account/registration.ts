/** Local identity only. This is not authentication or a server account. */
export interface LocalAccount {
  email: string
  createdAt: string
}

export interface RegistrationInput {
  name: string
  email: string
}

export const ACCOUNT_STORAGE_KEY = "somna-local-account-v1"

export function validateRegistration({ name, email }: RegistrationInput) {
  const errors: Partial<Record<keyof RegistrationInput, string>> = {}
  if (!name.trim()) errors.name = "Введите имя"
  else if (name.trim().length > 20) errors.name = "Не больше 20 символов"
  if (!email.trim()) errors.email = "Введите почту"
  else if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Проверьте адрес, например name@example.com"
  }
  return errors
}

export function loadLocalAccount(): LocalAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== "object" || !("email" in saved) || !("createdAt" in saved)) return null
    if (typeof saved.email !== "string" || typeof saved.createdAt !== "string") return null
    if (validateRegistration({ name: "Somna", email: saved.email }).email || !Number.isFinite(Date.parse(saved.createdAt))) return null
    return { email: saved.email.trim().toLowerCase(), createdAt: saved.createdAt }
  } catch {
    return null
  }
}

/** Write before reporting success, so disabled/full storage never looks like a saved profile. */
export function saveLocalAccount(input: RegistrationInput, previous: LocalAccount | null) {
  if (Object.keys(validateRegistration(input)).length) throw new Error("Invalid local registration")
  const account: LocalAccount = {
    email: input.email.trim().toLowerCase(),
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  }
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account))
  return account
}
