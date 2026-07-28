import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (props.id === "missing-currentRentMonthly") {
    return <div className="relative min-w-0"><InputPrimitive {...props} type="number" inputMode="decimal" placeholder="Esim. 750 € / kk. HUOM! Vain vuokra, ei erilliskustannuksia." data-slot="input" className={cn("h-11 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pl-2.5 pr-17 text-base transition-colors outline-none placeholder:text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:placeholder:text-sm", className)} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center whitespace-nowrap text-sm text-muted-foreground">€ / kk</span></div>
  }
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
