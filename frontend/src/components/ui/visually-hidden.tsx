"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * Componente que esconde visualmente o conteúdo mas mantém acessível para leitores de tela
 * Baseado nas diretrizes de acessibilidade do Radix UI
 */
const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
      {...props}
    />
  )
)
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }

