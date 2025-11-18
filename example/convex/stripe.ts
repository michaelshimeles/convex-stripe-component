/**
 * ⚠️ EXAMPLE CODE - NOT FOR PRODUCTION USE ⚠️
 * 
 * This file contains example implementations of Stripe integration functions.
 * These functions are provided for demonstration purposes only.
 * 
 * SECURITY WARNING:
 * - These functions do NOT include authentication or authorization checks
 * - They expose sensitive data (customers, subscriptions, payments) publicly
 * - Anyone can call these functions and access/modify Stripe data
 * 
 * BEFORE USING IN PRODUCTION:
 * 1. Add authentication checks using `ctx.auth.getUserIdentity()`
 * 2. Add authorization checks to verify users can only access their own data
 * 3. Remove or restrict `getLiveData` (exposes all data)
 * 4. Verify ownership before allowing modifications (cancel, update, etc.)
 * 
 * See README.md "Integrating with Authentication" section for examples.
 */

import { action, mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { Stripe } from "@micky/convex-stripe-component";
import { v } from "convex/values";

export const stripe = new Stripe(components.stripe , {
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
});

// ============================================================================
// LIVE DATABASE VIEWER QUERIES
// ============================================================================

/**
 * ⚠️ SECURITY WARNING: This function exposes ALL customer, subscription,
 * payment, and invoice data without any authentication or authorization.
 * DO NOT use this in production without proper access controls.
 */
export const getLiveData = query({
  handler: async (ctx) => {
    // Get all data from the Stripe component
    const data = await ctx.runQuery(stripe.component.public.getAllData, {});

    return {
      customers: data.customers,
      subscriptions: data.subscriptions,
      checkoutSessions: data.checkoutSessions,
      payments: data.payments,
      invoices: data.invoices,
      stats: {
        totalCustomers: data.customers.length,
        totalSubscriptions: data.subscriptions.length,
        activeSubscriptions: data.subscriptions.filter((s: any) => s.status === "active").length,
        totalInvoices: data.invoices.length,
        paidInvoices: data.invoices.filter((i: any) => i.status === "paid").length,
      },
    };
  },
});

// ============================================================================
// EXAMPLE: Creating a checkout session for a subscription
// ============================================================================

/**
 * Create a checkout session for a subscription.
 * This would typically be called from your app when a user clicks "Subscribe".
 * 
 * ⚠️ SECURITY: Add authentication check before using in production:
 * ```ts
 * const identity = await ctx.auth.getUserIdentity();
 * if (!identity) throw new Error("Not authenticated");
 * ```
 */
export const createSubscriptionCheckout = action({
  args: {
    priceId: v.string(),
    customerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      customerId: args.customerId,
      mode: "subscription",
      successUrl: "http://localhost:5173/",
      cancelUrl: "http://localhost:5173/",
      metadata: {
        // You can add custom metadata here to identify the subscription later
        userId: "user_123",
        orgId: "org_456",
      },
    });
  },
});

// ============================================================================
// EXAMPLE: Creating a checkout session for a one-time payment
// ============================================================================

/**
 * ⚠️ SECURITY: Add authentication check before using in production:
 * ```ts
 * const identity = await ctx.auth.getUserIdentity();
 * if (!identity) throw new Error("Not authenticated");
 * ```
 */
export const createPaymentCheckout = action({
  args: {
    priceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      mode: "payment",
      successUrl: "http://localhost:5173/",
      cancelUrl: "http://localhost:5173/",
    });
  },
});

// ============================================================================
// EXAMPLE: Seat-based pricing - updating subscription quantity
// ============================================================================

/**
 * Update the seat count for a subscription.
 * Call this when users are added/removed from an organization.
 * 
 * ⚠️ SECURITY: Add authentication and authorization checks before using in production.
 * Verify the user has permission to modify this subscription.
 */
export const updateSeats = action({
  args: {
    subscriptionId: v.string(),
    seatCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Update the quantity in Stripe and sync to our database
    await stripe.updateSubscriptionQuantity(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      quantity: args.seatCount,
    });
  },
});

// ============================================================================
// EXAMPLE: Using metadata for custom lookups
// ============================================================================

/**
 * After a subscription is created (via webhook), link it to your org.
 * 
 * ⚠️ SECURITY: Add authentication check before using in production.
 * Verify the user has permission to link subscriptions to this org.
 */
export const linkSubscriptionToOrg = mutation({
  args: {
    subscriptionId: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Store orgId and userId as indexed fields for fast lookups
    await stripe.updateSubscriptionMetadata(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      orgId: args.orgId,      // Separate parameter for indexed lookup
      userId: args.userId,     // Separate parameter for indexed lookup
      metadata: {
        // Additional custom data can go here if needed
        linkedAt: new Date().toISOString(),
      },
    });
  },
});

// ============================================================================
// EXAMPLE: Getting subscription information
// ============================================================================

/**
 * ⚠️ SECURITY: Add authorization check before using in production.
 * Verify the user has permission to view this subscription.
 */
export const getSubscriptionInfo = query({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await stripe.getSubscription(ctx, args.subscriptionId);
  },
});

// ============================================================================
// EXAMPLE: Canceling a subscription
// ============================================================================

/**
 * ⚠️ SECURITY: Add authentication and authorization checks before using in production.
 * Verify the user owns this subscription before allowing cancellation.
 */
export const cancelSubscription = action({
  args: {
    subscriptionId: v.string(),
    immediately: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await stripe.cancelSubscription(ctx, {
      stripeSubscriptionId: args.subscriptionId,
      cancelAtPeriodEnd: !args.immediately,
    });
  },
});

// ============================================================================
// EXAMPLE: Customer portal
// ============================================================================

/**
 * Generate a link to the Stripe Customer Portal where users can
 * manage their subscriptions, update payment methods, etc.
 * 
 * ⚠️ SECURITY: Add authorization check before using in production.
 * Verify the user owns this customer ID.
 */
export const getCustomerPortalUrl = action({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await stripe.createCustomerPortalSession(ctx, {
      customerId: args.customerId,
      returnUrl: "https://example.com/account",
    });
  },
});

// ============================================================================
// EXAMPLE: Getting customer subscriptions and invoices
// ============================================================================

/**
 * ⚠️ SECURITY: Add authorization check before using in production.
 * Verify the user has permission to view this customer's data.
 */
export const getCustomerData = query({
  args: {
    customerId: v.string(),
  },
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

// ============================================================================
// Direct re-export of component's API (optional pattern)
// ============================================================================

/**
 * ⚠️ SECURITY WARNING: These are direct re-exports of the component's public API.
 * They do NOT include authentication or authorization checks.
 * Wrap these functions with your own authenticated functions in production.
 */
export const {
  getCustomer,
  getSubscription,
  listSubscriptions,
  listInvoices,
  createOrUpdateCustomer,
  updateSubscriptionMetadata,
} = stripe.api();
