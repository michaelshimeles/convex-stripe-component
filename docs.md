# Getting started

`npm create convex@latest -- --component`

# Component patterns

- The repo should be `get-convex/foo`,  npm package `@convex-dev/foo` and component name should be `foo`.
- A bit up in the air right now, but Ian’s current preference is to put the public API in `public.ts` or any name other than `index.ts` so if/when we flatten `index.ts` it doesn’t break any clients calling [`components.foo.index.bar`](http://components.foo.index.bar).
- The thick client should generally be in `src/client/index.ts`
- The public component API should be in `src/component/public.ts` unless you have a better name for your use-case
- Frontend code should be in `src/react/index.ts`
- The component implementation should be in `src/component/`

# Thick clients

Thick clients refer to having functions wrapping calls like `ctx.runMutation(components.foo.bar, ...)` so users don’t have to learn that syntax and have an API that can use types, interact with user tables, etc.

## Constructor patterns

- The first argument is [`components.foo`](http://components.foo) and the second argument (if any) is an object for parameters, like `{ maxShards: 100, FOO_AUTH_KEY: process.env.FOO_AUTH_KEY }`
- Arguments that are likely just environment variables (like `FOO_AUTH_KEY` above) should both be optional in the constructor, and default to a known enviroment variable name internally, so the instructions in the README don’t need to pass parameters to the client.
    
    Set your API credentials:
    
    ```bash
    npx convex env set FOO_AUTH_KEY=ACxxxxx
    
    ```
    
    Instantiate a Foo Component client in a file in your app's `convex/` folder:
    
    ```tsx
    import Foo from "@convex-dev/foo";
    import { components } from "./_generated/server.js";
    
    const foo = new Foo(components.foo);
    ```
    
    But they could have also passed:
    
    ```tsx
    new Foo(components.foo, { FOO_AUTH_KEY: process.env.FOO_AUTH_KEY });
    ```
    
- The class should be exported as `export class Foo {` and then again as `export default Foo` so you can `import { Foo }` or `import Foo` - the former is handy when there’s other types / utilities

### Functional (alternative if classes don’t work)

If your component makes less sense to use a class, you can use functions to return objects to de-structure. Consider this if:

- You need to re-export / mount convex functions (QMA)
- You are only returning one callable function.

For example, for a migrations component:

```tsx
// in convex/migrations.ts
export const { run, migration } = makeMigrations(components.migrations, { internalMutation });
export const myMigration = migration({ table: "users", migrateOne: (_, doc) => ({ field: "value" })});
// npx convex run migrations:run '{"fn": "migrations:myMigration"}'
```

Which can be used in addition to a client:

```tsx
const migrations = new Migrations(components.migrations);

export const runAll = mutation({
  handler: (ctx) => {
    await migrations.startsMigrationSerially(ctx, [
      internal.migrations.myMigration
      ...
    ]);
  }
}
```

### Clients that require `ctx` at initialization time

For clients that need access to `ctx` before any function calls to them, `ctx` is the first parameter:

```tsx
export const myQuery = query({
  handler: async (ctx, args) => {
    const foo = new Foo(ctx, components.foo, { optionA: true });
    await foo.bar();
  }
});
```

This can be used by users with custom functions like so:

```tsx
const myCustomQuery = customQuery(query, customCtx(ctx => {
  const foo = new Foo(ctx, components.foo, { optionA: true });
  return { foo };
}));

export const myQuery = myCustomQuery({
  handler: async (ctx, args) => {
    await ctx.foo.bar();
  }
});
```

## Accepting a reference to the component as an arg

To talk to your component from your thick client, you need to get passed it directly - this enables separate clients for multiple instances of a component. You typically have as your first argument to your thick client, like:

```tsx
new FooClient(components.foo)
```

In order to make this type easy, you can use a nifty helper type:

```tsx
import { api } from "../component/_generated/api.js"; // the component's public api

export class FooClient {
  constructor(public component: UseApi<typeof api>) {}
```

Where `UseApi` does two things:

- turns your public api into internal function references
- turns ID arguments into string arguments
- `UseApi` type:
    
    ```tsx
    import { Expand, FunctionReference } from "convex/server";
    import { GenericId } from "convex/values";
    
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
    
    export type OpaqueIds<T> =
      T extends GenericId<infer _T>
        ? string
        : T extends (infer U)[]
          ? OpaqueIds<U>[]
          : T extends object
            ? { [K in keyof T]: OpaqueIds<T[K]> }
            : T;
    ```
    

## Accepting a `ctx` argument to call your component

To call your component from your thick client, the caller needs to pass in `ctx` so you can call `ctx.runMutation(this.component.public.foo` or similar. It looks like:

```tsx
const client = new FooClient(components.foo);

export const myMutation = mutation({
  handler: async (ctx) => {
    await client.bar(ctx, "other arg");
  }
});
```

In order to not be overly prescriptive of the type of context passed to your thick client, you typically only need to accept an object with `runQuery` `runMutation` or `runAction`:

```tsx
export class FooClient {
  constructor(public component: UseApi<typeof api>) {}
  
  async bar(ctx: { runQuery: GenericQueryCtx<GenericDataModel>["runQuery"] }, otherArg: string) {
    return ctx.runQuery(this.component.public.bar, { otherArg });
  }
}
```

To make this more convenient, you can use these helper types:

- `RunQueryCtx`, `RunMutationCtx`, `RunActionCtx` helpers
    
    ```tsx
    import { GenericDataModel, GenericMutationCtx, GenericQueryCtx } from "convex/server";
    
    type RunQueryCtx = {
      runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
    };
    type RunMutationCtx = {
      runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
    };
    type RunActionCtx = {
      runAction: GenericActionCtx<GenericDataModel>["runAction"];
    };
    
    ...
      async bar(ctx: RunQueryCtx & RunMutationCtx, otherArg: string) {
        return ctx.runQuery(this.component.public.bar, { otherArg });
      }
    ```
    

## Static parameters

Parameters are currently passed in per-call. This can be eased by storing them in a thick client, or within the thick client’s methods themselves. 

For instance, if you want to have a default value for counting one at a time, and how many shards the counter should have:

```tsx
export class CounterClient {
  constructor(
    public component: UseApi<typeof api>,
    public options?: { shards?: Record<string, number>; defaultShards?: number }
  ) {}
  async add(ctx: RunMutationCtx, name: string, count: number = 1) {
    const shards = this.options?.shards?.[name] ?? this.options?.defaultShards;
    return ctx.runMutation(this.component.public.add, {
      name,
      count,
      shards,
    });
  }
```

### Using environment variable parameters

The env var params should usually be passed to the thick client vs. in each function call. 

They should be passed as arguments, but if they can be canonically named, you should make the argument optional and set the optional argument name to be the same as the default env variable name. E.g.

```tsx
const foo = new FooClient(components.foo, {
  FOO_API_KEY: process.env.FOO_API_KEY
});
// equivalent to:
const foo = new FooClient(components.foo);
```

This gives the user a hint about what env var to set, as well as a way to override the value if you don’t want to use that env var.

This doesn’t need to be on the top level, e.g. if there are multiple:

```tsx
const foo = new FooClient(components.foo, {
  configuration: {
    FOO_API_KEY: process.env.FOO_API_KEY,
    FOO_CLIENT_ID: process.env.FOO_CLIENT_ID,
  },
});
```

## Generics

To add some type safety to your API, you can use a thick client to capture some types to use on methods / functions. In this case, we will auto-complete the counter names based on the config passed in:

```tsx
const counter = new CounterClient(components.counter, { shards: { foo: 10 } });
...
  await counter.add(ctx, " <- auto-completes to `foo`
```

This is achieved like so:

```tsx
export class Client<Shards extends Record<string, number>> {
  constructor(
    public component: UseApi<typeof api>,
    public options?: { shards?: Shards; defaultShards?: number }
  ) {}
  async add<Name extends string = keyof Shards & string>(
    ctx: RunMutationCtx,
    name: Name,
    count: number = 1
  ) {
  ...
```

Tip: if I did `Name extends keyof Shards & string` then it’d have a type error if I didn’t type “foo”. However, by doing `Name extends string = keyof Shards & string` it will auto-complete “foo” but also allow any string. See the https://github.com/get-convex/ratelimiter implementation to see how I require an inline config if the client wasn’t given a config at initialization time for the named rate limit.

## Testing thick clients

For now just write flows to test in your `example/convex/example.ts` file, bubbling the “example usage” to the top of the file. Or put it in `example/convex/test.ts` if it’s long and could be confusing to folks looking for examples. Then run `npx convex run tests:foo` to test

# Registering http endpoints

Http endpoints need to be added to an existing http router, so users can also have their own http routes/ add from multiple components.

```tsx
import twilio from "./twilio";
import { httpRouter } from "convex/server";

const http = httpRouter();
// TODO: once we ship the client support: http.mount(twilio.http);
twilio.registerRoutes(http);
export default http;
```

- Namespace your routes to your component’s name. E.g. `/twilio/message-status` but allow customizing

```bash
const twilio = new Twilio(components.twilio, { httpPrefix: "/foo/twilio" });
```

# Tips & tricks

- The typescript language server in vscode/cursor gets confused and requires a restart to pick up references to component names etc
- It’s easy to erroneously run codegen manually on the cli, e.g., when vscode is showing missing references, and then end up creating a top-level convex/_generated folder

## If you’re seeing weird errors about having multiple versions of convex…

In your repo, if there are two copies of the `convex` package: in `./node_modules` and `example/node_modules` - this can break things.  (Thankfully end users won’t have this issue since they’d import from a package, not a file). 

Fixes:

1. `cd example && npm i ../node_modules/convex` will avoid installing a second copy of convex.
2. `cd example && npm i && rm -rf node_modules/convex && cd ..` as your way of running `npm i` in example/ - this removes the second copy of convex, so it’ll find the one in the parent folder. node modules automatically check parent directories for missing packages 😱. This is probably just worse than (1) but in here for posterity / curiosity
- (Old suggestion) Use targeted types, like for `HttpRouter`:
    
    You can use these types instead of raw `HttpRouter` that don’t have identity issues.
    
    - Type helpers:
        
        ```tsx
        type ClientHttpCtx = Omit<GenericActionCtx<any>, "vectorSearch"> & {
          vectorSearch: unknown;
        };
        type ClientExportedHttpCtx = Omit<GenericActionCtx<any>, "vectorSearch"> & {
          vectorSearch: any;
        };
        type OmitCallSignature<T> = T extends {
          (...args: any[]): any;
          [key: string]: any;
        }
          ? { [K in keyof T as K extends `${string}` ? K : never]: T[K] }
          : T;
        type ClientHttpAction = OmitCallSignature<PublicHttpAction> & {
          (ctx: ClientExportedHttpCtx, request: Request): Promise<Response>;
        };
        const clientHttpAction = httpAction as (
          func: (ctx: ClientHttpCtx, request: Request) => Promise<Response>,
        ) => ClientHttpAction;
        
        // A client can export httpActions directly...
        export const myHttpRoute = clientHttpAction(async (_) => {
          return new Response("OK");
        });
        
        // ...or a function that adds them to a router.
        export function registerRoutes(exoticRouter: { isRouter: boolean }) {
          const router = exoticRouter as HttpRouter;
          router.route({
            path: "/ratelimiter/myHttpRoute",
            method: "GET",
            handler: myHttpRoute,
          });
        }
        ```
        

## Importing `@convex-dev/foo` instead of `../../src/...` in example

See the template for example syntax, but this is achieved by:

- Setting the package name to `@convex-dev/foo` in the root `package.json`
- Installing it in the `example` file with `npm i ..` (clearing your node_modules first can help)
    - Also it generally helps to `rm -rf example/node_modules/convex
- Update your example code to import from the package name. You may need to `npm run build` in the parent directory to get the code updated. See the next section on how to avoid needing `npm run build`

## Live types

In order to not need to `npm run build` for the example app to reflect changes to the clients, you can set up a fancy “custom condition”:

- In your `example/convex/tsconfig.json` (NOT the root `./tsconfig.json`):
    
    ```tsx
      "compilerOptions": {
        ...
    
        /* This should only be used in this example. Real apps should not attempt
         * to compile TypeScript because differences between tsconfig.json files can
         * cause the code to be compiled differently.
         */
         "customConditions": ["@convex-dev/component-source"]
      },
    ```
    
- In your `./package.json` add the `@convex-dev/component-source` rules:
    
    ```tsx
      "exports": {
        "./package.json": "./package.json",
        ".": {
          "import": {
            "@convex-dev/component-source": "./src/client/index.ts",
            "types": "./dist/esm/client/index.d.ts",
            "default": "./dist/esm/client/index.js"
          },
          "require": {
            "@convex-dev/component-source": "./src/client/index.ts",
            "types": "./dist/commonjs/client/index.d.ts",
            "default": "./dist/commonjs/client/index.js"
          }
        },
        "./react": {
          "import": {
            "@convex-dev/component-source": "./src/react/index.ts",
            "types": "./dist/esm/react.d.ts",
            "default": "./dist/esm/react.js"
          },
          "require": {
            "@convex-dev/component-source": "./src/react/index.ts",
            "types": "./dist/commonjs/react.d.ts",
            "default": "./dist/commonjs/react.js"
          }
        },
        "./convex.config": {
          "import": {
            "@convex-dev/component-source": "./src/component/convex.config.ts",
            "types": "./dist/esm/component/convex.config.d.ts",
            "default": "./dist/esm/component/convex.config.js"
          }
        }
      },
    ```
    

## Sharing types between the client and component

- You can import types in your client from `./src/shared.ts` or `./src/types.ts` where you can define types that work in both places
- These types **can’t use [v.id](http://v.id) or Id<”foo”>** if you want to use them in the client.
- Your client code may be more readable for new users if types / validators are duplicated there, instead of going to great lengths to extract the right fields. If you duplicate, ensure you’ll get a type error if they diverge. Unfortunately some situations won’t be caught (e.g. passing in too many fields, or only expecting a subset of fields returned) - which can be runtime errors.

## tsconfig

- Changing moduleResolution to `bunder` and module to `ESNext`
    - Old projects used `node`

## Return validators

- Adding return validators for components is the **best** way to provide types to clients over the API. Normal type inference doesn’t happen for `components.foo.public.bar`. However, if you use the `UseApi<typeof api>` pattern, then return types are inferred.
- When returning values directly from a third party, make sure to extract and explicitly return values, so it doesn’t break if the third party starts returning new fields in their JSON objects.

For instance:

```tsx
const fromApi = await response.json();
const { to, from, message, status } = fromApi;
return { to, from, message, status };

// Or to capture the rest of the fields:
const { to, from, message, status, ...rest } = fromApi;
db.insert("messages", { to, from, message, status, rest });

// with schema
messages: defineTable({ 
  to: v.string(),
  ...
  rest: v.any(),
}),
```

Capturing the rest of the fields will ensure future versions that care about more of the response haven’t lost data by using the component - they just need to reach into `rest` for older messages.

# Production checklist

1. In its own repo under `get-convex/foo` and package.json name is `@convex-dev/foo` **without** a `-component` suffix **on either** (yes this has changed multiple times).
    1. Add a short description to the GitHub repo
2. Package.json
    - copy these:
        
        ```tsx
          "name": "@convex-dev/ratelimiter",
          "description": "A ratelimiter component for Convex.",
          "repository": "github:get-convex/ratelimiter",
          "homepage": "https://github.com/get-convex/ratelimiter#readme",
          "bugs": {
            "email": "support@convex.dev",
            "url": "https://github.com/get-convex/ratelimiter/issues"
          },
          "version": "0.1.0",
          "license": "Apache-2.0",
          "keywords": [
            "convex",
            "component"
          ],
          "type": "module",
          ...
          "exports": {
            ...
            "./convex.config": {
              "import": {
                "@convex-dev/component-source": "./src/component/convex.config.ts",
                "types": "./dist/esm/component/convex.config.d.ts",
                "default": "./dist/esm/component/convex.config.js"
              }
            }
          },
          "peerDependencies": {
            "convex": "~1.16.5 || ~1.17.0"
          },
        ```
        
3. Has a LICENSE file and  in the root `package.json`.
    - LICENSE
        
        ```tsx
                                         Apache License
                                   Version 2.0, January 2004
                                http://www.apache.org/licenses/
        
        TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
        
        1.  Definitions.
        
            "License" shall mean the terms and conditions for use, reproduction,
            and distribution as defined by Sections 1 through 9 of this document.
        
            "Licensor" shall mean the copyright owner or entity authorized by
            the copyright owner that is granting the License.
        
            "Legal Entity" shall mean the union of the acting entity and all
            other entities that control, are controlled by, or are under common
            control with that entity. For the purposes of this definition,
            "control" means (i) the power, direct or indirect, to cause the
            direction or management of such entity, whether by contract or
            otherwise, or (ii) ownership of fifty percent (50%) or more of the
            outstanding shares, or (iii) beneficial ownership of such entity.
        
            "You" (or "Your") shall mean an individual or Legal Entity
            exercising permissions granted by this License.
        
            "Source" form shall mean the preferred form for making modifications,
            including but not limited to software source code, documentation
            source, and configuration files.
        
            "Object" form shall mean any form resulting from mechanical
            transformation or translation of a Source form, including but
            not limited to compiled object code, generated documentation,
            and conversions to other media types.
        
            "Work" shall mean the work of authorship, whether in Source or
            Object form, made available under the License, as indicated by a
            copyright notice that is included in or attached to the work
            (an example is provided in the Appendix below).
        
            "Derivative Works" shall mean any work, whether in Source or Object
            form, that is based on (or derived from) the Work and for which the
            editorial revisions, annotations, elaborations, or other modifications
            represent, as a whole, an original work of authorship. For the purposes
            of this License, Derivative Works shall not include works that remain
            separable from, or merely link (or bind by name) to the interfaces of,
            the Work and Derivative Works thereof.
        
            "Contribution" shall mean any work of authorship, including
            the original version of the Work and any modifications or additions
            to that Work or Derivative Works thereof, that is intentionally
            submitted to Licensor for inclusion in the Work by the copyright owner
            or by an individual or Legal Entity authorized to submit on behalf of
            the copyright owner. For the purposes of this definition, "submitted"
            means any form of electronic, verbal, or written communication sent
            to the Licensor or its representatives, including but not limited to
            communication on electronic mailing lists, source code control systems,
            and issue tracking systems that are managed by, or on behalf of, the
            Licensor for the purpose of discussing and improving the Work, but
            excluding communication that is conspicuously marked or otherwise
            designated in writing by the copyright owner as "Not a Contribution."
        
            "Contributor" shall mean Licensor and any individual or Legal Entity
            on behalf of whom a Contribution has been received by Licensor and
            subsequently incorporated within the Work.
        
        2.  Grant of Copyright License. Subject to the terms and conditions of
            this License, each Contributor hereby grants to You a perpetual,
            worldwide, non-exclusive, no-charge, royalty-free, irrevocable
            copyright license to reproduce, prepare Derivative Works of,
            publicly display, publicly perform, sublicense, and distribute the
            Work and such Derivative Works in Source or Object form.
        
        3.  Grant of Patent License. Subject to the terms and conditions of
            this License, each Contributor hereby grants to You a perpetual,
            worldwide, non-exclusive, no-charge, royalty-free, irrevocable
            (except as stated in this section) patent license to make, have made,
            use, offer to sell, sell, import, and otherwise transfer the Work,
            where such license applies only to those patent claims licensable
            by such Contributor that are necessarily infringed by their
            Contribution(s) alone or by combination of their Contribution(s)
            with the Work to which such Contribution(s) was submitted. If You
            institute patent litigation against any entity (including a
            cross-claim or counterclaim in a lawsuit) alleging that the Work
            or a Contribution incorporated within the Work constitutes direct
            or contributory patent infringement, then any patent licenses
            granted to You under this License for that Work shall terminate
            as of the date such litigation is filed.
        
        4.  Redistribution. You may reproduce and distribute copies of the
            Work or Derivative Works thereof in any medium, with or without
            modifications, and in Source or Object form, provided that You
            meet the following conditions:
        
            (a) You must give any other recipients of the Work or
            Derivative Works a copy of this License; and
        
            (b) You must cause any modified files to carry prominent notices
            stating that You changed the files; and
        
            (c) You must retain, in the Source form of any Derivative Works
            that You distribute, all copyright, patent, trademark, and
            attribution notices from the Source form of the Work,
            excluding those notices that do not pertain to any part of
            the Derivative Works; and
        
            (d) If the Work includes a "NOTICE" text file as part of its
            distribution, then any Derivative Works that You distribute must
            include a readable copy of the attribution notices contained
            within such NOTICE file, excluding those notices that do not
            pertain to any part of the Derivative Works, in at least one
            of the following places: within a NOTICE text file distributed
            as part of the Derivative Works; within the Source form or
            documentation, if provided along with the Derivative Works; or,
            within a display generated by the Derivative Works, if and
            wherever such third-party notices normally appear. The contents
            of the NOTICE file are for informational purposes only and
            do not modify the License. You may add Your own attribution
            notices within Derivative Works that You distribute, alongside
            or as an addendum to the NOTICE text from the Work, provided
            that such additional attribution notices cannot be construed
            as modifying the License.
        
            You may add Your own copyright statement to Your modifications and
            may provide additional or different license terms and conditions
            for use, reproduction, or distribution of Your modifications, or
            for any such Derivative Works as a whole, provided Your use,
            reproduction, and distribution of the Work otherwise complies with
            the conditions stated in this License.
        
        5.  Submission of Contributions. Unless You explicitly state otherwise,
            any Contribution intentionally submitted for inclusion in the Work
            by You to the Licensor shall be under the terms and conditions of
            this License, without any additional terms or conditions.
            Notwithstanding the above, nothing herein shall supersede or modify
            the terms of any separate license agreement you may have executed
            with Licensor regarding such Contributions.
        
        6.  Trademarks. This License does not grant permission to use the trade
            names, trademarks, service marks, or product names of the Licensor,
            except as required for reasonable and customary use in describing the
            origin of the Work and reproducing the content of the NOTICE file.
        
        7.  Disclaimer of Warranty. Unless required by applicable law or
            agreed to in writing, Licensor provides the Work (and each
            Contributor provides its Contributions) on an "AS IS" BASIS,
            WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
            implied, including, without limitation, any warranties or conditions
            of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
            PARTICULAR PURPOSE. You are solely responsible for determining the
            appropriateness of using or redistributing the Work and assume any
            risks associated with Your exercise of permissions under this License.
        
        8.  Limitation of Liability. In no event and under no legal theory,
            whether in tort (including negligence), contract, or otherwise,
            unless required by applicable law (such as deliberate and grossly
            negligent acts) or agreed to in writing, shall any Contributor be
            liable to You for damages, including any direct, indirect, special,
            incidental, or consequential damages of any character arising as a
            result of this License or out of the use or inability to use the
            Work (including but not limited to damages for loss of goodwill,
            work stoppage, computer failure or malfunction, or any and all
            other commercial damages or losses), even if such Contributor
            has been advised of the possibility of such damages.
        
        9.  Accepting Warranty or Additional Liability. While redistributing
            the Work or Derivative Works thereof, You may choose to offer,
            and charge a fee for, acceptance of support, warranty, indemnity,
            or other liability obligations and/or rights consistent with this
            License. However, in accepting such obligations, You may act only
            on Your own behalf and on Your sole responsibility, not on behalf
            of any other Contributor, and only if You agree to indemnify,
            defend, and hold each Contributor harmless for any liability
            incurred by, or claims asserted against, such Contributor by reason
            of your accepting any such warranty or additional liability.
        
        END OF TERMS AND CONDITIONS
        
        APPENDIX: How to apply the Apache License to your work.
        
              To apply the Apache License to your work, attach the following
              boilerplate notice, with the fields enclosed by brackets "[]"
              replaced with your own identifying information. (Don't include
              the brackets!)  The text should be enclosed in the appropriate
              comment syntax for the file format. We also recommend that a
              file or class name and description of purpose be included on the
              same "printed page" as the copyright notice for easier
              identification within third-party archives.
        
        Copyright [yyyy] [name of copyright owner]
        
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
        
               http://www.apache.org/licenses/LICENSE-2.0
        
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
        
        ```
        
4. Uses return validators for all public API functions
5. Has a thick client **Class** at `src/client/index.ts` that encapsulates initialization
    1. The name should be `Foo`, not `Client` or `FooClient`
6. Http actions, if any, are added to an existing http router with `foo.registerHttpRoutes(http)` or `addHttpRoutes`
7. Example usage in `example/convex/example.ts` that is instructive and imports from `@convex-dev/foo` , not `../../src/...` (see above for how to connect the types)
    1. Delete `example/convex/README.md` if it isn’t relevant to your example.
8. Tests
    1. Some flows that exercise the functions in `example/convex/example.ts` or `example/convex/test.ts` (if they’re involved / confusing)
    2. For the raw API and internal correctness: `src/component/public.test.ts`
        - You can test the functions directly, just not via `ctx.runMutation` / etc.
    3. Tests for the thick client are a little trickier, but there are examples in: [aggregate](https://github.com/get-convex/aggregate), 
9. Docstrings on thick client functions (no need to annotate every arg - but purpose / usage should be clear)
10. Documentation in README at root of component. Include:
    - Add a badge.fury.io NPM badge & START comment:
        
        ```tsx
        # Convex Foo Component
        
        [![npm version](https://badge.fury.io/js/@convex-dev%2Ffoo.svg)](https://badge.fury.io/js/@convex-dev%2Ffoo)
        
        <!-- START: Include on https://convex.dev/components -->
        ```
        
        note: you need to replace "foo" twice above
        
    - A hook - ideally some example code showing how easy it is to use (ignoring setup)
        - This is likely the most “exciting” call from your `example.ts` file.
    - Summary / motivation of why someone should use it
    - Installation instructions (assuming this is their first component)
        
        ```tsx
        ### Convex App
        
        You'll need a Convex App to use the component. Run `npm create convex` or
        follow any of the [Convex quickstarts](https://docs.convex.dev/home) to set one up.
        
        ## Installation
        
        Install the component package:
        
        ```ts
        npm install @convex-dev/foo
        ```
        
        Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:
        
        ```ts
        // convex/convex.config.ts
        import { defineApp } from "convex/server";
        import foo from "@convex-dev/foo/convex.config";
        
        const app = defineApp();
        app.use(foo);
        
        export default app;
        ```
        ```
        
    - Configuring the thick client (ideally copy from example.ts)
    - Example usage (ideally copy from example.ts)
        - Walk through a common use case, with code illustrating each step.
        
        ```jsx
        See more example usage in [example.ts](./example/convex/example.ts).
        ```
        
    - END comment
        
        ```tsx
        <!-- END: Include on https://convex.dev/components -->
        ```
        

# Publish to npm

Check that it works

```bash
rm -rf dist/ && npm run build
npm run typecheck
cd example 
npm run lint
npx convex run --push example:test # test the thick client somehow
npm run test # for tests written within src/
cd ..
```

Test with a one-off package

```bash
rm -rf dist/ && npm run build
npm pack
```

Bump the version

```bash
# this will change the version and commit it (if you run it in the root directory)
npm version patch
# Or to publish an alpha
npm version prerelease --preid alpha

```

Publish

```bash
npm publish --dry-run
# sanity check files being included

npm publish
# or to publish an alpha
npm publish --tag alpha

git push --tags
```

[Component Authors](https://www.notion.so/Component-Authors-190b57ff32ab80a6accde206650600a0?pvs=21)