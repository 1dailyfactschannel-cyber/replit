"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        error: <XCircle className="w-4 h-4 text-red-500" />,
        info: <Info className="w-4 h-4 text-blue-500" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:border-l-4",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-l-emerald-500",
          error: "group-[.toaster]:border-l-red-500",
          info: "group-[.toaster]:border-l-blue-500",
          warning: "group-[.toaster]:border-l-amber-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
