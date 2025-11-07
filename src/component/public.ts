import { v } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server.js";
import { api } from "./_generated/api.js";
import Stripe from "stripe";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get a customer by their Stripe customer ID.
 */
export const getCustomer = query({
  args: { stripeCustomerId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("customers"),
      _creationTime: v.number(),
      stripeCustomerId: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();
    return customer;
  },
});

/**
 * Get a subscription by its Stripe subscription ID.
 */
export const getSubscription = query({
  args: { stripeSubscriptionId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
      stripeSubscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      quantity: v.optional(v.number()),
      priceId: v.string(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique();
    return subscription;
  },
});

/**
 * List all subscriptions for a customer.
 */
export const listSubscriptions = query({
  args: { stripeCustomerId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
      stripeSubscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      quantity: v.optional(v.number()),
      priceId: v.string(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .collect();
    return subscriptions;
  },
});

/**
 * Get a subscription by organization ID.
 * Useful for looking up subscriptions by custom orgId.
 */
export const getSubscriptionByOrgId = query({
  args: { orgId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
      stripeSubscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      quantity: v.optional(v.number()),
      priceId: v.string(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();
    return subscription;
  },
});

/**
 * List all subscriptions for a user ID.
 * Useful for looking up subscriptions by custom userId.
 */
export const listSubscriptionsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
      stripeSubscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      quantity: v.optional(v.number()),
      priceId: v.string(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return subscriptions;
  },
});

/**
 * Get a payment by its Stripe payment intent ID.
 */
export const getPayment = query({
  args: { stripePaymentIntentId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      stripePaymentIntentId: v.string(),
      stripeCustomerId: v.optional(v.string()),
      amount: v.number(),
      currency: v.string(),
      status: v.string(),
      created: v.number(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_stripe_payment_intent_id", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .unique();
    return payment;
  },
});

/**
 * List payments for a customer.
 */
export const listPayments = query({
  args: { stripeCustomerId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      stripePaymentIntentId: v.string(),
      stripeCustomerId: v.optional(v.string()),
      amount: v.number(),
      currency: v.string(),
      status: v.string(),
      created: v.number(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .collect();
    return payments;
  },
});

/**
 * List payments for a user ID.
 */
export const listPaymentsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      stripePaymentIntentId: v.string(),
      stripeCustomerId: v.optional(v.string()),
      amount: v.number(),
      currency: v.string(),
      status: v.string(),
      created: v.number(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return payments;
  },
});

/**
 * List payments for an organization ID.
 */
export const listPaymentsByOrgId = query({
  args: { orgId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      stripePaymentIntentId: v.string(),
      stripeCustomerId: v.optional(v.string()),
      amount: v.number(),
      currency: v.string(),
      status: v.string(),
      created: v.number(),
      metadata: v.optional(v.any()),
      orgId: v.optional(v.string()),
      userId: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
    return payments;
  },
});

/**
 * List invoices for a customer.
 */
export const listInvoices = query({
  args: { stripeCustomerId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("invoices"),
      _creationTime: v.number(),
      stripeInvoiceId: v.string(),
      stripeCustomerId: v.string(),
      stripeSubscriptionId: v.optional(v.string()),
      status: v.string(),
      amountDue: v.number(),
      amountPaid: v.number(),
      created: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .collect();
    return invoices;
  },
});

/**
 * Get all data for live database view (for demo/debugging).
 */
export const getAllData = query({
  args: {},
  returns: v.object({
    customers: v.array(v.any()),
    subscriptions: v.array(v.any()),
    checkoutSessions: v.array(v.any()),
    payments: v.array(v.any()),
    invoices: v.array(v.any()),
  }),
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const checkoutSessions = await ctx.db.query("checkout_sessions").collect();
    const payments = await ctx.db.query("payments").collect();
    const invoices = await ctx.db.query("invoices").collect();

    return {
      customers,
      subscriptions,
      checkoutSessions,
      payments,
      invoices,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Create or update a customer with metadata.
 */
export const createOrUpdateCustomer = mutation({
  args: {
    stripeCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        metadata: args.metadata,
      });
      return existing._id;
    } else {
      const customerId = await ctx.db.insert("customers", {
        stripeCustomerId: args.stripeCustomerId,
        email: args.email,
        name: args.name,
        metadata: args.metadata,
      });
      return customerId;
    }
  },
});

/**
 * Update subscription metadata for custom lookups.
 * You can provide orgId and userId for efficient indexed lookups,
 * and additional data in the metadata field.
 */
export const updateSubscriptionMetadata = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    metadata: v.any(),
    orgId: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique();

    if (!subscription) {
      throw new Error(
        `Subscription ${args.stripeSubscriptionId} not found in database`
      );
    }

    await ctx.db.patch(subscription._id, {
      metadata: args.metadata,
      orgId: args.orgId,
      userId: args.userId,
    });

    return null;
  },
});

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

/**
 * Create a Stripe Checkout session for one-time payments or subscriptions.
 */
