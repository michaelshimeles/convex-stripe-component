import { httpRouter } from "convex/server";
import { stripe } from "./stripe";
import type Stripe from "stripe";

const http = httpRouter();

// Register Stripe webhooks with custom event handlers
stripe.registerRoutes(http, {
  events: {
    "customer.subscription.updated": async (ctx: any, event: Stripe.CustomerSubscriptionUpdatedEvent) => {
      // Example custom handler: Log subscription updates
      const subscription = event.data.object;
      console.log("🔔 Custom handler: Subscription updated!", {
        id: subscription.id,
        status: subscription.status,
      });
      
      // You can run additional logic here after the default database sync
      // For example, send a notification, update other tables, etc.
    },
    "payment_intent.succeeded": async (ctx: any, event: Stripe.PaymentIntentSucceededEvent) => {
      // Example custom handler: Log successful one-time payments
      const paymentIntent = event.data.object;
      console.log("💰 Custom handler: Payment succeeded!", {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
      });
    },
  },
});

export default http;
