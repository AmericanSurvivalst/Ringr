'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Phone, Building2, Clock, MessageSquare, Check, 
  ArrowRight, ArrowLeft, Loader2, Sparkles 
} from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Business Info', icon: Building2 },
  { id: 2, title: 'Services', icon: Clock },
  { id: 3, title: 'Greeting', icon: MessageSquare },
  { id: 4, title: 'Review', icon: Check },
]

const INDUSTRIES = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Roofing',
  'Landscaping',
  'Cleaning',
  'Pest Control',
  'Garage Doors',
  'Pool Service',
  'Other',
]

const DEFAULT_SERVICES = {
  'HVAC': ['AC Repair', 'Heating Repair', 'AC Installation', 'Maintenance', 'Duct Cleaning'],
  'Plumbing': ['Drain Cleaning', 'Leak Repair', 'Water Heater', 'Pipe Repair', 'Toilet Repair'],
  'Electrical': ['Outlet Repair', 'Panel Upgrade', 'Lighting', 'Wiring', 'Generator'],
  'Roofing': ['Roof Repair', 'Roof Replacement', 'Inspection', 'Gutter Cleaning', 'Leak Repair'],
  'Landscaping': ['Lawn Care', 'Tree Trimming', 'Irrigation', 'Hardscaping', 'Design'],
  'Cleaning': ['Deep Clean', 'Regular Cleaning', 'Move In/Out', 'Office Cleaning', 'Windows'],
  'Pest Control': ['General Pest', 'Termites', 'Rodents', 'Bed Bugs', 'Wildlife'],
  'Garage Doors': ['Repair', 'Installation', 'Opener Repair', 'Spring Replacement', 'Maintenance'],
  'Pool Service': ['Cleaning', 'Repair', 'Opening/Closing', 'Equipment', 'Renovation'],
  'Other': ['Service 1', 'Service 2', 'Service 3'],
}

function OnboardingForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [services, setServices] = useState<string[]>([])
  const [customService, setCustomService] = useState('')
  const [greeting, setGreeting] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlan = searchParams.get('plan') || 'growth'

  // Auto-populate greeting when business name changes
  useEffect(() => {
    if (businessName) {
      setGreeting(`Thanks for calling ${businessName}! How can I help you today?`)
    }
  }, [businessName])

  // Auto-populate services when industry changes
  useEffect(() => {
    if (industry && DEFAULT_SERVICES[industry as keyof typeof DEFAULT_SERVICES]) {
      setServices(DEFAULT_SERVICES[industry as keyof typeof DEFAULT_SERVICES])
    }
  }, [industry])

  const handleAddService = () => {
    if (customService && !services.includes(customService)) {
      setServices([...services, customService])
      setCustomService('')
    }
  }

  const handleRemoveService = (service: string) => {
    setServices(services.filter(s => s !== service))
  }

  const handleComplete = async () => {
    setSaving(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      // Get the plan ID
      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', selectedPlan)
        .single()

      // Create organization with trial
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 7)

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: businessName,
          slug: businessName.toLowerCase().replace(/\s+/g, '-'),
          industry,
          timezone,
          plan_id: plan?.id,
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt.toISOString(),
          onboarding_completed: true,
          onboarding_step: 4,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Update user with organization
      const { error: userError } = await supabase
        .from('users')
        .update({
          organization_id: org.id,
          role: 'owner',
        })
        .eq('id', user.id)

      if (userError) throw userError

      // Create default agent
      const { error: agentError } = await supabase
        .from('agents')
        .insert({
          organization_id: org.id,
          name: 'Main Agent',
          greeting_message: greeting,
          services: services,
          is_active: true,
        })

      if (agentError) throw agentError

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Onboarding error:', error)
      alert(error.message || 'Failed to complete setup')
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return businessName && industry
      case 2: return services.length > 0
      case 3: return greeting.length > 10
      case 4: return true
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Ringr</span>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-3 ${step >= s.id ? 'text-primary' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step > s.id ? 'bg-primary text-white' :
                    step === s.id ? 'bg-primary/10 text-primary border-2 border-primary' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${step === s.id ? 'text-gray-900' : ''}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-4 ${step > s.id ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">Tell us about your business</h1>
            <p className="text-gray-600 mb-8">This helps us customize Ringr for your needs</p>
            
            <div className="space-y-6">
              <div>
                <label className="label">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="input"
                  placeholder="Smith HVAC"
                />
              </div>

              <div>
                <label className="label">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="select"
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="select"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="America/Phoenix">Arizona Time</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">What services do you offer?</h1>
            <p className="text-gray-600 mb-8">Ringr will mention these when talking to callers</p>
            
            <div className="space-y-6">
              <div>
                <label className="label">Your Services</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {services.map(service => (
                    <span
                      key={service}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary-dark rounded-full text-sm font-medium"
                    >
                      {service}
                      <button
                        onClick={() => handleRemoveService(service)}
                        className="hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {services.length === 0 && (
                  <p className="text-gray-500 text-sm mb-4">No services added yet</p>
                )}
              </div>

              <div>
                <label className="label">Add Custom Service</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
                    className="input flex-1"
                    placeholder="e.g., Emergency Repair"
                  />
                  <button
                    onClick={handleAddService}
                    className="btn btn-secondary"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Greeting */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">Customize your greeting</h1>
            <p className="text-gray-600 mb-8">This is what callers hear when Ringr answers</p>
            
            <div className="space-y-6">
              <div>
                <label className="label">Greeting Message</label>
                <textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  className="input min-h-[120px] resize-none"
                  placeholder="Thanks for calling! How can I help you today?"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Tip: Keep it friendly and under 15 seconds when spoken
                </p>
              </div>

              <div className="card p-6 bg-gray-50 border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Preview</h3>
                    <p className="text-gray-600 text-sm italic">"{greeting}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">You're all set!</h1>
            <p className="text-gray-600 mb-8">Review your setup and start your 7-day free trial</p>
            
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-500 text-sm mb-3">BUSINESS</h3>
                <p className="text-lg font-semibold">{businessName}</p>
                <p className="text-gray-600">{industry}</p>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-500 text-sm mb-3">SERVICES</h3>
                <div className="flex flex-wrap gap-2">
                  {services.map(service => (
                    <span key={service} className="badge badge-gray">{service}</span>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-gray-500 text-sm mb-3">GREETING</h3>
                <p className="text-gray-600 italic">"{greeting}"</p>
              </div>

              <div className="card p-6 bg-primary/5 border-primary/20">
                <h3 className="font-semibold text-gray-500 text-sm mb-3">TRIAL DETAILS</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold capitalize">{selectedPlan} Plan</p>
                    <p className="text-gray-600">7 days free, then billed monthly</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {selectedPlan === 'starter' && '$297'}
                      {selectedPlan === 'growth' && '$597'}
                      {selectedPlan === 'scale' && '$1,497'}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className={`btn btn-ghost ${step === 1 ? 'invisible' : ''}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn btn-primary"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="btn btn-primary btn-lg"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start Free Trial
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <OnboardingForm />
    </Suspense>
  )
}
