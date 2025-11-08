import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    console.log("🪝 Stripe webhook received!");
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("❌ No Stripe signature in headers");
      return new Response("No signature provided", { status: 400 });
    }

    // Get raw body as text - this must be the raw request body
    const body = await req.text();
    console.log("📦 Received webhook body, length:", body.length);
    console.log("🔑 Webhook secret length:", webhookSecret.length);
    console.log("📝 Signature header:", signature.substring(0, 50) + "...");

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY is not set");
      return new Response("Stripe secret key not configured", { status: 500 });
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log("✅ Webhook signature verified! Event type:", event.type);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      console.error("Error details:", err instanceof Error ? err.message : String(err));
      return new Response(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`, {
        status: 400,
      });
    }

    // Route events to appropriate handlers
    try {
      console.log("🔄 Processing event:", event.type);
      switch (event.type) {
        case "customer.created":
        case "customer.updated": {
          const customer = event.data.object as Stripe.Customer;
          const handler =
            event.type === "customer.created"
              ? components.stripe.public.handleCustomerCreated
              : components.stripe.public.handleCustomerUpdated;

          console.log("📝 Calling mutation with data:", {
            stripeCustomerId: customer.id,
            email: customer.email,
            name: customer.name,
            hasMetadata: !!customer.metadata,
          });

          await ctx.runMutation(handler, {
            stripeCustomerId: customer.id,
            email: customer.email || undefined,
            name: customer.name || undefined,
            metadata: customer.metadata,
          });
          
          console.log(`✅ ${event.type} completed successfully`);
          break;
        }

        case "customer.subscription.created": {
          const subscription = event.data.object as any;
          console.log("📝 Subscription data:", {
            id: subscription.id,
            customer: subscription.customer,
            status: subscription.status,
            hasItems: !!subscription.items?.data?.[0],
            priceId: subscription.items?.data?.[0]?.price?.id,
          });

          await ctx.runMutation(components.stripe.public.handleSubscriptionCreated, {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            currentPeriodEnd: subscription.items.data[0]?.current_period_end || 0,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            quantity: subscription.items.data[0]?.quantity ?? 1,
            priceId: subscription.items.data[0]?.price.id || "",
            metadata: subscription.metadata || {},
          });
          
          console.log("✅ Subscription created completed successfully");
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          await ctx.runMutation(components.stripe.public.handleSubscriptionUpdated, {
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.items.data[0]?.current_period_end || 0,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            quantity: subscription.items.data[0]?.quantity ?? 1,
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await ctx.runMutation(components.stripe.public.handleSubscriptionDeleted, {
            stripeSubscriptionId: subscription.id,
          });
          break;
        }

        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await ctx.runMutation(components.stripe.public.handleCheckoutSessionCompleted, {
            stripeCheckoutSessionId: session.id,
            stripeCustomerId: session.customer ? (session.customer as string) : undefined,
            mode: session.mode || "payment",
            metadata: session.metadata || undefined,
          });
          
          // For payment mode, link the payment to the customer if we have both
          if (session.mode === "payment" && session.customer && session.payment_intent) {
            await ctx.runMutation(components.stripe.public.updatePaymentCustomer, {
              stripePaymentIntentId: session.payment_intent as string,
              stripeCustomerId: session.customer as string,
            });
          }
          break;
        }

        case "invoice.created":
        case "invoice.finalized": {
          const invoice = event.data.object as Stripe.Invoice;
          await ctx.runMutation(components.stripe.public.handleInvoiceCreated, {
            stripeInvoiceId: invoice.id,
            stripeCustomerId: invoice.customer as string,
            stripeSubscriptionId: (invoice as any).subscription as string | undefined,
            status: invoice.status || "open",
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            created: invoice.created,
          });
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as any;
          await ctx.runMutation(components.stripe.public.handleInvoicePaid, {
            stripeInvoiceId: invoice.id,
            amountPaid: invoice.amount_paid,
          });
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await ctx.runMutation(components.stripe.public.handleInvoicePaymentFailed, {
            stripeInvoiceId: invoice.id,
          });
          break;
        }

        case "invoice.payment_succeeded": {
          // This is essentially the same as invoice.paid
          const invoice = event.data.object as any;
          await ctx.runMutation(components.stripe.public.handleInvoicePaid, {
            stripeInvoiceId: invoice.id,
            amountPaid: invoice.amount_paid,
          });
          console.log("✅ Invoice payment succeeded handled");
          break;
        }

        case "payment_intent.succeeded": {
          // Track one-time payments in the database
          // Skip if this payment intent is for a subscription (those are tracked via invoices)
          const paymentIntent = event.data.object as any;
          
          // Method 1 (Primary): Check if this payment intent is associated with a subscription invoice
          // This is the most reliable method as invoices are always linked to subscriptions
          if (paymentIntent.invoice) {
            try {
              const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
              // subscription field exists on Invoice at runtime but TypeScript types may not reflect it
              if ((invoice as any).subscription) {
                console.log("⏭️ Skipping payment_intent.succeeded - this is a subscription payment (tracked via invoice)");
                break;
              }
            } catch (err) {
              console.error("Error checking invoice:", err);
              // Continue to other checks if we can't check the invoice
            }
          }
          
          // Method 2 (Fallback): Check if there's a recently created subscription for this customer
          // Use a 10-minute window to account for webhook delivery delays and processing time
          if (paymentIntent.customer) {
            const recentSubscriptions = await ctx.runQuery(components.stripe.public.listSubscriptions, {
              stripeCustomerId: paymentIntent.customer as string,
            });
            
            // If there's a subscription created within the last 10 minutes, this is likely a subscription payment
            const tenMinutesAgo = Date.now() / 1000 - 600;
            const recentSubscription = recentSubscriptions.find((sub: any) => 
              sub._creationTime > tenMinutesAgo
            );
            
            if (recentSubscription) {
              console.log("⏭️ Skipping payment_intent.succeeded - subscription created recently for this customer");
              break;
            }
          }
          
          await ctx.runMutation(components.stripe.public.handlePaymentIntentSucceeded, {
            stripePaymentIntentId: paymentIntent.id,
            stripeCustomerId: paymentIntent.customer ? (paymentIntent.customer as string) : undefined,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            created: paymentIntent.created,
            metadata: paymentIntent.metadata || {},
          });
          console.log("✅ Payment intent succeeded handled (one-time payment)");
          break;
        }

        case "payment_intent.created": {
          // We only track successful payments
          console.log("✅ payment_intent.created acknowledged");
          break;
        }

        case "payment_method.attached": {
          // Payment methods are managed by Stripe
          // We track the default payment method via customer data if needed
          console.log("✅ payment_method.attached acknowledged");
          break;
        }

        case "charge.succeeded": {
          // Charges are already tracked via invoices and payment intents
          console.log("✅ charge.succeeded acknowledged (tracked via invoices)");
          break;
        }

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
      
      console.log("✅ Webhook processed successfully!");
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
});

export default http;
