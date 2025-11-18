import type {
  Expand,
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  StorageActionWriter,
  StorageReader,
  HttpRouter,
} from "convex/server";
import type { GenericId } from "convex/values";
import type Stripe from "stripe";

// Type utils follow

export type RunQueryCtx = {
  runQuery: <Query extends FunctionReference<"query", "internal">>(
    query: Query,
    args: FunctionArgs<Query>
  ) => Promise<FunctionReturnType<Query>>;
};
export type RunMutationCtx = RunQueryCtx & {
  runMutation: <Mutation extends FunctionReference<"mutation", "internal">>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>
  ) => Promise<FunctionReturnType<Mutation>>;
};
export type RunActionCtx = RunMutationCtx & {
  runAction<Action extends FunctionReference<"action", "internal">>(
    action: Action,
    args: FunctionArgs<Action>
  ): Promise<FunctionReturnType<Action>>;
};
export type ActionCtx = RunActionCtx & {
  storage: StorageActionWriter;
};
export type QueryCtx = RunQueryCtx & {
  storage: StorageReader;
};

export type OpaqueIds<T> =
  T extends GenericId<infer _T>
    ? string
    : T extends (infer U)[]
      ? OpaqueIds<U>[]
      : T extends ArrayBuffer
        ? ArrayBuffer
        : T extends object
          ? {
              [K in keyof T]: OpaqueIds<T[K]>;
            }
          : T;

export type UseApi<API> = Expand<{
  [mod in keyof API]: API[mod] extends FunctionReference<
    infer FType,
    "public",
    infer FArgs,
    infer FReturnType,
    infer FComponentPath
  >
    ? FunctionReference<
        FType,
        "internal",
        OpaqueIds<FArgs>,
        OpaqueIds<FReturnType>,
        FComponentPath
      >
    : UseApi<API[mod]>;
}>;

// Webhook Event Handler Types

/**
 * Context passed to webhook event handlers.
 * This is a mutation context since handlers need to modify data.
 */
export type WebhookEventContext = RunMutationCtx;

/**
 * Handler function for a specific Stripe webhook event.
 * Receives the mutation context and the full Stripe event object.
 */
export type StripeEventHandler<T extends Stripe.Event.Type = Stripe.Event.Type> = (
  ctx: WebhookEventContext,
  event: Stripe.Event & { type: T }
) => Promise<void>;

/**
 * Map of event types to their handlers.
 * Users can provide handlers for any Stripe webhook event type.
 */
export type StripeEventHandlers = {
  [K in Stripe.Event.Type]?: StripeEventHandler<K>;
};

/**
 * Configuration for webhook registration.
 */
export type RegisterRoutesConfig = {
  /**
   * Optional webhook path. Defaults to "/stripe/webhook"
   */
  webhookPath?: string;
  
  /**
   * Optional event handlers that run after default processing.
   * The component will handle database syncing automatically,
   * and then call your custom handlers.
   */
  events?: StripeEventHandlers;
};

/**
 * Type for the HttpRouter to be used in registerRoutes
 */
export type { HttpRouter };
