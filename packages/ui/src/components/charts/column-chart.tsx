import {
  Chart,
  ChartSeriesCollection,
  ChartSeries,
} from "@syncfusion/react-charts"
export default function ColumnChart() {
  const data = [
    { x: 2016, y: 4.8 },
    { x: 2017, y: 5.2 },
    { x: 2018, y: 6.2 },
    { x: 2019, y: 7.8 },
    { x: 2020, y: 9.3 },
    { x: 2021, y: 14.3 },
    { x: 2022, y: 15.6 },
    { x: 2023, y: 16.0 },
    { x: 2024, y: 17.0 },
  ]
  return (
    <Chart>
      <ChartSeriesCollection>
        <ChartSeries dataSource={data} xField="x" yField="y" type="Column" />
      </ChartSeriesCollection>
    </Chart>
  )
}
