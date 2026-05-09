import { Card } from "@workspace/ui/components/card"

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  trend?: number
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: StatCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-5 w-5 text-blue-500" />
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold">{value}</span>
        {trend !== undefined && (
          <span
            className={`text-sm font-medium ${
              trend >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </Card>
  )
}