export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    customerId: v.optional(v.string()),
    mode: v.union(
      v.literal("payment"),
      v.literal("subscription"),
      v.literal("setup")
    ),
    successUrl: v.string(),
    cancelUrl: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    const stripe = new Stripe(apiKey);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: args.mode,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: args.metadata || {},
    };

    if (args.customerId) {
      sessionParams.customer = args.customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});

/**
 * Create a Stripe Customer Portal session.
 */
export const createCustomerPortalSession = action({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    const stripe = new Stripe(apiKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });

    return {
      url: session.url,
    };
  },
});

/**
 * Update subscription quantity and sync to Stripe.
 */
export const updateSubscriptionQuantity = action({
  args: {
    stripeSubscriptionId: v.string(),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    const stripe = new Stripe(apiKey);

    // Get the subscription from Stripe to find the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(
      args.stripeSubscriptionId
    );

    if (!subscription.items.data[0]) {
      throw new Error("Subscription has no items");
    }

    // Update the subscription item quantity
    await stripe.subscriptionItems.update(subscription.items.data[0].id, {
      quantity: args.quantity,
    });

    // Update our local database (now a public mutation, can be called directly)
    await ctx.runMutation(api.public.updateSubscriptionQuantityInternal, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      quantity: args.quantity,
    });

    return null;
  },
});

/**
 * Cancel a subscription.
 */
export const cancelSubscription = action({
  args: {
    stripeSubscriptionId: v.string(),
    cancelAtPeriodEnd: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    const stripe = new Stripe(apiKey);

    if (args.cancelAtPeriodEnd) {
      await stripe.subscriptions.update(args.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(args.stripeSubscriptionId);
    }

    return null;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for webhooks and internal use)
// ============================================================================

export const updateSubscriptionQuantityInternal = mutation({
      args: {
        stripeSubscriptionId: v.string(),
        quantity: v.number(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription_id", (q) =>
            q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
          )
          .unique();

        if (subscription) {
          await ctx.db.patch(subscription._id, {
            quantity: args.quantity,
          });
        }

        return null;
      },
});

export const handleCustomerCreated = mutation({
      args: {
        stripeCustomerId: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        metadata: v.optional(v.any()),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const existing = await ctx.db
          .query("customers")
          .withIndex("by_stripe_customer_id", (q) =>
            q.eq("stripeCustomerId", args.stripeCustomerId)
          )
          .unique();

        if (!existing) {
          await ctx.db.insert("customers", {
            stripeCustomerId: args.stripeCustomerId,
            email: args.email,
            name: args.name,
            metadata: args.metadata || {},
          });
        }

        return null;
      },
});

export const handleCustomerUpdated = mutation({
      args: {
        stripeCustomerId: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        metadata: v.optional(v.any()),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const customer = await ctx.db
          .query("customers")
          .withIndex("by_stripe_customer_id", (q) =>
            q.eq("stripeCustomerId", args.stripeCustomerId)
          )
          .unique();

        if (customer) {
          await ctx.db.patch(customer._id, {
            email: args.email,
            name: args.name,
            metadata: args.metadata,
          });
        }

        return null;
      },
});

export const handleSubscriptionCreated = mutation({
      args: {
        stripeSubscriptionId: v.string(),
        stripeCustomerId: v.string(),
        status: v.string(),
        currentPeriodEnd: v.number(),
        cancelAtPeriodEnd: v.boolean(),
        quantity: v.optional(v.number()),
        priceId: v.string(),
        metadata: v.optional(v.any()),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription_id", (q) =>
            q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
          )
          .unique();

        if (!existing) {
          // Extract orgId and userId from metadata if present
          const metadata = args.metadata || {};
          const orgId = metadata.orgId as string | undefined;
          const userId = metadata.userId as string | undefined;

          await ctx.db.insert("subscriptions", {
            stripeSubscriptionId: args.stripeSubscriptionId,
            stripeCustomerId: args.stripeCustomerId,
            status: args.status,
            currentPeriodEnd: args.currentPeriodEnd,
            cancelAtPeriodEnd: args.cancelAtPeriodEnd,
            quantity: args.quantity,
            priceId: args.priceId,
            metadata: metadata,
            orgId: orgId,
            userId: userId,
          });
        }

        return null;
      },
});

export const handleSubscriptionUpdated = mutation({
      args: {
        stripeSubscriptionId: v.string(),
        status: v.string(),
        currentPeriodEnd: v.number(),
        cancelAtPeriodEnd: v.boolean(),
        quantity: v.optional(v.number()),
        metadata: v.optional(v.any()),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription_id", (q) =>
            q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
          )
          .unique();

        if (subscription) {
          // Extract orgId and userId from metadata if present
          const metadata = args.metadata || {};
          const orgId = metadata.orgId as string | undefined;
          const userId = metadata.userId as string | undefined;

          await ctx.db.patch(subscription._id, {
            status: args.status,
            currentPeriodEnd: args.currentPeriodEnd,
            cancelAtPeriodEnd: args.cancelAtPeriodEnd,
            quantity: args.quantity,
            // Only update metadata fields if provided
            ...(args.metadata !== undefined && { metadata }),
            ...(orgId !== undefined && { orgId }),
            ...(userId !== undefined && { userId }),
          });
        }

        return null;
      },
});

export const handleSubscriptionDeleted = mutation({
      args: {
        stripeSubscriptionId: v.string(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const subscription = await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription_id", (q) =>
            q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
          )
          .unique();

        if (subscription) {
          await ctx.db.patch(subscription._id, {
            status: "canceled",
          });
        }

        return null;
      },
});

export const handleCheckoutSessionCompleted = mutation({
      args: {
        stripeCheckoutSessionId: v.string(),
        stripeCustomerId: v.optional(v.string()),
        mode: v.string(),
        metadata: v.optional(v.any()),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const existing = await ctx.db
          .query("checkout_sessions")
          .withIndex("by_stripe_checkout_session_id", (q) =>
            q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, {
            status: "complete",
            stripeCustomerId: args.stripeCustomerId,
          });
        } else {
          await ctx.db.insert("checkout_sessions", {
            stripeCheckoutSessionId: args.stripeCheckoutSessionId,
            stripeCustomerId: args.stripeCustomerId,
            status: "complete",
            mode: args.mode,
            metadata: args.metadata || {},
          });
        }

        return null;
      },
});

