import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          const orgId = subscription.metadata.organization_id
          const planName = subscription.metadata.plan_name

          if (orgId) {
            // Get plan ID
            const { data: plan } = await supabase
              .from('plans')
              .select('id')
              .eq('name', planName)
              .single()

            // Update organization
            await supabase
              .from('organizations')
              .update({
                plan_id: plan?.id,
                subscription_status: 'active',
                stripe_subscription_id: subscription.id,
                trial_ends_at: null,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                minutes_used: 0, // Reset usage on new subscription
              })
              .eq('id', orgId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata.organization_id

        if (orgId) {
          const status = subscription.status === 'active' ? 'active' :
                        subscription.status === 'past_due' ? 'past_due' :
                        subscription.status === 'canceled' ? 'canceled' : 'active'

          await supabase
            .from('organizations')
            .update({
              subscription_status: status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata.organization_id

        if (orgId) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', orgId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          const orgId = subscription.metadata.organization_id

          if (orgId) {
            // Reset usage at the start of new billing period
            await supabase
              .from('organizations')
              .update({
                minutes_used: 0,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('id', orgId)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          const orgId = subscription.metadata.organization_id

          if (orgId) {
            await supabase
              .from('organizations')
              .update({ subscription_status: 'past_due' })
              .eq('id', orgId)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
