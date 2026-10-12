import workflow from "@convex-dev/workflow/convex.config.js";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workflow);
app.use(agent);
app.use(rateLimiter);

export default app;
