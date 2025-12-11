# Ringr

AI-powered phone answering for service businesses. Never miss another call.

## Features

- 🤖 AI answers calls 24/7
- 📅 Books appointments automatically
- 🎯 Qualifies leads
- 📊 Analytics dashboard
- 💳 Self-serve subscriptions with Stripe
- 🔄 7-day free trial, no card required

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres + Auth)
- **Payments**: Stripe
- **Voice AI**: Vapi (platform-agnostic, easy to swap)
- **Styling**: Tailwind CSS

## Pricing Tiers

| Plan | Price | Minutes |
|------|-------|---------|
| Starter | $297/mo | 500 |
| Growth | $597/mo | 1,500 |
| Scale | $1,497/mo | 5,000 |

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd ringr-app
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and keys

### 3. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create three products/prices for Starter, Growth, and Scale plans
3. Set up a webhook endpoint: `https://your-domain/api/webhooks/stripe`
4. Enable these webhook events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4. Set Up Vapi (Voice AI)

1. Sign up at [vapi.ai](https://vapi.ai)
2. Create an assistant
3. Set the webhook URL: `https://your-domain/api/webhooks/voice?provider=vapi`
4. Copy your API key and webhook secret

### 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in all the values in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
STRIPE_PRICE_SCALE=
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy

### Manual

```bash
npm run build
npm start
```

## Project Structure

```
ringr-app/
├── app/
│   ├── api/
│   │   ├── checkout/        # Stripe checkout
│   │   ├── portal/          # Stripe billing portal
│   │   └── webhooks/
│   │       ├── stripe/      # Stripe webhooks
│   │       └── voice/       # Voice provider webhooks
│   ├── (dashboard)/         # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx     # Overview
│   │       ├── calls/       # Call history
│   │       ├── appointments/# Booked jobs
│   │       ├── analytics/   # Performance metrics
│   │       ├── agent/       # AI configuration
│   │       ├── billing/     # Subscription management
│   │       └── settings/    # Account settings
│   ├── auth/                # Login/signup
│   └── onboarding/          # New user onboarding
├── components/
│   └── dashboard/           # Dashboard components
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── stripe/              # Stripe utilities
│   ├── voice-providers/     # Voice AI adapters
│   └── utils.ts             # Helper functions
└── supabase/
    └── migrations/          # Database schema
```

## User Flow

1. **Sign Up** → Create account with email/password
2. **Onboarding** → Business name, industry, services, greeting
3. **Trial Starts** → 7 days free, plan selected
4. **Dashboard** → View calls, appointments, analytics
5. **Trial Ends** → Must subscribe to continue
6. **Subscribe** → Stripe checkout, plan activates
7. **Minutes Used** → Track usage, upgrade prompts
8. **Locked** → If trial expires or minutes exhausted

## Database Schema

Key tables:

- `organizations` - Business accounts with subscription info
- `users` - Dashboard users linked to organizations
- `plans` - Pricing tiers with features
- `agents` - AI voice agents per organization
- `calls` - Call records with outcomes
- `transcripts` - Full conversation logs
- `appointments` - Booked jobs
- `call_analytics` - Daily aggregates

## Adding Voice Providers

The app uses a platform-agnostic adapter pattern. To add a new voice provider:

1. Create adapter in `lib/voice-providers/`
2. Implement `VoiceProviderAdapter` interface
3. Register in `lib/voice-providers/index.ts`

See `lib/voice-providers/vapi.ts` for example.

## License

Proprietary - All rights reserved
