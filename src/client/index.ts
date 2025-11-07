import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { api } from "../component/_generated/api.js";
import type { UseApi, RunMutationCtx, RunQueryCtx, ActionCtx } from "./types.js";

export type StripeComponent = UseApi<typeof api>;

/**
 * Stripe Component Client
 *
 * Provides methods for managing Stripe customers, subscriptions, payments,
 * and webhooks through Convex.
 */
export class Stripe {
  constructor(
    public component: StripeComponent,
    public options?: {
      /**
       * Stripe webhook secret for signature verification.
       * Defaults to process.env.STRIPE_WEBHOOK_SECRET
       * Note: Not currently used by client methods, but kept for future webhook verification features.
       */
      STRIPE_WEBHOOK_SECRET?: string;
    }
  ) {}

  // ============================================================================
  // CUSTOMER METHODS
  // ============================================================================

  /**
   * Get a customer by their Stripe customer ID.
   */
  async getCustomer(ctx: RunQueryCtx, stripeCustomerId: string) {
    return ctx.runQuery(this.component.public.getCustomer, {
      stripeCustomerId,
    });
  }

  /**
   * Create or update a customer with metadata.
   */
  async createOrUpdateCustomer(
    ctx: RunMutationCtx,
    args: {
      stripeCustomerId: string;
      email?: string;
      name?: string;
      metadata?: any;
    }
  ) {
    return ctx.runMutation(this.component.public.createOrUpdateCustomer, {
      stripeCustomerId: args.stripeCustomerId,
      email: args.email,
      name: args.name,
      metadata: args.metadata,
    });
  }

  // ============================================================================
  // SUBSCRIPTION METHODS
  // ============================================================================

  /**
   * Get a subscription by its Stripe subscription ID.
   */
  async getSubscription(ctx: RunQueryCtx, stripeSubscriptionId: string) {
    return ctx.runQuery(this.component.public.getSubscription, {
      stripeSubscriptionId,
    });
  }

  /**
   * List all subscriptions for a customer.
   */
  async listSubscriptions(ctx: RunQueryCtx, stripeCustomerId: string) {
    return ctx.runQuery(this.component.public.listSubscriptions, {
      stripeCustomerId,
    });
  }

  /**
   * Get a subscription by organization ID.
   * Returns the first subscription found with the given orgId.
   */
  async getSubscriptionByOrgId(ctx: RunQueryCtx, orgId: string) {
    return ctx.runQuery(this.component.public.getSubscriptionByOrgId, {
      orgId,
    });
  }

  /**
   * List all subscriptions for a user ID.
   */
  async listSubscriptionsByUserId(ctx: RunQueryCtx, userId: string) {
    return ctx.runQuery(this.component.public.listSubscriptionsByUserId, {
      userId,
    });
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  /**
   * Get a payment by its Stripe payment intent ID.
   */
  async getPayment(ctx: RunQueryCtx, stripePaymentIntentId: string) {
    return ctx.runQuery(this.component.public.getPayment, {
      stripePaymentIntentId,
    });
  }

  /**
   * List all payments for a customer.
   */
  async listPayments(ctx: RunQueryCtx, stripeCustomerId: string) {
    return ctx.runQuery(this.component.public.listPayments, {
      stripeCustomerId,
    });
  }

  /**
   * List all payments for a user ID.
   */
  async listPaymentsByUserId(ctx: RunQueryCtx, userId: string) {
    return ctx.runQuery(this.component.public.listPaymentsByUserId, {
      userId,
    });
  }

  /**
   * List all payments for an organization ID.
   */
  async listPaymentsByOrgId(ctx: RunQueryCtx, orgId: string) {
    return ctx.runQuery(this.component.public.listPaymentsByOrgId, {
      orgId,
    });
  }

  /**
   * Update payment customer ID.
   * This is useful for linking a payment to a customer after checkout completion.
   */
  async updatePaymentCustomer(
    ctx: RunMutationCtx,
    args: {
      stripePaymentIntentId: string;
      stripeCustomerId: string;
    }
  ) {
    return ctx.runMutation(this.component.public.updatePaymentCustomer, {
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeCustomerId: args.stripeCustomerId,
    });
  }

  /**
   * Update subscription quantity (for seat-based pricing).
   * This will update both Stripe and the local database.
   */
  async updateSubscriptionQuantity(
    ctx: ActionCtx,
    args: {
      stripeSubscriptionId: string;
      quantity: number;
    }
  ) {
    return ctx.runAction(this.component.public.updateSubscriptionQuantity, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      quantity: args.quantity,
    });
  }

