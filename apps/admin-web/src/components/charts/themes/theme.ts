// themes/theme.ts
import { useEffect, useState } from "react"
import { useTheme } from "next-themes" // Assuming you use next-themes

export function useChartTheme() {
  const { theme } = useTheme()
  const [chartTheme, setChartTheme] = useState<string>("Fluent2")
  const [paletteColors, setPaletteColors] = useState<string[]>(["#3b82f6"])

  useEffect(() => {
    // 1. Determine the base Syncfusion theme based on light/dark mode
    setChartTheme(theme === "dark" ? "Fluent2Dark" : "Fluent2")

    // 2. Extract shadcn variables from the computed styles
    const styles = getComputedStyle(document.body)

    // shadcn variables are usually stored as "123 45% 67%" (HSL)
    // We convert them to a usable CSS hsl() string
    const primary = `hsl(${styles.getPropertyValue("--primary").trim()})`
    const accent = `hsl(${styles.getPropertyValue("--accent").trim()})`
    const chart1 = `hsl(${styles.getPropertyValue("--chart-1").trim() || "221 83% 53%"})`

    setPaletteColors([primary, chart1, accent])
  }, [theme])

  return { chartTheme, paletteColors }
}
