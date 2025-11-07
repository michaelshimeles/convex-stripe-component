import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Stripe } from "./index.js";
import type { DataModelFromSchemaDefinition } from "convex/server";
import {
  anyApi,
  queryGeneric,
  mutationGeneric,
  actionGeneric,
} from "convex/server";
import type {
  ApiFromModules,
  ActionBuilder,
  MutationBuilder,
  QueryBuilder,
} from "convex/server";
import { v } from "convex/values";
import { defineSchema } from "convex/server";
import { components, initConvexTest } from "./setup.test.js";

// The schema for the tests
const schema = defineSchema({});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
const query = queryGeneric as QueryBuilder<DataModel, "public">;
const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
const action = actionGeneric as ActionBuilder<DataModel, "public">;

const stripe = new Stripe(components.stripe);

export const testGetCustomer = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await stripe.getCustomer(ctx, args.stripeCustomerId);
  },
});

export const testCreateOrUpdateCustomer = mutation({
  args: {
    stripeCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await stripe.createOrUpdateCustomer(ctx, {
      stripeCustomerId: args.stripeCustomerId,
      email: args.email,
      name: args.name,
    });
  },
});

export const testUpdateSubscriptionMetadata = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    return await stripe.updateSubscriptionMetadata(ctx, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      metadata: args.metadata,
    });
  },
});

const testApi: ApiFromModules<{
  fns: {
    testGetCustomer: typeof testGetCustomer;
    testCreateOrUpdateCustomer: typeof testCreateOrUpdateCustomer;
    testUpdateSubscriptionMetadata: typeof testUpdateSubscriptionMetadata;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}>["fns"] = anyApi["index.test"] as any;

describe("Stripe thick client", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("should create Stripe client", async () => {
    const c = new Stripe(components.stripe);
    expect(c).toBeDefined();
    expect(c.component).toBeDefined();
  });

  test("should work with environment variables", async () => {
    const c = new Stripe(components.stripe, {
      STRIPE_WEBHOOK_SECRET: "whsec_123",
    });
    expect(c.options?.STRIPE_WEBHOOK_SECRET).toBe("whsec_123");
  });

  test("should provide api() helper for re-export", async () => {
    const c = new Stripe(components.stripe);
    const apiHelpers = c.api();
    expect(apiHelpers.getCustomer).toBeDefined();
    expect(apiHelpers.getSubscription).toBeDefined();
    expect(apiHelpers.listSubscriptions).toBeDefined();
    expect(apiHelpers.getSubscriptionByOrgId).toBeDefined();
    expect(apiHelpers.listSubscriptionsByUserId).toBeDefined();
    expect(apiHelpers.createOrUpdateCustomer).toBeDefined();
    expect(apiHelpers.updateSubscriptionMetadata).toBeDefined();
    expect(apiHelpers.getPayment).toBeDefined();
    expect(apiHelpers.listPayments).toBeDefined();
    expect(apiHelpers.listPaymentsByUserId).toBeDefined();
    expect(apiHelpers.listPaymentsByOrgId).toBeDefined();
    expect(apiHelpers.updatePaymentCustomer).toBeDefined();
  });
});
