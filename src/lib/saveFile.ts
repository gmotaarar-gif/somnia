import { Capacitor } from "@capacitor/core"
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

/** Hands a JSON file to the user: the share sheet on the phone, a download in the browser. */
export async function saveJsonFile(name: string, data: string, dialogTitle: string) {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 })
    const result = await Share.share({ title: "Somna", dialogTitle, files: [uri] })
    if (!result.activityType) throw new Error("Share cancelled")
    return
  }
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
