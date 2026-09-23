import { cn } from '@/lib/utils'

// =============================================================================
// Evano AI brand — blue waveform (from public/brand/logo.png, #004AAD)
// Recreated as SVG so it stays crisp at every size. Same art as app/icon.svg.
// =============================================================================

export const BRAND_BLUE = '#004AAD' // light theme; dark theme uses a lighter blue via --brand-mark

// Measured from the logo: five 101-wide, fully rounded bars in an 836×504 box,
// centred vertically in a square 836×836 viewBox. [x, y, height]
const BARS = [
  [0, 367, 102],
  [183, 270, 296],
  [367, 166, 504],
  [550, 270, 296],
  [733, 367, 102],
] as const

const sizes = {
  sm: 'h-7 w-7',
  lg: 'h-10 w-10',
} as const

/** Waveform icon with a soft blue glow. */
export function BrandMark({
  size = 'sm',
  className,
}: {
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 836 836"
      aria-hidden
      className={cn('flex-shrink-0 drop-shadow-[0_0_6px_rgb(0_74_173/0.35)]', sizes[size], className)}
    >
      <g fill="var(--brand-mark)">
        {BARS.map(([x, y, h]) => (
          <rect key={x} x={x} y={y} width="101" height={h} rx="50.5" />
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
          'font-semibold uppercase tracking-[0.12em] text-foreground',
          size === 'lg' ? 'text-xl' : 'text-[0.95rem]'
        )}
      >
        Evano.AI
      </span>
    </span>
  )
}
