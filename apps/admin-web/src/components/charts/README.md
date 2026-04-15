# Syncfusion Charts Theme Integration

This folder contains reusable components and utilities for Syncfusion charts with proper theme support.

## Quick Start

### Using Syncfusion Charts with Automatic Theme Support

The `useSyncfusionTheme` hook automatically detects your app's theme (light/dark) and applies the corresponding Syncfusion Material theme.

```tsx
import { useSyncfusionTheme } from '@/components/charts/useSyncfusionTheme'
import { Chart, ChartSeries, ChartSeriesCollection } from '@syncfusion/react-charts'

export function MyChart() {
  const { chartTheme, paletteColors } = useSyncfusionTheme()

  return (
    <Chart theme={chartTheme} palettes={paletteColors}>
      <ChartSeriesCollection>
        <ChartSeries type="Column" />
      </ChartSeriesCollection>
    </Chart>
  )
}
```

## How It Works

1. **Theme Detection**: The hook uses your app's existing `ThemeProvider` (from `theme-provider.tsx`) to detect the current theme
2. **Automatic Switching**: When you toggle between light and dark modes, the chart automatically switches between `Material` and `MaterialDark` themes
3. **Color Palettes**: Each theme has its own optimized color palette with 10 distinct colors

## Color Palettes

### Material (Light Mode)

- `#6355C7` (Primary Purple)
- `#00AEE0` (Cyan)
- `#FFB400` (Amber)
- `#F7523F` (Red-Orange)
- `#963C70` (Magenta)
- `#FD7400` (Orange)
- `#4BE0BC` (Teal)
- `#2196F5` (Blue)
- `#DE3D8A` (Pink)
- `#162F88` (Dark Blue)

### MaterialDark (Dark Mode)

- `#4EAAFF` (Light Blue)
- `#FA4EAB` (Light Pink)
- `#FFF500` (Yellow)
- `#17EA58` (Green)
- `#38FFE7` (Cyan)
- `#FF9E45` (Light Orange)
- `#B3F32F` (Lime)
- `#B93CE4` (Purple)
- `#FC5664` (Light Red)
- `#9B55FF` (Violet)

## Examples

### Bar Chart

```tsx
const { chartTheme, paletteColors } = useSyncfusionTheme()

<Chart theme={chartTheme} palettes={paletteColors}>
  <ChartSeriesCollection>
    <ChartSeries type="Bar" dataSource={data} xField="x" yField="y" />
  </ChartSeriesCollection>
</Chart>
```

### Line Chart

```tsx
const { chartTheme, paletteColors } = useSyncfusionTheme()

<Chart theme={chartTheme} palettes={paletteColors}>
  <ChartSeriesCollection>
    <ChartSeries type="Line" dataSource={data} xField="x" yField="y" />
  </ChartSeriesCollection>
</Chart>
```

### Pie Chart

```tsx
const { chartTheme, paletteColors } = useSyncfusionTheme()

<Chart theme={chartTheme} palettes={paletteColors}>
  <ChartSeriesCollection>
    <ChartSeries type="Pie" dataSource={data} xField="x" yField="y" />
  </ChartSeriesCollection>
</Chart>
```

## Notes

- The hook resolves the "system" theme preference by checking system dark mode settings
- All text styling (axis labels, titles) is controlled via CSS variables and will automatically adapt to your app's theme
- The Syncfusion license validation banner is hidden via CSS in the chart components
