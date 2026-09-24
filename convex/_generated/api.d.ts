/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dev_tester from "../dev/tester.js";
import type * as fixtures_city from "../fixtures/city.js";
import type * as generation_core_buildings from "../generation/core/buildings.js";
import type * as generation_core_city from "../generation/core/city.js";
import type * as generation_core_rng from "../generation/core/rng.js";
import type * as generation_stages from "../generation/stages.js";
import type * as lib_auth from "../lib/auth.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "dev/tester": typeof dev_tester;
  "fixtures/city": typeof fixtures_city;
  "generation/core/buildings": typeof generation_core_buildings;
  "generation/core/city": typeof generation_core_city;
  "generation/core/rng": typeof generation_core_rng;
  "generation/stages": typeof generation_stages;
  "lib/auth": typeof lib_auth;
  sessions: typeof sessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
