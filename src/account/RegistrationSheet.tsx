import * as React from "react"
import { ArrowRight, Check, Mail, Smartphone, UserRound } from "lucide-react"
import { cn } from "@/lib/cn"
import { useStore } from "@/store/store"
import { Button } from "@/ui/controls"
import { Sheet } from "@/ui/Sheet"
import { useLocalAccount } from "./LocalAccountProvider"
import { validateRegistration, type RegistrationInput } from "./registration"

export function RegistrationSheet() {
  const { account, registrationOpen, closeRegistration } = useLocalAccount()
  return (
    <Sheet
      open={registrationOpen}
      onClose={closeRegistration}
      title={account ? "Ваш профиль" : "Регистрация"}
      description="Небольшой шаг к вашему ритму"
    >
      <RegistrationForm />
    </Sheet>
  )
}

export function RegistrationForm() {
  const { userName } = useStore()
  const { account, register, closeRegistration } = useLocalAccount()
  const [name, setName] = React.useState(userName)
  const [email, setEmail] = React.useState(account?.email ?? "")
  const [errors, setErrors] = React.useState<Partial<Record<keyof RegistrationInput, string>>>({})
  const [storageError, setStorageError] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const prefix = React.useId()
  const nameRef = React.useRef<HTMLInputElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)

  if (saved) {
    return (
      <div className="flex flex-col items-center pb-3 pt-4 text-center" role="status">
        <span className="grid size-20 place-items-center rounded-full bg-lime text-lime-ink"><Check className="size-9" strokeWidth={2.5} /></span>
        <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.04em]">Профиль готов, {name.trim()}</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">Имя и почта сохранены в этом браузере. Ваш журнал и настройки остались на месте.</p>
        <Button className="mt-7 w-full" onClick={closeRegistration}>Продолжить <ArrowRight /></Button>
      </div>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const next = validateRegistration({ name, email })
    setErrors(next)
    setStorageError(false)
    if (next.name || next.email) {
      if (next.name) nameRef.current?.focus()
      else emailRef.current?.focus()
      return
    }
    try {
      register({ name, email })
      setSaved(true)
    } catch {
      setStorageError(true)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="pb-2">
      <div className="mb-6 rounded-[26px] bg-violet-400/10 p-4 ring-1 ring-inset ring-violet-300/15">
        <div className="flex items-center gap-2 text-[14px] font-medium"><Smartphone className="size-4 text-lime" /> Ваше пространство, на этом устройстве</div>
        <p id={`${prefix}-local`} className="mt-2 text-[13px] leading-relaxed text-ink-2">Профиль хранится только в этом браузере. Почту не проверяем и писем не отправляем. Синхронизации и входа с другого устройства пока нет.</p>
      </div>

      <label htmlFor={`${prefix}-name`} className="mb-2 block text-[13px] font-medium text-ink-2">Как к вам обращаться</label>
      <div className={cn("glass flex items-center gap-3 rounded-[20px] px-4 focus-within:ring-2 focus-within:ring-lime", errors.name && "ring-1 ring-[#ff8f8f]")}>
        <UserRound aria-hidden className="size-[18px] shrink-0 text-ink-3" />
        <input
          ref={nameRef}
          id={`${prefix}-name`}
          name="name"
          autoComplete="given-name"
          required
          maxLength={20}
          value={name}
          onChange={(event) => { setName(event.target.value); setErrors((old) => ({ ...old, name: undefined })) }}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
          placeholder="Ваше имя"
          className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
        />
      </div>
      {errors.name && <p id={`${prefix}-name-error`} className="mt-2 text-[12px] text-[#ff8f8f]">{errors.name}</p>}

      <label htmlFor={`${prefix}-email`} className="mb-2 mt-5 block text-[13px] font-medium text-ink-2">Почта</label>
      <div className={cn("glass flex items-center gap-3 rounded-[20px] px-4 focus-within:ring-2 focus-within:ring-lime", errors.email && "ring-1 ring-[#ff8f8f]")}>
        <Mail aria-hidden className="size-[18px] shrink-0 text-ink-3" />
        <input
          ref={emailRef}
          id={`${prefix}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          value={email}
          onChange={(event) => { setEmail(event.target.value); setErrors((old) => ({ ...old, email: undefined })) }}
          aria-invalid={!!errors.email}
          aria-describedby={`${prefix}-local${errors.email ? ` ${prefix}-email-error` : ""}`}
          placeholder="name@example.com"
          className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
        />
      </div>
      {errors.email && <p id={`${prefix}-email-error`} className="mt-2 text-[12px] text-[#ff8f8f]">{errors.email}</p>}
      {storageError && <p role="alert" className="mt-4 text-[13px] leading-relaxed text-[#ff8f8f]">Не удалось сохранить профиль. Разрешите хранение данных в браузере или освободите место и попробуйте ещё раз.</p>}

      <Button type="submit" className="mt-7 h-14 w-full">{account ? "Сохранить изменения" : "Создать локальный профиль"} <ArrowRight /></Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={closeRegistration}>{account ? "Отмена" : "Пока без регистрации"}</Button>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-3">Очистка данных браузера удалит локальный профиль. Журнал можно выгрузить в настройках профиля.</p>
    </form>
  )
}
