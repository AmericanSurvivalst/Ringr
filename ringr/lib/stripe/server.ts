import Stripe from 'stripe'

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Plan to Stripe Price ID mapping
export const PLAN_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  growth: process.env.STRIPE_PRICE_GROWTH!,
  scale: process.env.STRIPE_PRICE_SCALE!,
}

// Create or get Stripe customer
export async function getOrCreateStripeCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<string> {
  // Check if customer exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  })

  return customer.id
}

// Create checkout session for subscription
export async function createCheckoutSession({
  customerId,
  priceId,
  organizationId,
  successUrl,
  cancelUrl,
}: {
  customerId: string
  priceId: string
  organizationId: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        organization_id: organizationId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return session.url!
}

// Create billing portal session
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session.url
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId)
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId)
}

// Update subscription
export async function updateSubscription(
  subscriptionId: string,
  priceId: string
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
