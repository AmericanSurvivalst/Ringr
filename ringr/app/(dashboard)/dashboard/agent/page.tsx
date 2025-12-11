'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bot, Phone, MessageSquare, Settings, Save, Loader2, Plus, X } from 'lucide-react'

export default function AgentPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agent, setAgent] = useState<any>(null)
  const [newService, setNewService] = useState('')

  useEffect(() => {
    loadAgent()
  }, [])

  const loadAgent = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) return

    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .single()

    setAgent(data)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!agent) return
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('agents')
        .update({
          name: agent.name,
          greeting_message: agent.greeting_message,
          system_prompt: agent.system_prompt,
          services: agent.services,
          is_active: agent.is_active,
        })
        .eq('id', agent.id)

      if (error) throw error
      alert('Settings saved!')
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addService = () => {
    if (newService && !agent.services.includes(newService)) {
      setAgent({ ...agent, services: [...agent.services, newService] })
      setNewService('')
    }
  }

  const removeService = (service: string) => {
    setAgent({ 
      ...agent, 
      services: agent.services.filter((s: string) => s !== service) 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="empty-state py-16">
        <Bot className="empty-state-icon" />
        <p className="empty-state-title">No agent configured</p>
        <p className="empty-state-description">
          Please complete onboarding to set up your AI agent
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Agent</h1>
          <p className="text-gray-600">Configure how your AI handles calls</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      {/* Basic Settings */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Basic Settings</h2>
            <p className="text-sm text-gray-500">General agent configuration</p>
          </div>
        </div>

        <div>
          <label className="label">Agent Name</label>
          <input
            type="text"
            value={agent.name}
            onChange={(e) => setAgent({ ...agent, name: e.target.value })}
            className="input"
            placeholder="Main Agent"
          />
        </div>

        <div>
          <label className="label">Phone Number</label>
          <input
            type="text"
            value={agent.phone_number || 'Not assigned'}
            className="input bg-gray-50"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">
            Contact support to change your phone number
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Agent Active</p>
            <p className="text-sm text-gray-500">Turn off to stop taking calls</p>
          </div>
          <button
            onClick={() => setAgent({ ...agent, is_active: !agent.is_active })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              agent.is_active ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              agent.is_active ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold">Conversation</h2>
            <p className="text-sm text-gray-500">How your agent talks to callers</p>
          </div>
        </div>

        <div>
          <label className="label">Greeting Message</label>
          <textarea
            value={agent.greeting_message}
            onChange={(e) => setAgent({ ...agent, greeting_message: e.target.value })}
            className="input min-h-[100px] resize-none"
            placeholder="Thanks for calling! How can I help you today?"
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the first thing callers will hear
          </p>
        </div>

        <div>
          <label className="label">System Prompt (Advanced)</label>
          <textarea
            value={agent.system_prompt || ''}
            onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
            className="input min-h-[120px] resize-none font-mono text-sm"
            placeholder="Optional: Add custom instructions for your AI agent..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Advanced: Custom instructions that guide the AI's behavior
          </p>
        </div>
      </div>

      {/* Services */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold">Services</h2>
            <p className="text-sm text-gray-500">Services your agent can discuss</p>
          </div>
        </div>

        <div>
          <label className="label">Your Services</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.services?.map((service: string) => (
              <span
                key={service}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary-dark rounded-full text-sm font-medium"
              >
                {service}
                <button
                  onClick={() => removeService(service)}
                  className="hover:text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {(!agent.services || agent.services.length === 0) && (
              <p className="text-gray-500 text-sm">No services added</p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addService()}
              className="input flex-1"
              placeholder="Add a service..."
            />
            <button onClick={addService} className="btn btn-secondary">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
