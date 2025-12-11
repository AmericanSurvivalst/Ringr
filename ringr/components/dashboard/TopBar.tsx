'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight, Clock, Zap } from 'lucide-react'
import type { AccountStatus } from '@/lib/types/database'

interface TopBarProps {
  accountStatus: AccountStatus | null
  userName: string
  orgName: string
}

export function TopBar({ accountStatus, userName, orgName }: TopBarProps) {
  const [showUsageWarning, setShowUsageWarning] = useState(false)

  useEffect(() => {
    if (accountStatus) {
      const usagePercent = (accountStatus.minutes_used / accountStatus.minutes_included) * 100
      setShowUsageWarning(usagePercent >= 80)
    }
  }, [accountStatus])

  const getUsagePercent = () => {
    if (!accountStatus || accountStatus.minutes_included === 0) return 0
    return Math.min(100, (accountStatus.minutes_used / accountStatus.minutes_included) * 100)
  }

  const getUsageBarClass = () => {
    const percent = getUsagePercent()
    if (percent >= 90) return 'danger'
    if (percent >= 75) return 'warning'
    return ''
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left - Breadcrumb / Title */}
        <div>
          <p className="text-sm text-gray-500">{orgName}</p>
        </div>

        {/* Right - Usage & Actions */}
        <div className="flex items-center gap-6">
          {/* Trial/Usage Badge */}
          {accountStatus && (
            <>
              {accountStatus.is_trial && accountStatus.trial_days_remaining > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {accountStatus.trial_days_remaining} days left in trial
                </div>
              )}

              {/* Usage Bar */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Minutes used</p>
                  <p className="text-sm font-semibold">
                    {accountStatus.minutes_used.toLocaleString()} / {accountStatus.minutes_included.toLocaleString()}
                  </p>
                </div>
                <div className="w-32">
                  <div className="usage-bar">
                    <div 
                      className={`usage-bar-fill ${getUsageBarClass()}`}
                      style={{ width: `${getUsagePercent()}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Upgrade Button */}
              {(accountStatus.is_trial || accountStatus.plan_name === 'starter') && (
                <Link 
                  href="/dashboard/billing"
                  className="btn btn-primary btn-sm"
                >
                  <Zap className="w-4 h-4" />
                  Upgrade
                </Link>
              )}
            </>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
              {userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Locked Account Banner */}
      {accountStatus?.is_locked && (
        <div className="mt-4 -mx-8 -mb-4 px-8 py-3 bg-red-50 border-t border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">
                  {accountStatus.lock_reason === 'trial_expired' && 'Your trial has ended'}
                  {accountStatus.lock_reason === 'minutes_exhausted' && 'You\'ve used all your minutes'}
                  {accountStatus.lock_reason === 'subscription_canceled' && 'Your subscription is canceled'}
                  {accountStatus.lock_reason === 'account_locked' && 'Your account is locked'}
                </p>
                <p className="text-sm text-red-600">
                  {accountStatus.lock_reason === 'trial_expired' && 'Subscribe to keep using Ringr'}
                  {accountStatus.lock_reason === 'minutes_exhausted' && 'Upgrade your plan or wait for your next billing cycle'}
                  {accountStatus.lock_reason === 'subscription_canceled' && 'Reactivate to continue using Ringr'}
                </p>
              </div>
            </div>
            <Link href="/dashboard/billing" className="btn btn-primary btn-sm">
              {accountStatus.lock_reason === 'minutes_exhausted' ? 'Upgrade Plan' : 'Subscribe Now'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
