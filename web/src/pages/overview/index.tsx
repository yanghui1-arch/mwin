import { useEffect, useMemo, useState } from "react"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { overviewApi, type OverviewSummary, type OverviewTokenCurve, type OverviewWindowHours } from "@/api/overview"
import { projectApi } from "@/api/project"

type TimeRange = "1d" | "7d" | "30d"

type ProjectOption = {
  projectId: number
  projectName: string
}

const WINDOW_HOURS_BY_RANGE: Record<TimeRange, OverviewWindowHours> = {
  "1d": 24,
  "7d": 168,
  "30d": 720,
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<OverviewSummary | null>(null)
  const [curve, setCurve] = useState<OverviewTokenCurve | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [curveLoading, setCurveLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([])

  useEffect(() => {
    let active = true
    setSummaryLoading(true)
    overviewApi.getSummary()
      .then((data) => {
        if (active) {
          setSummary(data)
        }
      })
      .catch(() => {
        if (active) {
          setSummary(null)
        }
      })
      .finally(() => {
        if (active) {
          setSummaryLoading(false)
        }
      })

    projectApi.getAllProjects()
      .then((res) => {
        if (!active) return
        const data = Array.isArray(res.data.data) ? res.data.data : []
        const nextProjects = data.map((project) => ({
          projectId: project.projectId,
          projectName: project.projectName,
        }))
        setProjects(nextProjects)
        setSelectedProjectIds(nextProjects.map((project) => project.projectId))
      })
      .catch(() => {
        if (active) {
          setProjects([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setCurveLoading(true)
    overviewApi.getTokenCurve(WINDOW_HOURS_BY_RANGE[timeRange], selectedProjectIds)
      .then((data) => {
        if (active) {
          setCurve(data)
        }
      })
      .catch(() => {
        if (active) {
          setCurve(null)
        }
      })
      .finally(() => {
        if (active) {
          setCurveLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedProjectIds, timeRange])

  const projectOptions = useMemo(
    () => projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
    })),
    [projects]
  )

  return (
    <>
      <SectionCards summary={summary} loading={summaryLoading} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive
          curve={curve}
          loading={curveLoading}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          projectOptions={projectOptions}
          selectedProjectIds={selectedProjectIds}
          onSelectedProjectIdsChange={setSelectedProjectIds}
        />
      </div>
    </>
  )
}
