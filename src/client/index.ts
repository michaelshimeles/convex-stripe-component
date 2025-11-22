import {
  mutationGeneric,
  queryGeneric,
  httpActionGeneric,
} from "convex/server";
import { v } from "convex/values";
import StripeSDK from "stripe";
import type {
  RunMutationCtx,
  RunQueryCtx,
  ActionCtx,
  HttpRouter,
  RegisterRoutesConfig,
  StripeEventHandlers,
} from "./types.js";
import type { ComponentApi } from "../component/_generated/component.js";

export type StripeComponent = ComponentApi;

export type { RegisterRoutesConfig, StripeEventHandlers };

/**
 * Stripe Component Client
 *
 * Provides methods for managing Stripe customers, subscriptions, payments,
 * and webhooks through Convex.
 */
export class StripeSubscriptions {
  private apiKey: string;
  constructor(
    public component: StripeComponent,
    options?: {
      STRIPE_SECRET_KEY?: string;
    }
  ) {
    this.apiKey = options?.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY!;
    if (!this.apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
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
    const stripe = new StripeSDK(this.apiKey);

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

    // Update our local database
    await ctx.runMutation(
      this.component.private.updateSubscriptionQuantityInternal,
      {
        stripeSubscriptionId: args.stripeSubscriptionId,
        quantity: args.quantity,
      }
    );

    return null;
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
    const stripe = new StripeSDK(this.apiKey);

    if (args.cancelAtPeriodEnd ?? true) {
      await stripe.subscriptions.update(args.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(args.stripeSubscriptionId);
    }

    return null;
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
    const stripe = new StripeSDK(this.apiKey);

    const sessionParams: StripeSDK.Checkout.SessionCreateParams = {
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
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    const stripe = new StripeSDK(apiKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });

    return {
      url: session.url,
    };
  }

  // ============================================================================
  // WEBHOOK REGISTRATION
  // ============================================================================
}
/**
 * Register webhook routes with the HTTP router.
 * This simplifies webhook setup by handling signature verification
 * and routing events to the appropriate handlers automatically.
 *
 * @param http - The HTTP router instance
 * @param config - Optional configuration for webhook path and event handlers
 *
 * @example
 * ```typescript
 * // convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { stripe } from "./stripe";
 *
 * const http = httpRouter();
 *
 * stripe.registerRoutes(http, {
 *   events: {
 *     "customer.subscription.updated": async (ctx, event) => {
 *       // Your custom logic after default handling
 *       console.log("Subscription updated:", event.data.object);
 *     },
 *   },
 * });
 *
 * export default http;
 * ```
 */
export function registerRoutes(
  http: HttpRouter,
  component: ComponentApi,
  config?: RegisterRoutesConfig
) {
  const webhookPath = config?.webhookPath ?? "/stripe/webhook";
  const eventHandlers = config?.events ?? {};

  http.route({
    path: webhookPath,
    method: "POST",
    handler: httpActionGeneric(async (ctx, req) => {
      const webhookSecret =
        config?.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("❌ STRIPE_WEBHOOK_SECRET is not set");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        console.error("❌ No Stripe signature in headers");
        return new Response("No signature provided", { status: 400 });
      }

      const body = await req.text();

      if (!process.env.STRIPE_SECRET_KEY) {
        console.error("❌ STRIPE_SECRET_KEY is not set");
        return new Response("Stripe secret key not configured", {
          status: 500,
        });
      }

      const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY);

      // Verify webhook signature
      let event: StripeSDK.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.error("❌ Webhook signature verification failed:", err);
        return new Response(
          `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
          { status: 400 }
        );
      }

      // Process the event with default handlers
      try {
        await processEvent(ctx, component, event, stripe);

        // Call generic event handler if provided
        if (config?.onEvent) {
          await config.onEvent(ctx, event);
        }

        // Call custom event handler if provided
        const eventType = event.type;
        const customHandler:
          | ((ctx: any, event: any) => Promise<void>)
          | undefined = eventHandlers[eventType] as any;
        if (customHandler) {
          await customHandler(ctx, event);
        }
      } catch (error) {
        console.error("❌ Error processing webhook:", error);
        return new Response("Error processing webhook", { status: 500 });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  });
}

/**
 * Internal method to process Stripe webhook events with default handling.
 * This handles the database syncing for all supported event types.
 */
async function processEvent(
  ctx: RunMutationCtx,
  component: ComponentApi,
  event: StripeSDK.Event,
  stripe: StripeSDK
): Promise<void> {
  switch (event.type) {
    case "customer.created":
    case "customer.updated": {
      const customer = event.data.object as StripeSDK.Customer;
      const handler =
        event.type === "customer.created"
          ? component.private.handleCustomerCreated
          : component.private.handleCustomerUpdated;

      await ctx.runMutation(handler, {
        stripeCustomerId: customer.id,
        email: customer.email || undefined,
        name: customer.name || undefined,
        metadata: customer.metadata,
      });
      break;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object as any;
      await ctx.runMutation(component.private.handleSubscriptionCreated, {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end || 0,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        quantity: subscription.items.data[0]?.quantity ?? 1,
        priceId: subscription.items.data[0]?.price.id || "",
        metadata: subscription.metadata || {},
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as any;
      await ctx.runMutation(component.private.handleSubscriptionUpdated, {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end || 0,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        quantity: subscription.items.data[0]?.quantity ?? 1,
        metadata: subscription.metadata || {},
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as StripeSDK.Subscription;
      await ctx.runMutation(component.private.handleSubscriptionDeleted, {
        stripeSubscriptionId: subscription.id,
      });
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as StripeSDK.Checkout.Session;
      await ctx.runMutation(component.private.handleCheckoutSessionCompleted, {
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: session.customer
          ? (session.customer as string)
          : undefined,
        mode: session.mode || "payment",
        metadata: session.metadata || undefined,
      });

      // For payment mode, link the payment to the customer if we have both
      if (
        session.mode === "payment" &&
        session.customer &&
        session.payment_intent
      ) {
        await ctx.runMutation(component.private.updatePaymentCustomer, {
          stripePaymentIntentId: session.payment_intent as string,
          stripeCustomerId: session.customer as string,
        });
      }
      break;
    }

    case "invoice.created":
    case "invoice.finalized": {
      const invoice = event.data.object as StripeSDK.Invoice;
      await ctx.runMutation(component.private.handleInvoiceCreated, {
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        stripeSubscriptionId: (invoice as any).subscription as
          | string
          | undefined,
        status: invoice.status || "open",
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        created: invoice.created,
      });
      break;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      await ctx.runMutation(component.private.handleInvoicePaid, {
        stripeInvoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as StripeSDK.Invoice;
      await ctx.runMutation(component.private.handleInvoicePaymentFailed, {
        stripeInvoiceId: invoice.id,
      });
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as any;

      // Check if this is a subscription payment
      if (paymentIntent.invoice) {
        try {
          const invoice = await stripe.invoices.retrieve(
            paymentIntent.invoice as string
          );
          if ((invoice as any).subscription) {
            console.log(
              "⏭️ Skipping payment_intent.succeeded - subscription payment"
            );
            break;
          }
        } catch (err) {
          console.error("Error checking invoice:", err);
        }
      }

      // Check for recent subscriptions
      if (paymentIntent.customer) {
        const recentSubscriptions = await ctx.runQuery(
          component.public.listSubscriptions,
          {
            stripeCustomerId: paymentIntent.customer as string,
          }
        );

        const tenMinutesAgo = Date.now() / 1000 - 600;
        const recentSubscription = recentSubscriptions.find(
          (sub: any) => sub._creationTime > tenMinutesAgo
        );

        if (recentSubscription) {
          console.log(
            "⏭️ Skipping payment_intent.succeeded - recent subscription"
          );
          break;
        }
      }

      await ctx.runMutation(component.private.handlePaymentIntentSucceeded, {
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer
          ? (paymentIntent.customer as string)
          : undefined,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata || {},
      });
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }
}

export default StripeSubscriptions;
