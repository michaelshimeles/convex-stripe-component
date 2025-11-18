# Convex Stripe Component

[![npm version](https://badge.fury.io/js/@micky%2Fconvex-stripe-component.svg)](https://badge.fury.io/js/@micky%2Fconvex-stripe-component)

<!-- START: Include on https://convex.dev/components -->

A production-ready Stripe component for Convex that handles payments, subscriptions, and webhook synchronization automatically.

**Key Features:**
- 🎯 One-time payments and recurring subscriptions
- 💰 Automatic payment tracking with indexed lookups
- 👥 Seat-based pricing with automatic quantity sync
- 🔗 Indexed lookups by orgId or userId for fast queries
- 🗂️ Custom metadata for additional flexible data storage
- 🪝 Automatic webhook handling and database sync
- 💳 Customer portal integration
- 📊 Invoice tracking

**Quick Example:**

```typescript
// convex/stripe.ts
import { Stripe } from "@micky/convex-stripe-component";
import { components } from "./_generated/api";

export const stripe = new Stripe(components.stripe);

// convex/payments.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { stripe } from "./stripe";

// Create a subscription checkout
export const createSubscription = action({
  args: { priceId: v.string(), orgId: v.string() },
  handler: async (ctx, args) => {
    const session = await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      mode: "subscription",
      successUrl: "http://localhost:5173/success",
      cancelUrl: "http://localhost:5173/",
      metadata: { orgId: args.orgId }, // Custom lookup
    });
    return session.url;
  },
});

// Update seats when your team grows
export const updateSeats = action({
  args: { subscriptionId: v.string(), quantity: v.number() },
  handler: async (ctx, args) => {
    await stripe.updateSubscriptionQuantity(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      quantity: args.quantity,
    });
  },
});
```

## Pre-requisite: Convex

You'll need an existing Convex project to use the component.
Convex is a hosted backend platform, including a database, serverless functions,
and a ton more you can learn about [here](https://docs.convex.dev/get-started).

Run `npm create convex` or follow any of the [quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```sh
npm install @micky/convex-stripe-component
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import stripe from "@micky/convex-stripe-component/convex.config";

const app = defineApp();
app.use(stripe);

export default app;
```

## Configuration

### 1. Set up Stripe API credentials

Set your Stripe secret key and webhook secret as environment variables:

```bash
npx convex env set STRIPE_SECRET_KEY=sk_test_...
npx convex env set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Instantiate the Stripe client

Create a file in your `convex/` folder to initialize the Stripe client:

```ts
// convex/stripe.ts
import { Stripe } from "@micky/convex-stripe-component";
import { components } from "./_generated/api";

export const stripe = new Stripe(components.stripe, {
  // Optional: You can explicitly pass secrets here, or set them as env variables
  // STRIPE_WEBHOOK_SECRET: "..."
});
```

The `STRIPE_SECRET_KEY` environment variable is automatically read by the component's actions for secure server-side operations. The `STRIPE_WEBHOOK_SECRET` is used in your webhook handler to verify signatures. It defaults to `process.env.STRIPE_WEBHOOK_SECRET` but can be overridden in the constructor options.

> **🔒 Security Note**: The component's actions (like `createCheckoutSession`, `cancelSubscription`, etc.) automatically read the Stripe API key from server-side environment variables. This means your secret key is never exposed to the client and cannot be intercepted. All Stripe API calls happen securely in the Convex backend.

### 3. Set up webhook endpoint

Register webhooks in your app's `convex/http.ts` using the `registerRoutes()` method:

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { stripe } from "./stripe";

const http = httpRouter();

stripe.registerRoutes(http);

export default http;
```

The component automatically handles webhook signature verification and database syncing for all Stripe events.

#### Optional: Custom event handlers

You can run custom logic after the default event handling:

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { stripe } from "./stripe";

const http = httpRouter();

stripe.registerRoutes(http, {
  // Optional: Configure the webhook path (defaults to /stripe/webhook)
  webhookPath: "/stripe/webhook",
  
  // Optional: Handle specific events with custom logic
  events: {
    "customer.subscription.updated": async (ctx, event) => {
      // Your custom logic runs after the component syncs to the database
      const subscription = event.data.object;
      console.log("Subscription updated:", subscription.id);
      
      // You can call other mutations here
      // await ctx.runMutation(...);
    },
    "payment_intent.succeeded": async (ctx, event) => {
      // Handle one-time payment success
      const paymentIntent = event.data.object;
      console.log("Payment succeeded:", paymentIntent.id);
    },
  },
});

export default http;
```

> **Note**: The component handles all database syncing automatically. Your custom handlers run *after* the default processing, so the data is already in your database when your handler executes.

### 4. Configure webhooks in Stripe

1. In your [Stripe Dashboard](https://dashboard.stripe.com/webhooks), add a webhook endpoint
2. Set the URL to: `https://your-convex-deployment.convex.site/stripe/webhook`
3. Select the following events:
   - `customer.created`
   - `customer.updated`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `payment_intent.succeeded` (for one-time payments)
   - `invoice.created`
   - `invoice.finalized`
   - `invoice.paid`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copy the webhook signing secret and set it as `STRIPE_WEBHOOK_SECRET`

## Usage

### Integrating with Authentication

The Stripe component doesn't have direct access to `ctx.auth`, so you link users to Stripe customers via metadata:

```ts
import { action, mutation, query } from "./_generated/server";
import { stripe } from "./stripe";
import { v } from "convex/values";

// Create a checkout session linked to the authenticated user
export const createSubscriptionCheckout = action({
  args: { priceId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const session = await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      mode: "subscription",
      successUrl: "http://localhost:5173/",
      cancelUrl: "http://localhost:5173/",
      metadata: {
        userId: identity.subject,      // Link to Convex user
        email: identity.email,
      },
    });
    
    return session.url;
  },
});

// Get the current user's subscriptions using indexed lookup
export const getMySubscriptions = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    // Use indexed query for efficient lookup
    return await stripe.listSubscriptionsByUserId(ctx, identity.subject);
  },
});

// Link subscription to user after creation (called from webhook or UI)
export const linkSubscription = mutation({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    await stripe.updateSubscriptionMetadata(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      metadata: {
        userId: identity.subject,
        email: identity.email,
      },
    });
  },
});
```

### Creating Checkout Sessions

#### Subscription Checkout

```ts
import { action } from "./_generated/server";
import { stripe } from "./stripe";

export const createSubscription = action({
  args: { priceId: v.string() },
  handler: async (ctx, args) => {
    const session = await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      mode: "subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      metadata: {
        userId: "user_123",
        orgId: "org_456",
      },
    });
    
    return session.url;
  },
});
```

#### One-Time Payment

```ts
export const createPayment = action({
  args: { priceId: v.string() },
  handler: async (ctx, args) => {
    const session = await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      mode: "payment",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      metadata: {
        userId: "user_123",  // Track which user made the payment
        orgId: "org_456",    // Or which org
      },
    });
    
    return session.url;
  },
});
```

**Payments are automatically tracked!** When a payment succeeds, the `payment_intent.succeeded` webhook stores it in the database with indexed lookup fields.

### Querying Payments

```ts
import { query } from "./_generated/server";
import { stripe } from "./stripe";

// Get a specific payment
export const getPaymentDetails = query({
  args: { paymentIntentId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.getPayment(ctx, args.paymentIntentId);
  },
});

// List all payments for a customer
export const getCustomerPayments = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.listPayments(ctx, args.customerId);
  },
});

// List payments by user (using indexed lookup)
export const getUserPayments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.listPaymentsByUserId(ctx, args.userId);
  },
});

// List payments by organization (using indexed lookup)
export const getOrgPayments = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.listPaymentsByOrgId(ctx, args.orgId);
  },
});
```

### Seat-Based Pricing

The component supports seat-based pricing where your app manages seat counts and the component syncs with Stripe.

```ts
import { mutation, action } from "./_generated/server";
import { stripe } from "./stripe";

// When a user joins an organization
export const addTeamMember = mutation({
  args: { orgId: v.id("orgs"), userId: v.id("users") },
  handler: async (ctx, args) => {
    // Add member to your database
    await ctx.db.insert("orgMembers", {
      orgId: args.orgId,
      userId: args.userId,
    });
    
    // Count total members
    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    
    // Schedule seat update
    await ctx.scheduler.runAfter(0, internal.updateOrgSeats, {
      orgId: args.orgId,
      seatCount: members.length,
    });
  },
});

// Internal action to sync seats with Stripe
export const updateOrgSeats = internalAction({
  args: { orgId: v.id("orgs"), seatCount: v.number() },
  handler: async (ctx, args) => {
    // Get the org's subscription ID (you'd store this when they subscribe)
    const org = await ctx.runQuery(internal.getOrg, { orgId: args.orgId });
    
    if (org.stripeSubscriptionId) {
      await stripe.updateSubscriptionQuantity(ctx, {
        stripeSubscriptionId: org.stripeSubscriptionId,
        quantity: args.seatCount,
      });
    }
  },
});
```

### Custom Metadata Lookups

The component provides **indexed lookup fields** for fast queries by `orgId` or `userId`. These are stored as top-level fields with database indexes for efficient querying:

```ts
import { mutation, query } from "./_generated/server";
import { stripe } from "./stripe";

// After subscription is created (from webhook), link it to your org
export const linkSubscriptionToOrg = mutation({
  args: {
    subscriptionId: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    await stripe.updateSubscriptionMetadata(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      orgId: args.orgId,  // Indexed field for fast lookup
      userId: "user_123", // Optional: also link to a user
      metadata: {
        // Store any additional custom data here
        plan: "pro",
        features: ["feature1", "feature2"],
      },
    });
  },
});

// Efficiently query by orgId using the indexed field
export const getOrgSubscription = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    // Fast indexed lookup - no need to search metadata!
    return await stripe.getSubscriptionByOrgId(ctx, args.orgId);
  },
});

// List all subscriptions for a specific user
export const getUserSubscriptions = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.listSubscriptionsByUserId(ctx, args.userId);
  },
});

// Payments also support indexed lookups by orgId and userId
export const getOrgPayments = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.listPaymentsByOrgId(ctx, args.orgId);
  },
});
```

**How it works:**
- `orgId` and `userId` are stored as top-level fields with database indexes for both subscriptions and payments
- The webhook handlers automatically extract these from `metadata.orgId` and `metadata.userId` when syncing from Stripe
- You can query subscriptions efficiently using `getSubscriptionByOrgId()` or `listSubscriptionsByUserId()`
- You can query payments efficiently using `listPaymentsByOrgId()` or `listPaymentsByUserId()`
- Additional custom data can still be stored in the `metadata` field

### Customer Portal

Generate a link to the Stripe Customer Portal where users can manage their subscriptions:

```ts
export const getPortalLink = action({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const portal = await stripe.createCustomerPortalSession(ctx, {
      customerId: args.customerId,
      returnUrl: "https://example.com/account",
    });
    
    return portal.url;
  },
});
```

### Canceling Subscriptions

```ts
export const cancelSubscription = action({
  args: {
    subscriptionId: v.string(),
    immediately: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await stripe.cancelSubscription(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      cancelAtPeriodEnd: !args.immediately, // default: cancel at period end
    });
  },
});
```

### Querying Data

```ts
import { query } from "./_generated/server";
import { stripe } from "./stripe";

export const getCustomerData = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const customer = await stripe.getCustomer(ctx, args.customerId);
    const subscriptions = await stripe.listSubscriptions(ctx, args.customerId);
    const invoices = await stripe.listInvoices(ctx, args.customerId);
    
    return {
      customer,
      subscriptions,
      invoices,
    };
  },
});
```

## API Reference

### Stripe Client Methods

#### Customer Methods
- `getCustomer(ctx, stripeCustomerId)` - Get customer by Stripe ID
- `createOrUpdateCustomer(ctx, { stripeCustomerId, email, name, metadata })` - Create or update customer

#### Subscription Methods
- `getSubscription(ctx, stripeSubscriptionId)` - Get subscription by ID
- `listSubscriptions(ctx, stripeCustomerId)` - List all subscriptions for a customer
- `getSubscriptionByOrgId(ctx, orgId)` - Get subscription by organization ID (indexed lookup)
- `listSubscriptionsByUserId(ctx, userId)` - List all subscriptions for a user ID (indexed lookup)
- `updateSubscriptionQuantity(ctx, { stripeSubscriptionId, quantity })` - Update seat count
- `updateSubscriptionMetadata(ctx, { stripeSubscriptionId, metadata, orgId?, userId? })` - Update custom metadata and lookup fields
- `cancelSubscription(ctx, { stripeSubscriptionId, cancelAtPeriodEnd })` - Cancel subscription

#### Checkout & Payments
- `createCheckoutSession(ctx, { priceId, mode, successUrl, cancelUrl, customerId?, metadata? })` - Create checkout session
- `createCustomerPortalSession(ctx, { customerId, returnUrl })` - Generate portal URL

#### Payment Methods
- `getPayment(ctx, stripePaymentIntentId)` - Get payment by payment intent ID
- `listPayments(ctx, stripeCustomerId)` - List all payments for a customer
- `listPaymentsByUserId(ctx, userId)` - List all payments for a user ID (indexed lookup)
- `listPaymentsByOrgId(ctx, orgId)` - List all payments for an organization ID (indexed lookup)
- `updatePaymentCustomer(ctx, { stripePaymentIntentId, stripeCustomerId })` - Update payment customer ID

#### Invoices
- `listInvoices(ctx, stripeCustomerId)` - List invoices for a customer

## How It Works

1. **Webhook Setup**: Your app's `convex/http.ts` receives Stripe webhooks at `/stripe/webhook`
2. **Event Routing**: The webhook handler calls component mutations to process events
3. **Database Sync**: The component automatically updates its internal tables with the latest Stripe data
4. **Local Queries**: Your app can query subscription status, customer info, etc. directly from Convex without calling Stripe APIs
5. **Stripe Updates**: When you call methods like `updateSubscriptionQuantity`, the component updates both Stripe and the local database

## Database Tables

The component maintains these tables:
- `customers` - Stripe customer data with indexed lookups
- `subscriptions` - Subscription status, quantity, metadata with orgId/userId indexes
- `payments` - One-time payment tracking with orgId/userId indexes
- `checkout_sessions` - Checkout session tracking
- `invoices` - Invoice history

All tables are kept in sync via webhooks.

## Example Usage

See complete examples in [example/convex/example.ts](./example/convex/example.ts).

<!-- END: Include on https://convex.dev/components -->

## Development

Run the example app:

```sh
npm i
npm run dev
```

This will start:
- Backend dev server with live component sources
- Frontend dev server
- File watcher to rebuild on changes

## Testing

```sh
npm test
```

## Publishing

```sh
# Alpha release
npm run alpha

# Production release
npm run release
```

## License

Apache-2.0
