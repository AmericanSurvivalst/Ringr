'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, Save, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) return

    const { data: userData } = await supabase
      .from('users')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('id', authUser.id)
      .single()

    setUser(userData)
    setOrg(userData?.organization)
    setLoading(false)
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ full_name: user.full_name })
        .eq('id', user.id)

      if (error) throw error
      alert('Profile saved!')
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOrg = async () => {
    if (!org) return
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('organizations')
        .update({
          name: org.name,
          phone: org.phone,
          timezone: org.timezone,
        })
        .eq('id', org.id)

      if (error) throw error
      alert('Organization saved!')
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account and organization</p>
      </div>

      {/* Profile */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Profile</h2>
            <p className="text-sm text-gray-500">Your personal information</p>
          </div>
        </div>

        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            value={user?.full_name || ''}
            onChange={(e) => setUser({ ...user, full_name: e.target.value })}
            className="input"
            placeholder="John Smith"
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            className="input bg-gray-50"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">
            Contact support to change your email
          </p>
        </div>

        <div>
          <label className="label">Role</label>
          <input
            type="text"
            value={user?.role || 'member'}
            className="input bg-gray-50 capitalize"
            disabled
          />
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </button>
      </div>

      {/* Organization */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold">Organization</h2>
            <p className="text-sm text-gray-500">Your business details</p>
          </div>
        </div>

        <div>
          <label className="label">Business Name</label>
          <input
            type="text"
            value={org?.name || ''}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
            className="input"
            placeholder="Smith HVAC"
          />
        </div>

        <div>
          <label className="label">Phone Number</label>
          <input
            type="tel"
            value={org?.phone || ''}
            onChange={(e) => setOrg({ ...org, phone: e.target.value })}
            className="input"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="label">Timezone</label>
          <select
            value={org?.timezone || 'America/New_York'}
            onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
            className="select"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="America/Phoenix">Arizona Time</option>
          </select>
        </div>

        <button
          onClick={handleSaveOrg}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Organization
        </button>
      </div>
    </div>
  )
}
