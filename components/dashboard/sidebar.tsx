'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { logoutAction } from '@/lib/actions/auth'
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

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Receptionist', href: '/dashboard/agent', icon: Bot },
  { name: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays },
  { name: 'Knowledge', href: '/dashboard/knowledge', icon: BookOpen },
  { name: 'Phone', href: '/dashboard/phone', icon: Phone },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Puzzle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  orgName: string
  userInitial: string
  onNavigate?: () => void
}

function SidebarContent({ orgName, userInitial, onNavigate }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo / org name */}
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <BrandMark />
        <span className="font-semibold text-sm truncate">{orgName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
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
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2 space-y-0.5">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

interface DashboardSidebarProps {
  orgName: string
  userInitial: string
}

export function DashboardSidebar({ orgName, userInitial }: DashboardSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:border-r lg:fixed lg:inset-y-0 lg:z-50 bg-background">
        <SidebarContent orgName={orgName} userInitial={userInitial} />
      </aside>

      {/* Mobile header + drawer */}
      <header className="lg:hidden flex items-center justify-between h-14 border-b px-4 fixed top-0 left-0 right-0 z-50 bg-background">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="font-semibold text-sm truncate max-w-[160px]">{orgName}</span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          {/* base-ui uses `render` (not Radix's `asChild`) to swap the trigger element */}
          <SheetTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-56">
            <SidebarContent
              orgName={orgName}
              userInitial={userInitial}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
