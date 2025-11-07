/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as public_ from "../public.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  public: typeof public_;
}>;
export type Mounts = {
  public: {
    cancelSubscription: FunctionReference<
      "action",
      "public",
      { cancelAtPeriodEnd: boolean; stripeSubscriptionId: string },
      null
    >;
    createCheckoutSession: FunctionReference<
      "action",
      "public",
      {
        cancelUrl: string;
        customerId?: string;
        metadata?: any;
        mode: "payment" | "subscription" | "setup";
        priceId: string;
        successUrl: string;
      },
      { sessionId: string; url: string | null }
    >;
    createCustomerPortalSession: FunctionReference<
      "action",
      "public",
      { customerId: string; returnUrl: string },
      { url: string }
    >;
    createOrUpdateCustomer: FunctionReference<
      "mutation",
      "public",
      {
        email?: string;
        metadata?: any;
        name?: string;
        stripeCustomerId: string;
      },
      string
    >;
    getAllData: FunctionReference<
      "query",
      "public",
      {},
      {
        checkoutSessions: Array<any>;
        customers: Array<any>;
        invoices: Array<any>;
        payments: Array<any>;
        subscriptions: Array<any>;
      }
    >;
    getCustomer: FunctionReference<
      "query",
      "public",
      { stripeCustomerId: string },
      {
        _creationTime: number;
        _id: string;
        email?: string;
        metadata?: any;
        name?: string;
        stripeCustomerId: string;
      } | null
    >;
    getPayment: FunctionReference<
      "query",
      "public",
      { stripePaymentIntentId: string },
      {
        _creationTime: number;
        _id: string;
        amount: number;
        created: number;
        currency: string;
        metadata?: any;
        orgId?: string;
        status: string;
        stripeCustomerId?: string;
        stripePaymentIntentId: string;
        userId?: string;
      } | null
    >;
    getSubscription: FunctionReference<
      "query",
      "public",
      { stripeSubscriptionId: string },
      {
        _creationTime: number;
        _id: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number;
        metadata?: any;
        orgId?: string;
        priceId: string;
        quantity?: number;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        userId?: string;
      } | null
    >;
    getSubscriptionByOrgId: FunctionReference<
      "query",
      "public",
      { orgId: string },
      {
        _creationTime: number;
        _id: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number;
        metadata?: any;
        orgId?: string;
        priceId: string;
        quantity?: number;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        userId?: string;
      } | null
    >;
    handleCheckoutSessionCompleted: FunctionReference<
      "mutation",
      "public",
      {
        metadata?: any;
        mode: string;
        stripeCheckoutSessionId: string;
        stripeCustomerId?: string;
      },
      null
    >;
    handleCustomerCreated: FunctionReference<
      "mutation",
      "public",
      {
        email?: string;
        metadata?: any;
        name?: string;
        stripeCustomerId: string;
      },
      null
    >;
    handleCustomerUpdated: FunctionReference<
      "mutation",
      "public",
      {
        email?: string;
        metadata?: any;
        name?: string;
        stripeCustomerId: string;
      },
      null
    >;
    handleInvoiceCreated: FunctionReference<
      "mutation",
      "public",
      {
        amountDue: number;
        amountPaid: number;
        created: number;
        status: string;
        stripeCustomerId: string;
        stripeInvoiceId: string;
        stripeSubscriptionId?: string;
      },
      null
    >;
    handleInvoicePaid: FunctionReference<
      "mutation",
      "public",
      { amountPaid: number; stripeInvoiceId: string },
      null
    >;
    handleInvoicePaymentFailed: FunctionReference<
      "mutation",
      "public",
      { stripeInvoiceId: string },
      null
    >;
    handlePaymentIntentSucceeded: FunctionReference<
      "mutation",
      "public",
      {
        amount: number;
        created: number;
        currency: string;
        metadata?: any;
        status: string;
        stripeCustomerId?: string;
        stripePaymentIntentId: string;
      },
      null
    >;
    handleSubscriptionCreated: FunctionReference<
      "mutation",
      "public",
      {
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number;
        metadata?: any;
        priceId: string;
        quantity?: number;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
      },
      null
    >;
    handleSubscriptionDeleted: FunctionReference<
      "mutation",
      "public",
      { stripeSubscriptionId: string },
      null
    >;
    handleSubscriptionUpdated: FunctionReference<
      "mutation",
      "public",
      {
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number;
        metadata?: any;
        quantity?: number;
        status: string;
        stripeSubscriptionId: string;
      },
      null
    >;
    listInvoices: FunctionReference<
      "query",
      "public",
      { stripeCustomerId: string },
      Array<{
        _creationTime: number;
        _id: string;
        amountDue: number;
        amountPaid: number;
        created: number;
        status: string;
        stripeCustomerId: string;
        stripeInvoiceId: string;
        stripeSubscriptionId?: string;
      }>
    >;
    listPayments: FunctionReference<
      "query",
      "public",
      { stripeCustomerId: string },
      Array<{
        _creationTime: number;
        _id: string;
        amount: number;
        created: number;
        currency: string;
        metadata?: any;
        orgId?: string;
        status: string;
        stripeCustomerId?: string;
        stripePaymentIntentId: string;
        userId?: string;
      }>
    >;
    listPaymentsByOrgId: FunctionReference<
      "query",
      "public",
      { orgId: string },
      Array<{
        _creationTime: number;
        _id: string;
        amount: number;
        created: number;
        currency: string;
        metadata?: any;
        orgId?: string;
        status: string;
        stripeCustomerId?: string;
        stripePaymentIntentId: string;
        userId?: string;
      }>
    >;
    listPaymentsByUserId: FunctionReference<
      "query",
      "public",
      { userId: string },
      Array<{
        _creationTime: number;
        _id: string;
        amount: number;
        created: number;
        currency: string;
        metadata?: any;
        orgId?: string;
        status: string;
        stripeCustomerId?: string;
        stripePaymentIntentId: string;
        userId?: string;
      }>
    >;
    listSubscriptions: FunctionReference<
      "query",
      "public",
      { stripeCustomerId: string },
      Array<{
        _creationTime: number;
        _id: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number;
        metadata?: any;
        orgId?: string;
        priceId: string;
        quantity?: number;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        userId?: string;
      }>
    >;
    listSubscriptionsByUserId: FunctionReference<
      "query",
      "public",
      { userId: string },
      Array<{
        _creationTime: number;
        _id: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: number;
        metadata?: any;
        orgId?: string;
        priceId: string;
        quantity?: number;
        status: string;
        stripeCustomerId: string;
        stripeSubscriptionId: string;
        userId?: string;
      }>
    >;
    updatePaymentCustomer: FunctionReference<
      "mutation",
      "public",
      { stripeCustomerId: string; stripePaymentIntentId: string },
      null
    >;
    updateSubscriptionMetadata: FunctionReference<
      "mutation",
      "public",
      {
        metadata: any;
        orgId?: string;
        stripeSubscriptionId: string;
        userId?: string;
      },
      null
    >;
    updateSubscriptionQuantity: FunctionReference<
      "action",
      "public",
      { quantity: number; stripeSubscriptionId: string },
      null
    >;
    updateSubscriptionQuantityInternal: FunctionReference<
      "mutation",
      "public",
      { quantity: number; stripeSubscriptionId: string },
      null
    >;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