export const handleInvoiceCreated = mutation({
      args: {
        stripeInvoiceId: v.string(),
        stripeCustomerId: v.string(),
        stripeSubscriptionId: v.optional(v.string()),
        status: v.string(),
        amountDue: v.number(),
        amountPaid: v.number(),
        created: v.number(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const existing = await ctx.db
          .query("invoices")
          .withIndex("by_stripe_invoice_id", (q) =>
            q.eq("stripeInvoiceId", args.stripeInvoiceId)
          )
          .unique();

        if (!existing) {
          await ctx.db.insert("invoices", {
            stripeInvoiceId: args.stripeInvoiceId,
            stripeCustomerId: args.stripeCustomerId,
            stripeSubscriptionId: args.stripeSubscriptionId,
            status: args.status,
            amountDue: args.amountDue,
            amountPaid: args.amountPaid,
            created: args.created,
          });
        }

        return null;
      },
});

export const handleInvoicePaid = mutation({
      args: {
        stripeInvoiceId: v.string(),
        amountPaid: v.number(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const invoice = await ctx.db
          .query("invoices")
          .withIndex("by_stripe_invoice_id", (q) =>
            q.eq("stripeInvoiceId", args.stripeInvoiceId)
          )
          .unique();

        if (invoice) {
          await ctx.db.patch(invoice._id, {
            status: "paid",
            amountPaid: args.amountPaid,
          });
        }

        return null;
      },
});

export const handleInvoicePaymentFailed = mutation({
      args: {
        stripeInvoiceId: v.string(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const invoice = await ctx.db
          .query("invoices")
          .withIndex("by_stripe_invoice_id", (q) =>
            q.eq("stripeInvoiceId", args.stripeInvoiceId)
          )
          .unique();

        if (invoice) {
          await ctx.db.patch(invoice._id, {
            status: "open",
          });
        }

        return null;
      },
});

export const handlePaymentIntentSucceeded = mutation({
      args: {
        stripePaymentIntentId: v.string(),
        stripeCustomerId: v.optional(v.string()),
        amount: v.number(),
        currency: v.string(),
        status: v.string(),
        created: v.number(),
        metadata: v.optional(v.any()),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const existing = await ctx.db
          .query("payments")
          .withIndex("by_stripe_payment_intent_id", (q) =>
            q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
          )
          .unique();

        if (!existing) {
          // Extract orgId and userId from metadata if present
          const metadata = args.metadata || {};
          const orgId = metadata.orgId as string | undefined;
          const userId = metadata.userId as string | undefined;

          await ctx.db.insert("payments", {
            stripePaymentIntentId: args.stripePaymentIntentId,
            stripeCustomerId: args.stripeCustomerId,
            amount: args.amount,
            currency: args.currency,
            status: args.status,
            created: args.created,
            metadata: metadata,
            orgId: orgId,
            userId: userId,
          });
        } else if (args.stripeCustomerId && !existing.stripeCustomerId) {
          // Update customer ID if it wasn't set initially (webhook timing issue)
          await ctx.db.patch(existing._id, {
            stripeCustomerId: args.stripeCustomerId,
          });
        }

        return null;
      },
});

export const updatePaymentCustomer = mutation({
      args: {
        stripePaymentIntentId: v.string(),
        stripeCustomerId: v.string(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const payment = await ctx.db
          .query("payments")
          .withIndex("by_stripe_payment_intent_id", (q) =>
            q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
          )
          .unique();

        if (payment && !payment.stripeCustomerId) {
          await ctx.db.patch(payment._id, {
            stripeCustomerId: args.stripeCustomerId,
          });
        }

        return null;
      },
});
