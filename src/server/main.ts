import "dotenv/config";
import express from "express";
import ViteExpress from "vite-express";
import { auth } from "./auth.js";
import { toNodeHandler } from 'better-auth/node'
import { mountRoutes } from "./routes.js";
import { supabaseProvider } from "./db/supabase-provider.js";
import { anthropicGrader } from "./grader/anthropic.js";
import { requireAuth } from "./middleware/auth.js";

const port = Number(process.env.PORT) || 3000;

const app = express();
app.all('/auth/{*any}', toNodeHandler(auth));

app.use(express.json({ limit: '1mb' }));
app.use("/api", requireAuth);

mountRoutes(app, supabaseProvider, anthropicGrader);

ViteExpress.config({ ignorePaths: /^\/(auth|api)(\/|$)/ });
ViteExpress.listen(app, port, () =>
  console.log(`Server is listening on port ${port}...`),
);
