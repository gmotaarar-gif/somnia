/** Local identity only. This is not authentication or a server account. */
export interface LocalAccount {
  email: string
  createdAt: string
}

export interface RegistrationInput {
  name: string
  email: string
}

function validEmail(email: string) {
  // Standard unquoted addresses, with dot-separated domain labels. No delivery claim.
  const [local, domain, extra] = email.split("@")
  return extra === undefined && !!domain && local.length <= 64 &&
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i.test(local) &&
    domain.length <= 253 && domain.includes(".") && domain.split(".").every((label) =>
      label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    )
}

export function validateRegistration({ name, email }: RegistrationInput) {
  const errors: Partial<Record<keyof RegistrationInput, string>> = {}
  if (!name.trim()) errors.name = "Введите имя"
  else if (name.trim().length > 20) errors.name = "Не больше 20 символов"
  if (!email.trim()) errors.email = "Введите почту"
  else if (email.trim().length > 254 || !validEmail(email.trim())) {
    errors.email = "Проверьте адрес, например name@example.com"
  }
  return errors
}

export function normalizeLocalAccount(saved: unknown): LocalAccount | null {
  if (!saved || typeof saved !== "object" || !("email" in saved) || !("createdAt" in saved)) return null
  if (typeof saved.email !== "string" || typeof saved.createdAt !== "string") return null
  if (validateRegistration({ name: "Somna", email: saved.email }).email || !Number.isFinite(Date.parse(saved.createdAt))) return null
  return { email: saved.email.trim().toLowerCase(), createdAt: saved.createdAt }
}
