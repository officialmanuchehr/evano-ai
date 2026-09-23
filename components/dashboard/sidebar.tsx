'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  PhoneCall,
  CalendarDays,
  BookOpen,
  Phone,
  Puzzle,
  Settings,
  Menu,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { logoutAction } from '@/lib/actions/auth'
import { useI18n } from '@/lib/i18n/client'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

const navigation: { key: keyof Dictionary['nav']; href: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', href: '/dashboard', icon: LayoutDashboard },
  { key: 'agent', href: '/dashboard/agent', icon: Bot },
  { key: 'calls', href: '/dashboard/calls', icon: PhoneCall },
  { key: 'bookings', href: '/dashboard/bookings', icon: CalendarDays },
  { key: 'knowledge', href: '/dashboard/knowledge', icon: BookOpen },
  { key: 'phone', href: '/dashboard/phone', icon: Phone },
  { key: 'integrations', href: '/dashboard/integrations', icon: Puzzle },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
]

function SidebarContent({ orgName, onNavigate }: { orgName: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <div className="flex h-full flex-col">
      {/* Logo / org name */}
      <div className="flex h-14 items-center gap-2 border-b pr-2 pl-4">
        <BrandMark />
        <span className="flex-1 truncate text-sm font-semibold">{orgName}</span>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {navigation.map((item) => {
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-primary shadow-[inset_2px_0_0_var(--primary)]'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {t.nav[item.key]}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t p-2">
        <LanguageSwitcher className="mx-1" />
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {t.common.signOut}
          </button>
        </form>
      </div>
    </div>
  )
}

export function DashboardSidebar({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden bg-background lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-56 lg:flex-col lg:border-r">
        <SidebarContent orgName={orgName} />
      </aside>

      {/* Mobile header + drawer */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="max-w-[160px] truncate text-sm font-semibold">{orgName}</span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          {/* base-ui uses `render` (not Radix's `asChild`) to swap the trigger element */}
          <SheetTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <Menu className="h-4 w-4" />
            <span className="sr-only">{t.nav.openMenu}</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SidebarContent orgName={orgName} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        </div>
      </header>
    </>
  )
}
