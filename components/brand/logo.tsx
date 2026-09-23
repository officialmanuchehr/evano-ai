import { cn } from '@/lib/utils'

// =============================================================================
// Evano AI brand — indigo waveform tile (from public/brand/evano-logo.png)
// Recreated as SVG so it stays crisp at every size. Same art as app/icon.svg.
// =============================================================================

const BRAND_INDIGO = '#1800AD'

// Bar geometry in a 724×724 tile: [x, y, height] — all bars are 52 wide, fully rounded
const BARS = [
  [103, 277, 170],
  [181, 237, 250],
  [258, 177, 370],
  [336, 78, 568],
  [414, 177, 370],
  [491, 237, 250],
  [569, 277, 170],
] as const

const sizes = {
  sm: 'h-7 w-7 rounded-lg',
  lg: 'h-10 w-10 rounded-xl',
} as const

/** Square waveform icon with a neon glow. */
export function BrandMark({
  size = 'sm',
  className,
}: {
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 724 724"
      aria-hidden
      className={cn('neon-glow flex-shrink-0', sizes[size], className)}
    >
      <rect width="724" height="724" rx="120" fill={BRAND_INDIGO} />
      <g fill="#fff">
        {BARS.map(([x, y, h]) => (
          <rect key={x} x={x} y={y} width="52" height={h} rx="26" />
        ))}
      </g>
    </svg>
  )
}

/** Icon + "EVANO.AI" wordmark, for headers and footers. */
export function BrandLogo({ size = 'sm', className }: { size?: keyof typeof sizes; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark size={size} />
      <span
        className={cn(
          'font-extrabold uppercase tracking-tight text-foreground',
          size === 'lg' ? 'text-xl' : 'text-base'
        )}
      >
        Evano<span className="text-primary">.</span>AI
      </span>
    </span>
  )
}
