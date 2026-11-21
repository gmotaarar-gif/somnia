/** Local identity only. This is not authentication or a server account. */
export interface LocalAccount {
  email: string
  createdAt: string
}

export interface RegistrationInput {
  name: string
  email: string
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

function validEmail(email: string) {
  // Unquoted addresses, including international mailbox/domain names. No delivery claim.
  const [local, domain, extra] = email.split("@")
  return extra === undefined && !!domain && local.length <= 64 &&
    /^[\p{L}\p{N}\p{M}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}\p{M}!#$%&'*+/=?^_`{|}~-]+)*$/u.test(local) &&
    domain.length <= 253 && domain.includes(".") && domain.split(".").every((label) =>
      label.length <= 63 && /^[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?$/u.test(label)
    )
}

export function validateRegistration({ name, email }: RegistrationInput) {
  const errors: Partial<Record<keyof RegistrationInput, string>> = {}
  const normalized = normalizeEmail(email)
  if (!name.trim()) errors.name = "Введите имя"
  else if (name.trim().length > 20) errors.name = "Не больше 20 символов"
  if (!normalized) errors.email = "Введите почту"
  else if (normalized.length > 254 || !validEmail(normalized)) {
    errors.email = "Проверьте адрес, например name@example.com"
  }
  return errors
}

export function normalizeLocalAccount(saved: unknown): LocalAccount | null {
  if (!saved || typeof saved !== "object" || !("email" in saved) || !("createdAt" in saved)) return null
  if (typeof saved.email !== "string" || typeof saved.createdAt !== "string") return null
  if (validateRegistration({ name: "Somna", email: saved.email }).email || !Number.isFinite(Date.parse(saved.createdAt))) return null
  return { email: normalizeEmail(saved.email), createdAt: saved.createdAt }
}
