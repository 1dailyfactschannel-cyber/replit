"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"

interface AvatarWithStatusProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
  src?: string | null
  fallback: string
  status?: "online" | "away" | "offline" | "busy"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
}

const sizeMap = {
  xs: "w-5 h-5",
  sm: "w-7 h-7",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
}

const statusColorMap = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
  busy: "bg-rose-500",
}

const statusSizeMap = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-3.5 h-3.5",
}

export function AvatarWithStatus({
  src,
  fallback,
  status,
  size = "md",
  className,
  ...props
}: AvatarWithStatusProps) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar className={cn(sizeMap[size])} {...props}>
        <AvatarImage src={src || undefined} alt={fallback} />
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold",
            size === "xs" && "text-[8px]",
            size === "sm" && "text-[10px]",
            size === "md" && "text-xs",
            size === "lg" && "text-sm",
            size === "xl" && "text-base"
          )}
        >
          {fallback.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            statusColorMap[status],
            statusSizeMap[size],
            status === "online" && "status-online"
          )}
        />
      )}
    </div>
  )
}
