import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react"

const variantIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
  destructive: <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />,
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = variant ? variantIcons[variant] : null
        return (
          <Toast key={id} variant={variant as any} {...props}>
            <div className="flex items-start gap-3">
              {icon}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
