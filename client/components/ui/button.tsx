import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "neo-button inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "",
        destructive:
          "bg-red-500 hover:bg-red-600 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "neo-button-secondary bg-[color:var(--neo-surface-soft)] text-[color:var(--neo-foreground)] hover:bg-[color:rgba(59,130,246,0.18)]",
        secondary:
          "bg-[color:rgba(191,219,254,0.14)] text-[color:var(--neo-foreground)] hover:bg-[color:rgba(96,165,250,0.2)]",
        ghost:
          "border-0 bg-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-[color:rgba(147,197,253,0.12)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-[0.85rem] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-[1rem] px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-full",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
