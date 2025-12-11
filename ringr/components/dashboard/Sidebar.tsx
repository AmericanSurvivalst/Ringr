'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Phone, LayoutDashboard, PhoneCall, Calendar, 
  BarChart3, Bot, Settings, CreditCard, LogOut,
  HelpCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'AI Agent', href: '/dashboard/agent', icon: Bot },
]

const secondaryNav = [
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Ringr</span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Secondary Nav */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        {secondaryNav.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* Help */}
      <div className="p-4 border-t border-gray-100">
        <a 
          href="mailto:support@ringr.ai"
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
          <div>
            <p className="font-medium text-gray-900">Need help?</p>
            <p className="text-xs">Contact support</p>
          </div>
        </a>
      </div>
    </aside>
  )
}
