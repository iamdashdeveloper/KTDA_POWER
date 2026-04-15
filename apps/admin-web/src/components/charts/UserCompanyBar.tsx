"use client"

import { useEffect, useState } from "react"
import {
  Chart,
  ChartSeriesCollection,
  ChartSeries,
  ChartPrimaryXAxis,
  ChartPrimaryYAxis,
  ChartTooltip,
  ChartTitle,
  ChartAxisTitle,
  ChartAxisLabel,
} from "@syncfusion/react-charts"
import apiClient from "@/lib/api"
import { Card } from "@workspace/ui/components/card"
import { handleFormError } from "@/lib/errorHandler"
import { useSyncfusionTheme } from "./useSyncfusionTheme"
// Hide Syncfusion license validation banner and style axis labels with CSS variables
if (typeof window !== "undefined") {
  const style = document.createElement("style")
  style.innerHTML = `
    div[style*="position: fixed"][style*="top: 10px"][style*="background: #EEF2FF"] {
      display: none !important;
    }
    
  `
  document.head.appendChild(style)
}

interface CompanyUserData {
  x: string
  y: number
  color?: string
}

export function UserCompanyBar() {
  const { chartTheme, paletteColors } = useSyncfusionTheme()
  const [chartData, setChartData] = useState<CompanyUserData[]>([])
  const [yAxisInterval, setYAxisInterval] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate smart interval based on max value
  const calculateInterval = (maxValue: number): number => {
    if (maxValue <= 10) return 1
    if (maxValue <= 20) return 2
    if (maxValue <= 50) return 5
    if (maxValue <= 100) return 10
    if (maxValue <= 500) return 50
    if (maxValue <= 1000) return 100
    return 500
  }

  useEffect(() => {
    const fetchUsersByCompany = async () => {
      try {
        setLoading(true)
        const usersResponse = await apiClient.get("/users")
        const users = usersResponse.data.users

        // Get all companies
        const companiesResponse = await apiClient.get("/companies")
        const allCompanies = companiesResponse.data

        // Create a map of company ID to company name
        const companyIdToName = new Map<string, string>()
        allCompanies.forEach((company: any) => {
          companyIdToName.set(company.id, company.name)
        })

        // Group users by company ID
        const companyMap = new Map<string, number>()

        // Initialize all companies with 0
        allCompanies.forEach((company: any) => {
          companyMap.set(company.id, 0)
        })

        // Count users per company by ID
        users.forEach((user: any) => {
          const companyId = user.company.id
          companyMap.set(companyId, (companyMap.get(companyId) || 0) + 1)
        })

        // Convert to array and sort alphabetically by company name
        const data: CompanyUserData[] = Array.from(companyMap)
          .map(([companyId, userCount]) => ({
            x: companyIdToName.get(companyId) || "Unknown",
            y: userCount,
          }))
          .sort((a, b) => a.x.localeCompare(b.x))
          // Add color to each data point cycling through palette
          .map((item, index) => ({
            ...item,
            color: paletteColors[index % paletteColors.length],
          }))

        // Calculate interval based on max value
        const maxUsers = Math.max(...data.map((d) => d.y), 10)
        setYAxisInterval(calculateInterval(maxUsers))

        setChartData(data)
        setError(null)
      } catch (err) {
        handleFormError(err)
        setError("Failed to fetch user data")
      } finally {
        setLoading(false)
      }
    }

    fetchUsersByCompany()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Users by Company</h3>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Users by Company</h3>
        <div className="flex h-96 items-center justify-center">
          <p className="text-red-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Users by Company</h3>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div style={{ overflowX: "auto" }} className="">
        <Chart
          id="user-company-chart"
          theme={chartTheme}
          palettes={paletteColors}
          width={
            chartData.length > 0
              ? `${Math.max(800, chartData.length * 80)}px`
              : "100%"
          }
        >
          <ChartTitle text="Users by Company" />
          <ChartPrimaryXAxis valueType="Category">
            <ChartAxisLabel />
          </ChartPrimaryXAxis>
          <ChartPrimaryYAxis lineStyle={{ width: 0 }} interval={yAxisInterval}>
            <ChartAxisLabel />
            <ChartAxisTitle text="Number of Users" />
          </ChartPrimaryYAxis>
          <ChartSeriesCollection>
            <ChartSeries
              dataSource={chartData}
              xField="x"
              yField="y"
              type="Bar"
              columnWidth={0.5}
              colorField="color"
            />
          </ChartSeriesCollection>
          <ChartTooltip
            enable={true}
            format="${point.x} : <b>${point.y} users</b>"
          />
        </Chart>
      </div>
    </Card>
  )
}
