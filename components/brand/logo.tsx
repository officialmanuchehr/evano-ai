import { cn } from '@/lib/utils'

// =============================================================================
// Evano AI brand mark — blue→cyan gradient tile with a neon glow
// =============================================================================

const sizes = {
  sm: 'h-7 w-7 rounded-lg text-xs',
  lg: 'h-10 w-10 rounded-xl text-lg',
} as const

export function BrandMark({
  size = 'sm',
  className,
}: {
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'neon-gradient neon-glow inline-flex flex-shrink-0 items-center justify-center font-bold text-primary-foreground',
        sizes[size],
        className
      )}
    >
      E
    </div>
  )
}
