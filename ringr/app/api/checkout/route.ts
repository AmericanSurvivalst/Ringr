import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { stripe, getOrCreateStripeCustomer, PLAN_PRICE_IDS } from '@/lib/stripe/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId } = await request.json()

    if (!planId || !PLAN_PRICE_IDS[planId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get user with organization
    const { data: userData } = await supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single()

    const org = Array.isArray(userData?.organization) 
      ? userData?.organization[0] 
      : userData?.organization

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id

    if (!customerId) {
      customerId = await getOrCreateStripeCustomer(
        user.email!,
        org.name,
        { organization_id: org.id }
      )

      // Save customer ID to org
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLAN_PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          organization_id: org.id,
          plan_name: planId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
