import { useTheme } from '@/app/theme'
import { useComposedRefs } from '@radix-ui/react-compose-refs'
import { ceramic } from '@oyn/ceramic'
import { useSurface } from '@oyn/surface'
import { neutralProps, destructiveProps, primaryProps } from '@/ceramic/materials'
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
  ref: forwardedRef,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const mode = useTheme().dark ? 'dark' : 'light'
  const material = variant === 'default' ? primaryProps[mode] : variant === 'destructive' ? destructiveProps[mode] : neutralProps
  const filled = variant !== 'ghost' && variant !== 'link'
  const surfaceRef = useSurface({ appearance: ceramic, props: { colorScheme: useTheme().dark ? 'dark' : 'light', ...material } })
  const ref = useComposedRefs(filled ? surfaceRef : undefined, forwardedRef)
  const materialClass = variant === 'default' ? 'text-primary-foreground' : variant === 'destructive' ? 'text-white' : 'text-foreground'
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-surface-button={filled ? "" : undefined}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant: filled ? null : variant, size }), "transition-[color,opacity,transform]", filled && materialClass, filled && variant === 'outline' && 'border border-transparent', className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
