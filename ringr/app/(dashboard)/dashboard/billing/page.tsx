'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  CreditCard, Check, Zap, Clock, ChevronRight, 
  Loader2, ExternalLink, AlertCircle 
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29700,
    minutes: 500,
    features: [
      '1 phone number',
      '1 AI agent',
      'Call recordings & transcripts',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 59700,
    minutes: 1500,
    popular: true,
    features: [
      '3 phone numbers',
      '3 AI agents',
      'Calendar integration',
      'Full analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 149700,
    minutes: 5000,
    features: [
      '10 phone numbers',
      'Unlimited AI agents',
      'Calendar integration',
      'Analytics + data export',
      'Dedicated account manager',
      'API access',
    ],
  },
]

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [org, setOrg] = useState<any>(null)
  const [accountStatus, setAccountStatus] = useState<any>(null)
  
  const router = useRouter()

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select(`
        organization:organizations(
          *,
          plan:plans(*)
        )
      `)
      .eq('id', user.id)
      .single()

    const organization = Array.isArray(userData?.organization) 
      ? userData?.organization[0] 
      : userData?.organization

    if (organization) {
      setOrg(organization)
      
      // Get account status
      const { data: status } = await supabase
        .rpc('get_account_status', { org_id: organization.id })
      setAccountStatus(status)
    }

    setLoading(false)
  }

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId)
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const { url, error } = await response.json()
      
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout')
    } finally {
      setSubscribing(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/portal', {
        method: 'POST',
      })

      const { url, error } = await response.json()
      
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err: any) {
      alert(err.message || 'Failed to open billing portal')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const currentPlanId = org?.plan?.name
  const isTrialing = accountStatus?.is_trial
  const isLocked = accountStatus?.is_locked

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-gray-600">Manage your subscription and billing</p>
      </div>

      {/* Trial/Status Banner */}
      {isTrialing && accountStatus?.trial_days_remaining > 0 && (
        <div className="alert alert-info">
          <Clock className="w-5 h-5" />
          <div>
            <p className="font-semibold">
              {accountStatus.trial_days_remaining} days left in your free trial
            </p>
            <p className="text-sm opacity-90">
              Subscribe before your trial ends to keep using Ringr
            </p>
          </div>
        </div>
      )}

      {isLocked && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold">
              {accountStatus.lock_reason === 'trial_expired' && 'Your trial has ended'}
              {accountStatus.lock_reason === 'minutes_exhausted' && 'You\'ve used all your minutes'}
              {accountStatus.lock_reason === 'subscription_canceled' && 'Your subscription is canceled'}
            </p>
            <p className="text-sm opacity-90">
              Subscribe or upgrade to continue using Ringr
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      {org?.stripe_subscription_id && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-xl font-bold capitalize">{currentPlanId}</p>
              <p className="text-sm text-gray-500">
                {accountStatus?.minutes_used?.toLocaleString()} / {accountStatus?.minutes_included?.toLocaleString()} minutes used
              </p>
            </div>
            <button
              onClick={handleManageBilling}
              className="btn btn-secondary"
            >
              Manage Billing
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          
          {/* Usage Bar */}
          <div className="mt-4">
            <div className="usage-bar h-3">
              <div 
                className={`usage-bar-fill ${
                  (accountStatus?.minutes_used / accountStatus?.minutes_included) >= 0.9 ? 'danger' :
                  (accountStatus?.minutes_used / accountStatus?.minutes_included) >= 0.75 ? 'warning' : ''
                }`}
                style={{ 
                  width: `${Math.min(100, (accountStatus?.minutes_used / accountStatus?.minutes_included) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {org?.stripe_subscription_id ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id
            const isDowngrade = currentPlanId === 'scale' || 
              (currentPlanId === 'growth' && plan.id === 'starter')
            
            return (
              <div 
                key={plan.id}
                className={`card p-6 relative ${
                  plan.popular ? 'ring-2 ring-primary' : ''
                } ${isCurrent ? 'bg-primary/5' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.minutes.toLocaleString()} minutes included
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button className="btn btn-secondary w-full" disabled>
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id}
                    className={`btn w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {subscribing === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isDowngrade ? 'Downgrade' : 'Upgrade'}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Billing FAQ</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">What happens if I run out of minutes?</p>
            <p className="text-gray-600">
              Your agent will stop taking calls until your next billing cycle or until you upgrade.
            </p>
          </div>
          <div>
            <p className="font-medium">Can I change plans anytime?</p>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <p className="font-medium">How do I cancel?</p>
            <p className="text-gray-600">
              You can cancel anytime from the billing portal. You'll keep access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
