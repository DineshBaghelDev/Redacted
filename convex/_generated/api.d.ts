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
import type * as fixtures_caseEasy from "../fixtures/caseEasy.js";
import type * as fixtures_city from "../fixtures/city.js";
import type * as generation_aiStage from "../generation/aiStage.js";
import type * as generation_core_brief from "../generation/core/brief.js";
import type * as generation_core_buildings from "../generation/core/buildings.js";
import type * as generation_core_city from "../generation/core/city.js";
import type * as generation_core_crimeCast from "../generation/core/crimeCast.js";
import type * as generation_core_estimate from "../generation/core/estimate.js";
import type * as generation_core_evidence_cctv from "../generation/core/evidence/cctv.js";
import type * as generation_core_evidence_clutter from "../generation/core/evidence/clutter.js";
import type * as generation_core_evidence_index from "../generation/core/evidence/index.js";
import type * as generation_core_evidence_types from "../generation/core/evidence/types.js";
import type * as generation_core_facts from "../generation/core/facts.js";
import type * as generation_core_lies from "../generation/core/lies.js";
import type * as generation_core_names from "../generation/core/names.js";
import type * as generation_core_rng from "../generation/core/rng.js";
import type * as generation_core_routine from "../generation/core/routine.js";
import type * as generation_core_schemas from "../generation/core/schemas.js";
import type * as generation_core_scripts from "../generation/core/scripts.js";
import type * as generation_core_stats from "../generation/core/stats.js";
import type * as generation_core_story from "../generation/core/story.js";
import type * as generation_core_text from "../generation/core/text.js";
import type * as generation_core_timeline from "../generation/core/timeline.js";
import type * as generation_core_validate from "../generation/core/validate.js";
import type * as generation_jobs from "../generation/jobs.js";
import type * as generation_llm from "../generation/llm.js";
import type * as generation_prompts_brief from "../generation/prompts/brief.js";
import type * as generation_prompts_cast from "../generation/prompts/cast.js";
import type * as generation_prompts_city from "../generation/prompts/city.js";
import type * as generation_prompts_crime from "../generation/prompts/crime.js";
import type * as generation_prompts_lies from "../generation/prompts/lies.js";
import type * as generation_prompts_story from "../generation/prompts/story.js";
import type * as generation_prompts_text from "../generation/prompts/text.js";
import type * as generation_stages from "../generation/stages.js";
import type * as generation_workflow from "../generation/workflow.js";
import type * as lib_auth from "../lib/auth.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "dev/tester": typeof dev_tester;
  "fixtures/caseEasy": typeof fixtures_caseEasy;
  "fixtures/city": typeof fixtures_city;
  "generation/aiStage": typeof generation_aiStage;
  "generation/core/brief": typeof generation_core_brief;
  "generation/core/buildings": typeof generation_core_buildings;
  "generation/core/city": typeof generation_core_city;
  "generation/core/crimeCast": typeof generation_core_crimeCast;
  "generation/core/estimate": typeof generation_core_estimate;
  "generation/core/evidence/cctv": typeof generation_core_evidence_cctv;
  "generation/core/evidence/clutter": typeof generation_core_evidence_clutter;
  "generation/core/evidence/index": typeof generation_core_evidence_index;
  "generation/core/evidence/types": typeof generation_core_evidence_types;
  "generation/core/facts": typeof generation_core_facts;
  "generation/core/lies": typeof generation_core_lies;
  "generation/core/names": typeof generation_core_names;
  "generation/core/rng": typeof generation_core_rng;
  "generation/core/routine": typeof generation_core_routine;
  "generation/core/schemas": typeof generation_core_schemas;
  "generation/core/scripts": typeof generation_core_scripts;
  "generation/core/stats": typeof generation_core_stats;
  "generation/core/story": typeof generation_core_story;
  "generation/core/text": typeof generation_core_text;
  "generation/core/timeline": typeof generation_core_timeline;
  "generation/core/validate": typeof generation_core_validate;
  "generation/jobs": typeof generation_jobs;
  "generation/llm": typeof generation_llm;
  "generation/prompts/brief": typeof generation_prompts_brief;
  "generation/prompts/cast": typeof generation_prompts_cast;
  "generation/prompts/city": typeof generation_prompts_city;
  "generation/prompts/crime": typeof generation_prompts_crime;
  "generation/prompts/lies": typeof generation_prompts_lies;
  "generation/prompts/story": typeof generation_prompts_story;
  "generation/prompts/text": typeof generation_prompts_text;
  "generation/stages": typeof generation_stages;
  "generation/workflow": typeof generation_workflow;
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
