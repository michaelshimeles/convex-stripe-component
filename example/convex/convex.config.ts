import { defineApp } from "convex/server";
import stripe from "@micky/convex-stripe-component/convex.config";

const app = defineApp();
app.use(stripe);

export default app;
