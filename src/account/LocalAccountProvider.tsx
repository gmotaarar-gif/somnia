import * as React from "react"
import { useStore } from "@/store/store"
import { loadLocalAccount, saveLocalAccount, type LocalAccount, type RegistrationInput } from "./registration"

interface LocalAccountState {
  account: LocalAccount | null
  registrationOpen: boolean
  openRegistration: () => void
  closeRegistration: () => void
  register: (input: RegistrationInput) => void
}

const LocalAccountContext = React.createContext<LocalAccountState | null>(null)

export function LocalAccountProvider({ children }: { children: React.ReactNode }) {
  const { patch, openSheet } = useStore()
  const [account, setAccount] = React.useState(loadLocalAccount)
  const [registrationOpen, setRegistrationOpen] = React.useState(false)

  const value: LocalAccountState = {
    account,
    registrationOpen,
    openRegistration: () => {
      openSheet(null)
      setRegistrationOpen(true)
    },
    closeRegistration: () => setRegistrationOpen(false),
    register: (input) => {
      const saved = saveLocalAccount(input, account)
      patch({ userName: input.name.trim() })
      setAccount(saved)
    },
  }

  return <LocalAccountContext.Provider value={value}>{children}</LocalAccountContext.Provider>
}

export function useLocalAccount() {
  const value = React.useContext(LocalAccountContext)
  if (!value) throw new Error("useLocalAccount must be used inside LocalAccountProvider")
  return value
}
