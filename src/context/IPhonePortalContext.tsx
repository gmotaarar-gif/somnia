import * as React from "react"

export const IPhonePortalContext = React.createContext<HTMLElement | null>(null)

export function useIPhonePortal(): HTMLElement | null {
  return React.useContext(IPhonePortalContext)
}
