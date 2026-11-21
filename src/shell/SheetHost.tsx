import { lazy } from "react"
import { Deferred } from "@/shell/Deferred"
import { useStore } from "@/store/store"

const MoodSheet = lazy(() => import("@/sheets/MoodSheet").then((m) => ({ default: m.MoodSheet })))
const SleepSheet = lazy(() => import("@/sheets/SleepSheet").then((m) => ({ default: m.SleepSheet })))
const GallerySheet = lazy(() => import("@/sheets/GallerySheet").then((m) => ({ default: m.GallerySheet })))
const RecapSheet = lazy(() => import("@/sheets/RecapSheet").then((m) => ({ default: m.RecapSheet })))
const ProfileSheet = lazy(() => import("@/sheets/ProfileSheet").then((m) => ({ default: m.ProfileSheet })))
const CyclesSheet = lazy(() => import("@/sheets/Extras").then((m) => ({ default: m.CyclesSheet })))
const WellbeingSheet = lazy(() => import("@/sheets/Extras").then((m) => ({ default: m.WellbeingSheet })))
const NightSheet = lazy(() => import("@/sheets/Extras").then((m) => ({ default: m.NightSheet })))
const AwardsSheet = lazy(() => import("@/sheets/Extras").then((m) => ({ default: m.AwardsSheet })))
const GroundingSheet = lazy(() => import("@/sheets/PracticeSheets").then((m) => ({ default: m.GroundingSheet })))
const BodyScanSheet = lazy(() => import("@/sheets/PracticeSheets").then((m) => ({ default: m.BodyScanSheet })))
const WorrySheet = lazy(() => import("@/sheets/PracticeSheets").then((m) => ({ default: m.WorrySheet })))
const NightMode = lazy(() => import("@/shell/NightMode").then((m) => ({ default: m.NightMode })))

export function SheetHost() {
  const { sheet, nightMode } = useStore()
  return (
    <>
      <Deferred active={sheet === "mood"}><MoodSheet /></Deferred>
      <Deferred active={sheet === "sleep"}><SleepSheet /></Deferred>
      <Deferred active={sheet === "gallery"}><GallerySheet /></Deferred>
      <Deferred active={sheet === "recap"}><RecapSheet /></Deferred>
      <Deferred active={sheet === "profile"}><ProfileSheet /></Deferred>
      <Deferred active={sheet === "cycles"}><CyclesSheet /></Deferred>
      <Deferred active={sheet === "wellbeing"}><WellbeingSheet /></Deferred>
      <Deferred active={sheet === "night"}><NightSheet /></Deferred>
      <Deferred active={sheet === "awards"}><AwardsSheet /></Deferred>
      <Deferred active={sheet === "grounding"}><GroundingSheet /></Deferred>
      <Deferred active={sheet === "bodyscan"}><BodyScanSheet /></Deferred>
      <Deferred active={sheet === "worry"}><WorrySheet /></Deferred>
      <Deferred active={nightMode}><NightMode /></Deferred>
    </>
  )
}
