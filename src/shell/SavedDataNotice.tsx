import { useState } from "react"
import { RecoveryButton, RecoveryPanel } from "@/shell/RecoveryPanel"
import { downloadSavedDataCopy } from "@/shell/savedDataCopy"
import { useStore } from "@/store/store"

const MESSAGES = {
  partial: "Часть сохранённых записей повреждена, их не удалось прочитать. Остальные данные на месте.",
  unreadable: "Сохранённые данные повреждены, и их не удалось прочитать. Приложение открыто с чистого листа.",
}

export function SavedDataNotice() {
  const { savedDataDamage, dismissSavedDataDamage } = useStore()
  const [copyFailed, setCopyFailed] = useState(false)
  if (!savedDataDamage) return null
  const download = async () => setCopyFailed(!(await downloadSavedDataCopy()))
  return (
    <RecoveryPanel>
      <p className="font-medium">{MESSAGES[savedDataDamage]}</p>
      <p className="mt-1 text-ink-2">
        {copyFailed ? "Не удалось сохранить копию. Попробуйте ещё раз." : "Исходная копия сохранена на этом устройстве, её можно скачать."}
      </p>
      <div className="mt-3 flex justify-center gap-3">
        <RecoveryButton onClick={download}>Скачать копию</RecoveryButton>
        <RecoveryButton onClick={dismissSavedDataDamage}>Понятно</RecoveryButton>
      </div>
    </RecoveryPanel>
  )
}