  /**
   * Update subscription metadata for custom lookups (e.g., orgId, userId).
   * Metadata is stored locally and can be used to find subscriptions.
   * You can provide orgId and userId for efficient indexed lookups.
   */
  async updateSubscriptionMetadata(
    ctx: RunMutationCtx,
    args: {
      stripeSubscriptionId: string;
      metadata: any;
      orgId?: string;
      userId?: string;
    }
  ) {
    return ctx.runMutation(this.component.public.updateSubscriptionMetadata, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      metadata: args.metadata,
      orgId: args.orgId,
      userId: args.userId,
    });
  }

  /**
   * Cancel a subscription either immediately or at period end.
   */
  async cancelSubscription(
    ctx: ActionCtx,
    args: {
      stripeSubscriptionId: string;
      cancelAtPeriodEnd?: boolean;
    }
  ) {
    return ctx.runAction(this.component.public.cancelSubscription, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? true,
    });
  }

  // ============================================================================
  // CHECKOUT & PAYMENTS
  // ============================================================================

  /**
   * Create a Stripe Checkout session for one-time payments or subscriptions.
   */
  async createCheckoutSession(
    ctx: ActionCtx,
    args: {
      priceId: string;
      customerId?: string;
      mode: "payment" | "subscription" | "setup";
      successUrl: string;
      cancelUrl: string;
      metadata?: any;
    }
  ) {
    return ctx.runAction(this.component.public.createCheckoutSession, {
      priceId: args.priceId,
      customerId: args.customerId,
      mode: args.mode,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      metadata: args.metadata,
    });
  }

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   */
  async createCustomerPortalSession(
    ctx: ActionCtx,
    args: {
      customerId: string;
      returnUrl: string;
    }
  ) {
    return ctx.runAction(this.component.public.createCustomerPortalSession, {
      customerId: args.customerId,
      returnUrl: args.returnUrl,
    });
  }

  // ============================================================================
  // INVOICES
  // ============================================================================

  /**
   * List invoices for a customer.
   */
  async listInvoices(ctx: RunQueryCtx, stripeCustomerId: string) {
    return ctx.runQuery(this.component.public.listInvoices, {
      stripeCustomerId,
    });
  }

  // ============================================================================
  // API RE-EXPORT HELPERS
  // ============================================================================

  /**
   * For easy re-exporting of common operations.
   * Apps can do:
   * ```ts
   * export const { getCustomer, getSubscription } = stripe.api();
   * ```
   */
  api() {
    return {
      getCustomer: queryGeneric({
        args: { stripeCustomerId: v.string() },
        handler: async (ctx, args) => {
          return await this.getCustomer(ctx, args.stripeCustomerId);
        },
      }),
      getSubscription: queryGeneric({
        args: { stripeSubscriptionId: v.string() },
        handler: async (ctx, args) => {
          return await this.getSubscription(ctx, args.stripeSubscriptionId);
        },
      }),
      listSubscriptions: queryGeneric({
        args: { stripeCustomerId: v.string() },
        handler: async (ctx, args) => {
          return await this.listSubscriptions(ctx, args.stripeCustomerId);
        },
      }),
      getSubscriptionByOrgId: queryGeneric({
        args: { orgId: v.string() },
        handler: async (ctx, args) => {
          return await this.getSubscriptionByOrgId(ctx, args.orgId);
        },
      }),
      listSubscriptionsByUserId: queryGeneric({
        args: { userId: v.string() },
        handler: async (ctx, args) => {
          return await this.listSubscriptionsByUserId(ctx, args.userId);
        },
      }),
      getPayment: queryGeneric({
        args: { stripePaymentIntentId: v.string() },
        handler: async (ctx, args) => {
          return await this.getPayment(ctx, args.stripePaymentIntentId);
        },
      }),
      listPayments: queryGeneric({
        args: { stripeCustomerId: v.string() },
        handler: async (ctx, args) => {
          return await this.listPayments(ctx, args.stripeCustomerId);
        },
      }),
      listPaymentsByUserId: queryGeneric({
        args: { userId: v.string() },
        handler: async (ctx, args) => {
          return await this.listPaymentsByUserId(ctx, args.userId);
        },
      }),
      listPaymentsByOrgId: queryGeneric({
        args: { orgId: v.string() },
        handler: async (ctx, args) => {
          return await this.listPaymentsByOrgId(ctx, args.orgId);
        },
      }),
      listInvoices: queryGeneric({
        args: { stripeCustomerId: v.string() },
        handler: async (ctx, args) => {
          return await this.listInvoices(ctx, args.stripeCustomerId);
        },
      }),
      createOrUpdateCustomer: mutationGeneric({
        args: {
          stripeCustomerId: v.string(),
          email: v.optional(v.string()),
          name: v.optional(v.string()),
          metadata: v.optional(v.any()),
        },
        handler: async (ctx, args) => {
          return await this.createOrUpdateCustomer(ctx, args);
        },
      }),
      updateSubscriptionMetadata: mutationGeneric({
        args: {
          stripeSubscriptionId: v.string(),
          metadata: v.any(),
          orgId: v.optional(v.string()),
          userId: v.optional(v.string()),
        },
        handler: async (ctx, args) => {
          return await this.updateSubscriptionMetadata(ctx, args);
        },
      }),
      updatePaymentCustomer: mutationGeneric({
        args: {
          stripePaymentIntentId: v.string(),
          stripeCustomerId: v.string(),
        },
        handler: async (ctx, args) => {
          return await this.updatePaymentCustomer(ctx, args);
        },
      }),
    };
  }
}

export default Stripe;
