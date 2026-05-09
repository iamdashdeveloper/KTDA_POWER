"use client"

import {
  PieChart,
  PieChartSeriesCollection,
  PieChartSeries,
  PieChartLegend,
  PieChartTooltip,
  PieChartDataLabel,
} from "@syncfusion/react-charts"
import { Card } from "@workspace/ui/components/card"
import { useSyncfusionTheme } from "./useSyncfusionTheme"
import { Browser } from "@syncfusion/react-base"
interface UserPositionChartProps {
  data: Array<{ x: string; y: number }>
}

export function UserPositionChart({ data }: UserPositionChartProps) {
  const { chartTheme } = useSyncfusionTheme()
  const isDevice = Browser.isDevice
  const labelSize = isDevice ? "9px" : "13px"
  const connectorLength = isDevice ? "5px" : "8px"
  return (
    <Card className="p-6 lg:col-span-1">
      <h2 className="mb-4 text-lg font-semibold">Users by Position</h2>
      {data.length > 0 ? (
        <PieChart height="300px" width="100%" theme={chartTheme}>
          <PieChartSeriesCollection>
            <PieChartSeries
              dataSource={data}
              xField="x"
              yField="y"
              startAngle={0}
              endAngle={360}
              radius="80%"
              innerRadius="50%"
              explode={true}
            >
              <PieChartDataLabel
                visible={true}
                position="Outside"
                name={Browser.isDevice ? "x" : "text"}
                connectorStyle={{ length: connectorLength }}
                font={{ fontSize: labelSize }}
              />
            </PieChartSeries>
          </PieChartSeriesCollection>
          <PieChartLegend visible={true} position="Bottom" />
          <PieChartTooltip enable={true} />
        </PieChart>
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          No user position data available
        </p>
      )}
    </Card>
  )
}
