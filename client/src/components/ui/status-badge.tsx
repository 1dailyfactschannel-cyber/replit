import { cn } from "@/lib/utils"

export type Status = string

interface StatusBadgeProps {
  status: string
  color?: string
  className?: string
}

const statusConfig: Record<string, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  defaultColor: string
}> = {
  online: {
    label: "В сети",
    bgColor: "bg-green-500/10",
    textColor: "text-green-600",
    borderColor: "border-green-500/20",
    defaultColor: "#22c55e"
  },
  offline: {
    label: "Не в сети",
    bgColor: "bg-gray-500/10",
    textColor: "text-gray-500",
    borderColor: "border-gray-500/20",
    defaultColor: "#6b7280"
  },
  busy: {
    label: "Занят",
    bgColor: "bg-red-500/10",
    textColor: "text-red-600",
    borderColor: "border-red-500/20",
    defaultColor: "#ef4444"
  },
}

export function StatusBadge({ status, color, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    bgColor: "bg-gray-500/10",
    textColor: "text-gray-600",
    borderColor: "border-gray-500/20",
    defaultColor: color || "#6b7280"
  }
  
  const dotColor = color || config.defaultColor

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bgColor,
        config.borderColor,
        className
      )}
      style={{ color: dotColor }}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: dotColor }} />
      {config.label}
    </span>
  )
}
