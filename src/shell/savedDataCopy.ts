import { saveJsonFile } from "@/lib/saveFile"
import { readSavedDataCopy } from "@/store/store"

/** Downloads the saved data exactly as stored, damaged parts included, so nothing is lost for good. */
export async function downloadSavedDataCopy(): Promise<boolean> {
  const raw = readSavedDataCopy()
  if (raw === null) return false
  try {
    await saveJsonFile("somna-saved-data.json", raw, "Копия данных")
    return true
  } catch {
    return false
  }
}
